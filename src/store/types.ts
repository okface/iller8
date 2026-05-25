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
  | 'perspective-shift';

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
  baseSr?: string;
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
