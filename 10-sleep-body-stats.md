# LifeOS — Health → Sleep & Body Stats (build plan)

> **⚠️ CORRECTED 2026-07-15 (doc-drift audit D-16) — four things have moved on:**
> 1. **The screens described here have been rebuilt twice** — the Health V2 pass
>    (see `health-v2-build-doc.md`) and then the Sleep redesign (Pieces 0–5,
>    2026-07-13/14, recorded in `04-handoff-log.md`). The DATA layer below is still
>    the truth; for the current UI, trust the handoff log over this doc.
> 2. **Awakenings + respiratory rate were CUT from every Sleep surface**
>    (2026-07-13, owner's call — the columns still exist in `sleep_nights`, they're
>    just not shown).
> 3. **"Nudges via Marty" below meant the OLD bot, now parked** — sleep coaching as
>    a proactive behaviour belongs to the future Hermes missions
>    (`00-hermes-track.md`).
> 4. The **"no health data ever touches an AI" framing was deliberately relaxed**
>    2026-07-08 for the Hermes brain (sleep/body flow to the owner's own ChatGPT
>    account, eyes-open). This module itself still uses no AI.

> The plan for the **second** Health-pillar module (Gym was the first). Plain
> English only — the owner does not read code.
> Numbered **S0–S…** (its own track, like Gym's `G` and Marty's `M`) so it never
> collides with the other tracks. This doc is the source of truth for every `S`
> piece; the locked reasons live in `03-decisions.md`, the screen feelings in
> `06-design.md`, the screen layouts in `07-ux-flows.md` (both filled later, at
> the layout layer — not yet).

## What this is (one paragraph)
A NEW module under the existing **Health** section, with **two faces** —
**Sleep** and **Body Stats**. It reads what **Apple Health** already holds (sleep
from the **Apple Watch**, body readings from a smart scale), measures it against
**goals the owner sets**, and **proactively pushes** the owner toward them through
**Marty** (bedtime reminders, brief lines, plain-rule nudges). Data arrives by
**push** — an **Apple Shortcut** auto-fires **4×/day** and POSTs to a private
Supabase Edge Function. **V1 is logic-only, no AI** — every shown number and every
nudge is computed from rules, never sent to a model. A **paid, no-training AI key**
is a deliberate **later** piece; until it exists, no sensitive health data ever
touches an AI.

## Naming & place — Health's second sub-section
- The broadsheet **Health** section already exists (Gym = "The Form Guide" is its
  first face). Nav stays **Today · Calendar · Health · Settings** — **no new
  top-level nav**.
- Sleep and Body Stats slot **under the same Health banner**. With Health now
  holding **three faces** (Gym, Sleep, Body), **how they coexist under one banner
  is a Layer-4 IA decision — OPEN** (see "Still open" below). Nothing is laid out
  until that's settled.

## Ground rules (every `S` piece obeys these)
- **Push, not pull.** LifeOS never calls Apple. An on-device **Apple Shortcut**
  reads Health and POSTs to us. There is **no server cron for ingest** (unlike
  Gym/Hevy) — the device-side automation is the clock.
- **No AI in V1.** Every stat and nudge is **plain-rule logic**. The existing
  **"health data → switch to paid AI"** rule (`01-architecture.md`) **never trips**
  because no health data is sent to a model. If/when a paid no-training key lands,
  any AI line is appended **after** the model call, as a fixed boundary.
- **Additive only.** Three **new** tables. **No** change to the
  `tasks`/`events`/`categories` spine; **no foreign key** into it (spine ids, if
  ever stored, are plain values — same rule as `marty_*` and the gym tables).
- **Single user, RLS on, free tiers** — as everywhere in LifeOS.
- **Secrets stay secret.** The Edge Function's shared secret / any key lives in the
  Supabase secret store, **never** in `src/`, **never** in the repo. A later
  Settings line shows **connection / last-received status only**.
- **Two-track boundary.** `src/` and `supabase|db/` never share a commit; each
  schema piece is its own commit, checker-gated.
- **Bones before skin.** Tables built to full intended shape before any UI polish.
- **Store raw, compute on read.** No derived numbers in the DB (no drift).
- **Units.** Weight in **kg**; body fat in **%**; sleep as **h:mm** or minutes.
- **One definition of "a day."** All day-bucketing uses the shared
  Amsterdam-timezone helper (`gymDates.js`) so Sleep, Body and Gym agree on a day.

## Locked decisions (full reasons mirrored in `03-decisions.md`)
- **Stance = active coach.** Tracks → measures vs goals → pushes. The *front pages*
  stay calm (design law #2); the *pushing* happens through **Marty**, not by making
  a screen shout.
- **AI = logic-only V1; paid no-training key is a later piece.** Blocker cleared.
- **Source = Apple Health only**, single source of truth — no per-metric conflict.
- **Sleep — lead metric = DURATION vs goal. No score in V1.** The Apple Watch makes
  a sleep score, but Apple keeps it inside the Sleep app and does **not** expose it
  as a readable Health value — a Shortcut can pull **stages and times** but not the
  score. Rather than make the owner copy it by hand every morning, V1 drops the
  score and leads on duration. A nullable `score` column is **reserved** in the
  table for the AI/V2 world (costs nothing now, saves a migration later).
- **Sleep detail = full stages.** REM / Core / Deep / Awake all read cleanly from
  Apple Health and are kept.
- **Body — show every stat the scale writes** (weight, body-fat %, lean mass, BMI…).
  **Lead = weight + trend**, the rest in a supporting strip (densify at layout).
- **Body — keep every reading; daily headline = average.** Both a 7am and a 7pm
  weigh-in stay logged; the day's shown weight is their **average, computed on read**.
- **Goals = owner-set** (sleep hours, target bedtime, goal weight, …) and stored.
- **Factors = use what we already hold.** No daily check-in. The sleep coach
  correlates against gym workouts (and their timing), day-of-week, bedtime
  regularity, and prior nights. **Honestly thin in V1** — expect findings like
  "you sleep ~25 min longer on gym days" — and it **sharpens for free** when the
  Food module later feeds caffeine / alcohol / late meals in automatically.

## The pipeline contract (Fork B — settled)
- **Trigger:** an Apple Shortcut automation fires **4×/day at 06:00, 12:00, 18:00,
  00:00**. Each run reads recent Health data and POSTs it. Four runs gives natural
  redundancy — sleep past 06:00 and the noon run still catches last night.
- **Backfill:** first run pulls **everything from 1 Jan 2026**.
- **Payload → tables:** the Edge Function validates a shared secret, parses the
  JSON, and **upserts**.
- **Dedupe / conflict keys:**
  - `sleep_nights` — **one row per night**, keyed on the **wake-up date**
    (Amsterdam day). A re-push of the same night **updates** the row (latest wins);
    sleep is one consolidated record, so this is safe.
  - `body_metrics` — **one row per reading**, keyed on **(type + reading timestamp +
    source)**, so the four daily runs can't double-log the same reading. The daily
    average is **derived on read**, never stored.
- **No server cron.** A later Settings "Health sync" line shows **last-received
  time** only.

## Data shapes (Layer 2 — the next gate, CHECKER-GATED)
Three additive, owner-RLS, no-spine-FK tables.

1. **`sleep_nights`** — one row per night:
   `night_date` (wake-up date, Amsterdam) · `in_bed_at` · `woke_at` ·
   `asleep_minutes` · `rem_minutes` · `core_minutes` · `deep_minutes` ·
   `awake_minutes` · `awakenings` · `score` *(nullable, reserved)* · `source` ·
   timestamps. **Unique:** `night_date`.

2. **`body_metrics`** — one row per reading (flexible shape):
   `metric_date` (Amsterdam day) · `metric_type` (e.g. `weight`, `body_fat`,
   `lean_mass`, `bmi`) · `value` · `unit` · `reading_at` (exact timestamp) ·
   `source` · timestamps. **Unique:** `(metric_type, reading_at, source)`.
   *(A new stat = a new row's `metric_type`, never a schema change.)*

3. **`health_goals`** — the owner's targets:
   `goal_type` (e.g. `sleep_duration`, `bedtime`, `weight`) · `target_value` ·
   `unit` · `direction` (`up` / `down` / `by_time`) · `set_at` · `active`.
   Newest `active` row per `goal_type` is the live goal; old ones kept for history.

## The calc / derive layer (Layer 3 — a `src/` util, compute-on-read)
Derives everything shown, from raw rows, via `gymDates.js` day buckets:
- **Sleep:** nightly duration; rolling 7/30-day average; duration vs goal; bedtime
  consistency; deep-sleep minutes & %; awakenings; nights-hitting-goal streak;
  **gym-day vs rest-day** duration delta (the headline coach correlation).
- **Body:** latest + daily-average value per metric; rolling weight **trend**
  (kg/week slope); delta vs goal; same shape for body-fat % and any other metric.
- **Goals:** progress to target; projected hit-date at current rate.
Verified against real numbers **before** any screen reads it.

## Screens (Layers 4–6 — NOT designed yet)
Recorded here only as lead metrics; the screen + zone inventory and layouts come
next, after the schema gate:
- **Sleep front:** lead = **last night's duration vs goal**; support = stages,
  trend, consistency.
- **Body front:** lead = **weight + trend**; support strip = other stats.
- **Drill-ins:** a sleep-night detail, a body-history view, a goals editor.

## The coach (the proactive hook — logic-only, via Marty)
- **Bedtime reminder:** if a bedtime goal is set, a wind-down nudge a set time
  before target ("aiming for in-bed by 23:30").
- **Brief / Marty lines:** last night's duration vs goal; weekly sleep trend;
  weight trend vs goal — plain-rule sentences, **appended after any Gemini call**.
- **Surfaced correlations:** "you sleep ~25 min longer on gym days"; "last 3 nights
  under goal"; "weight down 0.3 kg/wk, on track for [date]".

## Build order (`S`-track, risk-ordered — anchors S1→S4 fixed, owner sets the rest)
- **S0 — Paperwork.** This doc + `02`/`03` updates. No code. ← *current piece.*
- **S1 — Prove the pipe.** A private Edge Function + a test Shortcut that POSTs one
  real number (last night's duration) and gets a 200. No DB, no UI.
- **S2 — The tables.** Schema above, **checker-gated**, its own commit.
- **S3 — Ingest + backfill.** Real payload parsed + upserted; backfill from
  1 Jan 2026; re-runnable (re-run is the recovery net).
- **S4 — The 4×/day automation + Settings "last received" line.**
- **S5 — The calc layer.** Verified vs real numbers.
- **S6 — Sleep front page** (read-only).
- **S7 — Body front page** (read-only).
- **S8 — Drill-ins** (sleep night, body history). **ABSORBED** into S6 (bar→night
  drill-in) + S7 (range switcher) — no separate piece built. [2026-06-28]
- **S9 — Goals editor** (the first in-app write). **BUILT** — append-only goal log,
  confirm-on-clear (no explicit undo; re-set is the safety net). [2026-06-28]
- **S10 — Coach hooks** (bedtime reminder + brief lines, logic-only). **DEFERRED** —
  owner chose the Food module next.
- **Final — Polish + audit** to the three design laws; dedupe helpers. **DEFERRED.**
- **→ NEXT module: Food** (own track F; spec TBD by the Planner).

## Still open (to settle at the right layer — not blocking S0)
- **Layer 4 IA — how Gym, Sleep and Body coexist under the one Health banner**
  (tabs? stacked sections? a Health sub-nav?). **OPEN — gates the screen layouts.**
- **Night-date convention** (wake-up date proposed) — confirm at the S2 gate.
- **The AI-later trigger** — what flips us to a paid no-training key. Deferred.

---

## → Paste block for `02-roadmap.md`

```
## 🛌 Track S — Health → Sleep & Body Stats   ← NEW (full plan: 10-sleep-body-stats.md)

Health's second sub-section: Sleep + Body Stats. Reads Apple Health (Watch sleep,
smart-scale body) by PUSH — an Apple Shortcut fires 4×/day → private Edge Function.
Active coach, LOGIC-ONLY V1 (no AI; paid no-training key is a later piece). Goals
owner-set; nudges via Marty. Additive tables, RLS, free-tier, two-track.

- 🟦 S0 — Paperwork (this plan + 02/03). No code.  ← IN PROGRESS
- ⬜ S1 — Prove the pipe (Edge Function + test Shortcut returns 200; no DB/UI).
- ⬜ S2 — Tables (sleep_nights, body_metrics, health_goals). CHECKER-GATED, own commit.
- ⬜ S3 — Ingest + backfill from 1 Jan 2026 (re-runnable).
- ⬜ S4 — 4×/day automation + Settings "last received" line.
- ⬜ S5 — Calc layer (verified vs real numbers).
- ⬜ S6 — Sleep front page (read-only).
- ⬜ S7 — Body front page (read-only).
- ⬜ S8 — Drill-ins (sleep night, body history).
- ⬜ S9 — Goals editor (in-app write, with undo).
- ⬜ S10 — Coach hooks (bedtime reminder + brief lines, logic-only).
- ⬜ Final — Polish + audit to the design laws.

OPEN (Layer 4): how Gym/Sleep/Body coexist under the Health banner — gates layouts.
```

## → Paste block for `03-decisions.md`

```
- **Sleep & Body Stats — stance = active coach, logic-only V1.** Tracks Apple
  Health, measures vs owner-set goals, pushes via Marty. **Why:** owner wants to be
  pushed, not just shown. **Trade-off:** a logic-only coach is templated rules, not
  conversational — the paid-AI piece makes it converse later.
- **Sleep & Body — AI boundary.** No AI in V1; paid no-training key deferred to its
  own piece. **Why:** sensitive data must never reach a training model; the free
  Gemini key may train. **Trade-off:** thinner "insights" until the paid key lands.
- **Sleep & Body — pipeline = push.** Apple Shortcut fires 4×/day (06/12/18/24) →
  private Edge Function; backfill from 1 Jan 2026; no server cron. **Why:** Apple is
  push-only; 4 runs self-heal a missed morning. **Trade-off:** relies on the
  on-device automation staying enabled.
- **Sleep — no score in V1, lead on duration.** The Watch's score is locked in the
  Sleep app, unreadable by a Shortcut; only stages + times export. **Why:** avoid a
  daily manual-copy chore. **Trade-off:** no single sleep number in V1 (a nullable
  `score` column is reserved). Full REM/Core/Deep/Awake stages ARE kept.
- **Body — keep every reading, daily headline = average; lead = weight.** **Why:**
  multiple weigh-ins/day are normal; raw-in/compute-out avoids drift. **Trade-off:**
  none — cleaner than one-row-per-day.
- **Sleep coach factors = existing data only (no check-in).** Correlates against gym
  workouts, day-of-week, bedtime regularity, prior nights. **Why:** zero extra
  logging burden. **Trade-off:** thin in V1; sharpens free when Food module lands.
- **Night belongs to its wake-up date (Amsterdam day).** **Why:** one consistent
  key per night. **Trade-off:** confirm at the S2 schema gate. [OPEN until S2.]
- **Health-banner IA for three faces (Gym/Sleep/Body).** [OPEN — Layer 4; gates the
  screen layouts.]
```
