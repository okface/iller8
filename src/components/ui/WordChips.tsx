import type { UserProgress } from '../../store/types';
import type { NormalizedWordRef } from '../../data/words';
import { getWordBucket } from '../../lib/word-progress';
import { T } from '../../lib/tokens';

/**
 * Word-breakdown strip shown under a phrase. Each chip is one content
 * Word. When the phrase carries an inflected surface form different
 * from the lemma (e.g. `Dušo moja.` carrying `dušo` for the lemma
 * `duša`), the chip shows the surface form prominently with the lemma
 * underneath and a small case badge. Otherwise it shows just the lemma.
 *
 * Spec: PEDAGOGY_AUDIT.md §3.10 + TESTER_REPORT.md "vocative mismatch".
 */

interface WordChipsProps {
  /** Already-normalized refs from `normalizeWordRefs(phrase.wordRefs)`. */
  refs: NormalizedWordRef[];
  script: 'latin' | 'cyrillic';
  progress?: UserProgress;
  onWordClick?: (ref: NormalizedWordRef) => void;
  compact?: boolean;
}

const BUCKET_COLORS: Record<number, { bg: string; border: string; fg: string }> = {
  0: { bg: T.surface, border: T.border, fg: T.dim },
  1: { bg: T.amberDim, border: T.borderWarm, fg: T.amber },
  2: { bg: T.amberDim, border: T.borderWarm, fg: T.amber },
  3: { bg: T.purpleDim, border: 'rgba(167,139,250,0.3)', fg: T.purple },
  4: { bg: T.purpleDim, border: 'rgba(167,139,250,0.3)', fg: T.purple },
  5: { bg: T.greenDim, border: 'rgba(34,197,94,0.3)', fg: T.green },
};

export default function WordChips({
  refs,
  script,
  progress,
  onWordClick,
  compact = false,
}: WordChipsProps) {
  if (refs.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {refs.map((ref) => {
        const { word } = ref;
        const bucket = progress ? getWordBucket(progress, word.id) : 0;
        const c = BUCKET_COLORS[Math.min(5, bucket)];

        // Surface form (what's in the phrase) — prefer the per-ref override.
        const surfaceLatin = ref.surface_latin ?? word.lemma_sr_latin;
        const surfaceCyrillic = ref.surface_cyrillic ?? word.lemma_sr_cyrillic;
        const surface = script === 'cyrillic' ? surfaceCyrillic : surfaceLatin;
        const lemma = script === 'cyrillic' ? word.lemma_sr_cyrillic : word.lemma_sr_latin;
        const showLemma = surface !== lemma;
        const interactive = !!onWordClick;

        return (
          <button
            key={ref.id + (ref.case ?? '')}
            onClick={interactive ? () => onWordClick(ref) : undefined}
            disabled={!interactive}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              borderRadius: T.rPill,
              background: c.bg,
              border: `1px solid ${c.border}`,
              color: T.text,
              cursor: interactive ? 'pointer' : 'default',
              transition: `all ${T.fast} ${T.ease}`,
              fontFamily: T.sans,
            }}
            title={word.gloss_en}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
              <span
                className="font-serif-sr"
                style={{ fontSize: 14, fontWeight: 500, color: T.text }}
              >
                {surface}
              </span>
              {showLemma && (
                <span
                  style={{
                    fontFamily: T.mono,
                    fontSize: 9,
                    color: T.mute,
                    marginTop: 1,
                  }}
                >
                  ← {lemma}
                </span>
              )}
            </div>
            {ref.case && (
              <span
                style={{
                  fontFamily: T.mono,
                  fontSize: 9,
                  color: c.fg,
                  textTransform: 'uppercase',
                  letterSpacing: 0.4,
                }}
              >
                {ref.case}
              </span>
            )}
            {!compact && (
              <>
                <span style={{ color: c.fg, fontSize: 10, fontFamily: T.mono }}>→</span>
                <span style={{ fontSize: 12, color: c.fg }}>{word.gloss_en}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
