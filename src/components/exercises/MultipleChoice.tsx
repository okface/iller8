import { useState } from 'react';
import type { Exercise } from '../../store/types';

interface MultipleChoiceProps {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
}

export default function MultipleChoice({ exercise, onAnswer }: MultipleChoiceProps) {
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
        <p className="text-sm text-gray-400 mb-2">
          {exercise.direction === 'sr-to-en'
            ? 'What does this mean?'
            : 'How do you say this?'}
        </p>
        <p className="text-2xl font-semibold text-white leading-relaxed">
          {exercise.prompt}
        </p>
        {exercise.context && !answered && (
          <p className="text-sm text-gray-500 mt-2 italic">{exercise.context}</p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {exercise.options?.map((option, i) => {
          let borderColor = 'border-navy-600 hover:border-amber-500/50';
          if (answered) {
            if (option === exercise.correctAnswer) {
              borderColor = 'border-correct bg-correct/10';
            } else if (option === selected) {
              borderColor = 'border-incorrect bg-incorrect/10';
            } else {
              borderColor = 'border-navy-700 opacity-50';
            }
          } else if (option === selected) {
            borderColor = 'border-amber-500';
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(option)}
              disabled={answered}
              className={`w-full rounded-xl border-2 p-4 text-left text-white transition-all ${borderColor}`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {answered && selected !== exercise.correctAnswer && (
        <p className="text-sm text-correct">
          Correct answer: {exercise.correctAnswer}
        </p>
      )}
    </div>
  );
}
