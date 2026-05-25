import type { Word } from '../../store/types';

import wordsJson from './words.json';

export const words: Word[] = wordsJson as Word[];

const wordById: Map<string, Word> = new Map(words.map((w) => [w.id, w]));

export function getWordById(id: string): Word | undefined {
  return wordById.get(id);
}

export function getWordsByLesson(lessonId: string): Word[] {
  return words.filter((w) => w.appearsIn?.includes(lessonId));
}
