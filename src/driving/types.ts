// Types for the körkortsteori (Swedish driving-theory) quiz module.
// This is a SEPARATE track from the Serbian content — questions stay in
// Swedish, progress lives under its own localStorage key.

export interface DrivingOption {
  text: string;
  correct: boolean;
  feedback: string;
}

export interface DrivingQuestion {
  id: string;
  /** Source topic: 'extra_fragor' | 'trafik_och_vagmarken' | 'vagmarken_auto' */
  topic: string;
  tags: string[];
  question: string;
  /** Road-sign filename (incl. extension) under public/driving-signs/, or null. */
  image: string | null;
  /** Exactly one option has correct: true. Shuffled at render time. */
  options: DrivingOption[];
  explanation: string;
}

/**
 * Per-question SRS progress. Structurally identical to PhraseProgress so the
 * pure functions in engine/srs.ts (recordAnswer, isDue, applyTimeDecay,
 * getDueItems) accept it unchanged. The `phraseId` field name is kept for
 * that compatibility; it holds the DrivingQuestion id.
 */
export interface DrivingProgress {
  phraseId: string;
  bucket: number;
  lastReviewed: number;
  correctCount: number;
  incorrectCount: number;
  streak: number;
}

export interface DrivingState {
  questions: Record<string, DrivingProgress>;
  totalAnswered: number;
  totalCorrect: number;
}

export type DrivingMode = 'quick10' | 'exam' | 'signs' | 'all' | `topic:${string}`;
