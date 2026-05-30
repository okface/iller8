import { useCallback, useEffect, useRef, useState } from 'react';
import type { Exercise, UserProgress } from '../store/types';
import { createPhraseProgress, recordAnswer } from './srs';
import {
  updatePhraseProgress,
  updateDailyStats,
  saveProgress,
} from '../store/progress';

/**
 * One drill session, abstracted. Replaces the ~80 lines of identical
 * `[phase, exercises, currentIndex, correctCount, totalAnswered]` state
 * and `handleAnswer` orchestration that lived in WordDrill, Hammer,
 * FamilyDrill, and the exercise half of LessonView / ReviewSession.
 *
 * The caller supplies a `generate` function that returns the list of
 * exercises. We own the phase machine, the per-answer SRS update, and
 * the finish detection.
 *
 * Spec: CODE_HEALTH.md §3 refactor #4.
 */

export type Phase = 'browse' | 'drill' | 'finished';

export interface DrillSessionInput {
  /** Returns the list of exercises for the next drill. Called whenever
   *  phase transitions into 'drill' (either initial start or restart). */
  generate: () => Exercise[];
  progress: UserProgress;
  setProgress: (next: UserProgress) => void;
  /** Optional hook called after the last exercise is answered. */
  onFinish?: (stats: { correct: number; total: number }) => void;
  /** Optional hook called after every answer. */
  onAnswer?: (correct: boolean, exercise: Exercise) => void;
  /** Applied to the updated progress on every answer (idempotent).
   *  Lets every session path award achievements without duplicating
   *  the logic — the universal awards live in one place. Runs against
   *  fresh post-answer state, avoiding stale-closure bugs. */
  checkAchievements?: (progress: UserProgress) => UserProgress;
  /** On a wrong answer, build a retry exercise to re-surface the item
   *  ~4 questions later (capped at 2 retries per item). Returning null
   *  skips. This is the "failed items reappear" mechanic, now on every
   *  session path, not just the legacy lesson view. */
  buildRetry?: (exercise: Exercise) => Exercise | null;
}

export interface DrillSessionState {
  phase: Phase;
  exercises: Exercise[];
  currentIndex: number;
  currentExercise: Exercise | undefined;
  correctCount: number;
  totalAnswered: number;
  accuracy: number;
  /** Tap to start (browse → drill) or restart (finished → drill). */
  start: () => void;
  /** Called by the exercise component on answer. Advances or finishes. */
  handleAnswer: (correct: boolean) => void;
  /** Drop back to browse from anywhere. */
  reset: () => void;
  /** Push an extra exercise into the queue (e.g. retry-on-wrong). */
  insertExercise: (offset: number, exercise: Exercise) => void;
}

export function useDrillSession(input: DrillSessionInput): DrillSessionState {
  const { generate, progress, setProgress, onFinish, onAnswer, checkAchievements, buildRetry } = input;
  const [phase, setPhase] = useState<Phase>('browse');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  // Per-item retry counter (phrase id → times re-queued). Reset on start.
  const retryCountRef = useRef<Record<string, number>>({});

  // Regenerate exercises whenever we enter the drill phase. The
  // intentional eslint-disable: `generate` is by definition a fresh
  // closure on each render; we only want to run when phase flips, not
  // when the parent rerenders.
  useEffect(() => {
    if (phase !== 'drill') return;
    setExercises(generate());
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback(() => {
    retryCountRef.current = {};
    setPhase('drill');
    setCurrentIndex(0);
    setCorrectCount(0);
    setTotalAnswered(0);
  }, []);

  const reset = useCallback(() => {
    setPhase('browse');
    setCurrentIndex(0);
    setCorrectCount(0);
    setTotalAnswered(0);
  }, []);

  const insertExercise = useCallback((offset: number, exercise: Exercise) => {
    setExercises((prev) => {
      const next = [...prev];
      const at = Math.min(prev.length, currentIndex + offset);
      next.splice(at, 0, exercise);
      return next;
    });
  }, [currentIndex]);

  const handleAnswer = useCallback(
    (correct: boolean) => {
      const exercise = exercises[currentIndex];
      if (!exercise) return;

      const phraseId = exercise.phrase.id;
      const existing = progress.phrases[phraseId] ?? createPhraseProgress(phraseId);
      const updated = recordAnswer(existing, correct);

      let newProgress = updatePhraseProgress(progress, updated);
      newProgress = updateDailyStats(newProgress, correct);
      // Award universal achievements on fresh post-answer state.
      if (checkAchievements) newProgress = checkAchievements(newProgress);

      if (correct) setCorrectCount((c) => c + 1);
      setTotalAnswered((t) => t + 1);

      setProgress(newProgress);
      saveProgress(newProgress);

      // Within-session retry: re-surface a missed item ~4 ahead, max 2x.
      if (!correct && buildRetry) {
        const retries = retryCountRef.current[phraseId] ?? 0;
        if (retries < 2) {
          const retryEx = buildRetry(exercise);
          if (retryEx) {
            retryCountRef.current[phraseId] = retries + 1;
            insertExercise(4, retryEx);
          }
        }
      }

      onAnswer?.(correct, exercise);

      if (currentIndex + 1 >= exercises.length) {
        setPhase('finished');
        onFinish?.({
          correct: correctCount + (correct ? 1 : 0),
          total: totalAnswered + 1,
        });
      } else {
        setCurrentIndex((i) => i + 1);
      }
    },
    // Intentionally omit `exercises` from deps — its identity changes
    // when insertExercise mutates the list, which would otherwise
    // invalidate the handler mid-session. Reading via closure is fine
    // because we always re-read `exercises[currentIndex]` at call time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentIndex, progress, setProgress, exercises, onAnswer, onFinish, correctCount, totalAnswered, checkAchievements, buildRetry, insertExercise]
  );

  const currentExercise = exercises[currentIndex];
  const accuracy =
    totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

  return {
    phase,
    exercises,
    currentIndex,
    currentExercise,
    correctCount,
    totalAnswered,
    accuracy,
    start,
    handleAnswer,
    reset,
    insertExercise,
  };
}
