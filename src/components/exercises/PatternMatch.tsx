import { useState } from 'react';
import type { Exercise } from '../../store/types';
import Card from '../ui/Card';
import MonoBadge from '../ui/MonoBadge';
import ContinueButton from '../ui/ContinueButton';
import GlossHint from '../ui/GlossHint';
import AutoplayAudio from '../ui/AutoplayAudio';
import { T, metaLabel } from '../../lib/tokens';
import { IconBrain } from '../ui/Icons';

interface PatternMatchProps {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
  script?: 'latin' | 'cyrillic';
}

const LETTERS = ['A', 'B', 'C', 'D'];

export default function PatternMatch({ exercise, onAnswer }: PatternMatchProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<{ correct: boolean } | null>(null);

  const handleSelect = (option: string) => {
    if (result) return;
    setSelected(option);
    setResult({ correct: option === exercise.correctAnswer });
  };

  const handleContinue = () => {
    if (!result) return;
    onAnswer(result.correct);
  };

  const original = exercise.originalPhrase;
  const variant = exercise.variantPhrase;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <AutoplayAudio text={original?.text} delayMs={0} />
      <AutoplayAudio text={variant?.text} delayMs={700} />
      {/* Header */}
      <div>
        <div style={{ ...metaLabel, color: T.amber }}>COMPARE THESE PHRASES</div>

        {/* Side-by-side phrase cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            marginTop: 12,
          }}
        >
          {/* Original phrase */}
          <Card pad={14}>
            <div
              className="font-serif-sr"
              style={{
                fontSize: 18,
                fontWeight: 500,
                letterSpacing: -0.2,
                lineHeight: 1.35,
                color: T.text,
              }}
            >
              {original?.text}
            </div>
            <div
              style={{
                fontSize: 12,
                color: T.dim,
                marginTop: 8,
                fontFamily: T.mono,
              }}
            >
              {original?.label}
            </div>
          </Card>

          {/* Variant phrase */}
          <Card warm pad={14}>
            <div
              className="font-serif-sr"
              style={{
                fontSize: 18,
                fontWeight: 500,
                letterSpacing: -0.2,
                lineHeight: 1.35,
                color: T.text,
              }}
            >
              {variant?.text}
            </div>
            <div
              style={{
                fontSize: 12,
                color: T.dim,
                marginTop: 8,
                fontFamily: T.mono,
              }}
            >
              {variant?.label}
            </div>
          </Card>
        </div>

        <div
          style={{
            fontSize: 13,
            color: T.dim,
            marginTop: 14,
            fontFamily: T.mono,
          }}
        >
          What changed between these two?
        </div>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {exercise.options?.map((option, i) => {
          const isCorrect = option === exercise.correctAnswer;
          const isSelected = option === selected;

          let bg: string = T.surface;
          let border: string = T.border;
          let opacity = 1;
          let pillBg: string = 'transparent';
          let pillBorder: string = T.borderHi;
          let pillColor: string = T.dim;
          let textColor: string = T.text;

          if (!result) {
            if (isSelected) {
              bg = T.surfaceWarm;
              border = T.amber;
              pillBg = T.amber;
              pillBorder = T.amber;
              pillColor = T.inkOnAmber;
            }
          } else {
            if (isCorrect) {
              bg = T.greenDim;
              border = 'rgba(34,197,94,0.4)';
              pillBg = T.green;
              pillBorder = T.green;
              pillColor = '#072c14';
            } else if (isSelected) {
              bg = T.redDim;
              border = 'rgba(239,68,68,0.4)';
              pillBg = T.red;
              pillBorder = T.red;
              pillColor = '#3a0a0a';
            } else {
              opacity = 0.45;
              textColor = T.dim;
            }
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(option)}
              disabled={!!result}
              style={{
                padding: '14px 16px',
                borderRadius: T.r3,
                background: bg,
                border: `1px solid ${border}`,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                opacity,
                cursor: result ? 'default' : 'pointer',
                transition: `all ${T.fast} ${T.ease}`,
                textAlign: 'left',
                width: '100%',
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: T.r1,
                  border: `1px solid ${pillBorder}`,
                  background: pillBg,
                  color: pillColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: T.mono,
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {LETTERS[i]}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: textColor,
                    lineHeight: 1.4,
                  }}
                >
                  {option}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Feedback after answering */}
      {result?.correct && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, color: T.green, fontWeight: 600 }}>
            Tačno ✓
          </div>
          <GlossHint hint={exercise.phrase.gloss_hint} />
        </div>
      )}

      {result && !result.correct && (
        <Card pad={14}>
          <div style={{ ...metaLabel, marginBottom: 6 }}>CORRECT ANSWER</div>
          <div
            style={{ fontSize: 15, color: T.green, fontWeight: 500, lineHeight: 1.4 }}
          >
            {exercise.correctAnswer}
          </div>
          <GlossHint hint={exercise.phrase.gloss_hint} />
        </Card>
      )}

      {/* Grammar note shown after answering */}
      {result && exercise.grammarNote && (
        <Card pad={14}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <MonoBadge kind="purple">
              <IconBrain size={11} /> WHY
            </MonoBadge>
          </div>
          <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>
            {exercise.grammarNote}
          </div>
        </Card>
      )}

      {result && (
        <ContinueButton correct={result.correct} onContinue={handleContinue} />
      )}
    </div>
  );
}
