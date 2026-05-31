import type { Exercise, ExerciseType, Lesson, Phrase, PhraseGroup, PhraseProgress, UserProgress } from '../store/types';
import { filterByReadiness } from './word-readiness';
import { minimalPairDistractors, minimalPairWords } from './minimal-pair-distractors';

/**
 * Sentence-construction exercise types. These get a flat weight bonus in
 * `pickExerciseType` so building stays a live option even early in a
 * session (not just at the back-loaded "harder" end).
 */
const CONSTRUCTION_TYPES = new Set<ExerciseType>([
  'word-tiles', 'fill-in-blank', 'sentence-builder', 'pattern-match',
]);

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRandom<T>(array: T[], count: number): T[] {
  return shuffle(array).slice(0, count);
}

/** Lower-case the first character of a word (the rest is left untouched). */
function lowerFirst(w: string): string {
  return w.length ? w.charAt(0).toLowerCase() + w.slice(1) : w;
}

function terminalPunct(s: string): string {
  const t = s.trim();
  const last = t.charAt(t.length - 1);
  return last === '?' || last === '!' ? last : '';
}
function tokenCount(s: string): number {
  return s.trim().replace(/[.!?,;:()"']/g, '').split(/\s+/).filter(Boolean).length;
}
function contentWords(s: string): string[] {
  return s.toLowerCase().replace(/[.!?,;:()"']/g, '').split(/\s+/).filter((w) => w.length > 2);
}
/** How many content words (>2 chars) the candidate shares with the answer. */
function sharedContentCount(candidate: string, correct: string): number {
  const setB = new Set(contentWords(correct));
  let n = 0;
  for (const w of new Set(contentWords(candidate))) if (setB.has(w)) n++;
  return n;
}
/** Lower = better distractor (more parallel to `correct`). */
function parityScore(candidate: string, correct: string): number {
  const isQ = (x: string) => terminalPunct(x) === '?';
  const questionMismatch = isQ(candidate) !== isQ(correct) ? 100 : 0; // never mix Q with non-Q
  const wcDiff = Math.abs(tokenCount(candidate) - tokenCount(correct)) * 3;
  const charDiff = Math.abs(candidate.length - correct.length) / 8;
  // Reward sharing content words with the answer: a distractor that reuses the
  // answer's noun(s) forces real reading instead of keyword-spotting.
  const overlapBonus = sharedContentCount(candidate, correct) * 6;
  return questionMismatch + wcDiff + charDiff - overlapBonus;
}

function getAllPhrases(lesson: Lesson): Phrase[] {
  return lesson.phraseGroups.flatMap((g) => g.phrases);
}

/**
 * Find the phrase group that contains the given phrase.
 */
function findPhraseGroup(phrase: Phrase, lesson: Lesson): PhraseGroup | undefined {
  return lesson.phraseGroups.find((g) => g.phrases.some((p) => p.id === phrase.id));
}

/**
 * Get distractors preferring same phrase group (semantically related), then
 * falling back to the rest of the lesson, then to the global phrase pool.
 * Always returns exactly `count` unique distractors (or fewer only if there
 * aren't enough distinct candidates in the entire catalog).
 *
 * The global top-up matters now that short generalized frames sit in the
 * MC pools: a tiny same-group could otherwise leave MC with < `count`
 * options. `allPhrases` is already the global pool every caller passes in.
 */
function getDistractors(
  correct: string,
  phrase: Phrase,
  allPhrases: Phrase[],
  field: 'en' | 'sr_latin' | 'sr_cyrillic',
  count: number,
  lesson?: Lesson,
  bucket: number = 0
): string[] {
  // Guardrail: never emit an option that is also a correct answer. Exclude the
  // correct surface AND every variation surface for this field (variations are
  // valid alternatives — a distractor equal to one would mark a right answer wrong).
  const seen = new Set<string>([correct]);
  for (const v of phrase.variations ?? []) {
    const surf = field === 'en' ? v.en : v[field];
    if (surf) seen.add(surf);
  }
  const result: string[] = [];

  // Phase 0: minimal-pair distractors — same core noun, one axis changed.
  // Preferred when available; the pool phases below top up the rest.
  for (const t of minimalPairDistractors(phrase, field, count, bucket, seen)) {
    if (result.length >= count) break;
    if (!seen.has(t)) {
      seen.add(t);
      result.push(t);
    }
  }

  // Phase 1: same phrase group (semantically related distractors)
  if (result.length < count && lesson) {
    const group = findPhraseGroup(phrase, lesson);
    if (group) {
      const groupCandidates = shuffle(group.phrases)
        .filter((p) => p.id !== phrase.id)
        .map((p) => p[field])
        .filter((t) => !seen.has(t))
        .sort((a, b) => parityScore(a, correct) - parityScore(b, correct));
      for (const t of groupCandidates) {
        if (result.length >= count) break;
        seen.add(t);
        result.push(t);
      }
    }
  }

  // Phase 2: pad with other phrases from the same lesson (when known)
  if (result.length < count && lesson) {
    const lessonPhrases = getAllPhrases(lesson);
    const remaining = shuffle(lessonPhrases)
      .filter((p) => p.id !== phrase.id)
      .map((p) => p[field])
      .filter((t) => !seen.has(t))
      .sort((a, b) => parityScore(a, correct) - parityScore(b, correct));
    for (const t of remaining) {
      if (result.length >= count) break;
      seen.add(t);
      result.push(t);
    }
  }

  // Phase 3: distractor guard — top up from the GLOBAL pool (the
  // `allPhrases` param) so callers always get `count` DISTINCT distractors,
  // even when same-group / lesson pools are tiny (short frames).
  if (result.length < count) {
    const global = shuffle(allPhrases)
      .filter((p) => p.id !== phrase.id)
      .map((p) => p[field])
      .filter((t) => !seen.has(t))
      .sort((a, b) => parityScore(a, correct) - parityScore(b, correct));
    for (const t of global) {
      if (result.length >= count) break;
      seen.add(t);
      result.push(t);
    }
  }

  return result.slice(0, count);
}

/**
 * Listening comprehension: play the Serbian clip, pick the English
 * meaning. Distractors are other English glosses (same-group-first).
 * The component hides the Serbian text until after the answer.
 */
function generateListenChoice(
  phrase: Phrase,
  allPhrases: Phrase[],
  lesson?: Lesson,
  bucket: number = 0
): Exercise {
  const distractors = getDistractors(phrase.en, phrase, allPhrases, 'en', 3, lesson, bucket);
  return {
    type: 'listen-choice',
    phrase,
    direction: 'sr-to-en',
    prompt: phrase.en,
    correctAnswer: phrase.en,
    options: shuffle([phrase.en, ...distractors]),
  };
}

function generateMultipleChoice(
  phrase: Phrase,
  allPhrases: Phrase[],
  script: 'latin' | 'cyrillic',
  direction: 'sr-to-en' | 'en-to-sr',
  lesson?: Lesson,
  bucket: number = 0
): Exercise {
  if (direction === 'sr-to-en') {
    const prompt = script === 'cyrillic' ? phrase.sr_cyrillic : phrase.sr_latin;
    const distractors = getDistractors(phrase.en, phrase, allPhrases, 'en', 3, lesson, bucket);
    return {
      type: 'multiple-choice',
      phrase,
      direction,
      prompt,
      correctAnswer: phrase.en,
      options: shuffle([phrase.en, ...distractors]),
      context: phrase.context,
    };
  } else {
    const srField = script === 'cyrillic' ? 'sr_cyrillic' : 'sr_latin';
    const correctSr = phrase[srField];
    const distractors = getDistractors(correctSr, phrase, allPhrases, srField, 3, lesson, bucket);
    return {
      type: 'multiple-choice',
      phrase,
      direction,
      prompt: phrase.en,
      correctAnswer: correctSr,
      options: shuffle([correctSr, ...distractors]),
      context: phrase.context,
    };
  }
}

function generateTypeTranslation(
  phrase: Phrase,
  script: 'latin' | 'cyrillic',
  direction: 'sr-to-en' | 'en-to-sr'
): Exercise {
  if (direction === 'sr-to-en') {
    return {
      type: 'type-translation',
      phrase,
      direction,
      prompt: script === 'cyrillic' ? phrase.sr_cyrillic : phrase.sr_latin,
      correctAnswer: phrase.en,
    };
  }
  return {
    type: 'type-translation',
    phrase,
    direction,
    prompt: phrase.en,
    correctAnswer: script === 'cyrillic' ? phrase.sr_cyrillic : phrase.sr_latin,
  };
}

const FUNCTION_WORDS = new Set([
  'je', 'si', 'sam', 'su', 'smo', 'ste',
  'mi', 'ti', 'me', 'te', 'ga',
  'u', 'na', 'za', 'sa', 's', 'od', 'do', 'po', 'iz', 'o',
  'i', 'a', 'ali', 'ili', 'ni', 'da', 'se', 'ce', 'bi',
  'taj', 'ta', 'to', 'ovo', 'ova', 'ovaj',
]);

function generateFillInBlank(
  phrase: Phrase,
  script: 'latin' | 'cyrillic'
): Exercise {
  const text = script === 'cyrillic' ? phrase.sr_cyrillic : phrase.sr_latin;
  const words = text.replace(/[.!?,]/g, '').split(/\s+/);
  if (words.length < 2) {
    return generateTypeTranslation(phrase, script, 'en-to-sr');
  }

  const contentIndices = words
    .map((w, i) => ({ word: w, idx: i }))
    .filter(({ word }) => !FUNCTION_WORDS.has(word.toLowerCase()) && word.length > 2);

  const blankIdx = contentIndices.length > 0
    ? contentIndices[Math.floor(Math.random() * contentIndices.length)].idx
    : Math.floor(Math.random() * words.length);

  const answer = words[blankIdx];
  const blanked = words.map((w, i) => (i === blankIdx ? '______' : w)).join(' ');

  return {
    type: 'fill-in-blank',
    phrase,
    direction: 'en-to-sr',
    prompt: blanked,
    correctAnswer: answer,
    blankIndex: blankIdx,
    context: phrase.en,
  };
}

function generateWordTiles(
  phrase: Phrase,
  allPhrases: Phrase[],
  script: 'latin' | 'cyrillic',
  lesson?: Lesson,
  bucket: number = 0
): Exercise {
  const text = script === 'cyrillic' ? phrase.sr_cyrillic : phrase.sr_latin;
  // Lower-case the sentence-initial capital so the first tile doesn't betray
  // where the sentence starts once the tiles are shuffled.
  const words = text
    .replace(/[.!?,]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => (i === 0 ? lowerFirst(w) : w));

  // A single-tile "sentence" is pointless — fall back to a recognition choice.
  if (words.length < 2) {
    return generateMultipleChoice(phrase, allPhrases, script, 'en-to-sr', lesson, bucket);
  }

  return {
    type: 'word-tiles',
    phrase,
    direction: 'en-to-sr',
    prompt: phrase.en,
    correctAnswer: words.join(' '),
    tiles: shuffle(words),
  };
}

function generateScriptConvert(phrase: Phrase): Exercise {
  const showCyrillic = Math.random() > 0.5;
  return {
    type: 'script-convert',
    phrase,
    direction: 'sr-to-en',
    prompt: showCyrillic ? phrase.sr_cyrillic : phrase.sr_latin,
    correctAnswer: showCyrillic ? phrase.sr_latin : phrase.sr_cyrillic,
    context: showCyrillic
      ? 'Convert from Cyrillic to Latin'
      : 'Convert from Latin to Cyrillic',
  };
}

function buildSituationalPrompt(phrase: Phrase): string {
  // Use the phrase's context to create an immersive situational prompt.
  // If there's a good context, frame it as a situation the user is in.
  if (phrase.context) {
    return phrase.context;
  }
  // Fallback: create a generic situational prompt from the English
  return `How would you say this in Serbian: "${phrase.en}"`;
}

function getDistractorWords(
  allPhrases: Phrase[],
  excludeWords: string[],
  script: 'latin' | 'cyrillic',
  count: number
): string[] {
  const excludeSet = new Set(excludeWords.map((w) => w.toLowerCase()));
  const candidateWords: string[] = [];
  const field = script === 'cyrillic' ? 'sr_cyrillic' : 'sr_latin';

  for (const p of allPhrases) {
    const words = p[field].replace(/[.!?,;:'"]/g, '').split(/\s+/);
    for (const w of words) {
      if (w.length > 1 && !excludeSet.has(w.toLowerCase())) {
        candidateWords.push(w);
      }
    }
  }

  const unique = [...new Set(candidateWords)];
  return pickRandom(unique, count);
}

function generateSentenceBuilder(
  phrase: Phrase,
  allPhrases: Phrase[],
  script: 'latin' | 'cyrillic'
): Exercise {
  const field = script === 'cyrillic' ? 'sr_cyrillic' : 'sr_latin';
  const text = phrase[field];
  // Lower-case the sentence-initial capital so the first tile doesn't reveal
  // the start when the tiles are shuffled (checking is case-insensitive).
  const coreWords = text
    .replace(/[.!?,;:'"]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => (i === 0 ? lowerFirst(w) : w));
  const correctAnswer = coreWords.join(' ');

  // A 1–2 word "sentence" isn't worth building (one tile is trivial). Fall
  // back to a tap-to-order or a recognition choice instead.
  if (coreWords.length < 3) {
    return coreWords.length < 2
      ? generateMultipleChoice(phrase, allPhrases, script, 'en-to-sr')
      : generateWordTiles(phrase, allPhrases, script);
  }

  // Build accepted answers: include the main phrase and any variations
  const acceptedAnswers = [correctAnswer];
  if (phrase.variations) {
    for (const v of phrase.variations) {
      const vText = script === 'cyrillic' ? v.sr_cyrillic : v.sr_latin;
      const vWords = vText.replace(/[.!?,;:'"]/g, '').split(/\s+/).filter(Boolean);
      acceptedAnswers.push(vWords.join(' '));
    }
  }

  // Add 1-2 distractor words. Prefer minimal-pair tiles — wrong-form variants
  // of the phrase's own words (verb in the wrong person, noun in the wrong
  // case) — which are real grammatical traps; top up with random pool words.
  // Lower-case their initials too so no capitalised tile hints at the start.
  const distractorCount = coreWords.length <= 2 ? 1 : 2;
  const excludeWords = new Set(coreWords.map((w) => w.toLowerCase()));
  const distractors = minimalPairWords(phrase, script, distractorCount, excludeWords).map(lowerFirst);
  if (distractors.length < distractorCount) {
    distractors.push(
      ...getDistractorWords(
        allPhrases,
        [...coreWords, ...distractors],
        script,
        distractorCount - distractors.length
      ).map(lowerFirst)
    );
  }

  const tiles = shuffle([...coreWords, ...distractors]);

  return {
    type: 'sentence-builder',
    phrase,
    direction: 'en-to-sr',
    prompt: phrase.en,
    situationalPrompt: buildSituationalPrompt(phrase),
    correctAnswer,
    acceptedAnswers,
    tiles,
    context: phrase.context,
  };
}

// Dialogue templates for comprehension exercises.
//
// Each template wraps the target Serbian phrase into a short, natural
// 2-line Serbian dialogue. The dialogue stays entirely Serbian; the
// learner must COMPREHEND it to answer. The scaffolding lines are
// proper Serbian orthography (with diacritics) in both scripts.
//
// The OPTIONS are English meanings (built by `generateComprehension`),
// so the target line never appears as a visible answer — the answer is
// not on screen. Each template only embeds the phrase and reports which
// speaker uttered it (`speakerName`), used in the English question.
interface DialogueTemplate {
  build: (
    phraseText: string,
    script: 'latin' | 'cyrillic'
  ) => {
    dialogue: string[];
    /** Name of the speaker who utters the target phrase. */
    speakerName: string;
  };
}

const dialogueTemplates: DialogueTemplate[] = [
  {
    // A neutral attention-getter opener — "Hey." / "Listen." / "You know what?"
    // — can precede ANY statement, so the dialogue never turns into nonsense
    // like "Ne mogu, moram da… Živeo!". The old invite/decline template that
    // prepended "moram da…" is gone (it broke on toasts/greetings/exclamations).
    build: (phraseText, script) => {
      const names = shuffle(['Ana', 'Marko', 'Jelena', 'Stefan', 'Milica', 'Nikola']);
      const a = names[0];
      const b = names[1];
      const openers =
        script === 'cyrillic'
          ? ['Хеј.', 'Чуј.', 'Слушај.', 'Знаш шта?']
          : ['Hej.', 'Čuj.', 'Slušaj.', 'Znaš šta?'];
      const opener = openers[Math.floor(Math.random() * openers.length)];
      return {
        dialogue: [`${a}: "${opener}"`, `${b}: "${phraseText}"`],
        speakerName: b,
      };
    },
  },
];

function generateComprehension(
  phrase: Phrase,
  allPhrases: Phrase[],
  script: 'latin' | 'cyrillic',
  lesson?: Lesson,
  bucket: number = 0
): Exercise {
  const srField = script === 'cyrillic' ? 'sr_cyrillic' : 'sr_latin';
  const phraseText = phrase[srField];

  // Comprehension only makes sense for multi-word STATEMENTS. Toasts,
  // greetings, one-word reactions, exclamations and questions read as nonsense
  // once wrapped in a mini-dialogue (the old "Ne mogu, moram da… Živeo!" bug)
  // or have no informative meaning to decode — those fall back to a plain
  // recognition MC (read the Serbian, pick the English).
  const term = terminalPunct(phrase.sr_latin);
  const eligible = tokenCount(phrase.sr_latin) >= 3 && term !== '!' && term !== '?';
  if (!eligible) {
    return generateMultipleChoice(phrase, allPhrases, script, 'sr-to-en', lesson, bucket);
  }
  const template = dialogueTemplates[Math.floor(Math.random() * dialogueTemplates.length)];
  const { dialogue, speakerName } = template.build(phraseText, script);

  // Options are ENGLISH meanings. The learner must comprehend the Serbian
  // dialogue to pick the meaning of the target line — the answer is never
  // visible on screen. Distractors are parity-matched English glosses.
  const correctAnswer = phrase.en;
  const distractors = getDistractors(correctAnswer, phrase, allPhrases, 'en', 3, lesson, bucket);
  const options = shuffle([correctAnswer, ...distractors]);

  return {
    type: 'comprehension',
    phrase,
    direction: 'sr-to-en',
    prompt: dialogue.join('\n'),
    correctAnswer,
    options,
    dialogue,
    question: `What does ${speakerName} mean?`,
  };
}

/**
 * Identify the words that changed between two phrases.
 * Returns a string like "draga → dragi, moja → moj"
 */
function describeChanges(original: string, variant: string): string {
  const origWords = original.replace(/[.!?,;:'"]/g, '').split(/\s+/).filter(Boolean);
  const varWords = variant.replace(/[.!?,;:'"]/g, '').split(/\s+/).filter(Boolean);

  const changes: string[] = [];
  const maxLen = Math.max(origWords.length, varWords.length);
  for (let i = 0; i < maxLen; i++) {
    const ow = origWords[i] ?? '';
    const vw = varWords[i] ?? '';
    if (ow.toLowerCase() !== vw.toLowerCase()) {
      if (ow && vw) {
        changes.push(`${ow} → ${vw}`);
      } else if (vw) {
        changes.push(`+${vw}`);
      } else {
        changes.push(`-${ow}`);
      }
    }
  }
  return changes.join(', ') || 'same words, different form';
}

/**
 * How much vocabulary two phrases share, by leading-stem overlap (so
 * inflected pairs like gladan/gladna or radio/radila still count as
 * "the same word"). Returns 0..1 over the larger token set.
 *
 * This lets us tell a genuine MORPHOLOGICAL transform (gender/case swap,
 * same words) apart from a wholly different ALTERNATIVE phrasing that a
 * lesson happens to list as a `variation` (e.g. "Najeo sam se, hvala." →
 * "Ne mogu više."). For the latter, the token-count/question signals
 * would mislabel it ("a word was removed", "endings changed") and the
 * symbolic diff is nonsense — so we route those to a neutral label.
 */
function sharedStemRatio(a: string, b: string): number {
  const toStems = (s: string) =>
    new Set(
      s
        .replace(/[.!?,;:'"]/g, '')
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => (w.length > 4 ? w.slice(0, 4) : w))
    );
  const sa = toStems(a);
  const sb = toStems(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let shared = 0;
  for (const s of sa) if (sb.has(s)) shared++;
  return shared / Math.max(sa.size, sb.size);
}

function generatePatternMatch(
  phrase: Phrase,
  allPhrases: Phrase[],
  script: 'latin' | 'cyrillic',
  lesson?: Lesson
): Exercise {
  // This type should only be called for phrases with variations.
  // If somehow called without, fall back to multiple-choice.
  if (!phrase.variations || phrase.variations.length === 0) {
    return generateMultipleChoice(phrase, allPhrases, script, 'sr-to-en', lesson);
  }

  const variation = phrase.variations[Math.floor(Math.random() * phrase.variations.length)];
  const srField = script === 'cyrillic' ? 'sr_cyrillic' : 'sr_latin';

  const originalText = phrase[srField];
  const variantText = variation[srField];
  const originalEn = phrase.en;
  const variantEn = variation.en;

  // Categorise the transformation using ONLY safely-detectable signals
  // (word-count delta + question punctuation + vocabulary overlap). We
  // deliberately do NOT guess gender vs case from endings — that's
  // unreliable. All labels are parallel natural-language phrases, so the
  // correct one can't be picked off by odd format.
  const origWordCount = tokenCount(originalText);
  const varWordCount = tokenCount(variantText);
  const origIsQ = terminalPunct(originalText) === '?';
  const varIsQ = terminalPunct(variantText) === '?';
  // Below this overlap the variant is a different phrasing, not a tweak
  // of the original — so add/remove/endings would all be a lie. (Genuine
  // gender/case pairs share leading stems and score >= 0.5; only wholly
  // different alternatives fall under it. See sharedStemRatio.)
  const isAlternativePhrasing = sharedStemRatio(originalText, variantText) < 0.5;

  const ADDED = 'A word was added';
  const REMOVED = 'A word was removed';
  const QUESTION = 'It became a question';
  const ENDINGS = 'The word endings changed';
  const DIFFERENT = "It's another way to say it";
  const ALL_LABELS = [ADDED, REMOVED, QUESTION, ENDINGS, DIFFERENT];

  let correctAnswer: string;
  if (isAlternativePhrasing) {
    // Different words entirely — a synonym/rephrasing, not a transform.
    correctAnswer = DIFFERENT;
  } else if (varWordCount > origWordCount) {
    correctAnswer = ADDED;
  } else if (varWordCount < origWordCount) {
    correctAnswer = REMOVED;
  } else if (!origIsQ && varIsQ) {
    correctAnswer = QUESTION;
  } else {
    correctAnswer = ENDINGS;
  }

  // Two parallel distractor labels, never equal to the correct one.
  const distractors = shuffle(ALL_LABELS.filter((l) => l !== correctAnswer)).slice(0, 2);

  // The precise symbolic diff moves to the POST-ANSWER explanation,
  // shown via `context` (rendered as "WHAT CHANGED" in PatternMatch.tsx).
  // A position-by-position diff only makes sense for a real transform; for
  // an alternative phrasing we just show both full phrases.
  const changeDiff = isAlternativePhrasing
    ? `${originalText} = ${variantText}`
    : describeChanges(originalText, variantText);

  // Build the grammar note from phrase notes or a generated fallback.
  let grammarNote = phrase.notes || '';
  if (!grammarNote) {
    grammarNote = isAlternativePhrasing
      ? `Both mean the same thing: "${originalEn}" and "${variantEn}" are two different ways to say it.`
      : `The original says "${originalEn}" and the variant says "${variantEn}". Notice how the word endings change.`;
  }

  return {
    type: 'pattern-match',
    phrase,
    direction: 'sr-to-en',
    prompt: `${originalText}  |  ${variantText}`,
    correctAnswer,
    options: shuffle([correctAnswer, ...distractors]),
    context: changeDiff,
    originalPhrase: { text: originalText, label: originalEn, textLatin: phrase.sr_latin },
    variantPhrase: { text: variantText, label: variantEn, textLatin: variation.sr_latin },
    grammarNote,
  };
}

function generateContextPick(
  phrase: Phrase,
  allPhrases: Phrase[],
  script: 'latin' | 'cyrillic',
  lesson?: Lesson,
  bucket: number = 0
): Exercise {
  const srField = script === 'cyrillic' ? 'sr_cyrillic' : 'sr_latin';
  const correct = phrase[srField];
  const distractors = getDistractors(correct, phrase, allPhrases, srField, 3, lesson, bucket);

  return {
    type: 'context-pick',
    phrase,
    direction: 'en-to-sr',
    prompt: phrase.context || phrase.en,
    correctAnswer: correct,
    options: shuffle([correct, ...distractors]),
  };
}

/**
 * Pedagogically-ordered exercise types per SRS bucket. Tilted toward
 * sentence construction: tile/build types enter at bucket 1 and become a
 * core part of the mix at bucket 2, so daily practice teaches assembling
 * sentences rather than just recognising them.
 *
 * Bucket 0 (New):      recognition — see Serbian pick English, or pick by context
 * Bucket 1 (Learning): construction enters — word-tiles alongside recognition
 * Bucket 2 (Familiar): construction is core — word-tiles, fill-in-blank, sentence-builder
 * Bucket 3 (Known):    free recall — building plus comprehension + type-translation
 * Bucket 4 (Strong):   hardest production — building, script-convert, comprehension
 * Bucket 5 (Mastered): maintenance — type-translation, script-convert, sentence-builder
 */
const exerciseTypesForBucket: Record<number, ExerciseType[]> = {
  0: ['multiple-choice', 'context-pick'],
  1: ['multiple-choice', 'context-pick', 'word-tiles', 'listen-choice'],
  2: ['multiple-choice', 'context-pick', 'word-tiles', 'fill-in-blank', 'sentence-builder', 'pattern-match', 'listen-choice'],
  3: ['context-pick', 'word-tiles', 'fill-in-blank', 'sentence-builder', 'comprehension', 'type-translation', 'pattern-match', 'listen-choice'],
  4: ['word-tiles', 'fill-in-blank', 'sentence-builder', 'comprehension', 'type-translation', 'script-convert', 'pattern-match', 'listen-choice'],
  5: ['type-translation', 'script-convert', 'sentence-builder'],
};

/**
 * When the learner has `skipTyping` on, swap any free-text production
 * exercise for a recognition-style alternative. Word-tiles stays — tapping
 * tiles isn't typing — and pattern-match stays — it's multiple-choice.
 * Comprehension, fill-in-blank, sentence-builder all stay (they're MC
 * or tap-to-place). Only `type-translation` and `script-convert` need
 * swapping out.
 */
const SKIP_TYPING_SWAP: Partial<Record<ExerciseType, ExerciseType>> = {
  'type-translation': 'multiple-choice',
  'script-convert': 'multiple-choice',
};

function applySkipTyping(type: ExerciseType, skipTyping: boolean): ExerciseType {
  if (!skipTyping) return type;
  return SKIP_TYPING_SWAP[type] ?? type;
}

/**
 * Weighted random selection from exercise types for a bucket.
 * Later entries in the array are treated as harder. Within a session,
 * `sessionPosition` (0-1) biases toward harder types as the learner
 * progresses.
 */
function pickExerciseType(types: ExerciseType[], sessionPosition: number): ExerciseType {
  if (types.length <= 1) return types[0];

  const weights = types.map((t, idx) => {
    const normalizedIdx = idx / (types.length - 1);
    return 1 + sessionPosition * normalizedIdx * 2 + (CONSTRUCTION_TYPES.has(t) ? 0.8 : 0);
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return types[i];
  }
  return types[types.length - 1];
}

/**
 * Difficulty tier for session ordering.
 * 0 = easy (recognition), 1 = medium (guided production), 2 = hard (free recall)
 */
const exerciseDifficultyTier: Record<ExerciseType, number> = {
  'multiple-choice': 0,
  'context-pick': 0,
  'match-pairs': 1,
  'fill-in-blank': 1,
  'word-tiles': 1,
  'pattern-match': 1,
  'sentence-builder': 2,
  'type-translation': 2,
  'script-convert': 2,
  'comprehension': 2,
  'perspective-shift': 1,
  'word-recognize': 0,
  'word-produce': 1,
  'listen-choice': 1,
  'conjugate': 1,
};

function getDirectionForBucket(bucket: number): 'sr-to-en' | 'en-to-sr' {
  // Production (en→sr) wins early — it's the harder, more valuable
  // direction and the real test of knowing a word. Recognition (sr→en)
  // only dominates at first contact, then production takes over fast.
  // Matches ARCHITECTURE.md "Production > recognition" + pedagogy audit §3.4.
  // (probability shown is for sr→en recognition.)
  if (bucket === 0) return Math.random() < 0.7 ? 'sr-to-en' : 'en-to-sr';
  if (bucket === 1) return Math.random() < 0.4 ? 'sr-to-en' : 'en-to-sr';
  if (bucket === 2) return Math.random() < 0.25 ? 'sr-to-en' : 'en-to-sr';
  return Math.random() < 0.15 ? 'sr-to-en' : 'en-to-sr';
}

export function generateExercise(
  phrase: Phrase,
  allPhrases: Phrase[],
  script: 'latin' | 'cyrillic',
  bucket: number = 0,
  forcedType?: ExerciseType,
  lesson?: Lesson,
  sessionPosition: number = 0.5,
  skipTyping: boolean = false
): Exercise {
  const clampedBucket = Math.min(bucket, 5);
  const types = exerciseTypesForBucket[clampedBucket] ?? exerciseTypesForBucket[0];
  const picked = forcedType ?? pickExerciseType(types, sessionPosition);
  const type = applySkipTyping(picked, skipTyping);
  const direction = getDirectionForBucket(clampedBucket);

  switch (type) {
    case 'multiple-choice':
      return generateMultipleChoice(phrase, allPhrases, script, direction, lesson, clampedBucket);
    case 'type-translation':
      return generateTypeTranslation(phrase, script, direction);
    case 'fill-in-blank':
      return generateFillInBlank(phrase, script);
    case 'word-tiles':
      return generateWordTiles(phrase, allPhrases, script, lesson, clampedBucket);
    case 'script-convert':
      return generateScriptConvert(phrase);
    case 'context-pick':
      return generateContextPick(phrase, allPhrases, script, lesson, clampedBucket);
    case 'sentence-builder':
      return generateSentenceBuilder(phrase, allPhrases, script);
    case 'comprehension':
      return generateComprehension(phrase, allPhrases, script, lesson, clampedBucket);
    case 'listen-choice':
      return generateListenChoice(phrase, allPhrases, lesson, clampedBucket);
    case 'pattern-match':
      // Only generate pattern-match for phrases with variations; fall back otherwise
      if (phrase.variations && phrase.variations.length > 0) {
        return generatePatternMatch(phrase, allPhrases, script, lesson);
      }
      return generateMultipleChoice(phrase, allPhrases, script, direction, lesson, clampedBucket);
    case 'match-pairs':
    default:
      return generateMultipleChoice(phrase, allPhrases, script, 'sr-to-en', lesson, clampedBucket);
  }
}

export function generateLessonExercises(
  lesson: Lesson,
  phraseProgress: Record<string, PhraseProgress>,
  script: 'latin' | 'cyrillic',
  count: number = 15,
  skipTyping: boolean = false,
  /** Optional — when provided, filters out phrases whose content words
   *  the learner hasn't met yet. Passed through to the readiness gate. */
  userProgress?: UserProgress
): Exercise[] {
  const allPhrases = getAllPhrases(lesson);
  if (allPhrases.length === 0) return [];

  // Readiness gate: when we have full UserProgress, filter the practice
  // pool to phrases whose content words are at least met. Phrases with no
  // wordRefs are treated as ready (so untagged lessons fall through).
  const practicePool = userProgress
    ? filterByReadiness(allPhrases, userProgress, 'preview')
    : allPhrases;
  if (practicePool.length === 0) {
    // Nothing ready — fall back to the original pool so the user isn't
    // shown an empty session. The chip strip / Word tab can pick up the
    // unmet vocab.
    practicePool.push(...allPhrases);
  }

  const exercises: Exercise[] = [];
  const phrasesToPractice = shuffle(practicePool);

  let i = 0;
  while (exercises.length < count) {
    const phrase = phrasesToPractice[i % phrasesToPractice.length];
    const progress = phraseProgress[phrase.id];
    const bucket = progress?.bucket ?? 0;
    const sessionPosition = exercises.length / Math.max(count - 1, 1);
    exercises.push(
      generateExercise(phrase, allPhrases, script, bucket, undefined, lesson, sessionPosition, skipTyping)
    );
    i++;
  }

  // Order exercises by difficulty tier within the session:
  //   First third:  easy (recognition)
  //   Middle third: medium (guided production)
  //   Last third:   hard (free recall)
  // Within each tier, shuffle for variety.
  const chunkSize = Math.ceil(count / 3);
  const sorted = [...exercises].sort(
    (a, b) => exerciseDifficultyTier[a.type] - exerciseDifficultyTier[b.type]
  );

  const easyChunk = shuffle(sorted.slice(0, chunkSize));
  const mediumChunk = shuffle(sorted.slice(chunkSize, chunkSize * 2));
  const hardChunk = shuffle(sorted.slice(chunkSize * 2));

  return [...easyChunk, ...mediumChunk, ...hardChunk];
}

export function generateReviewExercises(
  lessons: Lesson[],
  dueItems: PhraseProgress[],
  script: 'latin' | 'cyrillic',
  count: number = 15,
  skipTyping: boolean = false
): Exercise[] {
  const allPhrases = lessons.flatMap(getAllPhrases);
  const phraseMap = new Map(allPhrases.map((p) => [p.id, p]));

  // Build a lesson lookup for distractor grouping
  const phraseLessonMap = new Map<string, Lesson>();
  for (const lesson of lessons) {
    for (const group of lesson.phraseGroups) {
      for (const p of group.phrases) {
        phraseLessonMap.set(p.id, lesson);
      }
    }
  }

  const exercises: Exercise[] = [];
  const dueShuffled = shuffle(dueItems);

  for (let i = 0; exercises.length < count && i < dueShuffled.length; i++) {
    const progress = dueShuffled[i];
    const phrase = phraseMap.get(progress.phraseId);
    if (!phrase) continue;
    const lesson = phraseLessonMap.get(progress.phraseId);
    const sessionPosition = exercises.length / Math.max(count - 1, 1);
    exercises.push(
      generateExercise(phrase, allPhrases, script, progress.bucket, undefined, lesson, sessionPosition, skipTyping)
    );
  }

  return exercises;
}

/**
 * Generate a low-commitment, randomized "Hammer" session that pulls from
 * the *entire* phrase catalog (every lesson). Bias:
 *   - 60% from low-bucket items (unseen or being-learned)
 *   - 30% from mid-bucket items (familiar, due-ish)
 *   - 10% from high-bucket items (light maintenance)
 * This gives quick wins on new vocab without ignoring older words.
 */
export function generateHammerSession(
  lessons: Lesson[],
  phraseProgress: Record<string, PhraseProgress>,
  script: 'latin' | 'cyrillic',
  count: number = 15,
  skipTyping: boolean = false,
  /** Optional — when provided, filters out phrases whose content words
   *  the learner hasn't met yet. */
  userProgress?: UserProgress
): Exercise[] {
  const allPhrases = lessons.flatMap(getAllPhrases);
  if (allPhrases.length === 0) return [];

  // Readiness gate when we have UserProgress; otherwise everything goes.
  const eligible = userProgress
    ? filterByReadiness(allPhrases, userProgress, 'preview')
    : allPhrases;
  const poolForBucketing = eligible.length > 0 ? eligible : allPhrases;

  const phraseLessonMap = new Map<string, Lesson>();
  for (const lesson of lessons) {
    for (const group of lesson.phraseGroups) {
      for (const p of group.phrases) {
        phraseLessonMap.set(p.id, lesson);
      }
    }
  }

  const buckets: Phrase[][] = [[], [], []]; // [low, mid, high]
  for (const phrase of poolForBucketing) {
    const b = phraseProgress[phrase.id]?.bucket ?? 0;
    if (b <= 1) buckets[0].push(phrase);
    else if (b <= 3) buckets[1].push(phrase);
    else buckets[2].push(phrase);
  }

  // If a bucket is empty, redistribute weights to the others.
  const targets = [
    Math.round(count * 0.6),
    Math.round(count * 0.3),
    count - Math.round(count * 0.6) - Math.round(count * 0.3),
  ];

  const picked: Phrase[] = [];
  for (let i = 0; i < buckets.length; i++) {
    const pool = buckets[i];
    if (pool.length === 0) continue;
    const target = targets[i];
    const sample = shuffle(pool).slice(0, target);
    picked.push(...sample);
  }

  // Pad with random phrases if some buckets were too small
  if (picked.length < count) {
    const seen = new Set(picked.map((p) => p.id));
    const extras = shuffle(allPhrases.filter((p) => !seen.has(p.id))).slice(
      0,
      count - picked.length
    );
    picked.push(...extras);
  }

  const finalPhrases = shuffle(picked).slice(0, count);

  return finalPhrases.map((phrase, idx) => {
    const bucket = phraseProgress[phrase.id]?.bucket ?? 0;
    const lesson = phraseLessonMap.get(phrase.id);
    const sessionPosition = idx / Math.max(count - 1, 1);
    return generateExercise(
      phrase,
      allPhrases,
      script,
      bucket,
      undefined,
      lesson,
      sessionPosition,
      skipTyping
    );
  });
}

export function generateMatchPairsData(
  lesson: Lesson,
  script: 'latin' | 'cyrillic',
  pairCount: number = 5
): { pairs: { sr: string; en: string; id: string }[] } {
  const allPhrases = getAllPhrases(lesson);
  const selected = pickRandom(allPhrases, pairCount);
  return {
    pairs: selected.map((p) => ({
      sr: script === 'cyrillic' ? p.sr_cyrillic : p.sr_latin,
      en: p.en,
      id: p.id,
    })),
  };
}
