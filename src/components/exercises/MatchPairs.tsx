import { useState, useEffect, useCallback } from 'react';
import type { Lesson } from '../../store/types';
import { generateMatchPairsData } from '../../engine/exercise-generator';
import { cn } from '../../lib/utils';

interface MatchPairsProps {
  lesson: Lesson;
  script: 'latin' | 'cyrillic';
  onComplete: (correctCount: number, totalCount: number) => void;
}

export default function MatchPairs({ lesson, script, onComplete }: MatchPairsProps) {
  const [pairs] = useState(() => generateMatchPairsData(lesson, script));
  const [selectedSr, setSelectedSr] = useState<string | null>(null);
  const [selectedEn, setSelectedEn] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<{ sr: string; en: string } | null>(null);
  const [mistakes, setMistakes] = useState(0);

  const [shuffledSr] = useState(() =>
    [...pairs.pairs].sort(() => Math.random() - 0.5)
  );
  const [shuffledEn] = useState(() =>
    [...pairs.pairs].sort(() => Math.random() - 0.5)
  );

  const checkMatch = useCallback((sr: string, en: string) => {
    const pair = pairs.pairs.find((p) => p.sr === sr && p.en === en);
    if (pair) {
      setMatched((prev) => new Set([...prev, pair.id]));
      setSelectedSr(null);
      setSelectedEn(null);
    } else {
      setWrong({ sr, en });
      setMistakes((m) => m + 1);
      setTimeout(() => {
        setWrong(null);
        setSelectedSr(null);
        setSelectedEn(null);
      }, 800);
    }
  }, [pairs.pairs]);

  useEffect(() => {
    if (selectedSr && selectedEn) {
      checkMatch(selectedSr, selectedEn);
    }
  }, [selectedSr, selectedEn, checkMatch]);

  useEffect(() => {
    if (matched.size === pairs.pairs.length) {
      setTimeout(() => onComplete(pairs.pairs.length - mistakes, pairs.pairs.length), 500);
    }
  }, [matched.size, pairs.pairs.length, mistakes, onComplete]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-gray-400 mb-2">Match the pairs:</p>
        <p className="text-xs text-gray-500">
          {matched.size}/{pairs.pairs.length} matched
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          {shuffledSr.map((pair) => {
            const isMatched = matched.has(pair.id);
            const isSelected = selectedSr === pair.sr;
            const isWrong = wrong?.sr === pair.sr;

            return (
              <button
                key={pair.id + '-sr'}
                onClick={() => !isMatched && setSelectedSr(pair.sr)}
                disabled={isMatched}
                className={cn(
                  'rounded-xl border-2 p-3 text-left text-sm transition-all',
                  isMatched && 'border-correct/30 bg-correct/5 opacity-60',
                  isSelected && !isWrong && 'border-amber-500 bg-amber-500/10',
                  isWrong && 'border-incorrect bg-incorrect/10 animate-shake',
                  !isMatched && !isSelected && !isWrong && 'border-navy-600 hover:border-navy-500 text-white'
                )}
              >
                {pair.sr}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          {shuffledEn.map((pair) => {
            const isMatched = matched.has(pair.id);
            const isSelected = selectedEn === pair.en;
            const isWrong = wrong?.en === pair.en;

            return (
              <button
                key={pair.id + '-en'}
                onClick={() => !isMatched && setSelectedEn(pair.en)}
                disabled={isMatched}
                className={cn(
                  'rounded-xl border-2 p-3 text-left text-sm transition-all',
                  isMatched && 'border-correct/30 bg-correct/5 opacity-60',
                  isSelected && !isWrong && 'border-amber-500 bg-amber-500/10',
                  isWrong && 'border-incorrect bg-incorrect/10',
                  !isMatched && !isSelected && !isWrong && 'border-navy-600 hover:border-navy-500 text-white'
                )}
              >
                {pair.en}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
