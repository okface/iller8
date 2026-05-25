import type { PhraseProgress } from '../store/types';

const MAX_BUCKET = 7;

const BUCKET_INTERVALS_MS = [
  0,
  1 * 60 * 60 * 1000,          // 1 hour
  8 * 60 * 60 * 1000,          // 8 hours
  1 * 24 * 60 * 60 * 1000,     // 1 day
  3 * 24 * 60 * 60 * 1000,     // 3 days
  7 * 24 * 60 * 60 * 1000,     // 1 week
  14 * 24 * 60 * 60 * 1000,    // 2 weeks
  30 * 24 * 60 * 60 * 1000,    // 1 month
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
      bucket: Math.min(MAX_BUCKET, progress.bucket + 1),
      lastReviewed: Date.now(),
      correctCount: progress.correctCount + 1,
      streak: progress.streak + 1,
    };
  }
  const drop = progress.bucket >= 3 ? 2 : 1;
  return {
    ...progress,
    bucket: Math.max(1, progress.bucket - drop),
    lastReviewed: Date.now(),
    incorrectCount: progress.incorrectCount + 1,
    streak: 0,
  };
}

export function isDue(progress: PhraseProgress, now: number = Date.now()): boolean {
  if (progress.bucket >= BUCKET_INTERVALS_MS.length) return false;
  const interval = BUCKET_INTERVALS_MS[progress.bucket];
  return now - progress.lastReviewed >= interval;
}

export function applyTimeDecay(progress: PhraseProgress, now: number = Date.now()): PhraseProgress {
  if (progress.bucket <= 1) return progress;
  const interval = BUCKET_INTERVALS_MS[progress.bucket] ?? BUCKET_INTERVALS_MS[MAX_BUCKET];
  const elapsed = now - progress.lastReviewed;
  const decayMultiplier = 2 + progress.bucket;
  if (elapsed > interval * decayMultiplier) {
    return { ...progress, bucket: Math.max(1, progress.bucket - 1) };
  }
  return progress;
}

export function getDueItems(
  phrases: Record<string, PhraseProgress>,
  now: number = Date.now()
): PhraseProgress[] {
  return Object.values(phrases)
    .filter(p => p.bucket >= 1)
    .map(p => applyTimeDecay(p, now))
    .filter(p => isDue(p, now))
    .sort((a, b) => {
      if (a.bucket !== b.bucket) return a.bucket - b.bucket;
      return a.lastReviewed - b.lastReviewed;
    });
}

export function getMasteryLevel(bucket: number): string {
  const levels = ['New', 'Learning', 'Familiar', 'Known', 'Strong', 'Solid', 'Mastered', 'Native'];
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
    'text-emerald-400',
    'text-cyan-400',
  ];
  return colors[bucket] ?? 'text-gray-400';
}
