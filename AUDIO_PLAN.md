# Audio plan — Serbian TTS for iller8

## TL;DR

- **Provider: Microsoft Azure Neural TTS** with `sr-RS-NicholasNeural` (male) and `sr-RS-SophieNeural` (female). It's the only mainstream provider that has *purpose-built Serbian neural voices* (not a multilingual model guessing at Serbian), has both Latin-script (`sr-Latn-RS-*`) and Cyrillic (`sr-RS-*`) variants, costs ~$15 per 1M characters, and ships a generous 500k-character free tier each month. ElevenLabs v3 is a credible backup if its Serbian output sounds more natural in A/B tests with a native speaker, but it's 6–10× more expensive and treats Serbian as a long-tail language.
- **Storage: bundle MP3s in `public/audio/<phrase-id>.mp3`, commit them to the repo, ship via GitHub Pages**. The actual corpus is 908 clips × ~12 KB each ≈ **11 MB total** — well within Pages' soft 1 GB repo limit and 100 GB/month bandwidth budget. Move to Cloudflare R2 only if the corpus ever exceeds ~50 MB or if Pages bandwidth ever becomes a real concern.
- **Cost: one-shot generation ≈ $0 (free tier covers it ~50× over). Ongoing ≈ $0/month** at the user's content cadence. Even the worst-case provider (ElevenLabs Multilingual v2 at $0.17/1k chars) tops out at **~$1.76 for the whole corpus**. TTS cost is not the deciding factor here — voice quality is.

---

## Provider comparison

Actual corpus measured from the data files: **908 unique Serbian strings, 10,338 characters of `sr_latin`** (incl. phrase variations, word lemmas + drillable forms, and phrase-family base + variants). Cost columns below use the higher Cyrillic character count (≈10,338 chars too, since both scripts are 1:1) as the input.

| Provider | Serbian? | Voices | Quality reputation | Cost (per 1M chars) | Free tier | Cost for 10.3k chars |
|---|---|---|---|---|---|---|
| **Azure Neural TTS** | Yes — `sr-RS-NicholasNeural` (m), `sr-RS-SophieNeural` (f), plus `sr-Latn-RS-*` Latin-input variants | 2 voices, both scripts | Purpose-built neural Serbian; widely cited as the most natural sr-RS in benchmarks; native speakers on TTS-aggregator sites consistently rate Sophie/Nicholas favourably | $15 / $22 (HD) | 500k chars/month neural for 12 months on free trial; 0.5M/mo permanent on F0 SKU | **$0.15** (effectively free) |
| **Google Cloud TTS (Chirp 3: HD)** | Yes — Chirp 3: HD added sr-RS in late 2025 | 8 voices (4 m / 4 f), shared cross-language identities | New, no long native-speaker track record yet; Chirp 3 sounds great in English/Spanish; Serbian prosody is reportedly OK but the pitch-accent system is not specifically tuned | $30 (Chirp 3 HD) / $16 (Neural2) / $160 (Studio) | 1M Chirp 3 HD chars/month forever | **$0.31** |
| **Google Cloud TTS (Standard / WaveNet)** | Standard only — no native `sr-RS-Standard-A` in the current voice list; Serbian requires Chirp 3 HD | n/a | n/a | n/a (Serbian not offered on Standard) | n/a | n/a |
| **ElevenLabs (v3 / Multilingual v2)** | Yes — Serbian (srp) in v3's 74-language list; also in Multilingual v2's 29 langs | ~3,000 community voices; same voice can speak Serbian | Top-tier for English; reviewers warn "less common languages carry meaningful risk of accent drift and mispronunciation on numbers and proper nouns" — Serbian falls in that bucket | $170 (Multilingual v2 on Creator), $85 (Flash/Turbo v2.5), Pro tier $0.06–0.12/1k chars | 10k chars/mo on Free, 30k on Starter ($5) | **$0.88–$1.76** |
| **AWS Polly** | **No.** Serbian is not in the Polly language list as of 2026; community feature requests exist but the March 2026 Generative TTS expansion did not add it | n/a | n/a | n/a | n/a | n/a |
| **OpenAI TTS** | Officially "Whisper-language-coverage" includes Serbian, but OpenAI does not advertise sr-RS voices; output is a multilingual English-accented voice forcing Serbian phonemes | Few (alloy, echo, fable, onyx, nova, shimmer) | Anecdotally poor for Slavic pitch-accent; not a native Serbian model | $15 (tts-1), $30 (tts-1-hd) | None | **$0.15–$0.31** but quality risk is high |
| **Coqui XTTS-v2** | **No.** XTTS-v2 supports 17 langs; Serbian is not in the list. Could be voice-cloned from a sample but cross-language transfer to a Slavic phonology not in training is unreliable | Cloneable from 6 s sample | Untested for sr | Free (self-host) + GPU time | n/a (compute only) | **$0** + ~hour of GPU |
| **Bark (Suno)** | Multilingual but not officially Serbian; quality is patchy and slow | Several speaker presets | Long generation times, inconsistent for non-English | Free (self-host, MIT) | n/a (compute only) | **$0** + significant compute |
| **SpeechGen / Notevibes / Narakeet / CAMB.AI** | Yes — these are aggregators wrapping Azure/Google + their own models. SpeechGen advertises 50+ "srpski" voices; Notevibes 30 premium Serbian voices; Narakeet 83 | Many | Marketing-heavy; underlying engines are usually Azure or Google with some proprietary tweaks. Useful for one-off batch export from a browser if you don't want to wire up an API | Varies; usually subscription, $5–$25/mo | Limited (a few minutes) | Bundled |

### Key takeaways from the comparison

1. **AWS Polly is out** (no Serbian).
2. **Coqui XTTS / Bark are out** for shipping quality (no native Serbian training).
3. **OpenAI TTS is out** (no native Serbian model; the multilingual voice is anglophone phonology in a Slavic costume).
4. The real contest is **Azure vs. Google Chirp 3 HD vs. ElevenLabs v3.**
5. **Azure wins on dedicated Serbian voices**: NicholasNeural and SophieNeural were trained specifically as Serbian voice actors, not as multilingual models fine-tuned downward. Native-speaker reviews on TTS aggregator sites consistently call out Sophie as the most natural-sounding `sr-RS` voice on the market.
6. **Google Chirp 3 HD is new** (mid-2025) and not yet battle-tested for Serbian; worth re-evaluating in 6–12 months.
7. **ElevenLabs is the best voice cloner** in English, but Serbian is a long-tail language for them and accent drift is a real risk — especially for short utterances (pet names, single words) where there's no surrounding context to anchor pronunciation.

---

## Recommended provider

**Pick Azure Neural TTS with `sr-RS-SophieNeural` as the primary voice and `sr-RS-NicholasNeural` as a male alternate.** Use the `sr-Latn-RS-*` variant when the input string is Latin, and the plain `sr-RS-*` variant when the input is Cyrillic — same voice actor, but the front-end normaliser handles each script's tokenisation natively, which is one fewer source of pronunciation glitches.

Reasoning:

- **Dedicated Serbian neural voices.** Azure is the only major provider whose Serbian voices were trained as Serbian, not generalised from a multilingual model. This matters most for the pitch-accent system Serbian uses — the four-tone system (short-falling, short-rising, long-falling, long-rising) is the single biggest stumbling block for non-native TTS models and the most jarring for native listeners.
- **Cost is irrelevant at this scale.** The entire corpus is ~10k characters. Azure's free tier covers that ~50× over. Even if the corpus tripled to 30k, the on-demand rate is $0.45.
- **Both scripts supported natively.** The `sr-Latn-RS-*` voices accept Latin input without a transliteration step — useful because the canonical text in iller8's data files is `sr_latin`.
- **SSML support** for pronunciation hints (`<phoneme>`, `<say-as interpret-as="characters">` for spelling out tricky cases like "č/ć", `<break time="200ms">` for pacing in longer phrases).
- **Mature SDK** in Node (`@azure/microsoft-cognitiveservices-speech-sdk`) so the batch script stays simple.

**Validation step before committing:** run a 20-clip A/B against ElevenLabs v3 with the actual girlfriend (or the Bosnian best friend) as the listener-of-record. If Sophie's pitch accents bother them, fall back to ElevenLabs v3 with a Serbian-cloned voice. But default to Azure.

---

## Storage and delivery

**Bundle the MP3s in the repo at `public/audio/<phrase-id>.mp3`.** Reasons:

- **Total size is trivial.** 908 clips × ~12 KB (Opus 32 kbps mono, 1–3 s clips) ≈ **11 MB.** Even at MP3 64 kbps it's ~22 MB. GitHub's soft repo limit is 1 GB; this is 1–2% of that.
- **No infra to wire up.** No CDN signup, no CORS, no signed URLs. The audio is just another static asset Vite copies through to `dist/`.
- **HashRouter-compatible.** Audio is served from `/audio/<id>.mp3` (real path, not a route), so HashRouter doesn't interfere.
- **Offline-friendly.** Whatever the user has loaded is cached by the browser; the app stays usable without network. If iller8 ever adds a service worker, the entire audio set can be precached because it's small.
- **Free.** Pages bandwidth at 100 GB/month soft cap is ~9,000× the size of the corpus per month. Even at 1,000 sessions/month touching every clip, total egress is ~11 GB — comfortable.

**Format: MP3 at 64 kbps mono, 22.05 kHz.** Yes, Opus is a better codec (smaller, higher quality at low bitrates), but MP3 has universal support including older Safari and any odd corner case. The size difference between MP3 and Opus at this corpus scale is ~10 MB — irrelevant. **Pick MP3 for the broadest compatibility; revisit Opus only if size ever becomes a constraint.**

**Don't inline as base64 in JSON.** Three reasons: (a) base64 inflates payload by ~33%, (b) it ruins the JSON load time on every cold start since the audio gets parsed even if never played, (c) the browser can't cache individual clips separately.

**Lazy load.** Don't preload. The `<AudioButton>` component lazy-instantiates an `Audio` element only on first click. This:
- Avoids 11 MB of speculative downloads (especially over mobile data).
- Avoids burning bandwidth on phrases the learner never engages with.
- Lets the browser cache hot clips naturally (the SRS items the learner sees repeatedly will be in cache by review 2).

**Optional optimisation (phase 3):** prefetch the audio for the *next 5 phrases* of the current lesson when the lesson screen mounts. Drops perceived latency to ~0 ms for sequential play.

### Cloudflare R2 fallback (if needed later)

If the corpus ever explodes past ~50 MB (e.g., the user adds 5,000 phrases), move to R2:
- Storage: $0.015/GB/month — $0.0008/month for 50 MB
- Egress: **zero**
- Custom domain, CORS, signed URLs all trivial
- Total monthly cost: rounding error

But this is YAGNI for the foreseeable future.

---

## Batch generation workflow

### (a) Where the strings come from

Three sources, all canonically `sr_latin` (TTS pronunciation is identical between Latin and Cyrillic Serbian — both alphabets are 1:1 phonetic):

| Source file | Field path | Approx. count |
|---|---|---|
| `src/data/lessons/*.json` | `phraseGroups[].phrases[].sr_latin` + `phraseGroups[].phrases[].variations[].sr_latin` | 409 |
| `src/data/words/words.json` | `lemma_sr_latin` + `forms[].sr_latin` | 388 |
| `src/data/phrase-families.json` | `base.sr_latin` + `variants[].sr_latin` | 111 |
| **Total** | | **908** |

**Stable ID strategy:** each entity already has an `id` field. Phrase variations and word forms do *not* — they're indexed positionally. The extractor should mint stable synthetic IDs:

- Phrases: `phrase-st-dusko.mp3`
- Phrase variations: `phrase-st-draga--v0.mp3`, `--v1.mp3`
- Words (lemma): `word-voleti.mp3`
- Word forms: `word-voleti--1sg-pres.mp3` (`.` in tags → `-`)
- Family base: `family-miss-you--base.mp3`
- Family variant: `family-miss-you--var-formal.mp3`

This means re-running the extractor is idempotent — the only thing that changes the file name is the upstream `id`/`tag`.

### (b) Script structure

Add `scripts/generate-audio.ts` (run via `npx tsx`) — keeps the existing build pipeline clean.

```
scripts/
  generate-audio.ts        # CLI entry point: extract → diff → call → save
  audio/
    extract.ts             # walks src/data, emits { audioId, text, source }[]
    azure-tts.ts           # thin Azure SDK wrapper with retry + 429 handling
    manifest.ts            # reads/writes public/audio/manifest.json
```

The **manifest** (`public/audio/manifest.json`) records `{ audioId, text, sha1(text), generatedAt, voice }` for every clip. On re-run:
- Skip if `sha1(text)` matches the manifest entry (clip is current).
- Regenerate if the SHA changed (text was edited).
- Generate if the audioId is new.
- Delete the MP3 (and manifest entry) if the audioId no longer appears in source data.

This makes re-generation cheap and safe: only changed phrases hit the API.

### (c) API call pattern

- **Concurrency: 4 parallel requests** (Azure neural voices' rate limit is 20 requests/sec on standard SKU; 4 leaves headroom).
- **Retry: exponential backoff** on 429 / 5xx (3 retries, 500 ms → 2 s → 8 s).
- **Voice rotation: not needed.** Pick one voice (Sophie) and stick to it for consistency. Maybe add Nicholas (male) for some role-played phrases later — but phase 1 is one voice.
- **SSML wrap:** wrap each string in `<speak version="1.0" xml:lang="sr-RS"><voice name="sr-RS-SophieNeural"><prosody rate="-5%">{text}</prosody></voice></speak>`. The slight rate reduction (-5%) helps clarity on short pet-name utterances without sounding artificial.
- **Output format: `audio-24khz-48kbitrate-mono-mp3`** (Azure SDK preset). Small enough, clear enough, universal codec.

### (d) Output naming

`public/audio/<audioId>.mp3` per the ID scheme above. Flat directory (no per-lesson subfolders): 908 files in one directory is fine on every modern filesystem, and a flat structure means the path is computable from the ID alone — no lookup table needed.

### (e) How to verify quality

After the first batch generates, the script writes `public/audio/_review.html` — a simple static page that:
- Lists 30 randomly sampled clips with the Serbian text, the English gloss, and an `<audio controls>` element.
- Has a "Flag" textarea next to each so the user can note "mispronounces *ć*", "stress wrong on second syllable", etc.

The user (or the girlfriend/best friend) listens through, flags problems, and the script supports an **override map** at `scripts/audio/overrides.json`:

```json
{
  "phrase-st-dusko": { "ssml": "<phoneme alphabet=\"ipa\" ph=\"ˈduʃo\">dušo</phoneme> moja." },
  "word-cao": { "voice": "sr-RS-NicholasNeural" }
}
```

Overrides re-trigger generation for just those IDs on next run.

---

## Data model deltas

The cleanest approach is **convention over configuration**: the audio file name is always derivable from the entity ID. Then no field has to be added to any data file.

Helper (new file `src/lib/audio.ts`):

```ts
export const audioUrlForPhrase = (p: Phrase) =>
  `${import.meta.env.BASE_URL}audio/phrase-${p.id}.mp3`;

export const audioUrlForPhraseVariation = (p: Phrase, i: number) =>
  `${import.meta.env.BASE_URL}audio/phrase-${p.id}--v${i}.mp3`;

export const audioUrlForWord = (w: Word) =>
  `${import.meta.env.BASE_URL}audio/word-${w.id}.mp3`;

export const audioUrlForWordForm = (w: Word, f: WordForm) =>
  `${import.meta.env.BASE_URL}audio/word-${w.id}--${f.tag.replace(/\./g, '-')}.mp3`;

export const audioUrlForFamilyVariant = (familyId: string, variantId: string) =>
  `${import.meta.env.BASE_URL}audio/family-${familyId}--${variantId}.mp3`;
```

`import.meta.env.BASE_URL` matters for GitHub Pages — Vite injects the right prefix (`/iller8/`) at build time.

**Optional opt-out per-entity** (rare, but worth supporting): add `audioSkip?: true` to `Phrase`, `Word`, `FamilyVariant` for cases where the entity is text-only by design (e.g., a phrase that's just a punctuation-driven exclamation). Default behaviour assumes every entity has audio.

**No change to `UserSettings`** needed initially. The audio button is always available; if the user wants a global "mute" they can use OS volume. If demand arises, add `UserSettings.audioAutoplay: boolean` later (default false) to optionally play audio when a new phrase is presented.

---

## UI integration

### New component: `src/components/ui/AudioButton.tsx`

```tsx
type Props = { src: string; size?: 14 | 18 | 24; label?: string };
```

Behaviour:
- Lazy creates a single `Audio` element on first click (`new Audio(src)`).
- Subsequent clicks call `.currentTime = 0; .play()` — no re-download (browser cache).
- Visual states: idle (icon at full opacity), playing (subtle pulse animation), error (icon dims and tooltip shows "Audio unavailable").
- Handles missing files gracefully: `audio.onerror = () => setUnavailable(true)`. Important because during phase 1 some entities will not yet have generated MP3s.
- Click target ≥ 32px for thumb-friendly tap (even when icon is 14px).
- Keyboard: `Space` plays when focused.

Use the already-defined `IconAudio` from `src/components/ui/Icons.tsx`.

### Where it appears (in this order — ship in phases)

1. **PhraseIntro phase** — per-phrase row, right of the Serbian text. This is the highest-value spot: the learner first encounters a phrase and now hears it natively. (Per the DESIGN.md spec referencing this.)
2. **Catalog / Lesson detail page** — next to each phrase. Lets the learner browse and listen freely.
3. **Exercise post-answer reveal** — after answering, the correct Serbian sentence shows its audio button. Reinforces pronunciation while feedback is fresh.
4. **Word chips (`WordChips.tsx`)** — long-press or tap-and-hold to hear the word in isolation.
5. **(Later) Optional autoplay** — controlled by `UserSettings.audioAutoplay`. When on, audio fires automatically on phrase reveal.

### Don't put it on:

- The dashboard (clutter; no context for why a phrase is playing)
- The progress page (decorative-only)
- Achievement cards (irrelevant)

---

## Cost estimate

Using **Azure Neural TTS** at the standard $15/1M chars rate (ignoring the 500k-char/month free tier, which would make this $0):

| Scenario | Characters | Cost |
|---|---|---|
| Initial generation, full corpus (908 clips, 10,338 chars) | 10,338 | **$0.16** |
| Re-generation after a typo pass (assume 10% of corpus retouched) | ~1,000 | **$0.02** |
| Ongoing: 10 new phrases/month × ~15 chars avg | 150 | **$0.002/month** |
| Pessimistic year-1 total (initial + 12 months of additions + 2 typo passes) | ~13,000 | **$0.20/year** |

If the user instead picks **ElevenLabs Multilingual v2** at $0.17/1k chars (Starter tier overage rate):

| Scenario | Cost |
|---|---|
| Initial generation | **$1.76** |
| Ongoing 10 phrases/month | **$0.025/month** |
| Year-1 total | **~$2.10** |

**Bottom line: TTS cost is rounding-error at this corpus size.** Don't optimise for cost; optimise for voice quality. Even ElevenLabs Pro at full freight is < $3 for the whole exercise.

---

## Implementation phases

Each phase is independently shippable.

### Phase 1 — Single voice, single surface

1. Add `scripts/generate-audio.ts` + helpers; wire the Azure SDK.
2. Generate the full 908-clip corpus with `sr-RS-SophieNeural` to `public/audio/`.
3. Commit the MP3s. (Yes, commit. 11 MB total; perfectly normal for a corpus this small.)
4. Add `src/lib/audio.ts` URL helpers.
5. Add `src/components/ui/AudioButton.tsx`.
6. Wire `<AudioButton>` into **PhraseIntro** only.
7. Smoke-test on the dev server and the GH Pages deploy.

**Ship criteria:** every phrase in lesson 1 has a working audio button on the deployed site.

### Phase 2 — Quality pass

1. Generate the `_review.html` sampler; have the girlfriend or Bosnian friend listen to ~30 random clips + every pet name (they're high-emotional-value).
2. Collect flags, add overrides for the worst 5–10 cases.
3. Re-run generation (overrides cause selective regeneration via the manifest).
4. Decide: stick with Azure, or A/B vs. ElevenLabs on 20 hand-picked clips and switch if Eleven clearly wins.

### Phase 3 — Broader surface

1. Add `<AudioButton>` to the lesson catalog/detail view.
2. Add to the post-answer reveal in every exercise component.
3. Add to `WordChips.tsx`.
4. Implement next-5 prefetch on lesson mount.

### Phase 4 — Settings & polish

1. Add `UserSettings.audioAutoplay` (default false).
2. Add a tiny waveform/duration indicator next to the button when playing.
3. (Optional) Add a "speed" toggle — Azure SSML `<prosody rate="-15%">` for a "slow" variant. Could generate a second clip per phrase under `<id>--slow.mp3` — doubles the corpus but still tiny.

### Phase 5 — Bosnian fallback (only if needed)

If you ever encounter a phrase Sophie pronounces wrong specifically because it's Bosnian-flavoured (e.g., a phrase your best friend uses that Serbian Sophie stresses oddly):
- Use Azure's `bs-BA-VesnaNeural` or `bs-BA-GoranNeural` for that specific clip via the override system.
- This is the only place "Bosnian as a fallback" comes into play — Azure is the only provider where you can mix Serbian and Bosnian voices at the per-clip level.

---

## Risks & open questions

1. **Pitch accent quality.** The Serbian four-tone pitch-accent system is the hardest part of Serbian TTS. Azure's neural voices handle it reasonably well in the most common dialects (Belgrade Ekavian) but can sound off for some words. **Mitigation:** the override system + the listener-of-record pass in phase 2.
2. **Ekavian vs. Ijekavian.** Azure's Serbian voices are Ekavian (Serbia, not Bosnia/Croatia). The user's girlfriend is half-Serbian and the best friend is Serbian/Bosnian. If they prefer Ijekavian forms for some phrases, Sophie will Ekavise them. **Mitigation:** identify problem phrases during the phase 2 review and either accept (most learners pick one variant) or route those specific clips to the Bosnian voice.
3. **Re-generation drift.** If Azure updates the SophieNeural model in the future, re-generated clips may sound subtly different from older ones. This is normally inaudible but can be jarring if only some are re-generated. **Mitigation:** pin the model version in the SSML if Azure exposes one; otherwise, prefer batch-regenerating the whole corpus rather than touching individual files.
4. **GitHub Pages bandwidth ceiling.** 100 GB/month soft. At 22 MB MP3 corpus and an average session loading 50 clips (≈1 MB), the app could serve **~100,000 sessions/month** before approaching the soft cap. Not a concern at the user's personal-use scale; flagged here only for completeness.
5. **Browser MP3 autoplay policy.** Mobile browsers will reject `audio.play()` outside a user gesture. The plan assumes click-to-play, which is gesture-bound, so this is fine. If autoplay-on-phrase-reveal is added in Phase 4, it must be gated behind the explicit `audioAutoplay` setting *and* the very first audio of the session still has to be user-initiated.
6. **CORS for service worker / PWA.** Not relevant while everything is same-origin under Pages. If the audio ever moves to R2 or another CDN, add `Access-Control-Allow-Origin: *` on the bucket.
7. **What about ElevenLabs cloning the girlfriend's voice?** Tempting — emotionally compelling — but legally and practically expensive. Skip for v1. Could revisit as a Phase 6+ stretch if she's willing to record a 5-minute consent sample.
8. **Open question: does the user want a male voice for some phrases?** "Volim te" landing in a male voice when the learner is a guy talking to a woman can feel weird. Phase 1 ships female-only; phase 2 decision point: add NicholasNeural for phrases where the speaker is naturally male (or always offer a toggle).

---

## Sources

- ElevenLabs language list: [ElevenLabs language support](https://help.elevenlabs.io/hc/en-us/articles/13313366263441-What-languages-do-you-support)
- ElevenLabs v3 launch + Serbian: [ElevenLabs on X — v3 supported languages](https://x.com/elevenlabsio/status/1933557207582355635)
- ElevenLabs pricing 2026: [BIGVU — ElevenLabs pricing 2026](https://bigvu.tv/blog/elevenlabs-pricing-2026-plans-credits-commercial-rights-api-costs/), [Flexprice breakdown](https://flexprice.io/blog/elevenlabs-pricing-breakdown)
- ElevenLabs Serbian quality caveats: [DevOpsCube review](https://devopscube.com/elevenlabs-review/)
- Google Chirp 3 HD voices (Serbian added): [Cloud TTS Chirp 3 HD docs](https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd), [Cloud TTS release notes](https://docs.cloud.google.com/text-to-speech/docs/release-notes)
- Google Cloud TTS pricing: [Google Cloud TTS pricing](https://cloud.google.com/text-to-speech/pricing)
- Azure Serbian voice list: [json2video Azure Serbian voices](https://json2video.com/ai-voices/azure/languages/serbian/), [Azure language support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support)
- Azure pricing + HD voice updates: [Azure Speech pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/), [Azure HD voice updates 2026](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/azure-speech-%E2%80%93-neural-hd-text-to-speech-recent-voice-updates/4505380)
- AWS Polly languages (no Serbian): [Polly supported languages](https://docs.aws.amazon.com/polly/latest/dg/supported-languages.html), [Polly March 2026 update](https://aws.amazon.com/about-aws/whats-new/2026/03/amazon-polly-expands-TTS-new-voices-and-bidirectional-streaming/)
- Coqui XTTS-v2 (no Serbian): [coqui/XTTS-v2 model card](https://huggingface.co/coqui/XTTS-v2)
- Cyrillic vs Latin pronunciation equivalence in Serbian TTS: [SpeechGen Serbian TTS](https://speechgen.io/en/tts-serbian/)
- GitHub Pages limits: [GitHub Pages limits docs](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), [Pages 100GB discussion](https://github.com/orgs/community/discussions/22155)
- Cloudflare R2 vs Backblaze B2: [Cloudflare R2 pricing 2026](https://leanopstech.com/blog/cloudflare-r2-pricing-2026/), [LeanOps storage comparison](https://leanopstech.com/blog/cloud-storage-pricing-comparison-2026/)
- Codec comparison: [MDN Web audio codec guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Audio_codecs), [Opus vs MP3](https://www.filetoolworks.com/blog/opus-vs-mp3)
