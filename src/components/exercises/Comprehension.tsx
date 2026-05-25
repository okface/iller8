import { useState } from 'react';
import type { Exercise } from '../../store/types';
import Card from '../ui/Card';
import { T, metaLabel } from '../../lib/tokens';

interface ComprehensionProps {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
}

const LETTERS = ['A', 'B', 'C', 'D'];

export default function Comprehension({ exercise, onAnswer }: ComprehensionProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const handleSelect = (option: string) => {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
    const correct = option === exercise.correctAnswer;
    setTimeout(() => onAnswer(correct), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Dialogue */}
      <div>
        <div style={{ ...metaLabel, color: T.amber }}>SITUACIJA</div>
        <div
          style={{
            marginTop: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {exercise.dialogue?.map((line, i) => (
            <div
              key={i}
              className="font-serif-sr"
              style={{
                fontSize: 18,
                fontWeight: 500,
                lineHeight: 1.45,
                letterSpacing: -0.2,
                color: T.text,
              }}
            >
              {line}
            </div>
          ))}
        </div>
      </div>

      {/* Question */}
      <Card warm pad={14}>
        <div style={{ ...metaLabel, color: T.amber, marginBottom: 6 }}>PITANJE</div>
        <div
          className="font-serif-sr"
          style={{
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: -0.2,
            color: T.text,
            lineHeight: 1.4,
          }}
        >
          {exercise.question}
        </div>
      </Card>

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
                  className="font-serif-sr"
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    color: textColor,
                    letterSpacing: -0.2,
                  }}
                >
                  {option}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {answered && selected === exercise.correctAnswer && (
        <div style={{ fontSize: 15, color: T.green, textAlign: 'center', fontWeight: 600 }}>
          Odlično ✓
        </div>
      )}

      {answered && selected !== exercise.correctAnswer && (
        <Card pad={14}>
          <div style={{ ...metaLabel, marginBottom: 6 }}>TAČAN ODGOVOR</div>
          <div
            className="font-serif-sr"
            style={{ fontSize: 18, color: T.green, fontWeight: 500 }}
          >
            {exercise.correctAnswer}
          </div>
        </Card>
      )}

      {answered && exercise.phrase.notes && (
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
