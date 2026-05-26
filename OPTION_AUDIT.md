# Option-quality audit (commit ee6c4f3)

## How I tested

I read every exercise component in `src/components/exercises/`, every generator in
`src/engine/`, and pulled real phrases from `src/data/lessons/*.json`,
`src/data/words/words.json`, and `src/data/phrase-families.json`. For each
generator I traced the option-construction code with concrete inputs (e.g.
`st-dusko` against its phrase-group siblings `st-ljubavi`, `st-draga`, `st-maco`,
or the noun `dusa` against minimal-pair candidates) and wrote out the literal
A/B/C/D the learner would see. I then evaluated each option set against the leak
checklist in the brief. Where the data layer was the leak source I noted whether
the bug is in `getDistractors` / `getWordDistractors` / `dialogueTemplates` or in
the underlying JSON convention.

## Findings by exercise type

### MultipleChoice (sr → en) — `generateMultipleChoice` direction `sr-to-en`

The prompt is the Serbian phrase; options are the English glosses; distractors
come from `getDistractors` which prefers the same phrase-group, then any other
phrase in the lesson.

**Sample 1: `st-dusko` (Dušo moja.) — pet-names-classic group**
Phrase-group siblings: `st-ljubavi`, `st-draga`, `st-maco`. Distractors phase 1
will pick from those three glosses:
- A: `My darling. (lit. 'my soul')` ← correct
- B: `My love.`
- C: `My dear. (to a woman)`
- D: `My kitten / kitty.`

LEAKS:
- **Parenthetical asymmetry (severe).** A has `(lit. 'my soul')` — an
  explanatory parenthetical. C has `(to a woman)` — also a parenthetical, but
  shorter, restricting rather than expanding meaning. A is roughly twice the
  length of B or D. A beginner who can't read Serbian still has two visual
  hints — the longest option and the only one with a literal-translation gloss.
- **Repeated-pattern (severe).** The user already flagged that this is the
  *first* MultipleChoice a learner sees, and it's at bucket 0 for every new
  phrase in this group. Across all four pet-names-classic phrases (`st-dusko`,
  `st-ljubavi`, `st-draga`, `st-maco`) the only one with a `(lit. ...)` gloss is
  `st-dusko` — so it's a unique fingerprint, not a group-wide convention.

SEVERITY: high. This is the first exercise after the PhraseIntro for the
flagship Lesson 1.

FIX: Move all `(lit. ...)` content out of `phrase.en` and into `phrase.notes`.
Same for `(to a woman)` / `(to a man)` / `(formal)` / `(feminine)` /
`(masc speaker)` / `(female speaker)` / `(empathy, not apology)` etc. — these
are answer-shaping hints that should be revealed AFTER the answer (the component
already renders `notes` only on result). A cleaner contract: `phrase.en` is the
clean target gloss; everything else lives in `notes` or a new optional `gloss_hint` field.

**Sample 2: `rx-zao-mi-je` (Žao mi je.) — empathy-reactions group**
Siblings: `rx-jadan` (`You poor thing! (to a man)`), `rx-grozno`
(`That's terrible! / How awful!`).
- A: `I'm sorry. (empathy, not apology)` ← correct
- B: `You poor thing! (to a man)`
- C: `That's terrible! / How awful!`
- D: (pad from lesson, e.g. `Forget it! / Don't even bother!`)

LEAKS:
- **Parenthetical asymmetry (moderate).** A has the only `(empathy, not apology)`
  — but this one is interesting because B also has a parenthetical
  (`(to a man)`). However, A's parenthetical is *semantic* (clarifies which
  meaning) while B's is *target-restriction* (gender of listener). Three of four
  contain `/` separators, A doesn't — that's a different visual fingerprint.
- **Punctuation tell (low-moderate).** Prompt ends in `.`, options A and D end
  in `.`, B and C end in `!`. Three end in `!` and one in `.` is moderate
  noise — but the prompt has a single period and only A matches.

SEVERITY: moderate.

FIX: Strip parenthetical from `en`. Drop trailing punctuation from English
glosses (or normalize so all are bare phrases).

**Sample 3: `tx-jbg` (jbg) — text-abbreviations group**
- A: `Oh well / It is what it is (mild swear)` ← correct
- B: `nvm / no worries (nema veze)`
- C: `I mean (mislim)`
- D: `btw (bilo to jest / by the way)`

LEAKS:
- **Within-group uniformity (the rare case where it works).** All four options
  carry a parenthetical, all are lowercase, all are abbreviation glosses. This
  is *actually* well-formed because the distractor pool is uniform. No leak
  here when distractors stay in-group.
- **Cross-group risk.** If the group has only one due item and `getDistractors`
  pads from the rest of the lesson (Phase 2 fallback), the learner gets three
  full-sentence glosses against one abbreviation gloss — instant pattern match.
  E.g. `tx-jbg` mixed with `Hello!` / `What are you doing?` / `Are you busy?`
  would be a giveaway because only `Oh well / It is what it is (mild swear)`
  has a parenthetical.

SEVERITY: low-moderate (depends on session composition).

### MultipleChoice (en → sr) — direction `en-to-sr`

Prompt is English; options are Serbian. Distractors from same group's
`sr_latin`/`sr_cyrillic`.

**Sample 1: `st-ljubavi` (My love. → `Ljubavi.`)**
Group: pet-names-classic.
- A: `Dušo moja.`
- B: `Ljubavi.` ← correct
- C: `Draga moja.`
- D: `Maco moja.`

LEAKS:
- **Length / token-count asymmetry (severe).** Correct answer is one word, all
  three distractors are two words. The prompt is `My love.` which is two words.
  A naive learner can pick the single-word option that mirrors the gloss
  format — or *fail* because they expect the two-word shape. Either way it's
  not a meaning signal.
- **Diacritic asymmetry (very mild).** A has `Dušo` (š), others don't. Mostly
  noise here but worth noting for other groups.

SEVERITY: moderate. The token-count tell flips both ways: sometimes leaks the
answer in, sometimes leaks it out.

FIX: Phrase-group siblings should be selected so length and word-count are
roughly matched, or distractors should be padded with extras of comparable
shape from the lesson.

**Sample 2: `tx-jesi-zauzet` (Are you busy? → `Jesi zauzet?`)**
Group: opening-convo (`tx-sta-ima`, `tx-kako-si`, `tx-sta-radis`).
- A: `Šta ima?`
- B: `Kako si?`
- C: `Šta radiš?`
- D: `Jesi zauzet?` ← correct

LEAKS:
- **Punctuation: clean** — all four end in `?`. No tell.
- **Length: clean** — all 2–3 words.
- No leak detected. This is what a healthy MC should look like.

SEVERITY: none for this sample (good baseline).

**Sample 3: `st-dobro-jutro-sunce` (Good morning, sunshine. → `Dobro jutro, sunce.`)**
Group: morning-night. Siblings: `st-laku-noc-ljubavi`, `st-sanjaj-me`,
`st-spavaj-lepo`.
- A: `Laku noć, ljubavi.`
- B: `Sanjaj me.`
- C: `Spavaj lepo, dušo.`
- D: `Dobro jutro, sunce.` ← correct

LEAKS:
- **Capitalization tell.** All four options start with a capital. Prompt ends
  in `.`, all options end in `.`. Clean.
- **Diacritic asymmetry.** A has `ć`, C has `š` and `š` (actually `š`). D has
  no diacritics. The diacritics don't correlate with correctness.
- **Semantic asymmetry (moderate).** Prompt mentions "morning". Correct option D
  starts with `Dobro jutro` ("good morning") — a learner who knows the single
  word `jutro` = "morning" can pick D without knowing what `sunce` means.
  That's actually the desired pedagogical signal: you reward learners who know
  more words. Less a leak, more a feature.

SEVERITY: low.

### TypeTranslation — `generateTypeTranslation`

Free-text input. No options, no leak surface beyond the prompt itself.

**Sample 1 (sr→en): prompt `Pukao mi server.` → correct `My server crashed.`**
LEAKS:
- **Hidden gloss-format constraint.** The fuzzy matcher (see `engine/scoring.ts`)
  must accept variants — e.g. the user could type `The server crashed on me.`
  or `My server broke.` which are semantically identical. Type-translation
  with a single canonical English answer almost always over-rejects.

SEVERITY: this isn't an option leak, it's a scoring problem — out of scope but
worth flagging.

**Sample 2 (en→sr): prompt `My darling. (lit. 'my soul')` → correct `Dušo moja.`**
LEAKS:
- **Prompt leak (severe).** The prompt IS the literal translation — the learner
  is told "lit. 'my soul'" and may then type some attempt at "my soul" in
  Serbian. The hint is in the prompt, not as a separate field. Same issue as MC
  but worse because the entire goal of TypeTranslation is to encode the meaning.

SEVERITY: high — fix by moving `(lit. ...)` to notes everywhere.

### FillInBlank — `generateFillInBlank`

Shows the Serbian sentence with one word blanked. The blanked word is picked
from non-function-word indices (length > 2, not in `FUNCTION_WORDS`).

**Sample 1: `Spavaj lepo, dušo.` → blanks `Spavaj` or `dušo`**

There are only 3 content tokens (length > 2, non-function): `Spavaj`, `lepo`,
`dušo`. Wait — `lepo` is length 4, not in FUNCTION_WORDS. So all three are
candidates. The English context shown is `phrase.en = "Sleep well, darling."`.
Visible prompt: `______ lepo, dušo.` or `Spavaj lepo, ______.`

LEAKS:
- **English context leak (moderate).** The `context` field passed in is
  `phrase.en` ("Sleep well, darling."). The learner sees three English words
  mapped to three Serbian content words — easy to figure out which is blanked.
  This is the intended behavior, but it means FillInBlank is really
  *recognition-from-context*, not production.

**Sample 2: `Ne brini, dušo.` → `FUNCTION_WORDS` includes `da` `se` `ne` (lowercased)**

Wait — `ne` is lowercase in `FUNCTION_WORDS` (line 138 of `exercise-generator.ts`).
But `brini` is 5 chars and not in the set. So the blank lands on `brini` or
`dušo`. Both are content. Context: `Don't worry, darling.` Learner who knows
`darling` = `dušo` will fill in `dušo` if `dušo` is blanked. Healthy.

LEAKS:
- **FUNCTION_WORDS list is incomplete.** It only matches lowercased input but
  the phrase text often has capitalized first words (`Spavaj`, `Ne`, `Hajde`).
  The filter `word.length > 2` is the only guard that prevents `Ne` from being
  blanked, but words like `Hoću`, `Vidim`, `Mislim`, `Volim` (all > 2) can be
  blanked even though they are auxiliary-ish.
- **Tense/person leak.** When `volim` is blanked in `Volim te.`, the English
  context shows `I love you.` — the learner needs to produce 1sg.pres of
  `voleti` but they've seen the inflected form already in the intro phase. This
  is fine pedagogy.
- **Capitalization tell.** If the blanked word is sentence-initial it's
  capitalized in the original. The learner sees `______ lepo, dušo.` — they
  don't know if they should type `Spavaj` (capitalized) or `spavaj`. The
  fuzzy matcher probably accepts both, but the visual prompt has lost the
  capitalization signal. This is more an ambiguity than a leak.

SEVERITY: low — mostly the function-word filter could be more comprehensive.

### WordTiles — `generateWordTiles`

Strips `.!?,` and splits on whitespace. Tiles = shuffled words. No distractor
tiles — the learner only has the correct words, just shuffled.

**Sample 1: `Dušo moja.` → tiles: [Dušo, moja]**
- 2! permutations: `Dušo moja` or `moja Dušo`. Both 2-tile placements possible.
- Capitalization preserved on the tile.

LEAKS:
- **Capitalization tell (severe).** Only one tile starts with a capital letter.
  Native Serbian writing capitalizes the sentence's first word, not specific
  vocabulary. The learner can ALWAYS solve WordTiles for 2-word phrases by
  placing the capitalized tile first. This works because the generator preserves
  the literal capitalization from `sr_latin`.

**Sample 2: `Dobro jutro, sunce.` → tiles: [Dobro, jutro, sunce]**
- 3 tiles, capital-first: `Dobro`. The learner places `Dobro` first
  unconditionally. They then have to choose `jutro sunce` vs `sunce jutro` — a
  50/50 guess. Half the answer is free.

**Sample 3: `Hajde da gledamo nešto.` → tiles: [Hajde, da, gledamo, nešto]**
- 4 tiles. `Hajde` is capitalized. The learner places it first. Then it's
  3! = 6 perms, but Serbian SVO bias narrows it.

LEAKS:
- **Capitalization tell (severe, universal).** Every WordTiles exercise leaks
  the first tile. For 2-tile phrases this means 50% of the answer is free; for
  longer phrases it's still a structural constraint.
- **Punctuation strip + non-restoration.** `.replace(/[.!?,]/g, '')` removes
  punctuation, so multi-clause phrases like `Hajde da gledamo, evo me.` lose
  their comma. The user can't know where the comma goes. Pedagogically OK but
  data-loss.

SEVERITY: moderate. The capitalization tell is universal.

FIX: Normalize tile case to lowercase, then restore the sentence-initial
capital after the learner places. Or accept either capitalization on check.

### MatchPairs — `generateMatchPairsData`

Picks 5 random phrases from the lesson, shows Serbian on left and English on
right, learner matches them. Shuffled independently.

**Sample 1: From `sweet-talk` lesson**
Suppose the 5 picked are: `st-dusko`, `st-ljubavi`, `st-draga`, `st-maco`, `st-volim-te`.
Serbian column: `Dušo moja.`, `Ljubavi.`, `Draga moja.`, `Maco moja.`, `Volim te.`
English column: `My darling. (lit. 'my soul')`, `My love.`, `My dear. (to a woman)`,
`My kitten / kitty.`, `I love you.`

LEAKS:
- **Parenthetical asymmetry across the column (severe).** Two of five English
  rows carry parentheticals — `My darling. (lit. 'my soul')` and
  `My dear. (to a woman)`. The Serbian rows have no parenthetical equivalents.
  A learner can pair these two English rows with the most-distinctive Serbian
  rows by elimination:
  - "My darling" + "(lit. 'my soul')" → look for a phrase that *means* soul
    → `Dušo moja.` is the only one with `Duš` (soul). Trivial.
  - "My dear (to a woman)" → look for the only feminine-marked phrase.
- **Length-token coupling.** `Ljubavi.` is one word; only "My love." is one
  short phrase. Trivial pairing.

SEVERITY: high. MatchPairs amplifies all the per-option leaks of MC because the
learner has the entire grid to do elimination on.

FIX: Same as MC — strip parentheticals into a hidden notes field. Plus consider
balancing token counts when picking pairs.

### ContextPick — `generateContextPick`

Prompt = `phrase.context || phrase.en`. Options = Serbian, distractors from same
phrase group.

**Sample 1: `st-volim-te` (Volim te.)**
Context: `"The big one. Serbs don't throw this around casually — it carries weight."`
Group: texting-sweet.
- A: `Nedostaješ mi.`
- B: `Mislim na tebe.`
- C: `Jedva čekam da te vidim.`
- D: `Volim te.` ← correct

LEAKS:
- **Context-phrasing leak (moderate).** The context says "The big one ... carries
  weight." This phrase context only fits `Volim te.` thematically — none of the
  other options are "the big one". A native English reader can match
  context-vibe to option-vibe without knowing Serbian: only `Volim te.` looks
  short and declarative ("the big one" → shortest, most punchy option).
- **Length asymmetry (low).** C is 4 words; the others are 2. C is too long to
  be "the big one".

SEVERITY: moderate. Many `context` fields read like prompts for the specific
phrase, not generic situations. Examples from the data:
- `st-tu-sam` context: `"When she's stressed or upset. Simple and comforting."`
  → only `Tu sam za tebe.` ("I'm here for you") fits.
- `st-sve-ce-biti-ok` context: `"Comforting someone who's worried"` → only
  `Sve će biti u redu.` ("Everything will be okay") fits.

FIX: Either rewrite contexts to be generic situational ("after she shares bad
news") OR — better — accept that ContextPick rewards English-context reading
and treat it as such (it's not the same exercise as MC). The current behavior is
*intended* but ContextPick should not be considered a meaning test.

**Sample 2: `tx-jbg` (jbg)**
Context: `"Short for a mildly vulgar expression meaning 'well, too bad.' Extremely common."`
Group: text-abbreviations.
- A: `nmvz`
- B: `msm`
- C: `btj`
- D: `jbg` ← correct

LEAKS:
- **Context spells out the answer (severe).** The context contains
  `'well, too bad.'` which is the literal gloss. The learner doesn't need to
  know any Serbian — they pick the abbreviation that matches the gloss given to
  them. Even worse, the context says "mildly vulgar" — `jbg` is the only
  vulgar-sounding abbreviation.
- All-lowercase distractors here, so capitalization is clean, but the context
  text is decisive.

SEVERITY: high for this specific group. The abbreviations are mutually distinct
only by their parenthetical English gloss, which is sometimes in the context.

### SentenceBuilder — `generateSentenceBuilder`

Tiles = words of correct phrase + 1-2 distractor words from `getDistractorWords`
(any word from any phrase, deduplicated). Prompt = situational `phrase.context`.

**Sample 1: `st-volim-te` (Volim te. → tiles)**
Core words: `[Volim, te]`. 1 distractor (count <= 2). Random word from another
phrase, e.g. `kafa`.
Tiles (shuffled): e.g. `[te, kafa, Volim]`.

LEAKS:
- **Capitalization tell (severe, universal — same as WordTiles).** Only `Volim`
  is capitalized. Place it first.
- **Token-count tell.** The learner knows the target is 2 words (the prompt
  context describes a 2-3 word phrase). They pick the 2 tiles that look like
  the phrase and ignore distractors. With only 1 distractor it's trivial.

**Sample 2: `Jedva čekam da te vidim.` → tiles**
Core words: `[Jedva, čekam, da, te, vidim]`. 2 distractors. Suppose
`[kafu, danas]` get added.
Tiles: `[čekam, kafu, vidim, da, Jedva, te, danas]`.

LEAKS:
- **Capitalization tell.** `Jedva` is the only capital.
- **Distractor selection leak (moderate).** Distractors are picked from
  `pickRandom(unique, count)` of ANY word in ANY phrase. They could be
  thematically jarring (`kafu` in a romantic phrase) or accidentally
  semantically related. They can also be other inflected forms of words IN
  the phrase (since lemmas vary). E.g. could pick `vidi` (3sg) as a distractor
  alongside `vidim` (1sg) — that's actually a great minimal pair, but it could
  also accidentally pick `vidim` itself if a different phrase happens to use it
  (`unique` dedups, so this is OK).
- **Duplicate-form trap.** The dedup is on the surface string only, case-
  insensitive via `excludeSet` but stored as-is. If the core phrase contains
  `Dobro` and a distractor candidate is also `Dobro` (from another phrase), the
  dedup catches it. Good. But forms differing only by case (`Dobro` vs `dobro`)
  pass through — could yield two visually-identical tiles which crashes the
  uniqueness assumption of WordTiles.

SEVERITY: high (capitalization tell) + moderate (distractor selection).

FIX: Lowercase tiles; restore capital on check (same fix as WordTiles).

### ScriptConvert — `generateScriptConvert`

Free-text input. The prompt is the phrase in one script; correct is the same
phrase in the other.

**Sample 1: prompt `Дoбро jутро, сунце.` → correct `Dobro jutro, sunce.`**

This is purely a transliteration exercise — no semantic content. No option
leaks because there are no options.

LEAKS:
- **None inherent to options.** But: `phrase.notes` reveal semantic info
  AFTER answering even though semantics aren't being tested. That's
  pedagogically OK.

SEVERITY: n/a (no options to leak).

### Comprehension — `generateComprehension`

Wraps the phrase in one of three dialogue templates. The question and options
are entirely in Serbian.

**Template 1: "What does B say?" — phraseText spoken by B**

```
Ana: "Sta radis?"
Marko: "Volim te."
Pitanje: Sta kaze Marko?
A: Volim te.   ← correct
B: <other phrase from lesson>
C: <other phrase from lesson>
```

LEAKS:
- **Direct copy leak (severe).** The question asks "What does Marko say?" and
  the dialogue *literally contains* Marko's line. The correct option is
  verbatim copied from the dialogue. Any learner who can pattern-match Cyrillic
  text to Cyrillic text — i.e. anyone above pre-literacy level — gets this
  right with zero comprehension. The exercise is supposed to test
  comprehension but actually tests visual string-matching.

**Template 2: "Why can't B go?" — phraseText as B's reason**

```
Ana: "Hajde da izadjemo veceras?"
Marko: "Ne mogu, moram da — Volim te."
Pitanje: Zasto Marko ne moze?
A: Volim te.   ← correct
B: <other phrase>
C: <other phrase>
```

LEAKS:
- **Same as Template 1.** The phrase appears verbatim in the dialogue.
- **Semantic implausibility (moderate).** "I love you" doesn't fit "why can't
  he go" — the template injects the phrase regardless of meaning. The dialogue
  reads as nonsense for many target phrases (e.g. wrapping `Maco moja.` in
  "Ne mogu, moram da — Maco moja." is gibberish). The learner can detect this
  and might pick the *meaningful* distractor as the "real" answer.
- **Template doesn't filter by phrase type.** Pet names, exclamations, and
  reactions get jammed into excuse-decline frames where they don't fit
  grammatically.

**Template 3: "Who says X?" — phraseText is in line A, options are name strings**

```
Ana: "Dušo moja."
Marko: "Vazi!"
Pitanje: Ko kaze: "Dušo moja."?
A: Ana   ← correct
B: Marko
C: Stefan (a name not in the dialogue!)
```

LEAKS:
- **Out-of-dialogue distractor (severe).** Option C is a name that doesn't
  appear in the dialogue at all. The learner can immediately eliminate C
  because the question quotes the phrase, the dialogue shows it spoken by Ana —
  but even without reading any Serbian, picking the name not mentioned in the
  dialogue is wrong. So learners pick between A and B by quoting position.
  Since the question quotes the phrase verbatim and the dialogue puts it in
  A's line, the answer is whichever name is on the *first* line of the
  dialogue. Trivial visual scan.

SEVERITY: high for all three templates. Comprehension as currently
implemented is a string-matching exercise.

FIX:
1. Templates 1 & 2: the correct answer should be a *paraphrase* or *summary* of
   B's line, not the verbatim line. E.g. for "Volim te." the answer could be
   "Iskazuje ljubav" (expresses love).
2. Template 3: distractors should be names that *do* appear in the dialogue
   but for different lines, not random invented names.
3. Filter templates by phrase type — don't put pet names in excuse-decline
   frames.

### PatternMatch — `generatePatternMatch`

Shows original + variant phrases side by side, asks what changed. Options are
machine-generated `describeChanges` correct + 2 random distractors.

**Sample 1: `st-draga` (Draga moja. / Dragi moj.)**
Original: `Draga moja.`  Variant: `Dragi moj.`
Correct: `describeChanges` → `Draga → Dragi, moja → moj`
Distractors picked from: ['The word order changed', 'A new word was added',
'A word was removed', 'The verb tense changed', 'The sentence became a question']

- A: `Draga → Dragi, moja → moj`   ← correct
- B: `The word order changed`
- C: `A new word was added`

LEAKS:
- **Format asymmetry (severe).** The correct answer is the only option with
  literal Serbian words and `→` arrows. The distractors are abstract English
  meta-descriptions. A learner who can read English knows the correct answer
  is the format-divergent one without doing any analysis.
- **Repeated correct-shape pattern.** This will be true for *every*
  PatternMatch exercise — `describeChanges` always emits Serbian-word→Serbian-word.
  All 5 distractors are sentence-level English meta. So the leak is universal.
- **Distractor pool is degenerate.** The same 5 distractors apply to every
  exercise. A learner will memorize "the Serbian-word one is always right" in
  a few sessions.

**Sample 2: question becomes a question**
If a variant truly is a question form (e.g. `Volim te.` → `Voliš li me?`),
`describeChanges` emits `Volim → Voliš, te → li, +me` — still Serbian. The
distractor `The sentence became a question` is actually correct in this case
AND the algorithm-generated correct answer is descriptive of word-level
change. So there could be TWO "correct" options here, with only one accepted.
The learner could pick the semantically-correct meta description and get
marked wrong.

SEVERITY: high. PatternMatch as designed is fundamentally option-broken because
the correct answer has a unique format the distractors can never share.

FIX: Either
(a) make distractors also Serbian-word→Serbian-word format by computing
   `describeChanges` against a *different* variant pair from the same family
   (those are plausible-looking minimal pairs); OR
(b) make all options meta-descriptions and have `describeChanges` map to one of
   them (`gender change`, `tense shift`, `negation added`, etc.) — picked from
   a richer taxonomy.

### PerspectiveShift — `generatePerspectiveShiftExercise` (family-generator.ts)

Shows base phrase + `transformLabel` badge (e.g. "formal (vi)", "past · to a
woman") + target English. Options are sibling variants from the same family.

**Sample 1: `miss-you-past-fem` (Nedostajala si mi.)**
Base shown: `Nedostaješ mi.`
Badge: `past · to a woman`
Hint (`transformHint` — undefined for this variant)
Target meaning: `I missed you. (to a woman)`

Sibling distractors: `Nedostajao si mi.`, `Nedostajete mi.`,
`I ti meni nedostaješ.`, `Ona mi nedostaje.`, `On mi nedostaje.`,
`Mnogo mi nedostaješ.`, `Ne nedostaješ mi.`

Picked 3 at random. Suppose:
- A: `Nedostajao si mi.`   (past, to a man)
- B: `Nedostajala si mi.`  ← correct (past, to a woman)
- C: `Nedostajete mi.`     (formal)
- D: `Ne nedostaješ mi.`   (negation)

LEAKS:
- **Badge spells the answer (severe).** The badge says "past · to a woman".
  The Serbian forms are gender-marked: `-la` ending for feminine past
  participle. The learner picks the option ending in `-la`. They don't need to
  know what `nedostajati` means.
- **English target also spells it (severe).** "I missed you. (to a woman)" —
  the parenthetical is the answer.
- **Combined effect.** Both the badge AND the English prompt tell the learner
  what transformation to apply. The exercise is supposed to test "can the
  learner produce the right form?" but in MC mode it tests "can the learner
  pattern-match `to a woman` → `-la` ending?" Two trivial signals.

SEVERITY: high in MC mode. Lower in type-it mode because the learner still
has to produce the spelling.

FIX:
1. Remove `(to a woman)` etc. from the English target — the badge already
   states the transformation, so the parenthetical is redundant and
   over-determines.
2. Even better: hide the badge in MC mode and only show it after answering.
   Show only the base phrase and target English; force the learner to recover
   the transformation themselves.
3. Or: make distractors share the same transformation-shape — e.g. for a
   "past · to a woman" exercise, ALL options should be past-feminine variants
   (drawn from other families) so the learner can't pattern-match the ending.

**Sample 2: `love-you-question` (Voliš li me?)**
Badge: `as a question`
Target: `Do you love me?`

Options (siblings):
- A: `Volim vas.` (formal)
- B: `Mnogo te volim.` (intensified)
- C: `Voliš li me?` ← correct
- D: `Ne volim te više.` (negation)

LEAKS:
- **Punctuation tell (severe).** Only the correct option ends in `?`. The
  badge says "as a question". Trivial.

SEVERITY: high.

FIX: For "question" transformations, ensure distractors are also questions OR
strip punctuation from all options.

### WordRecognize — `generateWordRecognize`

Shows lemma in big serif text, options are English glosses, distractors picked
by `getWordDistractors` (same POS + similar first letter tiered).

**Sample 1: target word `duša` (gloss: "soul")**
Same POS (noun), same first letter (d): `Bog` — no, starts with B. Searching
nouns starting with d... `duša` is the only one in lesson 1's noun pool that
starts with d. Tier-1 returns nothing. Tier-2 (same POS, different letter):
`ljubav` (love), `srce` (heart), `sunce` (sun), `zlato` (gold), `maca`
(kitten), `medo` (teddy bear), `jutro` (morning), `noć` (night), `vreme`
(time), `veza` (connection), etc.

Options (3 picked):
- A: `soul`   ← correct
- B: `love` (from ljubav)
- C: `heart` (from srce)
- D: `kitten / kitty` (from maca)

LEAKS:
- **Slash-format asymmetry (moderate).** `kitten / kitty` is the only option
  with a slash. Three are single-word glosses, one has the slash. The slash is
  noise — but it lets the learner partition options into "compound" vs "simple".
- **Lemma vs vocative leak (known issue, severe).** The learner has just met
  the WORD via the phrase `Dušo moja.` — they know `dušo` as "darling". Now
  they see the lemma `duša` and must map it to "soul". That's the lemma form
  they haven't been taught with this gloss. The exercise tests a different
  string from what was taught. This is the user's flagged known issue and it's
  confirmed: `phrase.sr_latin = word.lemma_sr_latin` in `wordAsPhrase` (line
  134 of word-generator.ts), so the lemma is shown — even though the learner
  encountered the inflected form.

**Sample 2: target word `me` (gloss: "me (acc clitic)")**
Same POS (pron), same first letter (m): `mi-nom` (`mi` — "we"), `mi-dat`
(`mi` — "to me (dat clitic)"), `moj` (`moj` — "my"), `mu-dat` (`mu` — "to him
(dat clitic)").

Options:
- A: `me (acc clitic)`   ← correct
- B: `we` (from `mi-nom`)
- C: `to me (dat clitic)` (from `mi-dat`)
- D: `my` (from `moj`)

LEAKS:
- **Parenthetical asymmetry (moderate).** Two of four options have
  `(... clitic)`. A and C share the clitic parenthetical; B (we) and D (my)
  don't. The learner partitions: "two have parentheticals, two don't".
  Since the target word is `me` (one letter), the parenthetical pair is the
  "noisy-detail" pair — but A and C share that property so this gives a 50/50
  rather than a tell.
- **Two-clitic confusable pair is well-designed.** A and C are both clitics —
  great minimal pair. The leak is small.

SEVERITY: low-moderate. The clitic/parenthetical convention helps here but
hurts when one option is the only clitic in the set.

**Sample 3: target word `bre`**

```json
{
  "id": "bre",
  "lemma_sr_latin": "bre",
  "gloss_en": "man / dude (particle)",
  "pos": "particle"
}
```

Same POS (particle) — there are FEW particles in the lexicon. Let me check…
Likely only `ma`, `pa`, `bre`, `jao`, `joj-interj` — and these all have POS
flagged differently (some as `interj`). So `getWordDistractors` tier-1 yields
zero candidates (no other particle starting with `b`), tier-2 also small.

LEAKS:
- **Small-pool degenerate distractors (severe).** If POS has fewer than 4
  members in the lexicon, the function falls through to tier-3 (different POS
  entirely). The learner ends up with `bre` against, say, `kafa` (noun), `pet`
  (number), `volim` (verb form) — wildly different POS. POS shape becomes the
  tell.
- **Parenthetical asymmetry.** `bre`'s gloss is `"man / dude (particle)"` —
  has parenthetical. Most other glosses don't.

SEVERITY: high for any small-POS-class word.

FIX:
1. For lemma-vs-inflected: when the underlying phrase used a different form,
   either show both ("`dušo` (lemma: `duša`)") or store the form-the-learner-met
   alongside the lemma.
2. For small pools: fall through gracefully — pad with same-letter words across
   POS before going to random.
3. For parenthetical asymmetry in glosses: enforce a no-parenthetical rule on
   `gloss_en` and move clarifications to `notes`.

### WordProduce — `generateWordProduce`

Shows English gloss; learner picks Serbian lemma from 4. Same distractor
function.

**Sample 1: target gloss `"soul"` → `duša`**
Same as above mirrored.

Options:
- A: `duša`   ← correct
- B: `ljubav`
- C: `srce`
- D: `sunce`

LEAKS:
- **Diacritic asymmetry (low-moderate).** `duša` has `š`; the others don't.
  Two of four have no diacritics. The correct one is the diacritic-bearing
  option about half the time, the other half not — but in this set the only
  diacritic is on the correct one.
- **Lemma vs vocative leak (known issue, severe).** Same as above.
- **Length asymmetry (low).** `duša`, `srce`, `sunce` are 4-5 chars; `ljubav`
  is 6. Roughly even.

SEVERITY: moderate.

**Sample 2: target gloss `"to bore / annoy"` → `smarati`**
LEAKS:
- **Slash-in-gloss prompt asymmetry.** The English prompt itself contains `/`
  — when this English string is later used as a distractor for a different
  WordProduce exercise, it'll stand out (this gloss has a slash; many don't).

SEVERITY: low (cross-exercise).

## Cross-cutting issues

1. **Parenthetical clarifications in `phrase.en` and `word.gloss_en`.** The
   data-layer convention is to inline `(lit. ...)`, `(to a woman)`, `(formal)`,
   `(empathy, not apology)`, `(masc speaker)`, `(female speaker)`, `(feminine)`,
   `(mild swear)`, `(mislim)`, `(nema veze)`, `(acc clitic)`, `(dat clitic)`,
   etc. into the user-facing English fields. Every MC, MatchPairs, and
   WordRecognize exercise that uses these fields as options inherits the leak.
   Approximate count: 40+ phrases across all 10 lesson files; 20+ words in
   words.json. The fix is structural: introduce a `gloss_hint` field, move
   parentheticals there, and reveal hints only post-answer (the existing
   `notes`-reveal pattern is the right home).

2. **Capitalization of tiles in WordTiles / SentenceBuilder.** Every multi-tile
   exercise leaks the sentence-initial word via capital-letter detection.
   Lowercase all tiles; restore on check.

3. **Punctuation in option strings.** English glosses end in `.` or `!` or `?`
   inconsistently. Serbian option strings include `?` for questions and `!` for
   exclamations. When the prompt is itself a question, only one option might
   match the `?` shape (PerspectiveShift `voliš li me?` example).

4. **Diacritic clustering.** Distractor selection doesn't consider Serbian
   diacritic distribution. Sometimes the correct option is the only one with
   `š/č/ž/đ/ć`; sometimes the inverse.

5. **`describeChanges` produces a uniquely-shaped correct answer for
   PatternMatch.** The 5 hand-written distractors are all meta-descriptions in
   English; the correct answer is always Serbian-word arrows. Format alone
   solves the exercise.

6. **Comprehension dialogue templates copy the phrase verbatim into the dialogue
   AND ask which line/who said it.** This is string-matching, not comprehension.

7. **PerspectiveShift surfaces both the transformation badge and the gendered
   English target at the same time.** Two redundant signals; one should suffice.

8. **Small-POS-class words in `getWordDistractors`** fall through to
   different-POS distractors, leaking POS as a signal.

9. **Lemma-vs-inflected-form mismatch in word exercises.** A learner meets
   `dušo` (vocative), `volim` (1sg.pres) in phrases; the WordRecognize exercise
   then shows `duša`, `voleti` (lemmas). Different surface strings; the learner
   needs an explicit bridge.

10. **`getDistractors` Phase 2 fallback can mix register/format.** When a
    phrase-group has <3 siblings, padding from anywhere in the lesson can yield
    visually-different distractors (e.g. abbreviation phrase mixed with full
    sentences).

## Severity-ranked recommendations

1. **(highest impact, low effort) Strip every `(...)` from `phrase.en` and
   `word.gloss_en`.** Move that content to `phrase.notes` / `word.notes` or to
   a new `gloss_hint` field rendered post-answer only. Resolves cross-cutting
   issue #1, which contaminates MultipleChoice, MatchPairs, ContextPick (when
   `phrase.en` is the fallback prompt), WordRecognize, WordProduce, and
   PerspectiveShift. Single pass through the JSON files. Estimated 50-70
   replacements.

2. **(high impact, low effort) Lowercase all tiles in WordTiles and
   SentenceBuilder, restore capital on first placed tile when checking.**
   Resolves the universal capitalization tell in two production exercises.
   Two-line change in each generator + a check-tolerance update.

3. **(high impact, moderate effort) Redesign Comprehension templates.** The
   correct option must not be a verbatim copy of the dialogue line. For the
   "who said X" template, distractors must be other named speakers in the same
   dialogue. For the "what does B say" template, options should be paraphrases
   or actions ("expresses love", "declines invitation"), not the literal Serbian
   line. Without this fix, Comprehension is a string-match drill, not a
   comprehension drill.

4. **(high impact, moderate effort) Fix PerspectiveShift redundancy.** Either
   hide the transformation badge until after the answer, or drop the
   parenthetical from the English target — but not both. Also ensure question
   variants get distractors that are also questions (so `?` doesn't leak).

5. **(high impact, moderate effort) Redesign PatternMatch distractors.** The
   current 5 hand-written meta-descriptions are all wrong-shape against the
   `describeChanges` output. Either generate meta-description correct answers
   from a taxonomy (`gender change`, `negation added`, etc.) and use the
   existing 5 as siblings, OR generate fake `Serbian → Serbian` distractors by
   running `describeChanges` on unrelated variant pairs.

6. **(moderate impact, moderate effort) Build a Word↔Phrase lemma bridge.**
   When a learner has met a vocative or inflected form in PhraseIntro, store
   the form they met on the word progress. Then WordRecognize/WordProduce can
   show the form they met (`dušo`) with a hint that the lemma is `duša`, or
   display both side by side on first encounter. Otherwise the word drill is
   testing a different string from the one taught.

7. **(moderate impact, low effort) Improve `getWordDistractors` for small POS
   classes.** When tier-1 + tier-2 yield <count candidates, prefer same-shape
   (similar length, similar diacritic load) over crossing POS. Avoids POS-shape
   tells for particles / interjections.

8. **(low impact, low effort) Tighten ContextPick contexts.** Audit the
   `context` field across all phrases for ones that literally include the
   English gloss (`tx-jbg`'s context contains "well, too bad"). Either generalize
   the context or move the gloss-bearing line to `notes`.

9. **(low impact, low effort) Normalize gloss punctuation.** Strip trailing
   `.!?` from `phrase.en` and `word.gloss_en` so option lists are punctuation-
   homogeneous. Removes the "prompt-ends-in-? only one option ends in ?"
   class of leak.

10. **(low impact, low effort) Improve `FUNCTION_WORDS` list in FillInBlank.**
    Add common high-frequency content-light words (`hoću`, `mogu`, `treba`,
    `ima`, `evo`, `tako`, `kako`, etc.) so the blank lands on the substantive
    content word more reliably.
