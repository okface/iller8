# iller8 codebase health check (commit ee6c4f3)

## TL;DR

- **Surprisingly clean for a fast-growing solo project.** Engine/UI/data separation is real, types are disciplined (zero `any`, no `@ts-ignore`, no `as any`), and the recently-added Word layer slots in cleanly.
- **Dominant smell is duplication, not architecture.** Five exercise components hand-roll the same 4-option button renderer (~400 lines copy-paste); three drill pages hand-roll the same `browse | drill | finished` state machine.
- **Dead code on the critical path:** `src/engine/word-readiness.ts` is fully written and imported from nowhere. The audit's readiness gate is shipped as a file but not wired up.
- **Two real bugs and seven lint errors** in `LessonView.tsx` and `ReviewSession.tsx`.
- **Next-phase readiness:** mostly there. Two forced schema bumps before audio + lesson backfills land: an `audio` field on Phrase/Word, and a richer `wordRefs` shape carrying surface form + case tag. Both additive, both an afternoon.

---

## What's solid

**`src/engine/srs.ts` (98 lines).** Pure functions, no React, no localStorage, no side-effects beyond `Date.now()`. Reusing the same map for `word:<id>` keys is a clever migration-free move. The most testable file in the repo.

**`src/engine/script-converter.ts` and `src/engine/scoring.ts`.** Tiny, pure, no UI/store deps. The Levenshtein fuzzy check is exactly what beginner typing exercises need.

**Type discipline.** Grepped for `any`, `as any`, `@ts-ignore`, `@ts-expect-error`, `as never`, `as unknown` across `src/` — zero hits. The only casts are `as Lesson[]` / `as Word[]` on JSON imports, which are unavoidable. Phrase, Word, Exercise, UserProgress all carry inline JSDoc.

**`src/data/words/words.json`** (156 entries). Schema is rich (lemma/cyrillic/gloss/POS/gender/aspect/forms/examples/appearsIn/rank/notes), hand-curated, with the `forms` array actually used for pronouns and verbs. Foundation the next phase rests on.

**`src/components/ui/DrillFrame.tsx`** (90 lines) — the right shape of UI primitive. Used across all four drill flows.

---

## What's frayed but OK

**Tailwind v4 installed, barely used.** 545 `style={{...}}` occurrences across 41 files vs. two `className` usages (`font-serif-sr`). Tokens live in `src/lib/tokens.ts`, so it's consistent inline-style soup rather than chaos. Not urgent.

**`tsconfig.app.json` is missing `"strict": true`.** Has `noUnusedLocals` + `noFallthroughCasesInSwitch` but not `strictNullChecks`, `noImplicitAny`, `noUncheckedIndexedAccess`. The code is written as if strict were on; it just isn't enforced. Flipping it on later will surface a handful of `words[i]` / `BUCKET_INTERVALS_MS[bucket]` complaints.

**`progress` prop drilling.** `App.tsx` threads `progress + setProgress` into seven page routes. Fine at this size; context would be overkill. But the `saveProgress + setProgress` boilerplate is repeated in every `handleAnswer` — see refactor #4.

**`apiKey` stored in localStorage in plaintext** (`src/store/types.ts:68`). Personal-use app, but flag for any future deploy.

**Unused exports / dead-ish code:**
- `src/lib/utils.ts:cn` exported, zero callers.
- `src/components/Layout.tsx:209` re-exports `StreakCounter` "for backward compatibility" — no other importer.
- `src/lib/word-progress.ts:wordIdFromKey` and `isWordKey` unused.

**`match-pairs` is in the `ExerciseType` union but `generateExercise` never returns it** (`exercise-generator.ts:615` — fallback branch only). `MatchPairs.tsx` is rendered out-of-band by `LessonView.tsx:333` via a `showMatchPairs` boolean. Confusing but functional.

---

## What I'd refactor first

### 1. Wire up `word-readiness.ts` or delete it
76 lines of well-typed readiness gating with zero callers. It's the headline audit fix (§3.5) shipped as a file but not invoked. Either import `filterByReadiness` into `generateHammerSession` and `generateLessonExercises` (a 4-line change each) or delete the file. Right now a future maintainer will read it, assume it's live, and waste 20 minutes. **Why now:** the unified daily session needs this filter on its candidate pool.

### 2. Fix the two real bugs in `LessonView.tsx`

**Bug A — `finishLesson` accessed before declared (line 158).** The lint output flags this. `handleAnswer` is `useCallback`-wrapped on line 114 and references `finishLesson`, declared as a `const` arrow on line 166. Works at runtime via TDZ-friendly closure semantics, but eslint correctly flags it as fragile. Move `finishLesson` above `handleAnswer` or `useCallback` it and add to deps.

**Bug B — `handleMatchPairsComplete` loops `setProgress` with stale state (line 195).** Real correctness bug. The loop calls `updateDailyStats(progress, correct)` `totalPairs` times, each on the same closure `progress`. Only the last `setProgress` wins, so `phrasesStudied` is incremented by 1 regardless of `totalPairs`. Fix:

```ts
let next = progress;
for (let i = 0; i < totalPairs; i++) {
  next = updateDailyStats(next, i < correctPairs);
}
setProgress(next); saveProgress(next);
```

Stats currently lie when match-pairs runs.

### 3. Extract `<MCOptionList>` — collapse the four-option duplication
Five files re-implement the same 4-option button grid with the same colour state machine:

- `MultipleChoice.tsx:85–180`
- `ContextPick.tsx:60–155`
- `Comprehension.tsx:80–177`
- `WordRecognize.tsx:69–152`
- `WordProduce.tsx:62–148`

Identical ladder: `bg = T.surface / isSelected → amber / result + isCorrect → green / result + isSelected → red / else → opacity 0.45`. Each differs only in prompt layout above and note card below. Pull the option list into `<MCOptionList options correctAnswer selected disabled onSelect serbianStyle?>` and five files shrink ~80 lines each. **Why now:** the next phase adds `word-match-pairs`, `phrase-construct`, `conjugation-pick`, all MC-shaped — they will copy this block again unless extracted.

### 4. Extract `useDrillSession` + `<ExerciseRenderer>`
`Hammer.tsx`, `WordDrill.tsx`, `FamilyDrill.tsx`, and the exercise half of `LessonView.tsx` and `ReviewSession.tsx` all hand-roll:
- `[phase, exercises, currentIndex, correctCount, totalAnswered]` state
- A `handleAnswer(correct)` that runs `createPhraseProgress` if missing, `recordAnswer`, `updatePhraseProgress`, `updateDailyStats`, `setProgress`, `saveProgress`, advance, finish on overflow
- A "finished" screen with `accuracy = correct/total` and two cards

~80 lines × 5 pages. The 9-way switch over `exercise.type` is duplicated identically in `Hammer.tsx`, `LessonView.tsx`, `ReviewSession.tsx`. Extract to:

```ts
useDrillSession({ generate, progress, setProgress, onFinish? })
// → { phase, currentExercise, handleAnswer, stats, restart, close }
```

Plus `<ExerciseRenderer exercise onAnswer script />` owning the switch. **Why now:** the next-phase unified daily session is precisely "use the same orchestration for word + phrase + family in one stream." Extract now → 50-line page. Skip → 500-line page duplicating three existing 500-line pages.

### 5. Replace `setState`-in-effect with `useMemo`
Six `eslint-disable-line react-hooks/exhaustive-deps` + `setState` directly in effects, all of the shape "when phase becomes `drill`, regenerate exercises." React 19's correct idiom is derived state via `useMemo`, not effect → setState. Replace each `useEffect → setState(generated)` with `useMemo`. Cleaner and silences the six lint errors.

### 6. Bump `wordRefs: string[]` → `WordRef[]` before lesson backfill

Tester's #1 finding is real: lemma chips for vocative-heavy Lesson 01 mislead (`dušo` in phrase, `duša` on chip). Promote the schema:

```ts
interface WordRef {
  id: string;
  surface?: string;   // 'dušo' when inflected form differs from lemma
  case?: 'voc' | 'dat' | 'acc' | 'gen' | 'loc' | 'ins';
  form?: string;      // e.g. 'past.f.sg' for verbs
}
```

Additive — accept `string | WordRef` via a normaliser so old data still works. **Why now:** doing this *before* backfilling lessons 03–10 saves re-editing eight JSON files. After backfill it's 4× the work.

---

## What I'd defer

- **545 inline styles.** They bottom out in `T` from `tokens.ts`, so design-system changes are one-file edits. Migrating to Tailwind utilities or styled-system is multi-week for a cosmetic win. Defer.
- **Bundle size warning** (575 KB main chunk). Personal SPA on a phone with cache — fine. Code-split when a user complains.
- **`generateComprehension`'s hardcoded dialogue templates** (`exercise-generator.ts:292–353`). Three templates, audit-flagged for vocabulary assumptions, but that's pedagogy not code health.
- **`LessonView.tsx`'s retry-queue ref** (line 112–151). Local, bounded at 2 retries, refs are correct for "don't trigger re-render."
- **`SKIP_TYPING_SWAP` as a Partial Record.** Two entries; over-engineering bait.
- **`exerciseDifficultyTier` constant.** 13 entries in one file with a clear comment.
- **Achievements logic in `LessonView.tsx:170-188`.** Hardcoded thresholds; gameification fluff.
- **Three near-identical "finished" screens** — collapse for free when `useDrillSession` lands.

---

## Readiness for the next phase

### Audio files
**Data shape is NOT ready.** Neither `Phrase` nor `Word` has an `audio` field; no audio directory exists; the dashboard's audio icon is a disabled "coming soon" button (`Dashboard.tsx:330`). Add:

```ts
interface Phrase { ...; audio?: { url: string; durationMs?: number } }
interface Word   { ...; audio?: { url: string } }
```

Storage: `public/audio/phrases/<id>.mp3` and `public/audio/words/<id>.mp3`. Vite serves `public/` verbatim under `base: '/iller8/'`. Use `import.meta.env.BASE_URL` for URLs — don't hardcode `/iller8/`.

A `<PlayAudio phraseId|wordId />` primitive belongs in `src/components/ui/`. Wire into `MultipleChoice`, `TypeTranslation`, `WordRecognize`, `PhraseIntro`. Trivial after extraction #3; ~half a day.

### Lesson 03–10 wordRef backfill
**Schema needs the bump from #6 first** — otherwise you'll re-edit eight JSON files later. Currently lessons 01–02 are tagged (34 + 36 occurrences); 03–10 are empty. Process: write `scripts/suggest-wordrefs.ts` that tokenises untagged phrases against `words.json` and emits candidates per phrase. Human-review one lesson at a time. Lexicon already covers most content words but the tester flagged `kasniti` as possibly missing — sanity-pass first. ~1-2h for script, 1-2h human review per 2-3 lessons.

### Unified daily session
**Engine is mostly modular enough.** `generateWordSession` and `generateHammerSession` both return `Exercise[]`. Both use the same SRS key space (the `word:<id>` prefix is the key insight). What's missing: a mixed-pool builder — "give me N exercises drawn from due words + due phrases + new words + new phrases, weighted by readiness." One new function (~40 lines) in `src/engine/daily-session.ts`.

The `<ExerciseRenderer>` extraction in #4 is the prerequisite. Without it, "a unified session" duplicates the 9-way switch in a new page.

### LLM chat tutor
**Sits cleanly alongside.** SRS, exercise engine, and progress store have no dependencies on a chat surface. `src/lib/claude.ts` already has a working Anthropic SDK client. A chat page is a new `src/pages/Chat.tsx`, a new route, and a chat-message history in localStorage (separate key from `iller8_progress`).

Interesting integration is contextual injection — passing recent struggles to the tutor as system context. That's read-only access to `progress.phrases` (filter low-bucket items) and turning them into a system prompt. Pure read; no engine changes.

`MiraAvatar.tsx` already exists (29 lines, currently unused in active flow). Build the tutor *last* and it slots in painlessly; build it *first* and you'll regret skipping orchestration cleanup.

---

## Tests I'd write first

Repo has zero tests; no runner configured. Vitest pairs with Vite trivially. Five highest-value tests:

1. **`src/engine/srs.ts` — `recordAnswer` + `applyTimeDecay` + `isDue`.** Correct at each bucket promotes; incorrect at bucket 0-2 drops by 2; incorrect at bucket 3+ drops by 1; bucket 7 stays; decay only past bucket 2 after `(2 + bucket) * interval`. ~30 lines, catches every SRS regression.

2. **`src/engine/scoring.ts` — `checkAnswerFuzzy`.** Exact match, case-insensitive, diacritic-tolerant via `normalizeForComparison`, Cyrillic input vs Latin answer via `toLatin`, 20%-Levenshtein returns `close: true`. ~20 lines. Critical because typing exercises are the headline production drill.

3. **`src/engine/word-generator.ts` — `getWordDistractors` tier ordering.** Same-POS-same-letter first when available, same-POS-different-letter second, cross-POS third. ~25 lines. Catches silent pedagogical regression — the whole point of the Word layer.

4. **`src/engine/exercise-generator.ts` — `getDistractors` group-first behaviour.** Distractors prefer same `PhraseGroup`, fall back to broader lesson. ~20 lines.

5. **`src/engine/word-readiness.ts` — `computeReadiness` tier boundaries.** Empty refs → ready (ratio 1.0); 70% known → ready; 40% known → preview; 30% → hidden. Write the test first, *then* wire up the calls — prevents the "untagged phrases still work" assumption from regressing.

Setup: ~10 minutes (vitest, `npm test` script, one test file). The five above: ~90 minutes total. Payoff: every subsequent engine refactor — and the next phase mandates several — can be done with confidence.

---

## Closing observation

Structural skeleton is good: engine is pure, types clean, data is JSON, components share primitives where it matters. What's missing is the *next* layer of abstraction — a drill-session hook, an MC-option-list primitive, a wired-up readiness gate. Each is half a day and each unblocks a specific next-phase feature. Do them now and the codebase scales; defer and every new feature copies the existing duplication until the project ossifies at ~10k LOC.

The Word layer (ee6c4f3) showed the maintainer can ship complex schema changes cleanly. The same discipline applied to the orchestration layer compounds.
