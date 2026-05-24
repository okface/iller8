import { useState } from 'react';
import type { Exercise } from '../../store/types';
import { cn } from '../../lib/utils';

interface WordTilesProps {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
}

export default function WordTiles({ exercise, onAnswer }: WordTilesProps) {
  const [placed, setPlaced] = useState<string[]>([]);
  const [available, setAvailable] = useState<string[]>(exercise.tiles ?? []);
  const [result, setResult] = useState<boolean | null>(null);

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
    const answer = placed.join(' ');
    const correct = answer === exercise.correctAnswer;
    setResult(correct);
    setTimeout(() => onAnswer(correct), 1500);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-gray-400 mb-2">
          Arrange the words into the correct Serbian sentence:
        </p>
        <p className="text-xl font-semibold text-white leading-relaxed">
          {exercise.prompt}
        </p>
      </div>

      <div
        className={cn(
          'min-h-[60px] rounded-xl border-2 border-dashed p-3 flex flex-wrap gap-2',
          result === null && 'border-navy-600',
          result === true && 'border-correct bg-correct/10',
          result === false && 'border-incorrect bg-incorrect/10'
        )}
      >
        {placed.length === 0 && (
          <span className="text-gray-600 text-sm">Tap words below to build the sentence...</span>
        )}
        {placed.map((word, i) => (
          <button
            key={`placed-${i}`}
            onClick={() => handleRemoveTile(i)}
            className="rounded-lg bg-amber-500/20 border border-amber-500/40 px-3 py-1.5 text-sm text-amber-300 transition-colors hover:bg-amber-500/30"
          >
            {word}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 min-h-[44px]">
        {available.map((word, i) => (
          <button
            key={`avail-${i}`}
            onClick={() => handleTileClick(word, i)}
            className="rounded-lg bg-navy-700 border border-navy-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-navy-600"
          >
            {word}
          </button>
        ))}
      </div>

      {result === null && placed.length > 0 && (
        <button
          onClick={handleCheck}
          className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-navy-900"
        >
          Check
        </button>
      )}

      {result === false && (
        <div className="rounded-xl bg-navy-800/50 p-4">
          <p className="text-sm text-gray-400">Correct order:</p>
          <p className="text-lg text-correct">{exercise.correctAnswer}</p>
        </div>
      )}

      {result === true && (
        <p className="text-lg font-semibold text-correct text-center">
          Odlično! ✓
        </p>
      )}
    </div>
  );
}
