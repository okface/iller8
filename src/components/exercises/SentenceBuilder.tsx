import { useState } from 'react';
import type { Exercise } from '../../store/types';
import Btn from '../ui/Btn';
import Card from '../ui/Card';
import MonoBadge from '../ui/MonoBadge';
import DualScript from '../ui/DualScript';
import ContinueButton from '../ui/ContinueButton';
import GlossHint from '../ui/GlossHint';
import AutoplayAudio from '../ui/AutoplayAudio';
import { T, metaLabel } from '../../lib/tokens';
import { IconBrain } from '../ui/Icons';

interface SentenceBuilderProps {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
  script?: 'latin' | 'cyrillic';
}

function normalizeForCheck(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.!?,;:'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function SentenceBuilder({ exercise, onAnswer, script = 'latin' }: SentenceBuilderProps) {
  const [placed, setPlaced] = useState<string[]>([]);
  const [available, setAvailable] = useState<string[]>(exercise.tiles ?? []);
  const [result, setResult] = useState<{ correct: boolean } | null>(null);

  const handleTileClick = (word: string, index: number) => {
    if (result !== null) return;
    setPlaced([...placed, word]);
    setAvailable(available.filter((_, i) => i !== index));
  };

  const handleRemoveTile = (index: number) => {
    if (result !== null) return;
    const word = placed[index];
    setAvailable([...available, word]);
    setPlaced(placed.filter((_, i) => i !== index));
  };

  const handleCheck = () => {
    const userAnswer = normalizeForCheck(placed.join(' '));
    const accepted = exercise.acceptedAnswers ?? [exercise.correctAnswer];
    const isCorrect = accepted.some(
      (ans) => normalizeForCheck(ans) === userAnswer
    );

    // Also accept if the placed tiles exactly match the target word
    // sequence — same length and same order. Any extra or distractor
    // tile placed makes the length differ, so it counts as wrong.
    const correctWords = normalizeForCheck(exercise.correctAnswer).split(' ');
    const userWords = userAnswer.split(' ');
    const isSubsequenceMatch =
      correctWords.length === userWords.length &&
      correctWords.every((w, i) => w === userWords[i]);

    const correct = isCorrect || isSubsequenceMatch;
    setResult({ correct });
  };

  const handleContinue = () => {
    if (!result) return;
    onAnswer(result.correct);
  };

  const dropBg =
    result === null ? T.surface : result.correct ? T.greenDim : T.redDim;
  const dropBorder =
    result === null
      ? T.border
      : result.correct
        ? 'rgba(34,197,94,0.4)'
        : 'rgba(239,68,68,0.4)';

  const tilePlacedStyle = {
    padding: '10px 14px',
    borderRadius: T.r2,
    background: T.surfaceHi,
    border: `1px solid ${T.borderHi}`,
    color: T.text,
    fontFamily: T.serif,
    fontSize: 16,
    fontWeight: 500,
    boxShadow: T.shadow1,
    cursor: 'grab',
  } as const;

  const tileAvailableStyle = {
    padding: '10px 14px',
    borderRadius: T.r2,
    background: T.surface,
    border: `1px solid ${T.border}`,
    color: T.text,
    fontFamily: T.serif,
    fontSize: 16,
    fontWeight: 500,
    cursor: 'pointer',
  } as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <AutoplayAudio text={result ? exercise.phrase.sr_latin : undefined} />
      {/* Situational prompt */}
      <div>
        <div style={{ ...metaLabel, color: T.amber }}>SITUATION</div>
        <div
          style={{
            fontSize: 19,
            fontWeight: 600,
            letterSpacing: -0.3,
            lineHeight: 1.35,
            color: T.text,
            marginTop: 8,
          }}
        >
          {exercise.situationalPrompt ?? exercise.prompt}
        </div>
        <div
          style={{
            fontSize: 13,
            color: T.dim,
            marginTop: 10,
            fontFamily: T.mono,
          }}
        >
          Build the Serbian response with the tiles below:
        </div>
      </div>

      {/* Answer area */}
      <div
        className={
          result?.correct === false
            ? 'anim-shake'
            : result?.correct === true
              ? 'anim-pop'
              : undefined
        }
        style={{
          padding: '14px 14px',
          borderRadius: T.r3,
          background: dropBg,
          border: `1px solid ${dropBorder}`,
          minHeight: 96,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignContent: 'flex-start',
          transition: `all ${T.fast} ${T.ease}`,
        }}
      >
        {placed.length === 0 && (
          <span style={{ color: T.mute, fontSize: 13, fontFamily: T.mono }}>
            Tap words to build your response…
          </span>
        )}
        {placed.map((word, i) => (
          <button
            key={`placed-${i}`}
            onClick={() => handleRemoveTile(i)}
            disabled={result !== null}
            style={tilePlacedStyle as React.CSSProperties}
          >
            {word}
          </button>
        ))}
      </div>

      {/* Available tiles */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          paddingTop: 14,
          borderTop: `0.5px solid ${T.border}`,
        }}
      >
        {available.map((word, i) => (
          <button
            key={`avail-${i}`}
            onClick={() => handleTileClick(word, i)}
            disabled={result !== null}
            style={tileAvailableStyle as React.CSSProperties}
          >
            {word}
          </button>
        ))}
        {available.length === 0 && (
          <span style={{ color: T.mute, fontSize: 12, fontFamily: T.mono }}>
            all tiles placed
          </span>
        )}
      </div>

      {/* Check button */}
      {result === null && placed.length > 0 && (
        <Btn kind="primary" size="lg" full onClick={handleCheck}>
          Check
        </Btn>
      )}

      {/* Correct feedback */}
      {result?.correct && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 15, color: T.green, textAlign: 'center', fontWeight: 600 }}>
            Svaka čast ✓
          </div>
          <Card pad={14}>
            <div style={{ ...metaLabel, marginBottom: 8 }}>FULL PHRASE</div>
            <DualScript
              srLatin={exercise.phrase.sr_latin}
              srCyrillic={exercise.phrase.sr_cyrillic}
              script={script}
              size="lg"
            />
            <div style={{ fontSize: 13, color: T.dim, marginTop: 8, fontFamily: T.mono }}>
              {exercise.phrase.en}
            </div>
            <GlossHint hint={exercise.phrase.gloss_hint} />
          </Card>
        </div>
      )}

      {/* Incorrect feedback */}
      {result && !result.correct && (
        <Card pad={14}>
          <div style={{ ...metaLabel, marginBottom: 8 }}>THE RIGHT RESPONSE</div>
          <DualScript
            srLatin={exercise.phrase.sr_latin}
            srCyrillic={exercise.phrase.sr_cyrillic}
            script={script}
            size="lg"
          />
          <div style={{ fontSize: 13, color: T.dim, marginTop: 8, fontFamily: T.mono }}>
            {exercise.phrase.en}
          </div>
          <GlossHint hint={exercise.phrase.gloss_hint} />
        </Card>
      )}

      {/* Grammar note */}
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
