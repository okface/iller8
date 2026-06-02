// localStorage persistence for the körkortsteori module. Completely separate
// from the Serbian `iller8_progress` store — different key, never touched by
// the Serbian flow and vice-versa.

import { createPhraseProgress, recordAnswer } from '../engine/srs';
import type { DrivingState } from './types';

const STORAGE_KEY = 'iller8_driving_progress';

function createDefaultState(): DrivingState {
  return { questions: {}, totalAnswered: 0, totalCorrect: 0 };
}

export function loadDrivingState(): DrivingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw) as Partial<DrivingState>;
    return {
      questions: parsed.questions ?? {},
      totalAnswered: Number(parsed.totalAnswered) || 0,
      totalCorrect: Number(parsed.totalCorrect) || 0,
    };
  } catch {
    return createDefaultState();
  }
}

export function saveDrivingState(state: DrivingState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Record an answer and return the updated state. Reuses the Serbian SRS
 * bucket math verbatim (createPhraseProgress / recordAnswer) — the progress
 * object is the same shape, so the algorithm is identical and battle-tested.
 */
export function recordDrivingAnswer(
  state: DrivingState,
  questionId: string,
  correct: boolean,
): DrivingState {
  const prev = state.questions[questionId] ?? createPhraseProgress(questionId);
  const next = recordAnswer(prev, correct);
  return {
    questions: { ...state.questions, [questionId]: next },
    totalAnswered: state.totalAnswered + 1,
    totalCorrect: state.totalCorrect + (correct ? 1 : 0),
  };
}

export function resetDrivingState(): DrivingState {
  const fresh = createDefaultState();
  saveDrivingState(fresh);
  return fresh;
}
