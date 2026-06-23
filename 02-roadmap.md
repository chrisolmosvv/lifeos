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

## ✅ Phase 3 — Tasks  (fully complete & verified)
Add, edit, complete, prioritize, time-bucket, subtasks, due dates.
**Done when:** I'm putting in real tasks and checking them off.
All done & verified: add/edit/complete/prioritise; the Today / This Week / Someday
buckets; tasks reference categories and are schedulable onto the calendar; due dates
(with the calm brick overdue treatment); and one-level subtasks (DB-guarded, parent
shows a count, parent-delete promotes children). Pieces 3c (due dates), 3d (Someday)
and 3e (subtasks) are all in — no trailing pieces remain.

## ✅ Phase 4 — Events & the week calendar  (owner-verified)
Add events; see events + scheduled tasks together; drag a task onto a slot.
Feels like Apple Calendar.
**Done when:** my week looks right and I'm living in it.
Create/edit/move/resize events and scheduled tasks, day + week views, cross-day drag,
side-by-side overlap. This is where it's genuinely usable as a manual tool (before any AI).

## ✅ Phase 5 — Telegram capture  (owner-verified)
Connect the bot. Text "dentist Thursday 2pm" → Gemini reads it → it logs
correctly → replies telling me exactly what it did and where.
**Done when:** I add things by texting. ✓ Met & verified on the owner's phone:
texting Marty reads the message, saves the right task/event in Inbox, confirms what
and where, "undo" removes the last bot-saved item, and a secured webhook + owner-gate
ignore everyone but the owner.
- ✅ **5a — the round trip (plumbing only).** First edge function (`telegram`),
  deployed `--no-verify-jwt`; webhook registered; replies "Got it: <text> — your
  Telegram chat ID is <id>". No AI, no DB. Owner-verified on phone.
- ✅ **5b — lock the bot to the owner's chat ID only.** Gate at the front of the
  function: only chat id 8864259574 (stored as the `OWNER_CHAT_ID` secret) gets a
  reply; everyone else gets silence + 200. Owner's echo unchanged. No AI, no DB.
- ✅ **5c — "Gemini reads it" (understanding only).** Marty sends the message +
  today's local date/time to Gemini (gemini-2.5-flash-lite, free tier), which returns
  structured fields (type/title/date/time/unsure); Marty replies with what he
  understood and "(Not saved yet.)". Rules baked in: Europe/Amsterdam, next-upcoming
  day, clock-time ⇒ event else task. NOTHING saved. Owner-gate still holds.
- ✅ **5d — "save it for real".** A confident read is written as a real row: EVENT
  (start=time, end=+1h) or TASK (stated date → due_date; bucket Today/This Week),
  uncategorised (Inbox), source='telegram'. Written server-side with the service-role
  key, user_id set to the owner so RLS owner-only stays intact; unsure reads save
  nothing. Verified all cases against the deployed function. Model → gemini-3.1-flash-
  lite (500/day) since the 2.5 flash tiers are only ~20/day.
- ✅ **5e — make it trustworthy (security + misses + undo).** (A) The function now
  rejects any call without the Telegram webhook secret (X-Telegram-Bot-Api-Secret-Token,
  fails closed) before anything else, with the owner-gate behind it. (B) Chit-chat /
  gibberish / unsure reads save nothing and get a kind reply. (C) "undo" removes the
  single most recent bot-saved item (via a new `telegram_saves` log table,
  db/06_telegram_saves.sql), deleting exactly that row by id, owner-only — never an
  app-made row. Owner-verified on phone.

## ✅ Phase 6 — The 7am brief + anti-staleness engine  (owner-verified — the V1 finish line)
Scheduler wakes the agent; Gemini writes a brief: day overview + stale-item
nudge + a suggestion to fill a gap.
**Done when:** it texts me every morning and it's actually useful. ✓ MET & verified:
the real 7am Amsterdam brief now lands on its own, a warm "quiet broadsheet" recap of
the day with at most one gentle "forgotten task" nudge and one reserved "fill a gap"
offer. **This is the V1 finish line — the proactive engagement layer is alive.**
- ✅ **6a — the empty pipe (Marty texts me unprompted, on demand).** New SEPARATE
  edge function `brief` (where all brief logic lives from the start, so the 7am alarm
  calls it directly later — never inside the telegram webhook). This piece it only
  sends one FIXED Telegram message. Deployed PRIVATE (jwt verification ON) so its URL
  refuses anonymous calls — only a service-role caller (telegram now, the alarm later)
  gets in. Texting Marty "brief" (a reserved trigger word) fires it, after the secret
  check + owner-gate, and skips the capture flow; every other message is unchanged.
  No AI, no data-reading, no schedule, no DB change. (Owner verifies on phone.)
- ✅ **6b — the brief reads my real day** (plain text, no AI). The fixed line is
  replaced by a robotic, rule-built summary of today read from my real data
  (READ-ONLY, owner-filtered): EVENTS TODAY (events + time-blocked tasks, earliest
  first, tasks marked "(task)"), TODAY-bucket tasks, DUE TODAY, OVERDUE — empty
  groups stated plainly, no dedupe across groups. "Today" = the Europe/Amsterdam day,
  via a new shared `_shared/datetime.ts` (same definition capture uses). No AI, no
  schedule, no DB change. (Owner verifies each line against the app.)
- ✅ **6c — Gemini writes the brief in real words** (voice, no schedule). The SAME
  verified 6b facts are handed to Gemini, which writes them as a short, warm-but-
  restrained morning message in the "quiet broadsheet" voice (sentence case, no hype,
  no emoji, ~2-4 sentences). Gemini only rewrites the supplied facts (invents/drops
  nothing; days-overdue precomputed so it never does date math). If Gemini fails for
  any reason it falls back to the plain 6b checklist — never silent. Reuses the
  existing GEMINI_API_KEY + gemini-3.1-flash-lite, temp 0. Read-only, no DB change.
  (Owner verifies the facts match each time.)
- ✅ **6d — the anti-staleness nudge** (the real point). The brief surfaces the ONE
  most-forgotten task, gently, at most one per brief. CODE picks it (deterministic):
  open task in 'This Week', created 3+ days ago (FORGOTTEN_DAYS), not already shown
  (not due-today/overdue/scheduled-today), oldest first; none → no nudge. Gemini only
  phrases it; it's in BOTH prose and the checklist fallback. "Untouched" = by
  created_at only (the tasks table has no updated_at — so moving buckets doesn't reset
  it; flagged). Temporary "brief test" trigger runs it at a 0-day threshold to verify
  now. Read-only, no schema/column change. (Owner verifies via "brief test".)
- ✅ **6e — the "fill a gap" suggestion** (reserved mode). When today has a real free
  stretch (≥2h inside 08:00–20:00, no events/scheduled tasks, earliest) AND a worth-
  doing task is waiting (forgotten → most overdue → due today → high-priority, else
  nothing), the brief offers ONE gentle "could be a good window for X". CODE finds the
  gap + picks the task; Gemini only phrases it. If that task is already mentioned, it's
  folded into one line — never named twice. In prose AND the checklist fallback.
  Read-only, no schema/column change. (Owner verifies by clearing an afternoon + a
  pressing task.)
- ✅ **6f — the 7am alarm + always-send safety net** (owner-verified: the real 7am brief
  landed on its own). pg_cron calls the private brief function (service-role key from
  Vault) at 05:00 AND 06:00 UTC; the function proceeds only in the 7am Amsterdam hour →
  DST-safe, exactly once/day, no manual switching. The scheduled run ALWAYS sends (a calm
  "quiet one" on an empty day; a "had trouble" line if building throws) — so a silent
  morning means the job broke. DB changes (scheduling infra only): enabled pg_cron +
  pg_net; a Vault secret `brief_service_role_key`; cron job `brief_daily_7am_ams`
  (0 5,6 * * *). The temporary `brief_test_every3min` proving job has been removed (only
  the real 7am job remains). No spine/src change.

## 🔨 Phase 7 — The redesign (look & feel pass)   ← IN PROGRESS
The full UX/UI pass once the data foundation and core flows are real. Bring every
screen up to the broadsheet identity in 06-design.md — layout, type, colour,
motion, the per-screen feeling — replacing the plain interim verify UIs. The
owner is art director here; this is where the design conversations that were
deferred actually happen. The agreed **behaviour reference** for the phase is the
new **`07-ux-flows.md`** (itself open to relitigation screen by screen).
**Reversal recorded (Piece 1):** Phase 7 is **no longer look-only** — it MAY make
schema/logic changes where the UX genuinely needs them, each surfaced first and
built as its own small, separately-verified piece, never folded into a styling
commit (see 03-decisions.md). Styling is built as a small reusable component kit
on the existing theme tokens.
**Done when:** the app looks and feels like the personal broadsheet, not a plain
prototype.
- ✅ **Piece 1 — open the redesign (paperwork, no code).** Clean pre-redesign save
  point committed; `07-ux-flows.md` added as the behaviour reference (open, not
  locked); the opening decisions locked in 03-decisions.md and mirrored into
  06-design.md (component-kit styling; schema/logic changes now allowed;
  Apple-tinted direction; masthead stays blackletter; paper → `#F6F5F1`; calendar
  category = soft tinted block; home model → "tasks today" + "next 7 days"). NO
  src/ or schema change.
- ✅ **Piece 1b — lock the Today (desktop) spec + the rebuild plan (paperwork, no
  code).** The desktop Today screen is locked in `07-ux-flows.md` §3 (workspace
  calendar, "tasks today" + "next 7 days", 3-level category tree with any-level
  filing, one-tap full-edit form, status pill, recurring events, undo toasts —
  mobile Today is a separate later spec). The decisions + the scope call (a
  front-end **rebuild** that preserves and reuses the data spine; additive-only
  schema, checker-flagged; conservative deletion) are in 03-decisions.md. NO src/
  or schema change.
- ✅ **Piece 1c — record the Today rebuild decision (paperwork, no code).** The
  owner's **explicit, eyes-open call**: Today is a **clean front-end rebuild of that
  one screen** (an escalation from the phase's default "re-skin, don't rewrite",
  taken because Today gained substantial new behaviour) — **not** a whole-app
  rewrite. Hard guardrails in 03-decisions.md: front-end only / data layer untouched;
  the **save point before T1 is sacred** (roll back, never dig — doom-loop rule
  applies hard); scoped to Today only (every later screen gets its own re-skin-vs-
  rebuild call); each T-piece keeps its own save point + owner verification on Mac
  and phone. NO src/ or schema change.

### Phase 7 — proposed Today build sequence (each its own small piece)
Each piece is **its own small commit**, with a **save point committed before it**,
and is **verified by the owner on Mac and phone before the next** starts. **Schema
pieces are flagged for the checker.** (This is the plan; pieces get their own
✅/🔨/⬜ as we go.) **The save point committed before T1 is the sacred rollback
point** — the working plain Phase 6 Today; if the rebuild goes wrong we roll back to
it rather than dig (see the Piece-1c decision).
- ✅ **T1 — Foundation: paper token + the reusable component kit (header part).**
  Paper cooled to `#F6F5F1` in `src/theme.css`; started the sealed kit in `src/kit/`
  with the five header blocks (Masthead = blackletter "LifeOS" wordmark, Topline,
  Folio = date · motto · live clock · edition, HairlineRule, SmallCapsLabel); loaded
  the `UnifrakturMaguntia` webfont (only new asset, no JS libs); renamed the old
  header to `EditionHeader` which composes the kit + the **unchanged** nav; applied
  across all three screens (one shared header). LOOK ONLY — nothing below the header
  or in the data layer touched; build passes. Sacred rollback point: commit
  `ac665cb`. *(The calendar-block / task-row / status-pill / motion kit blocks come
  with their screens in later T-pieces, not here.)* **Owner verifies on Mac + phone.**
- ✅ **T2 — Data-layer readiness audit (READ-ONLY; nothing changed).** Live Frankfurt
  DB checked via anon PostgREST probes (the management token is denied on Frankfurt —
  see handoff). Result: **all four needed form fields already exist live** —
  `tasks.notes`, `tasks.priority`, `events.location`, `events.notes` — and every
  depended-on field is present and correctly shaped, so **NO additive migration is
  needed** (the planned apply step is unnecessary). One LOUD flag for later: the live
  `status` column allows only `open`/`done` (2 states) per its migration, which won't
  cover the Today pill's three states — a small additive change to confirm + make at
  **T7**, not now. No save point (no change).
- 🔨 **T3 — Category hierarchy** *(large; sub-splitting)*. Tree storage, any-level
  filing, colour shading, the drill-in picker, and Settings management.
  - ✅ **T3 (schema) — 3-level depth cap.** Additive: a new `categories_enforce_depth`
    trigger (max depth 3), `db/07_categories_depth.sql`, applied + verified live on
    Frankfurt. `parent_id`/`sort_order`/`color` already existed from Phase 2 (not
    re-added); existing rows + task/event links untouched; depth guard accepts 3 /
    rejects 4 (proven, rolled back, no test rows). Save point `3201ae0`. Flagged: the
    `parent_id` FK is `ON DELETE CASCADE` + a re-parent-up trigger (not `RESTRICT`) —
    left as-is, deletion UX deferred.
  - ❌ **T3b — seed the owner's real 5-top tree — DROPPED (2026-06-23, Piece D1).** No
    seeded tree; the start state is just Inbox and the owner builds categories in-app over
    time. (Kept here struck, not deleted, so the history is visible.) Also settled: **no
    fixed count** at any level — add/nest/delete freely; the only rule is the **depth-3
    cap** (already enforced, T3). See 03-decisions.md (Piece D1).
  - ✅ The drill-in picker (Today, read-only) — *done as part of T6* (`CategoryPicker`:
    search + breadcrumb + chevrons, picks any level, reads the tree only). Still OPEN and
    NOT assumed: the **colour-branch model** and **parent-delete behaviour** (03-decisions.md,
    Piece D1), decided with the Settings category manager (T13 backlog).
- ✅ **T4 — Today display build (read-only first) — "Rebuild R1".** Rebuilt Today's
  body to the B layout with REAL data, read-only: left "The Day" = a 7am–midnight
  `DayGrid` (today's events + scheduled tasks as soft **tinted blocks**, overlaps
  split, now-line, scrolls internally); right = "tasks today" over "the next 7 days"
  (new content model in `todayModel.js`) + a disabled "All tasks · N" box. New sealed
  kit blocks: `DayGrid`, `TintedBlock`, `TodayTaskRow`, `ModuleHeader` (+ `todayKit.css`).
  Edit preserved by reusing the existing `TaskPanel`/`EventPanel` on tap. NO create/
  drag/+add/status-pill/day-flip (later pieces). Front-end only, no schema, no writes
  beyond the preserved edit; no shared/Calendar/Settings/header file touched. Save
  point `ec115bf`. Known interim gaps (return in later pieces): done-tick + task-delete
  + add + drag-to-schedule + the Someday drawer. **Owner verifies on Mac + phone.**
- ✅ **T5 — Calendar workspace interactions (Today's grid).** Click/drag-to-create
  (opens the T6 form, event default + task toggle), drag-move, edge-resize, 15-min snap,
  live overlap re-split, drag a task from a module onto the grid to schedule, drag a task
  block off onto "tasks today" (→ today, no time) or "next 7 days" (→ +7, no time); events
  snap back if dragged off. Built as a **Today-scoped hook `useTodayGrid`** (a sealed twin
  of the shared `useEventDrag`/`useScheduleDrag`, which were NOT touched — Calendar
  unchanged); reuses the shared `eventLayout` overlap maths read-only. Min block 15 min;
  tap-vs-drag 4px; done blocks tap-only; mouse-only (touch keeps tapping/scrolling). All
  writes via existing task/event update+insert paths; no schema. Save point `ffdf62d`.
- ✅ **T6 — The create/edit form (+ "+ add", delete/undo, the drill-in picker).** A
  new Today-scoped sealed form (`TodayForm`) opens on one tap of a task row or a grid
  block — create + edit, task + event (Title/Category/Status/Day-Time/Priority/Notes/
  Delete for tasks; Title/Category/Start-End/Location/Notes/Delete for events; Repeat
  omitted till the recurrence piece). "+ add" creates a task into today. **Delete shows
  a "Deleted · Undo" toast** (re-inserts the exact row). A **drill-in `CategoryPicker`**
  (search + breadcrumb + chevrons; reads the tree only) picks any level; Inbox = null.
  All writes go through the EXISTING Supabase task/event paths; no schema, no category
  writes. **SEPARATE from the shared TaskPanel/EventPanel (Calendar still uses those,
  unchanged)** — intentional temporary duplication. Save point `7de0a94`.
  - **Scope note:** this piece absorbed **T9 (delete + undo toast)** and the **T3
    drill-in picker** sub-item (both folded in per the T6 instruction) — see those lines,
    marked done-as-part-of-T6 (not silently renumbered).
- ✅ **T7 — Status pill behaviour + restore "done".** Additive schema: `tasks.status`
  widened `('open','done')` → `('open','in_progress','done')` (`db/08_status_in_progress.sql`,
  applied + verified live on Frankfurt; default `'open'` and existing rows intact; proof
  rolled back, no test rows). Front-end (Today only): a sealed `StatusPill` kit block on each
  "tasks today" row — **To do · In progress · Done**, tap a segment to set state via the
  existing update path; Done greys+strikes and stays till midnight (completed-today), tapping
  Done again undoes. `todayModel` now treats `in_progress` as active and rolls done off at
  midnight. No Calendar/Settings/shared-hook change. Save point `310f9db`.
- ✅ **T8 — Date navigation (day-flipping).** A `viewed` day (defaults to today); prev/next
  arrows re-anchor the WHOLE page — the grid + both modules load the viewed day, the tasks
  module title shows the weekday (not "today") away from today, the now-line shows only on
  the real today, and a quiet "Back to today" appears when away. Content rule away from today
  = due/scheduled on the viewed day (the Today-bucket is today-only). ALL day-dependent writes
  (create, schedule, drag-off-to-module, "+ add") are re-keyed from today → the viewed day
  (bucket = 'Today' only when viewed IS today, else 'This Week'), fixing the classic "writes
  today's date while viewing another day" bug. Today's OWN read is parameterised by the viewed
  day; Calendar's `useWeekData` is untouched. The shared masthead folio is intentionally left
  as the real-today edition (it's shared) — the viewed day shows in Today's own daybar. No
  schema. Save point `b9a5810`. *(Today's core behaviour T4–T8 + T6/T7/T9 is now complete.)*
- ✅ **T9 — Delete + undo toast** — *done as part of T6* (the `Toast` kit block: delete a
  task/event → "Deleted · Undo" → Undo re-inserts the exact row). The repeating-event
  "this one or all?" branch stays with the recurrence piece.
- ⬜ **T10 — Recurring events** *(large)*. Recurrence + "this one or all?".
- ✅ **T11 — All Tasks inventory screen (desktop-first).** A new view: the backlog browsed
  by-category drill-in (Inbox first, then top categories; tap to drill, breadcrumb to climb;
  inside = own tasks then sub-categories). Whole-sub-tree active counts; due-soonest order
  with undated at the bottom; **"show done"** toggle (counts exclude done); **"+ add"** into
  the viewed category (Inbox at top). **Reuses Today's `TodayTaskRow` + status pill + `TodayForm`
  + `Toast` AS-IS** (no edits to them); new sealed `CategoryDrillRow` + `allTasksModel`. Wired
  additively: Today's "All tasks · N" box (N = active top-level tasks) opens it, back returns
  to Today; `LoggedIn` gained an `alltasks` view. Writes via existing task paths; no schema, no
  category-table writes; spec recorded in 07-ux-flows.md. Save point `ed0362a`.
- ⬜ **T12 — Conservative trims** of any now-unused Phase 6 Today code (separate
  commits, provably unused, verified).
- ✅ **T13 — Category management (Settings).** A real category manager in the current Settings
  screen (functionality; broadsheet polish waits for the Settings re-skin): expanding tree
  (Inbox first), inline rename + recolour, "+ child" / "+ add top-level", drag-grip reorder
  within a level (`sort_order`), depth-3 cap in UI + DB, and a safe-interim delete (confirm;
  blocked if the category has any tasks or sub-categories). **Resolved the colour-branch OPEN
  question → shade-with-override:** no `color` = a derived lighter shade of the parent (computed
  at render, never written), a set `color` pins it (`colorModel.js`). **Parent-delete OPEN
  question resolved for now → block (app-layer guard); no FK/trigger change** (Archive is a
  separate later feature). New sealed `CategoryManager` + `CategoryManagerRow` + `colorModel`;
  Settings swapped from the old `Categories`. NO schema change (`color` null=derived works). NO
  Today/All-Tasks/Calendar change. Save point `035bd49`. (Derived colours show in the manager
  only; wiring them into Today/All Tasks/the picker is a deliberate later change.)

### Phase 7 — DEPLOY + VERIFY STATE (updated 2026-06-23)
✅ **FULL STACK DEPLOYED (A3b deploy, 2026-06-23):** `origin/main` = `fa3bfc2`; Vercel Production
● Ready at `lifeos-mlux5hf72-…`; the **brief edge function is v7** (with the A3b filter). Now live:
the Today/All-Tasks rebuild **plus** T13 category manager + the whole Archive feature (A1–A4) + the
A3b brief filter. Prod env → **Frankfurt**. **Rollback:** FE = re-promote `lifeos-dezpmsxje-…`
(ref `df65a20`); BE = redeploy brief from the pre-A3b `sb.ts` (→ v8). DB stays as-is (all additive).
The earlier owner-approved deploy `df65a20` (Today + All Tasks) is the FE rollback target.
✅ **DEPLOYED (DV1):** `origin/main` was `df65a20`; Vercel Production ● Ready, serving the rebuild
(Today + All Tasks); production env → **Frankfurt**. (Superseded by the A3b full-stack deploy above.)
✅ **OWNER-VERIFIED & APPROVED (Mac + phone):** the owner tested the live deploy and approved it —
**T1, T4, T5, T6, T7, T8, T9, T11 are owner-verified** (drag on Mac mouse; phone = non-drag, by
design), and **Calendar + Settings confirmed unchanged (no regression).** The Today + All Tasks
rebuild is **done, live, and accepted.** (Supersedes the earlier "owner verification pending"
note.) Still OPEN/future (not part of this approval): colour-branch model, parent-delete, masthead
flip, subtasks in the new UI, and the rest of the Phase-7 backlog below.

### Phase 7 — remaining backlog (after Today + All Tasks; order is a guide, owner sets it)
- ⬜ **Deploy Phase 7** — push `main` so Today + All Tasks reach the live site / phone, then
  the owner verifies on Mac **and** phone (the first real phone check of the rebuild).
- ⬜ **Calendar screen** — its own **re-skin-vs-rebuild** decision (pending, owner's call); on
  rebuild, the intentional duplication converges (`TodayForm` ↔ panels; `useTodayGrid` ↔ shared
  drag hooks).
- ⬜ **Settings screen** — bring it up to the broadsheet look (incl. account + the entry to T13).
- ⬜ **T13 — Settings category manager** (above) — gated by the two OPEN questions.
- ⬜ **T10 — Recurring events** *(large)* — recurrence + "this one or all?".
- ⬜ **Mobile Today** — its own spec (desktop Today is what's built).
- ⬜ **Mobile All Tasks** — its own pass (desktop-first only so far).
- ⬜ **T12 — Conservative trims** (above) — provably-unused old Today files + parked Phase-6
  audit items (the "brief test" trigger word; the 6b timezone duplication).
- ✅ **Subtasks in the new UI (Phase 7 SUB).** Mini-tasks, one level (DB-enforced): a parent
  form has a Subtasks section (inline title/due/3-state status/delete, "+ add subtask",
  done/total); parent rows on Today + All Tasks show "x/N" and expand; a subtask due/scheduled
  today is its own "↳ under [Parent]" row in tasks-today (and a parent-tinted "↳" block on the
  grid); All Tasks nests subtasks under the parent (counts still exclude subtasks); tapping a
  subtask opens a form variant (no category — inherits parent's — no nested subtasks). Reused
  TodayTaskRow/StatusPill/TodayForm (additive props, normal-task behaviour unchanged). Archive
  cascade (A2) intact. No schema; old Calendar/useWeekData untouched (a scheduled subtask shows
  there as a plain block — interim). Save point `c3a4411`.
- 🔨 **Archive — universal soft-delete** (delete = archive; restore by batch; manual delete-now;
  Archive screen grouped by delete action — spec in 07-ux-flows.md). Front-end feature COMPLETE
  (A1–A4); only the backend brief filter (A3b) remains.
  - ✅ **A1 — schema foundation (additive; live on Frankfurt).** New `archive_batches` table
    (owner-only RLS) + nullable `archived_at` + `archive_batch_id` (FK→batches ON DELETE SET NULL)
    on tasks/events/categories (`db/09_archive.sql`). No behaviour change; every row active. Proven
    live (cols/table/RLS present, depth trigger still fires, rolled back). Save point `b3a84c1`.
  - ✅ **A2 — delete→archive write path.** All deletes now ARCHIVE (set `archived_at` + a batch)
    via a sealed `src/archive.js` helper: task (+ its subtasks in one batch) and event delete →
    "Archived · Undo" toast (undo reverses the batch); **category delete → a confirm stating the
    branch counts, then archives the whole branch (category + descendants + their tasks/events)
    as ONE batch** — this **replaces T13's interim block**; Inbox still never archivable. Atomic-
    ish: on any partial failure the batch is compensated (fully un-archived + removed). **No read
    filter (A3), no Archive screen (A4), no schema, no shared read hook.** ⚠️ HALF-STATE: archived
    items STILL SHOW until A3. Save point `99b0f12`.
  - ✅ **A3 — active-only read filter.** A single shared `activeOnly(query)` helper
    (`= q.is('archived_at', null)`, in `src/archive.js`) applied to EVERY rendered read of
    tasks/events/categories: Today's 3 reads, All Tasks' 2 (so the subtree counts + "All
    tasks · N" box exclude archived), CategoryManager's categories read, and **Calendar's
    shared `useWeekData`** (events + tasks + categories — the first sanctioned edit to that
    hook, filter-only). Archived items now disappear; Undo (toast) brings them back. No
    write/schema/behaviour change beyond hiding archived. Save point `7dfffb6`. **A2+A3 are
    the deploy-ready pair.**
  - ✅ **A3b — backend brief filter.** Added `&archived_at=is.null` centrally in the brief's
    `owner()` helper (`supabase/functions/brief/sb.ts`), covering all 11 reads (day.ts + gap.ts);
    archived items can't surface in the 7am brief or its gap-fill. Deployed (brief function v7).
  - ✅ **A4 — the Archive screen.** New view reached from Settings ("Archive →"; back returns):
    lists every batch newest-first (label · type · per-table count · when), **Restore** (reuses
    `unarchiveBatch`; a hard-deleted category leaves restored items as Inbox automatically via the
    FK ON DELETE SET NULL), and **Delete now** behind an explicit naming confirm. Delete-now is
    scoped strictly to `archive_batch_id == batch AND archived_at IS NOT NULL` (proven live: never
    touches active rows or other batches), tables-then-batch, partial-failure surfaced not hidden.
    Additive routing only; no A2/A3/shared-hook/schema change. Save point `781c908`.

## ⬜ Phase 8 — Signals & polish
Turn on the activity log; smooth rough edges; make it nice to look at.
**Done when:** V1 done, foundations quietly logging for the future.

---

## ⬜ Later — Health pillar, then Life pillar
Each is its own cluster of phases that ADDS tables and screens and writes
tasks into the core. We do not touch the spine.

---

## Session notes (most recent on top)
- **2026-06-23 — Phase 7, SUB DONE — subtasks (mini-tasks, one level) surfaced on Today / All Tasks
  / the form.** A subtask = a tasks row with `parent_task_id` (one level, DB-enforced); it has its
  own due/schedule/status but **inherits the parent's category** for display. Built: a **Subtasks
  section** in the parent's form (inline title/due/3-state/delete, "+ add subtask", done/total);
  **"x/N" + expand** on parent rows (Today + All Tasks); a subtask **due/scheduled today → its own
  "↳ under [Parent]" row** in tasks-today + a **parent-tinted "↳" block** on the grid; **All Tasks
  nests** subtasks under the parent (the box + subtree **counts still exclude subtasks**); a
  **subtask edit variant** (no category, no nested subtasks, "↳ under [Parent]"). Reused
  TodayTaskRow/StatusPill/TodayForm via **additive props** — normal-task behaviour unchanged.
  Archive cascade (A2) intact (archive a parent → subtasks go too; archive one subtask → x/N
  recomputes). **No schema**; **old Calendar + useWeekData untouched** (a scheduled subtask shows
  there as a plain block — interim, until the Calendar rebuild). New `subtasks.js` + `SubtaskList`
  kit. Save point `c3a4411`. Committed locally — not deployed. **NEXT: deploy SUB for owner verify;
  then Calendar (re-skin-vs-rebuild), Settings re-skin, mobile, T12.**
- **2026-06-23 — Phase 7, Archive A3b + FULL DEPLOY — the brief archive filter, then the FIRST full
  Phase-7 production deploy (both surfaces).** A3b: added `&archived_at=is.null` centrally in the
  brief's `owner()` helper (`brief/sb.ts`), so archived items can't appear in the 7am brief/gap-fill
  (all 11 reads covered). Then published the accumulated stack: **front-end pushed** (`origin/main =
  fa3bfc2`, Vercel Production ● Ready at `lifeos-mlux5hf72-…`) and the **brief edge function deployed
  to Frankfurt (now v7)** — held the backend until the FE build succeeded (no half-publish). Now LIVE
  on top of the already-approved Today/All-Tasks rebuild: **T13 category manager + the entire Archive
  feature (A1–A4) + the A3b brief filter.** Prod env confirmed → Frankfurt. Rollback levers recorded
  (FE re-promote `df65a20`; BE redeploy pre-A3b brief). Claude Code can't verify behind login — the
  owner's full-stack checklist is in the A3b handoff entry. **NEXT: owner verifies the live stack on
  Mac + phone (Archive delete-now scope = top checker priority), then Calendar (re-skin-vs-rebuild),
  Settings re-skin, mobile, T12.**
- **2026-06-23 — Phase 7, Archive A4 DONE — the Archive screen (front-end Archive feature now
  COMPLETE).** A new screen reached from **Settings → "Archive →"** (back returns): archived items
  grouped by delete action (batch), newest first, each showing the label · source type · per-table
  count · how long ago. **Restore** reuses the A2 `unarchiveBatch` (no parallel restore) — and a
  task/event whose category was meanwhile hard-deleted comes back as **Inbox automatically** (the
  `category_id` FK is ON DELETE SET NULL, so it's already null — no orphan, no code). **Delete now**
  is the one irreversible action: behind an explicit naming confirm, scoped strictly to
  `archive_batch_id = batch AND archived_at IS NOT NULL` so it can never hit an active row or
  another batch (proven live in a rolled-back transaction: active row untouched, scope exact, FK
  fallback nulls the category); partial multi-table failure is surfaced ("some deleted, rest remain
  — try again"), never a silent half-state. New sealed `ArchiveScreen` + `ArchiveBatchRow` + helpers
  `listArchiveBatches`/`hardDeleteBatch` in `archive.js`. Additive routing (LoggedIn `archive` view,
  Settings entry) only — **no A2 write, no A3 read filter, no shared hook, no schema change.** Save
  point `781c908`. Committed locally — not deployed. **The whole Archive loop (delete→archive→
  hide→restore / delete-now) is done.** Remaining: **A3b** (backend brief archived filter). **NEXT:
  deploy the Archive feature (A2+A3+A4) for owner verify; A3b; then Calendar / mobile / T12.**
- **2026-06-23 — Phase 7, Archive A3 DONE — active-only read filter (the disappear behaviour;
  A2+A3 are now deploy-ready together).** Added a single shared `activeOnly(query)` helper
  (`q.is('archived_at', null)`, in `src/archive.js`) to EVERY rendered read of tasks/events/
  categories: Today (3 reads), All Tasks (2 → its subtree counts + the "All tasks · N" box now
  exclude archived), the Settings category manager (categories), and **Calendar's shared
  `useWeekData`** (events/tasks/categories — the first sanctioned edit to that protected hook,
  filter-ONLY; Calendar otherwise identical). So archive now works end-to-end: delete → vanishes
  → Undo (toast) → returns; a category delete hides its whole branch everywhere; counts drop;
  archived categories leave the picker + manager. No write/schema/behaviour change beyond hiding
  archived. **Flagged A3b:** the 7am brief edge function still reads tasks/events archived-unaware
  (backend, separate deploy) — needs `&archived_at=is.null`; NOT touched here. Dead/unrendered
  reads (old `Categories.jsx`, DayTimeline/TaskBlock/TaskRow/SomedayDrawer) left for T12; DayAgenda
  has no DB read. Save point `7dfffb6`. Committed locally — not deployed. **NEXT: A4 — the Archive
  screen (browse by batch, Restore, Delete-now); and A3b (brief filter). With A2+A3 done, the
  archive loop is ready to deploy when you want.**
- **2026-06-23 — Phase 7, Archive A2 DONE — deletes now ARCHIVE (write path). DELIBERATE
  HALF-STATE.** Every delete is now a soft-delete: a sealed `src/archive.js` helper stamps
  `archived_at` + a shared `archive_batch_id` (one batch per delete action) via the existing
  Supabase write paths. Task delete archives the task **+ its subtasks** in one batch; event
  delete likewise; both show **"Archived · Undo"** (undo reverses the whole batch + deletes the
  batch row). **Category delete now archives the WHOLE branch** (category + descendants + their
  tasks/events) as one batch behind a confirm that states the counts — **this replaces T13's
  interim "blocked" delete**; Inbox stays unarchivable. Atomic-ish: any partial failure
  compensates (un-archives + removes the batch), so no half-written batch is left. **⚠️ By
  design, archived items STILL SHOW on Today/All-Tasks/Calendar/Settings — A3 (the active-only
  read filter) is required next before this feels right.** NO read filter, NO Archive screen, NO
  schema, NO shared read hook touched. Save point `99b0f12`. Committed locally — not deployed.
  **NEXT: A3 — add `archived_at IS NULL` to every screen's reads (the disappear behaviour), then
  the Archive screen (restore / delete-now).**
- **2026-06-23 — Phase 7, Archive A1 DONE — soft-delete + batch SCHEMA foundation (DB only).** Added
  (additive, live on Frankfurt) a new `archive_batches` table (owner-only RLS matching the spine
  pattern) and nullable `archived_at` + `archive_batch_id` (FK→batches ON DELETE SET NULL) on
  tasks/events/categories — `db/09_archive.sql`. **No app code, no behaviour change** (nothing
  filters on `archived_at` yet — that's A3; the delete→archive write is A2): every row is active,
  so the app is exactly as before. Proven live: columns + table + RLS present, existing
  rows/triggers/FKs untouched, the depth trigger still fires, transaction rolled back with no test
  rows. (Honest: events read 5→6 between the baseline and after-read — that's live owner usage, not
  the migration.) Save point `b3a84c1`. **The DB changed; the app code did not** — repo commits are
  local. Archive will replace T13's interim "blocked delete" once A2 lands. **NEXT: A2 — the
  delete→archive write path (+ category-branch batching), then A3 — the active-only read filter,
  then the Archive screen.**
- **2026-06-23 — Phase 7, T13 DONE — the Settings category manager (build, not yet deployed).**
  Built into the current Settings screen (styling polish waits for the Settings re-skin): an
  expanding category tree (Inbox first) with **inline rename + recolour**, **"+ child" / "+ add
  top-level"**, **drag-grip reorder within a level**, the **depth-3 cap** in the UI (+ the DB
  trigger), and a **safe-interim delete** (confirm; blocked if it has any tasks or
  sub-categories — Archive is separate/later). This **resolves the two OPEN category questions**:
  the **colour-branch model = shade-with-override** (no colour → a derived lighter shade of the
  parent, computed at render, never written; set colour pins it — `colorModel.js`), and
  **parent-delete = block via app-layer guard** (no FK/trigger change). All category writes via
  the existing Supabase paths; tasks read only for the delete guard. **No schema change**
  (`color` null=derived). **No Today/All-Tasks/Calendar change** (derived colours show in the
  manager only for now — wiring them into those screens is a deliberate later change). Save
  point `035bd49`. Committed locally only — **not pushed/deployed** (the live site still has the
  approved earlier deploy `df65a20`). **NEXT: deploy T13 (+ the local docs commits) for owner
  verify, then the Calendar re-skin-vs-rebuild decision, T10 recurring events, mobile, T12.**
- **2026-06-23 — Phase 7 — Today + All Tasks rebuild OWNER-VERIFIED & APPROVED.** The owner tested
  the live production deploy (`df65a20`, Frankfurt) on **Mac and phone** and approved it. T1 / T4 /
  T5 / T6 / T7 / T8 / T9 / T11 are now **owner-verified** (drag is Mac-mouse only by design); auth
  works and **Calendar + Settings have no regression**. The desktop Today rebuild and the All Tasks
  inventory screen are **done, live, and accepted** — the first Phase-7 work the owner has on the
  phone. NO code/schema change in this update (docs only). **NEXT: the remaining Phase-7 backlog —
  the Calendar re-skin-vs-rebuild decision, then Settings, T13 category manager, T10 recurring
  events, mobile Today, mobile All Tasks, and the T12 trims; plus the open colour-branch /
  parent-delete / masthead-flip questions when their pieces come up.**
- **2026-06-23 — Phase 7, Piece D2 (docs only) — brain-doc sync + verification stock-take.** Made
  the docs match reality. **Headline truth: nothing in Phase 7 is pushed/deployed** (local main
  22 ahead of origin; live site still Phase-6 front-end), **but the T3/T7 schema is live on the
  Frankfurt DB** — so the DB is ahead of the deployed front-end (harmless superset). **No Phase-7
  piece has a logged owner-verification or checker review** (only Phases 4/5/6 do); T1/T4 recorded
  as Mac-verified per the owner's D2 statement, the rest UNKNOWN/not-yet, phone-verify blocked
  until deploy. Recorded the **masthead-vs-daybar** decision (+ masthead-flip OPEN) in
  03-decisions.md; reaffirmed the colour-branch + parent-delete OPEN questions (already in D1).
  Added a **DEPLOY STATE** note + a **remaining Phase-7 backlog** (deploy → Calendar decision →
  Settings → T13 → T10 → mobile Today → mobile All Tasks → T12 → subtasks) and the carried-forward
  gaps. **Did NOT** re-add the All Tasks spec (already in 07-ux-flows.md from T11) or duplicate the
  D1 open questions. Docs only. **NEXT (owner's call): push/deploy Phase 7 for a real Mac+phone
  verify, then the Calendar re-skin-vs-rebuild decision; or T10/T13.**
- **2026-06-23 — Phase 7, T11 DONE — the All Tasks inventory screen.** A new view that browses
  the whole backlog **by category**: top level lists Inbox first then top categories (each with
  a whole-sub-tree active count); drill in (breadcrumb to climb) to see a category's own tasks
  then its sub-categories. Task rows are **Today's row + 3-state pill** reused as-is (tap opens
  the **reused TodayForm**); ordered due-soonest with undated at the bottom; a **"show done"**
  toggle reveals done (greyed; counts always exclude done); **"+ add"** files into the viewed
  category (Inbox at the top). Wired **additively**: Today's "All tasks · N" box (N = active
  top-level tasks) now opens it, with back to Today; `LoggedIn` gained an `alltasks` view. NEW
  sealed `CategoryDrillRow` + pure `allTasksModel` (subtree counts via a read-only parent_id
  walk). **Reused AS-IS without edits:** `TodayTaskRow`, `StatusPill` (via the row), `TodayForm`,
  `Toast`. No Calendar/Settings/header/shared-hook change; no schema; no category-table writes;
  all task writes via existing paths. Spec recorded in 07-ux-flows.md. Save point `ed0362a`.
  Committed locally only — not pushed/deployed. **NEXT: T10 — recurring events (large), T13 —
  Settings category manager, or T12 — conservative trims of now-unused old Today code.**
- **2026-06-23 — Phase 7, T8 DONE — Today's date arrows / day-flipping (Today's behaviour is
  now complete).** A `viewed` day (defaults to the real today) drives the whole page; the
  prev/next arrows step it and a quiet "Back to today" appears when away. Flipping re-anchors
  the grid, "tasks today" (titled by weekday off-today), and "next 7 days" (viewed+1..+7); the
  now-line shows only on the real today. Away from today, the tasks rule = due/scheduled on the
  viewed day (the Today-bucket is a today-only notion). Crucially, every day-dependent WRITE was
  re-keyed today → viewed (create, schedule, drag-off-to-modules, "+ add"), with bucket 'Today'
  only when the viewed day IS today (else 'This Week') — so it never writes today's date while
  viewing another day. Today reads via its OWN parameterised load (Calendar's `useWeekData`
  untouched). The shared masthead folio was left as the real-today edition (it's shared across
  screens — changing it would break the scope rule); the viewed day shows in Today's own daybar
  instead (flag for the owner: if you want the masthead itself to flip, that's a small shared-
  header piece later). No schema, no category writes, no Calendar/Settings change. Save point
  `b9a5810`. Committed locally only — not pushed/deployed. **NEXT: T11 — the All Tasks inventory
  screen (its own spec first), or T13 — the Settings category manager.**
- **2026-06-23 — Phase 7, T5 DONE — Today's day grid is now a workspace (highest-risk
  interaction piece).** You can click an empty slot (→ 1-hr block) or click-drag (→ exact
  span, 15-min snap) to create — opening the T6 form with an **event/task toggle (default
  event)**; drag a block to **move**, drag its edge to **resize**; overlaps **re-split live**
  as a block moves; drag a task from "tasks today"/"next 7 days" **onto the grid to schedule**
  it; and drag a scheduled block **off onto a module** to re-date it (→ tasks-today = today/
  no-time; → next-7 = +7 days/no-time; events snap back). Built as a **Today-scoped hook
  (`useTodayGrid`)** — a deliberate sealed twin of Calendar's shared `useEventDrag`/
  `useScheduleDrag`, which were **NOT touched**, so Calendar behaves exactly as before; only
  the pure `eventLayout` overlap maths is reused read-only. Choices: min block 15 min,
  tap-vs-drag 4px, done blocks tap-only, past events movable, mouse-only (touch still taps/
  scrolls — mobile Today is its own spec). All writes go through the existing Supabase task/
  event paths; **no schema, no category writes, no Calendar/Settings change.** Save point
  `ffdf62d`. ⚠️ Drag is **build- + logic-verified but not visually run** (headless login) —
  owner to test on Mac; if a drag bug appears, roll back to `ffdf62d` (doom-loop rule).
  Committed locally only — **not pushed/deployed**. **NEXT: T8 — date arrows / day-flipping,
  or wire the "All tasks" screen (T11).**
- **2026-06-23 — Phase 7, T6 DONE — Today's full create/edit form, "+ add", delete/undo,
  and the drill-in category picker.** One tap on a task row or a grid block opens a new
  Today-scoped form (`TodayForm`) — create + edit, task + event — with Title, the drill-in
  **category picker** (search + breadcrumb + chevrons, picks any level, reads only), the T7
  **status pill**, Day/Time (due + optional schedule), Priority (None/Low/Med/High), Notes,
  and Delete. **"+ add a task"** creates into today. **Delete → "Deleted · Undo" toast** that
  re-inserts the exact row. All writes go through the EXISTING Supabase task/event paths;
  **no schema, no category-table writes**. Crucially this form is **separate from the shared
  TaskPanel/EventPanel that Calendar still uses** (intentional temporary duplication), so
  **Calendar/Settings are untouched**. This piece **absorbed T9** (delete+undo) and the **T3
  drill-in picker** sub-item (folded in per the instruction; recorded, not silently
  renumbered). Save point `7de0a94`. Committed locally only — **NOT pushed/deployed** (not on
  the phone yet). **NEXT: T5 — calendar workspace interactions on Today's grid (click-create,
  drag, resize) — T5 will open THIS form; or T8 date arrows.**
- **2026-06-23 — Phase 7, T7 DONE — "done" is back on Today, now as a 3-state pill.**
  Small ADDITIVE schema step first: `tasks.status` widened from `open`/`done` to
  `open`/`in_progress`/`done` (`db/08_status_in_progress.sql`) — applied + proven live on
  Frankfurt (default `open` and the 8 existing rows untouched; all 3 values accepted, a 4th
  rejected, `completed_at` still auto-stamped/cleared, proof rolled back leaving nothing).
  Then the front-end (Today only): each "tasks today" row gains a connected **To do · In
  progress · Done** pill — tap a segment to set state straight from the row (no opening the
  task), through the **existing** update path. Done greys+strikes the row and keeps it till
  midnight (then it rolls off); tapping Done again undoes. "In progress" is an optional
  middle state. No Calendar/Settings/shared-hook change. Save point `310f9db`. **NEXT: T5 —
  calendar workspace interactions on Today's grid (click-create, drag, resize), or T6 form.**
- **2026-06-23 — Phase 7, Piece D1 (docs only) — category decisions recorded.** Six owner
  decisions written into 03-decisions.md: **no seeded tree** (T3b **dropped** — start is
  just Inbox, build in-app); **no fixed count** at any level (only the depth-3 cap);
  **Inbox permanent/undeletable** + the default home for uncategorised capture (UI delete
  must refuse on Inbox); **categories managed in a dedicated Settings manager**, the Today
  picker only **reads** the tree; and two **OPEN** questions left explicitly undecided — the
  **colour-branch model** (sub-category colour) and **parent-delete behaviour**. Roadmap:
  T3b struck (with reason, history kept) and a **T13 — Category management (Settings)**
  placeholder added to the backlog. No code/schema/data. **NEXT unchanged: T5 — the
  calendar workspace interactions on Today's grid.**
- **2026-06-23 — Phase 7, T4 / Rebuild R1 DONE — Today's body is rebuilt to the B layout
  with real data (read-only render).** Left "The Day" is a 7am–midnight grid of today's
  events + scheduled tasks as soft Apple-style **tinted blocks** (overlaps split, now-line,
  scrolls inside its column — the page doesn't scroll). Right is two stacked modules —
  **"tasks today"** (due today / Today bucket / scheduled today, priority order, max ~5
  then scrolls) over **"the next 7 days"** (tomorrow→+7 in date order, undated tasks tagged
  at the bottom; Someday deliberately excluded) — plus a disabled **"All tasks · N"** box.
  Built from new sealed kit blocks (DayGrid, TintedBlock, TodayTaskRow, ModuleHeader) and a
  pure `todayModel.js`; Today.jsx + today.css rewritten. **Editing is preserved** (tap a
  task/event → the existing Phase-6 panel). Front-end only — no schema, no writes beyond
  edit, and NO shared/Calendar/Settings/header change (verified). Save point `ec115bf`.
  **Interim gaps to expect (each returns in its own later piece):** the quick done-tick
  (T7 status pill, needs the schema change), task delete + "+ add" (T6 form), drag-to-
  schedule (T5), and the Someday drawer (now off the home screen by the content-model
  decision; still in the data). Old now-unused files (DayTimeline/TaskBlock/TaskRow/
  SomedayDrawer/useScheduleDrag) are left for the T12 trim. **NEXT: T5 — the calendar
  workspace interactions on Today's grid (click-create, drag, resize).**
- **2026-06-23 — Phase 7, T3 (schema) DONE — the category tree can now be 3 levels deep.
  FIRST live write to the database.** Additive only: a new `categories_enforce_depth`
  trigger caps the tree at 3 levels (`db/07_categories_depth.sql`), applied + verified on
  the live Frankfurt DB via the proper path (the new token now reaches Frankfurt; Ireland
  never touched). Found that `parent_id`/`sort_order`/`color` already existed from Phase 2
  (so only the depth cap was new), that the `parent_id` FK is `ON DELETE CASCADE` + a
  re-parent-up trigger rather than `RESTRICT` (left unchanged — flagged), and that one
  existing row (`Q1`) is already a nested child (left intact). Proved live: existing rows
  + colours + task/event links unchanged; a temp 3-level tree is accepted, a 4th level is
  rejected, all rolled back with no test rows left. Save point `3201ae0`. NO category data
  seeded, NO src/ change. **NEXT: T3b — seed the owner's real 5-top category tree (owner
  designs it first), or resume the Today front-end build.**
- **2026-06-23 — Phase 7, T2 DONE (read-only data audit; nothing changed).** Checked the
  LIVE Frankfurt DB and found **all four form fields the Today spec needs already exist**
  (`tasks.notes`, `tasks.priority`, `events.location`, `events.notes`) and every
  depended-on field is present and correctly shaped — so **no additive migration is
  needed** and the planned apply step is skipped. Two things for the road: (a) a LOUD
  flag that the live task `status` only supports `open`/`done`, not the pill's 3 states —
  a small additive change at **T7**; (b) an access caveat — the management token can only
  reach the OLD Ireland project and is denied on Frankfurt, so the live read was done via
  read-only anon API probes (worth the owner checking project/org access). NO DB/src/
  schema change; no save point. **NEXT: T3 — the category hierarchy (its own piece;
  large, may sub-split), OR resume the Today front-end build — owner's call.**
- **2026-06-23 — Phase 7, T1 DONE (first code piece; LOOK ONLY). The broadsheet header
  + cooler paper are live across the app.** Made the **sacred save point** first
  (commit `ac665cb` — clean Phase 6 Today, the rollback target). Then: paper cooled to
  **`#F6F5F1`** (one token in `theme.css`); started the **reusable component kit** in a
  new sealed `src/kit/` folder with the five header blocks (**Masthead** = blackletter
  "LifeOS" wordmark, **Topline**, **Folio** = date · motto · live ticking clock ·
  edition, **HairlineRule**, **SmallCapsLabel**); loaded the **UnifrakturMaguntia**
  blackletter webfont (the only new asset — no JS libraries); renamed the old
  `Masthead.jsx` → **`EditionHeader.jsx`** so the kit owns the "Masthead" name, with
  `EditionHeader` composing the kit top block + the **unchanged** Today/Calendar/
  Settings nav. The header is shared by all three screens, so all three got it at once.
  **Everything below the header is untouched** (the Phase 6 calendar/tasks/settings are
  exactly as before); **no data reads/writes, no behaviour, no schema, no new JS dep.**
  Build passes clean. No colour nudges (ink/muted read fine on the cooler paper).
  Couldn't self-verify the logged-in look (magic-link login). **NEXT: T2 — the additive
  schema CHECK (add only fields confirmed missing; `tasks` likely already has notes +
  priority), flagged for the checker; its own save point first.**
- **2026-06-23 — Phase 7, Piece 1c (paperwork only, no app code). The Today rebuild
  is now the owner's explicit, recorded decision.** Today (desktop) is a **clean
  front-end rebuild of that one screen** — an eyes-open escalation from the phase's
  default "re-skin, don't rewrite", taken because Today gained substantial new
  behaviour (workspace calendar, status pill, drag-to-schedule, date-flip, category
  tree) — and explicitly **not** a whole-app rewrite. Recorded in 03-decisions.md
  with hard guardrails: **front-end only, data layer untouched** (schema only via the
  separately-flagged additive pieces, never inside a build/look commit); **the save
  point before T1 is sacred** (roll back to the working Phase 6 Today, never dig —
  doom-loop rule applies hard); **scoped to Today only** (each later screen gets its
  own re-skin-vs-rebuild call); **each T-piece keeps its own save point + owner
  verification on Mac and phone**. NO src/ or schema change this piece. **NEXT
  unchanged: T1 — paper token + reusable component kit, apply header + `#F6F5F1`
  paper (first piece that touches `src/`; its save point is the sacred rollback).**
- **2026-06-23 — Phase 7, Piece 1b (paperwork only, no app code). The Today
  desktop spec is LOCKED + the rebuild plan is written down.** `07-ux-flows.md` §3
  now holds the settled desktop Today screen (a **workspace calendar** you can
  create/drag/resize on; **"tasks today" + "next 7 days"** modules; a **3-level
  category tree** you can file at any level via a drill-in picker; a **one-tap full
  edit form** everywhere; a **status pill** with done-till-midnight + undo;
  **recurring events** with "this one or all?"; quiet **undo toasts**) — mobile
  Today is a separate later spec. 03-decisions.md records the **scope call**: this
  is a front-end **rebuild**, *not* a re-skin, but the **data spine is preserved and
  reused** — schema changes are **additive only and checker-flagged**, deletion is
  conservative (provably unused, one trim per commit, separate from build commits).
  It tags which Today decisions are **new behaviour** (workspace calendar, category
  tree + any-level filing, recurring events, the tasks-today/next-7 model,
  undated-at-bottom, one-tap edit) vs look. The roadmap now carries a **12-step
  Today build sequence (T1–T12)**, each its own verified piece with a save point
  before it. NO src/ or schema change this piece. **NEXT: T1 — the paper token +
  reusable component kit, and apply the header + `#F6F5F1` paper (first piece that
  touches `src/`).**
- **2026-06-22 — Phase 7 OPENED. Piece 1 (paperwork only, no app code).** Made a
  clean pre-redesign **save point** (a labeled commit at the Phase 6 working
  state, to roll back to if the redesign goes wrong). Added **`07-ux-flows.md`** to
  the repo as the phase's **behaviour reference** — agreed, but **open to
  relitigation** screen by screen (it carries a status banner saying so, and flags
  two spots where it describes future intent, not what Phase 6 shipped). Locked the
  opening **design decisions** in 03-decisions.md and mirrored the doc-level ones
  into 06-design.md: styling = a **small reusable component kit** on the existing
  theme tokens (over plain CSS / Tailwind; animation + chart toolkits come later);
  Phase 7 **may now make schema/logic changes** where the UX needs them (reverses
  the old "redesign is look-only" stance, each change its own verified piece);
  visual target = the approved **Apple-tinted** look with the **blackletter
  masthead + folio header** (this settles the blackletter-vs-quiet-serif open
  question — blackletter stays); **paper cooled to `#F6F5F1`** (from the cream
  `#F4EFE4`; theme.css change happens in Piece 2); calendar categories become a
  **soft tinted block** Apple-Calendar style (overrides the old "small dot, not big
  blocks of colour" line); and the Today home model becomes **"tasks today" +
  "next 7 days"** (display-logic only, a later piece). NO src/ or schema change
  this piece. **NEXT: Phase 7, Piece 2 — theme tokens + the start of the component
  kit (incl. the `#F6F5F1` paper change in `src/theme.css`).**
- **2026-06-22 — PHASE 6 COMPLETE & owner-verified. The V1 finish line is reached.**
  The brief now RUNS ITSELF at 7am Amsterdam and texts a warm "quiet broadsheet" recap
  of the day — events + time-blocked tasks, Today tasks, due-today, overdue — plus at
  most one gentle "forgotten task" nudge and at most one reserved "fill a gap" offer.
  Built in pieces: 6a (the on-demand pipe — a private `brief` edge function) → 6b (reads
  my real day, plain text) → 6c (Gemini writes it in the quiet-broadsheet voice, with a
  plain-checklist fallback) → 6d (the staleness nudge, code-picked) → 6e (the reserved
  gap offer, code-picked) → 6f (the 7am alarm via pg_cron + pg_net, DST-safe, always-send).
  All on-demand pieces were owner-verified on the phone; the real 7am self-delivery is now
  confirmed too, so Phase 6 is ✅. The proactive engagement layer — the whole point of the
  product — is alive. Scheduling infra added (pg_cron, pg_net, a Vault secret, one cron
  job); NO change to the spine (tasks/events/categories) and NO src/ change. Follow-ups
  recorded in the handoff: the temporary "brief test" trigger word is still live (retire
  when ready), and a capture quirk to check (a task read as ~163 days overdue — possibly
  a bare date parsed as the nearest PAST date). **NEXT: Phase 7 — the redesign (the full
  per-screen look-and-feel pass; the owner art-directs).**
- **2026-06-22 — Phase 6, Piece 6f: the 7am alarm + always-send safety net.** The private
  brief function now runs itself via pg_cron at 05:00 and 06:00 UTC, proceeding only in
  the 7am Amsterdam hour (DST-safe, once/day); always-send so silence means the job broke;
  service-role key in Vault. Verified end to end (test cron fired → function returned 200
  "sent"). Temp every-3-min proving job since removed. NEXT was: confirm the real 7am —
  now done (see the close-out note above).
- **2026-06-22 — Phase 6, Piece 6e: the "fill a gap" suggestion (reserved mode).** When
  today has a real free stretch (≥2h inside 08:00–20:00 Amsterdam, no events/scheduled
  tasks, earliest one) AND a worth-doing task is waiting, the brief offers ONE gentle
  "could be a good window for X". Worth-doing candidate, in order: the 6d forgotten task
  → most overdue → due today → high-priority Today/This Week; none → no suggestion
  (reserved). Needs BOTH a gap and a candidate; capped at one; an offer, never a command.
  CODE finds the gap + picks the task (deterministic); Gemini only phrases it. If the gap
  task is already mentioned elsewhere it's folded into ONE line (never named twice). In
  prose AND the checklist fallback. New gap.ts + sb.ts (shared read helper); day.ts/
  index.ts/write.ts wired; 6b/6c/6d unchanged. Read-only, no DB/schema/column/src change;
  brief redeployed private (401), telegram untouched. With today's packed calendar there's
  no 2h gap, so no gap line yet (correct). **Owner verifies on phone**: clear an afternoon
  + have a pressing task → "brief" shows one gap offer; fill the day → none; only waiting
  task low-priority undated → none; gap task = forgotten → one combined line; "book
  dentist" still captured. Phase 6 NOT done. NEXT: 6f — the 7am alarm + silent-failure net.
- **2026-06-22 — Phase 6, Piece 6d: the anti-staleness nudge (the real point).** The
  brief now surfaces the ONE most-forgotten task, gently, at most one per brief. The
  CODE picks it deterministically: an open 'This Week' task created 3+ days ago
  (FORGOTTEN_DAYS, a named constant) that ISN'T already shown (not due today, not
  overdue, not scheduled today), oldest created_at; if none qualify, no nudge at all.
  Gemini only phrases it (one calm "been waiting" line, exact title) and it's in BOTH
  the prose and the plain-checklist fallback, so the rescue holds if Gemini is down.
  KEY FACT: the tasks table has NO updated_at column (only created_at) — so "untouched"
  = created 3+ days ago and still open in This Week; moving it between buckets does NOT
  reset the clock. I did NOT add a column (read-only). A temporary "brief test" trigger
  runs the same brief at a 0-day threshold so the picker fires on real tasks now (with
  today's data it surfaces "tesrt"). brief redeployed private; telegram redeployed
  (--no-verify-jwt) for the new trigger; gates still 401. No DB/schema/src change.
  **Owner verifies on phone**: "brief test" → one "been waiting" line naming a real
  oldest This Week task; check it in the app; plain "brief" → no nudge yet (correct);
  "email landlord" still captured. Phase 6 NOT done. NEXT: 6e — the fill-a-gap suggestion.
- **2026-06-22 — Phase 6, Piece 6c: Gemini writes the brief in real words (voice).**
  The brief reads the day exactly as 6b (verified, unchanged), then hands those SAME
  facts to Gemini, which writes a short, warm-but-restrained morning message in the
  "quiet broadsheet" voice (sentence case, plain verbs, no hype/emoji/exclamations,
  ~2-4 sentences). Gemini may ONLY rewrite the supplied facts — invents/drops nothing;
  days-overdue is precomputed so it never does date math; temp 0. Crucially it FALLS
  BACK to the plain 6b checklist on any Gemini failure (missing key / error / 429 / junk)
  — never silent, never crashes. Reuses the existing GEMINI_API_KEY + gemini-3.1-flash-
  lite (data->words, the opposite of capture). New brief/write.ts; day.ts split into
  gather/format/facts. Still read-only, no DB/schema/src change; brief redeployed
  private (anonymous → 401). **Owner verifies on phone**: text "brief", check every fact
  matches the real day; text a few times (facts stay correct, wording may vary); "pay
  rent friday" still captured. Phase 6 NOT done. NEXT: 6d — the anti-staleness brain.
- **2026-06-22 — Phase 6, Piece 6b: the brief reads my real day (plain text, no AI).**
  The `brief` function now reads my real data today (READ-ONLY, every query filtered
  to my user_id) and sends a deliberately robotic, rule-built summary: EVENTS TODAY
  (events + time-blocked open tasks, earliest first, tasks tagged "(task)"), TODAY
  bucket, DUE TODAY, OVERDUE — empty groups stated plainly, a task may appear in more
  than one group (no dedupe; refined in 6d). No AI, no schedule, no prioritising/stale
  logic yet. "Today" = the Europe/Amsterdam calendar day, via a new shared
  `_shared/datetime.ts` (same definition capture uses; telegram left untouched, still
  holds its own copy — safe later cleanup). No DB/schema change, no src/ change.
  Redeployed `brief` private (anonymous → 401 confirmed). **Owner verifies on phone**:
  text "brief", check every line against the app; add a due-today + an overdue task,
  text again, confirm they land in the right groups; "buy milk" still captured. Phase 6
  NOT done. NEXT: 6c — Gemini writes the brief in real words.
- **2026-06-22 — Phase 6 STARTED. Piece 6a: the empty pipe (on demand).** Built a new,
  separate `brief` edge function — the home for ALL brief logic from the start, so the
  later 7am alarm calls it directly and the webhook function never holds brief code.
  This piece it sends ONE fixed Telegram message and nothing more (no AI, no reading my
  day, no scheduler, no DB change). It's deployed PRIVATE (jwt verification ON), so its
  public URL refuses anonymous calls — only a service-role caller can invoke it (the
  telegram function now, the alarm later); confirmed live (anonymous POST → 401).
  Texting Marty the reserved word "brief" fires it (after the secret check + owner-gate)
  and skips normal capture; every other message behaves exactly as before. Deployed to
  the real cntlptuacsujbdtwvbis project. **Owner verifies on phone** (text "brief" → get
  the test message; "call mum tomorrow" → still captured; "brief" again → arrives again).
  Phase 6 NOT done. NEXT: 6b — the brief reads my real day.
- **2026-06-22 — PHASE 5 COMPLETE & owner-verified. Telegram capture works end to end.**
  All of 5a–5e are done and confirmed on the owner's phone: (5a) the round trip — the
  project's first edge function (`telegram`), webhook registered, `--no-verify-jwt`;
  (5b) owner-lock — only the owner's chat id gets a reply; (5c) Gemini reading — message
  + local date/time → structured fields, with the agreed rules (Europe/Amsterdam, next-
  upcoming day, clock-time ⇒ event else task); (5d) real saving — a confident read writes
  a real row owned by the owner: EVENT with a 1-hour default (start=time, end=+1h), a dated
  TASK gets a due_date (a deadline, NOT a calendar block), bot items land uncategorised
  (Inbox) in Today (no date/today) or This Week (a future date), no category guessing;
  (5e) the trust layer — a Telegram secret-token header check (fail-closed) in front of
  the owner-gate so a forged request is refused, chit-chat/gibberish save nothing with a
  kind reply, and "undo" removes the single most recent bot-saved item via a new
  `telegram_saves` log (deletes exactly that row by id, owner-only, never a hand-made row).
  Model: gemini-3.1-flash-lite (free, 500/day). NO browser-app (src/) or core-schema change
  in Phase 5 — function logic + one added log table only; the live edge function matches the
  repo (nothing unpushed); no Vercel redeploy needed. **NEXT: Phase 6 — the 7am brief +
  anti-staleness engine (the real V1 finish line).**
- **2026-06-22 — Phase 5, Piece 5e: trustworthy (security + misses + undo). PHASE 5
  READY, pending owner phone verify.** (A) Security: the function rejects any request
  whose `X-Telegram-Bot-Api-Secret-Token` header != the stored `TELEGRAM_WEBHOOK_SECRET`
  (set on the webhook via setWebhook secret_token), as its first action, fail-closed;
  owner-gate stays behind it. Verified: no/wrong secret -> 401, correct -> 200. (B) Misses:
  chit-chat/gibberish/unsure save nothing, kinder reply. (C) Undo: "undo" removes the
  single most recent bot-saved item via a NEW `telegram_saves` log table (applied via the
  management API; db/06_telegram_saves.sql is the record; RLS owner-only). Deletes exactly
  one row by id, owner-only — verified it leaves a hand-made app row untouched. New files
  db.ts + undo.ts; all function files <140 lines. No core-table schema/meaning change.
  **Do NOT mark Phase 5 done until the owner verifies on their phone**, then flip together.
  NEXT: Phase 6 — the 7am brief.
- **2026-06-22 — Phase 5, Piece 5d: save it for real.** Marty writes confident reads as
  real tasks/events (service-role + explicit owner user_id; RLS intact); unsure saves
  nothing. Model -> gemini-3.1-flash-lite (500/day). See handoff for detail.
- **2026-06-22 — Phase 5, Piece 5c: Gemini reads it (understanding only, saves
  nothing).** Marty now sends the owner's message + today's local date/time to Gemini
  and replies with structured understanding (type/title/date/time, or "unsure"),
  always tagged "(Not saved yet.)". Baked in the owner's rules: Europe/Amsterdam tz,
  vague day = next upcoming (today if today), clock-time ⇒ event else task. Forced
  JSON-only output (strict schema, temp 0); malformed/unavailable → "couldn't read
  that" (with a small retry). Split the function into index.ts (gate+plumbing) +
  understand.ts (AI+reply) to stay small. Gemini key is the GEMINI_API_KEY secret
  (free Flash), not the repo. Had to switch model **gemini-2.0-flash → gemini-2.5-flash**
  (2.0's free tier is now limit 0). Verified all sample reads correct via a local
  replica + one live deployed call. NO database touched. Owner-gate still holds.
  **Phase 5 NOT done.** NEXT = 5d (save it for real). Note: the access token the owner
  believed revoked still worked (3rd time) — owner to confirm dead tokens are gone.
- **2026-06-22 — Phase 5, Piece 5b: locked the bot to the owner.** Added a gate at
  the very front of the `telegram` edge function — it reads the sender's chat id
  first and only the owner (8864259574) gets a reply; any other sender is read,
  ignored (no message), and acked with 200 so Telegram stops retrying. The owner id
  lives in a new Supabase secret (`OWNER_CHAT_ID`), not in the file/repo. Owner's 5a
  echo is unchanged. Redeployed `--no-verify-jwt`. Proven without a second account:
  a direct call with a stranger id (9999) returned "ignored" + sent nothing, the
  owner id returned "ok" + delivered a real reply (the function still answers 200
  both ways; the distinct body is only for outside verification — Telegram ignores
  it). No AI, no DB, no schema change. **Phase 5 NOT done.** NEXT = 5c ("Gemini
  reads it"). Note: the access token the owner thought was revoked still worked —
  owner to confirm dead tokens are actually gone.
- **2026-06-22 — Phase 5, Piece 5a: the Telegram round trip (plumbing only).** Built
  the project's FIRST edge function (`supabase/functions/telegram/index.ts`): reads an
  incoming message's text + chat id and replies "Got it: <text> — your Telegram chat ID
  is <id>". No AI, no DB, no schema change. Deployed with **`--no-verify-jwt`** (so
  Telegram's tokenless calls aren't rejected) and pointed Telegram's webhook at it;
  `getWebhookInfo` shows it registered with 0 pending and no errors, and a tokenless POST
  returns 200. **Setup gotcha resolved:** the Supabase CLI was logged into an OLD/abandoned
  "lifeos" project (`qupudazcutkbnxseciwn`, created 2026-06-02); the REAL project the app
  uses is **`cntlptuacsujbdtwvbis`** (created 2026-06-21, Frankfurt). Linked via a personal
  access token from the correct account (token not stored anywhere). Bot token is in
  Supabase's secret store as `TELEGRAM_BOT_TOKEN`, never the repo. **Phase 5 NOT done.**
  Owner verifies on phone; NEXT = 5b (lock to owner's chat id).
- **2026-06-22 — Deployed live + brain docs reconciled. Phases 0–4 DONE; Phase 5 next.**
  Pushed all 17 Phase 2–4 commits to GitHub; Vercel built & deployed; the live site
  (cntlptuacsujbdtwvbis.supabase.co backend) was verified by the owner on Mac + iPhone
  (login, tasks, events, calendar, add/drag, persists on reload). Confirmed the live DB
  has categories/tasks/events with all later-piece columns and RLS owner-only. **Phase 3
  is now fully ✅** (3c due dates, 3d Someday, 3e subtasks all complete & verified — no
  trailing pieces). Then reconciled the seven brain docs to current reality (roadmap
  markers, architecture's Tailwind→plain-CSS fix, glossary terms, design's "settled so
  far"). NEXT: **Phase 5 — Telegram capture.**
- **2026-06-22 — Phase 3, Piece 3e: subtasks (one level). ← PHASE 3 READY TO MARK
  FULLY DONE (pending owner verification).** Added one-level subtasks: "+ Add subtask"
  on a top-level task's editor, subtasks rendered indented under their parent (calm
  Categories tree look), a quiet "X of Y done" parent count that does NOT auto-complete,
  and a "Delete task" action. One level only is enforced in the DB via a new trigger
  (`db/05_subtasks_guard.sql` — **owner must run it**) as well as the UI. Parent-delete
  promotes children to top-level (FK was already ON DELETE SET NULL — checked, kept).
  No table schema / RLS change (the guard is an added trigger). Builds clean. **This is
  the last Phase-3 piece — after the owner runs the SQL and verifies, Phase 3 can be
  flipped to ✅. NOT marked done in the doc yet. Then: Phase 5 — Telegram capture.**
- **2026-06-22 — Phase 3, Piece 3d done: the Someday view.** Added a quiet collapsed
  "Someday" expander below This Week (a single muted line + count + caret, not a third
  headline). Expanding reveals time_bucket='Someday' tasks using the exact shared task
  rows + "+ Add a task" (adds land in Someday), inside its own max-height scroll region
  so desktop zero-scroll holds. Reuses TaskBlock via a `hideTitle` prop; open state is
  session-only. UI only — NO schema/RLS change (reads/writes existing time_bucket).
  Builds clean. **3e (subtasks) still to come — the last Phase-3 piece — then Phase 5.
  Phase markers unchanged.**
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
