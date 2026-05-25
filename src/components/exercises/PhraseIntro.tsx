import { useState, useCallback } from 'react';
import type { Phrase } from '../../store/types';

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
      setCardState(s => ({ ...s, step: nextStep, revealed: false }));
      if (nextStep === 'echo') {
        setEchoInput('');
        setEchoSubmitted(false);
      }
      if (nextStep === 'check') {
        setCheckAnswer(null);
      }
    }
  }, [cardState, phrases.length]);

  if (seenAll) {
    return (
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <span className="text-5xl">✨</span>
        <h2 className="text-xl font-bold text-white">
          {script === 'cyrillic' ? 'Спремни за вежбу!' : 'Spremni za vežbu!'}
        </h2>
        <p className="text-sm text-gray-400">
          You've studied {phrases.length} new phrases. Time to practice!
        </p>
        <button
          onClick={onComplete}
          className="rounded-xl bg-amber-500 px-8 py-3 font-semibold text-navy-900"
        >
          {script === 'cyrillic' ? 'Почни вежбање' : 'Počni vežbanje'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {script === 'cyrillic' ? 'Нове речи' : 'Nove reči'} — {cardState.phraseIndex + 1}/{phrases.length}
        </span>
        <div className="flex gap-1">
          {phrases.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                i < cardState.phraseIndex
                  ? 'bg-amber-500'
                  : i === cardState.phraseIndex
                    ? 'bg-amber-500/50'
                    : 'bg-navy-700'
              }`}
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
          script={script}
          onReveal={() => setCardState(s => ({ ...s, revealed: true }))}
          onNext={advanceStep}
        />
      )}

      {cardState.step === 'breakdown' && (
        <BreakdownStep
          srText={srText}
          words={words}
          phrase={phrase}
          script={script}
          onNext={advanceStep}
        />
      )}

      {cardState.step === 'context' && (
        <ContextStep
          srText={srText}
          phrase={phrase}
          script={script}
          onNext={advanceStep}
        />
      )}

      {cardState.step === 'echo' && (
        <EchoStep
          srText={srText}
          phrase={phrase}
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
          script={script}
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
  script,
  onReveal,
  onNext,
}: {
  srText: string;
  altScript: string;
  phrase: Phrase;
  revealed: boolean;
  script: 'latin' | 'cyrillic';
  onReveal: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-navy-600 bg-navy-800/40 p-6 text-center">
        <p className="text-3xl font-bold text-white leading-relaxed tracking-wide mb-2">
          {srText}
        </p>
        <p className="text-sm text-gray-600 mb-4">{altScript}</p>

        {!revealed ? (
          <button
            onClick={onReveal}
            className="rounded-lg bg-navy-700 border border-navy-600 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            {script === 'cyrillic' ? 'Покажи значење' : 'Pokaži značenje'}
          </button>
        ) : (
          <div className="space-y-2 border-t border-navy-700 pt-4 mt-2">
            <p className="text-lg text-amber-400">{phrase.en}</p>
            {phrase.context && (
              <p className="text-sm text-gray-500 italic">{phrase.context}</p>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-600 text-center">
        Read the Serbian aloud. Let the sounds become familiar before checking the meaning.
      </p>

      {revealed && (
        <button onClick={onNext} className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-navy-900">
          {script === 'cyrillic' ? 'Даље' : 'Dalje'}
        </button>
      )}
    </div>
  );
}

function BreakdownStep({
  srText,
  words,
  phrase,
  script,
  onNext,
}: {
  srText: string;
  words: string[];
  phrase: Phrase;
  script: 'latin' | 'cyrillic';
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-navy-600 bg-navy-800/40 p-6">
        <p className="text-sm text-gray-400 mb-4">
          {script === 'cyrillic' ? 'Реч по реч:' : 'Reč po reč:'}
        </p>
        <div className="flex flex-wrap gap-3 justify-center mb-4">
          {words.map((word, i) => (
            <span
              key={i}
              className="text-lg font-semibold text-white bg-navy-700 rounded-lg px-3 py-1.5"
            >
              {word}
            </span>
          ))}
        </div>
        <div className="border-t border-navy-700 pt-4 mt-2">
          <p className="text-xl text-white text-center mb-1">{srText}</p>
          <p className="text-sm text-amber-400 text-center">{phrase.en}</p>
        </div>
      </div>

      {phrase.notes && (
        <div className="rounded-xl bg-navy-800/50 border border-navy-700 px-4 py-2">
          <p className="text-xs text-amber-400">{phrase.notes}</p>
        </div>
      )}

      <button onClick={onNext} className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-navy-900">
        {script === 'cyrillic' ? 'Даље' : 'Dalje'}
      </button>
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
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-navy-600 bg-navy-800/40 p-6">
        {phrase.context && (
          <p className="text-sm text-gray-400 mb-3">{phrase.context}</p>
        )}
        <div className="bg-navy-900/50 rounded-xl p-4 border-l-2 border-amber-500">
          <p className="text-lg text-white mb-1">{srText}</p>
          <p className="text-sm text-gray-500">{phrase.en}</p>
        </div>

        {phrase.variations && phrase.variations.length > 0 && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-gray-500">
              {script === 'cyrillic' ? 'Варијације:' : 'Varijacije:'}
            </p>
            {phrase.variations.map((v, i) => (
              <div key={i} className="bg-navy-900/30 rounded-lg p-3">
                <p className="text-sm text-white">
                  {script === 'cyrillic' ? v.sr_cyrillic : v.sr_latin}
                </p>
                <p className="text-xs text-gray-500">{v.en}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={onNext} className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-navy-900">
        {script === 'cyrillic' ? 'Покушај да напишеш' : 'Pokušaj da napišeš'}
      </button>
    </div>
  );
}

function EchoStep({
  srText,
  phrase,
  input,
  submitted,
  script,
  onInputChange,
  onSubmit,
  onNext,
}: {
  srText: string;
  phrase: Phrase;
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
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-navy-600 bg-navy-800/40 p-6 text-center">
        <p className="text-sm text-gray-400 mb-2">
          {script === 'cyrillic' ? 'Напиши ову реченицу:' : 'Napiši ovu rečenicu:'}
        </p>
        <p className="text-sm text-amber-400 mb-3">{phrase.en}</p>
        {submitted && (
          <p className="text-lg text-white font-semibold">{srText}</p>
        )}
      </div>

      <form onSubmit={handleFormSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          disabled={submitted}
          placeholder={script === 'cyrillic' ? 'Напиши на српском...' : 'Napiši na srpskom...'}
          autoFocus
          className={`w-full rounded-xl border-2 bg-navy-800/50 p-4 text-lg text-white placeholder-gray-600 outline-none transition-colors ${
            submitted ? 'border-amber-500/50' : 'border-navy-600 focus:border-amber-500'
          }`}
        />

        {!submitted && (
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-xl bg-navy-700 border border-navy-600 px-6 py-3 text-sm text-gray-300 transition-opacity disabled:opacity-40"
          >
            {script === 'cyrillic' ? 'Провери' : 'Proveri'}
          </button>
        )}
      </form>

      {submitted && (
        <div className="rounded-xl bg-navy-800/50 p-4">
          <p className="text-xs text-gray-400 mb-1">
            {script === 'cyrillic' ? 'Тачан одговор:' : 'Tačan odgovor:'}
          </p>
          <p className="text-lg text-white">{srText}</p>
          <p className="text-xs text-gray-500 mt-2">
            This is just practice — no scoring here. The goal is to get your fingers used to typing Serbian.
          </p>
        </div>
      )}

      {submitted && (
        <button onClick={onNext} className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-navy-900">
          {script === 'cyrillic' ? 'Провери се' : 'Proveri se'}
        </button>
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
  script,
  onNext,
}: {
  phrase: Phrase;
  srText: string;
  checkAnswer: string | null;
  onSelect: (a: string) => void;
  allPhrases: Phrase[];
  script: 'latin' | 'cyrillic';
  onNext: () => void;
}) {
  const [options] = useState(() => {
    const distractors = allPhrases
      .filter(p => p.id !== phrase.id)
      .map(p => p.en)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);
    return [phrase.en, ...distractors].sort(() => Math.random() - 0.5);
  });

  const answered = checkAnswer !== null;
  const correct = checkAnswer === phrase.en;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-navy-600 bg-navy-800/40 p-6 text-center">
        <p className="text-sm text-gray-400 mb-2">
          {script === 'cyrillic' ? 'Да ли се сећаш?' : 'Da li se sećaš?'}
        </p>
        <p className="text-2xl font-bold text-white">{srText}</p>
      </div>

      <div className="flex flex-col gap-2">
        {options.map((opt, i) => {
          let style = 'border-navy-600 hover:border-amber-500/50';
          if (answered) {
            if (opt === phrase.en) style = 'border-correct bg-correct/10';
            else if (opt === checkAnswer) style = 'border-incorrect bg-incorrect/10';
            else style = 'border-navy-700 opacity-50';
          }
          return (
            <button
              key={i}
              onClick={() => !answered && onSelect(opt)}
              disabled={answered}
              className={`w-full rounded-xl border-2 p-3 text-left text-white transition-all text-sm ${style}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="text-center">
          <p className={`text-sm font-semibold mb-3 ${correct ? 'text-correct' : 'text-incorrect'}`}>
            {correct
              ? (script === 'cyrillic' ? 'Тачно! ✓' : 'Tačno! ✓')
              : (script === 'cyrillic' ? 'Није тачно — запамти ово' : 'Nije tačno — zapamti ovo')}
          </p>
          {!correct && (
            <div className="rounded-xl bg-navy-800/50 p-3 mb-3">
              <p className="text-sm text-white">{srText}</p>
              <p className="text-xs text-amber-400">{phrase.en}</p>
            </div>
          )}
          <button onClick={onNext} className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-navy-900">
            {script === 'cyrillic' ? 'Даље' : 'Dalje'}
          </button>
        </div>
      )}
    </div>
  );
}
