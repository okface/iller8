import type { PhraseProgress } from '../store/types';

const BUCKET_INTERVALS_MS = [
  0,
  4 * 60 * 60 * 1000,
  24 * 60 * 60 * 1000,
  3 * 24 * 60 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000,
  14 * 24 * 60 * 60 * 1000,
];

export function createPhraseProgress(phraseId: string): PhraseProgress {
  return {
    phraseId,
    bucket: 0,
    lastReviewed: Date.now(),
    correctCount: 0,
    incorrectCount: 0,
    streak: 0,
  };
}

export function recordAnswer(
  progress: PhraseProgress,
  correct: boolean
): PhraseProgress {
  if (correct) {
    return {
      ...progress,
      bucket: Math.min(5, progress.bucket + 1),
      lastReviewed: Date.now(),
      correctCount: progress.correctCount + 1,
      streak: progress.streak + 1,
    };
  }
  return {
    ...progress,
    bucket: Math.max(0, progress.bucket - 2),
    lastReviewed: Date.now(),
    incorrectCount: progress.incorrectCount + 1,
    streak: 0,
  };
}

export function isDue(progress: PhraseProgress, now: number = Date.now()): boolean {
  const interval = BUCKET_INTERVALS_MS[progress.bucket];
  return now - progress.lastReviewed >= interval;
}

export function applyTimeDecay(progress: PhraseProgress, now: number = Date.now()): PhraseProgress {
  if (progress.bucket === 0) return progress;
  const interval = BUCKET_INTERVALS_MS[progress.bucket];
  const elapsed = now - progress.lastReviewed;
  if (elapsed > interval * 2) {
    return { ...progress, bucket: Math.max(0, progress.bucket - 1) };
  }
  return progress;
}

export function getDueItems(
  phrases: Record<string, PhraseProgress>,
  now: number = Date.now()
): PhraseProgress[] {
  return Object.values(phrases)
    .map(p => applyTimeDecay(p, now))
    .filter(p => isDue(p, now))
    .sort((a, b) => {
      if (a.bucket !== b.bucket) return a.bucket - b.bucket;
      return a.lastReviewed - b.lastReviewed;
    });
}

export function getMasteryLevel(bucket: number): string {
  const levels = ['New', 'Learning', 'Familiar', 'Known', 'Strong', 'Mastered'];
  return levels[bucket] ?? 'New';
}

export function getMasteryColor(bucket: number): string {
  const colors = [
    'text-gray-400',
    'text-red-400',
    'text-orange-400',
    'text-yellow-400',
    'text-green-400',
    'text-emerald-500',
  ];
  return colors[bucket] ?? 'text-gray-400';
}
