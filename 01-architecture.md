# LifeOS — Architecture

> I am the "how it's built." Stable doc — changes rarely.

## The stack (six free helpers)
| Piece | Job | Service | Cost |
|---|---|---|---|
| The app | What you see and tap; installs to phone + desktop (PWA) | React + Vite (plain CSS — see note), hosted on Vercel | Free |
| The brain | Stores data, handles login, runs the agent code | Supabase (Postgres + Auth + RLS + Edge Functions) | Free tier |
| The messenger | You ↔ agent chat (text **and** voice notes) | Telegram bot | Free |
| The intelligence | Reads your messages (capture / questions / edits), transcribes voice, guesses categories, writes the brief — all through ONE shared config seam | Gemini API (Flash, free tier) | Free |
| The alarm | Wakes the agent at 7am (the brief) **and** hourly in working hours (the daytime nudge) | Supabase scheduler (pg_cron) | Free |
| The vault | Saves every version of the code | GitHub | Free |

Build tool: **Claude Code** on the owner's Claude Max plan.

> **Styling note (reality check):** Tailwind was named here originally but never
> installed. The app uses **plain CSS** — colours/fonts as variables in
> `src/theme.css` — organised since Phase 7 as a **small reusable component kit**
> in `src/kit/` (sealed, prefixed blocks: the masthead/folio, the day grid + tinted
> blocks, task rows, the status pill, the form + drill-in category picker, toast,
> etc.). See the decisions doc ("component kit, not Tailwind/plain-CSS-per-screen").
> **Task rows are NOT a single block (corrected 2026-07-02):** Today's two modules use
> the converged **`TodayRow`** + the cycling **`StatusCycle`** control; the older
> **`TodayTaskRow`** + the 3-segment **`StatusPill`** stay in use for Planning's Time +
> Category views and the task form / subtask rows (so `TodayTaskRow` is NOT Today-only).

> **Front-end shape (Phase 7 rebuild — Calendar rebuild COMPLETE).** The logged-in
> app is a single shell (`LoggedIn`) over eight views switched by state (corrected
> 2026-07-05) — **Today** (the rebuilt home: a 7am–midnight workspace grid + "tasks
> today" / "next 7 days" modules), **Focus** (the focus-session tracker),
> **Planning** (the planner view), **Calendar** (rebuilt on Today's kit — see below),
> **Health** (gym + body data), **Food** (log + cookbook + cooking mode),
> **Settings** (account + the category manager), plus the **Archive** screen
> (reachable from Settings).
>
> **Calendar (rebuilt, C1–C7 + C4).** `CalendarWeek` (toolbar + today-anchored
> rolling/Monday-week nav via `weekNav` + the Week/Month toggle) over `WeekView`
> (per-week data via `useWeekData`, the shared form, the tray) → `WeekGrid` +
> `WeekColumn` (the 24h sheet, tinted title-only blocks, the all-day band) and
> `MonthView`/`MonthCell` (read-only month via `useMonthData`). **The Today/Calendar
> duplication has CONVERGED:** both screens now share **one** grid-interaction hook
> **`kit/useGridDrag`** (parameterised; it replaced the old `useTodayGrid` +
> `useWeekGrid` twins) and **one** create/edit form **`kit/ItemForm`** (it replaced
> the old `EventPanel`/`TaskPanel`). The old Calendar cluster (`WeekCalendar`, the
> old day-column/block renderers, `useEventDrag`/`useScheduleDrag`, the old panels)
> has been **deleted**. The week reads stay on `useWeekData`; the all-day band drag
> is a small day-grained `useBandDrag`. (The phone keeps the simpler `DayAgenda`
> day view; a dedicated mobile Calendar is a later spec.)

> **Sign-in (Phase 7 AUTH).** Login is **email + password** (with "Forgot password?"
> → an in-app reset page). Single-user, **public sign-up disabled**. Magic link was
> the original method and is now removed from the UI (the email provider stays
> enabled as a recovery backstop). See the decisions doc.

## The data foundation (the part that lets pillars bolt on later)
Everything is a few simple lists that point at each other. V1 only fills in
the first three, but the shapes are built to grow.

- **categories** — buckets, where any bucket can live inside another
  (Uni → Q2 → Class A). The **Inbox is just the first category** (where
  uncategorized things land) — not special machinery. **Max 3 levels deep**
  (DB trigger `categories_enforce_depth`, Phase 7 T3). Fields: name, parent_id,
  **color** (a palette *id*, e.g. `teal`, or NULL = a derived shade — Phase 7 T13),
  sort_order, + the archive columns below.
- **tasks** — things to *do*. Fields: title, notes, category, parent task
  (for subtasks), priority (high/med/low), time bucket (Today / This Week /
  Someday), due date (optional), scheduled start/end (optional, for
  time-blocking on the calendar), **status (now 3-state: `open` / `in_progress` /
  `done` — Phase 7 T7)**, **completed_at timestamp**, + the archive columns below.
- **events** — things that *happen* and you attend. Built to the calendar
  standard: start, end, location, repeat rule, plus a hidden **external_id**
  field (free prep for future Apple Calendar sync), + the archive columns below.
  **`all_day` (boolean, default false — Phase 7 C7)**: when true the event is an
  all-day item — start/end carry the date(s) at local midnight, **end-exclusive**
  (a Mon–Wed all-day stores `end_at` = Thu 00:00); the time is ignored and the item
  renders in the calendar's all-day band / as a Month strip. Additive (`db/10`);
  existing rows default false. **(Corrected 2026-07-03: recurrence now SHIPS — see
  `recurrences` below. `repeat_rule` remains dormant/unused; a proper table replaced
  its purpose, so it's a prove-dead droppable-later cleanup, not repurposed.)**
- **recurrences** (T10, `db/37`) — the repeat "recipe": one row describes a pattern
  (freq daily/weekly/monthly/yearly + the weekday set for weekly + an end condition
  never/count/until), a DST-safe time (start_date + wall_time + duration + a fixed
  `timezone`, default Europe/Amsterdam), and the template stamped onto each generated
  row (title/notes/category/location/all_day, `target_kind` event|task, task
  `time_bucket`), plus bookkeeping (`generated_until`, `split_parent_id`). The app
  GENERATES real events/tasks rows ("occurrences") from it (Approach A), so they
  render through the existing pipeline. Owner-only RLS; additive; free-tier.
- **series link (additive, on BOTH events + tasks, `db/37`)** — `series_id`
  (uuid → recurrences ON DELETE SET NULL; null = a one-off) and `series_detached`
  (boolean default false; a "customised" occurrence that whole-series edits skip).
  Purely additive + spine-safe: an existing row (series_id null, detached false)
  behaves exactly as before; the link points OUT to the module table, never cascades.

### The one move that unlocks everything
Every task carries an optional **source** ("typed by me", later "meal planner",
"people module", etc.). Future modules don't touch the calendar's guts — they
just **write tasks**, which then appear in the day automatically. This is how
Health and Life pillars plug in with no rebuild.

### Quiet signal capture (for future habit-learning)
- **activity_log** — a low-key diary: "task completed at 2pm", "brief sent",
  "app opened". Invisible to the user. Future habit-learning reads this to
  find productive hours, gym consistency, etc.
- Note: "what triggers doomscrolling" needs a data source we don't have yet
  (arrives with the Mind module + Screen Time). Don't fake it.

### Archive — universal soft-delete (Phase 7, A1–A4)
Delete = **archive**, not destroy. **Additive** to the spine (no existing meaning changed):
- **tasks / events / categories** each gained two nullable columns: **`archived_at`**
  (NULL = active; a timestamp = archived) and **`archive_batch_id`** (FK → `archive_batches`,
  ON DELETE SET NULL).
- **archive_batches** (new table) — one row per *delete action* (label + `source_type` in
  category/task/event + created_at; RLS owner-only), so a delete can be **restored as one
  unit**. Deleting a category archives its **whole branch** (category + descendants + their
  tasks/events) as one batch; deleting a task archives its subtasks too.
- **Every screen reads active-only** (`archived_at IS NULL`, via the shared `activeOnly()`
  helper) — including the 7am brief (A3b). The **Archive screen** (Settings → Archive) lists
  batches and offers **Restore** (clears the stamps) and **Delete now** (the ONLY hard delete
  — scoped strictly to one batch's archived rows, behind a naming confirm). A restored
  task/event whose category was hard-deleted comes back as Inbox automatically (FK SET NULL).

### Added module tables (ADD to the spine, never change it)
Every Marty table follows the same pattern: **additive, owner-only RLS, NO foreign key into
categories/tasks/events** (ids are stored as plain values, so a deleted spine row can never be
blocked or cascaded — a stale pointer is just reported as "already gone"). None of them change
what a category/task/event means.
- **telegram_saves** (Phase 5) — the bot's original create-only undo log. **Superseded by
  `marty_actions` in M2** (left in place, no longer read or written; a later cleanup may drop it).
- **marty_actions** (M2) — the generalised **undo log**. One row = one logical action
  (`kind` = create / edit / delete), with a JSONB `items` array holding each affected item +
  its **prior state** (edit before-values; a delete's archive columns). This is what makes every
  Marty action reversible: `undo` reverses the last action (a multi-item capture is one action),
  `undo <name>` reverses one item.
- **marty_pending** (M4) — a tiny one-row-per-owner scratchpad for a **half-finished capture**
  (an event missing its time). Marty parks the draft, asks once ("What time?"), and the next
  message completes it; cleared on completion / abandonment / a ~5-min expiry.
- **marty_category_learning** (M6) — a log of **category corrections** (title + guessed + corrected
  category id). The capture guess reads it and applies a learned preference only after the SAME
  kind of correction has happened **2** times — so a one-off never retrains.
- **marty_brief** (M8) — the **numbered action map** of the latest brief (one row/owner), so a
  reply like "done 1" — which arrives at the *telegram* function, not the brief — maps the number
  back to the exact item.
- **marty_nudges** (M9) — daytime-nudge **scheduling state** (the offer + slot + morning/afternoon
  + answered). Enforces the guardrails (max 2/day, never back-to-back) and lets a "yes"/"no" reply
  resolve the open offer.

#### Food module tables (F-track, `db/28` + `db/39` + `db/40`)
Five core tables (all additive, owner-RLS, intra-module FKs only):
- **`food_items`** — the food library / resolved-DB cache: `name`, `display_name` (nullable
  human-friendly override, db/40), `brand`, `source` (off/usda/manual), `source_ref`, per-100g
  macros, serving info, `is_favourite`.
- **`food_log_entries`** — one row per logged item: `entry_date`, `meal_slot`, FKs to food_items
  / recipes, `amount`, `unit`, the 7-number macro **snapshot**, `entry_source`, `is_estimated`,
  `is_alcohol`.
- **`recipes`** — `title`, `servings`, times, `source_url`, `is_favourite`.
- **`recipe_ingredients`** — `food_item_id` (nullable FK), `raw_text`, `amount`, `unit`,
  `manual_macros`, `no_macros`, `step_position`.
- **`recipe_steps`** — `position`, `text`, `timer_seconds`, `tag`, `depends_on`.

Cook layer (**event-sourced**, db/39 — replaced the original db/34 single-row `cook_session`):
- **`cook_session`** (thin header): `recipe_id` (→ recipes, cascade), `status`
  (active/done/abandoned), timestamps. One active cook at a time (enforced in app logic).
- **`cook_event`** (append-only log): `session_id` (→ cook_session, cascade), `event_type`
  (step_marked / ingredient_ticked / timer_started / timer_stopped / finished /
  **ingredient_used** — corrected 2026-07-07, db/41 added `ingredient_used` to split
  shopping-tick from cooking mark-used; additive CHECK widen on the module table, spine-safe),
  `target_ref` (plain text, not an FK), `payload` (jsonb), `created_at`. **No `updated_at`** —
  events are immutable; state is derived by replay, never stored mutable. Timers survive
  reload/backgrounding because a timer = start-timestamp + duration, computed against the wall
  clock on read.

## How the pieces connect (runtime)
You → the app → Supabase (read/write your data). Supabase runs **two edge functions** —
the public `telegram` webhook (Marty's chat) and the private `brief` (the proactive sends).
Both talk to Gemini through one shared config seam; GitHub just stores the code.

**Marty — the conversational + proactive bot (M-track M0–M10, complete).** The public
`telegram` function is a **thin front door** (security secret-token check → owner-only gate →
text/voice check) that hands every message to a small **router**. The router decides what a
message IS — a reserved command, a question, an edit/delete, a capture, or an answer to a
pending question — and routes it. What Marty can do, all through Gemini's free tier and all
**undoable** via the `marty_actions` log:
- **Capture** (text or **voice note**) — one message → one or several tasks/events, classified
  task-vs-event by clock time, filed under a **guessed category** (shown, correctable; learns
  your filing over ~2 corrections), `source='telegram'`. If an event is missing its time, Marty
  asks **once** and completes on your reply.
- **Questions** (read-only) — "what's on Thursday?", "what did I forget?", "am I free Friday
  afternoon?".
- **Edits** — "done report", "move the dentist to Friday", "rename …", "delete the 3pm",
  "that's Admin" (recategorise). Delete = **archive** (same `archive_batches` machinery as the
  app, so it shows in the Archive screen too). Numbered brief replies ("done 1") act here too.
- **Undo** — `undo` reverses the last action; `undo <name>` reverses one item.
- **Voice notes** are transcribed (Gemini audio) and routed through the *exact same* pipeline,
  with the transcript echoed back ("Heard: …") so a mis-hear is obvious and reversible.

**The morning brief + daytime nudge (Phase 6 + M8/M9).** The `brief` function is **private**
(jwt-verified — only trusted server code can fire it). It has two modes:
- **The 7am brief** — **pg_cron** runs a job at 05:00 **and** 06:00 UTC that uses **pg_net**
  (HTTP from the database) to call it, authenticating with the **service-role key in Supabase
  Vault** (read at run time, never in the cron SQL or repo). It proceeds only when the
  Europe/Amsterdam hour is 7 (DST-safe, exactly one/day). The brief **leads with the schedule**,
  footers due/overdue, keeps one "been waiting" nudge + one gap offer, and **numbers its items**
  so you can reply "done 1" / "move 2 to Friday" (M8). Also fires **on demand** when you text
  "brief".
- **The daytime nudge** (M9) — an hourly pg_cron job (working hours) calls the same function in
  nudge mode. It offers, calmly, ONE good use of a 60+ min free window (the most-overdue task, or
  one quick-win). **The guardrails are the feature:** 9am–6pm only, max 2/day (one morning, one
  afternoon), never back-to-back. "yes" time-blocks the task (undoable); "no" stays quiet.
  Also fires on demand when you text "nudge" — through the **same fully-guardrailed** path (no
  bypass exists; the M10 cleanup retired all `force`/`test` routes).

The brief/nudge are **read-only on the spine for reading** (active-only, `archived_at IS NULL`)
and only ever WRITE through Marty's undoable edit engine (a "yes" calendar block) — never a
parallel write.

## Hard constraints
- **Free tiers only.** If a choice needs paid hosting/DB, stop and flag it.
- **RLS (row-level security) ON** — the database refuses to hand out data
  that isn't the owner's.
- **Single user.** No multi-user features, no sharing, no roles.
- **Gemini free tier trains on inputs.** Fine for tasks/events. The moment the
  agent handles sensitive data (mood, health), switch that to cheap
  pay-as-you-go (~$1-4/mo, no training). See decisions doc.
