/**
 * Audio is content-addressed AND voice-addressed: every Serbian source
 * string maps to one MP3 per voice at `public/audio/<voice>/<hash>.mp3`.
 * The hash is derived from the Latin form (so it's stable regardless
 * of which script gets sent to TTS for generation).
 *
 * Voices currently shipped:
 *   sophie   — sr-RS-SophieNeural,   female, Cyrillic-trained
 *   nicholas — sr-RS-NicholasNeural, male,   Cyrillic-trained
 *
 * The voice is picked per-call (default 'sophie') so individual surfaces
 * can override if needed, but in practice all callers read the active
 * voice from the AudioSettings context (see `src/lib/audio-context.tsx`).
 *
 * Hash: FNV-1a 32-bit, hex. Stable across browser + Node.
 */

export type VoiceId = 'sophie' | 'nicholas';

export const VOICE_LABELS: Record<VoiceId, { label: string; gender: 'female' | 'male'; azure: string }> = {
  sophie: { label: 'Sophie', gender: 'female', azure: 'sr-RS-SophieNeural' },
  nicholas: { label: 'Nicholas', gender: 'male', azure: 'sr-RS-NicholasNeural' },
};

export function voiceForGender(gender: 'female' | 'male'): VoiceId {
  return gender === 'male' ? 'nicholas' : 'sophie';
}

function fnv1a32(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function normalize(text: string): string {
  return text.trim().normalize('NFC');
}

/** Stable ID for an audio clip (derived from Latin source string). */
export function audioId(text: string): string {
  return fnv1a32(normalize(text));
}

/** Browser-side URL for a clip. Honours `import.meta.env.BASE_URL`. */
export function audioUrl(text: string, voice: VoiceId = 'sophie'): string {
  const base = import.meta.env.BASE_URL ?? '/';
  const trimmed = base.endsWith('/') ? base : base + '/';
  return `${trimmed}audio/${voice}/${audioId(text)}.mp3`;
}
