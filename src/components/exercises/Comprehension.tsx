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

interface ComprehensionProps {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
  script?: 'latin' | 'cyrillic';
}

/**
 * Strip a `Speaker: "..."` prefix and surrounding quotes so AutoplayAudio
 * gets just the spoken Serbian. Falls through unchanged when the line
 * has no quotes.
 */
function extractSpoken(line: string): string {
  const quoteMatch = line.match(/[“"„](.+?)["”“]/);
  if (quoteMatch) return quoteMatch[1];
  // Fallback: drop leading "Speaker: " if present.
  const colonIdx = line.indexOf(':');
  if (colonIdx > 0 && colonIdx < 24) {
    return line.slice(colonIdx + 1).trim();
  }
  return line;
}

export default function Comprehension({ exercise, onAnswer }: ComprehensionProps) {
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
      {exercise.dialogue?.map((line, i) => (
        <AutoplayAudio
          key={i}
          text={extractSpoken(line)}
          delayMs={i * 700}
        />
      ))}
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

      {/* Question */}
      <Card warm pad={14}>
        <div style={{ ...metaLabel, color: T.amber, marginBottom: 6 }}>PITANJE</div>
        <div
          className="font-serif-sr"
          style={{
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: -0.2,
            color: T.text,
            lineHeight: 1.4,
          }}
        >
          {exercise.question}
        </div>
      </Card>

      {/* Options */}
      <MCOptionList
        options={exercise.options ?? []}
        correctAnswer={exercise.correctAnswer}
        selected={selected}
        revealed={!!result}
        onSelect={handleSelect}
        serifOptions
      />

      {result?.correct && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, color: T.green, fontWeight: 600 }}>
            Odlično ✓
          </div>
          <GlossHint hint={exercise.phrase.gloss_hint} />
        </div>
      )}

      {result && !result.correct && (
        <Card pad={14}>
          <div style={{ ...metaLabel, marginBottom: 6 }}>TAČAN ODGOVOR</div>
          <div
            className="font-serif-sr"
            style={{ fontSize: 18, color: T.green, fontWeight: 500 }}
          >
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
