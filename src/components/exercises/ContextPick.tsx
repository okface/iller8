import { useState } from 'react';
import type { Exercise } from '../../store/types';

interface ContextPickProps {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
}

export default function ContextPick({ exercise, onAnswer }: ContextPickProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const handleSelect = (option: string) => {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
    const correct = option === exercise.correctAnswer;
    setTimeout(() => onAnswer(correct), 1200);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-amber-400 mb-2">Situation:</p>
        <p className="text-xl font-semibold text-white leading-relaxed">
          {exercise.prompt}
        </p>
        <p className="text-sm text-gray-400 mt-2">
          What would you say?
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {exercise.options?.map((option, i) => {
          let style = 'border-navy-600 hover:border-amber-500/50';
          if (answered) {
            if (option === exercise.correctAnswer) {
              style = 'border-correct bg-correct/10';
            } else if (option === selected) {
              style = 'border-incorrect bg-incorrect/10';
            } else {
              style = 'border-navy-700 opacity-50';
            }
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(option)}
              disabled={answered}
              className={`w-full rounded-xl border-2 p-4 text-left text-white transition-all ${style}`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {answered && selected === exercise.correctAnswer && (
        <p className="text-lg font-semibold text-correct text-center">
          Super! ✓
        </p>
      )}

      {answered && selected !== exercise.correctAnswer && (
        <div className="rounded-xl bg-navy-800/50 p-4">
          <p className="text-sm text-gray-400">The right answer was:</p>
          <p className="text-lg text-correct">{exercise.correctAnswer}</p>
        </div>
      )}
    </div>
  );
}
