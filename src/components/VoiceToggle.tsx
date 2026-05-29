import { T } from '../lib/tokens';

interface VoiceToggleProps {
  voiceGender: 'female' | 'male';
  onChange: (g: 'female' | 'male') => void;
}

/**
 * Two-segment header pill that switches between Sophie (female) and
 * Nicholas (male). Same shape as `<ScriptToggle>` — single visual unit
 * with two segments, the active one highlighted.
 */
export default function VoiceToggle({ voiceGender, onChange }: VoiceToggleProps) {
  const isFemale = voiceGender === 'female';
  return (
    <div
      role="group"
      aria-label="Voice"
      style={{
        display: 'inline-flex',
        border: `1px solid ${T.border}`,
        borderRadius: T.r2,
        overflow: 'hidden',
        fontFamily: T.mono,
        fontSize: 11,
      }}
    >
      <button
        onClick={() => onChange('female')}
        aria-pressed={isFemale}
        title="Sophie (female)"
        style={{
          padding: '5px 9px',
          background: isFemale ? T.surfaceHi : 'transparent',
          color: isFemale ? T.text : T.dim,
          border: 'none',
          cursor: 'pointer',
          fontFamily: T.mono,
          fontSize: 11,
          fontWeight: 500,
          transition: `all ${T.fast} ${T.ease}`,
        }}
      >
        ♀
      </button>
      <button
        onClick={() => onChange('male')}
        aria-pressed={!isFemale}
        title="Nicholas (male)"
        style={{
          padding: '5px 9px',
          background: !isFemale ? T.surfaceHi : 'transparent',
          color: !isFemale ? T.text : T.dim,
          border: 'none',
          cursor: 'pointer',
          fontFamily: T.mono,
          fontSize: 11,
          fontWeight: 500,
          transition: `all ${T.fast} ${T.ease}`,
        }}
      >
        ♂
      </button>
    </div>
  );
}
