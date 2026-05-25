import { T } from '../lib/tokens';

interface ScriptToggleProps {
  script: 'latin' | 'cyrillic';
  onChange: (script: 'latin' | 'cyrillic') => void;
}

export default function ScriptToggle({ script, onChange }: ScriptToggleProps) {
  const isLatin = script === 'latin';
  return (
    <div
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
        onClick={() => onChange('latin')}
        style={{
          padding: '5px 11px',
          background: isLatin ? T.surfaceHi : 'transparent',
          color: isLatin ? T.text : T.dim,
          border: 'none',
          cursor: 'pointer',
          fontFamily: T.mono,
          fontSize: 11,
          fontWeight: 500,
          transition: `all ${T.fast} ${T.ease}`,
        }}
      >
        Lat
      </button>
      <button
        onClick={() => onChange('cyrillic')}
        style={{
          padding: '5px 11px',
          background: !isLatin ? T.surfaceHi : 'transparent',
          color: !isLatin ? T.text : T.dim,
          border: 'none',
          cursor: 'pointer',
          fontFamily: T.mono,
          fontSize: 11,
          fontWeight: 500,
          transition: `all ${T.fast} ${T.ease}`,
        }}
      >
        Ћир
      </button>
    </div>
  );
}
