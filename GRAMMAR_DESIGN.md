# iller8 — Basic Grammar & Sentence-Building Feature Design

> Implementation-ready spec for the user request: *"some very basic grammar and sentence building — 'I like', 'she likes', 'I eat', 'I'm eating' and other such super basic but useful things."*
>
> Read against `ARCHITECTURE.md` (§3 data model, §4 engine, §6 daily session, §8 decision log), `CONTENT_AUDIT.md` §2/§4, `PEDAGOGY_AUDIT.md` §3.6, and the existing `phrase-families.json` + `PerspectiveShift` feature. This **extends**, it does not duplicate.

---

## 1. Recommended mechanism — one primary + one complement

**Primary: a new `conjugate` exercise type, driven entirely by the `forms` data already in `words.json`.**

Reasoning:

- **The data already exists.** Every target verb (`biti, imati, hteti, voleti, jesti, piti, ici, raditi, znati, moci, govoriti, razumeti`) already carries a `forms` array with `1sg/2sg/3sg(/1pl/2pl/3pl).pres` tags, each with an English gloss (`"I eat"`, `"you eat"`). The single most-requested feature — *same verb across persons* — is a pure presentation problem, not a content problem. We are activating dormant data, exactly as listening did for the audio library.
- **Perspective-shift is the wrong vehicle for this.** Families operate at the *sentence* level and drill *transformations of one idea* (tense, formality, negation). Conjugation is a *paradigm sweep of one lemma across persons* — a different axis. Forcing it into families would mean hand-authoring `ja jedem / ti jedeš / on jede / …` as 6 sentence variants per verb × 12 verbs = 72 redundant rows that restate `forms` we already have. Don't. (`PEDAGOGY_AUDIT.md` §3.6.2 already names this exercise `conjugation-pick`.)
- **It slots into the existing pipeline cleanly.** Like `word:` and `family:`, a conjugation item synthesizes a `Phrase`, gets a prefixed SRS key, and dispatches through `ExerciseRenderer`. No engine rewrite.

**Complement: ONE new phrase-family — `like-svidja` — for the "I like / she likes" dative pattern.**

The `sviđa mi se` construction is *not* conjugation — it's a fixed experiencer frame where the verb stays `sviđa` (3sg) and the **dative clitic** shifts (`mi → ti → joj → mu → nam`). That is precisely what perspective-shift families do best, and it directly reuses the dative pattern the app already teaches via `nedostaješ mi` and `treba mi`. So the like-pattern ships as family data, the conjugation sweep ships as the new exercise. Together they cover the user's four examples: *I like* (family), *she likes* (family), *I eat / I'm eating* (conjugation + explainer note).

**Rejected:** a free "grammar-slot sentence builder" (pick subject + verb-form + object). Too open-ended, hard to score, and `SentenceBuilder`/`WordTiles` already cover tile assembly. The constrained `conjugate` pick is the simplest thing that delivers the ask.

---

## 2. Data shape

**No type changes required.** `WordForm` already has `{ tag, sr_latin, sr_cyrillic, en? }`. The generator reads a verb's `forms`, filters to present-tense person tags, and builds the exercise. We add only:

1. A small **per-verb opt-in list** so we drill the right verbs (not every word with `forms`), and
2. A reusable **subject-pronoun table** (data constant) to render the prompt.

### 2a. Curated verb list (new tiny data file `src/data/grammar/conjugation.ts`)

```ts
// Verbs we actively drill present-tense conjugation on. Order = teaching order.
// Each id MUST exist in words.json with present-tense `forms`.
export const CONJUGATION_VERBS: string[] = [
  'biti', 'imati', 'hteti', 'voleti', 'jesti', 'piti',
  'ici', 'raditi', 'znati', 'moci', 'govoriti', 'razumeti',
];

// Person rendering for the prompt. `enSubject` builds "I eat / she eats" glosses;
// `sr` is the (droppable) Serbian pronoun shown as a faded hint.
export const PERSONS = [
  { tag: '1sg.pres', enSubject: 'I',        sr_latin: 'ja',  sr_cyrillic: 'ја'  },
  { tag: '2sg.pres', enSubject: 'you',      sr_latin: 'ti',  sr_cyrillic: 'ти'  },
  { tag: '3sg.pres', enSubject: 'he/she',   sr_latin: 'on',  sr_cyrillic: 'он'  },
  { tag: '1pl.pres', enSubject: 'we',       sr_latin: 'mi',  sr_cyrillic: 'ми'  },
  { tag: '2pl.pres', enSubject: 'you all',  sr_latin: 'vi',  sr_cyrillic: 'ви'  },
  { tag: '3pl.pres', enSubject: 'they',     sr_latin: 'oni', sr_cyrillic: 'они' },
] as const;
```

> **Data backfill needed:** most target verbs currently only carry `1sg/2sg/3sg.pres`. To drill the full sweep, add `1pl/2pl/3pl.pres` to the 12 verbs (`biti` and `piti` already have plurals). This is mechanical and small (~36 form rows). Real values for the first slice are in §5. Verbs missing a person simply don't generate that item — the generator skips absent tags, so partial data degrades gracefully.

### 2b. The `like-svidja` family (append to `phrase-families.json`)

Same schema as every existing family. Concrete content in §5b. Tracked under `family:like-svidja:<variantId>` — zero new code.

### 2c. SRS key (the load-bearing decision)

A conjugation item is keyed:

```
conj:<verbId>:<personTag>
```

e.g. `conj:jesti:1sg.pres`, `conj:jesti:2sg.pres`. This fits the **one-map prefixed-key model** (`ARCHITECTURE.md` §8): each (verb, person) cell tracks its own bucket, so the SRS can resurface "you eat" without re-drilling "I eat" the learner already nailed. The `getDueItems` filter (bucket ≥ 1) and time-decay work unchanged.

---

## 3. Exercise UX — the `conjugate` screen

Model on `WordProduce.tsx` (same primitives: `MCOptionList`, `AutoplayAudio`, `AudioButton`, `GlossHint`, `ContinueButton`, the purple "WHY" card). Production-first, no auto-advance, dual-script, post-answer note.

**Prompt (before answering):**

```
  CONJUGATE · jesti (to eat)            ← MonoBadge (lemma + gloss)

  she eats                              ← big English target (exercise.prompt)
  ona ___                               ← faded Serbian frame; pronoun in parens-grey,
                                          blank where the form goes
```

- **Bucket 0 (first meeting of this cell): multiple choice.** 4 options = the correct form + 3 **sibling forms of the same verb** (`jedem / jedeš / jede / jedu`). This is the whole point: the distractors are the *other persons of the same verb*, so the learner must discriminate the ending, not the meaning. (Mirror of how perspective-shift uses same-family distractors.) If fewer than 3 siblings exist, top up with same-tag forms from other drilled verbs.
- **Bucket ≥ 1: type-it** (gated by `skipTyping` → stays MC). Input + `checkAnswerFuzzy` (diacritic-tolerant), same as `PerspectiveShift`'s type path.

**Audio:** on answer-reveal, autoplay the **full Serbian form clip** via `AutoplayAudio text={form.sr_latin}` (Latin form — clips are hashed by Latin per §8). `AudioButton` for manual replay sits next to the revealed answer. Pronoun-dropped form (`jede`) is what's spoken — reinforcing that the pronoun is optional.

**Post-answer card:**

- The correct full form, big, dual-script, with the English gloss beneath.
- A `GlossHint` carrying the pronoun-drop reminder where relevant.
- The purple **WHY** card. For the present tense it carries the verb-specific note from `words.json`; for the *first* time a verb is drilled, prepend the aspect insight (§4).

**The "I eat vs I'm eating" insight** is delivered two ways, never as a lecture screen (forbidden, §8):
1. The English prompt for imperfective verbs alternates between *"I eat"* and *"I'm eating"* across reps (both map to the same `jedem`). Seeing one Serbian form satisfy both English prompts *is* the lesson.
2. A one-line WHY note on the first rep of each imperfective verb: *"Serbian has no separate '-ing' tense — `jedem` means both 'I eat' and 'I'm eating'. Context tells you which."*

---

## 4. Generation + SRS integration

### 4a. New generator `src/engine/conjugation-generator.ts`

```ts
// Synthesize a Phrase from (verb, person) so SRS/retry/stats work unchanged.
function conjAsPhrase(verb: Word, form: WordForm): Phrase {
  return {
    id: `conj:${verb.id}:${form.tag}`,
    sr_latin: form.sr_latin,
    sr_cyrillic: form.sr_cyrillic,
    en: form.en ?? verb.gloss_en,
    context: `${verb.lemma_sr_latin} · ${form.tag}`,
    notes: verb.notes,
  };
}

export function generateConjugate(
  verb: Word, form: WordForm, person: Person,
  script: 'latin' | 'cyrillic', multipleChoice: boolean
): Exercise {
  const sr = (f: WordForm) => script === 'cyrillic' ? f.sr_cyrillic : f.sr_latin;
  const correct = sr(form);
  let options: string[] | undefined;
  if (multipleChoice) {
    const siblings = verb.forms!
      .filter(f => f.tag.endsWith('.pres') && f.tag !== form.tag)
      .map(sr).filter(s => s !== correct);
    options = shuffle([correct, ...shuffle(siblings).slice(0, 3)]);
  }
  return {
    type: 'conjugate',
    phrase: conjAsPhrase(verb, form),
    direction: 'en-to-sr',
    prompt: aspectAwareEnglish(verb, form, person), // "she eats" / "I'm eating"
    correctAnswer: correct,
    options,
    baseSrLatin: person.sr_latin,      // the (droppable) pronoun, for the frame
    baseSrCyrillic: person.sr_cyrillic,
    transformLabel: `${verb.lemma_sr_latin} · ${person.enSubject}`,
    grammarNote: verb.notes,
  };
}
```

(`conjugate` reuses existing `Exercise` fields — `baseSrLatin/baseSrCyrillic` carry the pronoun, `transformLabel` the badge. No type additions beyond adding `'conjugate'` to the `ExerciseType` union and a renderer case.)

### 4b. Wiring into the daily session

In `daily-session.ts` add a `CONJ_PREFIX = 'conj:'` branch to `exerciseForKey` (parse `conj:<verbId>:<tag>`, look up verb + form, MC when `bucket < 2`, type after). Add conjugation cells to the **new-item pool** in `pickNewItems`: a (verb, person) cell is eligible when the verb's `word:<id>` bucket ≥ 1 (you met the lemma) AND the cell's own bucket is 0. Order by verb teaching-order then person order (1sg → 3pl), so the learner meets `jedem` before `jedeš`. Conjugation cells flow through review/consolidation like everything else (they're just SRS keys). Target ~15% of new slots when the readiness gate opens — keep it from drowning vocabulary.

**Readiness gating:** a cell never appears before its lemma is met (bucket ≥ 1 on `word:<verbId>`). This is the conjugation analogue of the phrase word-readiness gate — you don't conjugate a verb you haven't met.

### 4c. Retry + rewards

Automatic. `buildRetryExercise` routes `missed.phrase.id` (which is the `conj:` key) back through `exerciseForKey` at bucket 0. Achievements run in `useDrillSession`. Nothing per-page (§8).

### 4d. Dispatch

Add to `ExerciseRenderer.tsx`: `case 'conjugate': return <Conjugate key={itemKey} … />;`. New component `src/components/exercises/Conjugate.tsx` (copy `WordProduce`, swap the header to the §3 frame, point distractors note at the WHY card).

---

## 5. Concrete starter content (REAL Serbian, Cyrillic matched)

### 5a. Conjugation backfill — add missing plural present forms

`biti` and `piti` already have plurals. Add `1pl/2pl/3pl.pres` to the rest (drill 1sg/2sg/3sg from day one; plurals enter once singulars are mastered):

| verb | 1pl.pres | 2pl.pres | 3pl.pres |
|---|---|---|---|
| imati | imamo / имамо | imate / имате | imaju / имају |
| hteti | hoćemo / хоћемо | hoćete / хоћете | hoće / хоће |
| voleti | volimo / волимо | volite / волите | vole / воле |
| jesti | jedemo / једемо | jedete / једете | jedu / једу |
| ici (ići) | idemo / идемо | idete / идете | idu / иду |
| raditi | radimo / радимо | radite / радите | rade / раде |
| znati | znamo / знамо | znate / знате | znaju / знају |
| moci (moći) | možemo / можемо | možete / можете | mogu / могу |
| govoriti | govorimo / говоримо | govorite / говорите | govore / говоре |
| razumeti | razumemo / разумемо | razumete / разумете | razumeju / разумеју |

First shippable slice = **6 verbs × 3 singular persons = 18 cells**: `jesti, piti, raditi, ici, hteti, voleti` (the most viscerally useful + the user's exact examples). The other 6 verbs + all plurals = the expansion.

Each new form row, e.g. for `jesti`:
```json
{ "tag": "1pl.pres", "sr_latin": "jedemo", "sr_cyrillic": "једемо", "en": "we eat" },
{ "tag": "2pl.pres", "sr_latin": "jedete", "sr_cyrillic": "једете", "en": "you (pl) eat" },
{ "tag": "3pl.pres", "sr_latin": "jedu",   "sr_cyrillic": "једу",   "en": "they eat" }
```

### 5b. The `like-svidja` family (append to `phrase-families.json`)

```json
{
  "id": "like-svidja",
  "theme": "I like it",
  "category": "feelings",
  "base": {
    "id": "like-svidja-base",
    "sr_latin": "Sviđa mi se.",
    "sr_cyrillic": "Свиђа ми се.",
    "en": "I like it.",
    "label": "base form",
    "transform": "subject-swap",
    "note": "Literally 'it pleases me'. The thing liked is the subject; YOU are the dative experiencer (mi). The verb stays 'sviđa' — only the clitic changes for who likes it. Same frame as 'nedostaješ mi' and 'treba mi'."
  },
  "variants": [
    { "id": "like-svidja-you", "sr_latin": "Sviđa ti se?", "sr_cyrillic": "Свиђа ти се?", "en": "Do you like it?", "label": "you → question", "transform": "question", "note": "Swap the clitic to 'ti' (to you); rising intonation makes it a question." },
    { "id": "like-svidja-she", "sr_latin": "Sviđa joj se.", "sr_cyrillic": "Свиђа јој се.", "en": "She likes it.", "label": "she likes it", "transform": "object-swap", "note": "'joj' = to her (dative). The verb does NOT change to a 'she' form — 'sviđa' stays put. This is the trap for English speakers." },
    { "id": "like-svidja-he", "sr_latin": "Sviđa mu se.", "sr_cyrillic": "Свиђа му се.", "en": "He likes it.", "label": "he likes it", "transform": "object-swap", "note": "'mu' = to him." },
    { "id": "like-svidja-we", "sr_latin": "Sviđa nam se.", "sr_cyrillic": "Свиђа нам се.", "en": "We like it.", "label": "we like it", "transform": "subject-swap", "note": "'nam' = to us." },
    { "id": "like-svidja-them-plural", "sr_latin": "Sviđaju mi se.", "sr_cyrillic": "Свиђају ми се.", "en": "I like them.", "label": "I like them (plural things)", "transform": "number", "note": "When the liked THINGS are plural, the verb agrees: 'sviđaju' (they please me). The clitic 'mi' is unchanged." },
    { "id": "like-svidja-person", "sr_latin": "Sviđaš mi se.", "sr_cyrillic": "Свиђаш ми се.", "en": "I like you.", "label": "I'm into you", "transform": "reciprocity", "hint": "Romantic — 'I'm into you', softer than 'volim te'.", "note": "When you like a PERSON who is 'you', they are the subject: 'sviđaš' (2sg) + 'mi se'. Literally 'you please me'." },
    { "id": "like-svidja-negation", "sr_latin": "Ne sviđa mi se.", "sr_cyrillic": "Не свиђа ми се.", "en": "I don't like it.", "label": "in the negative", "transform": "negation", "note": "'Ne' before the verb. Common full sentence: 'Ne sviđa mi se ovo.'" },
    { "id": "like-svidja-volim-contrast", "sr_latin": "Volim kafu.", "sr_cyrillic": "Волим кафу.", "en": "I like coffee.", "label": "the OTHER 'like' (volim)", "transform": "object-swap", "hint": "For loving/liking things you consume or do.", "note": "Two ways to say 'like': 'sviđa mi se' = it appeals to me (taste, looks, a person); 'volim' = I love/like (food, activities, people). 'Volim kafu' = I like coffee; 'sviđa mi se ova kafa' = I like this (particular) coffee." }
  ]
}
```

### 5c. "I eat vs I'm eating" explainer content

No new screen. Delivered as the first-rep WHY note (§3) plus the alternating English prompt. The single sentence to ship, attached to imperfective verbs in the conjugation generator:

> *"Serbian has no '-ing' tense. `jedem` = both 'I eat' AND 'I'm eating'; context decides. (Aspect — perfective vs imperfective — matters for past/future, not here.)"*

---

## 6. Sequencing — minimum slice vs expansion

This sits **inside the existing Foundations on-ramp** (`CONTENT_AUDIT.md` §4), specifically *Foundations 1 ("to be" + pronouns)* and *Foundations 2 (core verbs)*. Conjugation cells are gated by lemma-readiness, so they naturally surface only after the learner has met the verb and its pronouns — no extra sequencing flag needed. The `like-svidja` family belongs in Foundations 2 / feelings, after `nedostaješ mi` has taught the dative frame once.

**Minimum shippable first slice (½–1 session):**
1. Add `'conjugate'` to the `ExerciseType` union + `ExerciseRenderer` case.
2. `src/data/grammar/conjugation.ts` (verb list + `PERSONS`).
3. `src/engine/conjugation-generator.ts` (`generateConjugate` + the `conj:` branch in `exerciseForKey` + new-item pool entry, ~15% gated).
4. `src/components/exercises/Conjugate.tsx` (clone of `WordProduce`).
5. Drill **6 verbs × 3 singular persons** (`jesti, piti, raditi, ici, hteti, voleti`), MC-only, with the aspect WHY note. **No data backfill required** — these singulars already exist.
6. Append the `like-svidja` family — **pure data, zero code.**

That alone delivers the user's literal ask: *I like* (`sviđa mi se` / `volim`), *she likes* (`sviđa joj se`), *I eat / I'm eating* (`jedem` + explainer).

**Later expansion:**
- Plural-person backfill (§5a) → unlock `mi/vi/oni` cells and the full sweep.
- Add the remaining 6 verbs (`biti, imati, znati, moci, govoriti, razumeti`).
- Type-it production at bucket ≥ 2 (already specced; just flip `multipleChoice`).
- A focused **"Conjugation" quick-tile / explorer** (one verb's full paradigm in a row), mirroring the FamilyDrill surface — only after the daily-session integration proves out.
- Past/future aspect drilling stays deferred (`PEDAGOGY_AUDIT.md` §3.6.6 — aspect last). The participle data already lives in families; don't pull it forward.

---

## 7. The single Serbian-specific insight this feature must teach

**The verb agrees with the SUBJECT, and in the `sviđa mi se` frame the subject is the thing liked — not the person doing the liking.** "She likes it" is `Sviđa joj se` (verb stays `sviđa`, the *her* is a dative clitic), NOT a conjugated "she" form. Every English speaker reflexively tries to conjugate the verb for "she" — and is wrong. Pairing the conjugation sweep (where the verb *does* change per person: `jedem/jedeš/jede`) against the `sviđa mi se` family (where it pointedly *doesn't*) is what makes the contrast land. Secondary insight: Serbian has no continuous tense — one present form (`jedem`) covers both "I eat" and "I'm eating."
