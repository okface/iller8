import { T } from '../../lib/tokens';

/**
 * Renders the post-answer disambiguator that used to live in
 * `(lit. ...)` / `(to a woman)` parentheticals on `phrase.en` /
 * `word.gloss_en`. Shown after the learner has answered, so it
 * clarifies the meaning without leaking the answer.
 *
 * Conventionally placed right under the correct-answer reveal.
 */
interface GlossHintProps {
  hint?: string;
}

export default function GlossHint({ hint }: GlossHintProps) {
  if (!hint) return null;
  return (
    <div
      className="font-serif-sr"
      style={{
        fontStyle: 'italic',
        fontSize: 12,
        color: T.dim,
        lineHeight: 1.5,
        marginTop: 2,
      }}
    >
      ({hint})
    </div>
  );
}
