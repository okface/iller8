import { useState, useCallback } from 'react';
import type { Phrase } from '../../store/types';

interface PhraseIntroProps {
  phrases: Phrase[];
  script: 'latin' | 'cyrillic';
  onComplete: () => void;
}

interface CardState {
  phraseIndex: number;
  step: 'present' | 'breakdown' | 'context' | 'check';
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

  const phrase = phrases[cardState.phraseIndex];
  if (!phrase) return null;

  const srText = script === 'cyrillic' ? phrase.sr_cyrillic : phrase.sr_latin;
  const words = (phrase.sr_latin).replace(/[.!?,;:'"]/g, '').split(/\s+/);

  const handleNext = useCallback(() => {
    if (cardState.step === 'present') {
      setCardState(s => ({ ...s, step: 'breakdown', revealed: false }));
    } else if (cardState.step === 'breakdown') {
      setCardState(s => ({ ...s, step: 'context', revealed: false }));
    } else if (cardState.step === 'context') {
      setCardState(s => ({ ...s, step: 'check', revealed: false }));
      setCheckAnswer(null);
    } else if (cardState.step === 'check') {
      const nextIdx = cardState.phraseIndex + 1;
      if (nextIdx >= phrases.length) {
        setSeenAll(true);
      } else {
        setCardState({ phraseIndex: nextIdx, step: 'present', revealed: false });
        setCheckAnswer(null);
      }
    }
  }, [cardState, phrases.length]);

  if (seenAll) {
    return (
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <span className="text-5xl">✨</span>
        <h2 className="text-xl font-bold text-white">
          {script === 'cyrillic' ? 'Речи научене!' : 'Reči naučene!'}
        </h2>
        <p className="text-gray-400">
          You've seen all {phrases.length} phrases. Now let's practice!
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
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-navy-600 bg-navy-800/40 p-6 text-center">
            <p className="text-3xl font-bold text-white leading-relaxed tracking-wide mb-4">
              {srText}
            </p>
            {!cardState.revealed ? (
              <button
                onClick={() => setCardState(s => ({ ...s, revealed: true }))}
                className="rounded-lg bg-navy-700 border border-navy-600 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                {script === 'cyrillic' ? 'Покажи значење' : 'Pokaži značenje'}
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-lg text-amber-400">{phrase.en}</p>
                {phrase.context && (
                  <p className="text-sm text-gray-500 italic">{phrase.context}</p>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-600 text-center">
            Read the Serbian first. Try to feel the phrase before revealing the meaning.
          </p>
          {cardState.revealed && (
            <button onClick={handleNext} className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-navy-900">
              {script === 'cyrillic' ? 'Даље' : 'Dalje'}
            </button>
          )}
        </div>
      )}

      {cardState.step === 'breakdown' && (
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-navy-600 bg-navy-800/40 p-6">
            <p className="text-sm text-gray-400 mb-4">
              Word by word:
            </p>
            <div className="flex flex-wrap gap-3 justify-center mb-4">
              {words.map((word, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-lg font-semibold text-white bg-navy-700 rounded-lg px-3 py-1.5">
                    {word}
                  </span>
                </div>
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
          <button onClick={handleNext} className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-navy-900">
            {script === 'cyrillic' ? 'Даље' : 'Dalje'}
          </button>
        </div>
      )}

      {cardState.step === 'context' && (
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-navy-600 bg-navy-800/40 p-6">
            <p className="text-sm text-gray-400 mb-3">
              {phrase.context || 'How you might use this:'}
            </p>
            <div className="bg-navy-900/50 rounded-xl p-4 border-l-2 border-amber-500">
              <p className="text-lg text-white mb-1">{srText}</p>
              <p className="text-sm text-gray-500">{phrase.en}</p>
            </div>
            {phrase.variations && phrase.variations.length > 0 && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-gray-500">Variations:</p>
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
          <button onClick={handleNext} className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-navy-900">
            {script === 'cyrillic' ? 'Провери се' : 'Proveri se'}
          </button>
        </div>
      )}

      {cardState.step === 'check' && (
        <QuickRecall
          phrase={phrase}
          srText={srText}
          checkAnswer={checkAnswer}
          onSelect={setCheckAnswer}
          allPhrases={phrases}
          script={script}
          onNext={handleNext}
        />
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
  const options = useState(() => {
    const distractors = allPhrases
      .filter(p => p.id !== phrase.id)
      .map(p => p.en)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);
    return [phrase.en, ...distractors].sort(() => Math.random() - 0.5);
  })[0];

  const answered = checkAnswer !== null;
  const correct = checkAnswer === phrase.en;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-navy-600 bg-navy-800/40 p-6 text-center">
        <p className="text-sm text-gray-400 mb-2">Quick check — do you remember?</p>
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
              ? (script === 'cyrillic' ? 'Тачно!' : 'Tačno!')
              : (script === 'cyrillic' ? 'Није тачно' : 'Nije tačno')}
          </p>
          <button onClick={onNext} className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-navy-900">
            {script === 'cyrillic' ? 'Даље' : 'Dalje'}
          </button>
        </div>
      )}
    </div>
  );
}
