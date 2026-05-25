import { useState } from 'react';
import type { Exercise } from '../../store/types';
import Card from '../ui/Card';
import { T, metaLabel } from '../../lib/tokens';

interface MultipleChoiceProps {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
}

const LETTERS = ['A', 'B', 'C', 'D'];

export default function MultipleChoice({ exercise, onAnswer }: MultipleChoiceProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const handleSelect = (option: string) => {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
    const correct = option === exercise.correctAnswer;
    setTimeout(() => onAnswer(correct), 1800);
  };

  // sr-to-en: prompt is Serbian (serif), options are English (sans)
  // en-to-sr: prompt is English (sans), options are Serbian (serif)
  const promptIsSerbian = exercise.direction === 'sr-to-en';
  const optionsAreSerbian = !promptIsSerbian;

  const optionLabel = promptIsSerbian ? 'WHAT DOES THIS MEAN?' : 'PICK THE SERBIAN FOR';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={metaLabel}>{optionLabel}</div>
        <div
          className={promptIsSerbian ? 'font-serif-sr' : undefined}
          style={{
            fontSize: promptIsSerbian ? 30 : 28,
            fontWeight: promptIsSerbian ? 500 : 700,
            letterSpacing: -0.6,
            lineHeight: 1.15,
            color: T.text,
            marginTop: 8,
          }}
        >
          {exercise.prompt}
        </div>
        {exercise.context && !answered && (
          <div
            className="font-serif-sr"
            style={{ fontStyle: 'italic', fontSize: 13, color: T.dim, marginTop: 8, lineHeight: 1.5 }}
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

          if (!answered) {
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
              disabled={answered}
              style={{
                padding: '14px 16px',
                borderRadius: T.r3,
                background: bg,
                border: `1px solid ${border}`,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                opacity,
                cursor: answered ? 'default' : 'pointer',
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
                    fontWeight: optionsAreSerbian ? 500 : 500,
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

      {answered && selected !== exercise.correctAnswer && (
        <div style={{ fontSize: 13, color: T.green }}>
          Correct answer: {exercise.correctAnswer}
        </div>
      )}

      {answered && exercise.phrase.notes && (
        <Card pad={12}>
          <div
            style={{
              ...metaLabel,
              color: T.purple,
              marginBottom: 6,
            }}
          >
            NOTE
          </div>
          <div style={{ fontSize: 12, color: T.text, lineHeight: 1.55 }}>
            {exercise.phrase.notes}
          </div>
        </Card>
      )}
    </div>
  );
}
