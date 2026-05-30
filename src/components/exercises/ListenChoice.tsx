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
import { IconBrain, IconAudio } from '../ui/Icons';

interface ListenChoiceProps {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
  script?: 'latin' | 'cyrillic';
}

/**
 * Listening comprehension. Plays a Serbian clip (autoplay on mount +
 * a big replay button) with NO text shown, and asks the learner to
 * pick the English meaning. The whole point is to train the EAR — so
 * the Serbian text is hidden until after the answer.
 *
 * Conventions on Exercise:
 *   prompt              = English gloss (the correct meaning)
 *   correctAnswer       = English gloss (matches prompt)
 *   options             = 4 English meanings (one correct + 3 distractors)
 *   phrase.sr_latin     = Serbian (used for the audio clip + post-answer reveal)
 *   phrase.sr_cyrillic  = Serbian Cyrillic (post-answer reveal)
 *
 * Note: clips are hashed by the Latin form, so audio always uses
 * `exercise.phrase.sr_latin`.
 */
export default function ListenChoice({ exercise, onAnswer, script = 'latin' }: ListenChoiceProps) {
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
      {/* Always autoplay on mount — listening is the entire exercise. */}
      <AutoplayAudio text={exercise.phrase.sr_latin} enabled />

      <div>
        <div style={metaLabel}>LISTEN · WHAT DID YOU HEAR?</div>

        {/* Big tap-to-replay surface. No Serbian text shown pre-answer.
            A div (not a button) so the inner AudioButton isn't a nested
            button — invalid HTML and a click-target conflict. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            width: '100%',
            marginTop: 12,
            padding: '24px 16px',
            borderRadius: T.r3,
            background: T.surfaceWarm,
            border: `1px solid ${T.borderWarm}`,
          }}
        >
          <span style={{ color: T.amber, display: 'flex', alignItems: 'center' }}>
            <IconAudio size={28} />
          </span>
          <AudioButton text={exercise.phrase.sr_latin} size={28} ariaLabel="Replay audio" />
        </div>
        <div
          style={{
            ...metaLabel,
            textAlign: 'center',
            marginTop: 8,
            color: T.mute,
          }}
        >
          TAP THE SPEAKER TO REPLAY
        </div>
      </div>

      <MCOptionList
        options={exercise.options ?? []}
        correctAnswer={exercise.correctAnswer}
        selected={selected}
        revealed={!!result}
        onSelect={handleSelect}
        serifOptions={false}
      />

      {/* Post-answer: reveal what was actually said. */}
      {result && (
        <Card pad={14}>
          <div style={{ ...metaLabel, marginBottom: 6 }}>YOU HEARD</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <DualScript
                srLatin={exercise.phrase.sr_latin}
                srCyrillic={exercise.phrase.sr_cyrillic}
                script={script}
                size="lg"
              />
            </div>
            <AudioButton text={exercise.phrase.sr_latin} size={16} />
          </div>
          <div style={{ fontSize: 13, color: T.dim, marginTop: 6 }}>
            {exercise.correctAnswer}
          </div>
          <GlossHint hint={exercise.phrase.gloss_hint} />
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
