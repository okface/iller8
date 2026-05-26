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
 * already exists, and if not calls the chosen TTS provider.
 *
 * ─── Providers ─────────────────────────────────────────────────
 *
 * elevenlabs (default)
 *   Free tier: 10k chars/month — covers iller8's entire ~10k-char
 *   corpus in one shot. Email signup, no credit card.
 *   ENV: ELEVENLABS_API_KEY (required), ELEVENLABS_VOICE_ID (optional)
 *   Sign up: https://elevenlabs.io
 *
 * azure
 *   Highest quality for Serbian (purpose-built sr-RS-SophieNeural).
 *   Free tier is huge but the account signup is notoriously janky;
 *   if Microsoft blocks you, use elevenlabs.
 *   ENV: AZURE_SPEECH_KEY (required), AZURE_SPEECH_REGION (default westeurope)
 *   Sign up: https://azure.microsoft.com/en-us/free
 *
 * piper (offline, free, no account — not bundled here)
 *   Install: `pip install piper-tts` then download a Serbian voice
 *   from https://huggingface.co/rhasspy/piper-voices
 *   Run manually:
 *     piper --model sr_RS-serbski-medium.onnx --output_file out.mp3 <<< "Volim te."
 *   Then hash the text yourself and place it at public/audio/<hash>.mp3.
 *   No script support yet — open issue if you want it integrated.
 *
 * ─── Usage ─────────────────────────────────────────────────────
 *
 *   ELEVENLABS_API_KEY=xxx npm run generate-audio
 *   ELEVENLABS_API_KEY=xxx npm run generate-audio -- --voice-id <id>
 *   AZURE_SPEECH_KEY=xxx npm run generate-audio -- --provider azure
 *   npm run generate-audio -- --dry-run
 */

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const AUDIO_DIR = join(PROJECT_ROOT, 'public', 'audio');

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  return args[i + 1];
};
const dryRun = args.includes('--dry-run');
const provider = flag('--provider') ?? 'elevenlabs';
const voiceIdArg = flag('--voice-id');

/* ── Provider configs ────────────────────────────────────────────── */

const PROVIDERS = {
  elevenlabs: {
    keyEnv: 'ELEVENLABS_API_KEY',
    /** "Rachel" — the multilingual default. ElevenLabs has more voices
     *  at https://api.elevenlabs.io/v1/voices once authenticated. */
    defaultVoiceId: '21m00Tcm4TlvDq8ikWAM',
    /** Multilingual v2 supports Serbian. v3 ("eleven_v3") is newer with
     *  better prosody — switch when generally available. */
    modelId: 'eleven_multilingual_v2',
    needsRegion: false,
  },
  azure: {
    keyEnv: 'AZURE_SPEECH_KEY',
    defaultVoiceId: 'sr-RS-SophieNeural',
    needsRegion: true,
    regionEnv: 'AZURE_SPEECH_REGION',
    defaultRegion: 'westeurope',
  },
};

const cfg = PROVIDERS[provider];
if (!cfg) {
  console.error(`Unknown provider: ${provider}`);
  console.error(`Known: ${Object.keys(PROVIDERS).join(', ')}`);
  process.exit(1);
}

const KEY = process.env[cfg.keyEnv];
const REGION = cfg.needsRegion
  ? (process.env[cfg.regionEnv] ?? cfg.defaultRegion)
  : undefined;
const VOICE = voiceIdArg ?? cfg.defaultVoiceId;

if (!dryRun && !KEY) {
  console.error(`${cfg.keyEnv} is not set. Run:`);
  console.error(`  ${cfg.keyEnv}=xxx node scripts/generate-audio.mjs`);
  if (provider === 'elevenlabs') {
    console.error('Get a key: https://elevenlabs.io/app/settings/api-keys');
    console.error('Free tier: 10k chars/month — covers the whole corpus.');
  } else if (provider === 'azure') {
    console.error('Get a key: https://azure.microsoft.com/en-us/free');
    console.error('Note: Microsoft\'s free-tier signup is restrictive. Try');
    console.error('  --provider elevenlabs if Azure blocks you.');
  }
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

/* ── Provider-specific generation calls ──────────────────────────── */

async function generateElevenLabs(text, voice) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: PROVIDERS.elevenlabs.modelId,
      voice_settings: {
        // Stability higher → less drift on Serbian. Similarity moderate.
        stability: 0.6,
        similarity_boost: 0.7,
        style: 0.0,
        use_speaker_boost: true,
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ElevenLabs ${res.status} ${res.statusText}: ${body.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function ssmlForAzure(text, voice) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  return `<speak version='1.0' xml:lang='sr-RS'><voice name='${voice}'>${escaped}</voice></speak>`;
}

async function generateAzure(text, voice) {
  const url = `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': KEY,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'iller8/audio-gen',
    },
    body: ssmlForAzure(text, voice),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Azure TTS ${res.status} ${res.statusText}: ${body.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function generate(text, voice) {
  if (provider === 'elevenlabs') return generateElevenLabs(text, voice);
  if (provider === 'azure') return generateAzure(text, voice);
  throw new Error(`No generator for provider: ${provider}`);
}

/* ── Main ────────────────────────────────────────────────────────── */
async function main() {
  console.log(
    `iller8 audio generator (provider: ${provider}, voice: ${VOICE}${dryRun ? ', dry-run' : ''})`
  );
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
    console.log(`Dry-run: not contacting ${provider}.`);
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
    // Be polite — small pause between requests.
    await new Promise((r) => setTimeout(r, provider === 'elevenlabs' ? 120 : 50));
  }

  console.log(`\nDone. Generated ${done}, failed ${failed}, skipped ${skipped}.`);
  console.log(`Audio files in: ${AUDIO_DIR}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
