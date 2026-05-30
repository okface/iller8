/**
 * Conjugation drill config. The actual forms live in words.json (each
 * verb's `forms` array carries 1sg…3pl present with English glosses) —
 * this just declares WHICH verbs to drill and how to render each person.
 * See GRAMMAR_DESIGN.md.
 */

export interface ConjPerson {
  /** WordForm tag this person maps to. */
  tag: string;
  /** English subject for the prompt ("I", "she", "they"). */
  enSubject: string;
  /** The (droppable) Serbian subject pronoun, shown as a faded frame. */
  sr_latin: string;
  sr_cyrillic: string;
}

/** Verbs we actively drill, in teaching order. Each id exists in
 *  words.json with present-tense `forms`. */
export const CONJUGATION_VERBS: string[] = [
  'jesti', 'piti', 'raditi', 'ici', 'hteti', 'voleti',
  'biti', 'imati', 'znati', 'moci', 'govoriti', 'razumeti',
];

export const PERSONS: ConjPerson[] = [
  { tag: '1sg.pres', enSubject: 'I',       sr_latin: 'ja',  sr_cyrillic: 'ја' },
  { tag: '2sg.pres', enSubject: 'you',     sr_latin: 'ti',  sr_cyrillic: 'ти' },
  { tag: '3sg.pres', enSubject: 'she',     sr_latin: 'ona', sr_cyrillic: 'она' },
  { tag: '1pl.pres', enSubject: 'we',      sr_latin: 'mi',  sr_cyrillic: 'ми' },
  { tag: '2pl.pres', enSubject: 'you all', sr_latin: 'vi',  sr_cyrillic: 'ви' },
  { tag: '3pl.pres', enSubject: 'they',    sr_latin: 'oni', sr_cyrillic: 'они' },
];

export const PERSON_BY_TAG: Record<string, ConjPerson> = Object.fromEntries(
  PERSONS.map((p) => [p.tag, p])
);

/** Verbs whose present covers both "I eat" and "I'm eating" — imperfective.
 *  Used to attach the no-continuous-tense insight on first rep. All the
 *  drilled verbs here are imperfective at present. */
export const IMPERFECTIVE_PRESENT = new Set(CONJUGATION_VERBS);

export const NO_CONTINUOUS_NOTE =
  "Serbian has no separate '-ing' tense — this one present form means both " +
  "“I do” and “I'm doing”. Context tells you which.";
