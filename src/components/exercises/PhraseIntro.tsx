import { useState, useCallback } from 'react';
import type { Phrase } from '../../store/types';
import Card from '../ui/Card';
import Btn from '../ui/Btn';
import MonoBadge from '../ui/MonoBadge';
import { T, metaLabel } from '../../lib/tokens';
import { IconBrain, IconAudio } from '../ui/Icons';

interface PhraseIntroProps {
  phrases: Phrase[];
  script: 'latin' | 'cyrillic';
  onComplete: () => void;
}

type IntroStep = 'present' | 'breakdown' | 'context' | 'echo' | 'check';

interface CardState {
  phraseIndex: number;
  step: IntroStep;
  revealed: boolean;
}

export default function PhraseIntro({ phrases, script, onComplete }: PhraseIntroProps) {
  const [cardState, setCardState] = useState<CardState>({
    phraseIndex: 0,
    step: 'present',
    revealed: false,
  });
  const [seenAll, setSeenAll] = useState(false);
  const [checkAnswer, setCheckAnswer] = useState<string | null>(null);
  const [echoInput, setEchoInput] = useState('');
  const [echoSubmitted, setEchoSubmitted] = useState(false);

  const phrase = phrases[cardState.phraseIndex];
  if (!phrase) return null;

  const srText = script === 'cyrillic' ? phrase.sr_cyrillic : phrase.sr_latin;
  const altScript = script === 'cyrillic' ? phrase.sr_latin : phrase.sr_cyrillic;
  const words = phrase.sr_latin.replace(/[.!?,;:'"]/g, '').split(/\s+/);

  const advanceStep = useCallback(() => {
    const steps: IntroStep[] = ['present', 'breakdown', 'context', 'echo', 'check'];
    const currentIdx = steps.indexOf(cardState.step);
    const nextStep = steps[currentIdx + 1];

    if (!nextStep) {
      const nextPhrase = cardState.phraseIndex + 1;
      if (nextPhrase >= phrases.length) {
        setSeenAll(true);
      } else {
        setCardState({ phraseIndex: nextPhrase, step: 'present', revealed: false });
        setCheckAnswer(null);
        setEchoInput('');
        setEchoSubmitted(false);
      }
    } else {
      setCardState((s) => ({ ...s, step: nextStep, revealed: false }));
      if (nextStep === 'echo') {
        setEchoInput('');
        setEchoSubmitted(false);
      }
      if (nextStep === 'check') setCheckAnswer(null);
    }
  }, [cardState, phrases.length]);

  if (seenAll) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '32px 0', textAlign: 'center' }}>
        <span style={{ fontSize: 48 }}>✨</span>
        <h2 className="font-serif-sr" style={{ fontSize: 28, fontWeight: 500, color: T.text }}>
          {script === 'cyrillic' ? 'Спремни за вежбу' : 'Spremni za vežbu'}
        </h2>
        <p style={{ fontSize: 13, color: T.dim }}>
          You've met {phrases.length} new phrases. Time to drill.
        </p>
        <Btn kind="primary" size="lg" onClick={onComplete}>
          Start practice
        </Btn>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={metaLabel}>
          NEW PHRASE · {cardState.phraseIndex + 1} OF {phrases.length}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {phrases.map((_, i) => (
            <div
              key={i}
              style={{
                height: 4,
                width: 22,
                borderRadius: 2,
                background:
                  i < cardState.phraseIndex
                    ? T.amber
                    : i === cardState.phraseIndex
                      ? 'rgba(255,193,7,0.5)'
                      : T.border,
                transition: `background ${T.fast} ${T.ease}`,
              }}
            />
          ))}
        </div>
      </div>

      {cardState.step === 'present' && (
        <PresentStep
          srText={srText}
          altScript={altScript}
          phrase={phrase}
          revealed={cardState.revealed}
          onReveal={() => setCardState((s) => ({ ...s, revealed: true }))}
          onNext={advanceStep}
        />
      )}
      {cardState.step === 'breakdown' && (
        <BreakdownStep srText={srText} words={words} phrase={phrase} onNext={advanceStep} />
      )}
      {cardState.step === 'context' && (
        <ContextStep srText={srText} phrase={phrase} script={script} onNext={advanceStep} />
      )}
      {cardState.step === 'echo' && (
        <EchoStep
          srText={srText}
          input={echoInput}
          submitted={echoSubmitted}
          script={script}
          onInputChange={setEchoInput}
          onSubmit={() => setEchoSubmitted(true)}
          onNext={advanceStep}
        />
      )}
      {cardState.step === 'check' && (
        <QuickRecall
          phrase={phrase}
          srText={srText}
          checkAnswer={checkAnswer}
          onSelect={setCheckAnswer}
          allPhrases={phrases}
          onNext={advanceStep}
        />
      )}
    </div>
  );
}

function PresentStep({
  srText,
  altScript,
  phrase,
  revealed,
  onReveal,
  onNext,
}: {
  srText: string;
  altScript: string;
  phrase: Phrase;
  revealed: boolean;
  onReveal: () => void;
  onNext: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        className="font-serif-sr"
        style={{
          fontSize: 38,
          fontWeight: 500,
          letterSpacing: -0.6,
          marginTop: 6,
          lineHeight: 1.1,
          color: T.text,
        }}
      >
        {srText}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button
          style={{
            background: T.surfaceHi,
            border: `1px solid ${T.border}`,
            borderRadius: T.rPill,
            padding: '6px 12px',
            color: T.mute,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontFamily: T.mono,
            cursor: 'not-allowed',
          }}
          disabled
          aria-label="Pronunciation (audio coming soon)"
        >
          <IconAudio size={12} /> {altScript}
        </button>
      </div>

      {!revealed ? (
        <Btn kind="secondary" size="md" onClick={onReveal}>
          Reveal meaning
        </Btn>
      ) : (
        <>
          <div style={{ fontSize: 18, color: T.amber, fontWeight: 500 }}>{phrase.en}</div>
          {phrase.context && (
            <div
              className="font-serif-sr"
              style={{ fontStyle: 'italic', fontSize: 13, color: T.dim, lineHeight: 1.55 }}
            >
              {phrase.context}
            </div>
          )}
          {phrase.notes && (
            <Card pad={14}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MonoBadge kind="purple">
                  <IconBrain size={11} /> NOTE
                </MonoBadge>
              </div>
              <div style={{ fontSize: 13, color: T.text, marginTop: 10, lineHeight: 1.55 }}>
                {phrase.notes}
              </div>
            </Card>
          )}
          <Btn kind="primary" size="lg" full onClick={onNext}>
            Got it
          </Btn>
        </>
      )}
    </div>
  );
}

function BreakdownStep({
  srText,
  words,
  phrase,
  onNext,
}: {
  srText: string;
  words: string[];
  phrase: Phrase;
  onNext: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={metaLabel}>WORD BY WORD</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {words.map((word, i) => (
          <span
            key={i}
            className="font-serif-sr"
            style={{
              padding: '8px 12px',
              borderRadius: T.r2,
              background: T.surface,
              border: `1px solid ${T.border}`,
              fontSize: 16,
              fontWeight: 500,
              color: T.text,
            }}
          >
            {word}
          </span>
        ))}
      </div>
      <Card pad={14}>
        <div className="font-serif-sr" style={{ fontSize: 20, fontWeight: 500, color: T.text }}>
          {srText}
        </div>
        <div style={{ fontSize: 13, color: T.amber, marginTop: 6 }}>{phrase.en}</div>
      </Card>
      {phrase.notes && (
        <Card pad={12}>
          <MonoBadge kind="purple">
            <IconBrain size={11} /> NOTE
          </MonoBadge>
          <div style={{ fontSize: 12, color: T.text, marginTop: 8, lineHeight: 1.55 }}>
            {phrase.notes}
          </div>
        </Card>
      )}
      <Btn kind="primary" size="lg" full onClick={onNext}>
        Continue
      </Btn>
    </div>
  );
}

function ContextStep({
  srText,
  phrase,
  script,
  onNext,
}: {
  srText: string;
  phrase: Phrase;
  script: 'latin' | 'cyrillic';
  onNext: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {phrase.context && (
        <div className="font-serif-sr" style={{ fontStyle: 'italic', fontSize: 13, color: T.dim, lineHeight: 1.6 }}>
          {phrase.context}
        </div>
      )}
      <Card warm pad={16} style={{ borderLeft: `3px solid ${T.amber}` }}>
        <div className="font-serif-sr" style={{ fontSize: 22, fontWeight: 500, color: T.text }}>
          {srText}
        </div>
        <div style={{ fontSize: 13, color: T.dim, marginTop: 6 }}>{phrase.en}</div>
      </Card>

      {phrase.variations && phrase.variations.length > 0 && (
        <div>
          <div style={metaLabel}>VARIATIONS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {phrase.variations.map((v, i) => (
              <div
                key={i}
                style={{
                  padding: '8px 12px',
                  borderRadius: T.rPill,
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                }}
              >
                <span className="font-serif-sr" style={{ fontSize: 13, color: T.text }}>
                  {script === 'cyrillic' ? v.sr_cyrillic : v.sr_latin}
                </span>
                <span style={{ fontSize: 11, color: T.dim }}>{v.en}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Btn kind="primary" size="lg" full onClick={onNext}>
        Type it out
      </Btn>
    </div>
  );
}

function EchoStep({
  srText,
  input,
  submitted,
  script,
  onInputChange,
  onSubmit,
  onNext,
}: {
  srText: string;
  input: string;
  submitted: boolean;
  script: 'latin' | 'cyrillic';
  onInputChange: (v: string) => void;
  onSubmit: () => void;
  onNext: () => void;
}) {
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSubmit();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={metaLabel}>TYPE WHAT YOU JUST SAW</div>
      <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          disabled={submitted}
          placeholder={script === 'cyrillic' ? 'Напиши на српском…' : 'Napiši na srpskom…'}
          autoFocus
          className="font-serif-sr"
          style={{
            width: '100%',
            padding: '16px 18px',
            borderRadius: T.r3,
            background: T.surface,
            border: `1px solid ${submitted ? T.borderHi : T.borderWarm}`,
            color: T.text,
            fontSize: 22,
            outline: 'none',
            transition: `all ${T.fast} ${T.ease}`,
          }}
        />
        {!submitted && (
          <Btn type="submit" kind="primary" size="md" disabled={!input.trim()}>
            Check
          </Btn>
        )}
      </form>

      {submitted && (
        <Card pad={14}>
          <div style={metaLabel}>CORRECT</div>
          <div className="font-serif-sr" style={{ fontSize: 18, fontWeight: 500, color: T.text, marginTop: 6 }}>
            {srText}
          </div>
          <div style={{ fontSize: 11, color: T.mute, marginTop: 8 }}>
            No score here — just to wake up your fingers.
          </div>
        </Card>
      )}

      {submitted && (
        <Btn kind="primary" size="lg" full onClick={onNext}>
          Quick check
        </Btn>
      )}
    </div>
  );
}

function QuickRecall({
  phrase,
  srText,
  checkAnswer,
  onSelect,
  allPhrases,
  onNext,
}: {
  phrase: Phrase;
  srText: string;
  checkAnswer: string | null;
  onSelect: (a: string) => void;
  allPhrases: Phrase[];
  onNext: () => void;
}) {
  const [options] = useState(() => {
    const distractors = allPhrases
      .filter((p) => p.id !== phrase.id)
      .map((p) => p.en)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);
    return [phrase.en, ...distractors].sort(() => Math.random() - 0.5);
  });

  const answered = checkAnswer !== null;
  const correct = checkAnswer === phrase.en;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={metaLabel}>QUICK CHECK · WHAT DOES THIS MEAN?</div>
      <div className="font-serif-sr" style={{ fontSize: 28, fontWeight: 500, color: T.text, letterSpacing: -0.4 }}>
        {srText}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map((opt, i) => {
          const isCorrect = opt === phrase.en;
          const isSelected = opt === checkAnswer;

          let bg: string = T.surface;
          let border: string = T.border;
          let opacity = 1;
          if (answered) {
            if (isCorrect) {
              bg = T.greenDim;
              border = 'rgba(34,197,94,0.4)';
            } else if (isSelected) {
              bg = T.redDim;
              border = 'rgba(239,68,68,0.4)';
            } else {
              opacity = 0.45;
            }
          }

          return (
            <button
              key={i}
              onClick={() => !answered && onSelect(opt)}
              disabled={answered}
              style={{
                padding: '12px 16px',
                borderRadius: T.r3,
                background: bg,
                border: `1px solid ${border}`,
                color: T.text,
                fontSize: 14,
                fontWeight: 500,
                textAlign: 'left',
                cursor: answered ? 'default' : 'pointer',
                opacity,
                transition: `all ${T.fast} ${T.ease}`,
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {answered && (
        <>
          <div style={{ fontSize: 13, color: correct ? T.green : T.red, fontWeight: 600, textAlign: 'center' }}>
            {correct ? 'Tačno ✓' : 'Not quite — remember this one.'}
          </div>
          <Btn kind="primary" size="lg" full onClick={onNext}>
            Next
          </Btn>
        </>
      )}
    </div>
  );
}
