import type { Exercise, Phrase, UserProgress, Word, PhraseFamily } from '../store/types';
import { lessons } from '../data/lessons';
import { words as allWords } from '../data/words';
import { families } from '../data/phrase-families';
import { getDueItems } from './srs';
import { isPhraseReady } from './word-readiness';
import { generateExercise } from './exercise-generator';
import { generateWordRecognize, generateWordProduce } from './word-generator';
import { generatePerspectiveShiftExercise } from './family-generator';

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

  if (key.startsWith(WORD_PREFIX)) {
    const wordId = key.slice(WORD_PREFIX.length);
    const word = wordIndex.get(wordId);
    if (!word) return null;
    // Production wins early (audit §3.4). New words get recognition first,
    // then production from bucket 1 up.
    return bucket === 0
      ? generateWordRecognize(word, allWords, script)
      : generateWordProduce(word, allWords, script);
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

  const newPhraseIds = allPhrases
    .filter(
      (p) =>
        (progress.phrases[p.id]?.bucket ?? 0) === 0 &&
        isPhraseReady(p, progress)
    )
    .map((p) => p.id);

  // Interleave word, phrase, word, phrase…
  const picked: string[] = [];
  const wordSlots = shuffle(newWordIds).slice(0, Math.ceil(count * 0.6));
  const phraseSlots = shuffle(newPhraseIds).slice(0, Math.ceil(count * 0.4));
  const ws = [...wordSlots];
  const ps = [...phraseSlots];
  while (picked.length < count && (ws.length || ps.length)) {
    if (ws.length) picked.push(ws.shift()!);
    if (picked.length >= count) break;
    if (ps.length) picked.push(ps.shift()!);
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
  const reviewSlots = Math.round(count * 0.4);
  const newSlots = Math.round(count * 0.4);
  const consolidationSlots = count - reviewSlots - newSlots;

  const due = getDueItems(input.progress.phrases);
  const reviewIds = shuffle(due)
    .slice(0, reviewSlots)
    .map((p) => p.phraseId);
  const newIds = pickNewItems(input, newSlots);
  const consolidationIds = pickConsolidationItems(input, consolidationSlots);

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

  // If we still don't have enough (cold-start case), fill with random
  // ready phrases so the session is never empty.
  if (interleaved.length < count) {
    const seen = new Set(interleaved);
    const filler = shuffle(allPhrases.filter((p) => isPhraseReady(p, input.progress)))
      .filter((p) => !seen.has(p.id))
      .slice(0, count - interleaved.length)
      .map((p) => p.id);
    interleaved.push(...filler);
  }

  const exercises: Exercise[] = [];
  for (const key of interleaved.slice(0, count)) {
    const bucket = input.progress.phrases[key]?.bucket ?? 0;
    const ex = exerciseForKey(key, bucket, input);
    if (ex) exercises.push(ex);
  }
  return exercises;
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
