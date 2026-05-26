import { useRef, useState } from 'react';
import { audioUrl } from '../../lib/audio';
import { T } from '../../lib/tokens';
import { IconAudio } from './Icons';

/**
 * Plays the audio clip for a Serbian source string. The clip URL is
 * derived from the string via FNV-1a hash (see `lib/audio.ts`). If the
 * file doesn't exist (clip not generated yet) the play silently fails
 * and the button briefly flashes dim.
 *
 * Wired into any place a phrase or word is displayed prominently —
 * PhraseIntro, Dashboard's phrase-of-the-day, exercise prompts, the
 * catalog row, etc.
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
  const [state, setState] = useState<PlayState>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text) return;
    // Reuse one Audio instance per button so rapid clicks restart cleanly.
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'none';
    }
    const el = audioRef.current;
    el.src = audioUrl(text);
    el.currentTime = 0;
    setState('playing');
    el.play()
      .then(() => {
        el.onended = () => setState('idle');
      })
      .catch(() => {
        // Clip not generated yet — flash dim, then reset.
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
