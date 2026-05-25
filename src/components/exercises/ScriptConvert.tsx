import { useState } from 'react';
import type { Exercise } from '../../store/types';
import { checkAnswer } from '../../engine/scoring';
import { isCyrillic } from '../../engine/script-converter';
import Btn from '../ui/Btn';
import Card from '../ui/Card';
import { T, metaLabel } from '../../lib/tokens';

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

  const borderColor =
    result === null ? T.borderWarm : result ? T.green : T.red;
  const bgColor =
    result === null ? T.surface : result ? T.greenDim : T.redDim;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={metaLabel}>
          {fromCyrillic ? 'CONVERT CYRILLIC → LATIN' : 'CONVERT LATIN → CYRILLIC'}
        </div>
        <div
          className="font-serif-sr"
          style={{
            fontSize: 30,
            fontWeight: 500,
            letterSpacing: -0.5,
            lineHeight: 1.2,
            color: T.text,
            marginTop: 8,
          }}
        >
          {exercise.prompt}
        </div>
        {exercise.context && (
          <div
            className="font-serif-sr"
            style={{
              fontStyle: 'italic',
              fontSize: 12,
              color: T.dim,
              marginTop: 6,
              lineHeight: 1.5,
            }}
          >
            {exercise.context}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={result !== null}
          placeholder={
            fromCyrillic
              ? 'Write in Latin script…'
              : 'Write in Cyrillic script…'
          }
          autoFocus
          className="font-serif-sr"
          style={{
            width: '100%',
            padding: '16px 18px',
            borderRadius: T.r3,
            background: bgColor,
            border: `1px solid ${borderColor}`,
            color: T.text,
            fontSize: 22,
            outline: 'none',
            transition: `all ${T.fast} ${T.ease}`,
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 11,
            color: T.mute,
            fontFamily: T.mono,
          }}
        >
          <span>{fromCyrillic ? 'use latin diacritics: č š ž ć đ' : 'use cyrillic letters'}</span>
          <span>{input.length} chars</span>
        </div>

        {result === null && (
          <Btn type="submit" kind="primary" size="lg" full disabled={!input.trim()}>
            Check
          </Btn>
        )}
      </form>

      {result === false && (
        <Card pad={14}>
          <div style={{ ...metaLabel, marginBottom: 6 }}>CORRECT ANSWER</div>
          <div
            className="font-serif-sr"
            style={{ fontSize: 20, color: T.green, fontWeight: 500 }}
          >
            {exercise.correctAnswer}
          </div>
        </Card>
      )}

      {result === true && (
        <div style={{ fontSize: 15, color: T.green, textAlign: 'center', fontWeight: 600 }}>
          Svaka čast ✓
        </div>
      )}
    </div>
  );
}
