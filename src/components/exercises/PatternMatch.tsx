import { useState } from 'react';
import type { Exercise } from '../../store/types';

interface PatternMatchProps {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
}

export default function PatternMatch({ exercise, onAnswer }: PatternMatchProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const handleSelect = (option: string) => {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
    const correct = option === exercise.correctAnswer;
    setTimeout(() => onAnswer(correct), 3000);
  };

  const original = exercise.originalPhrase;
  const variant = exercise.variantPhrase;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <p className="text-sm text-amber-400 mb-3">Compare these phrases:</p>

        {/* Side-by-side phrase cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Original phrase */}
          <div className="rounded-xl border border-navy-600 bg-navy-800/60 p-4">
            <p className="text-lg font-semibold text-white leading-relaxed">
              {original?.text}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {original?.label}
            </p>
          </div>

          {/* Variant phrase */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-lg font-semibold text-white leading-relaxed">
              {variant?.text}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {variant?.label}
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-400 mt-4">
          What changed between these two?
        </p>
      </div>

      {/* Options */}
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

      {/* Feedback after answering */}
      {answered && selected === exercise.correctAnswer && (
        <p className="text-lg font-semibold text-correct text-center">
          Tacno! Correct!
        </p>
      )}

      {answered && selected !== exercise.correctAnswer && (
        <div className="rounded-xl bg-navy-800/50 p-4">
          <p className="text-sm text-gray-400">The correct answer was:</p>
          <p className="text-base text-correct mt-1">{exercise.correctAnswer}</p>
        </div>
      )}

      {/* Grammar note shown after answering */}
      {answered && exercise.grammarNote && (
        <div className="rounded-xl bg-navy-800/50 border border-amber-500/20 px-4 py-3">
          <p className="text-xs text-amber-400 font-semibold mb-1">Grammar pattern:</p>
          <p className="text-sm text-gray-300 leading-relaxed">{exercise.grammarNote}</p>
        </div>
      )}
    </div>
  );
}
