# iller8 — Architecture & Direction

A single source of truth for "what this app is and is becoming." Update this doc when a structural decision is made or when a major direction changes. It's the anchor that prevents drift across many small commits.

> Companion docs: `PEDAGOGY_AUDIT.md` (pedagogy review), `OPTION_AUDIT.md` (exercise option quality audit), `TESTER_REPORT.md` (beginner walkthrough), `CODE_HEALTH.md` (code review), `AUDIO_PLAN.md` (TTS plan), `CLAUDE.md` (project rules for AI agents working in the repo).

---

## 1. What iller8 is

A personal Serbian-learning SPA for one English-speaking learner. Static-hosted (GitHub Pages), no backend, all state in localStorage. The learner is a beginner whose practical motivation is talking to their half-Serbian girlfriend and Bosnian best friend.

The app is **not a phrasebook quiz**. It's intended to teach Serbian as a constructable system: meet words individually, then encounter them combined in phrases, then practise transforming those phrases across the cases / aspects / persons that make Serbian Serbian.

## 2. The learning model

Three layers of content, each tracked by SRS:

- **Words.** ~156 hand-curated lemmas. Each has POS, gender, aspect, inflected `forms`, examples, and a frequency rank. Tracked under SRS key `word:<id>`.
- **Phrases.** ~360 themed phrases across 10 lessons. Each has `wordRefs` pointing at the words that compose it (with optional surface form + case when inflected). Tracked under SRS key `<phrase.id>`.
- **Phrase families.** 14 clusters of "same idea, many forms" — `Nedostaješ mi.` plus 8 transformations (past gendered, formal, reciprocal, etc.). Each variant tracked under SRS key `family:<id>:<variantId>`.

All three share **one SRS map** (`UserProgress.phrases`), keyed by prefix. The existing SRS engine doesn't distinguish layer — it just spaces repetitions.

Three principles the data model encodes:

1. **A phrase is not the unit of learning. A phrase is the place where words you already know come together.** This is why `Phrase.wordRefs` exists and why a readiness gate (`engine/word-readiness.ts`) filters phrases whose words the learner hasn't met.
2. **Production > recognition.** En→sr is the harder direction and the real test of knowing. The exercise generator weights production heavily from low buckets.
3. **Repetition is structural.** SRS surfaces items at expanding intervals; within a session, items the learner missed come back later in the same session.

## 3. Data model (current)

`src/store/types.ts` is canonical. Key types:

```
Phrase           { id, sr_latin, sr_cyrillic, en, gloss_hint?, context?, notes?, variations?, wordRefs? }
PhraseVariation  { sr_latin, sr_cyrillic, en, gloss_hint? }
WordRef          string | { id, surface?, surface_cyrillic?, case?, form? }
Word             { id, lemma_sr_latin, lemma_sr_cyrillic, gloss_en, gloss_hint?, pos, gender?, aspect?, forms?, examples, appearsIn?, rank?, notes? }
PhraseFamily     { id, theme, category?, base: FamilyVariant, variants: FamilyVariant[], lessonId? }
FamilyVariant    { id, sr_latin, sr_cyrillic, en, gloss_hint?, label, transform, hint?, note? }
Lesson           { id, title, description, order, prerequisites, phraseGroups }
PhraseProgress   { phraseId, bucket, lastReviewed, correctCount, incorrectCount, streak }
UserProgress     { phrases, completedLessons, dailyStats, achievements, currentStreak, longestStreak, lastActiveDate, settings }
UserSettings     { scriptPreference, dailyGoal, darkMode, apiKey, skipTyping, autoplayAudio, voiceGender }
Exercise         { type, phrase, direction, options?, correctAnswer, prompt, ...type-specific fields }
ExerciseType     'multiple-choice' | 'type-translation' | 'listen-choice' | ... 14 types (see types.ts)
```

Convention: `gloss_hint` is the post-answer disambiguator. Parentheticals like `(lit. ...)`, `(to a woman)`, `(formal)` must NOT appear in `en` / `gloss_en` — they belong in `gloss_hint`. Enforced visually by the `<GlossHint>` primitive.

## 4. Engine (current)

Pure functional modules under `src/engine/`. No React, no localStorage, no DOM.

- **`srs.ts`** — 8 buckets (0–7), intervals 1h→30d. `recordAnswer`, `applyTimeDecay`, `getDueItems`, `getMasteryLevel`. Identical for words, phrases, and family variants.
- **`scoring.ts`** — fuzzy answer check. Diacritic-tolerant, case-insensitive, Cyrillic↔Latin tolerant, 20% Levenshtein returns `close: true`.
- **`script-converter.ts`** — Cyrillic ↔ Latin character map.
- **`exercise-generator.ts`** — `generateExercise` (single), `generateLessonExercises`, `generateReviewExercises`, `generateHammerSession`. Picks distractors via `getDistractors` (same-group-first, then lesson-wide). Now respects `word-readiness` filter when given UserProgress.
- **`word-generator.ts`** — `getWordDistractors` (same-POS-same-first-letter → same-POS → random), `pickWordsForSession`, `generateWordRecognize`, `generateWordProduce`, `generateWordSession`. Synthesises Words as Phrases (id prefixed `word:`) so the rest of the engine doesn't care.
- **`family-generator.ts`** — `generatePerspectiveShiftExercise`, `generateFamilyDrillSession`. Synthesises FamilyVariants as Phrases (id prefixed `family:`).
- **`word-readiness.ts`** — `computeReadiness`, `filterByReadiness`. Three tiers: `hidden` (< 40% word coverage), `preview` (40–70%), `ready` (≥ 70%). Used to gate phrases entering drills.

The shared SRS-key insight (`word:<id>`, `family:<famId>:<varId>`, bare phrase id) is what lets all three content layers reuse the same engine.

## 5. UI surfaces (current)

Pages under `src/pages/`:

- **Dashboard** (`/`) — greeting, stat strip, daily goal, hero "Daily Session" card (points at `/daily`), Review card, four quick tiles (Words / Hammer / Perspective / Catalog), phrase of the day, lesson list.
- **Daily** (`/daily`) — **primary loop.** Mixed new + review + practice session. See §6.
- **WordDrill** (`/words`) — POS filter, drill 12 random words mixing Recognize + Produce.
- **LessonView** (`/lesson/:id`) — intro phase (PhraseIntro with word-by-word chips) → exercise phase → finished phase.
- **ReviewSession** (`/review`) — SRS-due items only.
- **Hammer** (`/hammer`) — random across the whole catalog, configurable size, optional skip-typing toggle.
- **Catalog** (`/catalog`) — browse every phrase grouped by lesson, filter by mastery state, plus phrase families.
- **FamilyDrill** (`/families`, `/families/:lessonId`) — perspective-shift drill on phrase families.
- **Settings** (`/settings`) — daily goal, script preference, skip-typing toggle, API key, data export/import/reset.
- **CustomContent** (`/custom`) — paste Serbian text, extract phrases via Claude API.

Primitives under `src/components/ui/`:

- `Btn`, `Card`, `MonoBadge`, `LinearProgress`, `RingProgress`, `SectionHead`, `I8Mark`, `MiraAvatar` — visual primitives.
- `DrillFrame` — the top progress strip + close + streak shown around any exercise.
- `DualScript` — Serbian text with primary script big (serif) + alt script underneath (mono).
- `WordChips` — the word-by-word breakdown strip rendered in PhraseIntro.
- `GlossHint` — small italic post-answer disambiguator.
- `ContinueButton` — explicit advance after answer (replaces auto-advance).
- `Icons` — stroke-only SVG icon set.
- `AudioButton` — manual replay of a clip for a given Serbian source string.
- `AutoplayAudio` — headless primitive that plays a clip once on mount / when `text` changes. Honours the global autoplay flag and the active voice via `useAudioSettings()`. Supports a `delayMs` to sequence multiple plays (PatternMatch, Comprehension, PerspectiveShift base→variant).

Header controls in `src/components/`:

- `ScriptToggle` — Latin / Cyrillic.
- `AutoplayToggle` — speaker icon, strike when off; toggles `settings.autoplayAudio`.
- `VoiceToggle` — ♀ / ♂ pill; toggles `settings.voiceGender` (female → Sophie, male → Nicholas).

Exercise components under `src/components/exercises/` — one file per `ExerciseType`.

## 6. The unified flow (now live at `/daily`)

The dashboard's hero "Continue" tile points at `/daily`. The Daily Session is the unified primary path; other surfaces (Words, Hammer, Perspective, Catalog, Review) are specialized explorers.

The Daily Session length honors the learner's `dailyGoal` (clamped 5–25, was hardcoded 15). It picks items targeting:

- **40% review** — SRS-due items across all three layers (words, phrases, family variants)
- **40% new** — first-encounter words (ranked by frequency) + ready phrases (readiness gate passes)
- **20% practice** — recently-met items (bucket 1–2) with low correct/total ratio

Allocation is **greedy with carry-over**: when a stream is thin (e.g. no reviews due in week 1) its slots flow to the others (new → review → consolidation → back to new), so the session always reaches the target count with real SRS picks and the advertised mix on the landing screen is honest. Last-resort filler is frequency-ordered unseen words then ready phrases — never unweighted random.

Dispatch by SRS key prefix:

- `word:<id>` → `WordRecognize` (bucket 0) or `WordProduce` (bucket ≥ 1)
- `family:<famId>:<varId>` → `PerspectiveShift` (MC when bucket < 3, type-it after)
- `<phraseId>` → standard phrase exercise picked by bucket via `generateExercise`

Items are interleaved (not blocked) — variability of practice beats blocked drilling for retention.

The session also **awards achievements** (via `checkAchievements`, applied every answer on fresh state) and **retries missed items** ~4 ahead (max 2×), both wired through `useDrillSession` so every drill path — not just the legacy lesson view — rewards and re-surfaces.

Engine: `src/engine/daily-session.ts` (`generateDailySession`, `previewDailySession`, `getDailySummary`, `buildRetryExercise`).
Page: `src/pages/Daily.tsx` (built on `useDrillSession` + `<ExerciseRenderer>`).

## 7. Roadmap

Ordered. Each phase ships independently.

| Phase | What | Status |
|---|---|---|
| 1 | Word data model + 156-word lexicon | done |
| 2 | Word drills + word SRS | done |
| 3 | Word-readiness gate wired into generators | done |
| 4 | Parenthetical strip → `gloss_hint`, rich `WordRef` with surface + case | done |
| 5 | Lessons 03–10 wordRefs backfill | done |
| 6 | Orchestration extraction (`MCOptionList`, `useDrillSession`, `ExerciseRenderer`) | done |
| 7 | Daily Session (unified primary path) at `/daily` | done |
| 8 | Audio pipeline — 914 clips × 2 voices (Azure `sr-RS-SophieNeural` default + `sr-RS-NicholasNeural`), Cyrillic-input generation, content-addressed by FNV-1a hash of Latin form, global autoplay + per-voice toggle wired across 13 exercise surfaces | done |
| 9 | Listening comprehension (`listen-choice`: hear Serbian, pick meaning) — activates the audio library | done |
| 10 | SRS new-item fix (fail no longer promotes bucket 0) + production-first phrase direction curve | done |
| 11 | Loop wiring: achievements + within-session retry on every path; greedy daily mix; session size = dailyGoal | done |
| 12 | Day-1 dashboard gate + "You can say" mastered-phrase card + streak-at-risk banner | done |
| 13 | Survival-vocab pack (~90 words) + grammar backfill (past participles, `biti` neg/future) | in progress (subagent) |
| 14 | New phrase families (where-is, i-need, how-much, can-i, introductions, i-dont-understand, id-like) | in progress (subagent) |
| 15 | Migrate `Hammer`/`WordDrill`/`FamilyDrill`/`LessonView`/`ReviewSession` to `useDrillSession` | next |
| 16 | More listening types (`listen-pick-text`, dictation) + Foundations on-ramp re-sequencing | later |
| 17 | Option-leak cleanup tier (lowercase tiles, Comprehension rewrite, PatternMatch format) | later |
| 18 | LLM chat-tutor surface (Mira) | later |

## 8. Decision log

Choices that should NOT drift without explicit revisiting:

- **One SRS map, prefixed keys.** Words, phrases, family variants live in the same `UserProgress.phrases` map keyed `word:<id>`, `family:<famId>:<varId>`, `<phraseId>`. No separate maps, no migration.
- **`gloss_hint` is post-answer only.** Anything that would tell the learner the answer before they answer goes into `gloss_hint`, rendered after `result` is set. Parentheticals in `en` are forbidden.
- **Surface form on chips, lemma as footnote.** When `wordRef.surface` differs from `word.lemma_sr_latin`, the chip shows the surface form big with the lemma in subscript and a small case badge. Lemma-on-chip-only is forbidden — it's the bug that pet-name-heavy Lesson 01 surfaced.
- **No auto-advance.** Every exercise requires an explicit `<ContinueButton>` (Enter/Space also work). Auto-`setTimeout(onAnswer)` is forbidden.
- **Dual-script everywhere a Serbian phrase is shown big.** `<DualScript>` is the canonical component.
- **Production direction wins early.** `getDirectionForBucket` weights en→sr heavily from bucket 0+. Recognition-only at high buckets is forbidden.
- **No grammar lecture screens.** Grammar surfaces post-answer in `notes` (purple "WHY" card) or via `PerspectiveShift` drilling, never as up-front prose.
- **Words and phrases are one progression.** Words and phrases share the SRS map and (target state) the same Daily Session. Surfaces that drill one without the other (the Words tab, the lessons list) are secondary explorers, not the main loop.
- **JSON-first content.** All learning content lives in `src/data/` as JSON. Components must not hard-code Serbian.
- **Push to main, always.** GH Pages auto-deploys from main. Feature branches are not used.
- **Audio: hash the Latin form, send the Cyrillic.** The MP3 file ID is the FNV-1a hash of the Latin source string (stable regardless of voice/script generated). The TTS call sends the Cyrillic form — A/B-tested: `sr-RS-SophieNeural` / `sr-RS-NicholasNeural` produce a native accent with Cyrillic input and an American accent with Latin input. Clips live at `public/audio/<voice>/<hash>.mp3`. Default voice is Sophie (female). **Every audio call (`AudioButton`, `AutoplayAudio`) must pass the LATIN form** — passing `correctAnswer`/dialogue text (which can be Cyrillic in Cyrillic mode) 404s the clip.
- **Failing a NEW item must not promote it.** `recordAnswer` floors a wrong answer at bucket 0, not 1. A first-sight miss stays "new"; only correctly-promoted items enter the review pool (`getDueItems` filters bucket ≥ 1).
- **Rewards & retry live in `useDrillSession`, not per-page.** Achievement awards (`checkAchievements`) and within-session retry (`buildRetry`) run in the shared hook so every drill path earns/retries identically. Don't re-add per-page award blocks.
- **Toggling script mid-session must not regenerate the exercise list.** `script` is excluded from the regeneration deps on every drill surface — it's a display concern (DualScript shows both); regenerating reshuffles and "skips" the current item.
- **Day-1 is gated.** When `totalLearned === 0`, the Dashboard shows one action (Start → `/daily`), never the full expert surface. Choice paralysis on first run is forbidden (§9).
- **Listening uses hidden text.** `listen-choice` plays the clip and hides the Serbian until after the answer — the point is sound→meaning, not reading. Gated to bucket ≥ 1 (you hear a word only once you've met it).

## 9. Don't-do list

Things the app deliberately avoids:

- **Phrasebook memorisation.** If a feature teaches a sentence as an opaque glyph, it's wrong.
- **Choice paralysis on the dashboard.** Day-1 learner should have one clear next action.
- **Auto-advance, splash screens, gamification fluff.** Engagement comes from the loop being short and respectful of time.
- **Backwards-compat shims, feature flags, dead code paths.** Single user, fast iteration; no migration scaffolding needed.
- **External services beyond the static deploy.** Anything that requires a backend or auth is out of scope unless explicitly designed in.
- **More than one canonical SRS algorithm.** `engine/srs.ts` is the only one. New content types adopt the prefix-key pattern.

## 10. Where things live

```
src/
├─ App.tsx                       routes
├─ main.tsx                      bootstrap
├─ index.css                     fonts + global tokens
│
├─ components/
│  ├─ ui/                        visual primitives + drill primitives
│  ├─ exercises/                 one file per ExerciseType
│  ├─ Layout.tsx                 top chrome + bottom tab bar
│  ├─ LessonCard.tsx
│  ├─ ScriptToggle.tsx
│  ├─ StreakCounter.tsx
│  ├─ AchievementBadge.tsx
│  └─ ProgressBar.tsx
│
├─ pages/                        route-level components
│
├─ engine/                       pure logic, no React
│  ├─ srs.ts
│  ├─ scoring.ts
│  ├─ script-converter.ts
│  ├─ exercise-generator.ts
│  ├─ word-generator.ts
│  ├─ family-generator.ts
│  └─ word-readiness.ts
│
├─ data/
│  ├─ lessons/                   01-sweet-talk.json … 10-celebrations.json + index.ts
│  ├─ words/                     words.json + index.ts (with normalizer)
│  ├─ phrase-families.json + phrase-families.ts
│  └─ achievements.json
│
├─ store/
│  ├─ types.ts                   canonical type definitions
│  └─ progress.ts                localStorage I/O, daily stats, streak
│
└─ lib/
   ├─ tokens.ts                  design tokens
   ├─ utils.ts
   ├─ word-progress.ts           SRS-key helpers for words
   ├─ claude.ts                  Anthropic SDK for custom content
   ├─ audio.ts                   audioId (FNV-1a 32-bit) + audioUrl per voice
   └─ audio-context.tsx          AudioSettings provider (voice + autoplay)
```

## 11. Working agreement (for future AI agents on this repo)

- Read this doc + `CLAUDE.md` before making structural changes.
- Update this doc when you make a structural decision (add a phase, a new type, a new surface).
- Don't add features without checking the don't-do list.
- Keep the data model in `src/store/types.ts` canonical. JSON files conform to it, not vice versa.
- Subagent work on content (lessons, words, families) must match the conventions of the existing tagged files — read one before authoring more.
