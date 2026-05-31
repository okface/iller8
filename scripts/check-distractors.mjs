// Quick sanity check for the minimal-pair engine's DATA + core swap logic.
// Mirrors src/engine/minimal-pair-distractors.ts closely enough to eyeball that
// confusables.json yields good "almost right" options. Not a substitute for the
// app — just a fast confidence check. Run: node scripts/check-distractors.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(__dirname, '..', 'src', 'data', 'confusables.json'), 'utf8'));

const MODAL_FRAME = 'modal-da';
const verbIndex = new Map();
const setByFrame = new Map();
for (const set of data.verbSets) {
  setByFrame.set(set.frame, set);
  for (const member of set.members) {
    for (const [formTag, form] of Object.entries(member.forms)) {
      for (const surf of [form.sr_latin, form.sr_cyrillic]) {
        const rec = { setFrame: set.frame, member, formTag };
        const k = surf.toLowerCase();
        const arr = verbIndex.get(k);
        if (arr) arr.push(rec);
        else verbIndex.set(k, [rec]);
      }
    }
  }
}

function splitToken(tok) {
  const m = tok.match(/^([^\p{L}]*)([\p{L}’']*)([^\p{L}]*)$/u);
  return m ? { lead: m[1], core: m[2], trail: m[3] } : { lead: '', core: tok, trail: '' };
}
function applyCase(t, r) {
  if (!t || !r) return r;
  const f = t[0];
  return f === f.toUpperCase() && f !== f.toLowerCase() ? r[0].toUpperCase() + r.slice(1) : r;
}
function replaceFirst(s, from, to) {
  const parts = s.split(/(\s+)/);
  for (let i = 0; i < parts.length; i++) {
    if (/^\s*$/.test(parts[i])) continue;
    const { lead, core, trail } = splitToken(parts[i]);
    if (core.toLowerCase() === from.toLowerCase()) { parts[i] = lead + applyCase(core, to) + trail; return parts.join(''); }
  }
  return null;
}
function hasToken(s, w) {
  return s.split(/\s+/).some((t) => splitToken(t).core.toLowerCase() === w.toLowerCase());
}
const nounSurfaces = new Set();
for (const n of data.nouns) for (const f of Object.values(n.forms)) if (f) nounSurfaces.add(f.sr_latin.toLowerCase());
function detectNoun(latin) {
  return latin.split(/\s+/).some((t) => nounSurfaces.has(splitToken(t).core.toLowerCase()));
}
function detectVerb(latin) {
  const hasDa = hasToken(latin, 'da');
  for (const t of latin.split(/\s+/)) {
    const hits = verbIndex.get(splitToken(t).core.toLowerCase());
    if (!hits) continue;
    const modal = hits.find((h) => h.setFrame === MODAL_FRAME);
    const non = hits.find((h) => h.setFrame !== MODAL_FRAME);
    return hasDa && modal ? modal : !hasDa && non ? non : hits[0];
  }
  return null;
}
function lemmaSwap(latin) {
  const hit = detectVerb(latin);
  if (!hit) return [];
  if (hit.setFrame !== MODAL_FRAME && !detectNoun(latin)) return [];
  const from = hit.member.forms[hit.formTag].sr_latin;
  const out = [];
  for (const m of setByFrame.get(hit.setFrame).members) {
    if (m.lemma === hit.member.lemma) continue;
    const f = m.forms[hit.formTag];
    if (!f) continue;
    const s = replaceFirst(latin, from, f.sr_latin);
    if (s && s !== latin) out.push(`${s}  [${m.en}]`);
  }
  return out.slice(0, 3);
}

for (const ex of ['Hoću kafu.', 'Hoću da spavam.', 'Volim te.', 'Idem kući.', 'Treba da idem.']) {
  console.log(`\n${ex}`);
  const d = lemmaSwap(ex);
  if (d.length) d.forEach((x) => console.log('   ↳', x));
  else console.log('   (no minimal pair — pool fallback)');
}
