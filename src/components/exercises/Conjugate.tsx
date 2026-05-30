import { useState } from 'react';
import type { Exercise } from '../../store/types';
import { checkAnswerFuzzy } from '../../engine/scoring';
import Btn from '../ui/Btn';
import Card from '../ui/Card';
import MonoBadge from '../ui/MonoBadge';
import DualScript from '../ui/DualScript';
import MCOptionList from '../ui/MCOptionList';
import ContinueButton from '../ui/ContinueButton';
import AudioButton from '../ui/AudioButton';
import AutoplayAudio from '../ui/AutoplayAudio';
import { T, metaLabel } from '../../lib/tokens';
import { IconBrain } from '../ui/Icons';

interface ConjugateProps {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
  script?: 'latin' | 'cyrillic';
}

/**
 * Conjugation drill: produce a verb's form for a given person. The
 * distractors (MC) are the other persons of the same verb, so the
 * learner must discriminate the ending. The faded pronoun frame
 * ("ona ___") reinforces that the pronoun is droppable. Audio (on
 * reveal) plays the bare form — what a Serb actually says.
 */
export default function Conjugate({ exercise, onAnswer, script = 'latin' }: ConjugateProps) {
  const hasOptions = !!exercise.options && exercise.options.length > 1;
  const [input, setInput] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [result, setResult] = useState<{ correct: boolean; close?: boolean } | null>(null);

  const pronoun =
    script === 'cyrillic' ? exercise.baseSrCyrillic : exercise.baseSrLatin;

  const handlePick = (option: string) => {
    if (result) return;
    setPicked(option);
    setResult({ correct: option === exercise.correctAnswer });
  };

  const handleTypeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (result || !input.trim()) return;
    setResult(checkAnswerFuzzy(input, exercise.correctAnswer));
  };

  const handleContinue = () => {
    if (!result) return;
    onAnswer(result.correct);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Audio plays the bare form once the answer is revealed. */}
      <AutoplayAudio text={result ? exercise.phrase.sr_latin : undefined} delayMs={150} />

      <div>
        <div style={metaLabel}>CONJUGATE</div>
        <div style={{ marginTop: 8 }}>
          <MonoBadge kind="amber">{exercise.transformLabel ?? 'verb'}</MonoBadge>
        </div>
        {/* English target */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: -0.5,
            lineHeight: 1.15,
            color: T.text,
            marginTop: 12,
          }}
        >
          {exercise.prompt}
        </div>
        {/* Faded, droppable pronoun frame: "ona ___" */}
        {pronoun && (
          <div
            className="font-serif-sr"
            style={{ fontSize: 20, color: T.mute, marginTop: 6 }}
          >
            {pronoun} <span style={{ color: T.border }}>____</span>
          </div>
        )}
      </div>

      {hasOptions ? (
        <MCOptionList
          options={exercise.options ?? []}
          correctAnswer={exercise.correctAnswer}
          selected={picked}
          revealed={!!result}
          onSelect={handlePick}
          serifOptions
        />
      ) : (
        <form onSubmit={handleTypeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!!result}
            placeholder="Type the verb form…"
            autoFocus
            className="font-serif-sr"
            style={{
              width: '100%',
              padding: '16px 18px',
              borderRadius: T.r3,
              background: result === null ? T.surface : result.correct ? T.greenDim : T.redDim,
              border: `1px solid ${result === null ? T.borderWarm : result.correct ? T.green : T.red}`,
              color: T.text,
              fontSize: 22,
              outline: 'none',
              transition: `all ${T.fast} ${T.ease}`,
            }}
          />
          {result === null && (
            <Btn type="submit" kind="primary" size="lg" full disabled={!input.trim()}>
              Check
            </Btn>
          )}
        </form>
      )}

      {result && (
        <Card pad={14}>
          <div style={{ ...metaLabel, marginBottom: 6 }}>
            {result.correct ? 'YOU SAID' : 'CORRECT'}
          </div>
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
          <div style={{ fontSize: 13, color: T.dim, marginTop: 4 }}>{exercise.phrase.en}</div>
        </Card>
      )}

      {result && exercise.grammarNote && (
        <Card pad={14}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <MonoBadge kind="purple">
              <IconBrain size={11} /> WHY
            </MonoBadge>
          </div>
          <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>
            {exercise.grammarNote}
          </div>
        </Card>
      )}

      {result && (
        <ContinueButton correct={result.correct} onContinue={handleContinue} />
      )}
    </div>
  );
}
