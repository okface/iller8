import { useState } from 'react';
import type { Exercise } from '../../store/types';
import { checkAnswerFuzzy } from '../../engine/scoring';
import Btn from '../ui/Btn';
import Card from '../ui/Card';
import MonoBadge from '../ui/MonoBadge';
import DualScript from '../ui/DualScript';
import ContinueButton from '../ui/ContinueButton';
import GlossHint from '../ui/GlossHint';
import AutoplayAudio from '../ui/AutoplayAudio';
import { T, metaLabel } from '../../lib/tokens';
import { IconBrain } from '../ui/Icons';

interface TypeTranslationProps {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
  script?: 'latin' | 'cyrillic';
}

export default function TypeTranslation({ exercise, onAnswer, script = 'latin' }: TypeTranslationProps) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ correct: boolean; close: boolean } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (result || !input.trim()) return;
    const check = checkAnswerFuzzy(input, exercise.correctAnswer);
    setResult(check);
  };

  const handleContinue = () => {
    if (!result) return;
    onAnswer(result.correct);
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
      <AutoplayAudio
        text={
          promptIsSerbian
            ? exercise.phrase.sr_latin
            : result
              ? exercise.phrase.sr_latin
              : undefined
        }
      />
      <div>
        <div style={metaLabel}>
          {targetIsSerbian ? 'TYPE IN SERBIAN' : 'TYPE IN ENGLISH'}
        </div>
        <div style={{ marginTop: 10 }}>
          {promptIsSerbian && exercise.phrase ? (
            <DualScript
              srLatin={exercise.phrase.sr_latin}
              srCyrillic={exercise.phrase.sr_cyrillic}
              script={script}
              size="hero"
              weight={500}
            />
          ) : (
            <div
              style={{
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: -0.5,
                lineHeight: 1.15,
                color: T.text,
              }}
            >
              {exercise.prompt}
            </div>
          )}
        </div>
        {exercise.context && !result && (
          <div
            className="font-serif-sr"
            style={{ fontStyle: 'italic', fontSize: 12, color: T.dim, marginTop: 10, lineHeight: 1.5 }}
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
          <GlossHint hint={exercise.phrase.gloss_hint} />
        </Card>
      )}

      {result?.correct && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, color: T.green, fontWeight: 600 }}>
            Tačno ✓
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
