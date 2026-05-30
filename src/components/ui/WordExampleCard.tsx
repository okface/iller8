import { getWordById } from '../../data/words';
import Card from './Card';
import DualScript from './DualScript';
import AudioButton from './AudioButton';
import { T, metaLabel } from '../../lib/tokens';

/**
 * Post-answer "in context" card for WORD exercises: shows one of the
 * word's example sentences (dual-script + English + audio) so the
 * learner sees the word doing its job in a real phrase. Pure encoding
 * value from data that was otherwise dropped (`Word.examples`).
 *
 * Renders nothing unless the exercise is a word (`word:<id>` key) with
 * at least one example. Safe to drop into any exercise's post-answer
 * area; it self-guards.
 */
interface WordExampleCardProps {
  /** The exercise's phrase.id — `word:<id>` for word exercises. */
  phraseId: string;
  script: 'latin' | 'cyrillic';
}

const WORD_PREFIX = 'word:';

export default function WordExampleCard({ phraseId, script }: WordExampleCardProps) {
  if (!phraseId.startsWith(WORD_PREFIX)) return null;
  const word = getWordById(phraseId.slice(WORD_PREFIX.length));
  const example = word?.examples?.[0];
  if (!example) return null;

  return (
    <Card pad={14}>
      <div style={{ ...metaLabel, marginBottom: 8 }}>IN CONTEXT</div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <DualScript
            srLatin={example.sr_latin}
            srCyrillic={example.sr_cyrillic}
            script={script}
            size="md"
          />
        </div>
        <AudioButton text={example.sr_latin} size={15} />
      </div>
      <div style={{ fontSize: 12, color: T.dim, marginTop: 4 }}>{example.en}</div>
    </Card>
  );
}
