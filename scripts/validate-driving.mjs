// Validate the committed driving question bank. Run after any edit/merge:
//   node scripts/validate-driving.mjs
// Checks the whole src/data/driving/questions.json plus image presence.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const QFILE = resolve(ROOT, 'src', 'data', 'driving', 'questions.json');
const SIGNS = resolve(ROOT, 'public', 'driving-signs');

// The five official Trafikverket knowledge areas (our `topic` values).
const TOPICS = new Set(['trafikregler', 'trafiksakerhet', 'fordonskannedom', 'miljo', 'personliga_forutsattningar']);

const errors = [];
const warnings = [];
const q = JSON.parse(readFileSync(QFILE, 'utf8'));
const signFiles = new Set(existsSync(SIGNS) ? readdirSync(SIGNS) : []);

const ids = new Set();
const byTopic = {};
let withImage = 0;
const usedImages = new Set();

for (const [i, item] of q.entries()) {
  const at = `#${i} (${item.id ?? '??'})`;
  if (!item.id) errors.push(`${at}: missing id`);
  if (ids.has(item.id)) errors.push(`${at}: duplicate id`);
  ids.add(item.id);
  if (!TOPICS.has(item.topic)) errors.push(`${at}: bad topic '${item.topic}'`);
  byTopic[item.topic] = (byTopic[item.topic] ?? 0) + 1;
  if (!item.question || !item.question.trim()) errors.push(`${at}: empty question`);
  if (!Array.isArray(item.tags) || item.tags.length === 0) warnings.push(`${at}: no tags`);
  if (!item.explanation || !item.explanation.trim()) errors.push(`${at}: empty explanation`);

  const opts = item.options ?? [];
  if (opts.length !== 4) errors.push(`${at}: ${opts.length} options (expected 4)`);
  const nCorrect = opts.filter((o) => o.correct).length;
  if (nCorrect !== 1) errors.push(`${at}: ${nCorrect} correct (expected 1)`);
  const texts = new Set();
  for (const o of opts) {
    if (!o.text || !o.text.trim()) errors.push(`${at}: empty option text`);
    if (texts.has(o.text)) errors.push(`${at}: duplicate option '${o.text}'`);
    texts.add(o.text);
    if (!o.feedback || !o.feedback.trim()) warnings.push(`${at}: option '${o.text}' has no feedback`);
  }

  if (item.image) {
    withImage++;
    usedImages.add(item.image);
    if (item.image.endsWith('.png')) errors.push(`${at}: .png image '${item.image}' (use svg)`);
    if (!signFiles.has(item.image)) errors.push(`${at}: image missing in driving-signs/: ${item.image}`);
  }
}

// Orphan images (present but unreferenced) — informational only.
const orphans = [...signFiles].filter((f) => f.endsWith('.svg') && !usedImages.has(f));

console.log(`questions: ${q.length}`);
console.log(`by topic:`, byTopic);
console.log(`with image: ${withImage}, text-only: ${q.length - withImage}, unique images used: ${usedImages.size}`);
if (orphans.length) console.log(`note: ${orphans.length} unused sign files (ok): ${orphans.slice(0, 8).join(', ')}${orphans.length > 8 ? '…' : ''}`);
if (warnings.length) console.log(`\n${warnings.length} warning(s):\n  ` + warnings.slice(0, 20).join('\n  '));

if (errors.length) {
  console.error(`\n✗ ${errors.length} ERROR(S):\n  ` + errors.join('\n  '));
  process.exit(1);
}
console.log(`\n✓ all checks passed`);
