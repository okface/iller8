import { useState } from 'react';
import type { Exercise } from '../../store/types';
import { checkAnswerFuzzy } from '../../engine/scoring';
import Btn from '../ui/Btn';
import Card from '../ui/Card';
import MonoBadge from '../ui/MonoBadge';
import { T, metaLabel } from '../../lib/tokens';
import { IconBrain } from '../ui/Icons';

interface PerspectiveShiftProps {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
}

/**
 * Show a base Serbian phrase + a transformation instruction
 * ("Now to a group of friends. (formal/plural)") and ask the learner
 * to produce the variant. Multiple-choice when options are present,
 * type-it when they aren't.
 */
export default function PerspectiveShift({ exercise, onAnswer }: PerspectiveShiftProps) {
  const hasOptions = !!exercise.options && exercise.options.length > 1;
  const [input, setInput] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [result, setResult] = useState<{ correct: boolean; close?: boolean } | null>(null);

  const handleTypeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (result || !input.trim()) return;
    const check = checkAnswerFuzzy(input, exercise.correctAnswer);
    setResult(check);
    setTimeout(() => onAnswer(check.correct), 1600);
  };

  const handlePick = (option: string) => {
    if (result) return;
    setPicked(option);
    const correct = option === exercise.correctAnswer;
    setResult({ correct });
    setTimeout(() => onAnswer(correct), 1600);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={metaLabel}>NOW SAY IT…</div>
        <div
          style={{
            marginTop: 10,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <MonoBadge kind="amber">{exercise.transformLabel ?? 'transform'}</MonoBadge>
          {exercise.transformHint && (
            <span style={{ fontSize: 12, color: T.dim }}>{exercise.transformHint}</span>
          )}
        </div>
      </div>

      {/* Base phrase card — the anchor */}
      <Card pad={16}>
        <div style={metaLabel}>BASE</div>
        <div
          className="font-serif-sr"
          style={{
            fontSize: 24,
            fontWeight: 500,
            letterSpacing: -0.3,
            color: T.text,
            marginTop: 8,
          }}
        >
          {exercise.baseSr ?? exercise.prompt}
        </div>
        {exercise.baseEn && (
          <div
            style={{
              fontFamily: T.mono,
              fontSize: 12,
              color: T.dim,
              marginTop: 4,
            }}
          >
            {exercise.baseEn}
          </div>
        )}
      </Card>

      {/* The target English (what the variant should mean) */}
      <div>
        <div style={metaLabel}>TARGET MEANING</div>
        <div
          style={{
            fontSize: 18,
            color: T.amber,
            fontWeight: 500,
            marginTop: 6,
            lineHeight: 1.4,
          }}
        >
          {exercise.prompt}
        </div>
      </div>

      {hasOptions ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {exercise.options!.map((opt, i) => {
            const isCorrect = opt === exercise.correctAnswer;
            const isPicked = opt === picked;

            let bg: string = T.surface;
            let border: string = T.border;
            let opacity = 1;
            if (result) {
              if (isCorrect) {
                bg = T.greenDim;
                border = 'rgba(34,197,94,0.4)';
              } else if (isPicked) {
                bg = T.redDim;
                border = 'rgba(239,68,68,0.4)';
              } else {
                opacity = 0.45;
              }
            } else if (isPicked) {
              bg = T.surfaceWarm;
              border = T.amber;
            }

            return (
              <button
                key={i}
                onClick={() => handlePick(opt)}
                disabled={!!result}
                className="font-serif-sr"
                style={{
                  padding: '14px 16px',
                  borderRadius: T.r3,
                  background: bg,
                  border: `1px solid ${border}`,
                  color: T.text,
                  fontSize: 17,
                  fontWeight: 500,
                  letterSpacing: -0.2,
                  textAlign: 'left',
                  cursor: result ? 'default' : 'pointer',
                  opacity,
                  transition: `all ${T.fast} ${T.ease}`,
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      ) : (
        <form
          onSubmit={handleTypeSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!!result}
            placeholder="Type the Serbian variant…"
            autoFocus
            className="font-serif-sr"
            style={{
              width: '100%',
              padding: '16px 18px',
              borderRadius: T.r3,
              background:
                result === null
                  ? T.surface
                  : result.correct
                    ? T.greenDim
                    : T.redDim,
              border: `1px solid ${
                result === null
                  ? T.borderWarm
                  : result.correct
                    ? T.green
                    : T.red
              }`,
              color: T.text,
              fontSize: 22,
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
      )}

      {result && !result.correct && (
        <Card pad={14}>
          {result.close && (
            <div style={{ ...metaLabel, color: T.amber, marginBottom: 6 }}>
              ALMOST · WATCH THE SPELLING
            </div>
          )}
          <div style={{ ...metaLabel, marginBottom: 6 }}>CORRECT</div>
          <div
            className="font-serif-sr"
            style={{ fontSize: 18, color: T.green, fontWeight: 500 }}
          >
            {exercise.correctAnswer}
          </div>
        </Card>
      )}

      {result?.correct && (
        <div
          style={{
            fontSize: 15,
            color: T.green,
            textAlign: 'center',
            fontWeight: 600,
          }}
        >
          Tačno ✓
        </div>
      )}

      {result && exercise.grammarNote && (
        <Card pad={12}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <MonoBadge kind="purple">
              <IconBrain size={11} /> NOTE
            </MonoBadge>
          </div>
          <div style={{ fontSize: 12, color: T.text, lineHeight: 1.55 }}>
            {exercise.grammarNote}
          </div>
        </Card>
      )}
    </div>
  );
}
