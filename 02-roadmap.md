# LifeOS — Roadmap

> I am "where we are." LIVING doc — update me at the end of every session.
> Status keys:  ✅ done   🔨 in progress   ⬜ not started

There are no dates. We work when there's time and will. We finish one phase
fully before starting the next. Each phase ends on a visible win.

---

## ✅ Phase 0 — Setup & the Project Brain
Goal: make the free accounts, get Claude Code running, put the brain docs
into the repo and the project knowledge.
**Done when:** the project has a memory and an empty app is live on the internet.
Tasks:
- ✅ Create accounts: GitHub, Supabase, Vercel, Telegram bot, Google AI Studio (Gemini)
- ✅ Install Claude Code, point it at a new repo
- ✅ Drop these brain docs into the repo; rename the rules file to CLAUDE.md
- ✅ First commit (first save point)
- ✅ Build minimal React+Vite app and deploy live on Vercel

## ✅ Phase 1 — The skeleton you can see
App shell deployed, login works, empty week-view calendar on desktop + a
stripped phone layout.
**Done when:** I open my app on my phone and log in.

## ✅ Phase 2 — Categories & Inbox
Create/edit buckets with colors and sub-levels; Inbox as the default.
**Done when:** my real life categories exist.

## ✅ Phase 3 — Tasks
Add, edit, complete, prioritize, time-bucket, subtasks, due dates.
**Done when:** I'm putting in real tasks and checking them off.
Core is done: add/edit/complete/prioritise/time-bucket, tasks reference categories,
and tasks are schedulable onto the calendar. Subtasks, the due-date picker, and the
Someday view were deferred and are being built now as Pieces 3c–3e — so the core is
✅ but those three trailing pieces are in progress before Phase 5.

## ✅ Phase 4 — Events & the week calendar
Add events; see events + scheduled tasks together; drag a task onto a slot.
Feels like Apple Calendar.
**Done when:** my week looks right and I'm living in it. — owner-verified.
Create/edit/move/resize events and scheduled tasks, day + week views, cross-day drag,
side-by-side overlap. This is where it's genuinely usable as a manual tool (before any AI).

## ⬜ Phase 5 — Telegram capture   ← NEXT (after the 3c–3e trailing pieces)
Connect the bot. Text "dentist Thursday 2pm" → Gemini reads it → it logs
correctly → replies telling me exactly what it did and where.
**Done when:** I add things by texting.

## ⬜ Phase 6 — The 7am brief + anti-staleness engine
Scheduler wakes the agent; Gemini writes a brief: day overview + stale-item
nudge + a suggestion to fill a gap.
**Done when:** it texts me every morning and it's actually useful.
**← This is the real V1 finish line.**

## ⬜ Phase 7 — The redesign (look & feel pass)
The full UX/UI pass once the data foundation and core flows are real. Bring every
screen up to the broadsheet identity in 06-design.md — layout, type, colour,
motion, the per-screen feeling — replacing the plain interim verify UIs. The
owner is art director here; this is where the design conversations that were
deferred actually happen.
**Done when:** the app looks and feels like the personal broadsheet, not a plain
prototype.

## ⬜ Phase 8 — Signals & polish
Turn on the activity log; smooth rough edges; make it nice to look at.
**Done when:** V1 done, foundations quietly logging for the future.

---

## ⬜ Later — Health pillar, then Life pillar
Each is its own cluster of phases that ADDS tables and screens and writes
tasks into the core. We do not touch the spine.

---

## Session notes (most recent on top)
- **2026-06-22 — Phase 3, Piece 3c done: due dates on tasks.** Added a due-date
  control to the shared task editor (so it's in the list AND the calendar editor) and
  a calm "Due <date>" / "Due today" dateline in the task rows. Overdue (past + not
  done) uses a new brick `--overdue` token — NOT the terracotta accent; "due today"
  isn't overdue; done tasks never show overdue. Display + edit only (no sort/filter,
  no reminders). Kept distinct from scheduled times (never a calendar block). UI only —
  NO schema/RLS change (writes the existing due_date column). Builds clean. **3d (Someday
  view) and 3e (subtasks) still to come before Phase 5 — phase markers unchanged.**
- **2026-06-22 — Roadmap corrected: Phase 4 verified DONE; Phase 3 marker fixed.** The
  owner verified the calendar — **Phase 4 → ✅**. **Phase 3** had been functionally done
  for several sessions but its marker was never flipped (still said "🔨 CURRENT" while
  Phase 4 was built on top); corrected to **✅** for the core. Three Phase-3 pieces that
  were never built — **subtasks, the due-date picker, and the Someday view** — are now
  being built as **Pieces 3c–3e** (in order: due-dates, Someday, subtasks) before
  starting **Phase 5 — Telegram capture**. UI only; the columns already exist (no schema
  change).
- **2026-06-22 — Phase 4, Piece 4h: resize & create on the week + task editor on the
  calendar. ← PHASE 4 READY TO MARK DONE (pending owner verification).** Edge-drag now
  resizes on the week (15-min snap, clamped); middle-grab still moves/crosses days —
  the two views finally match. Create on the week: tap an empty slot → new-event panel
  at that day/time; a "+ Add event" bar opens the same panel. Tapping a dotted task
  block now opens the task editor (title/notes/category/priority) on BOTH day and week
  — it stays a task; the Piece-2a fields were extracted into a shared `TaskEditForm`
  (used by the list row and a new `TaskPanel` overlay). Split the week's data/writes
  into `useWeekData` to keep WeekCalendar small. Reused the day's drag hook (allowResize)
  + EventPanel — not re-implementations. UI only — NO schema/RLS change. Builds clean.
  **This completes the calendar's core interactions (events + scheduled tasks; day +
  week; tap-edit / move / cross-day / resize / create). NOT marked done in the doc yet —
  owner to verify on the Mac, then confirm and I'll flip Phase 4 to ✅. NEXT after that:
  Phase 5 — Telegram capture.**
- **2026-06-22 — Phase 4, Piece 4g of several: edit & move on the week (incl. cross-day).**
  Made the week interactive: tap an event → the same edit panel as the day; drag to
  move within a day (15-min snap); and the new part — drag across day columns to
  change the date while keeping the time (horizontal snaps to whole columns).
  Scheduled tasks move too (write scheduled_*), staying tasks in their list.
  Tap-vs-drag preserved (~4px threshold); overlap re-splits on drop. Reused the
  day's drag hook by injecting a `geometry` object (day = X ignored; week = X →
  column) rather than a second hook — shared EventPanel/DayColumn/EventBlock/
  eventLayout. Cross-column live preview = ghost the original (keeps pointer grip)
  + a floating preview. UI only — NO schema/RLS change (writes only existing time
  columns). Phone still falls back to the day view. Builds clean. **Phase 4 is NOT
  done — NEXT: 4h resize + create on the week. Known: task-block tap is a no-op
  (edit in list); resize/create on week not yet.**
- **2026-06-22 — Phase 4, Piece 4f of several: the week view, made real (read-only).**
  The Calendar route now renders a real week (was the empty Phase-1 shell): seven
  Mon–Sun columns, week range in the header, hour rows, today marked with the
  now-line. Events render per day as blocks; scheduled tasks as dotted blocks;
  overlaps within a day split side by side. Reuses the day column's logic via a new
  shared `DayColumn` (day = interactive, week = read-only) + `eventLayout.js` +
  `EventBlock` + shared `buildDayItems`/`nowScrollTop` — no duplication. Current week
  only (no nav). Desktop zero-scroll (grid scrolls internally, opens around now/7am).
  Phone still falls back to the single-day view (not a squished week). UI only — NO
  schema/RLS change (read-only). Builds clean. **Phase 4 is NOT done — NEXT: 4g
  drag/edit on the week. Known gap: multi-day events show on start day only.**
- **2026-06-22 — Phase 4, Piece 4e of several: drag a task onto the grid to schedule
  it.** Drag a task from its list row (a quiet grip) onto "The Day" → it gets a time
  block (scheduled_start at drop, +1h, 15-min snap). A scheduled task STAYS a task —
  still in its Today/This Week list, still ticked there, type unchanged; the grid
  block is just a second view, drawn dashed (vs solid events) and reflecting
  completion. Move/resize reuses the 4d drag (writes scheduled_*); task + event
  blocks share one overlap layout (split side by side). Unschedule two ways: drag
  off the grid's right edge, or the block's ×. UI only — NO schema/RLS change
  (writes only scheduled_start/scheduled_end). New `useScheduleDrag` hook; extended
  `useEventDrag` to be kind-aware. Touch unchanged (no touch-drag). Builds clean.
  **Phase 4 is NOT done — NEXT: 4f make the week view real; 4g drag there.**
- **2026-06-22 — Phase 4, Piece 4d of several: drag to move / resize events on the
  day column.** Events can be dragged to move (duration fixed) or resized by their
  top/bottom edge, snapping to 15-min steps live with a calm preview; on release the
  new start/end save and the grid re-splits overlaps side by side. Taps are
  preserved via a ~4px tap-vs-drag threshold (plain tap still opens the edit panel;
  empty-slot tap still creates) — selection stays on the click, only a real drag
  swallows it. Resize clamps to a 15-min minimum so an event can't end before it
  starts (DB guard never reached). Auto-scrolls the column near its edges; page
  never scrolls. Touch starts no drag (phone keeps tap-to-edit/create as-is). Logic
  isolated in `useEventDrag.js`. UI only — NO schema/RLS change (writes only
  start_at/end_at). Builds clean. **Phase 4 is NOT done — NEXT: 4e drag-to-schedule
  tasks onto the grid; week view (4f/4g) still later.**
- **2026-06-22 — Phase 4, Piece 4c of several: add / edit / delete events on the
  timeline.** Made the day timeline editable: tap an empty slot → new event at that
  hour (1-hour default); a quiet "+ Add event" → same panel at the next hour; tap a
  block → edit title/notes/start/end/location/category; delete from the panel. The
  editor is a calm overlay over the day column (grid stays put — zero-scroll), reusing
  the task panel's field + chip styling so it's the same family. DB guards respected
  (backwards-time refused with a plain message; category-on-delete unchanged) — not
  re-implemented in the UI. Retired the 4a "Events (verify)" section in Settings
  (events are managed on the timeline now; `EventsVerify` deleted). UI only — NO
  schema/RLS change (writes to existing event columns). Builds clean. **Phase 4 is
  NOT done — next piece is likely drag-to-move/resize; time-blocked tasks still later.**
- **2026-06-22 — Phase 4, Piece 4b of several: the day-column timeline (read-only).**
  Replaced the "The Day" placeholder on the Today page with a real 24-hour day
  timeline for today: hour grid that scrolls internally and opens around now (~7am
  if outside working hours), the terracotta now-line, and today's events as blocks
  positioned by start/end with a category-coloured left rule + small-caps kicker.
  Only today's events show; uncategorised ones get a neutral rule (no Inbox tag).
  **Overlapping events split side-by-side** (owner's choice — decision recorded;
  pure logic in `eventLayout.js`). Read-only — no add/edit/drag (that's 4c), and
  time-blocked tasks deliberately not on the grid yet. UI only — NO schema/RLS
  change (events read-only). Phone stacks with the timeline in a ~60vh scroll area;
  not broken. Built from the owner's description (mock not in repo). Builds clean.
  **Phase 4 is NOT done — Piece 4c (adding/editing events on the timeline) is next.**
- **2026-06-22 — Phase 4, Piece 4a of several: the events spine table + bare-bones
  verify UI.** Created the `events` table in Supabase (`db/04_events.sql`) to its
  FULL architecture shape so the 4b timeline + future Apple-sync bolt on without a
  rebuild — RLS on, owner-only (same four policies as tasks); category link is
  set-null-on-delete (deleting a category empties its events' category, never
  deletes them — mirrors tasks); a DB CHECK (`end_at >= start_at`) blocks backwards
  events; `external_id` reserved (hidden) for Apple sync. Added a throwaway
  **Events (verify)** section inside **Settings** (below Categories): list with
  span + category dot+tag, add (title + start/end + optional category), delete.
  NO timeline/calendar built this piece (that's 4b). Reuses the paper/ink/Fraunces
  foundation + `CategoryTag`. Builds clean. **Owner still needs to run the SQL and
  verify on the Mac. Phase 4 is NOT done — Piece 4b (the day-column timeline) is
  next.**
- **2026-06-22 — The real Today home (Front Page): Today + This Week task blocks.**
  Built the approved two-column Today screen, replacing the temporary task view.
  Right side is real — a **Today** block (time_bucket = Today) and a **This Week**
  block (time_bucket = This Week), Fraunces headlines, hairline rows, dot+tag, the
  calm priority treatment, struck-through completed tasks. Each block has its own
  "+ Add a task" that lands in the right bucket; tap-to-edit and tick-to-complete
  carried over. The **display half of Piece 2b (the Today / This Week bucket views)
  now lives in the real home.** Left "The Day" column is a calm Phase-4 placeholder
  (events don't exist yet — decision recorded). Retired the standalone task view
  (`Tasks.jsx` deleted). UI only — NO schema/RLS change; built from the owner's
  description (mock not in repo). Desktop zero-scroll holds. Builds clean. **No
  phase marked done. NEXT: Phase 4 — events / the day-column timeline.**
- **2026-06-22 — Navigation skeleton brought forward (bones, not the redesign).**
  Built the app's broadsheet top frame + a three-destination nav — **Today /
  Calendar / Settings** (active item = terracotta underline) — replacing the
  temporary entry points (the Calendar/Categories switch + the separate Tasks
  link). Today renders the existing task view for now; Calendar is the empty
  shell; **Categories now lives under Settings** (with the signed-in email + Log
  out), and is no longer a top-level destination. UI/routing only — NO schema/RLS
  change. Built from the owner's description (the mock file wasn't in the repo) +
  06-design.md; decorative flourishes (edition line, colophon, Settings subtitle)
  are optional/droppable. Recorded as NOT a reversal of "data foundation before
  design" — the full per-screen redesign + Today layout stay in Phase 7. Builds
  clean. **No phase marked done. NEXT: the real Today home layout.**
- **2026-06-22 — Decision recorded: data foundation before design.** Build spine
  tables to their full shape first; keep interim verify UIs plain (not design-
  finalised) and save the look-and-feel work for a dedicated redesign phase. Added
  that phase as the new **Phase 7 — The redesign**, pushing the old "Signals &
  polish" to **Phase 8**. See the decisions doc for the full reasoning.
- **2026-06-22 — Phase 3, Piece 2a of several: editing a task (title, notes,
  category, priority).** First real task screen. Tap a task → an inline edit panel
  (reusing the Categories expand-on-tap pattern) to change title/notes, reassign
  category via selectable dot+tag chips (reusing `CategoryTag`, with an Inbox
  option), and set priority None/Low/Med/High. Inline save — text on blur, chips/
  priority on tap — all to columns that already existed (NO schema/RLS change;
  `db/` untouched). Priority shows in the list calmly via ink + weight, NOT colour
  (terracotta stays reserved for today/overdue): High = full-ink kicker + slightly
  bolder title, Med = muted kicker, Low/None = nothing. Owner to eye-check the
  priority treatment before it's locked in decisions. Split out `TaskRow.jsx` to
  keep files small. Builds clean. **Phase 3 is NOT done — Piece 2b (time-bucket
  views) is next.**
- **2026-06-22 — Phase 3, Piece 1 of several: the tasks spine table + bare-bones
  verify UI.** Created the `tasks` table in Supabase (`db/03_tasks.sql`) to its
  FULL architecture shape so later pieces bolt on without a rebuild — RLS on,
  owner-only; category link is SET-NULL-on-delete (deleting a category empties its
  tasks into Inbox, never deletes them); status/priority/time_bucket locked with
  DB CHECK constraints; a trigger keeps `completed_at` honest (set on done, cleared
  on reopen). Added a calm **Tasks** view (new masthead link): list + add-by-title
  (lands in Today) + optional category picker + tick-to-complete, reusing the
  paper/ink/Fraunces foundation and the dot+tag. UI deliberately touches only the
  basics; priority/buckets/due-date/subtasks/calendar/activity-log are NOT built
  (columns exist, UI doesn't). Builds clean. **Owner still needs to run the SQL and
  verify on the Mac. Phase 3 is NOT done — Piece 2 (the real task UI) is next.**
- **2026-06-22 — Phase 2 COMPLETE (Piece 3b: colour palette wired in).** Locked the
  16-colour palette (12 distinct + 4 shades) after eye-validation, removed the
  temporary preview tab, and wired colour into the Categories list: pick a colour
  from the curated set, each row shows the calm dot + uppercase tag (reusable
  `CategoryTag`, not yet on the calendar). Inbox defaults to Slate; new categories
  start uncoloured. No schema/RLS change — reused the existing `color` column.
  Palette recorded in the decisions doc and `06-design.md`. Phase 2's "done when"
  (my real-life categories exist) is met. **Next: Phase 3 — Tasks (now current).**
- **2026-06-22 — Phase 2, Piece 3a: the real category manager (rename/nest/delete,
  NO colour).** Turned the bare list into an indented tree with expand-on-tap
  actions: rename, move-inside (nesting), add sub-category, delete. Delete
  reparents children up one level; duplicate names blocked under the same parent;
  Inbox is undeletable/unrenamable/top-level; cycles + cross-owner nesting
  blocked — all enforced in the DB via a second SQL file (`db/02_categories_guards.sql`)
  plus the UI. Builds clean. **Owner still needs to run the new SQL and verify.
  Phase 2 is NOT done — Piece 3b (the 16-colour palette) is the last piece.**
- **2026-06-22 — Phase 2, Piece 2 of 3: categories data foundation + verify UI.**
  Created the `categories` table in Supabase (RLS on, owner-only; nullable
  `parent_id`/`color` for later; `sort_order`; Inbox seeded as a normal row).
  SQL saved at `db/01_categories.sql`. Added a plain Categories view (lists
  buckets incl. Inbox, add-by-name) reachable from a small Calendar/Categories
  switch in the masthead. No colours, nesting, edit or delete yet (Piece 3+).
  Builds clean. **Owner still needs to run the SQL in Supabase and verify on the
  Mac. Phase 2 is NOT done — Piece 3 (curated colour palette) is next.**
- **2026-06-22 — Phase 2, Piece 1 of 3: shared visual foundation built (not yet
  locked).** Loaded Fraunces + Inter (Google Fonts, two weights each), added a
  single theme file of CSS variables (warm paper/ink palette + terracotta
  accent `#C8643D`), built one masthead strip (nameplate, live clock with
  tabular figures, hairline rule, Log out moved in), and made login + calendar
  inherit the new type and colours. No categories, no Inbox, no palette, no
  tables — those are Pieces 2 & 3. Builds clean. **Showing the owner to tweak
  the fonts/colours before locking; Phase 2 is NOT done.**
- **2026-06-22 — Phase 1 DONE & verified. Phase 2 is now current.** Pushed the
  calendar commit to GitHub and added the two Supabase env vars
  (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in Vercel — that fixed the blank
  live site. Owner then logged in successfully on both Mac and iPhone against the
  live Vercel site and the empty week-view calendar shows on both. Phase 1's
  "done when" (open the app on my phone and log in) is met. Next up: Phase 2 —
  Categories & Inbox.
- **2026-06-22 — Phase 1, step 2: empty calendar shell built.** After login, the
  "you're logged in" placeholder is replaced by the calendar. Desktop shows an
  empty Apple-Calendar-style week grid (Mon–Sun, hour rows, today's column marked
  with a red date circle + a live red "now" line). Phone shows a clean single-day
  view instead of a squished grid. No data, no tables touched. Builds cleanly.
  STILL TO DO for Phase 1: deploy to Vercel and log in on the phone.
- **2026-06-21 — Phase 1, step 1: login built.** Supabase email magic-link login
  working and confirmed on the owner's Mac.
- **2026-06-21 — Phase 0 complete.** Created all five accounts (GitHub, Supabase,
  Vercel, Telegram bot, Gemini). Installed Claude Code. Created the `lifeos` repo,
  added and verified all seven brain docs, built a minimal React+Vite app (single
  page showing "LifeOS"), confirmed it builds cleanly, and deployed it live on
  Vercel. Repo is public at github.com/chrisolmosvv/lifeos.
