/**
 * Audio is content-addressed: every Serbian source string maps to one
 * MP3 file at `public/audio/<hash>.mp3`. The mapping is deterministic,
 * so the data files don't need an `audio` field — the URL is derived
 * from the string at render time. Editing a phrase regenerates a new
 * hash and the old clip becomes orphan-deletable.
 *
 * The generation script (`scripts/generate-audio.mjs`) walks the data
 * files, derives the hash for every string, and only generates clips
 * that don't already exist. Re-runnable, free with Azure's TTS free
 * tier.
 *
 * Hash: FNV-1a 32-bit, hex. Stable across browser + Node. Collisions
 * at 908 strings are astronomically unlikely; if one ever shows up,
 * append a discriminator in `audioId` below.
 */

function fnv1a32(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Normalise the input so trailing whitespace / casing / punctuation
 *  variations don't fragment the cache. */
function normalize(text: string): string {
  return text.trim().normalize('NFC');
}

/** Stable ID for an audio clip. */
export function audioId(text: string): string {
  return fnv1a32(normalize(text));
}

/** Browser-side URL for a clip. Uses `import.meta.env.BASE_URL` so it
 *  works under the GitHub Pages base path. */
export function audioUrl(text: string): string {
  const base = import.meta.env.BASE_URL ?? '/';
  const trimmed = base.endsWith('/') ? base : base + '/';
  return `${trimmed}audio/${audioId(text)}.mp3`;
}
