# LifeOS — Health → Gym: "The Form Guide" (build plan)

> The plan for the first Health-pillar module. Plain English only.
> Numbered **G0–G15** (its own track, like the Marty track's M-numbers) so it
> never collides with the paused Phase 7 redesign numbering. This doc is the
> source of truth for every Gym piece; the locked reasons live in `03-decisions.md`,
> the screen feelings in `06-design.md`, the screen layouts in `07-ux-flows.md`.

## What this is (one paragraph)
A NEW, **read-only** module that lives under a new broadsheet section called
**Health**, styled as **"The Form Guide"** — a sports section about one athlete.
It pulls your workout data from the **Hevy** app's API into its own new Supabase
tables on a schedule, and shows four **desktop** screens: the **Form Guide front
page**, a **Session report**, an **Archive** of past sessions, and **Records**. It
**never writes to Hevy** and uses **no AI** — the one written "story" headline is
built from code-picked templates, not Gemini. Mobile is a deliberately deferred
later spec — not planned here.

## Naming — the section is "Health", Gym is its front page
- The broadsheet **section is titled "Health"**. Nav order becomes
  **Today · Calendar · Health · Settings** (Health placed **third**, before Settings).
- view id **`health`**; NAV label **`Health`**.
- **Gym — "The Form Guide" — is the content / front page of Health.** Tapping
  Health opens straight onto the Form Guide for now (**Health = Gym** until a
  second Health sub-section exists). Later additions (sleep, mood, nutrition,
  body stats) slot under the **same Health banner** with no new top-level nav.

## Ground rules (every piece obeys these)
- **Read-only.** LifeOS only ever *reads* Hevy and reports. We never call a Hevy
  write endpoint.
- **No AI.** The single "story" headline is assembled from **code-picked
  templates**, never Gemini — so Health/Gym stays free + private and the existing
  **"health data → switch to paid AI"** rule (`01-architecture.md` hard
  constraints) **never trips**, because no health data is ever sent to an AI.
- **Additive only.** Gym adds its **own** tables. It never changes the meaning of
  the `tasks` / `events` / `categories` spine, and holds **no foreign key** into
  the spine (spine ids, if ever stored, are plain values — same rule as the
  `marty_*` tables).
- **Single user, RLS on, free tiers** — same as everywhere in LifeOS.
- **Units.** Weight / volume in **kg** (with a thousands separator); time as
  **minutes** or **h:mm**.
- **Desktop only for now.** Mobile is a separate, later spec.
- **The Hevy key is a secret.** It lives in the Supabase secret store as
  `HEVY_API_KEY`, **never** in `src/`, **never** in the repo (the repo is public).
  A later Settings "Hevy" line shows **connection / last-synced status only** —
  never the key.

## Locked decisions (full reasons in `03-decisions.md`)
- **Estimated 1RM = Epley:** `weight × (1 + reps / 30)`.
- **PR = heaviest weight**, used consistently everywhere.
- **Warm-ups excluded** from PR / estimated-1RM / top-set; **total volume counts
  all sets**. (Hevy tags each set normal / warmup / dropset / failure.)
- **Rolling-7-day box-score band:** Volume, Sessions, Time, New PRs.
- **Sync cadence: twice daily** via pg_cron, reusing the **existing Vault
  service-role key** (its real name confirmed when we build the cron at **G5**);
  Hevy webhooks are a later upgrade. **G1 confirms Hevy's own API rate limits**
  so we know twice-daily is safely within them.
- **Metrics computed on-read** in a `src/` calc util; we **store only raw Hevy
  data**, never derived numbers (no drift; add a cache later only if perf needs it).
- **Store `exercise_template_id`** on `gym_exercises` from the start; muscle
  groups come from `/v1/exercise_templates` (a small lookup table built in **G6**),
  backfillable later **without re-pulling history**.
- **No undo-log piece** (no Gym equivalent of Marty's M2): the gym tables are a
  **read-only cache** of Hevy, so **re-running the backfill (G3) is the recovery
  net**.
- **Tables** (all additive, owner-RLS, no spine FK), defined in **G2**:
  `gym_workouts` (with `unique(user_id, hevy_id)`), `gym_exercises` (with
  `exercise_template_id`), `gym_sets`, `gym_sync_state`, `gym_pins`. The
  exercise-templates lookup is defined in **G6** from real Hevy data.
- **Two-track boundary rule.** Health/Gym runs in **parallel** with the paused
  Phase 7 front-end redesign. Every Gym **front-end** piece is **new files only**;
  it may touch `LoggedIn.jsx` + the `NAV` array in `EditionHeader.jsx` and
  **nothing else** in the shell; it imports existing `src/kit/` blocks **as-is**
  and builds **no new primitives** except new `src/kit/` gym blocks. **Never a
  single commit that mixes `src/` with `supabase/functions/`.**
- **Doc home:** this file. **Phase prefix:** `G` (G0–G15).

## The standing per-piece ritual (every later piece)
- A **save point committed before** the work begins.
- **One small thing**, fully finished — **no file over ~250 lines** (split first).
- **Owner-verified on the Mac** before the next piece starts ("deployed" ≠ "done").
- If it **changes the database**, it's **flagged for the checker** and is its
  **own commit**, never inside a UI commit.
- Ends with the **brain docs updated + re-uploaded**.
- **Doom-loop rule:** if a fix breaks the next thing, **stop and roll back** to
  the save point — never dig.

## The desktop build plan (G0–G15)
> Pieces past the fixed anchors are a **guide**; the owner sets the order. Anchors
> that are fixed: connection **G1**, tables **G2**, backfill **G3**, cron +
> Settings status **G5**, exercise-templates lookup **G6**.

**Backend foundation**
- ✅ **G0 — Lock the spec into the brain.** Paperwork only (this doc + the
  `02/03/06/07` updates). No code.
- ✅ **G1 — Prove the Hevy connection (plumbing).** A new **private** edge function
  `supabase/functions/gym/index.ts` (jwt-verified, like `brief`) that calls Hevy
  `GET /v1/workouts/count` with the `api-key` header and returns the real workout
  count as JSON. No DB, no UI, no schedule. **Owner-verified — real count `92`.**
  Hevy returned no rate-limit headers here, so the real ceiling gets confirmed at
  the G3 backfill (watch for `429` / `Retry-After`).
- 🔨 **G2 — The gym tables (schema, checker-gated).** `gym_workouts`,
  `gym_exercises`, `gym_sets`, `gym_sync_state`, `gym_pins` — additive, owner-RLS,
  no spine FK; `gym_workouts` unique on `(user_id, hevy_id)`; intra-module FKs only.
  **SQL written (`db/17`–`db/21`, commit `e9238a9`); awaiting checker sign-off +
  owner run on Frankfurt + device-verify before it counts done.**
- ⬜ **G3 — Backfill (one-shot, re-runnable).** Pull the full Hevy workout history
  (paginated `GET /v1/workouts`) into the tables. Re-running it is the recovery net.
- ⬜ **G4 — Incremental sync logic.** A function that reads
  `GET /v1/workouts/events` since the last sync (from `gym_sync_state`) and
  upserts changes / removes deletes. (Cadence wired in G5.)
- ⬜ **G5 — Twice-daily cron + a Settings "Hevy" status line.** pg_cron + pg_net +
  the Vault service-role key fire G4 twice a day (real Vault name confirmed here).
  A Settings "Hevy" line shows **connection + last-synced** status only.
- ⬜ **G6 — Exercise-templates lookup.** Build a small lookup table from
  `GET /v1/exercise_templates` (muscle groups), keyed by `exercise_template_id`.
  Backfillable without re-pulling workout history.

**Front-end (desktop only; new files; the two-track rule)**
- ⬜ **G7 — Health nav + empty Form Guide shell.** Add view id `health`, NAV label
  `Health` (third), and a placeholder Form Guide page reading a real number or two.
- ⬜ **G8 — The metrics calc util (compute-on-read).** Pure `src/` functions: Epley
  1RM, PR (heaviest), total volume, top-set, warm-up exclusion, the rolling-7-day
  box score — plus reusable `src/kit/` number blocks.
- ⬜ **G9 — Front page, zones 1–2.** The **box-score band** (rolling-7-day Volume /
  Sessions / Time / New PRs) and the **trend chart**.
- ⬜ **G10 — Front page, zone 3.** The **consistency heatmap**.
- ⬜ **G11 — Front page, zones 4–5.** **Body-part balance** + the **recent sessions
  table**. (Front page complete.)
- ⬜ **G12 — Session report.** One workout in full: exercises, sets, volume, any PRs
  hit, the code-templated story headline.
- ⬜ **G13 — Archive.** All past sessions, browsable / paginated.
- ⬜ **G14 — Records.** PRs + estimated 1RM per exercise, with dates.
- ⬜ **G15 — Story headline + polish.** The code-picked-template headline (no AI),
  unit formatting (kg thousands separator, h:mm), empty states, and pins
  (`gym_pins`).

*(Mobile Health/Gym is a deliberately deferred later spec — not in G0–G15.)*

## Hevy API reference (read-only)
- **Base:** `https://api.hevyapp.com`
- **Auth:** header `api-key: <key>` (Hevy **Pro** only).
- **Read endpoints we use (never a write endpoint):**
  - `GET /v1/workouts` — all workouts, **paginated**.
  - `GET /v1/workouts/{id}` — one workout in full.
  - `GET /v1/workouts/count` — total workout count (used by G1).
  - `GET /v1/workouts/events` — updates / deletes since a date (incremental sync).
  - `GET /v1/exercise_templates` — exercise list + muscle groups (G6).
- **Per set:** `weight_kg`, `reps`, `set_type` (normal / warmup / dropset /
  failure), `rpe` (+ `distance` / `duration` for cardio).
- **Volume** = `weight_kg × reps`.
- **Never** call a Hevy write endpoint.
