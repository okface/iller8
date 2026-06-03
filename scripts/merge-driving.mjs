// Merge the base question bank (the original imported 83, ids kor-extra/
// kor-sample/kor-auto) with all generated area files in src/data/driving/gen/*.json
// into the canonical src/data/driving/questions.json.
//
//   node scripts/merge-driving.mjs
//
// Idempotent and gen-authoritative: re-running always reflects the current
// gen/*.json files. Run scripts/validate-driving.mjs afterwards.

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const QFILE = resolve(ROOT, 'src', 'data', 'driving', 'questions.json');
const GENDIR = resolve(ROOT, 'src', 'data', 'driving', 'gen');

const BASE_ID = /^kor-(extra|sample|auto)-/;

// Drop near-duplicate base questions flagged in the gap analysis: the sample
// stopplikt/barn signs duplicate kor-auto-64d1a5 / kor-auto-c284f5, and
// kor-sample-005 duplicates the eco-driving kor-extra-019.
const DROP = new Set(['kor-sample-001', 'kor-sample-002', 'kor-sample-005']);

const current = JSON.parse(readFileSync(QFILE, 'utf8'));
const base = current.filter((q) => BASE_ID.test(q.id) && !DROP.has(q.id));

const gen = [];
if (existsSync(GENDIR)) {
  for (const f of readdirSync(GENDIR).filter((f) => f.endsWith('.json')).sort()) {
    const arr = JSON.parse(readFileSync(resolve(GENDIR, f), 'utf8'));
    if (!Array.isArray(arr)) throw new Error(`${f} is not a JSON array`);
    gen.push(...arr);
  }
}

const merged = [...base, ...gen];

// Guard: no duplicate ids across the whole merged set.
const seen = new Map();
for (const q of merged) {
  if (seen.has(q.id)) throw new Error(`duplicate id ${q.id}`);
  seen.set(q.id, true);
}

writeFileSync(QFILE, JSON.stringify(merged, null, 2) + '\n');

const byTopic = {};
for (const q of merged) byTopic[q.topic] = (byTopic[q.topic] ?? 0) + 1;
console.log(`merged: ${base.length} base + ${gen.length} generated = ${merged.length} total`);
console.log('by topic:', byTopic);
