import { useState } from 'react';
import type { Exercise } from '../../store/types';
import { checkAnswerFuzzy } from '../../engine/scoring';

interface FillInBlankProps {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
}

export default function FillInBlank({ exercise, onAnswer }: FillInBlankProps) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ correct: boolean; close: boolean } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (result || !input.trim()) return;

    const check = checkAnswerFuzzy(input, exercise.correctAnswer);
    setResult(check);
    setTimeout(() => onAnswer(check.correct), 1500);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-gray-400 mb-2">Fill in the blank:</p>
        <p className="text-2xl font-semibold text-white leading-relaxed">
          {exercise.prompt}
        </p>
        {exercise.context && (
          <p className="text-sm text-gray-500 mt-2">({exercise.context})</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={result !== null}
          placeholder="Type the missing word..."
          autoFocus
          className={`w-full rounded-xl border-2 bg-navy-800/50 p-4 text-lg text-white placeholder-gray-600 outline-none transition-colors ${
            result === null
              ? 'border-navy-600 focus:border-amber-500'
              : result.correct
                ? 'border-correct bg-correct/10'
                : 'border-incorrect bg-incorrect/10'
          }`}
        />

        {result === null && (
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-navy-900 transition-opacity disabled:opacity-40"
          >
            Check
          </button>
        )}
      </form>

      {result && !result.correct && (
        <div className="rounded-xl bg-navy-800/50 p-4">
          <p className="text-sm text-gray-400">Correct answer:</p>
          <p className="text-lg text-correct">{exercise.correctAnswer}</p>
        </div>
      )}

      {result?.correct && (
        <p className="text-lg font-semibold text-correct text-center">
          Tačno! ✓
        </p>
      )}
    </div>
  );
}
