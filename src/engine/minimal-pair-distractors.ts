import type {
  Phrase,
  ConfusablesData,
  ConfusableVerb,
  ConfusableVerbSet,
  ConfusableNoun,
} from '../store/types';
import confusablesRaw from '../data/confusables.json';
import curatedRaw from '../data/distractors.json';

/**
 * Minimal-pair distractors — "almost right" options.
 *
 * The problem: when the only option containing "coffee" is correct, you pick
 * it without parsing the sentence. The fix: every option shares the answer's
 * core noun(s) and differs on exactly ONE axis — the verb's meaning, its
 * person/tense, or the noun's case ending — so you must actually read it.
 *
 * This engine is intentionally self-contained: it detects the swap anchor by
 * scanning the phrase's Serbian surface tokens against `confusables.json`
 * (the app's Word lexicon is too sparse to rely on). Coverage therefore tracks
 * the curated confusable sets; anything it can't handle returns fewer than
 * `count`, and the caller tops up from the (overlap-aware) pool.
 *
 * Axis is scaled by SRS bucket so early items get easy lexical pairs and
 * mature items get grammatical ones (avoids gotchas on first contact).
 */

const data = confusablesRaw as ConfusablesData;
const MODAL_FRAME = 'modal-da';

/**
 * Optional Claude-authored expansion (the "later" half of the hybrid). When an
 * entry exists for a phrase + field it is preferred over the algorithmic engine.
 * Empty by default; populated offline by scripts/generate-distractors.mjs.
 */
type CuratedField = { text: string; axis?: string }[];
type CuratedMap = Record<
  string,
  Partial<Record<'en' | 'sr_latin' | 'sr_cyrillic', CuratedField>>
>;
const curated = curatedRaw as CuratedMap;

type ScriptKey = 'sr_latin' | 'sr_cyrillic';

interface VerbHit {
  setFrame: string;
  member: ConfusableVerb;
  formTag: string;
  /** The surface that matched, in the script it matched. */
  surface: string;
}

interface NounHit {
  noun: ConfusableNoun;
  caseTag: string;
  surface: string;
}

// ── Indexes: surface (lowercased, either script) → record(s) ──────────────

const verbSetByFrame = new Map<string, ConfusableVerbSet>();
const verbIndex = new Map<string, VerbHit[]>();
for (const set of data.verbSets) {
  verbSetByFrame.set(set.frame, set);
  for (const member of set.members) {
    for (const [formTag, form] of Object.entries(member.forms)) {
      for (const surf of [form.sr_latin, form.sr_cyrillic]) {
        const key = surf.toLowerCase();
        const rec: VerbHit = { setFrame: set.frame, member, formTag, surface: surf };
        const arr = verbIndex.get(key);
        if (arr) arr.push(rec);
        else verbIndex.set(key, [rec]);
      }
    }
  }
}

const nounIndex = new Map<string, NounHit[]>();
for (const noun of data.nouns) {
  for (const [caseTag, form] of Object.entries(noun.forms)) {
    if (!form) continue;
    for (const surf of [form.sr_latin, form.sr_cyrillic]) {
      const key = surf.toLowerCase();
      const rec: NounHit = { noun, caseTag, surface: surf };
      const arr = nounIndex.get(key);
      if (arr) arr.push(rec);
      else nounIndex.set(key, [rec]);
    }
  }
}

// ── Token helpers ──────────────────────────────────────────────────────────

/** Split a token into leading punctuation, the letter core, trailing punctuation. */
function splitToken(tok: string): { lead: string; core: string; trail: string } {
  const m = tok.match(/^([^\p{L}]*)([\p{L}’']*)([^\p{L}]*)$/u);
  if (!m) return { lead: '', core: tok, trail: '' };
  return { lead: m[1], core: m[2], trail: m[3] };
}

function applyCase(template: string, repl: string): string {
  if (!template || !repl) return repl;
  const f = template[0];
  if (f === f.toUpperCase() && f !== f.toLowerCase()) {
    return repl[0].toUpperCase() + repl.slice(1);
  }
  return repl[0].toLowerCase() + repl.slice(1);
}

/** Replace the first whole-word occurrence of `from` with `to`, preserving
 *  surrounding punctuation and the original capitalization. Null if absent. */
function replaceFirst(sentence: string, from: string, to: string): string | null {
  const parts = sentence.split(/(\s+)/);
  for (let i = 0; i < parts.length; i++) {
    if (/^\s*$/.test(parts[i])) continue;
    const { lead, core, trail } = splitToken(parts[i]);
    if (core.toLowerCase() === from.toLowerCase()) {
      parts[i] = lead + applyCase(core, to) + trail;
      return parts.join('');
    }
  }
  return null;
}

function hasToken(sentence: string, word: string): boolean {
  for (const t of sentence.split(/\s+/)) {
    if (splitToken(t).core.toLowerCase() === word.toLowerCase()) return true;
  }
  return false;
}

function coreTokens(sentence: string): string[] {
  return sentence
    .split(/\s+/)
    .map((t) => splitToken(t).core.toLowerCase())
    .filter(Boolean);
}

// ── Detection ────────────────────────────────────────────────────────────

/** Find the verb to pivot on. Prefers the modal-da set when the sentence
 *  has a `da` clause, otherwise prefers a contentful (non-modal) set. */
function detectVerb(phrase: Phrase): VerbHit | null {
  const hasDa = hasToken(phrase.sr_latin, 'da') || hasToken(phrase.sr_cyrillic, 'да');
  for (const field of ['sr_latin', 'sr_cyrillic'] as ScriptKey[]) {
    for (const t of phrase[field].split(/\s+/)) {
      const core = splitToken(t).core.toLowerCase();
      const hits = verbIndex.get(core);
      if (!hits || hits.length === 0) continue;
      const modal = hits.find((h) => h.setFrame === MODAL_FRAME);
      const nonModal = hits.find((h) => h.setFrame !== MODAL_FRAME);
      if (hasDa && modal) return modal;
      if (!hasDa && nonModal) return nonModal;
      return hits[0];
    }
  }
  return null;
}

function detectNoun(phrase: Phrase): NounHit | null {
  for (const field of ['sr_latin', 'sr_cyrillic'] as ScriptKey[]) {
    for (const t of phrase[field].split(/\s+/)) {
      const core = splitToken(t).core.toLowerCase();
      const hits = nounIndex.get(core);
      if (hits && hits.length) return hits[0];
    }
  }
  return null;
}

// ── SR-side generators (return whole-sentence distractors) ──────────────────

function genVerbLemmaSwap(phrase: Phrase, scriptKey: ScriptKey): string[] {
  const hit = detectVerb(phrase);
  if (!hit) return [];
  const set = verbSetByFrame.get(hit.setFrame);
  if (!set) return [];
  // Only swap the verb's MEANING when there's a clear object to anchor on — a
  // da-clause (modal frame) or a known noun. Otherwise we'd get nonsense like
  // "Volim te" → "Jedem te" ("I eat you"). Those fall back to person/pool.
  if (hit.setFrame !== MODAL_FRAME && !detectNoun(phrase)) return [];
  // The word to replace must be in the SAME script as the sentence we're editing.
  const from = hit.member.forms[hit.formTag]?.[scriptKey];
  if (!from) return [];
  const correct = phrase[scriptKey];
  const out: string[] = [];
  for (const m of set.members) {
    if (m.lemma === hit.member.lemma) continue;
    const form = m.forms[hit.formTag];
    if (!form) continue;
    const swapped = replaceFirst(correct, from, form[scriptKey]);
    if (swapped && swapped !== correct) out.push(swapped);
  }
  return out;
}

function genVerbPersonSwap(phrase: Phrase, scriptKey: ScriptKey): string[] {
  const hit = detectVerb(phrase);
  if (!hit) return [];
  const from = hit.member.forms[hit.formTag]?.[scriptKey];
  if (!from) return [];
  const correct = phrase[scriptKey];
  const out: string[] = [];
  for (const [tag, form] of Object.entries(hit.member.forms)) {
    if (tag === hit.formTag) continue;
    const swapped = replaceFirst(correct, from, form[scriptKey]);
    if (swapped && swapped !== correct) out.push(swapped);
  }
  return out;
}

function genNounCaseSwap(phrase: Phrase, scriptKey: ScriptKey): string[] {
  const hit = detectNoun(phrase);
  if (!hit) return [];
  const from = hit.noun.forms[hit.caseTag as keyof ConfusableNoun['forms']]?.[scriptKey];
  if (!from) return [];
  const correct = phrase[scriptKey];
  const out: string[] = [];
  for (const [caseTag, form] of Object.entries(hit.noun.forms)) {
    if (!form || caseTag === hit.caseTag) continue;
    const swapped = replaceFirst(correct, from, form[scriptKey]);
    if (swapped && swapped !== correct) out.push(swapped);
  }
  return out;
}

// ── EN-side generator (swap the English verb gloss, keep the object) ─────────

function genEnglishLemmaSwap(phrase: Phrase): string[] {
  const hit = detectVerb(phrase);
  if (!hit) return [];
  const set = verbSetByFrame.get(hit.setFrame);
  if (!set) return [];
  // The detected verb's gloss must appear as a word in the English so we can
  // swap it cleanly. (e.g. "I want coffee" → swap "want" → like/drink/hate.)
  if (!hasToken(phrase.en, hit.member.en)) return [];
  const out: string[] = [];
  for (const m of set.members) {
    if (m.lemma === hit.member.lemma) continue;
    const swapped = replaceFirst(phrase.en, hit.member.en, m.en);
    if (swapped && swapped !== phrase.en) out.push(swapped);
  }
  return out;
}

// ── Public API ──────────────────────────────────────────────────────────

function dedupe(values: string[], exclude: Set<string>): string[] {
  const seen = new Set(exclude);
  const out: string[] = [];
  for (const v of values) {
    const key = v.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

/**
 * Generate up to `count` minimal-pair distractors for an option set.
 *
 * @param field    'en' for English options; 'sr_latin'/'sr_cyrillic' for Serbian.
 * @param exclude  surfaces that must never appear (correct answer, accepted
 *                 answers, variation surfaces) — the "never also-correct" guard.
 * @param bucket   SRS bucket; scales the axis (lexical → grammatical).
 */
export function minimalPairDistractors(
  phrase: Phrase,
  field: 'en' | 'sr_latin' | 'sr_cyrillic',
  count: number,
  bucket: number,
  exclude: Set<string> = new Set(),
): string[] {
  // Prefer the Claude-authored curated set when present (already verified
  // grammatical + wrong-for-prompt offline).
  const c = curated[phrase.id]?.[field];
  if (c && c.length) {
    const picks = dedupe(c.map((x) => x.text), exclude).slice(0, count);
    if (picks.length) return picks;
  }

  if (field === 'en') {
    return dedupe(genEnglishLemmaSwap(phrase), exclude).slice(0, count);
  }

  const scriptKey = field;
  // Axis priority by maturity: new → lexical (easy to tell once read);
  // familiar → person; strong → case ending. Always backfilled with the
  // others so we still reach `count` when an axis is thin.
  let ordered: string[];
  if (bucket <= 1) {
    ordered = [
      ...genVerbLemmaSwap(phrase, scriptKey),
      ...genVerbPersonSwap(phrase, scriptKey),
      ...genNounCaseSwap(phrase, scriptKey),
    ];
  } else if (bucket <= 3) {
    ordered = [
      ...genVerbPersonSwap(phrase, scriptKey),
      ...genVerbLemmaSwap(phrase, scriptKey),
      ...genNounCaseSwap(phrase, scriptKey),
    ];
  } else {
    ordered = [
      ...genNounCaseSwap(phrase, scriptKey),
      ...genVerbPersonSwap(phrase, scriptKey),
      ...genVerbLemmaSwap(phrase, scriptKey),
    ];
  }
  return dedupe(ordered, exclude).slice(0, count);
}

/**
 * Single-word minimal-pair tiles for the sentence-builder: wrong-form variants
 * of words actually in the phrase (a verb in the wrong person, the noun in the
 * wrong case). These are grammatical traps — far better than random words.
 */
export function minimalPairWords(
  phrase: Phrase,
  script: 'latin' | 'cyrillic',
  count: number,
  exclude: Set<string> = new Set(),
): string[] {
  const scriptKey: ScriptKey = script === 'cyrillic' ? 'sr_cyrillic' : 'sr_latin';
  const out: string[] = [];

  const vhit = detectVerb(phrase);
  if (vhit) {
    for (const [tag, form] of Object.entries(vhit.member.forms)) {
      if (tag === vhit.formTag) continue;
      out.push(form[scriptKey]);
    }
  }
  const nhit = detectNoun(phrase);
  if (nhit) {
    for (const [caseTag, form] of Object.entries(nhit.noun.forms)) {
      if (!form || caseTag === nhit.caseTag) continue;
      out.push(form[scriptKey]);
    }
  }

  // Never offer a tile that's already a correct token of the phrase.
  const present = new Set(coreTokens(phrase[scriptKey]));
  const filtered = out.filter((w) => !present.has(w.toLowerCase()));
  return dedupe(filtered, exclude).slice(0, count);
}
