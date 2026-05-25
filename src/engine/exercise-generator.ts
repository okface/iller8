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
    const correctSr = phrase[srField];
    const distractorPhrases = allPhrases
      .filter((p) => p.id !== phrase.id)
      .map((p) => p[srField]);
    const uniqueDistractors = [...new Set(distractorPhrases)]
      .filter((d) => d !== correctSr);
    const selectedDistractors = pickRandom(uniqueDistractors, 3);
    return {
      type: 'multiple-choice',
      phrase,
      direction,
      prompt: phrase.en,
      correctAnswer: correctSr,
      options: shuffle([correctSr, ...selectedDistractors]),
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

const FUNCTION_WORDS = new Set([
  'je', 'si', 'sam', 'su', 'smo', 'ste',
  'mi', 'ti', 'me', 'te', 'ga',
  'u', 'na', 'za', 'sa', 's', 'od', 'do', 'po', 'iz', 'o',
  'i', 'a', 'ali', 'ili', 'ni', 'da', 'se', 'ce', 'bi',
  'taj', 'ta', 'to', 'ovo', 'ova', 'ovaj',
]);

function generateFillInBlank(
  phrase: Phrase,
  script: 'latin' | 'cyrillic'
): Exercise {
  const text = script === 'cyrillic' ? phrase.sr_cyrillic : phrase.sr_latin;
  const words = text.replace(/[.!?,]/g, '').split(/\s+/);
  if (words.length < 2) {
    return generateTypeTranslation(phrase, script, 'en-to-sr');
  }

  const contentIndices = words
    .map((w, i) => ({ word: w, idx: i }))
    .filter(({ word }) => !FUNCTION_WORDS.has(word.toLowerCase()) && word.length > 2);

  const blankIdx = contentIndices.length > 0
    ? contentIndices[Math.floor(Math.random() * contentIndices.length)].idx
    : Math.floor(Math.random() * words.length);

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

function buildSituationalPrompt(phrase: Phrase): string {
  // Use the phrase's context to create an immersive situational prompt.
  // If there's a good context, frame it as a situation the user is in.
  if (phrase.context) {
    return phrase.context;
  }
  // Fallback: create a generic situational prompt from the English
  return `How would you say this in Serbian: "${phrase.en}"`;
}

function getDistractorWords(
  allPhrases: Phrase[],
  excludeWords: string[],
  script: 'latin' | 'cyrillic',
  count: number
): string[] {
  const excludeSet = new Set(excludeWords.map((w) => w.toLowerCase()));
  const candidateWords: string[] = [];
  const field = script === 'cyrillic' ? 'sr_cyrillic' : 'sr_latin';

  for (const p of allPhrases) {
    const words = p[field].replace(/[.!?,;:'"]/g, '').split(/\s+/);
    for (const w of words) {
      if (w.length > 1 && !excludeSet.has(w.toLowerCase())) {
        candidateWords.push(w);
      }
    }
  }

  const unique = [...new Set(candidateWords)];
  return pickRandom(unique, count);
}

function generateSentenceBuilder(
  phrase: Phrase,
  allPhrases: Phrase[],
  script: 'latin' | 'cyrillic'
): Exercise {
  const field = script === 'cyrillic' ? 'sr_cyrillic' : 'sr_latin';
  const text = phrase[field];
  const coreWords = text.replace(/[.!?,;:'"]/g, '').split(/\s+/).filter(Boolean);
  const correctAnswer = coreWords.join(' ');

  // Build accepted answers: include the main phrase and any variations
  const acceptedAnswers = [correctAnswer];
  if (phrase.variations) {
    for (const v of phrase.variations) {
      const vText = script === 'cyrillic' ? v.sr_cyrillic : v.sr_latin;
      const vWords = vText.replace(/[.!?,;:'"]/g, '').split(/\s+/).filter(Boolean);
      acceptedAnswers.push(vWords.join(' '));
    }
  }

  // Add 1-2 distractor words from other phrases
  const distractorCount = coreWords.length <= 2 ? 1 : 2;
  const distractors = getDistractorWords(allPhrases, coreWords, script, distractorCount);

  const tiles = shuffle([...coreWords, ...distractors]);

  return {
    type: 'sentence-builder',
    phrase,
    direction: 'en-to-sr',
    prompt: phrase.en,
    situationalPrompt: buildSituationalPrompt(phrase),
    correctAnswer,
    acceptedAnswers,
    tiles,
    context: phrase.context,
  };
}

// Dialogue templates for comprehension exercises.
// Each template wraps a Serbian phrase into a short dialogue and generates
// a comprehension question — all entirely in Serbian (no English).
interface DialogueTemplate {
  build: (
    phraseText: string,
    phrase: Phrase,
    script: 'latin' | 'cyrillic'
  ) => {
    dialogue: string[];
    question: string;
    correct: string;
    distractors: string[];
  };
}

const dialogueTemplates: DialogueTemplate[] = [
  {
    // Pattern: A asks what B is doing, B responds with the phrase
    build: (phraseText, _phrase, script) => {
      const names = shuffle(['Ana', 'Marko', 'Jelena', 'Stefan', 'Milica', 'Nikola']);
      const a = names[0];
      const b = names[1];
      return {
        dialogue: [
          `${a}: "${script === 'cyrillic' ? 'Шта радиш?' : 'Sta radis?'}"`,
          `${b}: "${phraseText}"`,
        ],
        question: `${script === 'cyrillic' ? 'Шта каже' : 'Sta kaze'} ${b}?`,
        correct: phraseText,
        distractors: [], // filled from other phrases
      };
    },
  },
  {
    // Pattern: B declines an invitation, question about why
    build: (phraseText, _phrase, script) => {
      const names = shuffle(['Ana', 'Marko', 'Jelena', 'Stefan', 'Milica', 'Nikola']);
      const a = names[0];
      const b = names[1];
      const invite =
        script === 'cyrillic'
          ? 'Хајде да изађемо вечерас?'
          : 'Hajde da izadjemo veceras?';
      const decline =
        script === 'cyrillic'
          ? 'Не могу, морам да'
          : 'Ne mogu, moram da';
      return {
        dialogue: [
          `${a}: "${invite}"`,
          `${b}: "${decline} — ${phraseText}"`,
        ],
        question: `${script === 'cyrillic' ? 'Зашто' : 'Zasto'} ${b} ${script === 'cyrillic' ? 'не може' : 'ne moze'}?`,
        correct: phraseText,
        distractors: [],
      };
    },
  },
  {
    // Pattern: identify who says the phrase
    build: (phraseText, _phrase, script) => {
      const names = shuffle(['Ana', 'Marko', 'Jelena', 'Stefan', 'Milica', 'Nikola']);
      const a = names[0];
      const b = names[1];
      const ok = script === 'cyrillic' ? 'Важи!' : 'Vazi!';
      return {
        dialogue: [
          `${a}: "${phraseText}"`,
          `${b}: "${ok}"`,
        ],
        question: `${script === 'cyrillic' ? 'Ко каже' : 'Ko kaze'}: "${phraseText}"?`,
        correct: a,
        distractors: [b, names[2]],
      };
    },
  },
];

function generateComprehension(
  phrase: Phrase,
  allPhrases: Phrase[],
  script: 'latin' | 'cyrillic'
): Exercise {
  const srField = script === 'cyrillic' ? 'sr_cyrillic' : 'sr_latin';
  const phraseText = phrase[srField];

  const template = dialogueTemplates[Math.floor(Math.random() * dialogueTemplates.length)];
  const result = template.build(phraseText, phrase, script);

  // If the template produced an empty distractors array, build distractors
  // from other phrases in the lesson
  let distractors = result.distractors;
  if (distractors.length === 0) {
    const others = allPhrases
      .filter((p) => p.id !== phrase.id)
      .map((p) => p[srField]);
    distractors = pickRandom(others, 2);
  }

  const options = shuffle([result.correct, ...distractors.slice(0, 2)]);

  return {
    type: 'comprehension',
    phrase,
    direction: 'sr-to-en',
    prompt: result.dialogue.join('\n'),
    correctAnswer: result.correct,
    options,
    dialogue: result.dialogue,
    question: result.question,
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
  0: ['multiple-choice'],
  1: ['multiple-choice', 'context-pick'],
  2: ['multiple-choice', 'fill-in-blank', 'word-tiles', 'context-pick'],
  3: ['fill-in-blank', 'word-tiles', 'type-translation', 'sentence-builder', 'context-pick'],
  4: ['type-translation', 'word-tiles', 'sentence-builder', 'script-convert', 'comprehension'],
  5: ['type-translation', 'script-convert', 'sentence-builder', 'comprehension'],
  6: ['type-translation', 'script-convert', 'comprehension'],
  7: ['type-translation', 'script-convert', 'comprehension'],
};

function getDirectionForBucket(bucket: number): 'sr-to-en' | 'en-to-sr' {
  if (bucket <= 1) return 'sr-to-en';
  if (bucket === 2) return Math.random() < 0.7 ? 'sr-to-en' : 'en-to-sr';
  return Math.random() < 0.5 ? 'sr-to-en' : 'en-to-sr';
}

export function generateExercise(
  phrase: Phrase,
  allPhrases: Phrase[],
  script: 'latin' | 'cyrillic',
  bucket: number = 0,
  forcedType?: ExerciseType
): Exercise {
  const clampedBucket = Math.min(bucket, 7);
  const types = exerciseTypesForBucket[clampedBucket] ?? exerciseTypesForBucket[0];
  const type = forcedType ?? types[Math.floor(Math.random() * types.length)];
  const direction = getDirectionForBucket(clampedBucket);

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
    case 'sentence-builder':
      return generateSentenceBuilder(phrase, allPhrases, script);
    case 'comprehension':
      return generateComprehension(phrase, allPhrases, script);
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
