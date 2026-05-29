# Autoplay + replay design

## Goal

When a Serbian phrase appears on screen — either as the prompt (sr→en) or as the revealed correct answer (en→sr) — the clip should play automatically once, so the learner hears the sound paired with the form every time they see it. A small visible play button stays in its current spots for explicit replay. A top-bar toggle lets the learner switch autoplay off (still leaving the manual button working) when they need quiet — phone on the train, partner in the room, etc. Default is on, because audio-first repetition is the whole point of this app.

## Settings model

Add one boolean to `UserSettings` and persist it like every other setting.

**`src/store/types.ts`** — extend `UserSettings`:

```ts
export interface UserSettings {
  scriptPreference: 'latin' | 'cyrillic' | 'both';
  dailyGoal: number;
  darkMode: boolean;
  apiKey: string;
  skipTyping: boolean;
  /** When true, Serbian audio plays once on prompt/answer-reveal surfaces.
   *  Manual replay via AudioButton remains available either way. */
  autoplayAudio: boolean;
}
```

**`src/store/progress.ts`** — extend `defaultSettings`:

```ts
const defaultSettings: UserSettings = {
  scriptPreference: 'latin',
  dailyGoal: 10,
  darkMode: true,
  apiKey: '',
  skipTyping: false,
  autoplayAudio: true,
};
```

The existing `loadProgress` already merges over `defaultSettings`, so old saves missing the field will get `true`.

`updateSettings` needs no change — it already accepts `Partial<UserSettings>`.

## Top-bar toggle

A new `AutoplayToggle` pill sits next to `ScriptToggle` in the header right cluster. Same mono-pill aesthetic, single-button (it's binary, not a 2-segment selector like Lat/Ћир). Renders the existing `IconAudio` plus a tiny "OFF" diagonal strike when disabled.

**`src/components/AutoplayToggle.tsx`** (new):

```tsx
interface Props {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}
// 26x22 button, border + monospace font matching ScriptToggle.
// Background T.surfaceHi when enabled, transparent when off.
// Color T.amber when on, T.mute when off.
// aria-label: "Autoplay audio: on/off"
```

**`src/App.tsx`** — pass `progress.settings.autoplayAudio` + a setter handler down to `Layout`:

```tsx
const handleAutoplayChange = (enabled: boolean) => {
  const updated = updateSettings(progress, { autoplayAudio: enabled });
  setProgress(updated);
  saveProgress(updated);
};

<Layout
  script={script}
  onScriptChange={handleScriptChange}
  streak={progress.currentStreak}
  autoplay={progress.settings.autoplayAudio}
  onAutoplayChange={handleAutoplayChange}
/>
```

**`src/components/Layout.tsx`** — extend props, place toggle to the left of `ScriptToggle` so the listening control sits adjacent to the script control:

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
  {streak > 0 && (
    <span style={monoPillStyle(T.amberDim, T.amber, T.borderWarm)}>
      <IconFire size={11} /> {streak}
    </span>
  )}
  <AutoplayToggle enabled={autoplay} onChange={onAutoplayChange} />
  <ScriptToggle script={script} onChange={onScriptChange} />
</div>
```

Also mirror the toggle in `Settings.tsx` for completeness alongside `skipTyping`.

## AutoplayAudio primitive

A new headless component that handles the "play this clip once when it mounts or when its key changes."

**`src/components/ui/AutoplayAudio.tsx`** (new):

```tsx
interface AutoplayAudioProps {
  /** Serbian source text. If empty/undefined → no-op. */
  text: string | undefined | null;
  /** Optional manual override. Falls back to UserSettings.autoplayAudio. */
  enabled?: boolean;
  /** Delay before playing, in ms. Used by PatternMatch to sequence two clips. */
  delayMs?: number;
}
```

Behaviour:

1. Reads `enabled` (prop) || the user setting via a hook (`useAutoplay()` — small wrapper around the same global progress context already passed everywhere, or accept it as a prop to keep things explicit; I recommend prop-based — every parent already has progress).
2. On mount AND when `text` changes: clear any pending timer, create an ephemeral `Audio` instance, set `el.src = audioUrl(text)`, call `el.play()`. Wrap in `try/catch` — missing clips fail silently exactly like AudioButton.
3. Honour the kill-switches in §"Accessibility defaults" below before firing.
4. On unmount: pause the audio instance, drop the reference, clear the timer.

The component renders `null` — it's lifecycle-only.

**Crucial:** the trigger is `useEffect(..., [text, enabled])`. Because exercise components are remounted via `key={itemKey}` in `ExerciseRenderer`, the effect naturally re-fires on every new exercise. No de-bouncing needed across question advances.

## Per-component wiring matrix

| Surface | Text to autoplay | When | Notes |
|---|---|---|---|
| `PhraseIntro` | `phrase.sr_latin` | on intro mount + on `index` change | Already has `AudioButton` next to the hero — autoplay plays the same clip, button replays it. Re-trigger on each new phrase by adding `<AutoplayAudio key={phrase.id} text={phrase.sr_latin} />`. |
| `MultipleChoice` sr→en | `exercise.phrase.sr_latin` | on mount | Prompt is Serbian; play it. |
| `MultipleChoice` en→sr | `exercise.phrase.sr_latin` | when `result` flips truthy | Don't play on mount (English prompt). When the answer is revealed (right or wrong), play the Serbian once. Use `<AutoplayAudio text={result ? exercise.phrase.sr_latin : undefined} />`. |
| `TypeTranslation` sr→en | `exercise.phrase.sr_latin` | on mount | Same as MC sr→en. |
| `TypeTranslation` en→sr | `exercise.phrase.sr_latin` | when `result` flips truthy | Mirror of MC en→sr. |
| `WordRecognize` | `exercise.phrase.sr_latin` | on mount | Always sr→en by design. |
| `WordProduce` | `exercise.phrase.sr_latin` | when `result` flips truthy | Always en→sr; reveal-then-play. |
| `PerspectiveShift` | `exercise.baseSrLatin ?? exercise.baseSr` | on mount | The BASE phrase is the anchor — that's what we want the learner hearing before producing the variant. Do NOT autoplay the variant on result reveal (the user just produced it; playing it back could be annoying — flag this as Open Question). |
| `FillInBlank` | `exercise.phrase.sr_latin` | on mount | The whole Serbian sentence with the blank visible — they should hear the full target sentence. |
| `SentenceBuilder` | `exercise.phrase.sr_latin` (correct Serbian) | when `result` flips truthy | Construction step is silent — playing the answer while they're still arranging tiles spoils it. Reveal-only. |
| `Comprehension` | sequence each `exercise.dialogue[i]` separated by 700ms | on mount | Stage these via a tiny inline `setTimeout` chain in a single AutoplayAudio invocation or render multiple AutoplayAudio with progressive `delayMs`. Honour cleanup. |
| `ScriptConvert` | `exercise.phrase.sr_latin` | on mount | The source text is Serbian regardless of direction; play it. |
| `PatternMatch` | original then variant | on mount | Two AutoplayAudio: one with `delayMs={0}` for `originalPhrase.text`, one with `delayMs={600}` for `variantPhrase.text`. The gap matters — overlapping playback would be useless. |
| `WordTiles` | `exercise.phrase.sr_latin` | on mount only if direction is sr→en (rare; en→sr is silent until reveal) | Treat like SentenceBuilder for en→sr. |
| `ContextPick` | none | — | Prompt is the English situation; options are Serbian phrases. Autoplay would have to pick one — skip; let learner click any option's AudioButton if we add per-option buttons later. Flag for later. |
| `MatchPairs` | none | — | Multiple Serbian items on screen at once; autoplay would be chaos. Keep silent. |
| `Catalog` rows | none | — | User is browsing; cacophony risk. AudioButton on each row stays. |
| `Dashboard` phrase-of-day | none | — | Passive surface; autoplay would fire on every navigation. Keep AudioButton manual. |
| `WordDrill` list view | none | — | Same reason. |

## Race conditions and cleanup

The current `AudioButton` uses a `useRef` per button — clicking another button doesn't stop the first. That's fine for explicit replay (the user wanted that), but autoplay is different: when the user clicks Continue mid-clip, the next exercise's autoplay must NOT overlap the previous clip.

Two-part fix:

1. **`AutoplayAudio` owns its `Audio` element via a ref scoped to the component**, and the `ExerciseRenderer` remount (via `key={itemKey}`) tears down the entire exercise subtree, which runs `AutoplayAudio`'s cleanup, which calls `el.pause()` and nulls the ref. So as long as autoplay is rendered inside the exercise component, advancing exercises stops the previous clip automatically.
2. **Pending-delay timers** (PatternMatch's 600ms gap, Comprehension's per-line cadence) must be `clearTimeout`'d in the cleanup function. Use a `useRef<number | null>` for the timer handle, clear in the effect cleanup.

Race we accept: if the user clicks the manual `AudioButton` *and* autoplay fires at nearly the same moment, two `<audio>` instances may play. Two ephemeral Audio elements is the correct browser behaviour and not worth coordinating across components. (If it ever becomes annoying, route both through a tiny module-level singleton in `lib/audio.ts` that pauses the current clip before starting a new one. Flag as future work.)

## Accessibility defaults

Guards that `AutoplayAudio` checks before calling `play()`:

- **`enabled === false`** (toggle off, or default override) → no-op.
- **`document.visibilityState === 'hidden'`** → no-op. Listen to `visibilitychange` *not* required — we just skip; when the tab regains focus, the next exercise will fire on its own. We do NOT want a queued playback waking up later.
- **`matchMedia('(prefers-reduced-motion: reduce)').matches`** → no-op AND surface a one-time toast in Settings explaining "Autoplay disabled because your OS requests reduced motion. Override here." Even though audio isn't motion, the spec includes "non-essential animation and autoplay" by convention. Don't override silently.
- **First-gesture lockout** (browser autoplay policy): the browser may reject `audio.play()` before the user has interacted with the page. `play()` returns a Promise that rejects — we already swallow in the catch. After the first click anywhere (e.g., starting the Daily Session), subsequent autoplay works. No special handling needed; failing silently on the first prompt is acceptable.

Default `autoplayAudio: true` is the right call for this app — opt-out, not opt-in — because language learning is the use case where autoplay is wanted. The toggle must be discoverable (top header, not buried in Settings), which is why it's in the layout chrome.

## Implementation order

1. Add `autoplayAudio: boolean` to `UserSettings` + `defaultSettings`. Verify load merges the field on existing saves. Ship.
2. Build `AutoplayAudio` primitive with the lifecycle and the three accessibility guards. Add no wiring yet. Ship.
3. Wire `AutoplayToggle` into `Layout` + `App`, mirror in Settings page. Ship.
4. Wire autoplay into the highest-value surfaces: `PhraseIntro`, `MultipleChoice` (both directions), `WordRecognize`, `WordProduce`. Ship.
5. Wire the production-on-reveal surfaces: `TypeTranslation`, `SentenceBuilder`, `PerspectiveShift` (base on mount). Ship.
6. Wire the multi-clip cases: `Comprehension` (sequenced dialogue), `PatternMatch` (original + variant with gap). Ship.
7. Wire the long-tail: `FillInBlank`, `ScriptConvert`, `WordTiles`. Ship.

Each step ships independently; the toggle works from step 3 on, even if only some surfaces are wired.

## Open questions

1. **PerspectiveShift on result reveal — also play the variant?** The learner just produced it; hearing it back confirms pronunciation. Counter-argument: they didn't ask, and they're staring at the grammar note. Suggest: yes, play the variant on reveal, with the same delay pattern (~300ms after result).
2. **Should the toggle persist per-tab (sessionStorage) or per-device (localStorage)?** Going with localStorage to match every other setting, but if the learner often hands the phone to someone else mid-session a session-scoped toggle might be nicer. Default: localStorage.
3. **Replay shortcut.** Spacebar / "R" to replay the last clip — nice for hands-free practice. Out of scope for v1 but cheap to add later.
4. **Playback rate / volume.** Flagged in brief — confirm not in scope. A 0.75x speed slider in Settings would be high-value for hard phrases (Lesson 09 introductions etc.) but adds a settings field + UI work. Defer to a follow-up.
5. **ContextPick.** Multiple Serbian options on screen; autoplay one is misleading and autoplay all is noise. Confirm: leave silent, rely on AudioButtons on each option if/when we add per-option audio buttons.
6. **Sentence-level vs word-level audio.** Some Serbian strings have no generated clip yet (the script is opt-in). When autoplay fires and the file is 404, the user sees nothing (silent fail) — same UX as AudioButton's dim flash but invisible. Acceptable, but consider logging missing-clip events to console in dev.
