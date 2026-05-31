// Heuristic phrase tagger → generates src/data/phrase-meta.json
//
// Derives a difficulty + grammar stage for every phrase, mostly from the
// existing `wordRefs` (case + verb-form tags), with a light token fallback for
// phrases that aren't tagged yet. The long tail can be refined later by Claude
// (scripts/generate-distractors.mjs --tag) or by hand.
//
// Run:  node scripts/tag-phrases.mjs
//
// Keep the stage mapping in sync with src/data/grammar-stages.ts (stageForFeatures).

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LESSONS_DIR = join(__dirname, '..', 'src', 'data', 'lessons');
const OUT = join(__dirname, '..', 'src', 'data', 'phrase-meta.json');

const CASE_RANK = { nom: 0, voc: 0, acc: 1, gen: 2, dat: 3, loc: 3, ins: 4 };

// Object-pronoun clitics — accusative ones are learned early as chunks (don't
// bump the accusative *stage*), but dative ones ARE the experiencer construction.
const ACC_PRONOUNS = new Set(['me', 'te', 'ga', 'je', 'nas', 'vas', 'ih', 'se', 'me-acc', 'te-acc', 'ga-acc', 'nas-acc', 'vas-acc']);

const CLITICS = new Set([
  'sam', 'si', 'je', 'smo', 'ste', 'su',
  'ću', 'ćeš', 'će', 'ćemo', 'ćete',
  'bih', 'bi', 'bismo', 'biste',
  'mi', 'ti', 'mu', 'joj', 'nam', 'vam', 'im',
  'me', 'te', 'ga', 'nas', 'vas', 'ih', 'se', 'li',
]);

const AUX_PAST = new Set(['sam', 'si', 'je', 'smo', 'ste', 'su']);
const AUX_FUT = new Set(['ću', 'ćeš', 'će', 'ćemo', 'ćete']);

function tokens(s) {
  return s
    .replace(/[.!?,;:'"()]/g, '')
    .split(/\s+/)
    .map((t) => t.toLowerCase())
    .filter(Boolean);
}

function refId(ref) {
  return typeof ref === 'string' ? ref : ref.id;
}

function looksLikeParticiple(tok) {
  return tok.length > 3 && /(o|la|lo|li|le)$/.test(tok);
}

// Keep in sync with grammar-stages.ts
function stageForFeatures(features) {
  if (features.includes('chunk')) return 0;
  const map = [
    [8, ['aspect', 'complex']],
    [7, ['clitic-cluster']],
    [6, ['locative', 'instrumental']],
    [5, ['dative']],
    [4, ['past', 'future']],
    [3, ['genitive']],
    [2, ['accusative']],
    [1, ['present']],
  ];
  for (const [id, fs] of map) {
    if (fs.some((f) => features.includes(f))) return id;
  }
  return 1;
}

function difficultyBand(d) {
  if (d < 2) return 1;
  if (d < 3.5) return 2;
  if (d < 5) return 3;
  if (d < 6.5) return 4;
  if (d < 8) return 5;
  return 6;
}

function tagPhrase(phrase) {
  const toks = tokens(phrase.sr_latin);
  const refs = phrase.wordRefs ?? [];
  const hasRefs = refs.length > 0;

  // ── cases (from wordRefs) ──
  const caseSet = [];
  let hasNounAcc = false;
  let hasDat = false;
  for (const ref of refs) {
    if (typeof ref === 'string') continue;
    if (ref.case) {
      if (!caseSet.includes(ref.case)) caseSet.push(ref.case);
      if (ref.case === 'acc' && !ACC_PRONOUNS.has(refId(ref).toLowerCase())) hasNounAcc = true;
      if (ref.case === 'dat') hasDat = true;
    }
  }

  // ── tense (from wordRefs forms, else token scan) ──
  let tense = 'none';
  for (const ref of refs) {
    if (typeof ref === 'string') continue;
    const f = ref.form ?? '';
    if (f.includes('past')) tense = 'past';
    else if (f.includes('fut') && tense === 'none') tense = 'fut';
    else if (f.includes('imp') && tense === 'none') tense = 'imp';
    else if (f.includes('pres') && tense === 'none') tense = 'pres';
  }
  if (tense === 'none') {
    const tset = new Set(toks);
    if ([...tset].some((t) => AUX_FUT.has(t))) tense = 'fut';
    else if ([...tset].some((t) => AUX_PAST.has(t)) && toks.some(looksLikeParticiple)) tense = 'past';
  }

  // ── clitics ──
  const cliticCount = toks.filter((t) => CLITICS.has(t)).length;

  // ── chunk heuristic: short fixed expressions ──
  const isChunk = toks.length <= 2 && !hasNounAcc && tense !== 'past';

  const idiomatic = false; // refined by the Claude pass later

  // ── features → stage ──
  const features = [];
  if (isChunk) {
    features.push('chunk');
  } else {
    if (tense === 'pres') features.push('present');
    if (tense === 'past') features.push('past');
    if (tense === 'fut') features.push('future');
    if (tense === 'imp' && !features.length) features.push('present');
    if (hasNounAcc) features.push('accusative');
    if (caseSet.includes('gen')) features.push('genitive');
    if (hasDat) features.push('dative');
    if (caseSet.includes('loc')) features.push('locative');
    if (caseSet.includes('ins')) features.push('instrumental');
    if (cliticCount >= 2) features.push('clitic-cluster');
    if (!features.length) features.push('present');
  }

  // ── difficulty scalar ──
  const maxCaseRank = caseSet.reduce((m, c) => Math.max(m, CASE_RANK[c] ?? 0), 0);
  const tenseLoad = tense === 'past' ? 2 : tense === 'fut' ? 1.5 : tense === 'imp' ? 1 : tense === 'pres' ? 0.5 : 0;
  const cliticLoad = Math.min(cliticCount, 3) * 0.7;
  const lengthLoad = toks.length * 0.4;
  const idiomaticLoad = idiomatic ? 2 : 0;
  let difficulty = maxCaseRank * 1.2 + tenseLoad + cliticLoad + lengthLoad + idiomaticLoad;
  if (isChunk) difficulty = Math.min(difficulty, 1.5);
  difficulty = Math.round(difficulty * 10) / 10;

  // Stage from features; floor by difficulty band so long/clitic-heavy phrases
  // that lack rich wordRefs don't all collapse into the easy stages.
  let stage = stageForFeatures(features);
  if (!isChunk) stage = Math.max(stage, difficultyBand(difficulty));

  return {
    stage,
    difficulty,
    isChunk,
    caseSet,
    tense,
    cliticCount,
    idiomatic,
    source: hasRefs ? 'wordrefs' : 'heuristic',
  };
}

function main() {
  const files = readdirSync(LESSONS_DIR).filter((f) => /^\d+.*\.json$/.test(f)).sort();
  const meta = {};
  let count = 0;
  let withRefs = 0;
  for (const file of files) {
    const lesson = JSON.parse(readFileSync(join(LESSONS_DIR, file), 'utf8'));
    for (const group of lesson.phraseGroups ?? []) {
      for (const phrase of group.phrases ?? []) {
        meta[phrase.id] = tagPhrase(phrase);
        count++;
        if (meta[phrase.id].source === 'wordrefs') withRefs++;
      }
    }
  }
  writeFileSync(OUT, JSON.stringify(meta, null, 2) + '\n', 'utf8');

  // Stage histogram for a sanity check.
  const hist = {};
  for (const m of Object.values(meta)) hist[m.stage] = (hist[m.stage] ?? 0) + 1;
  console.log(`Tagged ${count} phrases (${withRefs} from wordRefs) → ${OUT}`);
  console.log('Stage histogram:', hist);
}

main();
