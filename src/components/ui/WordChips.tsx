import type { Word, UserProgress } from '../../store/types';
import { getWordBucket } from '../../lib/word-progress';
import { T } from '../../lib/tokens';

/**
 * Renders the word-breakdown strip shown under a phrase. Each chip
 * shows one content Word in the learner's primary script + its English
 * gloss, with a colour cue indicating SRS bucket. Tapping a chip can
 * navigate to that word's drill — wire `onWordClick` from the parent.
 *
 * Spec: PEDAGOGY_AUDIT.md §3.10 — "the single highest-impact change
 * to make a sentence feel constructed from pieces I know."
 */

interface WordChipsProps {
  /** Words to render, in display order. Pass the resolved Word objects
   *  (the parent looks them up from wordRefs via the words loader). */
  words: Word[];
  /** User's primary script. */
  script: 'latin' | 'cyrillic';
  /** UserProgress to colour-code each chip by SRS bucket. Optional. */
  progress?: UserProgress;
  /** Tap handler for a chip. Optional — chips are static if not provided. */
  onWordClick?: (word: Word) => void;
  /** Hide the English gloss row (compact). Default false. */
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
  words,
  script,
  progress,
  onWordClick,
  compact = false,
}: WordChipsProps) {
  if (words.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
      }}
    >
      {words.map((word) => {
        const bucket = progress ? getWordBucket(progress, word.id) : 0;
        const c = BUCKET_COLORS[Math.min(5, bucket)];
        const sr = script === 'cyrillic' ? word.lemma_sr_cyrillic : word.lemma_sr_latin;
        const interactive = !!onWordClick;
        return (
          <button
            key={word.id}
            onClick={interactive ? () => onWordClick(word) : undefined}
            disabled={!interactive}
            style={{
              display: 'inline-flex',
              alignItems: 'baseline',
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
            <span
              className="font-serif-sr"
              style={{ fontSize: 14, fontWeight: 500, color: T.text }}
            >
              {sr}
            </span>
            {!compact && (
              <>
                <span style={{ color: c.fg, fontSize: 10, fontFamily: T.mono }}>
                  →
                </span>
                <span style={{ fontSize: 12, color: c.fg }}>{word.gloss_en}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
