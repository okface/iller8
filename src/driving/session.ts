// Quiz-session assembly for the körkortsteori module. Simpler than iller7's
// full SRS weighting, but weak/unseen-first so review surfaces naturally.

import questionsData from '../data/driving/questions.json';
import type { DrivingMode, DrivingOption, DrivingQuestion, DrivingState } from './types';

export const QUESTIONS = questionsData as DrivingQuestion[];

const QUICK_SIZE = 10;

// Mock-exam settings, scaled to mirror the real Swedish theory test
// (70 questions, pass at 65 ≈ 93%). Capped at the size of our bank.
export const EXAM_SIZE = Math.min(65, QUESTIONS.length);
export const EXAM_PASS = Math.round(EXAM_SIZE * (65 / 70));

/** Unique topics in source order, with question counts. */
export function listTopics(): { topic: string; count: number }[] {
  const order: string[] = [];
  const counts: Record<string, number> = {};
  for (const q of QUESTIONS) {
    if (!(q.topic in counts)) order.push(q.topic);
    counts[q.topic] = (counts[q.topic] ?? 0) + 1;
  }
  return order.map((topic) => ({ topic, count: counts[topic] }));
}

const TOPIC_LABELS: Record<string, string> = {
  vagmarken_auto: 'Vägmärken',
  trafik_och_vagmarken: 'Trafik & vägmärken',
  extra_fragor: 'Blandade frågor',
};

export function topicLabel(topic: string): string {
  return (
    TOPIC_LABELS[topic] ??
    topic.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build an ordered question list for a session. Weak/unseen items come first
 * (lowest SRS bucket; unseen treated as -1), ties broken randomly. To fully
 * mirror iller7's due-review weighting, swap this for getDueItems from
 * engine/srs.ts.
 */
export function buildSession(mode: DrivingMode, state: DrivingState): DrivingQuestion[] {
  // Exam mode: a representative, fully-random mixed set (no weak-first bias —
  // a real test doesn't favour your weak spots).
  if (mode === 'exam') {
    return shuffle([...QUESTIONS]).slice(0, EXAM_SIZE);
  }

  let pool: DrivingQuestion[];
  if (mode.startsWith('topic:')) {
    const topic = mode.slice('topic:'.length);
    pool = QUESTIONS.filter((q) => q.topic === topic);
  } else {
    pool = [...QUESTIONS];
  }

  const weight = (q: DrivingQuestion) => state.questions[q.id]?.bucket ?? -1;
  const ranked = shuffle(pool).sort((a, b) => weight(a) - weight(b));

  return mode === 'quick10' ? ranked.slice(0, QUICK_SIZE) : ranked;
}

/** Count of mastered (bucket >= 5) questions per topic, for the home screen. */
export function masteredByTopic(state: DrivingState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const q of QUESTIONS) {
    if ((state.questions[q.id]?.bucket ?? 0) >= 5) out[q.topic] = (out[q.topic] ?? 0) + 1;
  }
  return out;
}

/** Return a question's options in randomized order (correctness travels with each option). */
export function shuffleOptions(q: DrivingQuestion): DrivingOption[] {
  return shuffle(q.options);
}
