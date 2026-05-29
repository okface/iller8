import { useState } from 'react';
import type { Exercise } from '../../store/types';
import Card from '../ui/Card';
import MonoBadge from '../ui/MonoBadge';
import DualScript from '../ui/DualScript';
import ContinueButton from '../ui/ContinueButton';
import GlossHint from '../ui/GlossHint';
import MCOptionList from '../ui/MCOptionList';
import AudioButton from '../ui/AudioButton';
import AutoplayAudio from '../ui/AutoplayAudio';
import { T, metaLabel } from '../../lib/tokens';
import { IconBrain } from '../ui/Icons';

interface WordRecognizeProps {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
  script?: 'latin' | 'cyrillic';
}

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
      <AutoplayAudio text={exercise.phrase.sr_latin} />
      <div>
        <div style={metaLabel}>WHAT DOES THIS WORD MEAN?</div>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <DualScript
              srLatin={exercise.phrase.sr_latin}
              srCyrillic={exercise.phrase.sr_cyrillic}
              script={script}
              size="hero"
              weight={500}
            />
          </div>
          <div style={{ paddingTop: 8 }}>
            <AudioButton text={exercise.phrase.sr_latin} size={20} />
          </div>
        </div>
        {exercise.context && (
          <div style={{ marginTop: 8 }}>
            <MonoBadge>{exercise.context}</MonoBadge>
          </div>
        )}
      </div>

      <MCOptionList
        options={exercise.options ?? []}
        correctAnswer={exercise.correctAnswer}
        selected={selected}
        revealed={!!result}
        onSelect={handleSelect}
        serifOptions={false}
      />

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
