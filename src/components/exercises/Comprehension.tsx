import { useState } from 'react';
import type { Exercise } from '../../store/types';

interface ComprehensionProps {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
}

export default function Comprehension({ exercise, onAnswer }: ComprehensionProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const handleSelect = (option: string) => {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
    const correct = option === exercise.correctAnswer;
    setTimeout(() => onAnswer(correct), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-amber-400 mb-3">--- Situacija ---</p>
        {exercise.dialogue?.map((line, i) => (
          <p key={i} className="text-lg text-white leading-relaxed mb-1">
            {line}
          </p>
        ))}
      </div>

      <div className="rounded-xl bg-navy-800/40 border border-navy-700 px-4 py-3">
        <p className="text-sm text-amber-400 mb-1">Pitanje:</p>
        <p className="text-lg font-semibold text-white">
          {exercise.question}
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
              {String.fromCharCode(65 + i)}) {option}
            </button>
          );
        })}
      </div>

      {answered && selected === exercise.correctAnswer && (
        <p className="text-lg font-semibold text-correct text-center">
          Odlicno! ✓
        </p>
      )}

      {answered && selected !== exercise.correctAnswer && (
        <div className="rounded-xl bg-navy-800/50 p-4">
          <p className="text-sm text-gray-400">Tacan odgovor:</p>
          <p className="text-lg text-correct">{exercise.correctAnswer}</p>
        </div>
      )}

      {answered && exercise.phrase.notes && (
        <div className="rounded-xl bg-navy-800/50 border border-navy-700 px-4 py-2">
          <p className="text-xs text-amber-400">{exercise.phrase.notes}</p>
        </div>
      )}
    </div>
  );
}
