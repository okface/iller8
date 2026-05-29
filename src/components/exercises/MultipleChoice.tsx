import { useState } from 'react';
import type { Exercise } from '../../store/types';
import Card from '../ui/Card';
import MonoBadge from '../ui/MonoBadge';
import DualScript from '../ui/DualScript';
import ContinueButton from '../ui/ContinueButton';
import GlossHint from '../ui/GlossHint';
import MCOptionList from '../ui/MCOptionList';
import AudioButton from '../ui/AudioButton';
import { T, metaLabel } from '../../lib/tokens';
import { IconBrain } from '../ui/Icons';

interface MultipleChoiceProps {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
  /** Optional override — when provided, used for dual-script. */
  script?: 'latin' | 'cyrillic';
}

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
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {promptIsSerbian && exercise.phrase ? (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <DualScript
                  srLatin={exercise.phrase.sr_latin}
                  srCyrillic={exercise.phrase.sr_cyrillic}
                  script={inferredScript}
                  size="hero"
                  weight={500}
                />
              </div>
              <div style={{ paddingTop: 8 }}>
                <AudioButton text={exercise.phrase.sr_latin} size={20} />
              </div>
            </>
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

      <MCOptionList
        options={exercise.options ?? []}
        correctAnswer={exercise.correctAnswer}
        selected={selected}
        revealed={!!result}
        onSelect={handleSelect}
        serifOptions={optionsAreSerbian}
      />

      {result && !result.correct && (
        <Card pad={14}>
          <div style={{ ...metaLabel, marginBottom: 6 }}>CORRECT</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              className={optionsAreSerbian ? 'font-serif-sr' : undefined}
              style={{ fontSize: 17, color: T.green, fontWeight: 500, flex: 1 }}
            >
              {exercise.correctAnswer}
            </div>
            {optionsAreSerbian && (
              <AudioButton text={exercise.phrase.sr_latin} size={16} />
            )}
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
