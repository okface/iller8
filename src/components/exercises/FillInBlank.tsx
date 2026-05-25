import { useState } from 'react';
import type { Exercise } from '../../store/types';
import { checkAnswerFuzzy } from '../../engine/scoring';
import Btn from '../ui/Btn';
import Card from '../ui/Card';
import { T, metaLabel } from '../../lib/tokens';

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

  const borderColor =
    result === null ? T.borderWarm : result.correct ? T.green : T.red;
  const bgColor =
    result === null
      ? T.surface
      : result.correct
        ? T.greenDim
        : T.redDim;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={metaLabel}>FILL IN THE BLANK</div>
        <div
          className="font-serif-sr"
          style={{
            fontSize: 26,
            fontWeight: 500,
            letterSpacing: -0.4,
            lineHeight: 1.3,
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
              fontSize: 13,
              color: T.dim,
              marginTop: 8,
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
          placeholder="Type the missing word…"
          autoFocus
          className="font-serif-sr"
          style={{
            width: '100%',
            padding: '16px 18px',
            borderRadius: T.r3,
            background: bgColor,
            border: `1px solid ${borderColor}`,
            color: T.text,
            fontSize: 20,
            outline: 'none',
            transition: `all ${T.fast} ${T.ease}`,
          }}
        />

        {result === null && (
          <Btn type="submit" kind="primary" size="lg" full disabled={!input.trim()}>
            Check
          </Btn>
        )}
      </form>

      {result && !result.correct && (
        <Card pad={14}>
          {result.close && (
            <div style={{ ...metaLabel, color: T.amber, marginBottom: 6 }}>
              ALMOST · WATCH THE SPELLING
            </div>
          )}
          <div style={{ ...metaLabel, marginBottom: 6 }}>CORRECT ANSWER</div>
          <div
            className="font-serif-sr"
            style={{ fontSize: 18, color: T.green, fontWeight: 500 }}
          >
            {exercise.correctAnswer}
          </div>
        </Card>
      )}

      {result?.correct && (
        <div style={{ fontSize: 15, color: T.green, textAlign: 'center', fontWeight: 600 }}>
          Tačno ✓
        </div>
      )}

      {result && exercise.phrase.notes && (
        <Card pad={12}>
          <div style={{ ...metaLabel, color: T.purple, marginBottom: 6 }}>NOTE</div>
          <div style={{ fontSize: 12, color: T.text, lineHeight: 1.55 }}>
            {exercise.phrase.notes}
          </div>
        </Card>
      )}
    </div>
  );
}
