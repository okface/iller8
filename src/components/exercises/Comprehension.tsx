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

interface ComprehensionProps {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
  script?: 'latin' | 'cyrillic';
}

export default function Comprehension({ exercise, onAnswer, script = 'latin' }: ComprehensionProps) {
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
      {/* Play the tested phrase (Latin-hashed clip). The synthesized
          scaffolding lines have no generated clips, so we only voice the
          real corpus phrase being comprehended. */}
      <AutoplayAudio text={exercise.phrase.sr_latin} />
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

      {/* Question — now English (the dialogue stays Serbian above). */}
      <Card warm pad={14}>
        <div style={{ ...metaLabel, color: T.amber, marginBottom: 6 }}>QUESTION</div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 500,
            color: T.text,
            lineHeight: 1.4,
          }}
        >
          {exercise.question}
        </div>
      </Card>

      {/* Options — English meanings. The learner must comprehend the
          Serbian dialogue; the answer is never visible on screen. */}
      <MCOptionList
        options={exercise.options ?? []}
        correctAnswer={exercise.correctAnswer}
        selected={selected}
        revealed={!!result}
        onSelect={handleSelect}
        serifOptions={false}
      />

      {result?.correct && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, color: T.green, fontWeight: 600 }}>
            Odlično ✓
          </div>
        </div>
      )}

      {/* Post-answer reveal: the correct answer is now English, so also
          surface the target Serbian line (what was said) and its meaning. */}
      {result && (
        <Card pad={14}>
          <div style={{ ...metaLabel, marginBottom: 6 }}>THE LINE</div>
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
          <div style={{ fontSize: 13, color: T.green, fontWeight: 500, marginTop: 6 }}>
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
