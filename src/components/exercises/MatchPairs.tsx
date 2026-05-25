import { useState, useEffect, useCallback } from 'react';
import type { Lesson } from '../../store/types';
import { generateMatchPairsData } from '../../engine/exercise-generator';
import { T, metaLabel } from '../../lib/tokens';

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

  const [shuffledSr] = useState(() => [...pairs.pairs].sort(() => Math.random() - 0.5));
  const [shuffledEn] = useState(() => [...pairs.pairs].sort(() => Math.random() - 0.5));

  const checkMatch = useCallback(
    (sr: string, en: string) => {
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
    },
    [pairs.pairs]
  );

  useEffect(() => {
    if (selectedSr && selectedEn) checkMatch(selectedSr, selectedEn);
  }, [selectedSr, selectedEn, checkMatch]);

  const allMatched = matched.size === pairs.pairs.length;

  useEffect(() => {
    if (allMatched) {
      setTimeout(
        () => onComplete(pairs.pairs.length - mistakes, pairs.pairs.length),
        1500
      );
    }
  }, [allMatched, pairs.pairs.length, mistakes, onComplete]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={metaLabel}>MATCH PAIRS</div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: T.text,
            marginTop: 8,
          }}
        >
          Tap a Serbian phrase, then its English.
        </div>
        <div style={{ ...metaLabel, marginTop: 6 }}>
          {matched.size} / {pairs.pairs.length} MATCHED
        </div>
        {allMatched && (
          <div
            style={{
              ...metaLabel,
              color: T.green,
              marginTop: 6,
            }}
          >
            ALL MATCHED · FINISHING…
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shuffledSr.map((pair) => {
            const isMatched = matched.has(pair.id);
            const isSelected = selectedSr === pair.sr;
            const isWrong = wrong?.sr === pair.sr;
            return (
              <Tile
                key={pair.id + '-sr'}
                text={pair.sr}
                serif
                state={
                  isMatched
                    ? 'matched'
                    : isWrong
                      ? 'wrong'
                      : isSelected
                        ? 'selected'
                        : 'idle'
                }
                onClick={() => !isMatched && setSelectedSr(pair.sr)}
              />
            );
          })}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shuffledEn.map((pair) => {
            const isMatched = matched.has(pair.id);
            const isSelected = selectedEn === pair.en;
            const isWrong = wrong?.en === pair.en;
            return (
              <Tile
                key={pair.id + '-en'}
                text={pair.en}
                state={
                  isMatched
                    ? 'matched'
                    : isWrong
                      ? 'wrong'
                      : isSelected
                        ? 'selected'
                        : 'idle'
                }
                onClick={() => !isMatched && setSelectedEn(pair.en)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

type TileState = 'idle' | 'selected' | 'matched' | 'wrong';

function Tile({
  text,
  state,
  serif,
  onClick,
}: {
  text: string;
  state: TileState;
  serif?: boolean;
  onClick?: () => void;
}) {
  const map: Record<TileState, { bg: string; bd: string; fg: string }> = {
    idle: { bg: T.surface, bd: T.border, fg: T.text },
    selected: { bg: T.surfaceWarm, bd: T.amber, fg: T.text },
    matched: { bg: T.greenDim, bd: 'rgba(34,197,94,0.3)', fg: T.dim },
    wrong: { bg: T.redDim, bd: 'rgba(239,68,68,0.4)', fg: T.text },
  };
  const k = map[state];

  return (
    <button
      onClick={onClick}
      disabled={state === 'matched'}
      className={state === 'wrong' ? 'anim-shake' : undefined}
      style={{
        padding: '14px 12px',
        borderRadius: T.r3,
        minHeight: 60,
        background: k.bg,
        border: `1px solid ${k.bd}`,
        color: k.fg,
        fontFamily: serif ? T.serif : T.sans,
        fontSize: serif ? 16 : 14,
        fontWeight: 500,
        letterSpacing: serif ? -0.2 : 0,
        display: 'flex',
        alignItems: 'center',
        textAlign: 'left',
        textDecoration: state === 'matched' ? 'line-through' : 'none',
        opacity: state === 'matched' ? 0.6 : 1,
        cursor: state === 'matched' ? 'default' : 'pointer',
        transition: `all ${T.fast} ${T.ease}`,
      }}
    >
      {text}
    </button>
  );
}
