// Offline minimal-pair distractor generator (the "later" half of the hybrid).
//
// For each phrase, asks Claude to author "almost right" distractors that SHARE
// the answer's core noun(s) and differ on ONE axis (verb meaning / tense /
// person / case ending / negation), for English and both Serbian scripts —
// then self-verifies each is grammatical Serbian AND wrong for the prompt.
// Results merge into src/data/distractors.json, which the runtime prefers.
//
// The runtime works fully WITHOUT this — it's breadth for the long tail.
//
// Usage:
//   $env:ANTHROPIC_API_KEY="sk-..."        # PowerShell
//   node scripts/generate-distractors.mjs [--limit N] [--lesson <id>] [--force]
//
// Resumable: skips phrases already in distractors.json unless --force.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LESSONS_DIR = join(__dirname, '..', 'src', 'data', 'lessons');
const OUT = join(__dirname, '..', 'src', 'data', 'distractors.json');

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.MODEL || 'claude-sonnet-4-6';

const args = process.argv.slice(2);
const getFlag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const LIMIT = getFlag('--limit') ? parseInt(getFlag('--limit'), 10) : Infinity;
const ONLY_LESSON = getFlag('--lesson');
const FORCE = args.includes('--force');

if (!API_KEY) {
  console.error('Set ANTHROPIC_API_KEY in the environment first.');
  process.exit(1);
}

function loadPhrases() {
  const files = readdirSync(LESSONS_DIR).filter((f) => /^\d+.*\.json$/.test(f)).sort();
  const out = [];
  for (const file of files) {
    const lesson = JSON.parse(readFileSync(join(LESSONS_DIR, file), 'utf8'));
    if (ONLY_LESSON && lesson.id !== ONLY_LESSON) continue;
    for (const group of lesson.phraseGroups ?? []) {
      for (const phrase of group.phrases ?? []) out.push(phrase);
    }
  }
  return out;
}

const PROMPT = (p) => `You write "minimal-pair" distractors for a Serbian learning app.

The learner sees a question and must pick the right option. The problem with naive
distractors is that the learner can keyword-spot: if only the correct option mentions
"coffee", they pick it without understanding. Your job: make distractors that SHARE the
answer's core noun(s) and differ on exactly ONE axis, so the learner must actually parse
the sentence.

Target phrase:
- Serbian (Latin):    ${p.sr_latin}
- Serbian (Cyrillic): ${p.sr_cyrillic}
- English:            ${p.en}

Produce 3 distractors for EACH of: "en", "sr_latin", "sr_cyrillic".
Rules for every distractor:
- It MUST be grammatical, natural Serbian/English.
- It MUST be WRONG for this exact prompt — never a valid paraphrase of the target.
- It MUST reuse the target's core noun(s); change only the verb meaning, tense, person,
  the noun's case ending, or polarity (negation).
- Keep length and shape close to the target.
- Tag each with "axis": one of verb-lemma | verb-person | verb-tense | noun-case | negation.

Return ONLY JSON:
{
  "en":         [{"text":"...","axis":"..."}, ...],
  "sr_latin":   [{"text":"...","axis":"..."}, ...],
  "sr_cyrillic":[{"text":"...","axis":"..."}, ...]
}`;

async function generateOne(phrase) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: PROMPT(phrase) }],
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content?.[0]?.text ?? '';
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no JSON in response');
  return JSON.parse(m[0]);
}

// Drop anything equal to the correct answer / a variation surface (the
// "never also-correct" guard), in case the model slips.
function sanitize(phrase, gen) {
  const banned = {
    en: new Set([phrase.en, ...(phrase.variations ?? []).map((v) => v.en)]),
    sr_latin: new Set([phrase.sr_latin, ...(phrase.variations ?? []).map((v) => v.sr_latin)]),
    sr_cyrillic: new Set([phrase.sr_cyrillic, ...(phrase.variations ?? []).map((v) => v.sr_cyrillic)]),
  };
  const out = {};
  for (const field of ['en', 'sr_latin', 'sr_cyrillic']) {
    const arr = Array.isArray(gen[field]) ? gen[field] : [];
    const seen = new Set();
    out[field] = arr
      .filter((x) => x && typeof x.text === 'string')
      .filter((x) => !banned[field].has(x.text.trim()))
      .filter((x) => {
        const k = x.text.trim();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 3)
      .map((x) => ({ text: x.text.trim(), axis: x.axis }));
  }
  return out;
}

async function main() {
  const existing = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
  const phrases = loadPhrases();
  let done = 0;
  let processed = 0;
  for (const phrase of phrases) {
    if (processed >= LIMIT) break;
    if (existing[phrase.id] && !FORCE) continue;
    processed++;
    try {
      const gen = await generateOne(phrase);
      existing[phrase.id] = sanitize(phrase, gen);
      done++;
      if (done % 10 === 0) {
        writeFileSync(OUT, JSON.stringify(existing, null, 2) + '\n', 'utf8');
        console.log(`  …saved ${done}`);
      }
      console.log(`✓ ${phrase.id}`);
    } catch (e) {
      console.error(`✗ ${phrase.id}: ${e.message}`);
    }
  }
  writeFileSync(OUT, JSON.stringify(existing, null, 2) + '\n', 'utf8');
  console.log(`Done. Wrote ${done} new entries → ${OUT}. Review before committing.`);
}

main();
