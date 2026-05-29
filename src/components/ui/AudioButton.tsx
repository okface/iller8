import { useRef, useState } from 'react';
import { audioUrl } from '../../lib/audio';
import { useAudioSettings } from '../../lib/audio-context';
import { T } from '../../lib/tokens';
import { IconAudio } from './Icons';

/**
 * Plays the audio clip for a Serbian source string using the active
 * voice (female=Sophie / male=Nicholas) from the audio settings context.
 * If the clip doesn't exist (e.g. it hasn't been generated yet) the
 * play silently fails and the button briefly flashes dim.
 */
interface AudioButtonProps {
  /** Serbian source string (Latin script). */
  text: string;
  size?: number;
  /** Optional ARIA label override. */
  ariaLabel?: string;
}

type PlayState = 'idle' | 'playing' | 'missing';

export default function AudioButton({ text, size = 16, ariaLabel }: AudioButtonProps) {
  const { voice } = useAudioSettings();
  const [state, setState] = useState<PlayState>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text) return;
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'none';
    }
    const el = audioRef.current;
    el.src = audioUrl(text, voice);
    el.currentTime = 0;
    setState('playing');
    el.play()
      .then(() => {
        el.onended = () => setState('idle');
      })
      .catch(() => {
        setState('missing');
        setTimeout(() => setState('idle'), 800);
      });
  };

  const color =
    state === 'playing' ? T.amber : state === 'missing' ? T.mute : T.dim;

  return (
    <button
      onClick={handlePlay}
      aria-label={ariaLabel ?? `Play audio: ${text}`}
      style={{
        background: 'transparent',
        border: 'none',
        padding: 4,
        cursor: 'pointer',
        color,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: `color ${T.fast} ${T.ease}`,
      }}
    >
      <IconAudio size={size} />
    </button>
  );
}
