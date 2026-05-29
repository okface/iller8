#!/usr/bin/env node
// @ts-check
/**
 * Batch-generate audio clips for every Serbian source string in iller8.
 *
 * Reads:
 *   src/data/lessons/*.json
 *   src/data/words/words.json
 *   src/data/phrase-families.json
 *
 * Each Serbian string has both Latin and Cyrillic forms. The file ID
 * is the FNV-1a hash of the LATIN form (so it's stable regardless of
 * which voice/script we generate against), but we SEND the CYRILLIC
 * form to Azure — confirmed by A/B test that the Cyrillic-trained
 * `sr-RS-SophieNeural` / `sr-RS-NicholasNeural` voices sound right
 * with Cyrillic input and wrong with Latin input.
 *
 * Clips are stored per voice:
 *   public/audio/sophie/<hash>.mp3
 *   public/audio/nicholas/<hash>.mp3
 *
 * Usage:
 *   AZURE_SPEECH_KEY=xxx AZURE_SPEECH_REGION=swedencentral \
 *     node scripts/generate-audio.mjs
 *
 *   --voice sophie|nicholas|both     (default: both)
 *   --dry-run                        (show what would be generated)
 */

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const AUDIO_ROOT = join(PROJECT_ROOT, 'public', 'audio');
const REGION = process.env.AZURE_SPEECH_REGION ?? 'westeurope';
const KEY = process.env.AZURE_SPEECH_KEY;

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  return args[i + 1];
};
const dryRun = args.includes('--dry-run');
const voiceArg = flag('--voice') ?? 'both';

const VOICES = {
  sophie: {
    dir: 'sophie',
    azureName: 'sr-RS-SophieNeural',
    locale: 'sr-RS',
  },
  nicholas: {
    dir: 'nicholas',
    azureName: 'sr-RS-NicholasNeural',
    locale: 'sr-RS',
  },
};

const selectedVoices =
  voiceArg === 'both' ? Object.keys(VOICES) : [voiceArg];
for (const v of selectedVoices) {
  if (!VOICES[v]) {
    console.error(`Unknown voice: ${v}. Known: sophie, nicholas, both`);
    process.exit(1);
  }
}

if (!dryRun && !KEY) {
  console.error('AZURE_SPEECH_KEY is not set. Run:');
  console.error('  AZURE_SPEECH_KEY=xxx node scripts/generate-audio.mjs');
  process.exit(1);
}

/* ── FNV-1a 32-bit (identical to src/lib/audio.ts) ───────────────── */
function fnv1a32(input) {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
function normalize(text) {
  return text.trim().normalize('NFC');
}
function audioId(latin) {
  return fnv1a32(normalize(latin));
}

/* ── Walk the data files and collect unique (latin, cyrillic) pairs ─ */
async function collectStrings() {
  /** @type {Map<string, string>} */
  const map = new Map();
  const add = (latin, cyrillic) => {
    if (typeof latin !== 'string' || !latin.trim()) return;
    if (typeof cyrillic !== 'string' || !cyrillic.trim()) return;
    const l = normalize(latin);
    const c = normalize(cyrillic);
    if (!map.has(l)) map.set(l, c);
  };

  const lessonsDir = join(PROJECT_ROOT, 'src', 'data', 'lessons');
  const lessonFiles = [
    '01-sweet-talk.json',
    '02-reactions.json',
    '03-texting.json',
    '04-food-cooking.json',
    '05-work-banter.json',
    '06-making-plans.json',
    '07-feelings-opinions.json',
    '08-slang-humor.json',
    '09-daily-routines.json',
    '10-celebrations.json',
  ];
  for (const file of lessonFiles) {
    const lesson = JSON.parse(await readFile(join(lessonsDir, file), 'utf8'));
    for (const group of lesson.phraseGroups ?? []) {
      for (const phrase of group.phrases ?? []) {
        add(phrase.sr_latin, phrase.sr_cyrillic);
        for (const v of phrase.variations ?? []) add(v.sr_latin, v.sr_cyrillic);
      }
    }
  }

  const words = JSON.parse(
    await readFile(join(PROJECT_ROOT, 'src', 'data', 'words', 'words.json'), 'utf8')
  );
  for (const word of words) {
    add(word.lemma_sr_latin, word.lemma_sr_cyrillic);
    for (const ex of word.examples ?? []) add(ex.sr_latin, ex.sr_cyrillic);
    for (const f of word.forms ?? []) add(f.sr_latin, f.sr_cyrillic);
  }

  const familiesFile = JSON.parse(
    await readFile(join(PROJECT_ROOT, 'src', 'data', 'phrase-families.json'), 'utf8')
  );
  for (const fam of familiesFile.families ?? []) {
    add(fam.base?.sr_latin, fam.base?.sr_cyrillic);
    for (const v of fam.variants ?? []) add(v.sr_latin, v.sr_cyrillic);
  }

  return [...map.entries()].map(([latin, cyrillic]) => ({ latin, cyrillic }));
}

/* ── Azure call ──────────────────────────────────────────────────── */
function ssmlForAzure(text, voiceName, locale) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  return `<speak version='1.0' xml:lang='${locale}'><voice name='${voiceName}'>${escaped}</voice></speak>`;
}

async function generateAzure(text, voice) {
  const url = `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': KEY,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-48khz-192kbitrate-mono-mp3',
      'User-Agent': 'iller8/audio-gen',
    },
    body: ssmlForAzure(text, voice.azureName, voice.locale),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Azure TTS ${res.status} ${res.statusText}: ${body.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/* ── Main ────────────────────────────────────────────────────────── */
async function main() {
  console.log(
    `iller8 audio generator (voices: ${selectedVoices.join(', ')}${dryRun ? ', dry-run' : ''})`
  );

  // Ensure per-voice directories exist.
  for (const v of selectedVoices) {
    const dir = join(AUDIO_ROOT, VOICES[v].dir);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

  const pairs = await collectStrings();
  const totalChars = pairs.reduce((n, p) => n + p.cyrillic.length, 0);
  console.log(
    `Found ${pairs.length} unique strings, ${totalChars} Cyrillic chars × ${selectedVoices.length} voices.`
  );

  /** @type {Array<{ voiceKey: string; voice: any; pair: any; id: string; path: string }>} */
  const work = [];
  let skipped = 0;
  for (const voiceKey of selectedVoices) {
    const voice = VOICES[voiceKey];
    const voiceDir = join(AUDIO_ROOT, voice.dir);
    for (const pair of pairs) {
      const id = audioId(pair.latin);
      const path = join(voiceDir, `${id}.mp3`);
      try {
        await access(path);
        skipped++;
      } catch {
        work.push({ voiceKey, voice, pair, id, path });
      }
    }
  }

  console.log(`${skipped} clips already exist; ${work.length} need generation.`);

  if (dryRun) {
    console.log('Dry-run: not contacting Azure.');
    for (const w of work.slice(0, 10)) {
      console.log(`  would generate ${w.voiceKey}/${w.id}.mp3  "${w.pair.cyrillic}"`);
    }
    if (work.length > 10) console.log(`  … and ${work.length - 10} more`);
    return;
  }

  let done = 0;
  let failed = 0;
  for (const { voiceKey, voice, pair, id, path } of work) {
    try {
      const audio = await generateAzure(pair.cyrillic, voice);
      await writeFile(path, audio);
      done++;
      const t = pair.cyrillic.slice(0, 40);
      console.log(`  ✓ ${voiceKey}/${id}.mp3  "${t}${pair.cyrillic.length > 40 ? '…' : ''}"`);
    } catch (err) {
      failed++;
      console.error(`  ✕ ${voiceKey}/${id}.mp3  "${pair.cyrillic}" — ${err.message}`);
    }
    // Azure F0 caps at 20 TPS; 100ms = 10 TPS leaves safe headroom.
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`\nDone. Generated ${done}, failed ${failed}, skipped ${skipped}.`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
