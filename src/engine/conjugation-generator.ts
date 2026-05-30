import type { Exercise, Phrase, Word, WordForm } from '../store/types';
import { getWordById } from '../data/words';
import {
  CONJUGATION_VERBS,
  PERSONS,
  PERSON_BY_TAG,
  IMPERFECTIVE_PRESENT,
  NO_CONTINUOUS_NOTE,
  type ConjPerson,
} from '../data/grammar/conjugation';

/**
 * Conjugation drill: produce a verb's form for a given person ("she eats"
 * → `jede`). Distractors are the OTHER persons of the SAME verb, so the
 * learner discriminates the ending, not the meaning. Keyed
 * `conj:<verbId>:<personTag>` in the one SRS map. See GRAMMAR_DESIGN.md.
 */

const CONJ_PREFIX = 'conj:';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Synthesize a Phrase from (verb, form) so SRS / retry / stats / audio
 *  work unchanged. Audio is keyed by sr_latin (the form). */
function conjAsPhrase(verb: Word, form: WordForm): Phrase {
  return {
    id: `${CONJ_PREFIX}${verb.id}:${form.tag}`,
    sr_latin: form.sr_latin,
    sr_cyrillic: form.sr_cyrillic,
    en: form.en ?? verb.gloss_en,
    context: `${verb.lemma_sr_latin} · ${form.tag}`,
    notes: verb.notes,
  };
}

function presentForms(verb: Word): WordForm[] {
  return (verb.forms ?? []).filter((f) => f.tag.endsWith('.pres'));
}

/** Build a conjugation exercise for one (verb, person) cell. */
export function generateConjugate(
  verb: Word,
  form: WordForm,
  person: ConjPerson,
  script: 'latin' | 'cyrillic',
  multipleChoice: boolean
): Exercise {
  const sr = (f: WordForm) => (script === 'cyrillic' ? f.sr_cyrillic : f.sr_latin);
  const correct = sr(form);

  let options: string[] | undefined;
  if (multipleChoice) {
    const siblings = presentForms(verb)
      .filter((f) => f.tag !== form.tag)
      .map(sr)
      .filter((s) => s !== correct);
    options = shuffle([correct, ...shuffle(siblings).slice(0, 3)]);
  }

  const note = IMPERFECTIVE_PRESENT.has(verb.id)
    ? `${NO_CONTINUOUS_NOTE}${verb.notes ? ' ' + verb.notes : ''}`
    : verb.notes;

  return {
    type: 'conjugate',
    phrase: conjAsPhrase(verb, form),
    direction: 'en-to-sr',
    prompt: form.en ?? `${person.enSubject} — ${verb.gloss_en}`,
    correctAnswer: correct,
    options,
    // The pronoun frame (faded, droppable) shown above the answer.
    baseSrLatin: person.sr_latin,
    baseSrCyrillic: person.sr_cyrillic,
    baseEn: verb.gloss_en,
    transformLabel: `${verb.lemma_sr_latin} · ${person.enSubject}`,
    grammarNote: note,
  };
}

/** Build a conjugation exercise from its SRS key (`conj:<verbId>:<tag>`). */
export function generateConjugateFromKey(
  key: string,
  bucket: number,
  script: 'latin' | 'cyrillic'
): Exercise | null {
  if (!key.startsWith(CONJ_PREFIX)) return null;
  const rest = key.slice(CONJ_PREFIX.length);
  const sep = rest.indexOf(':');
  if (sep < 0) return null;
  const verbId = rest.slice(0, sep);
  const tag = rest.slice(sep + 1);
  const verb = getWordById(verbId);
  const person = PERSON_BY_TAG[tag];
  if (!verb || !person) return null;
  const form = (verb.forms ?? []).find((f) => f.tag === tag);
  if (!form) return null;
  // MC while learning the cell; type-it once it's sticking (bucket ≥ 2).
  return generateConjugate(verb, form, person, script, bucket < 2);
}

/**
 * All conjugation cells whose lemma the learner has met (word bucket ≥ 1).
 * Used by the daily session's new-item pool. Ordered by verb teaching
 * order then person order so `jedem` precedes `jedeš`.
 */
export function conjugationCellsForProgress(
  getWordBucket: (wordId: string) => number
): string[] {
  const cells: string[] = [];
  for (const verbId of CONJUGATION_VERBS) {
    if (getWordBucket(verbId) < 1) continue; // lemma not met yet — gated
    const verb = getWordById(verbId);
    if (!verb) continue;
    const have = new Set((verb.forms ?? []).map((f) => f.tag));
    for (const person of PERSONS) {
      if (have.has(person.tag)) cells.push(`${CONJ_PREFIX}${verbId}:${person.tag}`);
    }
  }
  return cells;
}

export { CONJ_PREFIX };
