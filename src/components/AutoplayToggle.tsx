import { T } from '../lib/tokens';
import { IconAudio } from './ui/Icons';

interface AutoplayToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

/**
 * Binary header pill that controls global autoplay. When on, the
 * speaker icon glows amber; when off, dim + a diagonal strike line.
 * Manual replay buttons (`<AudioButton>`) work regardless.
 */
export default function AutoplayToggle({ enabled, onChange }: AutoplayToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      aria-label={`Autoplay audio: ${enabled ? 'on' : 'off'}`}
      title={enabled ? 'Autoplay on' : 'Autoplay off'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        width: 32,
        height: 24,
        border: `1px solid ${enabled ? T.borderHi : T.border}`,
        borderRadius: T.r2,
        background: enabled ? T.surfaceHi : 'transparent',
        color: enabled ? T.amber : T.mute,
        cursor: 'pointer',
        transition: `all ${T.fast} ${T.ease}`,
        padding: 0,
      }}
    >
      <IconAudio size={13} />
      {!enabled && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: '50%',
            left: 3,
            right: 3,
            height: 1.5,
            background: T.mute,
            transform: 'rotate(-22deg)',
            transformOrigin: 'center',
            pointerEvents: 'none',
          }}
        />
      )}
    </button>
  );
}
