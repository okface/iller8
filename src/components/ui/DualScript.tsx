import { T } from '../../lib/tokens';

/**
 * Render Serbian text in both scripts: the user's primary script
 * displayed prominently (serif), with the alternate script in mono
 * underneath. The point is to passively expose the learner to both
 * scripts at all times — Cyrillic doesn't become "the other thing" but
 * just another way to read the same word.
 *
 * For non-Serbian text (English prompts etc.) pass `srLatin === srCyrillic`
 * or just don't use this component.
 */
interface DualScriptProps {
  srLatin: string;
  srCyrillic: string;
  script: 'latin' | 'cyrillic';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  /** When true, hide the alt script. Useful for option buttons where the alt would clutter. */
  hideAlt?: boolean;
  /** Override the primary font weight. */
  weight?: 400 | 500 | 600 | 700;
}

const SIZE_MAP: Record<NonNullable<DualScriptProps['size']>, { primary: number; alt: number; gap: number }> = {
  sm: { primary: 14, alt: 11, gap: 2 },
  md: { primary: 17, alt: 12, gap: 3 },
  lg: { primary: 22, alt: 13, gap: 4 },
  xl: { primary: 28, alt: 13, gap: 5 },
  hero: { primary: 40, alt: 14, gap: 6 },
};

export default function DualScript({
  srLatin,
  srCyrillic,
  script,
  size = 'md',
  hideAlt = false,
  weight = 500,
}: DualScriptProps) {
  const primary = script === 'cyrillic' ? srCyrillic : srLatin;
  const alt = script === 'cyrillic' ? srLatin : srCyrillic;
  const { primary: primarySize, alt: altSize, gap } = SIZE_MAP[size];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, minWidth: 0 }}>
      <div
        className="font-serif-sr"
        style={{
          fontSize: primarySize,
          fontWeight: weight,
          letterSpacing: -0.3,
          color: T.text,
          lineHeight: 1.15,
        }}
      >
        {primary}
      </div>
      {!hideAlt && primary !== alt && (
        <div
          style={{
            fontFamily: T.mono,
            fontSize: altSize,
            color: T.mute,
            letterSpacing: 0.1,
          }}
        >
          {alt}
        </div>
      )}
    </div>
  );
}
