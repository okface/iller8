#!/usr/bin/env node
// @ts-check
/**
 * Probe Azure for available Serbian / Bosnian / Croatian voices and
 * generate a small set of test clips so the user can A/B before we
 * regenerate the full corpus.
 *
 * Output lands in `public/audio-test/`:
 *   - one MP3 per (voice, test phrase) pair
 *   - an index.html that lists them with <audio> controls
 *
 * Open `dist/audio-test/` after `npm run build`, or in dev just hit
 * /audio-test/ from the dev server.
 *
 * Usage:
 *   AZURE_SPEECH_KEY=xxx AZURE_SPEECH_REGION=swedencentral \
 *     node scripts/probe-voices.mjs
 */

import { writeFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const TEST_DIR = join(PROJECT_ROOT, 'public', 'audio-test');
const REGION = process.env.AZURE_SPEECH_REGION ?? 'westeurope';
const KEY = process.env.AZURE_SPEECH_KEY;

if (!KEY) {
  console.error('AZURE_SPEECH_KEY is not set.');
  process.exit(1);
}

// Test phrases — each has both Latin and Cyrillic variants so we can
// confirm whether Azure's Serbian voice is trained primarily on
// Cyrillic and mispronouncing Latin input (a working hypothesis based
// on the American-accented output the user heard).
const TEST_PHRASES = [
  {
    id: 'pet-name',
    latin: 'Dušo moja, kako si danas?',
    cyrillic: 'Душо моја, како си данас?',
  },
  {
    id: 'longing',
    latin: 'Nedostaješ mi mnogo. Volim te.',
    cyrillic: 'Недостајеш ми много. Волим те.',
  },
  {
    id: 'casual',
    latin: 'Hajde, idemo na kafu.',
    cyrillic: 'Хајде, идемо на кафу.',
  },
];

/** Pull the voice list from Azure for our region and filter to the
 *  language codes we care about. */
async function listVoices() {
  const url = `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/voices/list`;
  const res = await fetch(url, {
    headers: { 'Ocp-Apim-Subscription-Key': KEY },
  });
  if (!res.ok) {
    throw new Error(`Voices list ${res.status}: ${await res.text()}`);
  }
  const all = await res.json();
  // Languages worth testing for Serbian-learning use:
  //   sr-RS — Serbian (Belgrade Ekavian)
  //   sr-Latn-RS — same but Latin-tagged (rare)
  //   bs-BA — Bosnian (mutually intelligible with Serbian)
  //   hr-HR — Croatian (Štokavian — also mutually intelligible)
  //   sr-Cyrl-RS — Cyrillic-tagged Serbian
  const relevant = all.filter((v) =>
    /^(sr-|bs-|hr-)/.test(v.Locale)
  );
  return relevant;
}

function ssml(text, voiceName, locale) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  return `<speak version='1.0' xml:lang='${locale}'><voice name='${voiceName}'>${escaped}</voice></speak>`;
}

async function generate(text, voiceName, locale) {
  const url = `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': KEY,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-48khz-192kbitrate-mono-mp3',
      'User-Agent': 'iller8/probe',
    },
    body: ssml(text, voiceName, locale),
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${await res.text().catch(() => '')}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function safeFilename(voiceName) {
  return voiceName.replace(/[^A-Za-z0-9_-]/g, '_');
}

async function main() {
  console.log(`Probing Azure voices in ${REGION}…`);
  const voices = await listVoices();

  if (voices.length === 0) {
    console.error('No sr/bs/hr voices found. Are you sure the region supports them?');
    process.exit(1);
  }

  console.log(`Found ${voices.length} candidate voices:`);
  for (const v of voices) {
    console.log(`  ${v.ShortName.padEnd(32)} ${v.Locale}  ${v.Gender}  ${v.LocalName}`);
  }

  // Wipe and recreate the test directory.
  await rm(TEST_DIR, { recursive: true, force: true });
  await mkdir(TEST_DIR, { recursive: true });

  const results = [];
  for (const v of voices) {
    for (const phrase of TEST_PHRASES) {
      for (const script of ['latin', 'cyrillic']) {
        const text = phrase[script];
        const filename = `${safeFilename(v.ShortName)}__${phrase.id}__${script}.mp3`;
        const path = join(TEST_DIR, filename);
        try {
          const audio = await generate(text, v.ShortName, v.Locale);
          await writeFile(path, audio);
          results.push({ ok: true, voice: v, phrase, script, filename });
          console.log(`  ✓ ${filename}`);
        } catch (err) {
          results.push({ ok: false, voice: v, phrase, script, error: err.message });
          console.error(`  ✕ ${filename} — ${err.message}`);
        }
        await new Promise((r) => setTimeout(r, 120));
      }
    }
  }

  // Build a static HTML page.
  const successByVoice = new Map();
  for (const r of results) {
    if (!r.ok) continue;
    const list = successByVoice.get(r.voice.ShortName) ?? [];
    list.push(r);
    successByVoice.set(r.voice.ShortName, list);
  }

  const rows = [...successByVoice.entries()]
    .map(([voiceName, rs]) => {
      const v = rs[0].voice;
      const cells = TEST_PHRASES.map((phrase) => {
        const latin = rs.find((x) => x.phrase.id === phrase.id && x.script === 'latin');
        const cyrillic = rs.find((x) => x.phrase.id === phrase.id && x.script === 'cyrillic');
        const renderAudio = (r, label) =>
          r
            ? `<div class="audio-row">
                 <span class="script-tag">${label}</span>
                 <audio controls preload="none" src="${r.filename}"></audio>
               </div>`
            : '<div class="audio-row"><span class="script-tag">—</span></div>';
        return `<td>${renderAudio(latin, 'Lat')}${renderAudio(cyrillic, 'Cyr')}</td>`;
      }).join('');
      return `
        <tr>
          <td>
            <div class="voice-name">${voiceName}</div>
            <div class="voice-meta">${v.Locale} · ${v.Gender}</div>
            <div class="voice-local">${v.LocalName}</div>
          </td>
          ${cells}
        </tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>iller8 — voice test</title>
<style>
  body {
    font-family: -apple-system, system-ui, sans-serif;
    background: #06070d;
    color: #f0f1f8;
    margin: 0;
    padding: 24px;
    max-width: 1000px;
    margin: 0 auto;
  }
  h1 { font-weight: 700; letter-spacing: -0.5px; }
  p { color: #9ca3af; line-height: 1.55; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  th, td {
    padding: 12px;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    text-align: left;
    vertical-align: top;
  }
  th { color: #5a5e72; font-size: 11px; text-transform: uppercase; letter-spacing: 0.7px; font-weight: 500; }
  .voice-name { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #f0f1f8; }
  .voice-meta { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #9ca3af; margin-top: 2px; }
  .voice-local { font-size: 12px; color: #ffc107; font-style: italic; margin-top: 4px; }
  audio { width: 100%; max-width: 220px; }
  .audio-row { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
  .script-tag { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #5a5e72; min-width: 26px; }
  .phrase-header { font-family: serif; font-style: italic; color: #ffc107; font-size: 13px; }
  .phrase-cyr { font-family: serif; color: #9ca3af; font-size: 12px; margin-top: 2px; }
  .nav {
    display: flex;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    margin-bottom: 24px;
  }
  .nav a { color: #9ca3af; text-decoration: none; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
  .nav a:hover { color: #ffc107; }
</style>
</head>
<body>
  <div class="nav">
    <a href="../">← back to iller8</a>
  </div>
  <h1>Voice test</h1>
  <p>Listen to each voice say the same three test phrases. Pick the one that sounds most naturally Serbian.</p>
  <p style="color:#5a5e72; font-size:12px;">Generated ${results.filter((r) => r.ok).length} clips across ${successByVoice.size} voices.</p>

  <table>
    <thead>
      <tr>
        <th>Voice</th>
        ${TEST_PHRASES.map(
          (p) =>
            `<th>
              <div class="phrase-header">"${p.latin}"</div>
              <div class="phrase-cyr">${p.cyrillic}</div>
            </th>`
        ).join('')}
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;

  await writeFile(join(TEST_DIR, 'index.html'), html, 'utf8');
  console.log(`\nWrote ${TEST_DIR}/index.html`);
  console.log(`Open it at: /audio-test/index.html`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
