export interface PhraseVariation {
  sr_latin: string;
  sr_cyrillic: string;
  en: string;
}

export interface Phrase {
  id: string;
  sr_latin: string;
  sr_cyrillic: string;
  en: string;
  context?: string;
  notes?: string;
  variations?: PhraseVariation[];
  /** IDs of content Words this phrase is composed of. Used for the
   *  readiness gate (a phrase becomes drillable when the learner has
   *  met its content words individually) and the word-breakdown chips
   *  shown in PhraseIntro. Function words (clitics, prepositions) are
   *  generally NOT listed — only the words worth tracking on their own. */
  wordRefs?: string[];
}

export interface PhraseGroup {
  id: string;
  theme: string;
  phrases: Phrase[];
}

export interface LocalizedText {
  sr_latin: string;
  sr_cyrillic: string;
  en: string;
}

export interface Lesson {
  id: string;
  title: LocalizedText;
  description: {
    sr_latin?: string;
    en: string;
  };
  order: number;
  prerequisites: string[];
  phraseGroups: PhraseGroup[];
}

export interface PhraseProgress {
  phraseId: string;
  bucket: number;
  lastReviewed: number;
  correctCount: number;
  incorrectCount: number;
  streak: number;
}

export interface DailyStats {
  date: string;
  phrasesStudied: number;
  correctAnswers: number;
  totalAnswers: number;
  timeSpentSeconds: number;
}

export interface UserSettings {
  scriptPreference: 'latin' | 'cyrillic' | 'both';
  dailyGoal: number;
  darkMode: boolean;
  apiKey: string;
  /** When true, the exercise generator avoids type-translation
   *  exercises and the PhraseIntro flow drops its echo/typing step.
   *  Multiple-choice and recognition take their place. */
  skipTyping: boolean;
}

export interface UserProgress {
  phrases: Record<string, PhraseProgress>;
  completedLessons: string[];
  dailyStats: DailyStats[];
  achievements: string[];
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  settings: UserSettings;
}

export type ExerciseType =
  | 'multiple-choice'
  | 'type-translation'
  | 'fill-in-blank'
  | 'match-pairs'
  | 'word-tiles'
  | 'script-convert'
  | 'context-pick'
  | 'sentence-builder'
  | 'comprehension'
  | 'pattern-match'
  | 'perspective-shift'
  | 'word-recognize'   // see a single Serbian word, pick the English gloss
  | 'word-produce';    // see an English gloss, pick the Serbian word

export interface Exercise {
  type: ExerciseType;
  phrase: Phrase;
  direction: 'sr-to-en' | 'en-to-sr';
  options?: string[];
  correctAnswer: string;
  prompt: string;
  context?: string;
  blankIndex?: number;
  tiles?: string[];
  situationalPrompt?: string;
  acceptedAnswers?: string[];
  dialogue?: string[];
  question?: string;
  /** pattern-match specific fields */
  originalPhrase?: { text: string; label: string };
  variantPhrase?: { text: string; label: string };
  grammarNote?: string;
  /** perspective-shift specific fields */
  baseSr?: string;             // the script the learner is currently using
  baseSrLatin?: string;
  baseSrCyrillic?: string;
  baseEn?: string;
  transformLabel?: string;
  transformHint?: string;
  familyId?: string;
  variantId?: string;
}

/* ─── Phrase families ───────────────────────────────────────
 * A family clusters a base phrase with grammatical/semantic
 * variants that target a specific transformation: formality,
 * gender of speaker, tense, subject/object swap, aspect, etc.
 * Used by the "perspective-shift" exercise to drill the way
 * Serbian morphology bends a single idea into many forms.
 * ──────────────────────────────────────────────────────── */
export type FamilyTransformType =
  | 'subject-swap'    // ja → ona, ti → on
  | 'object-swap'     // te → je, mi → joj
  | 'tense-past'      // present → past
  | 'tense-future'    // present → future
  | 'aspect'          // imperfective → perfective
  | 'formality'       // ti → vi
  | 'number'          // singular → plural
  | 'gender-speaker'  // masc speaker → fem speaker (past tense)
  | 'gender-listener' // changes vocative / past participle for the addressee
  | 'negation'        // affirmative → negative
  | 'question'        // statement → question
  | 'reciprocity'     // "I miss you" → "I miss you too" / "you miss me"
  | 'intensifier';    // adds "mnogo / baš / stvarno"

export interface FamilyVariant {
  id: string;
  sr_latin: string;
  sr_cyrillic: string;
  en: string;
  /** Short label shown as the transform instruction (e.g., "formal (vi)", "past · to a man") */
  label: string;
  /** What kind of transformation this is — drives generator weighting. */
  transform: FamilyTransformType;
  /** Optional micro-hint shown above the input. Keep under ~80 chars. */
  hint?: string;
  /** Grammar note shown after answer (1–2 sentences). */
  note?: string;
}

export interface PhraseFamily {
  id: string;
  /** Theme in English — used as a card title. */
  theme: string;
  /** Optional category for filtering / grouping. */
  category?: string;
  /** The anchor phrase the learner already knows. */
  base: FamilyVariant;
  /** Variants the learner can be drilled on. */
  variants: FamilyVariant[];
  /** Optional link to a lesson — surfaces the family there. */
  lessonId?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: string;
}

/* ─── Word lexicon ─────────────────────────────────────────
 * The unit beneath Phrase. A learner who knows "voleti" gets
 * credit when "Volim te", "Volim kafu", and "Voleo sam te"
 * appear. Tracked in the same SRS map as phrases, keyed
 * `word:<id>` so the existing engine doesn't need to change.
 * See PEDAGOGY_AUDIT.md §3.1.
 * ─────────────────────────────────────────────────────── */

export type POS =
  | 'verb'
  | 'noun'
  | 'adj'
  | 'pron'
  | 'prep'
  | 'conj'
  | 'adv'
  | 'particle'
  | 'num'
  | 'interj';

export type Gender = 'm' | 'f' | 'n';

export interface WordExample {
  sr_latin: string;
  sr_cyrillic: string;
  en: string;
  /** Source phrase id, if applicable. */
  phraseRef?: string;
}

export interface WordForm {
  /** Form tag — short, lowercase, dot-separated, e.g. '1sg.pres', 'past.m.sg', 'voc.sg', 'acc.sg'. */
  tag: string;
  sr_latin: string;
  sr_cyrillic: string;
  /** Optional gloss for the form (e.g. "I love" for 1sg.pres of voleti). */
  en?: string;
}

export interface Word {
  id: string;                   // 'voleti', 'duša', 'mi-dat'
  lemma_sr_latin: string;       // canonical dictionary form, Latin
  lemma_sr_cyrillic: string;
  gloss_en: string;             // 'to love', 'soul', 'me (dat)'
  pos: POS;
  /** Noun gender (skip for non-nouns). */
  gender?: Gender;
  /** Verb aspect. */
  aspect?: 'perf' | 'impf';
  /** A handful of inflected forms worth drilling. Optional. */
  forms?: WordForm[];
  /** 2–4 example uses in real phrases. */
  examples: WordExample[];
  /** Lesson IDs that surface this word. */
  appearsIn?: string[];
  /** Frequency rank within our corpus (1 = most common). */
  rank?: number;
  notes?: string;
}
