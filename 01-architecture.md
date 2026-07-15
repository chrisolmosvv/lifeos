# LifeOS — Architecture

> I am the "how it's built." Stable doc — changes rarely.
> **Corrected 2026-07-15 (doc-drift audit, Stage 2):** the stack table, the front-end
> shape, the runtime picture, the module-table inventory and the hard constraints were
> brought back in line with reality. The audit trail is `doc-drift-audit.md`.

## The stack (the helpers, and what they honestly cost)
| Piece | Job | Service | Cost |
|---|---|---|---|
| The app | What you see and tap; opens in the browser on phone + desktop. **A responsive web app, NOT a PWA** — no offline install, no service worker; PWA install is a possible later piece | React + Vite (plain CSS — see note), hosted on Vercel | Free |
| The data brain | Stores data, handles login, runs the edge functions | Supabase (Postgres + Auth + RLS + Edge Functions). **Frankfurt `cntlptuacsujbdtwvbis` ONLY — never Ireland `qupudazcutkbnxseciwn`** | Free tier |
| The messenger | You ↔ Marty chat | Telegram bot (@lifeos_marty_bot, owner-locked) | Free |
| **Marty's brain** | The conversational + proactive assistant — **Hermes Agent, self-hosted on a Hetzner box, powered by the owner's ChatGPT subscription** (see `00-hermes-track.md`) | Hetzner VPS (~€6.64/mo) + ChatGPT subscription | **Paid — owner's decision, 2026-07-08** |
| The small AI jobs | Recipe import, meal estimates, food-search ranking — and the **parked** old bot | Gemini API (`gemini-3.1-flash-lite`, free tier — the free 2.5-flash tiers proved too small) | Free |
| The gym feed | Workout history read from Hevy (read-only cache) | Hevy API | **Paid (Hevy Pro)** |
| The alarm | Scheduled pokes: gym sync 4×/day; the old 7am-brief job (state unverified — see runtime) | Supabase pg_cron + pg_net + Vault | Free |
| The vault | Saves every version of the code | GitHub | Free |

Build tool: **Claude Code** on the owner's Claude Max plan.

> **The cost rule — AMENDED 2026-07-15 (was "free tiers only").** LifeOS is
> **free-by-default**, with exactly three standing paid exceptions, each an explicit,
> recorded owner decision: the **Hetzner box + ChatGPT subscription** (Marty's brain,
> 2026-07-08) and **Hevy Pro** (the gym data source). Anything NEW that would cost
> money still stops and flags before proceeding — that part of the old rule stands.

> **Styling note:** Tailwind was named here originally but never installed. The app
> uses **plain CSS** — colours/fonts as variables in `src/spine/theme/theme.css` —
> organised as a **small reusable component kit** in `src/desktop/kit/` (sealed,
> prefixed blocks). The category palette's source of truth is
> `src/spine/logic/palette.js`. Task rows: Today AND all three Planning surfaces now
> share ONE row, **`TodayRow`** + the cycling **`StatusCycle`** (converged 2026-07-14);
> the 3-segment **`StatusPill`** survives only in the task form + subtask rows.

## The front-end shape (corrected 2026-07-15)

**Three trees, one front door.** `src/` is split so phone and desktop can't tangle:
- **`src/spine/`** — shared data hooks, pure logic, and the theme. The only code both
  trees may import.
- **`src/desktop/`** — the full desktop app.
- **`src/mobile/`** — a separate, purpose-built phone app (Today grid, capture,
  Food/Cook, Health faces — its own broadsheet screens, not a squeezed desktop).

The front door (`src/main.jsx`) reads the viewport ONCE at boot (≤860px = mobile) and
loads exactly one tree — locked at load, no resize swapping. A **build guard**
(`src/buildGuard.js`) FAILS the build if the two trees ever cross-import. Two
load-bearing rules that live in code comments and bite when forgotten:
- **Mobile CSS is imported statically in `main.jsx`** (dynamic-chunk CSS preload is
  broken in Vite 5) — don't "tidy" those imports into the mobile tree.
- **CSS regressions are only real on a HARD reload** — Vite hot-reload re-injects a
  changed stylesheet at the END and fakes cascade breaks.

**Desktop views (ten):** the `LoggedIn` shell switches `today · focus · planning ·
archive · calendar · health · food · finance · people · settings`. The nav band shows
eight (Planning is reached from Today; Archive from Settings). Health holds a hub +
three faces (Gym "Form Guide", Sleep, Body).

> **Sign-in (Phase 7 AUTH).** Email + password (with "Forgot password?" → an in-app
> reset page). Single-user, **public sign-up disabled**. Magic link removed from the
> UI (the email provider stays enabled as a recovery backstop). See the decisions doc.

## The data foundation (the part that lets pillars bolt on later)

- **categories** — buckets, any bucket can live inside another. **Max 3 levels deep**
  (DB trigger `categories_enforce_depth`). Fields: name, parent_id, **color** (a
  palette *id*, e.g. `teal`, or NULL = a derived shade computed at render, never
  written), sort_order, + the archive columns. **The Inbox is two things at once
  (corrected 2026-07-15):** a protected top-level category ROW named "Inbox" exists
  (never deletable), but an item is "in the Inbox" by having **`category_id = NULL`**
  — the picker shows "Inbox" and writes null. Don't point rows at the Inbox row.
- **tasks** — things to *do*. title, notes, category, parent task (subtasks, one
  level), priority, **time bucket — NOT NULL DEFAULT 'Today'** (there is no
  bucket-less task; the buckets are hidden-but-present under the dates-first UI), due
  date, scheduled start/end, **status (`open` / `in_progress` / `done`)**,
  completed_at (stamped by a DB trigger), `source` (default `'typed by me'`), + the
  archive columns. **NOTE: tasks has NO `updated_at` column** — verify a task write by
  id/title/`completed_at`, never updated_at (other module tables do have it).
- **events** — things that *happen*. start, end, location, `all_day` (end-exclusive
  local-midnight dates), hidden `external_id` (free prep for future Apple Calendar
  sync), + archive columns. **`repeat_rule` is dormant/unused** (the `recurrences`
  table replaced its purpose — a prove-dead droppable-later cleanup). **events has NO
  `source` column** (only tasks carry one) — load-bearing for anything that wants
  "everything Marty made" uniformly.
- **recurrences** (`db/37`) — the repeat "recipe": pattern + DST-safe time (wall-time +
  fixed zone, default Europe/Amsterdam) + the template stamped onto each generated
  row. The app GENERATES real events/tasks ("occurrences"); `series_id` +
  `series_detached` on both spine tables link back (FK out to the module table, SET
  NULL, never cascades). Widened for **finance** (`db/45`): `target_kind` accepts
  `'transaction'` + four nullable template columns.

### The one move that unlocks everything
Every **task** carries an optional **source** ("typed by me", "telegram", …). Future
modules don't touch the calendar's guts — they just **write tasks**, which appear in
the day automatically.

### Quiet signal capture — **NOT BUILT**
- **activity_log** (the "task completed at 2pm / app opened" diary) is a **Phase 8
  roadmap item that was never built** — no table exists. Don't confuse it with
  **`activity_hourly`** (`db/25`), which IS live and is something else entirely:
  Apple-Health steps/kcal per hour.

### Archive — universal soft-delete
Delete = **archive**, not destroy. `archived_at` + `archive_batch_id` on
tasks/events/categories (+ `archived_at` on people); **archive_batches** groups each
delete action so it restores as one unit (`source_type` now also accepts `'person'` and
`'transaction'`). Every screen and the brief read active-only (`archived_at IS NULL`).
"Delete now" on the Archive screen is the only hard delete. Category links are **SET
NULL on delete, never cascade** — a restored task whose category died comes back as
Inbox.

### One definition of "a day"
All day-bucketing — Gym, Sleep, Body, Food, Focus, the brief — uses the ONE shared
Europe/Amsterdam helper (`gymDates.js` front-end; `_shared/datetime.ts` back-end).
Never add a second date path; the machine-clock version "dragged" days and was
purged.

## Module tables (ADD to the spine, never change it)
Every module follows the same pattern: **additive, owner-only RLS, NO foreign key into
categories/tasks/events** (spine ids stored as plain values). Corrected 2026-07-15:
this inventory now covers ALL live modules.

**Marty (old bot, parked — tables still live and reused by Hermes):**
- **telegram_saves** — the original create-only undo log. **Superseded by
  `marty_actions`**; dead in code, table not yet dropped (a later cleanup).
- **marty_actions** — the generalised **undo log** (create/edit/delete + prior state).
  **Every Hermes write is undo-logged here too** — it outlived the old bot.
- **marty_pending / marty_category_learning / marty_brief / marty_nudges** — the old
  bot's multi-turn scratchpad, category-correction learning, numbered-brief map, and
  nudge caps (see runtime for the nudge's real status).

**Gym (G-track, `db/17`–`db/23`)** — a **read-only cache of Hevy**, keyed on
`hevy_id`: `gym_workouts`, `gym_exercises`, `gym_sets`, `gym_sync_state` (the sync
cursor), `gym_pins`, `gym_exercise_templates` (muscle groups). **Nothing but the sync
may ever write these** — hand-writing corrupts the sync; deletes apply only on Hevy's
explicit delete events, never inferred from absence; the cursor advances only on a
fully clean pass. Re-running the backfill is the recovery net.

**Sleep / Body (S-track, `db/24`–`db/27`, `db/30`)** — `sleep_nights` (one row per
night, keyed on the Amsterdam wake-up date; + stage columns + `segments`),
`body_metrics` (one row per reading, `(metric_type, reading_at, source)` unique;
daily average computed on read), `health_goals` (append-only owner targets; newest
active row per `goal_type` wins — **also holds the nutrition + focus goals**),
`activity_hourly` (Apple-Health steps/kcal). Fed by PUSH: an Apple Shortcut fires
4×/day at the `health-ingest` function.

**Focus (`db/36`)** — `focus_sessions`: started/ended (NULL = running), mode,
`segments` jsonb (intervals), SOFT task/category references + snapshots
(delete-proof), rating, note, `source` (`timer`/`manual`/`hermes`).

**Food (F-track, `db/28`, `db/31`–`db/35`, `db/38`–`db/42`)** — `food_items` (the
library/cache, per-100g macros, `display_name`), `food_log_entries` (one row per
logged item with the frozen 7-number **macro snapshot**; `entry_source` in
manual/search/recipe_cook/**hermes**; `is_alcohol` = the lite drink log), `recipes`,
`recipe_ingredients`, `recipe_steps` (+ step enrichment: `tag`, `depends_on`,
`step_position`). Cook layer is **event-sourced** (`db/39`): `cook_session` (thin
header) + `cook_event` (append-only, immutable — state derived by replay, timers
survive reload).

**People / Rolodex (R-track, `db/43`)** — eight tables: `people`, `people_circles`,
`people_circle_members`, `people_connections`, `people_groups`,
`people_group_members`, `people_interactions`, `people_dates`. Birthday events live in
a "Birthdays" category and are found via `people_dates.recurrence_id` →
`events.series_id` (events has no source column). Full spec: `14-rolodex.md`.

**Finance (`db/44`–`db/45`)** — `finance_accounts` (cash + investment),
`finance_transactions` (income/expense/**transfer = a paired two-row insert**;
sign-consistency CHECKed; `category_id` a plain value; `csv_match_key` for import
dedupe), `finance_account_snapshots` (investment value log), `finance_budgets`
(append-only per-category monthly limits). Recurring bills ride the shared
`recurrences` engine. Full spec: `13-finance.md`.

## How the pieces connect (runtime — rewritten 2026-07-15)

**NINE edge functions run in Supabase** (was "two" — long outgrown). The inventory,
their auth, and the config.toml `verify_jwt` pin state:

| Function | Job | Auth | Pinned? | Status |
|---|---|---|---|---|
| `hermes-read` | Marty's read-only full-life snapshot (tasks, events, food, sleep, body, activity, focus, gym, goals, **people, finance**) | `X-Hermes-Secret` header | false ✓ | live |
| `hermes-write` | Marty's one write door — task/event/food/body/sleep/focus/**people/finance-transaction**; gym EXCLUDED; confirm-gate server-enforced; every write undo-logged | `X-Hermes-Write-Secret` header | false ✓ | live |
| `health-ingest` | Apple Shortcut → sleep/body/activity rows | `x-health-secret` header | false ✓ | live |
| `gym` | Hevy backfill + incremental sync (cron 4×/day) | project JWT (service-role callers) | not pinned (default true = wanted) | live |
| `food-search` | OFF + USDA + saved-items search | owner's JWT | true ✓ | live |
| `meal-estimate` | typed meal description → Gemini → kcal/P/C/F | owner's JWT | true ✓ | live |
| `recipe-import` | paste/URL → Gemini → house recipe format | owner's JWT | true ✓ | live |
| `telegram` | the OLD bot's webhook — **parked rollback** | Telegram secret-token header | **NOT PINNED — known gap** | parked; webhook state unverified |
| `brief` | the OLD bot's 7am brief + nudge modes | project JWT (service-role callers) | not pinned (default true = wanted) | parked-ish; cron state unverified |

**Marty today = Hermes.** The brain is Hermes Agent on the Hetzner box (ChatGPT
subscription via the Codex bridge), reading through `hermes-read` and writing through
`hermes-write` — never raw to the database, never holding the service-role key. Every
write lands in `marty_actions` (undoable); weight/sleep/estimated-food writes are
**rejected server-side (422) unless confirmed**. The full story, guardrails, and open
tidy-ups: **`00-hermes-track.md`**. The proactive *behaviours* (Chief-of-Staff +
food-logger missions) are **not built yet** — right now Hermes acts when spoken to.

**The old serverless Marty (M-track) is PARKED, not deleted** — it's the 30-second
rollback if the box dies. Two honest footnotes:
- **The daytime nudge never fired from its schedule.** The `marty-daytime-nudge` cron
  reads a Vault secret name that doesn't exist (only `brief_service_role_key` does) —
  confirmed 2026-06-24, logged as backlog, retired-in-place with the old bot. Any doc
  that sells the daytime nudge as a live feature is describing the past.
- **The cutover state is unverified** (old webhook vs Hermes polling; whether the old
  7am-brief cron still texts) — hermes-track tidy-up #4 / audit checks V-01, V-03.

## Operational invariants (promoted from scar tissue, 2026-07-15)
- **Pin `verify_jwt` in `config.toml` for EVERY function and deploy functions
  ALONE.** A bare deploy defaults verify_jwt=true and silently kills header-authed
  functions (bit health-ingest once). `telegram` is the known unpinned gap (Part B).
- **After any `ALTER TABLE`, run `notify pgrst, 'reload schema'`** — or writes
  silently drop the new column while "succeeding."
- **The shell's `SUPABASE_ACCESS_TOKEN` points at the WRONG (Ireland) account.**
  Prefix every CLI call with `env -u SUPABASE_ACCESS_TOKEN` and confirm the ref.
- **Verify writes by row identity / `updated_at`** (tasks: by `completed_at`/id —
  no updated_at exists), never by "the value looks right."
- **Schema changes are checker-gated** ("checker approved", exact words) and **db/
  and src/ never share a commit** (two-track), so either rolls back cleanly.

## Hard constraints
- **Free-by-default** — see the amended cost rule above. New paid anything: stop and flag.
- **RLS ON everywhere** — owner-only policies on every table; the database refuses
  non-owner data.
- **Single user.** No multi-user features, no sharing, no roles, ever.
- **Modules add tables; the spine's meaning never changes.**
- **The AI/health-data boundary — AMENDED (2026-07-08) and one part OPEN:** the old
  rule ("health data never reaches a training-capable/free AI") was **deliberately
  relaxed for the Hermes brain** — sleep/body/food/focus flow to the owner's own
  ChatGPT account, an eyes-open decision (`00-hermes-track.md`). It still binds
  everything else. **OPEN QUESTION (audit Q-02, owner to rule):** `meal-estimate`
  sends typed descriptions of what the owner ate to the FREE Gemini key — inside or
  outside the intended boundary? Until ruled, treat free-Gemini as OFF-LIMITS for any
  NEW intake/health feature.
