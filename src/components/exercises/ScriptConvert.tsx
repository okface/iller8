import { useState } from 'react';
import type { Exercise } from '../../store/types';
import { checkAnswer } from '../../engine/scoring';
import { isCyrillic } from '../../engine/script-converter';

interface ScriptConvertProps {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
}

export default function ScriptConvert({ exercise, onAnswer }: ScriptConvertProps) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<boolean | null>(null);

  const fromCyrillic = isCyrillic(exercise.prompt);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (result !== null || !input.trim()) return;

    const correct = checkAnswer(input, exercise.correctAnswer);
    setResult(correct);
    setTimeout(() => onAnswer(correct), 1500);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-gray-400 mb-2">
          {exercise.context}
        </p>
        <p className="text-2xl font-semibold text-white leading-relaxed tracking-wide">
          {exercise.prompt}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={result !== null}
          placeholder={
            fromCyrillic
              ? 'Write in Latin script...'
              : 'Write in Cyrillic script...'
          }
          autoFocus
          className={`w-full rounded-xl border-2 bg-navy-800/50 p-4 text-lg text-white placeholder-gray-600 outline-none transition-colors ${
            result === null
              ? 'border-navy-600 focus:border-amber-500'
              : result
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

      {result === false && (
        <div className="rounded-xl bg-navy-800/50 p-4">
          <p className="text-sm text-gray-400">Correct answer:</p>
          <p className="text-lg text-correct">{exercise.correctAnswer}</p>
        </div>
      )}

      {result === true && (
        <p className="text-lg font-semibold text-correct text-center">
          Svaka čast! ✓
        </p>
      )}
    </div>
  );
}
