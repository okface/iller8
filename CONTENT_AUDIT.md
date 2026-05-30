# iller8 — Content Audit (Curriculum / Serbian-content view)

> Audited: the 179-word lexicon (`src/data/words/words.json`), the 10 themed lessons (~360 phrases), the 14 phrase families (`src/data/phrase-families.json`). Read against `ARCHITECTURE.md` and `PEDAGOGY_AUDIT.md`. Lens: an English-speaking *beginner* whose goal is real conversation with a half-Serbian girlfriend and a Bosnian best friend.
>
> Verdict up front: the *engine* is excellent and the *content* is unusually rich for sweet-talk, reactions and slang — but the lexicon has a hole shaped like "everyday survival Serbian." A beginner can flirt before they can count to ten, name a weekday, ask "how much?", say "I'm thirsty," or name a single body part. The content is optimized for the romantic relationship and missed the scaffolding that makes a learner *autonomous*.

---

## 1. Vocabulary coverage gaps

The current 179 words skew heavily to affection (pet names, love verbs), discourse particles (ma, bre, pa, jao), and reactions. The **transactional / daily-survival core is largely absent.** Below are ~90 concrete additions, all real modern Serbian, Cyrillic matched to Latin, grouped and prioritized. POS abbreviations: n=noun, v=verb, adj=adjective, num=numeral, adv=adverb, pron=pronoun.

### 1a. Numbers 6–20 + tens (HIGH) — the lexicon stops at 5 and zero
`šest`/шест (6, num) · `sedam`/седам (7) · `osam`/осам (8) · `devet`/девет (9) · `deset`/десет (10) · `jedanaest`/једанаест (11) · `dvanaest`/дванаест (12) · `dvadeset`/двадесет (20) · `trideset`/тридесет (30) · `pedeset`/педесет (50) · `sto`/сто (100) · `hiljadu`/хиљаду (1000) · `prvi`/први (first, adj) · `drugi`/други (second) · `treći`/трећи (third). *Why:* prices, time, ages, phone numbers, "two coffees" — unusable without these.

### 1b. Days & calendar (HIGH) — zero coverage today
`ponedeljak`/понедељак (Monday, n) · `utorak`/уторак (Tuesday) · `sreda`/среда (Wednesday) · `četvrtak`/четвртак (Thursday) · `petak`/петак (Friday) · `subota`/субота (Saturday) · `nedelja`/недеља (Sunday / week) · `vikend`/викенд (weekend, n) · `nedelja`/недеља (week) · `mesec`/месец (month / moon, n) · `godina`/година (year, n) · `sat`/сат (hour / o'clock / watch, n) · `minut`/минут (minute, n). *Why:* "see you Friday," "this weekend," "what time?" — the making-plans lesson already *uses* `vikend` and `večeras` but neither weekday nor `sat` is a drillable word.

### 1c. Question words (HIGH) — only šta/kako/gde/zašto/kada exist
`ko`/ко (who, pron) · `koliko`/колико (how much / how many, adv) · `koji`/који (which, pron) · `čiji`/чији (whose, pron) · `odakle`/одакле (where from, adv) · `kuda`/куда (where to, adv). *Why:* `koliko` ("how much?") is the single most-needed shopping/café word and is entirely missing. `ko` (who) is a glaring omission for a beginner.

### 1d. High-frequency verbs not yet covered (HIGH)
`trebati`/требати (to need — *trebam, treba mi*, v) · `jesti`/јести (to eat — *jedem, jedeš, jede*, v) · `kupiti`/купити (to buy, perf) · `znati` exists; add `razumeti`/разумети (to understand — *razumem*, v) · `govoriti`/говорити (to speak — *govorim*, v) · `dati`/дати (to give — *dam, daj!*, perf) · `uzeti`/узети (to take — *uzmem, uzmi!*, perf) · `živeti`/живети (to live — *živim*, v) · `zvati se`/звати се (to be called — *zovem se*, v) · `početi`/почети (to begin — *počnem*, perf) · `završiti`/завршити (to finish — *završim*, perf) · `kupovati`/куповати (to shop, impf) · `gledati`/гледати (to watch — *gledam*, v) · `tražiti`/тражити (to look for — *tražim*, v). *Why:* `trebati` ("I need") and `jesti` ("to eat") are top-20 survival verbs absent from the file. `zvati se` lets the learner *introduce themselves* — the literal first thing you do.

### 1e. Greetings & politeness fixed phrases (HIGH)
`zdravo`/здраво (hello) · `ćao`/ћао (hi/bye) · `dobro`/добро (good/fine — standalone reply, adv) · `molim`/молим (please / you're welcome / pardon?) · `dobar dan`/добар дан (good day) · `doviđenja`/довиђења (goodbye) · `prijatno`/пријатно (enjoy / take care) · `ništa`/ништа exists; add `nema na čemu`/нема на чему (you're welcome). *Why:* `molim` and `zdravo` are absolute day-one words and not in the lexicon. (`hvala` is covered only inside a family, not as a word.)

### 1f. Food & drink basics (MEDIUM-HIGH) — only kafa/voda/hrana exist
`hleb`/хлеб (bread, n) · `mleko`/млеко (milk, n) · `voće`/воће (fruit, n) · `meso`/месо (meat, n) · `sir`/сир (cheese, n) · `jaje`/јаје (egg, n) · `pivo`/пиво (beer, n) · `vino`/вино (wine, n) · `sok`/сок (juice, n) · `čaj`/чај (tea, n — already used in a family but not a word) · `rakija`/ракија (rakija, n) · `doručak`/доручак (breakfast, n) · `ručak`/ручак (lunch, n) · `večera`/вечера (dinner, n) · `so`/со (salt, n) · `gladan` exists; add `žedan`/жедан (thirsty, adj). *Why:* the food lesson references burek, ćevapi, ajvar as opaque phrase-nouns; the learner can't recombine them. `žedan` ("thirsty") pairs with the existing `gladan`.

### 1g. Places & getting around (MEDIUM)
`grad`/град (city, n) · `prodavnica`/продавница (store, n — used in a family, not a word) · `restoran`/ресторан (restaurant, n) · `kafić`/кафић (café, n) · `ulica`/улица (street, n) · `stan`/стан (apartment, n) · `auto`/ауто (car, n) · `autobus`/аутобус (bus, n) · `levo`/лево (left, adv) · `desno`/десно (right, adv) · `pravo`/право (straight ahead, adv) · `blizu`/близу (near, adv) · `daleko`/далеко (far, adv) · `ovde`/овде (here, adv) · `tamo`/тамо (there, adv). *Why:* `gde je…?` ("where is…?") — see proposed family §3 — needs destinations.

### 1h. Family terms (MEDIUM) — only mama/tata/žena/muž/dete/brate
`sestra`/сестра (sister, n) · `brat`/брат (brother — lemma; only voc `brate` exists) · `sin`/син (son, n) · `ćerka`/ћерка (daughter, n) · `baka`/бака (grandma, n) · `deka`/дека (grandpa, n) · `devojka`/девојка (girlfriend / girl, n — used in family, not a word) · `dečko`/дечко (boyfriend / guy, n) · `porodica`/породица (family, n) · `roditelji`/родитељи (parents, n.pl). *Why:* the learner is dating into a Serbian family; `baka` (grandma — who makes the sarma referenced in lesson 4) and `devojka`/`dečko` are emotionally central and missing as words.

### 1i. Body & health (LOW-MEDIUM)
`glava`/глава (head, n) · `ruka`/рука (hand / arm, n) · `noga`/нога (leg / foot, n) · `stomak`/стомак (stomach, n) · `oko`/око (eye, n) · `boli`/боли (it hurts — *boli me glava*, v) · `bolestan`/болестан (sick, adj) · `zdrav`/здрав (healthy, adj — appears in a birthday family). *Why:* `boli me…` ("…hurts") is a high-utility experiencer construction that reuses the dative pattern already taught.

### 1j. Weather, money, misc adjectives (LOW-MEDIUM)
`sneg`/снег (snow, n) · `kiša`/киша (rain, n) · `toplo`/топло (warm/hot, adv) · `hladno`/хладно (cold, adv) · `novac`/новац (money, n) · `pare`/паре (cash, n.pl, colloquial) · `dinar`/динар (dinar, n) · `skup`/скуп (expensive, adj) · `jeftin`/јефтин (cheap, adj) · `nov`/нов (new, adj) · `star`/стар (old, adj) · `brz`/брз (fast, adj) · `spor`/спор (slow, adj). *Why:* `koliko košta?` + `skup`/`jeftin` finish the shopping toolkit; `hladno mi je` reuses the dative pattern.

**Effort:** ~90 entries at the existing schema depth (forms + 2 examples each) is ~1.5–2 focused sessions. Numbers, days, question words, survival verbs, and greetings (1a–1e, ~45 words) are the must-ship subset.

---

## 2. Conjugation / grammar coverage gaps

The lexicon's `forms` arrays are good for present tense but **thin on the three tenses a beginner hits in week one.**

- **`biti` is incomplete where it matters most: the negative.** `nisam/nisi/nije/nismo/niste/nisu` and the question forms `jesam/jesi/je li` are referenced inside families ("Nisam umoran", "Jesi li gladan?") but are **not** in the `biti` word's `forms`. Add them — negation of "to be" is the single most-used pattern in the language. **(HIGH, tiny effort.)**
- **Future tense is shown but never lemmatized.** Families use `ću/ćeš/će` and contractions (`pozvaću`, `videćeš`, `ići ću`). Add the full future-clitic paradigm (`ću, ćeš, će, ćemo, ćete, će`) to `hteti.forms` with tag `*.fut.clitic`, plus a note on the `-ću` contraction. **(HIGH, tiny.)**
- **Past tense (l-participle) has no system.** Only `voleti`, `misliti`, `ukrasti`, `ubiti`, `pio` carry `past.m/past.f`. Backfill `past.m.sg` + `past.f.sg` (+ `past.pl`) onto the top 12 verbs: `biti→bio/bila`, `imati→imao/imala`, `ići→išao/išla`, `raditi→radio/radila`, `jesti→jeo/jela`, `piti→pio/pila`, `znati→znao/znala`, `hteti→hteo/htela`, `moći→mogao/mogla`, `videti→video/videla`, `reći→rekao/rekla`, `doći→došao/došla`. The participle + gender agreement is *the* beginner past tense; it's currently scattered across families instead of attached to verbs. **(HIGH, ~1 session.)**
- **Modals lack the `da`-clause pattern in data.** `moći`, `morati`, `trebati`, `hteti` all govern "da + present" (`moram da idem`). Add a one-line note to each and a dedicated phrase family (§3, "I have to…"). **(MEDIUM.)**
- **Adjective gender triads are inconsistent.** Some adjectives carry m/f/n forms, many don't. Standardize `forms` = `{m.sg, f.sg, n.sg, pl}` for the core adjectives (`dobar/dobra/dobro/dobri`, `umoran/umorna`, `gladan/gladna`, `srećan/srećna`, new `žedan/žedna`). This powers the existing gender-agreement perspective shift. **(MEDIUM.)**

---

## 3. Phrase-family expansion (6–10 new families)

The 14 families are well built but cluster on affection + reactions. The biggest *functional* gaps are the question/request patterns a beginner needs to **operate in the world**. Each below = base + variant ideas (label → form).

1. **"Where is…?" (questions)** — base `Gde je kupatilo?`/Где је купатило? ("Where's the bathroom?"). Variants: *plural* `Gde su ključevi?` (Where are the keys?); *to a place* `Gde je stanica?`; *which way* `Kuda da idem?`; *how far* `Je li daleko?`; *formal* `Izvinite, gde je…?`; *near me* `Ima li kafić u blizini?`. **Highest-utility missing family.**
2. **"I need…" (trebati)** — base `Treba mi pomoć.`/Треба ми помоћ ("I need help"). Variants: *object swap* `Treba mi voda.`; *verb* `Moram da idem.`; *negation* `Ne treba mi ništa.`; *question* `Treba li ti nešto?`; *past* `Trebao mi je odmor.`; *we* `Treba nam hleb.` Reuses the dative experiencer pattern already taught via `nedostaješ mi`.
3. **"How much is it?" (money)** — base `Koliko košta?`/Колико кошта ("How much does it cost?"). Variants: *this* `Koliko košta ovo?`; *total* `Koliko sve zajedno?`; *too expensive* `Mnogo je skupo.`; *do you have* `Imate li…?`; *I'll take it* `Uzeću ovo.`; *card/cash* `Može karticom?`.
4. **"Can I…?" (permission, vs existing can-you)** — base `Mogu li da probam?`/Могу ли да пробам ("Can I try?"). Variants: *sit* `Mogu li da sednem?`; *pay* `Mogu li da platim?`; *ask* `Mogu li nešto da pitam?`; *go* `Mogu li da idem?`; *formal* `Smem li…?`; *negation* `Ne smem.`.
5. **"I'd like…" (ordering, softened)** — base `Hteo bih kafu.`/Хтео бих кафу (the conditional already glimpsed in the i-want family — promote it). Variants: *fem speaker* `Htela bih…`; *two of them* `Dva piva, molim.`; *for here/to go* `Za poneti, molim.`; *menu* `Mogu li jelovnik?`; *the check* `Račun, molim.`; *water* `Čašu vode, molim.`.
6. **"My name is… / Nice to meet you" (introductions)** — base `Zovem se Viktor.`/Зовем се Виктор ("My name is Viktor"). Variants: *and you?* `A ti?`; *where from* `Odakle si?`; *I'm from…* `Iz Engleske sam.`; *nice to meet you* `Drago mi je.`; *learning Serbian* `Učim srpski.`; *a little* `Pričam malo srpski.`. **Day-one identity-building family.**
7. **"What time…? / When?" (time)** — base `Koliko je sati?`/Колико је сати ("What time is it?"). Variants: *at what time* `U koliko sati?`; *what day* `Koji je danas dan?`; *what time do we meet* `U koliko se nalazimo?`; *I'm late* `Kasnim.`; *just a sec* `Samo malo.`; *in an hour* `Za sat vremena.`.
8. **"I don't understand" (survival / repair)** — base `Ne razumem.`/Не разумем ("I don't understand"). Variants: *slower* `Možeš sporije?`; *repeat* `Možeš da ponoviš?`; *how do you say…* `Kako se kaže…?`; *what does X mean* `Šta znači…?`; *I don't speak well* `Ne pričam dobro srpski.`; *in English?* `Govoriš engleski?`. **Critical for an actual beginner mid-conversation.**

(Optional 9–10: **"Let's…" (predlozi):** `Hajde da…` cluster; **"It hurts" (boli me):** experiencer-construction family reusing the dative pattern.)

**Effort:** each family ≈ base + 6 variants with notes ≈ the existing files' density; ~6 families is ~1 session. Families 1, 2, 6, 8 are the must-ship subset (where/need/introductions/repair).

---

## 4. Curriculum ordering / on-ramp

**The current theme order (sweet-talk first) is right for *motivation* but wrong as the *only* path for a true beginner** — exactly the §3.7 diagnosis that was never built. Lesson 1 silently throws vocative, possessive-gender, 2nd-person present, dative clitics, imperatives, past-with-gender, future, and conditional at someone who can't yet say "I am."

**Recommendation: add a short "Foundations" track of 3–4 micro-lessons that runs *before* the themed lessons unlock, built entirely from words/families that already exist plus the §1–§3 additions.** Keep all 10 themed lessons; just gate them behind Foundations on a fresh profile (the dashboard already plans a "Day-1 variant" — roadmap phase 10).

```
Foundations 0 — Identity & survival (NEW, day 1–3)
  Words: ja, ti, zdravo, ćao, da, ne, molim, hvala, dobro, kako, zovem se
  Families: introductions (§3.6), "how are you" (exists)
  Outcome: greet, name yourself, say yes/no/please/thanks.

Foundations 1 — "To be" & pronouns (day 3–7)
  Words: ja/ti/on/ona/mi/vi/oni + sam/si/je/smo/ste/su + ne(+nisam) 
  Families: i'm-tired, i'm-hungry (exist — they ARE the biti drill)
  Outcome: "Ja sam …", "Nisam …", "Jesi li …?"

Foundations 2 — Core verbs + needing/wanting (week 2)
  Words: imati, hteti, moći, morati, trebati, ići, jesti, piti
  Families: i-want, i-need (§3.2), can-i (§3.4)
  Outcome: order, ask, state needs.

Foundations 3 — Numbers, time, where (week 2–3)
  Words: 6–20, days, sat, koliko, gde, levo/desno, places
  Families: where-is (§3.1), how-much (§3.3), what-time (§3.7)
  Outcome: shop, count, navigate, schedule.

→ Themed lessons (sweet-talk … celebrations) unlock as "views" into the now-learnable corpus.
```

This needs **no new lesson *content*** beyond §1–§3 — it's a re-sequencing layer (`order` + a `track: "foundations" | "themes"` flag on lessons, and the readiness gate that already exists). **Effort: ~½ session of data + the day-1 dashboard gate already on the roadmap.**

---

## 5. Listening-first exercises (the big underused opportunity)

Audio exists for every phrase/word (Azure Sophie/Nicholas) but is **playback-only** — the learner always sees the text. For a beginner whose real goal is *understanding spoken* Serbian from a girlfriend and a fast-talking dev friend, this is the highest-leverage missing exercise category. Three concrete types, all buildable on the existing `AudioButton`/`AutoplayAudio` + `MCOptionList` primitives:

1. **`listen-pick-meaning` (hear → pick English).** Auto-plays a Serbian clip on mount (no text shown), 4 English options. Distractors = the same minimal-pair pool the word generator already produces. Forces sound→meaning mapping without orthography as a crutch. *Bucket 0–1 listening entry point.* **Lowest effort — it's MultipleChoice with the prompt hidden and audio auto-played.**
2. **`listen-pick-text` (hear → pick the matching Serbian).** Play the clip; show 4 *Serbian* options (minimal pairs: `volim / voliš / volimo`, `te / ti / mi`). Trains the sound→spelling link and the inflection contrasts that are invisible when you read. Pairs perfectly with the perspective-shift families (hear a form, pick which form it was). *Bucket 1–2.*
3. **`listen-and-type` / `dictation` (hear → type it).** Play the clip; type what you hear (reuse `scoring.ts` diacritic-tolerant matching; gate behind `skipTyping`). This is the single best transfer exercise to real listening comprehension — and Serbian's phonetic orthography makes it fairer than in English. *Bucket 2+, opt-in.* For tile-only learners, a **`listen-and-build`** variant (arrange word tiles to match the audio) gives the same benefit without typing.

**Wiring:** add the three `ExerciseType`s, a `listening-only` flag on the Daily-session mix (e.g. 15–20% of items), and a "Listening" quick-tile / Hammer toggle. The data already exists (every clip is generated). **Effort: ~1 session for type 1+2, ~½ more for dictation.** This converts a finished asset (914 clips × 2 voices) into active practice — the best impact-per-effort content win in the whole app.

---

## BUILD THIS FIRST — top 5 by impact-per-effort

1. **`listen-pick-meaning` + `listen-pick-text` exercises.** Activates the entire existing audio library for the learner's actual goal (understanding speech). Reuses MC plumbing. *Effort: ~1 session. Impact: very high.*
2. **Survival-vocab pack: numbers 6–20, days, question words (`ko`/`koliko`/`koji`), `trebati`/`jesti`/`zvati se`, greetings (`zdravo`/`molim`/`dobro`).** ~45 words that unlock counting, time, shopping, self-introduction — the floor a beginner stands on. *Effort: ~1 session. Impact: very high.*
3. **Foundations on-ramp (re-sequence, no new lessons).** A 4-step track using existing + new words/families so day-1 isn't eight grammar topics at once. *Effort: ~½ session (data + dashboard gate already roadmapped). Impact: high.*
4. **Four new question/request families: "Where is…?", "I need…", "Introductions", "I don't understand."** The functional patterns that make the learner autonomous in a room full of Serbs. *Effort: ~1 session. Impact: high.*
5. **Backfill past-tense participles + complete `biti` negative/future on the top 12 verbs.** Fixes the "tenses live only inside families, not on the verb" gap so the learner can *produce* past/future generatively. *Effort: ~1 session. Impact: medium-high.*

---

### Content specified in this audit (counts)
- **~90 new words** with glosses + POS, grouped into 10 themes (numbers, calendar, question words, verbs, greetings, food/drink, places, family, body/health, weather/money), all Cyrillic-matched.
- **8 new phrase families** (each base + 6–7 variant ideas with labels) = ~55 new variant phrases sketched.
- **3 new listening exercise types** + 1 tile variant, with concrete bucket placement and wiring.
- **Grammar backfill** specified for **12 verbs** (past participles), full negative/future `biti`/`hteti`, and 5 adjective gender triads.
- **A 4-step Foundations curriculum** mapped to existing + proposed content.
