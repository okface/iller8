import type { Word, WordRef } from '../../store/types';
import wordsJson from './words.json';

export const words: Word[] = wordsJson as Word[];

const wordById: Map<string, Word> = new Map(words.map((w) => [w.id, w]));

export function getWordById(id: string): Word | undefined {
  return wordById.get(id);
}

export function getWordsByLesson(lessonId: string): Word[] {
  return words.filter((w) => w.appearsIn?.includes(lessonId));
}

/**
 * Normalize a WordRef into a stable object shape. Accepts the bare-string
 * shorthand for legacy data and unwraps it into the rich object form.
 * Returns `null` when the word ID is unknown to the lexicon (so callers
 * can drop unresolved refs silently).
 */
export interface NormalizedWordRef {
  id: string;
  word: Word;
  surface_latin?: string;
  surface_cyrillic?: string;
  case?: 'voc' | 'nom' | 'acc' | 'dat' | 'gen' | 'loc' | 'ins';
  form?: string;
}

export function normalizeWordRef(ref: WordRef): NormalizedWordRef | null {
  const id = typeof ref === 'string' ? ref : ref.id;
  const word = wordById.get(id);
  if (!word) return null;
  if (typeof ref === 'string') {
    return { id, word };
  }
  return {
    id,
    word,
    surface_latin: ref.surface,
    surface_cyrillic: ref.surface_cyrillic,
    case: ref.case,
    form: ref.form,
  };
}

/** Normalize a phrase's whole wordRefs array, dropping unresolved IDs. */
export function normalizeWordRefs(refs: WordRef[] | undefined): NormalizedWordRef[] {
  if (!refs) return [];
  return refs.map(normalizeWordRef).filter((r): r is NormalizedWordRef => !!r);
}
