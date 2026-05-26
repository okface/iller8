import type { ReactNode } from 'react';
import { T } from '../../lib/tokens';

const LETTERS = ['A', 'B', 'C', 'D'];

export interface MCOptionListProps {
  options: string[];
  correctAnswer: string;
  selected: string | null;
  /** True once the learner has answered and the result has been revealed. */
  revealed: boolean;
  onSelect: (option: string) => void;
  /** When true, options render in the Serbian serif font (en→sr). */
  serifOptions?: boolean;
  /** Optional per-option custom render (for exercises where labels are richer). */
  renderLabel?: (option: string, index: number) => ReactNode;
}

/**
 * The shared 4-option button list used across MultipleChoice, ContextPick,
 * Comprehension, WordRecognize, and WordProduce. Renders one button per
 * option with an A/B/C/D letter pill on the left and the option text on
 * the right. Drives all colour state through the same ladder:
 *
 *   !revealed:
 *     idle      → surface bg, dim pill
 *     selected  → warm bg, amber border + amber pill
 *   revealed:
 *     correct   → green-dim bg, green border + green pill
 *     wrong-sel → red-dim   bg, red   border + red   pill
 *     other     → opacity 0.45, dim text
 */
export default function MCOptionList({
  options,
  correctAnswer,
  selected,
  revealed,
  onSelect,
  serifOptions = false,
  renderLabel,
}: MCOptionListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {options.map((option, i) => {
        const isCorrect = option === correctAnswer;
        const isSelected = option === selected;

        let bg: string = T.surface;
        let border: string = T.border;
        let opacity = 1;
        let pillBg: string = 'transparent';
        let pillBorder: string = T.borderHi;
        let pillColor: string = T.dim;
        let textColor: string = T.text;

        if (!revealed) {
          if (isSelected) {
            bg = T.surfaceWarm;
            border = T.amber;
            pillBg = T.amber;
            pillBorder = T.amber;
            pillColor = T.inkOnAmber;
          }
        } else if (isCorrect) {
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

        return (
          <button
            key={i}
            onClick={() => onSelect(option)}
            disabled={revealed}
            style={{
              padding: '14px 16px',
              borderRadius: T.r3,
              background: bg,
              border: `1px solid ${border}`,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              opacity,
              cursor: revealed ? 'default' : 'pointer',
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
              {renderLabel ? (
                renderLabel(option, i)
              ) : (
                <div
                  className={serifOptions ? 'font-serif-sr' : undefined}
                  style={{
                    fontSize: serifOptions ? 17 : 15,
                    fontWeight: 500,
                    color: textColor,
                    letterSpacing: serifOptions ? -0.2 : 0,
                  }}
                >
                  {option}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
