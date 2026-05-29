import { useState } from 'react';
import type { Exercise } from '../../store/types';
import Btn from '../ui/Btn';
import Card from '../ui/Card';
import MonoBadge from '../ui/MonoBadge';
import ContinueButton from '../ui/ContinueButton';
import GlossHint from '../ui/GlossHint';
import AutoplayAudio from '../ui/AutoplayAudio';
import { T, metaLabel } from '../../lib/tokens';
import { IconBrain } from '../ui/Icons';

interface WordTilesProps {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
  script?: 'latin' | 'cyrillic';
}

export default function WordTiles({ exercise, onAnswer }: WordTilesProps) {
  const [placed, setPlaced] = useState<string[]>([]);
  const [available, setAvailable] = useState<string[]>(exercise.tiles ?? []);
  const [result, setResult] = useState<{ correct: boolean } | null>(null);

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
    setResult({ correct });
  };

  const handleContinue = () => {
    if (!result) return;
    onAnswer(result.correct);
  };

  const dropBg =
    result === null ? T.surface : result.correct ? T.greenDim : T.redDim;
  const dropBorder =
    result === null ? T.border : result.correct ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)';

  const tileSelectedStyle = {
    padding: '10px 14px',
    borderRadius: T.r2,
    background: T.surfaceHi,
    border: `1px solid ${T.borderHi}`,
    color: T.text,
    fontFamily: T.serif,
    fontSize: 16,
    fontWeight: 500,
    boxShadow: T.shadow1,
    cursor: 'grab',
  } as const;

  const tileAvailableStyle = {
    padding: '10px 14px',
    borderRadius: T.r2,
    background: T.surface,
    border: `1px solid ${T.border}`,
    color: T.text,
    fontFamily: T.serif,
    fontSize: 16,
    fontWeight: 500,
    cursor: 'pointer',
  } as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <AutoplayAudio text={result ? exercise.phrase.sr_latin : undefined} />
      <div>
        <div style={metaLabel}>BUILD THE SENTENCE</div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: -0.4,
            lineHeight: 1.2,
            color: T.text,
            marginTop: 8,
          }}
        >
          {exercise.prompt}
        </div>
      </div>

      <div
        className={result?.correct === false ? 'anim-shake' : result?.correct === true ? 'anim-pop' : undefined}
        style={{
          padding: '14px 14px',
          borderRadius: T.r3,
          background: dropBg,
          border: `1px solid ${dropBorder}`,
          minHeight: 96,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignContent: 'flex-start',
          transition: `all ${T.fast} ${T.ease}`,
        }}
      >
        {placed.length === 0 && (
          <span style={{ color: T.mute, fontSize: 13, fontFamily: T.mono }}>
            Tap words below to build the sentence…
          </span>
        )}
        {placed.map((word, i) => (
          <button
            key={`placed-${i}`}
            onClick={() => handleRemoveTile(i)}
            style={tileSelectedStyle as React.CSSProperties}
          >
            {word}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          paddingTop: 14,
          borderTop: `0.5px solid ${T.border}`,
        }}
      >
        {available.map((word, i) => (
          <button
            key={`avail-${i}`}
            onClick={() => handleTileClick(word, i)}
            style={tileAvailableStyle as React.CSSProperties}
          >
            {word}
          </button>
        ))}
        {available.length === 0 && (
          <span style={{ color: T.mute, fontSize: 12, fontFamily: T.mono }}>
            all tiles placed
          </span>
        )}
      </div>

      {result === null && placed.length > 0 && (
        <Btn kind="primary" size="lg" full onClick={handleCheck}>
          Check
        </Btn>
      )}

      {result && !result.correct && (
        <Card pad={14}>
          <div style={{ ...metaLabel, marginBottom: 6 }}>CORRECT ORDER</div>
          <div className="font-serif-sr" style={{ fontSize: 17, color: T.green, fontWeight: 500 }}>
            {exercise.correctAnswer}
          </div>
          <GlossHint hint={exercise.phrase.gloss_hint} />
        </Card>
      )}

      {result?.correct && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, color: T.green, fontWeight: 600 }}>
            Odlično ✓
          </div>
          <GlossHint hint={exercise.phrase.gloss_hint} />
        </div>
      )}

      {result && exercise.phrase.notes && (
        <Card pad={14}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <MonoBadge kind="purple">
              <IconBrain size={11} /> WHY
            </MonoBadge>
          </div>
          <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>
            {exercise.phrase.notes}
          </div>
        </Card>
      )}

      {result && (
        <ContinueButton correct={result.correct} onContinue={handleContinue} />
      )}
    </div>
  );
}
