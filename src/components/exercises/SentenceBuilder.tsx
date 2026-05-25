import { useState } from 'react';
import type { Exercise } from '../../store/types';
import { cn } from '../../lib/utils';

interface SentenceBuilderProps {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
}

function normalizeForCheck(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.!?,;:'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function SentenceBuilder({ exercise, onAnswer }: SentenceBuilderProps) {
  const [placed, setPlaced] = useState<string[]>([]);
  const [available, setAvailable] = useState<string[]>(exercise.tiles ?? []);
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);

  const handleTileClick = (word: string, index: number) => {
    if (result !== null) return;
    setPlaced([...placed, word]);
    setAvailable(available.filter((_, i) => i !== index));
  };

  const handleRemoveTile = (index: number) => {
    if (result !== null) return;
    const word = placed[index];
    setAvailable([...available, word]);
    setPlaced(placed.filter((_, i) => i !== index));
  };

  const handleCheck = () => {
    const userAnswer = normalizeForCheck(placed.join(' '));
    const accepted = exercise.acceptedAnswers ?? [exercise.correctAnswer];
    const isCorrect = accepted.some(
      (ans) => normalizeForCheck(ans) === userAnswer
    );

    // Also accept if the user placed all the correct words in the right
    // relative order (ignoring distractor words they didn't pick)
    const correctWords = normalizeForCheck(exercise.correctAnswer).split(' ');
    const userWords = userAnswer.split(' ');
    const isSubsequenceMatch =
      correctWords.length === userWords.length &&
      correctWords.every((w, i) => w === userWords[i]);

    const correct = isCorrect || isSubsequenceMatch;
    setResult(correct ? 'correct' : 'incorrect');
    setTimeout(() => onAnswer(correct), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Situational prompt */}
      <div>
        <p className="text-sm text-amber-400 mb-2">Situation:</p>
        <p className="text-lg font-semibold text-white leading-relaxed">
          {exercise.situationalPrompt ?? exercise.prompt}
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Build the Serbian response using the tiles below:
        </p>
      </div>

      {/* Answer area */}
      <div
        className={cn(
          'min-h-[60px] rounded-xl border-2 border-dashed p-3 flex flex-wrap gap-2',
          result === null && 'border-navy-600',
          result === 'correct' && 'border-correct bg-correct/10',
          result === 'incorrect' && 'border-incorrect bg-incorrect/10'
        )}
      >
        {placed.length === 0 && (
          <span className="text-gray-600 text-sm">Tap words to build your response...</span>
        )}
        {placed.map((word, i) => (
          <button
            key={`placed-${i}`}
            onClick={() => handleRemoveTile(i)}
            disabled={result !== null}
            className="rounded-lg bg-amber-500/20 border border-amber-500/40 px-3 py-1.5 text-sm text-amber-300 transition-colors hover:bg-amber-500/30"
          >
            {word}
          </button>
        ))}
      </div>

      {/* Available tiles */}
      <div className="flex flex-wrap gap-2 min-h-[44px]">
        {available.map((word, i) => (
          <button
            key={`avail-${i}`}
            onClick={() => handleTileClick(word, i)}
            disabled={result !== null}
            className="rounded-lg bg-navy-700 border border-navy-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-navy-600"
          >
            {word}
          </button>
        ))}
      </div>

      {/* Check button */}
      {result === null && placed.length > 0 && (
        <button
          onClick={handleCheck}
          className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-navy-900"
        >
          Check
        </button>
      )}

      {/* Correct feedback */}
      {result === 'correct' && (
        <div className="flex flex-col gap-3">
          <p className="text-lg font-semibold text-correct text-center">
            Svaka cast! ✓
          </p>
          <div className="rounded-xl bg-navy-800/50 border border-navy-700 p-4">
            <p className="text-sm text-gray-400 mb-1">Full phrase:</p>
            <p className="text-base text-white">{exercise.phrase.sr_latin}</p>
            <p className="text-sm text-gray-400 mt-2">{exercise.phrase.en}</p>
            {exercise.phrase.notes && (
              <p className="text-xs text-amber-400/70 mt-2">{exercise.phrase.notes}</p>
            )}
          </div>
        </div>
      )}

      {/* Incorrect feedback */}
      {result === 'incorrect' && (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-navy-800/50 border border-navy-700 p-4">
            <p className="text-sm text-gray-400 mb-1">The right response:</p>
            <p className="text-lg text-correct">{exercise.correctAnswer}</p>
            <p className="text-sm text-gray-400 mt-2">{exercise.phrase.en}</p>
            {exercise.phrase.notes && (
              <p className="text-xs text-amber-400/70 mt-2">{exercise.phrase.notes}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
