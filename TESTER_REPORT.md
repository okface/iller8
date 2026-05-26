# Tester report — iller8 word layer (commit ee6c4f3)

## My profile
I'm a thirtysomething English-speaking developer. My girlfriend is half-Serbian, my best friend at work is Bosnian, and they both keep dropping into Serbian when I'm in the room. I've never studied a Slavic language — no cases, no aspect, no grammatical gender. The Cyrillic alphabet looks like static to me. I downloaded iller8 because Duolingo doesn't do Serbian and I want to be able to text my girlfriend "miss you" without using Google Translate. I'll do 10 minutes a day if the app respects my time. I will quit forever if it feels like busywork.

## Journey 1: First open
I land on the Dashboard with zero progress. The header says "Dobro veče." with "Good evening." underneath, which is nice — it's already teaching me one phrase passively. Then a three-cell stat strip: LEARNED 0, DUE 0, ACCURACY —. Below that a daily-goal bar at 0/whatever. Then two big cards: "CONTINUE · 01 · Slatke reči" (with a "0 of N phrases" subtitle) and a dimmed "REVIEW · Nothing." Below that a 2×2 tile grid: **Words** (with "0 / 156 met"), **Hammer**, **Perspective**, **Catalog**. Then "Phrase of the day" with a random one from the deck. Then the lessons list.

What worked: I have an obvious place to tap. The big amber "CONTINUE" card is clearly the front door, and I'd tap that without thinking. The "Phrase of the day" is a charming touch — even just sitting on the home screen I've now seen one piece of Serbian. The fact that the greeting itself is bilingual passive content is genuinely clever; that's three free seconds of language exposure before I do anything.

What's painful: there are five different ways to start drilling — Continue, Review, Words, Hammer, Perspective, Catalog — and I have **zero** intuition about which is "the right one." The card subtitles try to help ("Single words, both directions. Beginner-first." vs "Random phrases across all lessons.") but on a first run I can't tell what "Perspective" means at all ("Same phrase, many forms" — what?). The dashboard is dense and treats me like an intermediate user with a routine. A first-time-user state where Continue is the only highlighted option and the rest are visibly secondary, or even a Day-1 onboarding card ("Start with Words → 12 simple lemmas, then Lesson 01"), would cut the cognitive load. Right now, on a screen designed for someone with progress, the first-time visit feels like walking into a gym I haven't joined yet. Suggestion: in `Dashboard.tsx`, when `totalLearned === 0`, hide or collapse Hammer / Perspective / Catalog and replace them with a single "Start here" card pointing at Words.

## Journey 2: Words tab — landing
I tap Words. Header: "VOCABULARY · ONE WORD AT A TIME · Words" with body copy "Drill single words both directions. Distractors are minimal pairs — same part of speech, similar shape — so you have to actually know each word." That copy is *for the builder*, not for me — it's defending a design decision I haven't made yet. As a learner I don't care about distractor philosophy; I care about "is this hard, is this short, will I make it."

Stats strip: TOTAL 156, MET 0, MASTERED 0. Then "FILTER · OR DRILL ALL" with pill buttons: **all**, **verbs 0/30-something**, **nouns 0/...**, **adjectives**, **pronouns**, **prepositions**, **conjunctions**, **adverbs**, **particles**, **numbers**, **interjections**. Eleven pills. That's a lot for someone who can't define a particle. Then a fat "Drill 12 words" button. Below that, the per-POS breakdown bars (also 11 rows, all at 0%). Below that, "ALL WORDS · 156" — a Card listing the first 30 with a gray dot, Serbian lemma, English gloss, POS chip. "+126 more" at the bottom.

This page is *information dense* in a way that feels expert-mode. A first-day learner doesn't have a feel for whether they want verbs or nouns, and tapping "particles" with no context is a coin flip. The MET 0 / MASTERED 0 strip is honest but morale-flat. And critically: nothing tells me *which 12 words* I'm about to drill — `pickWordsForSession` picks them randomly from buckets, so I'm rolling dice. If the random seed picks me `vrh` (peak), `veza` (relationship), `pun` (full), `bag` (bug), `kodirati` (to code), I'm going to bounce — that's not the vocabulary I came here for as a romantic-partner learner. Suggestion: show a preview of the 12 picks before the Drill button, and frontload by frequency / lesson-01 relevance for the first session.

The per-POS breakdown is the right *idea* but the wrong *level* of granularity for Day 1. Adverbs and particles should be hidden behind "More" until I'm past 50 words met. The list-of-30 at the bottom is useful as a peek-into-the-deck, but it's just alphabetical (well, source-order from the JSON) — I'd want it sorted by "next up for me" or by frequency.

## Journey 3: One Word Recognize
Let's say `voleti` came up. I tap Drill, and the engine fires `generateWordRecognize(voleti, allWords, 'latin')`. `getWordDistractors` looks for tier-1: same POS (verb), same first letter (v). In the lexicon I see two candidates: `videti` (to see) and `važiti` (to apply / hold). So distractor 1 is one of those — pick `videti`. Distractor 2: still under tier-1 (`važiti`). Distractor 3: tier-1 exhausted, falls into tier-2 — any other verb, random. Let's say it grabs `mrzeti` (to hate).

So I'd see:
- Big word: **voleti** (with "волети" underneath)
- POS badge: "verb"
- "WHAT DOES THIS WORD MEAN?"
- A: to see
- B: to apply / hold
- C: to love
- D: to hate

This is **good**. Genuinely good. Three of four options are emotionally-charged verbs, and "to apply / hold" is a curveball that punishes a careless guess. There's no length tell (`videti` 6 letters, `voleti` 6 letters, `mrzeti` 6 letters, `važiti` 6 letters — all are infinitives ending in -ti). I cannot silhouette-match. If I haven't memorized `voleti` I'm at 25%. This is the headline win of the word layer and the audit's pedagogy advice landing concretely on screen.

Two complaints. First, the post-answer "WHY" note for `voleti` says "The most important word for your girlfriend. Save 'Volim te' (I love you) for when you mean it." — and that's lovely, but it shows *after* the answer. On a first encounter where I had to guess, a tiny pre-prompt hint ("affection · 1st-person form: volim") would scaffold the new learner without giving the answer away. Second, "to apply / hold" as a gloss for `važiti` is grammatically meaningful but contextually weird — when distinguishing four English meanings, learners need concept-level glosses, and "to apply / hold" reads like two separate verbs. The lexicon's `gloss_en` strings should be single-concept where possible.

## Journey 4: One Word Produce
Now `dusa` — Produce direction. Prompt: "soul" (32px, bold). POS pill: "noun · f". `getWordDistractors` for `dusa`, tier-1 (noun, starts with d): `dan` (day), `drug` (buddy / mate), `dete` (child). All three slots filled in tier-1 — no tier-2 needed. Options shuffled:

- A: drug
- B: duša
- C: dete
- D: dan

I cannot guess this by length (3, 4, 4, 3 — duša is the longest by one character because of the `š`). All four start with `d`. All four are short concrete nouns. If I don't know `duša`, I have a 25% shot. Even better: the diacritic on `š` is now a *feature* — I see `duša` and the others have no diacritic, so the visual distinctiveness is correct-coded. The only minor "tell" is the `š`, but that's because `duša` is genuinely the only word with that letter in the set — fair.

What I'd actually do as a beginner: I'd remember "soul = something romantic, my girlfriend says it as 'dušo'" and recognize the `du-` stem. That's *exactly* the encoding the app wants. Production MC at this quality is the single biggest pedagogical jump from anywhere else in the app — phrase-level MC just doesn't have this kind of constrained distractor pool.

One niggle: the POS badge says "noun · f" — that's gendered information I haven't earned yet. For Day 1, the gender label is noise; for Day 30 it's gold. Either tuck it behind a long-press / info icon, or only show it once I'm at bucket ≥ 2 on that word.

## Journey 5: Lesson 01 PhraseIntro
I go back and tap Continue (Lesson 01 Sweet Talk). PhraseIntro walks me through 5 phrases. With the new word layer, each one has a "WORD BY WORD" chip strip after the big Serbian display.

**Phrase 1: "Dušo moja."** Chips: `duša → soul`, `moj → my`. The hero text says "Dušo moja." but the chip says `duša`. That mismatch is real and load-bearing — `dušo` is the vocative of `duša`. The notes section (revealed later) explains "'Duša' means soul — calling someone 'dušo' is like saying they are your soul. Vocative case." So the lesson eventually decodes it, but in the *intro screen the chip strip is actively confusing*. I see "Dušo" in the phrase and "duša" in the chip and as a beginner I think "wait, are those the same word? Why are they spelled differently?" The chip is showing the lemma form, which is linguistically correct but pedagogically a footgun for case-heavy Serbian. Suggestion: render chips as `dušo (← duša) · soul` when the surface form differs from the lemma, or add a tiny "vocative" / "dative" inflection badge on the chip.

**Phrase 2: "Ljubavi."** Chip: `ljubav → love`. Same vocative issue (`ljubavi` is voc. of `ljubav`), but it's at least visually closer. Fine.

**Phrase 3: "Draga moja."** Chips: `drag → dear`, `moj → my`. Hero is "Draga moja" — chips say "drag" and "moj." Both adjective+pronoun have feminine endings I can't see in the chips. The notes say "Use 'dragi' when speaking to a man." Now I have *four* surface forms in my head (`drag`, `draga`, `dragi`, plus implied dragoj/dragu) and zero idea how to choose. This is the moment the app should *celebrate* gender agreement with a tiny inline pattern explainer — instead the chip strip pretends `drag = dear` and walks away.

**Phrase 4: "Maco moja."** Chips: `maca → kitten / kitty`, `moj → my`. Same vocative pattern — `maco` from `maca`. By now I've seen three "lemma ≠ surface" cases in a row and I'm developing a mistrust of the chip strip.

**Phrase 5: "Medo moj."** Chips: `medo → teddy bear`, `moj → my`. `medo` is one of the rare cases where the lemma *is* the vocative form (it's already in vocative-ish form in the dictionary). Fine.

The chip strip is the right *idea* — when it works it's transformative; "Sunce moje" with chips `moj`, `sunce` and you instantly see the agreement pattern. But for the first lesson (which is pet-name-heavy and therefore vocative-heavy) the lemma chips are systematically out of sync with the surface forms, and the app doesn't acknowledge that gap. Either tag each chip with its inflection ("vocative", "dative pl.") or — better for Day 1 — show the *surface form* in big and the *lemma* in a smaller subscript: `dušo` with `← duša` below in mono-mute. Right now the chip strip teaches "vocabulary in isolation," which sells the headline win short.

## Journey 6: Lesson 01 first exercise
After intro, the first three exercises hit. All five phrases are bucket 0 → `exerciseTypesForBucket[0]` is `['multiple-choice']`, direction sr→en. So three MCs in a row, sr→en, on bucket-0 phrases. Let's trace one: target `Dušo moja.` (en: "My darling. (lit. 'my soul')"). `getDistractors` first tries the same phrase group ("Classic Pet Names"), which is `[ljubavi, draga, maco]` → glosses are *all four* "My love", "My dear", "My kitten" — and they're all "my [pet name]." So options:

- A: My love.
- B: My darling. (lit. 'my soul')
- C: My dear. (to a woman)
- D: My kitten / kitty.

The good news: same-group distractors are semantically tight — every option is a romantic pet name. The bad news: the English gloss for "My darling" includes the parenthetical `(lit. 'my soul')` — so the correct answer is *visually* longer and more elaborate than the others. A learner who can't read Serbian but can read English options will see option B as "the one with the explanatory parenthetical = the one the teacher wrote a note about = the correct one." That's a signal leak. Three of four options also start with "My " — which is *fine* and helpful — but the asymmetry of the parenthetical on the right answer is a tell. Fix: move literal-translation parentheticals out of `en` and into `notes`, or include them on at least one distractor.

Compare with the Word drill: in Recognize the four English options for `voleti` were "to see / to apply / to love / to hate" — clean four-token verbs, no signal leak. The new Word drill is **tighter** than the phrase MC. That's a real qualitative difference and Lesson 01 MC feels coarse by comparison now that I've seen the Word version. The phrase distractors at bucket 0 are doing a reasonable job because same-group phrases are tight, but the parenthetical-leak issue is systemic — `01-sweet-talk.json` has multiple phrases with `(lit. ...)` annotations on `en`.

## Journey 7: Lesson 03 untagged
I check the file and yeah — Lesson 03 has zero `wordRefs`. Now I open Lesson 03 and run PhraseIntro. `phrase.wordRefs ?? []` is empty → `refWords` is empty → the `refWords.length > 0` guard in PhraseIntro.tsx hides the entire "WORD BY WORD" block.

Experience: the intro screen is just *hero phrase → Reveal meaning → English + notes → Next.* The phrases like "Ćao!" or "De si?" are short enough that the missing chip strip isn't immediately painful — there's not much to break down. But "Javi mi se kad stigneš." (5 words, 2 verbs, a dative pronoun, a conjunction, a subjunctive `kad`) gets *no* word-by-word support, while "Dušo moja." in Lesson 01 gets two chips. As a learner who's been trained for two lessons that PhraseIntro shows word chips, hitting Lesson 03 feels like a regression — the page is suddenly more sparse and the long phrases feel harder to crack.

Worse, "tx-kasnim" has the note "'Kasniti' = to be late. 'Malo' = a little." — that's the chip strip *written into the notes field*. Same data, but it's behind the "Reveal meaning" click and rendered as one long sentence instead of two colored chips. The author clearly *wanted* the chip experience here and is writing it manually in prose. Fix: backfill `wordRefs` on lessons 03–10. The schema is already there, the lexicon has the words (`raditi`, `čekati`, `videti`, `misliti`, `kasniti`, etc. — though `kasniti` might be missing; quick check needed). At minimum, run a script that suggests `wordRefs` candidates for every untagged phrase by lemmatizing each word and matching against the lexicon, then human-review.

## Summary

### Top 3 wins from the word layer
1. **Minimal-pair distractors actually work.** `voleti` against `videti / važiti / mrzeti` and `duša` against `dan / drug / dete` are the kind of forced-discrimination MCs that build real retrieval, not pattern recognition. This is the highest-quality drill anywhere in the app right now.
2. **The chip strip in PhraseIntro is the right *gesture*.** When a phrase has clean nominative content words (e.g. "Sunce moje" → `moj`, `sunce`), the chips make the phrase feel composed of pieces. That's the encoding I came here for.
3. **The Words tab gives me a sense of corpus size.** "0 / 156 met" on the home screen is a concrete progress target I can mentally peg to ("if I do 12/day, I'll meet them all in 13 days"). That's motivating in a way "lesson 1 of 10" isn't.

### Top 3 pain points still present
1. **Vocative/case mismatch between chips and hero text is unaddressed.** Lesson 01 is *built* on pet names which are *all* vocative. The chip strip showing lemmas in dictionary form (`duša`, `maca`, `drag`) actively misleads me about what I see in the phrase (`dušo`, `maco`, `draga`). The most common Serbian word for "darling" reads as a different word on the chip than on screen, and nothing labels the gap. This is the biggest pedagogical bug in the whole word layer.
2. **Dashboard overwhelms a Day-1 user.** Five drill modes, eleven POS filters, a per-POS bar chart, a 30-row word list, a phrase-of-the-day, and a 10-lesson list all on one screen. With zero progress everything is gray bars. The app doesn't have a "first session" mode and that's the difference between a learner who taps Continue confidently and one who closes the app.
3. **Lessons 03–10 have no `wordRefs`.** The chip strip — the headline feature of this build — turns off completely after lesson 02. Lessons 03 onward feel hollow now that I know what they could look like. Backfilling is data-only work; the engine and UI are already there.

### Top 3 things I'd ship next
1. **Render chips with surface form + lemma.** In `WordChips.tsx`, when the phrase's surface form differs from `word.lemma_sr_latin`, show the surface form prominently and the lemma in subscript with an inflection tag. This requires `wordRefs` to become richer than string IDs — likely `{ id: string; surface?: string; case?: 'voc' | 'dat' | ... }`. One schema bump, lessons 01 and 02 get retagged, the rest is downstream.
2. **Backfill `wordRefs` on lessons 03–10.** Write a one-off script (with Claude or local lemmatization) that suggests candidate chips for every untagged phrase, then human-review in a quick pass. Estimated 1–2 hours of focused work given the lexicon already exists. This single change closes the regression-after-lesson-2 cliff.
3. **Add a Day-1 dashboard variant.** In `Dashboard.tsx`, gate the secondary tiles (Hammer / Perspective / Catalog) and the lessons-list density on `totalLearned > 0`. For an empty state, show a single hero "Start with Lesson 01" card plus the Words tile as a secondary path, and explain in two short sentences what each does. Once the user has anything in their `progress.phrases` the full dashboard returns.
