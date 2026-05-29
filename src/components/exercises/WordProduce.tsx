import { useState } from 'react';
import type { Exercise } from '../../store/types';
import Card from '../ui/Card';
import MonoBadge from '../ui/MonoBadge';
import ContinueButton from '../ui/ContinueButton';
import GlossHint from '../ui/GlossHint';
import MCOptionList from '../ui/MCOptionList';
import AutoplayAudio from '../ui/AutoplayAudio';
import { T, metaLabel } from '../../lib/tokens';
import { IconBrain } from '../ui/Icons';

interface WordProduceProps {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
  script?: 'latin' | 'cyrillic';
}

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
      <AutoplayAudio text={result ? exercise.phrase.sr_latin : undefined} />
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

      <MCOptionList
        options={exercise.options ?? []}
        correctAnswer={exercise.correctAnswer}
        selected={selected}
        revealed={!!result}
        onSelect={handleSelect}
        serifOptions
      />

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
