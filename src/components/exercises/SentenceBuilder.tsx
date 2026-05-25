import { useState } from 'react';
import type { Exercise } from '../../store/types';
import Btn from '../ui/Btn';
import Card from '../ui/Card';
import { T, metaLabel } from '../../lib/tokens';

interface SentenceBuilderProps {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
}

function normalizeForCheck(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.!?,;:'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function SentenceBuilder({ exercise, onAnswer }: SentenceBuilderProps) {
  const [placed, setPlaced] = useState<string[]>([]);
  const [available, setAvailable] = useState<string[]>(exercise.tiles ?? []);
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);

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

    // Also accept if the user placed all the correct words in the right
    // relative order (ignoring distractor words they didn't pick)
    const correctWords = normalizeForCheck(exercise.correctAnswer).split(' ');
    const userWords = userAnswer.split(' ');
    const isSubsequenceMatch =
      correctWords.length === userWords.length &&
      correctWords.every((w, i) => w === userWords[i]);

    const correct = isCorrect || isSubsequenceMatch;
    setResult(correct ? 'correct' : 'incorrect');
    setTimeout(() => onAnswer(correct), 2000);
  };

  const dropBg =
    result === null ? T.surface : result === 'correct' ? T.greenDim : T.redDim;
  const dropBorder =
    result === null
      ? T.border
      : result === 'correct'
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
          result === 'incorrect'
            ? 'anim-shake'
            : result === 'correct'
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
      {result === 'correct' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 15, color: T.green, textAlign: 'center', fontWeight: 600 }}>
            Svaka čast ✓
          </div>
          <Card pad={14}>
            <div style={{ ...metaLabel, marginBottom: 6 }}>FULL PHRASE</div>
            <div
              className="font-serif-sr"
              style={{ fontSize: 17, color: T.text, fontWeight: 500, letterSpacing: -0.2 }}
            >
              {exercise.phrase.sr_latin}
            </div>
            <div style={{ fontSize: 13, color: T.dim, marginTop: 6, fontFamily: T.mono }}>
              {exercise.phrase.en}
            </div>
            {exercise.phrase.notes && (
              <div
                style={{
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: `0.5px solid ${T.border}`,
                }}
              >
                <div style={{ ...metaLabel, color: T.purple, marginBottom: 4 }}>NOTE</div>
                <div style={{ fontSize: 12, color: T.text, lineHeight: 1.55 }}>
                  {exercise.phrase.notes}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Incorrect feedback */}
      {result === 'incorrect' && (
        <Card pad={14}>
          <div style={{ ...metaLabel, marginBottom: 6 }}>THE RIGHT RESPONSE</div>
          <div
            className="font-serif-sr"
            style={{ fontSize: 18, color: T.green, fontWeight: 500, letterSpacing: -0.2 }}
          >
            {exercise.correctAnswer}
          </div>
          <div style={{ fontSize: 13, color: T.dim, marginTop: 6, fontFamily: T.mono }}>
            {exercise.phrase.en}
          </div>
          {exercise.phrase.notes && (
            <div
              style={{
                marginTop: 10,
                paddingTop: 10,
                borderTop: `0.5px solid ${T.border}`,
              }}
            >
              <div style={{ ...metaLabel, color: T.purple, marginBottom: 4 }}>NOTE</div>
              <div style={{ fontSize: 12, color: T.text, lineHeight: 1.55 }}>
                {exercise.phrase.notes}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
