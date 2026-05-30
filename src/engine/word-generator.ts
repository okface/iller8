import type { Word, POS, Exercise, Phrase } from '../store/types';

/**
 * Word-level exercise helpers. The hard part of word drills isn't the
 * UI — it's *picking the right distractors*. Showing `volim` against
 * `nedostaješ`, `dobro`, and `srećan` is too easy: the learner can
 * solve it on POS-shape alone. Real drilling demands minimal-pair
 * distractors: same POS, similar shape, different meaning.
 *
 * Spec: PEDAGOGY_AUDIT.md §3.2.
 */

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Get distractors for a target word, ranked by similarity:
 *   tier 1: same POS, same first letter (forces visual discrimination)
 *   tier 2: same POS, different first letter
 *   tier 3: random
 * Always returns exactly `count` unique distractors (or fewer if the
 * lexicon is too small).
 */
export function getWordDistractors(
  target: Word,
  allWords: Word[],
  count: number
): Word[] {
  const seen = new Set<string>([target.id]);
  const result: Word[] = [];
  const candidates = allWords.filter((w) => w.id !== target.id);

  const tier1 = shuffle(
    candidates.filter(
      (w) =>
        w.pos === target.pos &&
        firstLetter(w.lemma_sr_latin) === firstLetter(target.lemma_sr_latin)
    )
  );
  const tier2 = shuffle(
    candidates.filter(
      (w) =>
        w.pos === target.pos &&
        firstLetter(w.lemma_sr_latin) !== firstLetter(target.lemma_sr_latin)
    )
  );
  const tier3 = shuffle(candidates.filter((w) => w.pos !== target.pos));

  for (const tier of [tier1, tier2, tier3]) {
    for (const w of tier) {
      if (seen.has(w.id)) continue;
      seen.add(w.id);
      result.push(w);
      if (result.length >= count) return result;
    }
  }

  return result;
}

function firstLetter(s: string): string {
  return s.trim().charAt(0).toLowerCase();
}

/**
 * Filter words to the slice the learner can drill — those they've met
 * (bucket >= 1) but not fully mastered (bucket < 5), with new words
 * mixed in. The mix weighting is identical to Hammer's: 60% in-progress,
 * 30% unseen, 10% review.
 */
export interface WordPick {
  word: Word;
  bucket: number;
}

export function pickWordsForSession(
  allWords: Word[],
  getBucket: (wordId: string) => number,
  count: number
): WordPick[] {
  const buckets: WordPick[][] = [[], [], []]; // [low (0), mid (1–3), high (4+)]
  for (const word of allWords) {
    const b = getBucket(word.id);
    if (b <= 0) buckets[0].push({ word, bucket: b });
    else if (b <= 3) buckets[1].push({ word, bucket: b });
    else buckets[2].push({ word, bucket: b });
  }

  const targets = [
    Math.round(count * 0.3),
    Math.round(count * 0.6),
    count - Math.round(count * 0.3) - Math.round(count * 0.6),
  ];

  const picked: WordPick[] = [];
  for (let i = 0; i < buckets.length; i++) {
    const pool = buckets[i];
    if (pool.length === 0) continue;
    picked.push(...shuffle(pool).slice(0, targets[i]));
  }

  if (picked.length < count) {
    const seen = new Set(picked.map((p) => p.word.id));
    const extras = shuffle(allWords.filter((w) => !seen.has(w.id))).slice(
      0,
      count - picked.length
    );
    for (const word of extras) picked.push({ word, bucket: getBucket(word.id) });
  }

  return shuffle(picked).slice(0, count);
}

/** Filter words by POS — used to focus a session on, e.g., verbs only. */
export function filterByPOS(words: Word[], pos: POS | POS[]): Word[] {
  const set = new Set(Array.isArray(pos) ? pos : [pos]);
  return words.filter((w) => set.has(w.pos));
}

/**
 * Synthesise a Phrase from a Word so the rest of the exercise pipeline
 * (SRS tracking via `phrase.id`, retry queue, stats) works unchanged.
 * The id is prefixed `word:` so the existing `progress.phrases` map
 * stores word progress alongside phrase progress without collision.
 */
function wordAsPhrase(word: Word): Phrase {
  return {
    id: `word:${word.id}`,
    sr_latin: word.lemma_sr_latin,
    sr_cyrillic: word.lemma_sr_cyrillic,
    en: word.gloss_en,
    gloss_hint: word.gloss_hint,
    context: posLabel(word),
    notes: word.notes,
  };
}

function posLabel(word: Word): string {
  const parts: string[] = [word.pos];
  if (word.gender) parts.push(word.gender);
  if (word.aspect) parts.push(word.aspect);
  return parts.join(' · ');
}

/**
 * Build a word-recognition exercise (sr → en MC).
 */
export function generateWordRecognize(
  word: Word,
  allWords: Word[],
  script: 'latin' | 'cyrillic'
): Exercise {
  void script; // The Serbian display uses DualScript and handles script itself
  const distractors = getWordDistractors(word, allWords, 3).map((w) => w.gloss_en);
  const options = shuffle([word.gloss_en, ...distractors]);
  return {
    type: 'word-recognize',
    phrase: wordAsPhrase(word),
    direction: 'sr-to-en',
    prompt: word.lemma_sr_latin,
    correctAnswer: word.gloss_en,
    options,
    context: posLabel(word),
  };
}

/**
 * Build a word-production exercise (en → sr MC).
 */
export function generateWordProduce(
  word: Word,
  allWords: Word[],
  script: 'latin' | 'cyrillic'
): Exercise {
  const correct = script === 'cyrillic' ? word.lemma_sr_cyrillic : word.lemma_sr_latin;
  const distractors = getWordDistractors(word, allWords, 3).map((w) =>
    script === 'cyrillic' ? w.lemma_sr_cyrillic : w.lemma_sr_latin
  );
  const options = shuffle([correct, ...distractors]);
  return {
    type: 'word-produce',
    phrase: wordAsPhrase(word),
    direction: 'en-to-sr',
    prompt: word.gloss_en,
    correctAnswer: correct,
    options,
    context: posLabel(word),
  };
}

/**
 * Build a word listening exercise (hear → pick English). Same option
 * pool as recognize; the component hides the Serbian text and plays the
 * clip. Audio is hashed by the Latin lemma (via wordAsPhrase.sr_latin).
 */
export function generateWordListen(word: Word, allWords: Word[]): Exercise {
  const distractors = getWordDistractors(word, allWords, 3).map((w) => w.gloss_en);
  const options = shuffle([word.gloss_en, ...distractors]);
  return {
    type: 'listen-choice',
    phrase: wordAsPhrase(word),
    direction: 'sr-to-en',
    prompt: word.gloss_en,
    correctAnswer: word.gloss_en,
    options,
    context: posLabel(word),
  };
}

/**
 * A full word-drill session — mixes recognize, produce, and (once met)
 * listening per bucket.
 *
 * For beginners (audit §3.4): production wins fast.
 *   bucket 0: 50/50 recognize/produce (no listening until met)
 *   bucket 1+: ~20% listen, rest weighted toward produce
 */
export function generateWordSession(
  words: Word[],
  allWords: Word[],
  getBucket: (wordId: string) => number,
  script: 'latin' | 'cyrillic',
  count: number = 12
): Exercise[] {
  const picks = pickWordsForSession(words, getBucket, count);
  return picks.map(({ word, bucket }) => {
    // Once a word has been met (bucket ≥ 1), ~20% of the time train the
    // ear with a listening exercise.
    if (bucket >= 1 && Math.random() < 0.2) {
      return generateWordListen(word, allWords);
    }
    const recognizeWeight = bucket === 0 ? 0.5 : bucket === 1 ? 0.3 : 0.2;
    const useRecognize = Math.random() < recognizeWeight;
    return useRecognize
      ? generateWordRecognize(word, allWords, script)
      : generateWordProduce(word, allWords, script);
  });
}
