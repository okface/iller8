import { useState } from 'react';
import type { Exercise } from '../../store/types';
import { checkAnswerFuzzy } from '../../engine/scoring';
import Btn from '../ui/Btn';
import Card from '../ui/Card';
import { T, metaLabel } from '../../lib/tokens';

interface TypeTranslationProps {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
}

export default function TypeTranslation({ exercise, onAnswer }: TypeTranslationProps) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ correct: boolean; close: boolean } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (result || !input.trim()) return;
    const check = checkAnswerFuzzy(input, exercise.correctAnswer);
    setResult(check);
    setTimeout(() => onAnswer(check.correct), 1500);
  };

  const targetIsSerbian = exercise.direction !== 'sr-to-en';
  const promptIsSerbian = exercise.direction === 'sr-to-en';

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
        <div style={metaLabel}>
          {targetIsSerbian ? 'TYPE IN SERBIAN' : 'TYPE IN ENGLISH'}
        </div>
        <div
          className={promptIsSerbian ? 'font-serif-sr' : undefined}
          style={{
            fontSize: promptIsSerbian ? 30 : 26,
            fontWeight: promptIsSerbian ? 500 : 700,
            letterSpacing: -0.5,
            lineHeight: 1.15,
            color: T.text,
            marginTop: 8,
          }}
        >
          {exercise.prompt}
        </div>
        {exercise.context && !result && (
          <div
            className="font-serif-sr"
            style={{ fontStyle: 'italic', fontSize: 12, color: T.dim, marginTop: 6, lineHeight: 1.5 }}
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
          placeholder={targetIsSerbian ? 'Napiši na srpskom…' : 'Type in English…'}
          autoFocus
          className={targetIsSerbian ? 'font-serif-sr' : undefined}
          style={{
            width: '100%',
            padding: '16px 18px',
            borderRadius: T.r3,
            background: bgColor,
            border: `1px solid ${borderColor}`,
            color: T.text,
            fontSize: targetIsSerbian ? 22 : 18,
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
          <span>{targetIsSerbian ? 'č š ž ć đ — type latin' : 'plain text'}</span>
          <span>{input.length} chars</span>
        </div>

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
            className={targetIsSerbian ? 'font-serif-sr' : undefined}
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
