# iller8 — Mechanics & UX Audit

> Product/learning-mechanics review of what is **actually shipped** (engine + session + pages), not what the pedagogy doc proposed. Single solo beginner. Focus: retention, motivation, learning efficiency. References real functions and line numbers.

The headline: the engine is clean and the *content/word layer is genuinely strong* (the tester report's praise of minimal-pair distractors is deserved). But the **motivation and progression loop is half-wired** — the primary path (`/daily`) is missing the streak/achievement/retry machinery that only exists on the legacy lesson path, the SRS has a real promotion bug at bucket 0, the session mix silently never hits its own 40/40/20 spec, and there is no Day-1 experience despite the tester flagging it and the roadmap promising it (Phase 10, still "next").

---

## 1. SRS tuning (`src/engine/srs.ts`)

### 1a. BUG — failing a brand-new item *promotes* it (high severity, ~10 min fix)
`recordAnswer` (lines 40–47) on a wrong answer does `bucket: Math.max(1, progress.bucket - bucketDrop)`. New items live at bucket 0 (`pickNewItems`, `progress.phrases[key]?.bucket ?? 0`). So a learner who sees a word **for the first time and gets it wrong** goes bucket 0 → `Math.max(1, 0-2)` → **bucket 1**. Because `getDueItems` filters `p.bucket >= 1` (line 72) and `isDue` fires at the 1-hour interval, that just-failed unknown word is now treated as "learned" and enters the review pool an hour later — promoted *by failing it*. This is exactly backwards and pollutes the review queue with the learner's weakest items at an inflated bucket.

**Fix:** floor at 0, not 1: `bucket: Math.max(0, progress.bucket - bucketDrop)`. Then a first-sight miss stays at 0 (still "new," gets re-shown as new), and only items that have been *correctly* promoted at least once can drop into review. One-character change, real correctness win.

### 1b. Intervals are slightly aggressive at the bottom for a 10-min/day learner
Buckets 1→2 jump 1h→8h, 2→3 is 1d. For a once-daily learner the 1h and 8h intervals (buckets 1–2) almost always read as "due" by the next session — fine — but it means low-bucket items dominate every review pool and high-bucket maintenance rarely surfaces. That's acceptable for a beginner (you *want* to hammer fresh items), so I'd leave the curve but note that buckets 1–2 effectively collapse into "always due tomorrow." Not worth changing now.

### 1c. `applyTimeDecay` is sound; promote logic otherwise fine
The gentle drop for high buckets (`bucketDrop = bucket >= 3 ? 1 : 2`) is correct and matches the pedagogy doc. No change beyond 1a.

---

## 2. Session design (`src/engine/daily-session.ts`)

### 2a. BUG — the 40/40/20 mix is a lie for any non-cold-start learner (high impact, ~30 min)
`previewDailySession` (lines 204–220) allocates `reviewSlots = round(15*0.4)=6`, `newSlots=6`, `consolidationSlots=3`. But each stream is **independently capped and never backfills from the others**:
- `getDueItems` early on returns 0–2 items → review under-fills.
- `pickConsolidationItems` requires bucket 1–2 with <75% accuracy → usually 0–1 items.
- So a typical week-1 session is ~6 new + 1 review + 0 practice = **7 items, then the generator silently pads to 15 with random ready phrases** (`generateDailySession` lines 253–260).

The learner is told "TODAY'S MIX: 6 / 6 / 3" on the Daily landing (Daily.tsx `SessionStat`) but actually gets 7 real picks + 8 random filler. The mix labels misrepresent the session, and the filler is *unweighted random* — it ignores SRS entirely.

**Fix:** make slot allocation greedy with carry-over. If review yields fewer than `reviewSlots`, give the remainder to new; if new is short, give to review; only then fall to filler. Sketch in `previewDailySession`:
```ts
let r = Math.min(reviewSlots, due.length);
let n = Math.min(newSlots + (reviewSlots - r), newPool.length);
let c = count - r - n; // consolidation absorbs whatever's left
```
And make the cold-start filler in `generateDailySession` prefer lowest-rank unseen *words* before random phrases, so even the padding is pedagogically ordered.

### 2b. Session length is hardcoded to 15 and ignores `dailyGoal` (medium, ~20 min)
`Daily.tsx` line 20: `const SESSION_SIZE = 15;`. The user can set `dailyGoal` to 5/10/15/20 in Settings, the Dashboard shows a `dailyGoal` progress bar — but the Daily session always serves 15 regardless. A learner who set "5/day" gets a 3×-too-long session and the goal bar reads 15/5. Wire `SESSION_SIZE = progress.settings.dailyGoal` (clamped to a sane 5–25). This is the single cheapest "respect my time" win and directly serves the memory-noted learning philosophy ("don't force… cut bloated flows").

### 2c. No within-session retry on the primary path (medium, ~30 min)
`useDrillSession` exposes `insertExercise` *specifically* for retry-on-wrong (line 51 comment), and `LessonView` uses the pattern (reinsert 4 ahead, max 2 retries). **Daily.tsx never calls it.** So the app's documented core mechanic — "failed items reappear 4 exercises later" (CLAUDE.md) — does not happen in the unified loop, only in the legacy lesson view. Wire it via the hook's `onAnswer` callback: on `correct === false`, build a fresh recognition exercise for that key and `insertExercise(4, ex)`, gated by a per-key retry counter.

### 2d. Session-end summary is thin (medium, high motivation value)
The Finished screen (Daily.tsx 234–312) shows accuracy, correct count, and streak. It does **not** show: how many items advanced a bucket, what's newly "due tomorrow," or — most importantly — **what the learner can now say**. There is no "you learned: *Volim te, Nedostaješ mi, dušo*" recap. The single best retention hook for a solo learner is a concrete "here's what you unlocked today" list (see §3). The data is right there — `session` knows every exercise's phrase and the before/after buckets.

---

## 3. Motivation & feedback loop

### 3a. BUG — achievements & lesson-completion never fire on the primary path (high impact, ~30 min)
Every achievement award lives in `LessonView.tsx` (lines 124–168) and `ReviewSession.tsx` (line 93). The **Daily session and WordDrill award nothing** — not streak-3/7/14/30, not polyglot (100 learned), not night-owl/early-bird. The whole achievement system (13 badges in `achievements.json`, a Stats page that displays them) is dead for anyone using the unified loop the app funnels them into. A solo learner's only external reward is invisible.

**Fix:** centralize award logic in `useDrillSession`'s `onFinish` (or a small `checkAchievements(progress)` helper in `progress.ts`) so *every* session path earns badges. This also removes the duplicated award blocks in LessonView/ReviewSession.

### 3b. "You can now say X" milestones — missing entirely (high motivation, ~1–2h)
There is no surface that says "you've mastered enough to say: …". For a learner whose *entire motivation is talking to their girlfriend*, this is the highest-leverage missing mechanic. Concrete: when a phrase crosses bucket ≥ 4, add it to a "Things you can say" list on the Dashboard (new card) and surface 1–2 freshly-crossed ones on the Daily Finished screen. Data: filter `progress.phrases` for `bucket >= 4 && !key.startsWith('word:'/'family:')`, map to phrase `.en`/`.sr_latin`. This converts abstract bucket numbers into emotional progress.

### 3c. Streak is computed but barely celebrated, and has a silent-day hole
`updateDailyStats` (progress.ts 102–110) increments the streak correctly (yesterday→today continues, gap resets to 1). But: (i) the streak only updates *inside an answered exercise*, so opening the app and not answering anything doesn't count (correct behavior, but the Dashboard never warns "study today to keep your N-day streak"); (ii) there's no streak-at-risk affordance. Add a Dashboard banner when `lastActiveDate !== today && currentStreak > 0`: "🔥 N-day streak — do today's session to keep it." Cheapest possible daily-return hook for a no-backend/no-push app.

### 3d. Progress visualization is decent but disconnected
The Stats page has a nice 28-day activity grid and bucket breakdown. But it's a separate tab the learner has to seek out. Pull the activity grid (or a 7-day mini version) onto the Dashboard — momentum is most motivating when it's on the front door, not buried.

---

## 4. Cold-start / Day-1 (the biggest UX gap)

### Day-1 is NOT built. (high impact, ~2h)
`Dashboard.tsx` computes `totalLearned` (line 45) but **never branches on it**. There is zero `totalLearned === 0` gating despite: the tester report explicitly recommending it, and ARCHITECTURE.md Roadmap Phase 10 listing it as "next." A brand-new user still sees the full expert dashboard: 3-cell stat strip of zeros, daily-goal bar at 0, Continue + greyed Review, the 4-tile grid (Words/Hammer/Perspective/Catalog — "Perspective: Same phrase, many forms" is meaningless on day 1), phrase-of-the-day, and the full 10-lesson list. Choice paralysis, exactly as the tester predicted and as the don't-do list (§9) forbids.

**Concrete first-session flow:**
1. In `Dashboard.tsx`, early-return a `DayOne` view when `totalLearned === 0` (or `Object.keys(progress.phrases).length === 0`).
2. The DayOne view shows **one** thing: a single hero "Start learning Serbian" card → `/daily`, plus one sentence ("~5 minutes. We'll start with the most common words."). Hide Hammer/Perspective/Catalog/lesson-list entirely.
3. The first Daily session should be **all new, frequency-ranked words + the 5 easiest Lesson-01 phrases**, recognition-first. `pickNewItems` already ranks words by `rank`; just ensure the cold-start path (currently filler-random, §2a) is frequency-ordered instead.
4. On the first Finished screen, show the "you can now say X" list (§3b) — the payoff that earns a Day-2 open.

This is the single highest impact-per-effort item in the audit: it's data the app already has, the engine already supports a sensible cold-start session, and the tester named it the difference between "taps Continue confidently" and "closes the app."

---

## 5. Difficulty adaptation

### 5a. It adapts *up* by bucket, but never *down* on struggle (medium, ~45 min)
Difficulty rises via `exerciseTypesForBucket` (generator 501–508) and `getDirectionForBucket` (571–575) — good. But there's **no struggle detection**: an item the learner fails repeatedly just bounces between buckets. `pickConsolidationItems` tries to catch low-accuracy items but only at bucket 1–2 and is usually starved (§2a). There's no "this item has been wrong 3× — drop it to recognition + show a hint + slow the audio." `PhraseProgress` already tracks `incorrectCount` and `streak`; add a rule in `exerciseForKey`: if `incorrectCount >= 3 && streak === 0`, force `multiple-choice` recognition regardless of bucket, and pass a flag to show the `notes`/`gloss_hint` *before* answering for that one item (a deliberate, struggle-only exception to the post-answer-notes rule).

### 5b. `getDirectionForBucket` doesn't match the pedagogy doc it cites (low/medium)
ARCHITECTURE.md §2 and PEDAGOGY_AUDIT §3.4 both say production should dominate early (70/30 en→sr from bucket 0). The shipped `getDirectionForBucket` (lines 571–575) is still the *old* recognition-first curve: bucket ≤1 = sr→en only, bucket 2 = 70% sr→en, 3+ = 50/50. So the doc says "production wins early" and the code does the opposite. Note: the **word** layer *does* flip correctly (`generateWordSession` weights produce 70–80%), so words are fine — it's only phrase exercises stuck on the old curve. Adopt the audit's curve for phrases. (Caveat: only after readiness gating is solid, since en→sr on an unready phrase is brutal.)

---

## 6. Audio-first learning

Audio infrastructure is excellent (914 clips × 2 voices, `AutoplayAudio` headless primitive, per-voice toggle). But it's purely **playback** — there's no audio-as-a-mechanic. Two high-value additions:

### 6a. Listening-comprehension mode (medium, ~1.5h) — the biggest audio win
A new exercise dispatch in the daily loop: play the clip with **no text shown**, ask "what did you hear?" (4 English options) or "type what you heard." This is the only mode that trains the actual girlfriend/best-friend use case (understanding *spoken* Serbian). Reuse `generateWordRecognize`/MC plumbing but render the prompt as an `AudioButton` + replay instead of `DualScript`. Gate to bucket ≥ 2 so the learner has seen the form first.

### 6b. Slower playback for hard items + a shadowing affordance (low/medium, ~1h)
`AutoplayAudio`/`AudioButton` use a plain `<audio>` — `playbackRate = 0.75` is one line. Auto-slow when `incorrectCount >= 2` on that item (ties into §5a struggle detection). A "shadow it" prompt (play → 2s pause → replay, with mic-less self-check "did you match?") is cheap and pedagogically strong for production. Shadowing is the cheapest pronunciation mechanic that needs no backend.

---

## 7. Other broken / half-built things

- **`Word.examples` / `forms` are unused in drills.** The lexicon carries 2–4 real example sentences and inflected `forms` per word (types.ts 281–283), but `wordAsPhrase` (word-generator 132–142) drops them. Showing an example sentence post-answer in word drills is free encoding value already sitting in the data.
- **`acceptedAnswers` / variations under-leveraged.** SentenceBuilder builds `acceptedAnswers` from variations (generator 248–256) but MC/type-translation don't, so gendered variants ("dragi" vs "draga") can be marked wrong depending on which the learner produces. Worth auditing scoring against variations.
- **Hammer mix targets can under-fill silently** (generator 762–775): `targets` are computed but if bucket 0 (low) is huge and mid/high empty, the 60/30/10 collapses to ~60% then random-pads — same class of issue as §2a, lower stakes.
- **`pattern-match` in bucket 2/3 pools falls back to MC for any phrase without variations** (generator 610–615) — so a chunk of "bucket 2 = guided production" sessions silently serve recognition MC instead. Fine functionally, but it means bucket-2 production is rarer than the comment claims.
- **`getMasteryLevel`/`getMasteryColor`** define 8 entries for buckets 0–7; `MAX_BUCKET` is 7 — consistent, no bug. (Verified — not an issue.)

---

## BUILD THIS FIRST (ranked by impact ÷ effort)

1. **Fix the bucket-0-promotes-on-fail SRS bug** (§1a). One char (`Math.max(0, …)`). Stops the review pool filling with the learner's weakest items at inflated buckets. Highest correctness-per-effort in the repo.
2. **Day-1 dashboard gate + frequency-ordered cold start** (§4, §2a-filler). ~2h. The tester's #1 pain, a promised roadmap phase, and the make-or-break first 5 minutes. Data already exists.
3. **Wire achievements + within-session retry into the primary loop** (§3a, §2c). ~1h. The entire reward system and a documented core mechanic are currently dead on the path the app funnels users into. Centralize in `useDrillSession.onFinish` / `onAnswer`.
4. **"You can now say X" recap + streak-at-risk banner** (§3b, §3c). ~2h. The emotional payoff and the daily-return hook a no-backend solo app most needs. Pure UI over existing data.
5. **Session length honors `dailyGoal` + greedy mix backfill** (§2b, §2a). ~45 min. Makes the session respect the user's stated time budget and makes the advertised mix actually true.
