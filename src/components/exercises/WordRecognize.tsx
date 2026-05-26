import { useState } from 'react';
import type { Exercise } from '../../store/types';
import Card from '../ui/Card';
import MonoBadge from '../ui/MonoBadge';
import DualScript from '../ui/DualScript';
import ContinueButton from '../ui/ContinueButton';
import GlossHint from '../ui/GlossHint';
import { T, metaLabel } from '../../lib/tokens';
import { IconBrain } from '../ui/Icons';

interface WordRecognizeProps {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
  script?: 'latin' | 'cyrillic';
}

const LETTERS = ['A', 'B', 'C', 'D'];

/**
 * Single-word recognition: show one Serbian word big with both scripts,
 * pick the matching English from 4 options. The distractors are
 * minimal-pair words (same POS, similar shape) so the learner has to
 * actually know the word's meaning — silhouette matching won't work.
 *
 * The Exercise carries the word's data via these conventions:
 *   prompt              = English gloss (target meaning)
 *   correctAnswer       = Serbian lemma (or English depending on direction)
 *   phrase.sr_latin     = Serbian word in Latin
 *   phrase.sr_cyrillic  = Serbian word in Cyrillic
 *   phrase.en           = English gloss
 *   options             = 4 English glosses (one correct + 3 distractors)
 *   context             = POS label ("verb", "noun · f", etc.)
 *   phrase.notes        = optional grammar note
 */
export default function WordRecognize({ exercise, onAnswer, script = 'latin' }: WordRecognizeProps) {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={metaLabel}>WHAT DOES THIS WORD MEAN?</div>
        <div style={{ marginTop: 10 }}>
          <DualScript
            srLatin={exercise.phrase.sr_latin}
            srCyrillic={exercise.phrase.sr_cyrillic}
            script={script}
            size="hero"
            weight={500}
          />
        </div>
        {exercise.context && (
          <div style={{ marginTop: 8 }}>
            <MonoBadge>{exercise.context}</MonoBadge>
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
              <div style={{ fontSize: 15, fontWeight: 500, color: textColor }}>
                {option}
              </div>
            </button>
          );
        })}
      </div>

      {result && !result.correct && (
        <Card pad={14}>
          <div style={{ ...metaLabel, marginBottom: 6 }}>MEANS</div>
          <div style={{ fontSize: 17, color: T.green, fontWeight: 500 }}>
            {exercise.correctAnswer}
          </div>
          <GlossHint hint={exercise.phrase.gloss_hint} />
        </Card>
      )}

      {result?.correct && exercise.phrase.gloss_hint && (
        <div style={{ textAlign: 'center' }}>
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
