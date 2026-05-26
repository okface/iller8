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
 * For each unique Serbian Latin string, computes the FNV-1a hash (same
 * function as `src/lib/audio.ts`), checks if `public/audio/<hash>.mp3`
 * already exists, and if not calls Azure Speech to generate it.
 *
 * Requires:
 *   AZURE_SPEECH_KEY     = your Azure subscription key
 *   AZURE_SPEECH_REGION  = your Azure region (default: westeurope)
 *
 * Sign up: https://azure.microsoft.com/en-us/free — the free tier
 * (500k chars/month) covers the entire iller8 corpus several times over.
 *
 * Usage:
 *   AZURE_SPEECH_KEY=xxx node scripts/generate-audio.mjs
 *   AZURE_SPEECH_KEY=xxx node scripts/generate-audio.mjs --dry-run
 *   AZURE_SPEECH_KEY=xxx node scripts/generate-audio.mjs --voice nicholas
 *
 * Voices (Azure neural Serbian):
 *   sophie   → sr-RS-SophieNeural    (female, default)
 *   nicholas → sr-RS-NicholasNeural  (male)
 *
 * Bosnian fallbacks (for Ijekavian forms — wire up later if needed):
 *   vesna    → bs-BA-VesnaNeural
 *   goran    → bs-BA-GoranNeural
 */

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const AUDIO_DIR = join(PROJECT_ROOT, 'public', 'audio');
const REGION = process.env.AZURE_SPEECH_REGION ?? 'westeurope';
const KEY = process.env.AZURE_SPEECH_KEY;

const VOICES = {
  sophie: 'sr-RS-SophieNeural',
  nicholas: 'sr-RS-NicholasNeural',
  vesna: 'bs-BA-VesnaNeural',
  goran: 'bs-BA-GoranNeural',
};

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const voiceFlag = args[args.indexOf('--voice') + 1];
const VOICE = voiceFlag && VOICES[voiceFlag] ? VOICES[voiceFlag] : VOICES.sophie;

if (!dryRun && !KEY) {
  console.error('AZURE_SPEECH_KEY is not set. Run:');
  console.error('  AZURE_SPEECH_KEY=xxx node scripts/generate-audio.mjs');
  console.error('Or sign up: https://azure.microsoft.com/en-us/free');
  process.exit(1);
}

/* ── FNV-1a 32-bit, identical to src/lib/audio.ts ────────────────── */
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

function audioId(text) {
  return fnv1a32(normalize(text));
}

/* ── Walk the data files and collect unique Serbian strings ──────── */
async function collectStrings() {
  const strings = new Set();
  const add = (s) => {
    if (typeof s === 'string' && s.trim()) strings.add(normalize(s));
  };

  // Lessons
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
        add(phrase.sr_latin);
        for (const v of phrase.variations ?? []) add(v.sr_latin);
      }
    }
  }

  // Words
  const words = JSON.parse(
    await readFile(join(PROJECT_ROOT, 'src', 'data', 'words', 'words.json'), 'utf8')
  );
  for (const word of words) {
    add(word.lemma_sr_latin);
    for (const ex of word.examples ?? []) add(ex.sr_latin);
    for (const f of word.forms ?? []) add(f.sr_latin);
  }

  // Phrase families
  const familiesFile = JSON.parse(
    await readFile(join(PROJECT_ROOT, 'src', 'data', 'phrase-families.json'), 'utf8')
  );
  for (const fam of familiesFile.families ?? []) {
    add(fam.base?.sr_latin);
    for (const v of fam.variants ?? []) add(v.sr_latin);
  }

  return [...strings];
}

/* ── Azure Speech call ───────────────────────────────────────────── */
function ssmlFor(text, voice) {
  // Escape minimal XML special chars. Serbian text doesn't normally
  // contain XML-illegal chars, but defensive.
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  return `<speak version='1.0' xml:lang='sr-RS'><voice name='${voice}'>${escaped}</voice></speak>`;
}

async function generate(text, voice) {
  const url = `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': KEY,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'iller8/audio-gen',
    },
    body: ssmlFor(text, voice),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Azure TTS ${res.status} ${res.statusText}: ${body.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/* ── Main ────────────────────────────────────────────────────────── */
async function main() {
  console.log(`iller8 audio generator (voice: ${VOICE}${dryRun ? ', dry-run' : ''})`);
  if (!existsSync(AUDIO_DIR)) {
    await mkdir(AUDIO_DIR, { recursive: true });
  }

  const strings = await collectStrings();
  const totalChars = strings.reduce((n, s) => n + s.length, 0);
  console.log(`Found ${strings.length} unique strings, ${totalChars} chars total.`);

  let toGenerate = 0;
  let skipped = 0;
  const work = [];
  for (const text of strings) {
    const id = audioId(text);
    const path = join(AUDIO_DIR, `${id}.mp3`);
    try {
      await access(path);
      skipped++;
    } catch {
      toGenerate++;
      work.push({ id, text, path });
    }
  }

  console.log(`${skipped} clips already exist; ${toGenerate} need generation.`);

  if (dryRun) {
    console.log('Dry-run: not contacting Azure.');
    for (const w of work.slice(0, 10)) {
      console.log(`  would generate ${w.id}.mp3  "${w.text}"`);
    }
    if (work.length > 10) console.log(`  … and ${work.length - 10} more`);
    return;
  }

  let done = 0;
  let failed = 0;
  for (const { id, text, path } of work) {
    try {
      const audio = await generate(text, VOICE);
      await writeFile(path, audio);
      done++;
      console.log(`  ✓ ${id}.mp3  "${text.slice(0, 40)}${text.length > 40 ? '…' : ''}"`);
    } catch (err) {
      failed++;
      console.error(`  ✕ ${id}.mp3  "${text}" — ${err.message}`);
    }
    // Be polite to Azure's free tier — small pause between requests.
    await new Promise((r) => setTimeout(r, 50));
  }

  console.log(`\nDone. Generated ${done}, failed ${failed}, skipped ${skipped}.`);
  console.log(`Audio files in: ${AUDIO_DIR}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
