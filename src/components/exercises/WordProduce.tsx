import { useState } from 'react';
import type { Exercise } from '../../store/types';
import Card from '../ui/Card';
import MonoBadge from '../ui/MonoBadge';
import ContinueButton from '../ui/ContinueButton';
import GlossHint from '../ui/GlossHint';
import { T, metaLabel } from '../../lib/tokens';
import { IconBrain } from '../ui/Icons';

interface WordProduceProps {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
  script?: 'latin' | 'cyrillic';
}

const LETTERS = ['A', 'B', 'C', 'D'];

/**
 * Single-word production: show an English gloss, pick the Serbian word
 * from 4 options (minimal-pair distractors). This is the harder
 * direction — and the one the user asked for. "How do I say 'dear' in
 * Serbian?" with 4 plausible Serbian words.
 *
 * Conventions on Exercise:
 *   prompt              = English gloss (the question)
 *   correctAnswer       = correct Serbian lemma (in the learner's script)
 *   phrase.sr_latin     = Serbian word in Latin
 *   phrase.sr_cyrillic  = Serbian word in Cyrillic
 *   phrase.en           = English gloss
 *   options             = 4 Serbian lemmas (one correct + 3 distractors)
 *   context             = POS label
 *   phrase.notes        = optional grammar note
 */
export default function WordProduce({ exercise, onAnswer, script: _script = 'latin' }: WordProduceProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<{ correct: boolean } | null>(null);

  // _script is accepted for API consistency with sibling exercises;
  // the actual rendered script is determined by what the generator
  // put in `options` and `correctAnswer`.
  void _script;

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
        <div style={metaLabel}>HOW DO YOU SAY THIS WORD?</div>
        <div
          style={{
            marginTop: 10,
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: -0.6,
            lineHeight: 1.15,
            color: T.text,
          }}
        >
          {exercise.prompt}
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
              className="font-serif-sr"
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
                color: textColor,
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
              <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: -0.2 }}>
                {option}
              </div>
            </button>
          );
        })}
      </div>

      {result && !result.correct && (
        <Card pad={14}>
          <div style={{ ...metaLabel, marginBottom: 6 }}>CORRECT</div>
          <div
            className="font-serif-sr"
            style={{ fontSize: 18, color: T.green, fontWeight: 500 }}
          >
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
