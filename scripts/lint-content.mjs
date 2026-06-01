// Mechanical content linter — enforces the RIGID RULES appendix of CONTENT_SPEC.md.
// Run: node scripts/lint-content.mjs            (report)
//      node scripts/lint-content.mjs --strict   (exit 1 on any ERROR)
//
// Checks are intentionally conservative: ERRORs are hard rule violations, WARNs
// are "should fix" (e.g. missing notes, empty wordRefs on a multi-word phrase).

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LESSONS_DIR = join(__dirname, '..', 'src', 'data', 'lessons');
const WORDS_PATH = join(__dirname, '..', 'src', 'data', 'words', 'words.json');

const STRICT = process.argv.includes('--strict');

// Known lemma ids (for wordRefs existence check).
let knownLemmas = new Set();
try {
  const words = JSON.parse(readFileSync(WORDS_PATH, 'utf8'));
  knownLemmas = new Set(words.map((w) => w.id));
} catch {
  console.log('(could not read words.json — skipping lemma-existence check)');
}

const GLOSS_VOCAB = new Set([
  'to a man', 'to a woman',
  'said by a man', 'said by a woman',
  'very casual', 'slang', 'formal',
  'another way to say it', 'the required response',
]);
// `lit. '...'` is also allowed (checked by prefix).

const errors = [];
const warns = [];
const err = (id, msg) => errors.push(`  ERROR ${id}: ${msg}`);
const warn = (id, msg) => warns.push(`  warn  ${id}: ${msg}`);

function lastChar(s) {
  const t = (s || '').trim();
  return t.charAt(t.length - 1);
}
function wordCount(s) {
  return s.trim().replace(/[.!?,;:()"']/g, '').split(/\s+/).filter(Boolean).length;
}

function checkPhrase(p, file) {
  const id = p.id;

  // en
  if (!p.en) err(id, 'missing en');
  else {
    const alts = p.en.split('/').map((a) => a.trim());
    if (p.en.length > 60) warn(id, `en > 60 chars (${p.en.length})`);
    if (alts.length > 3) warn(id, `en has ${alts.length} slash-alternatives (>3)`);
    if (/\([^)]*\)/.test(p.en)) err(id, 'en contains a parenthetical (move to gloss_hint)');
    for (const a of alts) if (wordCount(a) > 8) warn(id, `en alternative > 8 words: "${a}"`);
  }

  // context
  if (!p.context) err(id, 'missing context');
  else {
    const c = p.context.trim();
    if (c.length > 120) err(id, `context > 120 chars (${c.length})`);
    if (c.length < 40) warn(id, `context < 40 chars (${c.length}) — likely too thin`);
    if (lastChar(c) === '?') err(id, 'context ends with "?" (must be a situation ending ".")');
    if (/^when\b/i.test(c)) err(id, 'context starts with "When" (definition frame — make it 2nd-person)');
    if (/\bone word\b|\btwo words?\b|\bone-word\b|\(slang\)|\(youth slang\)|short for/i.test(c))
      err(id, 'context leaks form/register ("one word"/"(slang)"/"short for")');
  }

  // notes
  if (!p.notes) warn(id, 'no notes (target 100% coverage)');
  else {
    const n = p.notes;
    if (n.length > 220) warn(id, `notes > 220 chars (${n.length})`);
    if (n.includes('"')) err(id, 'notes contains a double quote (use single quotes for Serbian words)');
    if (/\blit:\b/.test(n)) warn(id, 'notes uses "lit:" (prefer "lit.")');
  }

  // gloss_hint
  if (p.gloss_hint) {
    const g = p.gloss_hint;
    if (g.length > 28) warn(id, `gloss_hint > 28 chars (${g.length})`);
    if (/[()]/.test(g)) err(id, 'gloss_hint contains parentheses (UI adds them)');
    if (/[.!?]$/.test(g.trim())) warn(id, 'gloss_hint has terminal punctuation');
    const ok = GLOSS_VOCAB.has(g.trim()) || /^lit\. '.+'$/.test(g.trim());
    if (!ok) warn(id, `gloss_hint not in closed vocabulary: "${g}"`);
  }

  // wordRefs
  const refs = p.wordRefs;
  if (!Array.isArray(refs)) {
    warn(id, 'no wordRefs array');
  } else if (refs.length === 0) {
    if (wordCount(p.sr_latin) >= 2) warn(id, 'wordRefs: [] on a multi-word phrase (disables gating + teaching)');
  } else {
    for (const r of refs) {
      const rid = typeof r === 'string' ? r : r.id;
      if (knownLemmas.size && !knownLemmas.has(rid)) warn(id, `wordRef id not in words.json: "${rid}"`);
      if (typeof r === 'object' && r.surface && !r.case && !r.form)
        warn(id, `wordRef "${rid}" has surface but no case/form (may mis-stage)`);
    }
  }

  // variations
  if (Array.isArray(p.variations)) {
    for (const v of p.variations) {
      if (!v.gloss_hint) warn(id, 'variation missing gloss_hint');
    }
  }
}

const files = readdirSync(LESSONS_DIR).filter((f) => /^\d+.*\.json$/.test(f)).sort();
let total = 0;
for (const file of files) {
  let lesson;
  try {
    lesson = JSON.parse(readFileSync(join(LESSONS_DIR, file), 'utf8'));
  } catch (e) {
    errors.push(`  ERROR ${file}: invalid JSON — ${e.message}`);
    continue;
  }
  for (const g of lesson.phraseGroups ?? []) {
    for (const p of g.phrases ?? []) {
      checkPhrase(p, file);
      total++;
    }
  }
}

console.log(`\nLinted ${total} phrases across ${files.length} lessons.`);
console.log(`${errors.length} errors, ${warns.length} warnings.\n`);
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
if (warns.length) console.log('\nWARNINGS:\n' + warns.join('\n'));
if (STRICT && errors.length) process.exit(1);
