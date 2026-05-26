import { useState } from 'react';
import type { Phrase, UserProgress } from '../../store/types';
import Card from '../ui/Card';
import Btn from '../ui/Btn';
import MonoBadge from '../ui/MonoBadge';
import DualScript from '../ui/DualScript';
import WordChips from '../ui/WordChips';
import { normalizeWordRefs } from '../../data/words';
import { T, metaLabel } from '../../lib/tokens';
import { IconBrain } from '../ui/Icons';

interface PhraseIntroProps {
  phrases: Phrase[];
  script: 'latin' | 'cyrillic';
  onComplete: () => void;
  /** Optional — when passed, word chips colour-code by SRS bucket. */
  progress?: UserProgress;
}

/**
 * Slimmed-down intro: one screen per phrase, just present + reveal.
 * The breakdown / context / echo / check carousel got cut — those steps
 * were near-identical for short phrases like "Dušo moja" and added
 * busywork instead of encoding. Retrieval happens later in the SRS.
 */
export default function PhraseIntro({ phrases, script, onComplete, progress }: PhraseIntroProps) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const phrase = phrases[index];
  if (!phrase) return null;

  // Resolve word references — the breakdown chips shown under each
  // phrase. Each ref carries an optional surface form + case so chips
  // can show what's in the phrase rather than the bare lemma.
  // Audit §3.10 + TESTER_REPORT.md "vocative mismatch".
  const refs = normalizeWordRefs(phrase.wordRefs);

  const next = () => {
    if (index + 1 >= phrases.length) {
      onComplete();
    } else {
      setIndex(index + 1);
      setRevealed(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={metaLabel}>
          NEW PHRASE · {index + 1} OF {phrases.length}
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
                  i < index
                    ? T.amber
                    : i === index
                      ? 'rgba(255,193,7,0.5)'
                      : T.border,
                transition: `background ${T.fast} ${T.ease}`,
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 6 }}>
        <DualScript
          srLatin={phrase.sr_latin}
          srCyrillic={phrase.sr_cyrillic}
          script={script}
          size="hero"
          weight={500}
        />
      </div>

      {refs.length > 0 && (
        <div>
          <div style={{ ...metaLabel, marginBottom: 8 }}>WORD BY WORD</div>
          <WordChips refs={refs} script={script} progress={progress} />
        </div>
      )}

      {!revealed ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Btn kind="secondary" size="lg" onClick={() => setRevealed(true)}>
            Reveal meaning
          </Btn>
          <Btn kind="quiet" size="sm" onClick={next}>
            Skip
          </Btn>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 20, color: T.amber, fontWeight: 500, marginTop: -4 }}>
            {phrase.en}
          </div>
          {phrase.context && (
            <div
              className="font-serif-sr"
              style={{
                fontStyle: 'italic',
                fontSize: 14,
                color: T.dim,
                lineHeight: 1.55,
              }}
            >
              {phrase.context}
            </div>
          )}
          {phrase.notes && (
            <Card pad={14}>
              <MonoBadge kind="purple">
                <IconBrain size={11} /> NOTE
              </MonoBadge>
              <div
                style={{ fontSize: 13, color: T.text, marginTop: 10, lineHeight: 1.55 }}
              >
                {phrase.notes}
              </div>
            </Card>
          )}
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
                    <span
                      className="font-serif-sr"
                      style={{ fontSize: 13, color: T.text, fontWeight: 500 }}
                    >
                      {script === 'cyrillic' ? v.sr_cyrillic : v.sr_latin}
                    </span>
                    <span style={{ fontSize: 11, color: T.dim }}>{v.en}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Btn kind="primary" size="lg" full onClick={next}>
            {index + 1 >= phrases.length ? 'Start practice' : 'Next phrase'}
          </Btn>
        </>
      )}
    </div>
  );
}
