import type { Exercise, Phrase, UserProgress, Word, PhraseFamily } from '../store/types';
import { lessons } from '../data/lessons';
import { words as allWords } from '../data/words';
import { families } from '../data/phrase-families';
import { getDueItems } from './srs';
import { isPhraseReady } from './word-readiness';
import { phraseStage, phraseDifficulty } from '../data/phrase-meta';
import { getLearnerStage, isStageUnlocked } from './grammar-progress';
import { generateExercise } from './exercise-generator';
import { generateWordRecognize, generateWordProduce, generateWordListen } from './word-generator';
import { generatePerspectiveShiftExercise } from './family-generator';
import { isDailyExcluded } from './daily-exclusions';
import {
  generateConjugateFromKey,
  conjugationCellsForProgress,
  CONJ_PREFIX,
} from './conjugation-generator';

/**
 * The unified daily session. Replaces "pick which mode" with "tap
 * Continue, drill the right next ~15 items." Mixes:
 *
 *   ~40% review     — SRS-due items across all three layers
 *   ~40% new        — first-encounter words + ready phrases
 *   ~20% practice   — recently-met items to consolidate
 *
 * Items are interleaved (not blocked) — variability of practice is
 * pedagogically dominant over blocked drilling.
 *
 * Dispatch by SRS key prefix:
 *   `word:<id>`           → WordRecognize / WordProduce
 *   `family:<fid>:<vid>`  → PerspectiveShift
 *   <phrase id>           → standard phrase exercise (bucket-appropriate)
 *
 * Spec: ARCHITECTURE.md §6.
 */

const WORD_PREFIX = 'word:';
const FAMILY_PREFIX = 'family:';

interface FamilyLookup {
  family: PhraseFamily;
  variantId: string;
}

const familyVariantIndex: Map<string, FamilyLookup> = new Map();
for (const family of families) {
  for (const variant of family.variants) {
    familyVariantIndex.set(`family:${family.id}:${variant.id}`, {
      family,
      variantId: variant.id,
    });
  }
}

const wordIndex: Map<string, Word> = new Map(allWords.map((w) => [w.id, w]));
const phraseIndex: Map<string, Phrase> = new Map();
for (const lesson of lessons) {
  for (const group of lesson.phraseGroups) {
    for (const phrase of group.phrases) {
      phraseIndex.set(phrase.id, phrase);
    }
  }
}
const allPhrases: Phrase[] = [...phraseIndex.values()];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface SessionInput {
  progress: UserProgress;
  script: 'latin' | 'cyrillic';
  count?: number;
  skipTyping?: boolean;
}

/**
 * Build an exercise for a single SRS key. Routes by prefix.
 * Returns null if the key references missing data (e.g. orphaned word).
 */
function exerciseForKey(
  key: string,
  bucket: number,
  input: SessionInput
): Exercise | null {
  const { script } = input;

  if (key.startsWith(CONJ_PREFIX)) {
    return generateConjugateFromKey(key, bucket, script);
  }

  if (key.startsWith(WORD_PREFIX)) {
    const wordId = key.slice(WORD_PREFIX.length);
    const word = wordIndex.get(wordId);
    if (!word) return null;
    // New words get recognition first. Once met (bucket ≥ 1): ~20%
    // listening (train the ear), otherwise production wins (audit §3.4).
    if (bucket === 0) return generateWordRecognize(word, allWords, script);
    if (Math.random() < 0.2) return generateWordListen(word, allWords);
    return generateWordProduce(word, allWords, script);
  }

  if (key.startsWith(FAMILY_PREFIX)) {
    const lookup = familyVariantIndex.get(key);
    if (!lookup) return null;
    const variant = lookup.family.variants.find((v) => v.id === lookup.variantId);
    if (!variant) return null;
    // Multiple choice for new/learning variants; type-it once mastered.
    const useMC = bucket < 3;
    return generatePerspectiveShiftExercise(lookup.family, variant, script, useMC);
  }

  // Regular phrase. Use the existing engine with bucket-appropriate
  // exercise selection + readiness gate (phrases with unmet words drop
  // out at the candidate level above).
  const phrase = phraseIndex.get(key);
  if (!phrase) return null;
  return generateExercise(
    phrase,
    allPhrases,
    script,
    bucket,
    undefined,
    findLessonForPhrase(phrase.id),
    0.5,
    input.skipTyping ?? false
  );
}

function findLessonForPhrase(phraseId: string) {
  for (const lesson of lessons) {
    for (const group of lesson.phraseGroups) {
      if (group.phrases.some((p) => p.id === phraseId)) return lesson;
    }
  }
  return undefined;
}

/** Like findLessonForPhrase but returns just the lesson id (for the new-stream tilt). */
function lessonIdForPhrase(phraseId: string): string | undefined {
  for (const lesson of lessons) {
    for (const group of lesson.phraseGroups) {
      if (group.phrases.some((p) => p.id === phraseId)) return lesson.id;
    }
  }
  return undefined;
}

/** The short generalized-frames lesson — promoted first in the new stream. */
const FRAME_LESSON_ID = 'everyday-frames';

const phraseWordCount = (p: Phrase) =>
  p.sr_latin.replace(/[.!?,]/g, '').split(/\s+/).filter(Boolean).length;

/**
 * Pick new items the learner is ready for.
 *   - New words: bucket 0, ranked by frequency (rank ascending = more common first)
 *   - New phrases: bucket 0, all wordRefs at bucket ≥ 1 (readiness passes)
 *
 * Returns a mixed array, words and phrases interleaved.
 */
function pickNewItems(input: SessionInput, count: number): string[] {
  const { progress } = input;
  const newWordIds = allWords
    .filter((w) => (progress.phrases[`word:${w.id}`]?.bucket ?? 0) === 0)
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    .map((w) => `word:${w.id}`);

  // Difficulty ramp: only introduce phrases up to the learner's grammar
  // frontier (chunks always flow), and order easy→hard by grammar stage.
  const frontier = getLearnerStage(progress);
  const newPhraseIds = allPhrases
    .filter(
      (p) =>
        (progress.phrases[p.id]?.bucket ?? 0) === 0 &&
        isPhraseReady(p, progress) &&
        !isDailyExcluded(p.id) &&
        isStageUnlocked(p.id, frontier)
    )
    .sort((a, b) => {
      // Easier grammar stage first, then frames, then difficulty, then length.
      const sa = phraseStage(a.id);
      const sb = phraseStage(b.id);
      if (sa !== sb) return sa - sb;
      const af = lessonIdForPhrase(a.id) === FRAME_LESSON_ID ? 0 : 1;
      const bf = lessonIdForPhrase(b.id) === FRAME_LESSON_ID ? 0 : 1;
      if (af !== bf) return af - bf;
      const da = phraseDifficulty(a.id);
      const db = phraseDifficulty(b.id);
      if (da !== db) return da - db;
      return phraseWordCount(a) - phraseWordCount(b);
    })
    .map((p) => p.id);

  // New conjugation cells: lemma met (gated inside), cell itself unseen.
  // Kept in teaching order (jedem before jedeš), so don't shuffle.
  const newConjIds = conjugationCellsForProgress(
    (wid) => progress.phrases[`word:${wid}`]?.bucket ?? 0
  ).filter((k) => (progress.phrases[k]?.bucket ?? 0) === 0);

  // Interleave word, phrase, word, phrase… with ~15% conjugation woven in
  // (only once the learner has met some verbs — early on this is empty).
  const picked: string[] = [];
  const ws = shuffle(newWordIds).slice(0, Math.ceil(count * 0.5));
  const ps = newPhraseIds.slice(0, Math.ceil(count * 0.5)); // already sorted — do NOT shuffle
  const cs = newConjIds.slice(0, Math.max(1, Math.ceil(count * 0.15)));
  let sinceConj = 0;
  while (picked.length < count && (ws.length || ps.length || cs.length)) {
    // Drop a conjugation cell roughly every ~6 picks so it's a seasoning,
    // not the main course.
    if (cs.length && sinceConj >= 5) {
      picked.push(cs.shift()!);
      sinceConj = 0;
      if (picked.length >= count) break;
    }
    if (ws.length) {
      picked.push(ws.shift()!);
      sinceConj++;
      if (picked.length >= count) break;
    }
    if (ps.length) {
      picked.push(ps.shift()!);
      sinceConj++;
    }
    if (!ws.length && !ps.length && cs.length) {
      // Only conjugation left — flush it.
      picked.push(cs.shift()!);
    }
  }
  return picked.slice(0, count);
}

/**
 * Pick consolidation items — recently met (bucket 1–2) with low
 * correct/total ratio. These are the "almost got it" items that
 * benefit from extra reps before they slide back down.
 */
function pickConsolidationItems(input: SessionInput, count: number): string[] {
  const { progress } = input;
  const candidates = Object.values(progress.phrases)
    .filter((p) => !isDailyExcluded(p.phraseId))
    .filter((p) => p.bucket >= 1 && p.bucket <= 2)
    .filter((p) => {
      const total = p.correctCount + p.incorrectCount;
      if (total < 2) return true;
      return p.correctCount / total < 0.75;
    })
    .sort((a, b) => {
      const aTotal = a.correctCount + a.incorrectCount;
      const bTotal = b.correctCount + b.incorrectCount;
      const aRatio = aTotal > 0 ? a.correctCount / aTotal : 1;
      const bRatio = bTotal > 0 ? b.correctCount / bTotal : 1;
      return aRatio - bRatio;
    });
  return candidates.slice(0, count).map((p) => p.phraseId);
}

export interface DailySessionPicks {
  reviewIds: string[];
  newIds: string[];
  consolidationIds: string[];
}

/**
 * Inspect what would land in a session without generating exercises.
 * Used by the Daily landing screen to summarise "today's mix" before
 * starting.
 */
export function previewDailySession(
  input: SessionInput,
  count: number = 15
): DailySessionPicks {
  const targetReview = Math.round(count * 0.4);
  const targetNew = Math.round(count * 0.4);

  // Build full candidate pools, then allocate greedily with carry-over so
  // the session always reaches `count` and the advertised mix is real:
  // when one stream is thin (e.g. no reviews due in week 1), the others
  // absorb its slots instead of silently padding with unweighted random.
  const duePool = shuffle(getDueItems(input.progress.phrases))
    .map((p) => p.phraseId)
    .filter((id) => !isDailyExcluded(id));
  const newPool = pickNewItems(input, count); // frequency-ordered, word/phrase interleaved
  const consolidationPool = pickConsolidationItems(input, count);

  const used = new Set<string>();
  const take = (pool: string[], n: number): string[] => {
    const out: string[] = [];
    for (const id of pool) {
      if (out.length >= n) break;
      if (!used.has(id)) {
        used.add(id);
        out.push(id);
      }
    }
    return out;
  };

  const reviewIds = take(duePool, targetReview);
  // New absorbs any review shortfall.
  const newIds = take(newPool, targetNew + (targetReview - reviewIds.length));
  // Consolidation gets whatever's left…
  const consolidationIds = take(
    consolidationPool,
    count - reviewIds.length - newIds.length
  );
  // …and any remaining shortfall (thin consolidation pool) flows back to
  // new — and then to review — so we hit `count` with real SRS picks.
  let shortfall = count - reviewIds.length - newIds.length - consolidationIds.length;
  if (shortfall > 0) {
    const more = take(newPool, shortfall);
    newIds.push(...more);
    shortfall -= more.length;
  }
  if (shortfall > 0) {
    const more = take(duePool, shortfall);
    reviewIds.push(...more);
  }

  return { reviewIds, newIds, consolidationIds };
}

/**
 * Generate the day's session. Interleaves new / review / consolidation
 * so the learner doesn't drill all-of-one-kind in a row.
 */
export function generateDailySession(
  input: SessionInput,
  count: number = 15
): Exercise[] {
  const { reviewIds, newIds, consolidationIds } = previewDailySession(input, count);

  // Interleave the three streams: review, new, consolidation, repeat.
  const streams = [
    [...reviewIds],
    [...newIds],
    [...consolidationIds],
  ];
  const interleaved: string[] = [];
  while (interleaved.length < count) {
    let progressed = false;
    for (const s of streams) {
      if (s.length) {
        interleaved.push(s.shift()!);
        progressed = true;
        if (interleaved.length >= count) break;
      }
    }
    if (!progressed) break;
  }

  // Absolute last-resort filler (only if the greedy allocator still came
  // up short). Prefer lowest-rank unseen WORDS first, then ready phrases —
  // pedagogically ordered, never unweighted random.
  if (interleaved.length < count) {
    const seen = new Set(interleaved);
    const need = count - interleaved.length;

    const unseenWordKeys = allWords
      .filter((w) => (input.progress.phrases[`word:${w.id}`]?.bucket ?? 0) === 0)
      .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
      .map((w) => `word:${w.id}`)
      .filter((k) => !seen.has(k));

    const readyPhraseKeys = allPhrases
      .filter((p) => isPhraseReady(p, input.progress) && !isDailyExcluded(p.id))
      .map((p) => p.id)
      .filter((k) => !seen.has(k));

    void need;
    for (const k of [...unseenWordKeys, ...readyPhraseKeys]) {
      if (interleaved.length >= count) break;
      if (seen.has(k)) continue;
      seen.add(k);
      interleaved.push(k);
    }
  }

  const exercises: Exercise[] = [];
  for (const key of interleaved.slice(0, count)) {
    const bucket = input.progress.phrases[key]?.bucket ?? 0;
    const ex = exerciseForKey(key, bucket, input);
    if (ex) exercises.push(ex);
  }
  return exercises;
}

/**
 * Build a fresh recognition exercise for a missed item, to re-surface it
 * later in the same session. The missed exercise's `phrase.id` IS the SRS
 * key (word:/family:/plain), so we route it back through exerciseForKey at
 * bucket 0 (recognition).
 */
export function buildRetryExercise(missed: Exercise, input: SessionInput): Exercise | null {
  return exerciseForKey(missed.phrase.id, 0, input);
}

/** Summary counts surfaced on the Daily landing screen. */
export interface DailySummary {
  newCount: number;
  reviewCount: number;
  consolidationCount: number;
  total: number;
}

export function getDailySummary(
  input: SessionInput,
  count: number = 15
): DailySummary {
  const picks = previewDailySession(input, count);
  const total = picks.reviewIds.length + picks.newIds.length + picks.consolidationIds.length;
  return {
    newCount: picks.newIds.length,
    reviewCount: picks.reviewIds.length,
    consolidationCount: picks.consolidationIds.length,
    total,
  };
}
