import type { PhraseProgress, UserProgress } from '../store/types';

/**
 * Word progress lives in the same `UserProgress.phrases` map as phrase
 * progress, keyed by `word:<word.id>` instead of the raw phrase id.
 * This means the existing SRS engine, due-item logic, and stats keep
 * working unchanged — no migration needed.
 *
 * See PEDAGOGY_AUDIT.md §3.1 for the rationale.
 */

const WORD_PREFIX = 'word:';

export function wordSrsKey(wordId: string): string {
  return `${WORD_PREFIX}${wordId}`;
}

export function isWordKey(key: string): boolean {
  return key.startsWith(WORD_PREFIX);
}

export function wordIdFromKey(key: string): string | null {
  return key.startsWith(WORD_PREFIX) ? key.slice(WORD_PREFIX.length) : null;
}

/** Read a word's SRS bucket (0 if never seen). */
export function getWordBucket(progress: UserProgress, wordId: string): number {
  return progress.phrases[wordSrsKey(wordId)]?.bucket ?? 0;
}

/** Read a word's full PhraseProgress entry (creates a zero record if missing — caller may save it). */
export function getWordProgress(progress: UserProgress, wordId: string): PhraseProgress | undefined {
  return progress.phrases[wordSrsKey(wordId)];
}

/** Count how many wordIds the learner is at-or-above the given bucket on. */
export function countWordsKnown(
  progress: UserProgress,
  wordIds: string[],
  minBucket = 1
): number {
  let n = 0;
  for (const id of wordIds) {
    if (getWordBucket(progress, id) >= minBucket) n++;
  }
  return n;
}

/** Return only the wordIds the learner has met but not yet mastered (bucket 1–4). */
export function getActiveWordIds(progress: UserProgress, wordIds: string[]): string[] {
  return wordIds.filter((id) => {
    const b = getWordBucket(progress, id);
    return b >= 1 && b < 5;
  });
}

/** Return only the wordIds the learner has never met (bucket 0). */
export function getUnseenWordIds(progress: UserProgress, wordIds: string[]): string[] {
  return wordIds.filter((id) => getWordBucket(progress, id) === 0);
}
