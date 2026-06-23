# LifeOS — Architecture

> I am the "how it's built." Stable doc — changes rarely.

## The stack (six free helpers)
| Piece | Job | Service | Cost |
|---|---|---|---|
| The app | What you see and tap; installs to phone + desktop (PWA) | React + Vite (plain CSS — see note), hosted on Vercel | Free |
| The brain | Stores data, handles login, runs the agent code | Supabase (Postgres + Auth + RLS + Edge Functions) | Free tier |
| The messenger | You ↔ agent chat | Telegram bot | Free |
| The intelligence | Reads the day, writes the brief in real words | Gemini API (Flash, free tier) | Free |
| The alarm | Wakes the agent at 7am | Supabase scheduler (pg_cron) | Free |
| The vault | Saves every version of the code | GitHub | Free |

Build tool: **Claude Code** on the owner's Claude Max plan.

> **Styling note (reality check):** Tailwind was named here originally but never
> installed. The app uses **plain CSS** — colours/fonts as variables in
> `src/theme.css` — organised since Phase 7 as a **small reusable component kit**
> in `src/kit/` (sealed, prefixed blocks: the masthead/folio, the day grid + tinted
> blocks, task rows, the status pill, the form + drill-in category picker, toast,
> etc.). See the decisions doc ("component kit, not Tailwind/plain-CSS-per-screen").

> **Front-end shape (Phase 7 rebuild).** The logged-in app is a single shell
> (`LoggedIn`) over four views switched by state — **Today** (the rebuilt home: a
> 7am–midnight workspace grid + "tasks today" / "next 7 days" modules), **Calendar**
> (still the Phase-6 week/day screen — its rebuild is pending), **All Tasks** (the
> by-category inventory), **Settings** (account + the category manager + Archive),
> plus the **Archive** screen. Today/All-Tasks share a Today-scoped form, grid hook
> and read path that are deliberately SEPARATE from Calendar's older shared
> `useWeekData`/`useEventDrag`/panels — duplication that converges when Calendar is
> rebuilt.

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
- **telegram_saves** (added Phase 5) — the Telegram bot's own bookkeeping log so it can
  "undo" the last thing IT saved. One row per bot-saved item: `item_table`
  ('tasks'|'events') + `item_id` (the saved row's id) + `title` + `user_id` +
  `created_at`. RLS owner-only (same as the spine). It does **not** change the meaning of
  categories/tasks/events — it only records pointers to rows the bot created, so undo can
  delete exactly that row by id and never touch a task/event made in the app. No foreign
  key to the core rows (a row deleted elsewhere just leaves a stale log entry that undo
  reports as "already gone"). This is the architecture's "modules add tables, protect the
  spine" pattern in practice.

## How the pieces connect (runtime)
You → the app → Supabase (read/write your data). Supabase's agent talks to
Telegram (two-way chat) and Gemini (writes the brief). GitHub just stores the
code (not part of the running flow).

**The morning brief (built Phase 6).** The brief is its own **private** edge
function (`brief`, jwt-verified — only trusted server code can fire it), separate
from the public Telegram webhook function. Two ways it runs:
- **On demand** — you text Marty "brief" (or "brief test"); the webhook function
  calls the private brief with the service-role key.
- **The 7am alarm** — **pg_cron** runs a job at 05:00 **and** 06:00 UTC that uses
  **pg_net** (HTTP from the database) to call the private brief, authenticating with
  the **service-role key stored in Supabase Vault** (read at run time, never in the
  cron SQL or the repo). The function proceeds only when the Europe/Amsterdam hour is
  7, so exactly one brief lands at 7am Amsterdam year-round (DST-safe). The scheduled
  run always sends — silence would mean the alarm itself broke.

The brief is **read-only on the spine**: it only reads tasks/events to summarise the
day; it never writes to tasks/events/categories. Its reads are **active-only**
(`archived_at IS NULL`, Phase 7 A3b) so archived items never surface in the brief.

## Hard constraints
- **Free tiers only.** If a choice needs paid hosting/DB, stop and flag it.
- **RLS (row-level security) ON** — the database refuses to hand out data
  that isn't the owner's.
- **Single user.** No multi-user features, no sharing, no roles.
- **Gemini free tier trains on inputs.** Fine for tasks/events. The moment the
  agent handles sensitive data (mood, health), switch that to cheap
  pay-as-you-go (~$1-4/mo, no training). See decisions doc.
