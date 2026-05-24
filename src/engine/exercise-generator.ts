import type { Exercise, ExerciseType, Lesson, Phrase, PhraseProgress } from '../store/types';

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRandom<T>(array: T[], count: number): T[] {
  return shuffle(array).slice(0, count);
}

function getAllPhrases(lesson: Lesson): Phrase[] {
  return lesson.phraseGroups.flatMap((g) => g.phrases);
}

function getDistractors(
  correct: string,
  allPhrases: Phrase[],
  field: 'en' | 'sr_latin',
  count: number
): string[] {
  const others = allPhrases
    .map((p) => p[field])
    .filter((t) => t !== correct);
  return pickRandom(others, count);
}

function generateMultipleChoice(
  phrase: Phrase,
  allPhrases: Phrase[],
  script: 'latin' | 'cyrillic',
  direction: 'sr-to-en' | 'en-to-sr'
): Exercise {
  if (direction === 'sr-to-en') {
    const prompt = script === 'cyrillic' ? phrase.sr_cyrillic : phrase.sr_latin;
    const distractors = getDistractors(phrase.en, allPhrases, 'en', 3);
    return {
      type: 'multiple-choice',
      phrase,
      direction,
      prompt,
      correctAnswer: phrase.en,
      options: shuffle([phrase.en, ...distractors]),
      context: phrase.context,
    };
  } else {
    const srField = script === 'cyrillic' ? 'sr_cyrillic' : 'sr_latin';
    const distractors = getDistractors(
      phrase[srField === 'sr_cyrillic' ? 'sr_latin' : 'sr_latin'],
      allPhrases,
      'sr_latin',
      3
    );
    const correctSr = script === 'cyrillic' ? phrase.sr_cyrillic : phrase.sr_latin;
    return {
      type: 'multiple-choice',
      phrase,
      direction,
      prompt: phrase.en,
      correctAnswer: correctSr,
      options: shuffle([correctSr, ...distractors.map(() => {
        const rp = allPhrases[Math.floor(Math.random() * allPhrases.length)];
        return script === 'cyrillic' ? rp.sr_cyrillic : rp.sr_latin;
      }).filter(d => d !== correctSr).slice(0, 3), correctSr].slice(0, 4)),
      context: phrase.context,
    };
  }
}

function generateTypeTranslation(
  phrase: Phrase,
  script: 'latin' | 'cyrillic',
  direction: 'sr-to-en' | 'en-to-sr'
): Exercise {
  if (direction === 'sr-to-en') {
    return {
      type: 'type-translation',
      phrase,
      direction,
      prompt: script === 'cyrillic' ? phrase.sr_cyrillic : phrase.sr_latin,
      correctAnswer: phrase.en,
    };
  }
  return {
    type: 'type-translation',
    phrase,
    direction,
    prompt: phrase.en,
    correctAnswer: script === 'cyrillic' ? phrase.sr_cyrillic : phrase.sr_latin,
  };
}

function generateFillInBlank(
  phrase: Phrase,
  script: 'latin' | 'cyrillic'
): Exercise {
  const text = script === 'cyrillic' ? phrase.sr_cyrillic : phrase.sr_latin;
  const words = text.replace(/[.!?,]/g, '').split(/\s+/);
  if (words.length < 2) {
    return generateTypeTranslation(phrase, script, 'en-to-sr');
  }

  const blankIdx = Math.floor(Math.random() * words.length);
  const answer = words[blankIdx];
  const blanked = words.map((w, i) => (i === blankIdx ? '______' : w)).join(' ');

  return {
    type: 'fill-in-blank',
    phrase,
    direction: 'en-to-sr',
    prompt: blanked,
    correctAnswer: answer,
    blankIndex: blankIdx,
    context: phrase.en,
  };
}

function generateWordTiles(
  phrase: Phrase,
  script: 'latin' | 'cyrillic'
): Exercise {
  const text = script === 'cyrillic' ? phrase.sr_cyrillic : phrase.sr_latin;
  const words = text.replace(/[.!?,]/g, '').split(/\s+/);

  return {
    type: 'word-tiles',
    phrase,
    direction: 'en-to-sr',
    prompt: phrase.en,
    correctAnswer: words.join(' '),
    tiles: shuffle(words),
  };
}

function generateScriptConvert(phrase: Phrase): Exercise {
  const showCyrillic = Math.random() > 0.5;
  return {
    type: 'script-convert',
    phrase,
    direction: 'sr-to-en',
    prompt: showCyrillic ? phrase.sr_cyrillic : phrase.sr_latin,
    correctAnswer: showCyrillic ? phrase.sr_latin : phrase.sr_cyrillic,
    context: showCyrillic
      ? 'Convert from Cyrillic to Latin'
      : 'Convert from Latin to Cyrillic',
  };
}

function generateContextPick(
  phrase: Phrase,
  allPhrases: Phrase[],
  script: 'latin' | 'cyrillic'
): Exercise {
  const srField = script === 'cyrillic' ? 'sr_cyrillic' : 'sr_latin';
  const correct = phrase[srField];
  const distractors = pickRandom(
    allPhrases.filter((p) => p.id !== phrase.id).map((p) => p[srField]),
    3
  );

  return {
    type: 'context-pick',
    phrase,
    direction: 'en-to-sr',
    prompt: phrase.context || phrase.en,
    correctAnswer: correct,
    options: shuffle([correct, ...distractors]),
  };
}

const exerciseTypesForBucket: Record<number, ExerciseType[]> = {
  0: ['multiple-choice', 'context-pick'],
  1: ['multiple-choice', 'fill-in-blank', 'context-pick'],
  2: ['fill-in-blank', 'word-tiles', 'type-translation', 'multiple-choice'],
  3: ['type-translation', 'word-tiles', 'fill-in-blank', 'script-convert'],
  4: ['type-translation', 'script-convert', 'word-tiles'],
  5: ['type-translation', 'script-convert'],
};

export function generateExercise(
  phrase: Phrase,
  allPhrases: Phrase[],
  script: 'latin' | 'cyrillic',
  bucket: number = 0,
  forcedType?: ExerciseType
): Exercise {
  const types = exerciseTypesForBucket[Math.min(bucket, 5)] ?? exerciseTypesForBucket[0];
  const type = forcedType ?? types[Math.floor(Math.random() * types.length)];
  const direction: 'sr-to-en' | 'en-to-sr' =
    Math.random() > 0.5 ? 'sr-to-en' : 'en-to-sr';

  switch (type) {
    case 'multiple-choice':
      return generateMultipleChoice(phrase, allPhrases, script, direction);
    case 'type-translation':
      return generateTypeTranslation(phrase, script, direction);
    case 'fill-in-blank':
      return generateFillInBlank(phrase, script);
    case 'word-tiles':
      return generateWordTiles(phrase, script);
    case 'script-convert':
      return generateScriptConvert(phrase);
    case 'context-pick':
      return generateContextPick(phrase, allPhrases, script);
    default:
      return generateMultipleChoice(phrase, allPhrases, script, 'sr-to-en');
  }
}

export function generateLessonExercises(
  lesson: Lesson,
  phraseProgress: Record<string, PhraseProgress>,
  script: 'latin' | 'cyrillic',
  count: number = 15
): Exercise[] {
  const allPhrases = getAllPhrases(lesson);
  if (allPhrases.length === 0) return [];

  const exercises: Exercise[] = [];
  const phrasesToPractice = shuffle(allPhrases);

  let i = 0;
  while (exercises.length < count) {
    const phrase = phrasesToPractice[i % phrasesToPractice.length];
    const progress = phraseProgress[phrase.id];
    const bucket = progress?.bucket ?? 0;
    exercises.push(generateExercise(phrase, allPhrases, script, bucket));
    i++;
  }

  return exercises;
}

export function generateReviewExercises(
  lessons: Lesson[],
  dueItems: PhraseProgress[],
  script: 'latin' | 'cyrillic',
  count: number = 15
): Exercise[] {
  const allPhrases = lessons.flatMap(getAllPhrases);
  const phraseMap = new Map(allPhrases.map((p) => [p.id, p]));

  const exercises: Exercise[] = [];
  const dueShuffled = shuffle(dueItems);

  for (let i = 0; exercises.length < count && i < dueShuffled.length; i++) {
    const progress = dueShuffled[i];
    const phrase = phraseMap.get(progress.phraseId);
    if (!phrase) continue;
    exercises.push(generateExercise(phrase, allPhrases, script, progress.bucket));
  }

  return exercises;
}

export function generateMatchPairsData(
  lesson: Lesson,
  script: 'latin' | 'cyrillic',
  pairCount: number = 5
): { pairs: { sr: string; en: string; id: string }[] } {
  const allPhrases = getAllPhrases(lesson);
  const selected = pickRandom(allPhrases, pairCount);
  return {
    pairs: selected.map((p) => ({
      sr: script === 'cyrillic' ? p.sr_cyrillic : p.sr_latin,
      en: p.en,
      id: p.id,
    })),
  };
}
