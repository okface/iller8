// One-shot dev tool: import the körkortsteori (Swedish driving-theory)
// questions from the sibling iller7 repo into iller8 as committed static JSON.
//
//   node scripts/import-driving.mjs
//
// Source: ../iller7/public/content.json (already bundled from the YAML files).
// We keep questions in Swedish as-is — this is a separate track from the
// Serbian content. Run once; commit the output. Never imported by app code.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ILLER7 = resolve(ROOT, '..', 'iller7');

const CONTENT = resolve(ILLER7, 'public', 'content.json');
const ASSETS = resolve(ILLER7, 'public', 'assets');
const OUT = resolve(ROOT, 'src', 'data', 'driving', 'questions.json');

// Two questions reference .png filenames that never existed; the equivalent
// SVGs are present in iller7/public/assets. Remap them.
const IMAGE_REMAP = {
  'vagmarke_barn.png': 'varning_for_barn.svg',
  'vagmarke_stopplikt.png': 'vagmarke_stopplikt.svg',
};

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (!existsSync(CONTENT)) fail(`Source not found: ${CONTENT}`);
const content = JSON.parse(readFileSync(CONTENT, 'utf8'));
const assetFiles = new Set(existsSync(ASSETS) ? readdirSync(ASSETS) : []);

const raw = (content.questions ?? []).filter(
  (q) => typeof q.source === 'string' && q.source.startsWith('korkortsteori/'),
);

const questions = raw.map((q) => {
  let image = q.image ?? null;
  if (image && IMAGE_REMAP[image]) image = IMAGE_REMAP[image];
  return {
    id: q.id,
    topic: q.source.split('/')[1],
    tags: Array.isArray(q.tags) ? q.tags : [],
    question: q.question,
    image,
    options: (q.options ?? []).map((o) => ({
      text: o.text,
      correct: !!o.correct,
      feedback: o.feedback ?? '',
    })),
    explanation: q.explanation ?? '',
  };
});

// --- assertions: fail loud rather than ship broken data ---
if (questions.length === 0) fail('No körkortsteori questions found.');

for (const q of questions) {
  const nCorrect = q.options.filter((o) => o.correct).length;
  if (nCorrect !== 1) fail(`Question ${q.id} has ${nCorrect} correct options (expected 1).`);
  // The UI (MCOptionList) labels options A–D; enforce the 4-option contract.
  if (q.options.length !== 4) fail(`Question ${q.id} has ${q.options.length} options (expected 4).`);
  if (q.image) {
    if (q.image.endsWith('.png')) fail(`Question ${q.id} still references a .png: ${q.image}`);
    if (!assetFiles.has(q.image)) fail(`Question ${q.id} image missing in assets: ${q.image}`);
  }
}

const byTopic = {};
for (const q of questions) byTopic[q.topic] = (byTopic[q.topic] ?? 0) + 1;
const withImage = questions.filter((q) => q.image).length;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(questions, null, 2) + '\n');

console.log(`✓ ${questions.length} questions written to src/data/driving/questions.json`);
console.log(`  topics: ${JSON.stringify(byTopic)}`);
console.log(`  with image: ${withImage}, text-only: ${questions.length - withImage}`);
console.log(`  all images resolve, exactly one correct option each.`);
