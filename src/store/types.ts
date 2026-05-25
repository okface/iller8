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
  | 'comprehension';

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
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: string;
}
