/**
 * Lesson content. BEFORE adding or editing phrases — including with subagents —
 * read the authoring standard: src/data/CONTENT_SPEC.md. It defines every field's
 * rules, the situational-cue style, etymology / Bosnian-difference note conventions,
 * the grammar-stage difficulty progression (what "harder" means + which stages to
 * fill next), and the minimal-pair option philosophy. Following it keeps new content
 * pristine and consistent with what's already here.
 */
import type { Lesson } from '../../store/types';

import lesson01 from './01-sweet-talk.json';
import lesson02 from './02-reactions.json';
import lesson03 from './03-texting.json';
import lesson04 from './04-food-cooking.json';
import lesson05 from './05-work-banter.json';
import lesson06 from './06-making-plans.json';
import lesson07 from './07-feelings-opinions.json';
import lesson08 from './08-slang-humor.json';
import lesson09 from './09-daily-routines.json';
import lesson10 from './10-celebrations.json';
import lesson11 from './11-everyday-frames.json';

export const lessons: Lesson[] = [
  lesson01,
  lesson02,
  lesson03,
  lesson04,
  lesson05,
  lesson06,
  lesson07,
  lesson08,
  lesson09,
  lesson10,
  lesson11,
] as Lesson[];

export function getLessonById(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id);
}

export function isLessonUnlocked(
  lessonId: string,
  completedLessons: string[]
): boolean {
  const lesson = getLessonById(lessonId);
  if (!lesson) return false;
  return lesson.prerequisites.every((p) => completedLessons.includes(p));
}

export function getAllPhrases(): { phrase: import('../../store/types').Phrase; lessonId: string }[] {
  return lessons.flatMap((l) =>
    l.phraseGroups.flatMap((g) =>
      g.phrases.map((p) => ({ phrase: p, lessonId: l.id }))
    )
  );
}
