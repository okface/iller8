import { useEffect, useRef } from 'react';
import { audioUrl } from '../../lib/audio';
import { useAudioSettings } from '../../lib/audio-context';

/**
 * Headless primitive: plays a Serbian source clip once when the
 * component mounts (or when `text` changes). Used on prompt/reveal
 * surfaces so the learner hears the sound paired with the form
 * automatically. Manual replay is still available via `<AudioButton>`.
 *
 * Lifecycle: relies on `<ExerciseRenderer>`'s `key={itemKey}` pattern
 * — when the learner advances, the parent exercise component remounts
 * which tears down this primitive, cleanup pauses the audio. No
 * overlap across question advances.
 *
 * Accessibility guards (all short-circuit play silently):
 *   - autoplay setting is off
 *   - tab is hidden
 *   - prefers-reduced-motion is set
 *   - browser blocks the first play() before any user gesture (we
 *     swallow the rejected Promise; subsequent autoplay works fine).
 */
interface AutoplayAudioProps {
  /** Serbian source text. If empty/undefined → no-op. */
  text?: string | null;
  /** Optional manual override. Falls back to the context's autoplay setting. */
  enabled?: boolean;
  /** Delay before playing, in ms. Used by PatternMatch / Comprehension
   *  to sequence multiple clips. */
  delayMs?: number;
}

export default function AutoplayAudio({ text, enabled, delayMs = 0 }: AutoplayAudioProps) {
  const { voice, autoplay } = useAudioSettings();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const effectiveEnabled = enabled ?? autoplay;
    if (!effectiveEnabled) return;
    if (!text || !text.trim()) return;

    // Accessibility kill-switches.
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const fire = () => {
      // Reuse one Audio instance per primitive so cleanup can pause it.
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.preload = 'none';
      }
      const el = audioRef.current;
      el.src = audioUrl(text, voice);
      el.currentTime = 0;
      // Browser autoplay policy: play() returns a rejected Promise
      // before any user gesture. Swallow silently; later clips will
      // succeed once the learner has clicked something.
      el.play().catch(() => undefined);
    };

    if (delayMs > 0) {
      timerRef.current = setTimeout(fire, delayMs);
    } else {
      fire();
    }

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, [text, enabled, autoplay, voice, delayMs]);

  return null;
}
