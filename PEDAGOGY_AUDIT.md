# iller8 — Pedagogy Audit & Beginner-First Redesign

> Written from a language-acquisition standpoint, in response to the user's diagnosis that the app currently teaches "the look of a phrase" rather than the building blocks of Serbian. The user is right. This document explains *why* it's right, what to keep, and a concrete rollout for fixing it.

---

## 1. The single biggest structural problem

**There is no Word in the data model.** `src/store/types.ts` defines `Phrase`, `PhraseGroup`, `PhraseFamily`, `FamilyVariant`, `PhraseProgress` — and that's it. The SRS, the exercise generator, and the entire mental model of "what is being learned" is the **whole sentence**, treated as one atomic token. `getDistractors()` in `src/engine/exercise-generator.ts` (lines 32–73) picks distractors as *whole foreign sentences* from the same `PhraseGroup` — so a learner staring at "Mrzim kad se svađamo." sees three other entire sentences and picks the one that "shape-matches" the English gloss they were shown three exercises ago. That's recognition memory, not Serbian.

Everything else downstream (direction locking, bucket progression, the family drill, even the comprehension dialogues) inherits this constraint. Until the data model knows what a `volim` is independently of `Volim te`, the app cannot drill vocabulary, cannot validate cross-phrase transfer, cannot weight production by lexical familiarity, and cannot scaffold a sentence from its pieces.

The phrase-families work (`src/data/phrase-families.json`, `PerspectiveShift.tsx`) is the closest thing in the codebase to teaching grammar — but it still operates at the sentence level. It shows *that* "Volim te → Voleo sam te" changes, with a note explaining why. It doesn't drill `voleti` as a verb with its own paradigm.

---

## 2. Honest audit of what's broken (beginner-Serbian view)

### 2.1 Recognition theatre dominates the exercise mix
`exerciseTypesForBucket` (generator lines 500–507) gives bucket 0 *only* `multiple-choice` and bucket 1 `[multiple-choice, context-pick]`. Both are 4-option pick-from-a-list against *whole-sentence* distractors. For a phrase like `Dušo moja.` the distractor pool inside `pet-names-classic` is `Ljubavi.`, `Draga moja.`, `Maco moja.` — radically different shapes. A learner who can't read Serbian at all can solve this on letter-pattern matching alone.

Until bucket 3 ("Known") the learner never has to *produce* anything. By the time `type-translation` finally appears, the SRS has already promoted the phrase based on what is essentially a visual matching game.

### 2.2 The direction logic gets production exactly backwards
```ts
function getDirectionForBucket(bucket: number): 'sr-to-en' | 'en-to-sr' {
  if (bucket <= 1) return 'sr-to-en';          // recognition only
  if (bucket === 2) return Math.random() < 0.7 ? 'sr-to-en' : 'en-to-sr';
  return Math.random() < 0.5 ? 'sr-to-en' : 'en-to-sr';
}
```
This is the wrong asymmetry. The user nailed it: **en→sr is where learning lives.** Recognising "Volim te" as "I love you" is borderline trivial; producing "Volim te" from "I love you" requires you to actually know the words. The current logic *front-loads* the easy direction and **never** weights production above 50%, even at the highest bucket. A beginner-friendly app should be ~30/70 sr→en/en→sr from the start, inverting to ~10/90 by bucket 3+.

### 2.3 The "Hammer" mode silently makes things worse for beginners
`generateHammerSession` (line 706) pulls from *all 10 lessons* and biases toward low-bucket phrases. Sounds reasonable — but for a true beginner this means random unseen phrases from any theme appear in a session before the learner has *any* foundation. There's no concept of "lexical readiness": a phrase is eligible if its bucket is low, regardless of whether the learner has met its component words anywhere else.

### 2.4 PhraseIntro is one screen long and reveals everything at once
`PhraseIntro.tsx` shows Serbian text + alt script + a "Reveal meaning" button that exposes English, context, the NOTE card, *and* the variations panel all in one click. For "Mrzim kad se svađamo." this is a wall: the learner sees four unknown words simultaneously with one sentence-long English gloss. There's no word-level breakdown ("mrzim = I hate, kad = when, se svađamo = we argue") in the surface — only an optional `notes` field that the author may or may not have written.

This is what the user means when they say "reading the sentence gives me nothing to relate it to."

### 2.5 Lessons are themed, not staged
Lessons 1–10 are organised by **conversational situation** (sweet talk, reactions, texting, food). For a phrasebook-style learner that's lovely; for a beginner trying to acquire grammar, it's chaos. Lesson 1 ("Sweet Talk") throws at the user, in order:
- Vocative case (`Dušo`, `Ljubavi`, `Maco`)
- Possessive-with-gender (`moja/moj/moje`)
- 2nd-person present (`Prelepa si`, `Nedostaješ mi`)
- Dative pronouns (`mi`, `ti`)
- Imperatives (`Sanjaj`, `Spavaj`, `Nemoj`)
- Past tense with gender agreement (`Ukrala si`)
- Future tense (`Sve će biti u redu`)
- Conditional/subjunctive (`Hajde da se ne svađamo`)

Eight major grammar topics, all in lesson 1, none of them ever foregrounded. No wonder it feels like a phrasebook.

### 2.6 Pacing forces premature commit
`MultipleChoice.tsx` line 23: `setTimeout(() => onAnswer(correct), 1800);`. 1.8 seconds is not enough time to *read* the NOTE card that appears (line 162–177), let alone absorb it. The note about `Duša means soul` flashes by while the next question is already loading. The user's pacing complaint is real and concrete.

### 2.7 The variations panel is shown without being drilled
On the intro screen the `Variations` chips show all gender/formality variants side by side (PhraseIntro.tsx 129–155). There's no exercise that ever asks "produce the masculine form" or "swap to formal" except inside the (excellent) `PerspectiveShift` family drill — which the learner has to manually navigate to. The variations are decoration, not curriculum.

### 2.8 Distractor quality is too easy
In `getDistractors`, distractors are *other sentences*, picked at random from the group. The cognitive task is "which English sentence sounds like the situation?" rather than "what does this Serbian word mean?". Real beginner-grade distractors should be **minimal pairs** at the word level: `mrzim / volim / hoću`, `te / ti / mi`, `sam / si / je`. Those force genuine attention.

### 2.9 Comprehension exercises depend on prerequisite vocabulary the learner doesn't have
`generateComprehension` (line 355) wraps any phrase in a dialogue scaffolded with `Šta radiš?`, `Hajde da izađemo večeras?`, `Ne mogu, moram da...`. If the learner hasn't met those words yet, the "comprehension" task is unsolvable except by recognising the *one* sentence they just saw. It's a recognition test in dialogue clothing.

### 2.10 No spaced-repetition curve on words
Even if the SRS algorithm is sound at the phrase level (`src/engine/srs.ts` is fine — 8 buckets, decaying intervals, gentle drop for high-bucket fails), it cannot promote a learner who knows `volim` as a *word*. Mastering "I love you" gives zero credit toward "I love coffee" or "I loved him." The lexical knowledge is locked inside whichever sentence happened to introduce it.

---

## 3. The proposed redesign

### 3.1 Word-level data model

Add a `Word` type alongside `Phrase` in `src/store/types.ts`:

```ts
export type POS = 'verb' | 'noun' | 'adj' | 'pron' | 'prep' | 'conj' | 'adv' | 'particle' | 'num';
export type Gender = 'm' | 'f' | 'n';

export interface WordExample {
  sr_latin: string;
  sr_cyrillic: string;
  en: string;
  /** Which phrase id this comes from, if any. */
  phraseRef?: string;
}

export interface WordForm {
  /** e.g. '1sg.pres', 'past.m.sg', 'voc.sg', 'acc.sg' */
  tag: string;
  sr_latin: string;
  sr_cyrillic: string;
  en?: string;
}

export interface Word {
  id: string;                // 'voleti', 'duša', 'mi-dat'
  lemma_sr_latin: string;    // 'voleti', 'duša'
  lemma_sr_cyrillic: string;
  gloss_en: string;          // 'to love', 'soul'
  pos: POS;
  gender?: Gender;           // for nouns
  aspect?: 'perf' | 'impf';  // for verbs
  /** A handful of forms we actively want to drill. */
  forms?: WordForm[];
  examples: WordExample[];   // 2–4 phrase-level uses
  /** Which lessons surface this word. Used for unlocking. */
  appearsIn: string[];
  /** Frequency rank within our corpus (1 = most common). */
  rank?: number;
  notes?: string;
}
```

Store words in `src/data/words/` as JSON, one file per part of speech (`verbs.json`, `pronouns.json`, `nouns.json`, etc.) or one large `words.json` if simpler.

**Phrase ↔ Word linking.** Add `wordRefs?: string[]` to `Phrase`. Manually tag the high-frequency content words in each phrase (skip true function words). This is a one-time annotation pass and only needs ~150 word entries total to cover 80% of the 360-phrase corpus.

**Bootstrapping the lexicon.** Run a tokenisation script once over `src/data/lessons/*.json`, count word frequencies, then hand-curate the top ~150 into `Word` records. The frequency rank tells the curriculum which words are worth drilling individually. Anything that appears in 3+ phrases is a candidate. Words that appear once *and* are content-heavy (e.g. `rođendan`) also qualify because they anchor a useful phrase.

**SRS for words.** `PhraseProgress` keys are currently phrase ids. Either reuse the same map with `word:<id>` keys (cheap, no migration), or split into `progress.phrases` and `progress.words`. I'd recommend the prefix approach (`word:voleti`) — it lets `getDueItems` keep working unchanged and we never have to write a migration.

### 3.2 Word-level exercise types

Add three new exercise types — these are deliberately Duolingo-shaped because that's what the user asked for:

| Type | Direction | What it drills |
|---|---|---|
| `word-recognize` | sr→en | 4-option: see `volim`, pick "I love" (distractors are minimal pairs — see below) |
| `word-produce` | en→sr | 4-option: see "soul", pick `duša` from `[duša, srce, sunce, zlato]` |
| `word-type` | en→sr | Type the Serbian word given the English gloss (opt-in via `skipTyping`) |

**Smart distractors.** Add `getWordDistractors(word, allWords, count)` that prefers, in order:
1. Same POS and same first letter (forces visual discrimination): `mrzim / volim / nosim`
2. Same POS, different first letter
3. Random

This kills the "guess by silhouette" failure mode in the current MC.

**Tap-the-pair.** Add a `word-match-pairs` exercise: a 5-or-6 row grid of English words on the left, Serbian on the right, tap to connect. We already have `MatchPairs.tsx` operating on phrases — copy it for `Word[]`. This is Duolingo's most-loved exercise and it costs us ~2 hours to build.

### 3.3 From-word-to-phrase scaffolding

Once a learner has bucket ≥ 2 on every content word in a phrase, surface a new exercise type `phrase-construct`:

> You know these words: `mrzim`, `kad`, `se`, `svađamo`. Tap them in the right order to say "I hate when we fight."

This is `WordTiles` but with *only* the words the learner already owns, plus 1–2 distractor words also from their owned set. Crucially the tiles are real lexical items the learner has met before, not random word salad.

`Phrase.wordRefs` makes this trivially computable: a phrase is eligible for `phrase-construct` when `wordRefs.every(id => progress.words[id]?.bucket >= 2)`. Until that gate opens the phrase appears in `phrase-preview` mode only (see §3.5).

### 3.4 Production-direction emphasis — fix `getDirectionForBucket`

Replace the current logic with something that flips weights toward production, parametrised by exercise type (because production is meaningless for `script-convert`, etc.):

```ts
function getDirectionForBucket(bucket: number): 'sr-to-en' | 'en-to-sr' {
  // Beginner-friendly weighting: production wins as soon as the word is familiar
  if (bucket === 0) return Math.random() < 0.7 ? 'sr-to-en' : 'en-to-sr';
  if (bucket === 1) return Math.random() < 0.4 ? 'sr-to-en' : 'en-to-sr';
  if (bucket === 2) return Math.random() < 0.25 ? 'sr-to-en' : 'en-to-sr';
  return Math.random() < 0.15 ? 'sr-to-en' : 'en-to-sr';
}
```

Also: pure recognition (`sr-to-en` MC) should *only* promote a phrase one bucket on the first encounter; subsequent recognitions should not advance. Add a counter `recognitionsAtBucket` to `PhraseProgress` and gate bucket promotion behind at least one en→sr success once bucket ≥ 1. This is the fix that most directly answers "how do I say *dear* in Serbian?"

### 3.5 Comprehensible input — the readiness gate

Phrases should not enter the active learning queue until their component words are *meet-able*. Define readiness:

```
phrase.readiness =
  knownWordCount(phrase.wordRefs) / phrase.wordRefs.length
```

- `readiness ≥ 0.7`: full exercise set is unlocked
- `readiness ≥ 0.4`: only `phrase-preview` (read-only) + `multiple-choice sr→en` allowed
- `readiness < 0.4`: phrase is hidden from drills; appears only if the learner browses the catalog manually

This means the first time a learner ever sees "Mrzim kad se svađamo." they've already met `mrzim`, `kad`, and `se` as individual words. The sentence becomes a *combination* exercise, not an introduction.

Practical wiring: in `generateHammerSession` and `generateLessonExercises`, filter the candidate phrase pool through readiness before picking. In `LessonView`, surface a "ready to learn" count per lesson.

### 3.6 The role of grammar — minimal up-front, drilled in patterns

Don't lecture, but don't pretend grammar is optional either. The current approach (grammar lives only in `notes` shown post-answer) understates how much a beginner Slavic learner needs scaffolding. Specifically for Serbian:

1. **Pronouns first** (ja/ti/on/ona/mi/vi/oni + dative `mi/ti` + accusative `me/te/ga/je`). These are 12 words and they unlock 60% of useful sentences. Should be drilled as `Word` entries with their own micro-lesson before any phrase containing them is taught. Today they're treated as function words and outright excluded from `FillInBlank` distractors (`FUNCTION_WORDS` set, line 133). That's exactly backwards — they're the most important words.
2. **Present-tense conjugation of 8 verbs** (`biti`, `imati`, `hteti`/`voleti`, `znati`, `ići`, `raditi`, `moći`, `morati`). Each as a `Word` with a `forms` table. A new exercise `conjugation-pick`: "I want = `Ja ___ kafu`. [hoću | hoćeš | hoće | hoćemo]".
3. **Gender agreement on adjectives** (`umoran/umorna`, `gladan/gladna`, `srećan/srećna`). Add to `Word.forms`. Drill via `perspective-shift` for `gender-speaker` transform.
4. **Past tense as a separate week**. Treat `-o/-la/-lo` participles as a topic, not a per-phrase footnote. The phrase-families work already drills this well; promote it to first-class curriculum.
5. **Cases — only acc and dat in the first 30 days**. Genitive, locative, instrumental can wait. The phrases that use them get `phrase-preview` treatment (read-only) until the learner has the words.
6. **Aspect last.** The user's `call-me-aspect` variant is wonderful content but it's a brain-bender. Push aspect drilling to day 21+ when there's enough verb vocabulary to compare pairs.
7. **Vocative** can come early via `Dušo!`, `Ljubavi!` but should be acknowledged as a case: a one-screen explainer ("Serbian has a special form for calling/addressing people") before lesson 1 starts. Otherwise it looks like random spelling changes.

Where does this live in code? A new directory `src/data/grammar/` with one JSON per topic: `pronouns.json`, `present-tense.json`, `past-tense.json`, `gender-agreement.json`, etc. Each is a `GrammarTopic` with `id`, `title`, `intro` (one paragraph), `examples`, `drillWordIds` (words this topic depends on), `drillFamilyIds` (families that exercise this pattern). The dashboard surfaces "Next grammar topic" as a CTA when the learner has the prerequisite words at bucket ≥ 2.

### 3.7 Beginner-Serbian curriculum order (first 30 days)

The current theme-based ordering is **fine for content but wrong for sequence**. Re-order using a layered curriculum where each layer adds one grammatical capability. Keep all 10 lessons; just gate phrase availability by what grammar/words have been unlocked.

```
Week 1 — Pronouns & "to be"
  Words: ja, ti, on, ona, mi, vi, oni, sam/si/je/smo/ste/su, ne
  Phrases: Ja sam Viktor. Ti si X. On je Y. Nisam X. Jesi li X?
  Grammar topic: "Subject pronouns"

Week 2 — Possession & basic adjectives
  Words: moj/moja/moje, tvoj/-a/-e, lep/-a/-o, dobar/-a/-o, umoran/umorna, gladan/gladna
  Phrases (from existing corpus, gated): Dobro jutro. Lepo ti stoji. Umoran sam. Gladan sam. Sve je dobro.
  Grammar topic: "Adjective gender agreement"

Week 3 — Present-tense verbs (8 high-frequency)
  Words: biti (review), imati, hteti, voleti, znati, raditi, ići, moći
  Phrases: Hoću kafu. Volim te. Šta radiš? Idem kući. Mogu da pomognem.
  Grammar topic: "Present tense — three patterns"

Week 4 — Dative & accusative pronouns + clitics
  Words: me, te, ga, je, nas, vas, ih (acc); mi, ti, mu, joj, nam, vam, im (dat)
  Phrases: Volim te. Nedostaješ mi. Pozovi me. Mislim na tebe.
  Grammar topic: "Word order and clitic placement"

Day 22+ — Past tense, vocative as a unit, then aspect
  Phrases: existing past-tense content from sweet-talk, reactions, etc.
  Family drill: tense-past becomes the default perspective-shift type
```

The themed lessons (sweet-talk, reactions, etc.) become **views into** the same gated corpus — pick a theme, see which of its phrases are currently learnable. Already-built UI; new filter.

### 3.8 Specific UX prescriptions

- **Auto-advance: kill the 1800 ms timeout.** Change `MultipleChoice.tsx` line 23 from `setTimeout(() => onAnswer(correct), 1800)` to `onAnswer` being called by an explicit "Continue" button (or wire it to spacebar / tap-to-continue). 1800 ms is too short to read the NOTE; longer makes correct answers feel sluggish. Manual continue is the right default.
- **Show both scripts by default for beginners.** Currently the script toggle is binary. For low-bucket items (bucket ≤ 1), render the chosen script large and the other script small below it. PhraseIntro already does this; the exercises don't.
- **Force production after bucket 2, not bucket 3.** Move `type-translation` and `word-type` into bucket 2's pool. The user needs typed retrieval earlier than the current curve allows.
- **Respect `skipTyping` only at the exercise-mix level, not at the SRS level.** A learner who never types should still hit `word-tiles` and `sentence-builder` (tile placement *is* production). Make sure those don't get swapped out by the current `SKIP_TYPING_SWAP` map (they aren't today — good — leave it).
- **Word-of-the-day on the dashboard** — pull from `Word[]` ranked by frequency among unseen words. Tap to drill that word's family of phrases.

### 3.9 What to KEEP — explicitly

The user's existing build has real value. Don't throw any of this away:

- **`PhraseFamily` data + `PerspectiveShift` exercise.** This is the best-designed pedagogical surface in the app. Keep, expand, but reposition: this is *intermediate-tier* content. A beginner sees it after meeting the base form's vocabulary, not on day one. Add a readiness gate analogous to §3.5.
- **The SRS algorithm itself.** `src/engine/srs.ts` is sound. The gentle drop for high-bucket fails (line 40, `bucketDrop = progress.bucket >= 3 ? 1 : 2`) is correct. Don't touch it; reuse it for words.
- **`Hammer` mode's intent.** Random, low-commitment, 3-minute drills are the right shape for this user. Just add the readiness filter so it doesn't dump unlearnable phrases.
- **The `notes` field convention** (post-answer reveal). It's the right place for grammar context. Just don't make it the *only* place.
- **The Latin/Cyrillic toggle architecture.** It's clean. Keep.
- **`PhraseIntro`'s single-screen reveal flow.** The simplification from the previous five-step intro is right. Don't add steps back. Add a small word-breakdown row inside the same screen (see §3.10 below).
- **`Comprehension`, `SentenceBuilder`, `PatternMatch`.** All three are good for bucket 3+ learners. Just gate them behind word readiness.

### 3.10 One concrete change to PhraseIntro

Add a word-breakdown row that lights up automatically when `phrase.wordRefs` is populated. Below the Serbian + alt-script header, before the "Reveal meaning" button, render a chip strip:

```
[mrzim → I hate]  [kad → when]  [se svađamo → we argue]
```

Each chip is tappable → goes to that word's drill page. The chip's background shows current SRS bucket colour (using `getMasteryColor`). This is the single highest-impact change to make a sentence feel "constructed from pieces I know" rather than a glyph to memorise. It also gives the learner a no-stakes way to fix knowledge gaps in the middle of a session.

---

## 4. Rollout plan — five steps, each independently shippable

### Step 1 — Word data model + lexicon bootstrap (1 session)
- Add `Word`, `WordForm`, `WordExample`, `POS`, `Gender` to `src/store/types.ts`
- Write a one-off script `scripts/extract-lexicon.ts` that tokenises `src/data/lessons/*.json`, counts frequencies, and emits a starter `src/data/words/_extracted.json` for hand-curation
- Hand-curate ~150 entries into `src/data/words/words.json`, focusing on: 7 pronouns, 8 verbs, 20 common nouns, 15 adjectives, the dative/accusative clitic forms, top ~50 misc. words
- Add `wordRefs: string[]` to `Phrase` and tag content words in `01-sweet-talk.json` and `02-reactions.json` as a pilot

**Ships as:** invisible to the user, but unlocks every later step. Can be done end-to-end in one session.

### Step 2 — Word drills + word SRS (1 session)
- New page `src/pages/WordDrill.tsx` and route `/words`
- New exercises `WordRecognize.tsx`, `WordProduce.tsx`, `WordMatchPairs.tsx`
- `getWordDistractors()` in a new `src/engine/word-generator.ts`
- Word progress uses existing `progress.phrases` map with `word:<id>` keys
- Dashboard card: "Words you've met: N · Drill 5 now"

**Ships as:** a working second drill surface the user can run alongside Hammer.

### Step 3 — Readiness gates + word-breakdown chips in PhraseIntro (1 session)
- Compute `phrase.readiness` in `exercise-generator.ts`; filter both `generateLessonExercises` and `generateHammerSession`
- Add the chip strip to `PhraseIntro.tsx` (see §3.10)
- Add `phrase-construct` exercise (a constrained `WordTiles` using only known words)
- Fix `getDirectionForBucket` per §3.4
- Kill the auto-advance timeout in all MC-style components; replace with manual continue

**Ships as:** the experience the user is asking for — sentences feel like they're built from known pieces, production direction starts dominating early.

### Step 4 — Grammar topics + first-30-days curriculum (1 session)
- `src/data/grammar/` directory with 4 topics: pronouns, present-tense, gender-agreement, dative-accusative clitics
- New page `src/pages/GrammarTopic.tsx`
- Dashboard surfaces "Next topic" CTA
- Reorder lessons internally via a `phaseUnlock` field on the lesson (which topics it needs) — keep the themed lesson UI, just gate phrases inside it

**Ships as:** a real curriculum spine. The dashboard suggests what to learn next, not just "which lesson is incomplete."

### Step 5 — Word-of-the-day + word-aware Hammer (½ session)
- Dashboard widget: today's word (highest-frequency unseen word, or lowest-bucket due word)
- Hammer mode adds a mix slider: "Words / Phrases / Both"
- Catalog page shows word coverage per lesson

**Ships as:** polish + the discoverability changes that make the new architecture *feel* like the headline feature.

---

## 5. Closing principle

The user said it perfectly: *"teach me Serbian, not Serbian phrases."* The implementation prescription that follows from that is:

> A phrase is never the unit of learning. A phrase is the place where words you already know come together and surprise you.

Every recommendation above is in service of that one inversion. The current build has the surface polish and the content depth to support it — what's missing is one layer of abstraction (the `Word`) and the readiness logic that gates phrases behind their lexical prerequisites. Add those, and the app stops being a phrasebook quiz and starts being a Serbian course.
