import { useState } from 'react';
import type { Exercise } from '../../store/types';
import Card from '../ui/Card';
import MonoBadge from '../ui/MonoBadge';
import DualScript from '../ui/DualScript';
import ContinueButton from '../ui/ContinueButton';
import { T, metaLabel } from '../../lib/tokens';
import { IconBrain } from '../ui/Icons';

interface MultipleChoiceProps {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
  /** Optional override — when provided, used for dual-script. */
  script?: 'latin' | 'cyrillic';
}

const LETTERS = ['A', 'B', 'C', 'D'];

export default function MultipleChoice({ exercise, onAnswer, script }: MultipleChoiceProps) {
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

  // sr-to-en: prompt is Serbian → use serif + dual-script
  // en-to-sr: prompt is English (sans), options are Serbian (serif)
  const promptIsSerbian = exercise.direction === 'sr-to-en';
  const optionsAreSerbian = !promptIsSerbian;
  const inferredScript = script ?? 'latin';

  const optionLabel = promptIsSerbian ? 'WHAT DOES THIS MEAN?' : 'HOW DO YOU SAY THIS?';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={metaLabel}>{optionLabel}</div>
        <div style={{ marginTop: 10 }}>
          {promptIsSerbian && exercise.phrase ? (
            <DualScript
              srLatin={exercise.phrase.sr_latin}
              srCyrillic={exercise.phrase.sr_cyrillic}
              script={inferredScript}
              size="hero"
              weight={500}
            />
          ) : (
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: -0.6,
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
            style={{
              fontStyle: 'italic',
              fontSize: 13,
              color: T.dim,
              marginTop: 10,
              lineHeight: 1.5,
            }}
          >
            {exercise.context}
          </div>
        )}
      </div>

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
                  className={optionsAreSerbian ? 'font-serif-sr' : undefined}
                  style={{
                    fontSize: optionsAreSerbian ? 18 : 15,
                    fontWeight: 500,
                    color: textColor,
                    letterSpacing: optionsAreSerbian ? -0.2 : 0,
                  }}
                >
                  {option}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {result && !result.correct && (
        <Card pad={14}>
          <div style={{ ...metaLabel, marginBottom: 6 }}>CORRECT</div>
          <div
            className={optionsAreSerbian ? 'font-serif-sr' : undefined}
            style={{ fontSize: 17, color: T.green, fontWeight: 500 }}
          >
            {exercise.correctAnswer}
          </div>
        </Card>
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
