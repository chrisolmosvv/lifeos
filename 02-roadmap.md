# LifeOS — Roadmap

> I am "where we are." LIVING doc — update me at the end of every session.
> Status keys:  ✅ done   🔨 in progress   ⬜ not started

There are no dates. We work when there's time and will. We finish one phase
fully before starting the next. Each phase ends on a visible win.

---

## Session note — 2026-07-03 — Global cook-session header marker ✅ (src-only)
A pulsing terracotta dot + live elapsed time in the nav band for active cook sessions,
mirroring the Focus running-session marker. Tap → popover with elapsed / Open / Finish.
Finish deep-navigates to the recipe's staging sheet (exact parity with CookPage's "Done
cooking"). Both markers share a right-pinned flex container; the centred nav never shifts.
New file: `cookSessionContext.jsx`. Nine files touched. No schema change.

## Session note — 2026-07-03 — Calendar/Today six-fix bundle ✅ (src-only)
Six small Calendar-week + Today display/interaction fixes, one commit each + a cleanup deletion,
each owner-verified (commits `08d893f`→`c553d69`, cleanup `9be564b`, + docs). No schema. Shipped:
today's column tint removed + weekend wash 4%→6%; the terracotta gutter-highlight removed on both
screens; the week gutter halved 52→26px; timed week blocks now show start–end times (shared
`timeRange`); the tray hides completed tasks; the week fetch is overlap-based + multi-day all-day
bars show a date range. Full detail in the handoff log + `03-decisions.md`.
**FOLLOW-UPS / DEBT (Calendar pile):**
- **Drag-END bug — ✅ FIXED this session** (commit `142379c`): the drag now ends on release wherever
  the cursor is (window-level listeners), immune to the dragged block being removed mid-drag — so
  releasing a task over the open tray unschedules it + returns it to the tray. Detail in the handoff
  log + `03-decisions.md`.
- **Timed multi-day rendering** — the overlap fetch now loads timed multi-day events that began
  before the week, but the grid only draws a block on its start day (no cross-column split), so an
  off-screen-start timed event is fetched-but-not-drawn. The all-day case shipped; this is a
  separate, bigger piece.
- **Event/task visual distinction — ✅ shipped 2026-07-03** (commits `e965798` split + `5a615b6`):
  EVENT = filled + solid bar; TASK = hollow (category outline) + dashed left bar + neutral to-do
  ring; on the one shared block. Detail in the handoff log + `03-decisions.md`.
- **Recurring events + tasks — ✅ shipped 2026-07-03** (T10; see the T10 entry + `03-decisions.md`).
- Still on the pile: the optional **off-grid drag-ghost** (a faint ghost as a dragged task crosses to
  the tray, instead of vanishing at the grid edge); the **done-task look** on a hollow block (hollow
  outline + ring + 60% fade + strike is undesigned); an optional **tickable to-do ring**; **timed
  multi-day rendering** across columns (see above).
- **Recurrence follow-ups (from T10):** changing a repeat's **PATTERN** via edit is deferred (delete +
  recreate for now); **`Today.jsx` ~508** — componentise its render (the two module lists + drag
  config) as its own refactor; **Today's all-day strip is view-only** (no drag — the week's band has
  it); **`events.repeat_rule`** is a droppable-later column (its own future checker-gated schema
  cleanup, prove-dead first); the **Month loop-marker** was intentionally skipped (calm) — revisit
  only if wanted.
- **File sizes:** `weekGrid.css` 275 lines (over ~250; net-shrank earlier). `todayKit.css` was 588;
  the event/task-distinction session split its block styles into new `blockKit.css` (~125), taking
  todayKit.css to 483 — still over, keep trimming; don't grow either.
- Minor future tidy (not urgent): `Today.jsx` still has its own local `clock()` duplicating
  `dateUtils.clock` — pre-existing, left as-is (out of this bundle's scope).

## Session note — 2026-07-02 — FOCUS pillar shipped (pieces 1–8) ✅
The new **Focus** pillar (a time/focus tracker) is built end-to-end and owner-verified,
inserted in the nav after Today. It records real focus into a new `focus_sessions` table
and integrates across the app. Delivered in 8 owner-verified pieces — the schema was
checker-gated in its OWN commit, and the Calendar layer was isolated + snapshot-guarded:
1) foundation (schema + pure calc, proven vs real rows); 2) record a session (Setup → the
split-flap in-focus → the save card; running row = `ended_at` NULL; discard/finalise; the
stale guard); 3) the Overview (dial + height-filling ledger + week ring-strip + targets +
trend + range view — strict zero-scroll on the 13", owner-confirmed); 4) task↔focus (the
form's Focus section + the per-task row tag + manual back-fill); 5) the global running layer
(header marker + popover + global save overlay + the ▶ block-nudge); 6) the Today
"focused today" line + the morning-brief "yesterday's focus" line (two-track); 7) the
Calendar actual-layer (a terracotta hatched overlay, isolated behind a toggle, default off);
8) polish (accent audit — compliant; dead-code sweep; this close-out).
Commit chain: `efc32ff`→`524d5f1`→`38af3e4`→`2408d4c`→`c6b0328`→`10f8e63`→`353ce7b`→
`78f3b9a`→`8f2d3d9`→`1835853`→(this docs commit). The full contract lives in `12-focus.md`.
**NEXT:** the DEFERRED Marty focus-control track (start/stop/report by chat), when wanted.

## Session note — 2026-07-01 — Calendar create cursor polished
The empty create areas in Today and Calendar no longer use the operating system's
`copy` cursor, which could show as a green plus on hover. They now share a small
ink-coloured target cursor, with the all-day strip wired to the same style when
it is present. Build passes; Today and Calendar were checked in the browser with
no error overlay.

## Session note — 2026-07-01 — Shared header compacted
The shared masthead no longer shows live city/weather in the top right. The
right side now carries the personal edition mark as two lines (`Year XX` /
`Day XX`), the LifeOS wordmark stands alone in the centre, and the nav band
sits higher to give the app below more height. Also added a tiny Food phone
fit rule so the macro labels do not create horizontal overflow. Build passes;
Today, Calendar, Health, Food, Settings, and Planning were checked at desktop
and phone width with no fresh browser errors or horizontal overflow.

## Session note — 2026-07-01 — Planning blank-page repair
Planning's entry from Today was opening a blank page because the shared task row
expected the category lookup map used for shaded colours, but Planning time/category
modes were not passing it through after the Calendar/Today colour-unify work. Fixed
by threading the existing map into those Planning rows; build passes, Time opens, and
Category expands without browser errors. No schema or product decision change.

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

## 🔨 Phase 7 — The redesign (look & feel pass)   ← RESUMABLE (front-end track)
> **Was PAUSED 2026-06-23 while the backend Marty track ran; that track (M0–M10) is now
> COMPLETE (2026-06-24), so Phase 7 is the next track to resume** — Settings re-skin, the
> category-manager/Archive polish, mobile Today/All-Tasks, and T12 (conservative trims).
> Phase 7 lives entirely in `src/` (front-end); the Marty track was entirely in
> `supabase/functions/` (backend) — different folders on purpose. Never mix the two in one
> commit. See `08-marty-upgrade.md` for the finished backend track.

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

**WHERE PHASE 7 STANDS (2026-06-23).** **Built, deployed & owner-approved:** the **Today**
rebuild (T1 header/kit, T4 display, T5 grid interactions, T6 form/picker/delete, T7 3-state
status pill, T8 date arrows) + **All Tasks** (T11). **Built & deployed, awaiting owner verify:**
the **category manager** (T13, functional; polish later), the whole **Archive** feature
(A1–A4 + A3b brief filter), **subtasks** (SUB), and **email+password auth** (AUTH-1/2; magic
link retired). The data layer grew additively (T2 audit, T3 category depth-3 cap, T7 status
3-state, A1 archive schema). **Still to do (each its own piece):** the **Calendar** screen
(re-skin-vs-rebuild decision pending), the rest of **Settings** + the manager/Archive polish,
**mobile Today / All Tasks**, and **T12** conservative trims of now-unused old files. See the
backlog + per-piece ✅ list and the DEPLOY+VERIFY state below.
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
- ✅ **T10 — Recurring events + tasks** *(large; shipped 2026-07-03)*. Approach A (materialise): a
  `recurrences` recipe generates real occurrence rows. Daily/Weekly/Monthly/Yearly × Never/After N/
  Until; events AND tasks; DST-safe (wall-clock + fixed zone, hand-rolled Intl generator); lazy
  client-side top-up for "forever"; This one / This and following / All on edit + delete; a neutral
  loop marker; Today's fetch brought to all-day+overlap. Schema `db/37` (checker-gated) + 6 src
  pieces; full contract in `03-decisions.md` + the handoff log.
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
- ✅ **DESK-1 — Today desktop re-skin (front-end only).** Surgical re-skin of the **shared
  header** + the **Today** screen to match `today-mockup.html`. Masthead → 3 columns: a live
  `HH:MM Weekday` / `D Month YYYY` dateline (left, replaces the big clock), the LifeOS wordmark +
  `YEAR {age} · DAY {n}` from birthday 29 Mar 2002 (centre; topline + tagline dropped), and
  **live** city-over-weather (right). **Superseded 2026-07-01:** the live weather slot was removed;
  the right side now shows the two-line Year/Day mark and `src/useWeather.js` is gone. Originally,
  city + weather were pulled for real — free, no-key, HTTPS: **ipapi.co** (city/coords) +
  **Open-Meteo** (temp + condition). The personal-edition + dateline maths are pure (no network)
  in `src/personalEdition.js`. Nav →
  centred small-caps, ruled top+bottom, terracotta on the active item (Settings subtitle dropped).
  Today body → full-width (56px side frame); the `‹ ›` arrows pinned as **one fixed cluster** left
  of the day title. Colophon footer deleted. **Shared header changes show on Calendar + Settings
  too (intended; confirmed no layout break).** No schema / data-layer / drag-hook change. Save
  point `2cf0810`. (Topline/Folio kit blocks now unused but left in place.)

### Today V2 — evolve-in-place upgrade (T-track resumes, 2026-06-29)
The Today front page upgraded to V2 **in place** — no parallel copy, the module stays working at
every commit. Began with a full V1 Map + Behavioural Snapshot (owner-approved) before any change.
Built in small, owner-verified pieces; src/ and schema never share a commit.
- ✅ **Piece 1 — Calendar-grid create no longer lands in 'Today'.** The shared `ItemForm` save
  fallback `t.time_bucket || 'Today'` → `|| 'Someday'` (one line, `src/kit/ItemForm.jsx`). It only
  ever fires on the ONE create path with no bucket prefill — the **Calendar grid** (draw slot →
  flip to task) — which was silently parking those on today's list. Recon corrected the premise:
  `time_bucket` is **NOT NULL DEFAULT 'Today'** on the spine, so there is no bucket-less task to
  "preserve" and editing never misfires; 'Someday' matches the Calendar C5 "no-context task never
  lands in Today" rule. Intentional prefills (Today 'Today', All Tasks 'This Week') are truthy and
  untouched. **No schema, no migration, no row touched** — forward-looking only. Owner-verified on
  Mac (all four checks incl. the reloaded row value). Save point `9667a73`.
- ✅ **Piece 2 — Quick-add capture box on Today.** A quiet one-line input at the top of Today's
  right column ("Add to inbox…"): type a title, press Enter, and a task is dumped straight to the
  backlog/Inbox — no form, no type, no date. Writes `{ time_bucket:'Someday', category_id:null, no
  due/schedule }` through the EXISTING `writeTask` path (not optimistic — `writeTask` reloads from
  the DB, so a failed write leaves nothing behind; forced-failure shows the error line + keeps the
  text). 'Someday' + undated keeps it off "tasks today" and "next 7 days"; null category = Inbox,
  findable in All Tasks. Success → a brief "Added to Inbox" toast (reuses the existing `Toast`),
  clears the box, keeps focus for the next dump; whitespace-only is a no-op. **New sealed kit block
  `kit/QuickAddInput.jsx`** — wired ONLY on Today this piece, slated for Planning / All-Tasks /
  Calendar later (one screen at a time). `ItemForm` / grid / Calendar / All-Tasks / the spine
  untouched. No schema. Owner-verified on Mac (all five checks incl. the reloaded row + forced
  failure). Save point `2c0ae31`.
- ✅ **Piece 3a — Progressive disclosure in the shared form.** Reorganise the EXISTING `kit/ItemForm`
  (+ `ItemTypeFields`) fields into a calm **core** + a **"more"** expander (collapsed by default).
  Same fields, same inputs/setters, same save + validation — layout/disclosure ONLY, so what-saves is
  provably unchanged across all three screens (Today, Calendar, All Tasks). **Task core:** Title,
  Category, Due; **more:** Scheduled time, Priority, Subtasks, Notes, Status. **Event core:** Title,
  Category, All-day, Start/End; **more:** Location, Notes, Repeat (the existing disabled placeholder).
  `ItemTypeFields` now renders by a `slot` prop ('core'|'more'); Notes moved into it so each kind's
  "more" order matches the spec. "more" is collapsed on CREATE; on EDIT it **auto-expands** (pure
  `moreHasData` read of the item: scheduled time / priority / location / notes / subtasks — Status +
  the disabled Repeat don't trigger it) so populated fields are never silently hidden. `ItemForm`
  landed at **238 lines — under the 250 guide, no split needed**. No save/validation/toggle/chip/grid
  change, no schema. Owner-verified on Mac (all five checks across all three screens, incl. the
  auto-expand + advanced-data-survives-a-title-edit case). Save point `8bb3103`.
- ✅ **Piece 3b — Today/Park chips on the task form.** Two mutually-exclusive plain-language chips —
  **"Today"** and **"Park"** — in the task form's core timing area (under a quiet **"When"** label, by
  Due date; terracotta-on-active, sparing). They quietly set the HIDDEN `time_bucket` (Today='Today',
  Park='Someday') **without ever saying "bucket"** — serving the dates-only/hidden-bucket time model.
  **Events have no bucket → no chips on the event form; not shown for subtasks either** (inert bucket,
  like priority). A `bucket` state in `ItemForm`, init = `origBucket = t.time_bucket || 'Someday'` —
  the SINGLE Piece-1 create fallback **relocated** from the save line to the state initialiser, so
  `save()` writes a clean `time_bucket: bucket` (no second fallback layered in). Active = the current
  bucket ('This Week' → neither chip); tapping the active chip **reverts to `origBucket`** (no forced
  default — the Piece-1 guarantee restated), tapping the other switches. Chips set **only** `time_bucket`
  — `due_date`/`scheduled_*` are independent (a task can have a due date AND be Today/Park). `ItemForm`
  at **247 lines — under 250, no split**. No schema. Owner-verified on Mac (all seven checks across the
  three screens, incl. a 'This Week' task staying 'This Week' on a title-only edit, and due+bucket
  persisting independently). Save point `aa0e40b`.
- ✅ **Piece 3c — Two entries / drop the in-form toggle** *(closes the form cluster 3a/3b/3c)*.
  Replace the shared form's create-only **task/event toggle** with **two type-declared entries**: the
  form opens already knowing its type (caller's `kind` on create; the item on edit). Done in two
  independently-revertible commits. **Stage 1 (`4e86ddd`)** — stop enabling the toggle: removed
  `toggle: true` from the 4 create sites (Today grid `onCreate`; WeekView "+ Add event", grid
  `onCreate`, all-day band `onCreate`). Every entry now opens type-locked — **Today "+add" / All Tasks
  "+add" → task; Calendar + both grids → event** — and the toggle UI (gated on the now-always-falsy
  prop) never renders. **Stage 2 (`4cc51f1`)** — delete the proven-dead machinery: the `toggle` prop +
  the `useState(kind)`→`const k = kind` collapse + the toggle UI block in `ItemForm`; the
  `.tk-form-toggle`/`.tk-form-tog` CSS; the `toggle={form.toggle}` passthroughs + stale comments in
  Today/WeekView. A prove-dead grep gated the deletion (only unrelated `toggle` uses + two doc comments
  remained). `ItemForm` 242 lines. **Retired path (accepted):** the old "grid event → toggle to task"
  one-click is gone; **a task reaches the Calendar grid via the tray "+ add" → tap to detail / drag to
  schedule** (the locked model — no new task-on-grid create path built). Grid-create-as-event maps the
  drawn slot correctly on both screens; the only unmapped path was the retired grid→task one. No
  save/validation/edit/chip/disclosure change, no schema. Owner-verified on Mac (Stage 1 (a)–(f) + Stage
  2 (g), all three screens, console clean). Save points `4e86ddd` + `4cc51f1`.

### Planning view — NEW surface, sliced build (T-track, 2026-06-29)
A NEW Planning screen, built fresh on the existing kit — ADDITIVE, nothing existing changes. The
backlog gets a real planning home (time / board / category modes). Sliced: P1 shell+time-render →
P2 time-drag → P3 board → P4 category → P5 triage → P6 fold/retire All Tasks → P7 Marty/brief.
- ✅ **P1 — shell + time mode (RENDER-ONLY).** The screen shell, a calm mode toggle (**time live**;
  **board + category** inert, visibly-disabled "soon" placeholders — no dead clicks), a persistent
  **Inbox side rail**, and time mode's **four date-derived lanes** — render only (no drag, no new
  writes, no triage). Lanes are **compute-on-read** via a pure getter `buildPlanning(tasks, today)`
  (`src/planningModel.js`), separate from render: each top-level not-done task lands in **exactly
  one** lane by a strict precedence — **Overdue** (a real past due/scheduled date — a `Today`-chip
  does NOT rescue it) → **Today** (due/scheduled today OR `time_bucket='Today'`) → **This week**
  (through the upcoming Sunday, the app's Mon→Sun week) → **Later**. The **Inbox rail** =
  uncategorised + undated + not `Today`-chipped (mutually exclusive with the lanes). Reuses the
  existing task **read path** + `TodayTaskRow`/`StatusPill`/`ItemForm`/`Toast` **as-is**; the only
  writes are the reused row's status pill + tap-to-edit (existing paths). **Entry:** a quiet
  parallel **"Planning →"** link beside Today's bottom-left box — the **"All tasks" box is unchanged
  and All Tasks stays fully intact** (its retirement is P6). New files: `src/Planning.jsx`,
  `src/planningModel.js`, `src/kit/PlanningColumn.jsx`, `src/kit/planning.css`; additive:
  `LoggedIn` `planning` route, `Today` Planning link + `today.css`. **NO schema, NO migration, NO
  change to any existing screen.** Owner-verified on Mac (a–f, incl. the Overdue-beats-Today-chip
  edge + zero regression). Save point `f393c67`. **Known P1 limitation (by design):** a task that
  is **categorised but undated and not `Today`-chipped** appears in no lane and not the rail — it's
  the undated backlog that **board/category mode (P4)** surfaces; intentionally invisible in P1.
- ✅ **P2 — time-mode dragging → sets due date.** The four time-lanes become a **drag target**: drag a
  task card between lanes → set a representative `due_date` via the **existing** task-update path → the
  re-read re-derives placement (lanes stay derived; nothing stored). Rules in a pure
  `planDrop(task, target, today)`: **Today** → today; **This week** → keep an already-in-week date else
  the upcoming Sunday; **Later** → keep an already-later date else the Monday after; **same lane = no-op**
  (no yank); **Overdue is drag-FROM only** (not a drop target — no planning into the past). **One
  owner-approved bucket touch (amends "never rewrite `time_bucket` on a drag"):** a **Today-chipped**
  task stays pinned to Today for any non-past date, so dragging it to This week/Later also flips
  `time_bucket 'Today'→'This Week'` so it can't snap back — strictly that case (never onto Today, never
  a dated-today / non-chipped task; an in-window date is still preserved). **Write-then-reload** (the
  app's safe pattern — no phantom on failure, owner-verified by forced Wi-Fi off). **Planning-local
  native HTML5 drag** (mouse-only → phone stays tap-only); the grid hook was the wrong shape for kanban
  lanes; `TodayTaskRow` untouched. Refactored `buildPlanning` to share a pure `laneOf()` (P1 output
  byte-identical); extracted the mode toggle to `kit/PlanningModes.jsx` to keep `Planning.jsx` <250.
  New: `kit/PlanningModes.jsx`; changed: `Planning.jsx`, `planningModel.js`, `kit/PlanningColumn.jsx`,
  `kit/planning.css`. **No schema, no event involvement, no Inbox-rail drag (P5), no change to any
  existing screen.** Owner-verified on Mac (a–g, incl. overdue→Today bucket-unchanged, forced-failure
  no-phantom, the chipped-off-Today flip). Save point `2439589`.
- ✅ **P3 — board mode (status kanban).** The board toggle goes live: a kanban by **status** — three
  columns **To do** (`open`) / **In progress** (`in_progress`) / **Done** (`done`) of top-level task
  cards. Drag a card to a column → write `status` via the **existing** `updateTask(id,{status})` (the
  status pill's path); the DB trigger `tasks_sync_completed_at` owns `completed_at` (Done stamps it,
  re-open nulls it) — so board-complete is byte-identical to completing anywhere else. Columns derived
  from status at render; nothing stored. **Card** (`kit/PlanningCard.jsx`, new): category dot/tag + due
  (overdue-tinted) + subtask x/N + title — **no priority, no pill** (the column is the status); a small
  new card, not a bent `TodayTaskRow`. **Filter** (two calm selects): category (whole sub-tree, via
  `descendantIds`, + Inbox) and time (reuses P2's `laneOf` vocab — Overdue/Today/This week/Later);
  default all. **Done shows ALL done, newest-completed first, scrolling internally (no date cap).**
  Write-then-reload (no phantom); native HTML5 drag reusing `PlanningColumn`. Pure grouping/filtering in
  `buildBoard(tasks, today, filter)` (reuses `laneOf`). Board in `kit/PlanningBoard.jsx`; `PlanningModes`
  generalised to `liveModes=['time','board']` (category still inert). **P2's time-drag code UNTOUCHED,
  gated behind the toggle.** Tasks only (events have no status). New: `kit/PlanningBoard.jsx`,
  `kit/PlanningCard.jsx`; changed: `Planning.jsx`, `planningModel.js`, `kit/PlanningModes.jsx`,
  `kit/planning.css`. **No schema, no migration, no change to any existing screen.** Owner-verified on
  Mac (a–h, incl. board-complete showing done in Today + All Tasks, the completed_at round-trip,
  forced-failure no-phantom, time mode intact behind the toggle). Save point `ac1f9a2`.
- ✅ **P4 — category mode (collapsible groups).** The category toggle goes live: the backlog grouped by
  category as **collapsible groups** (NOT All Tasks' drill-in) — Inbox first, then each top-level category,
  recursively nested (3-level); expand reveals a category's own tasks (ordered, subtasks nested +
  expandable) then its sub-category groups, plus a per-group **"+ add"**; many open at once. **Coverage
  parity with All Tasks is BY CONSTRUCTION — the gate that licenses P6:** `PlanningGroup` reuses
  `allTasksModel` **verbatim** (`subtreeCount`/`inboxCount`/`ownTasks`/`orderTasks`/`childrenOf`) on the
  same read, so the task set, whole-subtree active counts, order (due-soonest, undated bottom) and
  show-done match All Tasks exactly (owner-confirmed side-by-side). Also resolves P1's "categorised-but-
  undated invisible in time mode" gap. **Included (not deferred):** subtask inline-expand + per-group
  "+ add" (existing form/insert path, prefilled category + 'This Week' to match All Tasks). Rows reuse
  `TodayTaskRow` (status pill + tap-to-edit = the one existing-path write); show-done off by default,
  counts exclude done. **All Tasks stays FULLY INTACT (untouched);** no drill-in, no recategorise drag
  (P5), no time/board/rail change, no schema. **Structure:** the verified time-mode body was extracted to
  `kit/PlanningTime.jsx` as a **pure verbatim move** (zero behaviour change), making `Planning.jsx` a thin
  three-mode shell (206 lines) — verify (f) re-exercised time-drag + board-drag to catch any move
  regression. New: `kit/PlanningTime.jsx`, `kit/PlanningCategory.jsx`, `kit/PlanningGroup.jsx`; changed:
  `Planning.jsx`, `kit/PlanningModes.jsx` (`liveModes` adds 'category'), `kit/planning.css`. Owner-verified
  on Mac (a–f, incl. side-by-side parity + the post-extraction drag re-check). Save point `4010f7a`.
- ✅ **P5 — triage: the Inbox rail goes interactive.** The time-mode Inbox rail becomes a triage
  surface, two gestures, both via existing write paths: **(1) drag** a rail card onto a time lane → the
  EXISTING `handleDrop → planDrop → updateTask` sets **only `due_date`** (an undated dump) → it leaves
  the rail into that lane (Overdue still not a target); **(2) tap** a rail card → `TriagePopover` (new, on
  the existing `Popover` primitive): **one-tap** date chips Today/This week/Later (`planDrop` → due_date
  only) + a category step (reuses `CategoryPicker` → category_id only) + an "open full editor" link.
  **Axes independent** (owner-verified on the row): date triage writes only `due_date`, category only
  `category_id`, never both. Rail membership stays DERIVED; write-then-reload (no phantom on failure).
  **⚠️ SCOPE CORRECTION at recon (so the wrong premise dies on the record):** the original P5 spec assumed
  the rail sits beside **all three modes** and could be dragged onto **board columns + category groups**.
  What shipped has the rail in **time mode ONLY** (P3 board = filter + status columns, no rail; P4
  category folds Inbox into its first group), so those targets are never co-visible with the rail.
  Corrected (owner-approved) to **Path A** — triage where the rail lives — rather than re-architecting the
  shell to a persistent rail (which would change board/category layouts + double the Inbox in category
  mode). The category **chip** covers the rail→category outcome; the board-column-drop question is moot
  under Path A. New: `kit/TriagePopover.jsx`; changed: `kit/PlanningTime.jsx` (rail = drag source +
  tap→triage), `Planning.jsx` (thread `cats`), `kit/planning.css`. **All Tasks untouched; board/category
  unchanged; no schema.** Owner-verified on Mac (a–h, incl. axes-independent on the row + forced-failure
  no-phantom). Save point `54ec33a`.
- ✅ **P6 — fold in / retire All Tasks** *(the first deletion on this surface; staged replace-then-delete,
  two commits with a live parity gate between).* Planning's **category mode is now the sole backlog home**;
  the old All Tasks screen + route are gone. **Stage 1 — re-point (`18c5498`):** Today's bottom-left box
  → Planning ("Planning · N", N still = `activeTotal`); removed the redundant parallel "Planning →" link +
  wrapper + `onOpenAllTasks`; the `'alltasks'` route + `AllTasks` import KEPT present-but-unreachable (the
  replace half). **Owner ran a live PARITY GATE** — side-by-side category mode vs the still-present old
  screen (via a throwaway uncommitted `#alltasks` hash toggle, reverted before Stage 2) across multiple
  categories + Inbox + show-done. **Stage 2 — prove-dead deletion (`adc6b10`)**, only on the owner's OK:
  proved a CLOSED ISLAND (`AllTasks`'s only refs were LoggedIn's import + route; `CategoryDrillRow.jsx` +
  `allTasksKit.css` had zero importers outside the dead set), then **deleted (3):** `src/AllTasks.jsx`,
  `src/kit/CategoryDrillRow.jsx`, `src/kit/allTasksKit.css`, and removed the LoggedIn import + `'alltasks'`
  branch. **`allTasksModel.js` DELIBERATELY KEPT** — shared backlog logic still imported by `Today`
  (`activeTotal`) + `PlanningCategory` + `PlanningGroup` (only the *screen* + its screen-specific kit
  retired). Build clean; no surviving reference to the removed screen/route/files; no schema. Owner-verified
  on Mac (clean build/load, no console errors, no route/link to the old screen, category mode = full
  backlog, three modes + rail triage + Today/Calendar/Settings intact). Save points `18c5498` + `adc6b10`.

**🎉 Planning view P1–P6 COMPLETE (2026-06-29).** A new broadsheet planning surface, built fresh on the
existing kit, additive throughout: three modes — **time** (date lanes, drag → due_date), **board** (status
kanban, drag → status), **category** (collapsible groups, All-Tasks parity by reusing `allTasksModel`
verbatim) — plus an interactive **Inbox rail** (drag-to-lane + tap-to-triage chips). All Tasks is retired,
its backlog fully served by category mode. Only **P7 — Marty/brief** remains on the Planning track.

### Calendar V2 — motion-led upgrade ✅ COMPLETE (2026-06-30) — spec: `calendar-v2-spec.md`
The desktop Calendar (and Today, via the shared kit) given a premium motion pass + a correctness fix,
evolved in place — pure front-end, **no schema**, owner-verified on Mac + deployed at every piece.
8 pieces: **V2-0** grid alignment fix (`511ef7e`), **V2-0b** true block heights + min grab area
(`f0bf2f7`), **V2-1** colour unify → `resolveColor` (`c5f22e3`), **V2-2** shared block motion —
stagger / create-fade / completion / hover / now-line (`8ca0a7b`), **V2-3** drag feel — lift elevation
+ gutter highlight (`e563949`), **V2-4** nav transitions — reload-gate + content slide + Week↔Month
zoom (`bc0df68` / `a444cd6` / `70756b5`), **V2-6** tray squeeze (`ecdb17e`), **V2-5** swipe (`94fa792`
/ `750d4f6` / `e9a3ad3`, then the Mon-lock cleanup `0b29b10` / `0216340` / `0392665`). **The swipe
shipped MON-LOCKED** — one Mon-week per swipe via the arrow path (Today = one day, Month = one month);
the free-live day-strip was **reserved, not built** (the full arc + reasoning live in 03-decisions.md
and spec §18 — **do not rebuild as free**). **Deferred (not built):** V2-7 keyboard nav (Esc + ←/→),
V2-8 brief all-day awareness (its own `supabase/` track), standalone `onDeleteEvent` removal.
**The historical V1 Calendar rebuild (C1→C7) is recorded below.**

### Phase 7 — Calendar rebuild-and-converge (C1→C6) — spec: `calendar-uiux-spec.md`
The Calendar screen rebuilt on Today's kit so the two become ONE engine (panels →
Today's shared form; old drag hooks → Today's `useTodayGrid`). Built in small,
separately-verified pieces; old Calendar code retired conservatively in C4, not before.
- ✅ **C1 — Week-grid display (read-only).** New sealed `kit/WeekGrid` (+ `weekGrid.css`):
  full-24h sheet, 07:00 at top, internal scroll, 7 day columns; tinted **title-only** blocks
  (reuses Today's `TintedBlock`) coloured by each item's **own sub-category shade** (`resolveColor`);
  even-split overlaps; today tint + terracotta date circle + the only, **ticking** now-line; the
  past greyed under a veil. New `CalendarWeek` container + `weekNav.js` = today-anchored rolling
  home + Monday-week snapping (spec §2); **arrows + "Back to this week" live**; Week/Month toggle,
  tray and "+ Add event" are **inert, clearly-marked placeholders** (C6/C5/C2). Tap a block opens
  the **existing** `EventPanel`/`TaskPanel` (view/edit/delete preserved). Reads via `useWeekData`;
  per-week reload by remounting a keyed `WeekView` (shared hook untouched). `LoggedIn` points the
  desktop Calendar at `CalendarWeek`; the old `WeekCalendar` engine + drag hooks left in place.
  **No schema/SQL/data-layer change. The shared masthead is unchanged.** Interim gap (returns C2):
  no click-to-create / drag-resize on the new grid yet. Save point `7e62078`.
- ✅ **C2 — Grid interactions.** The C1 week grid made interactive on a NEW kit hook,
  `kit/useWeekGrid.js` — the **deliberate, documented sibling** of Today's `useTodayGrid` (mirrors
  its snap/threshold/`blockPreview`/`createDraft` shapes + bind pattern) so C4's merge is cheap.
  `useTodayGrid` left **byte-for-byte unchanged**; the old `useEventDrag`/`useScheduleDrag` engine
  **not** revived. Adds: click-to-create (1h) / drag-to-draw-span; move; edge-resize; cross-column
  **re-day** (horizontal = day only, vertical = time, diagonal = both — a pure sideways drag never
  nudges the clock); all 15-min snap; live ghost preview + a `14:15–15:15` time label; paper-true
  lift (scale + hairline, no shadow) via week-scoped CSS (`TintedBlock` untouched); even-split
  re-splits **live** during a drag via the shared `eventLayout`. Drag a **task** off-grid →
  unschedule (clears `scheduled_start/end` via existing `onUpdateTask`; it leaves the week, survives
  in Today's lists until the C5 tray); an **event** off-grid snaps back (no write). Split
  `kit/WeekColumn.jsx` out to stay <250. **Weekend tint** (faint terracotta on Sat/Sun). Create +
  edit still use the current `EventPanel`/`TaskPanel` (shared form = C3). **No schema; writes via
  existing `useWeekData`.** Save point `0815323`. *(CHECKER: the off-grid unschedule write; that
  Today is unchanged; that sideways re-day keeps the time.)*
- ✅ **C3 — The shared form.** Promoted Today's `TodayForm` → the canonical **`kit/ItemForm.jsx`**
  (per-type fields split into `kit/ItemTypeFields.jsx` to stay <250); **both Today and Calendar now
  open the one shared form** for create + edit. Type toggle shows **only on create**; type is
  **locked on edit** (no event↔task conversion); new items default to event. Event form gains
  **All-day + Repeat as clearly-DISABLED placeholders** (all-day = C6 schema; repeat = T10).
  Calendar's `+ Add event` wired **live** (blank event form, via a `requestAdd` ref bridge);
  Tray/Month stay greyed. **Selected-block outline** on both screens (`TintedBlock` gains `selected`;
  DayGrid + WeekColumn thread `selectedId`). **Calendar delete now archives + Undo toast** (existing
  `archive.js`, matching Today — replaces the old hard delete). `useWeekData` gained `onSaveTask` +
  `reload`, and its task select now fetches `time_bucket` (so a Calendar task edit can't clobber the
  bucket). **No schema; writes via existing paths.** Old `EventPanel`/`TaskPanel`/`TaskEditForm` are
  **retired (no longer imported) but NOT deleted** — they go with the old cluster in C4. Save point
  `d0388df`. *(CHECKER: Today form unchanged bar the 2 disabled rows; Calendar delete = archive+undo;
  the one new write is the archive-delete.)*
- ✅ **C4 — Drag-logic convergence (both parts done) → the Calendar rebuild is COMPLETE.**
  - ✅ **Part 1 — remove the dead old-Calendar cluster** (pure deletion, zero behaviour change).
    Proven a closed dead set (roots `WeekCalendar.jsx` + `DayTimeline.jsx` had 0 importers; live
    bundle hashes unchanged after removal = never shipped). **Deleted (11):** `WeekCalendar`,
    `DayTimeline`, `DayColumn`, `EventBlock`, `WeekDragPreview`, `EventPanel`, `TaskPanel`,
    `useEventDrag`, `useScheduleDrag`, `eventPanel.css`, `dayTimeline.css`. **Kept (live):** `NowLine`
    (DayAgenda), `eventLayout` (new engine), `calendar.css` + `DayAgenda` (LoggedIn). **Left
    (still referenced):** `TaskEditForm` — used by `TaskRow` (a separate old task-list cluster:
    `TaskRow ← TaskBlock ← SomedayDrawer`), so out of scope here. Save point `6e2a81f`.
  - ✅ **Part 2 — collapsed `useTodayGrid` + `useWeekGrid` into ONE `kit/useGridDrag.js`** (the C2
    debt, paid). Parameterised by the proven type-(i) differences (`startMin` / `geomRef` /
    `dayStartMsAt` / `offAt` / `onOff` / `eventsShowOff` / optional `onTraySelect`); **no type-(ii)
    divergence** was found, so a full merge was safe. Both screens pass their config; the two twins
    deleted. **Today reproduced byte-for-byte** (incl. the subtlety that Today's tray drag must NOT
    set `justDragged`). Return shape unchanged → DayGrid/WeekGrid/WeekColumn untouched. Internal
    refactor, zero behaviour change. Save point `ce8d54e`.

**🎉 Phase 7 Calendar rebuild-and-converge: COMPLETE (C1→C7 + C4).** Calendar is rebuilt on Today's
kit as one engine: one grid sheet, the shared `ItemForm`, the tray, Month, the all-day band, and a
single `useGridDrag` hook shared with Today. The old Calendar cluster is gone. Remaining Phase-7
backlog is unrelated to the Calendar rebuild (mobile, Settings re-skin, recurrence T10, the old
task-list cleanup of `TaskEditForm`/`TaskRow`/`TaskBlock`/`SomedayDrawer`).
- ✅ **C5 — The unscheduled tray** (right-side **push** drawer). The tasks unscheduled in C2 finally
  get an on-Calendar home. Reuses Today's module-to-grid drag by **mirroring its tray gesture into
  `useWeekGrid`** (the documented twin) with the week's own x→day + y→time drop geometry —
  `useTodayGrid`/Today untouched, old `useScheduleDrag` not revived. New `kit/TrayDrawer.jsx` +
  `trayDrawer.css`: a flex sibling of the grid (opening squeezes the 7 columns narrower; geometry
  reads body width live, so the squeeze needs no JS), a due-soonest mini-list (tick · dot · tag ·
  title · due), inline **"+ add"**, **tick-to-complete**, **drag-a-row→1-hour block**, **click-a-row
  →shared form**; empty = blank. Tray contents = **(a) the VIEWED week** (undated + due-this-viewed-
  week, not time-blocked). `useWeekData` gained the tray query + `onAddLooseTask`; one reload
  refreshes tray + scheduled together, so **the C2 round-trip closes itself** (off-grid → back in
  tray). `CalendarWeek` Tray button live; **Month stays greyed**. **No schema; existing write paths.**
  Save point `b071c2e`. ⚠️ **OPEN GATE: squeeze readability** — verify the squeezed 7-column week is
  actually readable with real overlapping events at a normal window before calling C5 done; if tight,
  decide (overlay-below-a-width | fewer-days-in-view) together. *(CHECKER: "+ add" inserts
  time_bucket='Someday' explicitly so a loose task never lands in Today's bucket; complete + schedule
  are existing paths.)*
- ✅ **C6 — Month view + live Week/Month toggle** (read-only, zero schema). Standard 6×7 month
  (fixed to one screen, no page scroll): adjacent-month days greyed, today marked, whole-month arrows
  + "Back to this month". Cells show events + **marked** tasks (event = solid tinted dot, task =
  ring), ~3 then **"+N more"**; multi-day events as **full-width strips** across a week-row (display
  only). Colours reuse `resolveColor`. **Month never opens a form** — clicks JUMP to a week (empty/
  +N → that day's week; an item → jump + select + scroll + mark the day) via a new pure
  `navToDay(day, today)` and an additive `focus` prop threaded to `WeekView`/`WeekGrid` (undefined in
  normal Week use → unchanged). New `kit/MonthView.jsx` + `MonthCell.jsx` + `monthView.css` +
  `monthLayout.js` (pure) + **`useMonthData.js` (read-only sibling of `useWeekData`)**. Tray + "+ Add
  event" greyed in Month (week tools). Motion: month zoom-in (reduced-motion respected). Save point
  `aa9305b`. *(CHECKER: read-only — `useMonthData` only reads a month's range; no writes/schema;
  Week/Today/All Tasks/tray unchanged.)*
- ✅ **C7 — All-day band + multi-day editing** (the ONLY DB change in the rebuild). ⚠️ **SCHEMA:**
  `db/10_events_all_day.sql` adds `events.all_day boolean not null default false` (additive,
  idempotent, existing rows → false). **Migration-first + verified-applied on the LIVE table** before
  any UI (probe: `select=all_day` flipped `42703 → 200`; owner confirmed rows intact). Model **(a)**:
  `all_day` flag + start/end carry the date(s), stored at local midnight, **end-EXCLUSIVE**. Reads
  flag-aware (`useWeekData`/`useMonthData`). The shared form's **All-day toggle is live** (on → hide
  time fields, date-only fields, write midnight/end-exclusive, item moves to the band; off → timed
  block) — one shared form. New `kit/AllDayBand.jsx` + `allDayBand.css` + `kit/useBandDrag.js`
  (day-grained): band above the timed grid in a sticky head+band block, auto-height, multi-day bars,
  **collapses when empty**; click empty cell → create (form, all-day preset), drag bar → move, drag
  edge → span; past bars grey. `WeekGrid` timed columns get **only timed events** (all-day → band), so
  the timed even-split/overlap is untouched. `monthLayout` all-day-aware (all-day → strip). Save
  points `41c654b` (migration) + `2da8d97` (UI). **CHECKER: the schema change is flagged here; timed
  grid / tray / Today / All Tasks / old engine untouched.**

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
- ✅ **T10 — Recurring events + tasks** *(large; shipped 2026-07-03)* — see the T10 entry above /
  `03-decisions.md`.
- ✅ **Auth — email + password** (replaced magic link; closed single-user; forgot-password reset).
  AUTH-1 (add) + AUTH-2 (cutover) done + deployed; magic link removed from the UI (provider left on
  as the recovery backstop — see AUTH-2 note). Owner to final-verify password login on Mac + phone.
  - ✅ **AUTH-1 — add email+password (magic link KEPT).** Frankfurt Auth: **public signup disabled**
    (`disable_signup=true`); email provider already on (so password works); magic link **left ON**.
    New broadsheet login (email+password + "Forgot password?" + a kept "email me a login link"),
    a reset page (`updateUser` on PASSWORD_RECOVERY), no "create account". No app-data/schema change.
    Save point `20f68c8`. **AUTH-2 is GATED on the owner verifying email+password + reset + that
    magic link still works (Mac + phone) — do NOT disable magic link before then.**
  - ✅ **AUTH-2 — the cutover (magic link removed from the UI; deployed).** Login is now
    email+password + "Forgot password?" only (magic-link UI + handler removed). ⚠️ **Constraint:**
    this project's Auth has NO flag to disable magic-link-only — it shares the email provider with
    password, so disabling it would break password+reset (lockout). So the cutover is **UI-level**;
    the email provider stays ON (needed for password + reset) and is thus the **recovery backstop**
    (dashboard can still send a magic link / set a password). Owner chose to proceed despite AUTH-1
    not having been separately deployed/verified-in-prod. Save point `e3348da`. Deployed with
    AUTH-1 + SUB.
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

## 🔨 Marty track (M0–M9) — make the Telegram bot conversational   ← IN PROGRESS (backend)
A separate, **backend-only** track (`supabase/functions/` only — never `src/`) that
grows Marty from capture/undo/brief into a real assistant you can talk to: questions,
edit/delete by chat, multi-turn capture, category learning, voice notes, an
interactive brief, and daytime nudges. Numbered **M0–M9** (not "Phase 8") so it never
collides with the paused Phase 7 redesign numbering. **Full plan:** `08-marty-upgrade.md`.
**Ground rules:** backend only; protect the spine (add tables, don't change meaning;
RLS stays owner-only). Only M0 is built; M1–M9 are the intended shape, each built as
its own small, owner-verified piece.
- ✅ **M0 — Prep + one Gemini config seam (backend, no behaviour change).** Added this
  plan doc as the track's rollback anchor; routed BOTH Gemini callers
  (`telegram/understand.ts`, `brief/write.ts`) through one shared `_shared/gemini.ts`
  (key + model + endpoint + fetch/retry/429 in one place), so a later switch to a paid
  key is a one-place change. Pure refactor — capture, events, and the brief behave
  exactly as before. Each caller kept its OWN parsing + OWN fallback.
- ✅ **M1 — the router + read-only questions (backend, deployed Frankfurt).** Pulled
  routing out of `index.ts` into `route.ts` (thin front door: security → owner gate →
  text → hand off). Added a Gemini **intent step** (`intent.ts`, via the M0 seam, temp 0)
  that labels each message **question / capture / unclear** — on a genuine toss-up it
  returns **unclear** and Marty ASKS rather than risk a wrong save. New **read-only**
  query path (`query.ts`, imports only `select` — no write code at all) answers three
  question types: **what's on [day]**, **what did I forget** (overdue + due today), **am
  I free [day/part]**. Plain-text answers; capture unchanged.
- ✅ **M2 — undo foundation (done; SQL run + checker-signed-off).** New table
  `marty_actions`: one row = one action, JSONB `items` with room for prior-state. Undo
  grammar: **"undo"** = whole last action, **"undo <name>"** = one item, ambiguous → ask.
  Surgical + owner-only. (Old `telegram_saves` superseded, left in place.)
- ✅ **M3 — edit + delete by chat (built + deployed, no schema change).** Four ops, each
  riding the M2 undo: **complete** ("done X"), **reschedule** ("move X to Tuesday"),
  **rename** ("rename X to Y"), **delete** ("delete the 3pm" = archive; undo restores
  exactly). `find.ts` locates the target active-only and **acts on exactly one match,
  asks when several, says so when none**. Each op logs prior state to `marty_actions`
  FIRST, then applies surgically (owner-filtered). **Piece 0:** bare-date fix (a bare
  month-day never resolves to the past — Gemini rule + code guard). Tidied the M2 checker
  nit (owner filter on the log's own deletes).
- ✅ **M3.5 — Marty's delete reconciled with the app's Archive (no schema change).** M3's
  delete left `archive_batch_id` NULL, so a text-deleted item never showed in the app's
  Archive screen (recoverable only by Marty's one-level undo, then lost to both). Now
  Marty's delete creates a real `archive_batches` row + stamps `archive_batch_id` like the
  app's `archiveTask`/`archiveEvent`, so it **shows in Archive + restores there** AND stays
  Marty-undoable (undo reverts rows + removes the empty batch). One archive system, not two.
- ✅ **M4 — multi-turn capture (done; SQL run + checker-approved).** Event missing its time →
  Marty asks ONCE and saves on the reply. At most one follow-up; complete captures + plain
  tasks save with no question. State in `marty_pending` (one row/owner, ~5-min expiry); only
  the very next message completes it (and only a time); anything else drops it cleanly.
- ✅ **M5 — multi-item capture (built + deployed; no schema change).** One message → several
  items: all clear → saved together (undo pulls all); exactly ONE missing a time → **save the
  clear ones now** and ask about just that one (parked question linked to the batch's action,
  so the answer completes into the SAME action — undo still pulls the whole batch); 2+ missing
  a time → save the clear ones and list which still need one (no multiple follow-ups). Reuses
  M2 batch parsing + M4 pending — no new mechanism.
- 🔨 **M6 — category guessing that learns (built + deployed; AWAITING SQL run + checker).**
  Capture now GUESSES a category from the owner's real categories and SHOWS it (Inbox when
  nothing fits); a worded correction ("that's Errands") refiles that item via the M3 edit
  path (undoable). Corrections logged to new table **`marty_category_learning`**; a learned
  preference applies only after the SAME kind of correction happens **2** times (threshold),
  then similar captures auto-file there — a one-off never retrains. **Not done until
  `db/13_marty_category_learning.sql` is run and the checker signs off.** (Guessing is live
  on deploy; learning activates once the SQL is run.)
- ✅ **M7 — voice notes (built + deployed; no schema change).** A Telegram voice note is
  transcribed (Gemini audio via the M0 seam, free tier) and the transcript runs through the
  SAME `route()` as a typed message — capture / multi-item / category guess / follow-up all
  apply. Every reply is prefixed **`Heard: "…"`** so a mis-hear is obvious + undoable.
  Owner's call: FULL PARITY (voice can do everything typed can; echo + undo are the net).
  Fixes the old "non-text silently dropped". Typed path unchanged.
- 🔨 **M8 — interactive + smarter brief (built + deployed; AWAITING SQL run + checker).**
  Part A: the 7am brief now LEADS with the schedule and footers due/overdue under NEEDS
  ATTENTION (same caps: one nudge + one gap). Part B: the brief numbers its actionable items
  + appends a "Reply to act" list; **"done 1" / "move 3 to Friday"** act on the EXACT briefed
  item via M3's edit engine (undoable); names still work. Number→item map stored at send-time
  (owner's choice) in new table **`marty_brief`** (one row/owner, no FK to spine). **Not done
  until `db/14_marty_brief.sql` is run and the checker signs off.** (Numbers only show once the
  map can store — i.e. after the SQL.)
- 🔨 **M9 — daytime opportunity nudges (built + deployed; AWAITING SQL run + checker).** The
  highest nag-risk piece — guardrails ARE the feature. The brief function's new NUDGE mode
  (same cron/pg_net + DST-safe gate) offers ONE calm use of a 60+ min free window: most-overdue
  task, or one quick-win. Hard caps: 9–6 only, max 2/day (1 morning + 1 afternoon), never
  back-to-back — via new table **`marty_nudges`**. "yes" blocks the task into the slot via M3's
  edit engine (undoable); "no" closes it for today (no memory). "nudge test" verifies on demand;
  `db/16` is the production cron (owner-run). **Not done until `db/15_marty_nudges.sql` is run +
  checker signs off.**
- ✅ **M10 — hardening pass (DONE; all four pieces + deployed).** (1) Retired the test scaffolding
  (owner confirmed no every-3-min cron): removed "brief test" 0-day, the brief's `force`/hour-gate
  bypass, "nudge test" force. "brief"/"nudge" remain as on-demand triggers through the FULLY-
  guardrailed path — `scanForNudge()` always enforces 9–6 + max-2/day + never-back-to-back, no
  bypass anywhere. (2) Gemini retry fails fast on deterministic 4xx, keeps the transient retry.
  (3) `edit.ts` split → leaf `editcore.ts` (242→203), identical behaviour. (4) Nudge "yes"
  re-checks the slot is still free → no double-book. No schema change; cron jobs untouched.
- **🎉 The Marty backend track (M0–M10) is COMPLETE.** Conversational + proactive Marty, end to
  end, all undoable, all free-tier. The paused Phase 7 front-end redesign is the next track to
  resume (Settings re-skin, mobile, T12).
- **M-track feature phases M0–M9 are all BUILT.** Once M6/M8/M9 clear their SQL+checker gates,
  the conversational + proactive Marty is complete; only the M10 hardening pass remains.

## ✅ Health → Gym "The Form Guide" — the G-track   ← MODULE COMPLETE (G1–G16)
> **🎉 The Gym/Health module is COMPLETE (G0–G16), owner-verified.** Shipped end to end: the read-only Hevy
> pipe (G1 connect · G2 tables · G3 backfill · G4 incremental sync · G5 twice-daily cron + Settings status ·
> G6 exercise-templates dictionary), the on-read calc layer (G7), the Form Guide front page + 5 zones +
> code-templated headline (G8–G11), the session report (G12), the Archive (G13), Records + pins (G14), the
> proactive brief line (G15), and the finishing audit + `pretty()` dedupe (G16). **One open item, deliberately
> deferred to V2:** the front page does **not** hold desktop zero-scroll (it stacks 5 zones in one column and
> scrolls) — densifying it to one viewport is its own careful later piece (per-zone re-verify), **a chosen
> deferral, not a bug.** Mobile Health/Gym is also a later spec.

The first **Health-pillar** module: a **read-only** cache of your **Hevy** workouts,
reported on four **desktop** screens under a new **Health** section
(nav: Today · Calendar · **Health** · Settings; view id `health`; **Gym is Health's
front page** for now). Never writes to Hevy, **no AI**. **Full plan:**
`09-gym-form-guide.md`. **Ground rules:** read-only; additive tables, no spine FK;
RLS owner-only; free tiers; units kg + h:mm; **desktop only — mobile deferred**.

> **⚠️ TWO TRACKS RUN AT ONCE — they must NEVER share a commit.** Phase 7
> (front-end redesign, **paused**) and this G-track (**active**) run in parallel.
> A Gym front-end piece is **new files only** (may touch `LoggedIn.jsx` + the `NAV`
> array in `EditionHeader.jsx`, nothing else in the shell); **never one commit that
> mixes `src/` with `supabase/functions/`**. DB pieces are checker-gated, own commit.

- ✅ **G0 — Lock the spec into the brain (paperwork only).** Created
  `09-gym-form-guide.md`; recorded the locked decisions (`03-decisions.md`), the
  Fraunces big-numbers exception (`06-design.md`), and the four-screen Health spec
  (`07-ux-flows.md`). Name is **Health** from line one. No code.
- ✅ **G1 — Prove the Hevy connection (plumbing).** New **private** edge function
  `supabase/functions/gym/index.ts` (jwt-verified, like `brief`) calling Hevy
  `GET /v1/workouts/count` with the secret `HEVY_API_KEY`. Deployed Frankfurt;
  **owner-verified — real count `92` came back.** Hevy exposed no rate-limit
  headers on this endpoint (confirm the real ceiling at G3's paginated backfill).
- 🔨 **G2 — The gym tables (schema, checker-gated).** `gym_workouts`
  (`unique(user_id, hevy_id)`), `gym_exercises` (with `exercise_template_id`),
  `gym_sets`, `gym_sync_state` (PK=user_id), `gym_pins` — additive, owner-RLS, no
  spine FK; intra-module FKs only. **SQL written (`db/17`–`db/21`, commit `e9238a9`,
  own SQL commit). AWAITING checker sign-off + owner run on Frankfurt + device-verify**
  — not done until all three. NEXT after that: G3.
- ⬜ **G3 — Backfill (one-shot, re-runnable = the recovery net).** Pull full Hevy
  history (paginated `/v1/workouts`) into the tables.
- 🔨 **G4 — Incremental sync logic.** Read `/v1/workouts/events` since the last sync
  (`gym_sync_state`) and upsert changes / remove deletes. **Built (backend only): `gym`
  function gains a `"sync"` mode** (`sync.ts` + events fetcher + delete-by-hevy_id + cursor).
  Delete signal confirmed live (`{type:"deleted", id, deleted_at}`); collect-then-apply,
  updates-before-deletes, explicit-delete-only, cursor advances on a clean pass. **Awaiting
  the owner's five-check verify (no-op / edit / add / delete-removes-one / backfill-recovers)
  before G5.** "Deployed" ≠ "done".
- 🔨 **G5 — Twice-daily cron + a Settings "Hevy" status line.** Two commits.
  **Commit A (DB) — ✅ DONE & verified:** `db/22_gym_sync_cron.sql`,
  `gym-twice-daily-sync` at `0 4,18 * * *` (06:00 & 20:00 Ams summer / 05:00 & 19:00
  winter), reusing the **confirmed** Vault secret `brief_service_role_key` to call
  `gym` `{"mode":"sync"}`. Run live + checker + manual-fire all passed.
  **Commit B (src/ only) — built, awaiting owner's Mac check:** a read-only Settings
  line "Hevy · connected · last synced Xh ago" (`src/kit/HevyStatus.jsx`), reading
  `gym_sync_state.last_synced_at`; status + freshness only, never the key, no controls.
  *(Backlog flagged: the `marty-daytime-nudge` cron uses a nonexistent vault secret and
  is silently no-op'ing — its own Marty-track fix, recorded in the handoff.)*
- 🔨 **G6 — Exercise-templates lookup.** Built from `/v1/exercise_templates` (muscle
  groups), keyed by `exercise_template_id`; backfillable without re-pulling history.
  **Table `gym_exercise_templates` written (`db/23`, commit `289ec79`) + `gym`
  `"sync_templates"` fill mode built/deployed.** Shape confirmed live (437 templates;
  `primary_muscle_group` + `secondary_muscle_groups[]` + type/equipment/is_custom, raw).
  **Awaiting checker sign-off + owner run + JOIN verify** — not done until all three.
- 🔨 **G7 — calc layer + Health shell (front-end, new files; run as TWO src/ commits).**
  *(Owner reordered the doc's G7/G8: calc first, shell second.)*
  **Commit A — the calc util ✅ BUILT (awaiting owner hand-verify of the numbers):** pure
  `src/gym/gymCalc.js` (Epley 1RM, PR=heaviest, total volume, top-set, warm-up exclusion via
  exact `"warmup"`, streak/consistency, body-part split, rolling-7-day box score) + a thin
  `src/gym/gymLoad.js` fetcher + a **throwaway** `calccheck.html` harness (removed in Commit B).
  Nothing visible in the app. **✅ Owner hand-verified the numbers against real Hevy sessions.**
  **Commit B — Health nav + empty Form Guide shell ✅ BUILT (awaiting owner's Mac check):** `health` view +
  branch in `LoggedIn.jsx`, NAV label `Health` (third) in `EditionHeader.jsx`, new `src/Health.jsx` + gym kit
  `src/kit/FormGuideHead.jsx`/`formGuide.css` (serif "The Form Guide" nameplate, dateline, calm placeholder —
  no data zones yet); calc-check scaffolding removed. Owner decision: consistency headline = sessions-per-week.
- 🔨 **G8 — the code-templated story headline (NO AI) ✅ BUILT (awaiting Mac check).** *(The doc's original
  "G8 = calc util" was folded into G7 Commit A; the owner reassigned G8 to the front-page story headline.)*
  `gymStory.js` (pure, deterministic, zero AI/API) + `StoryHeadline.jsx` (kit): one Fraunces lead line at the
  TOP of the Form Guide, assembled from code templates filled with calc-layer numbers. Priority: PR → back
  after a gap (≥10d) → volume up (≥+15%) → ≥3 sessions → lighter week (≤−15%) → plain note → quiet-week
  fallback. Reuses gymCalc/gymTrend on gymDates; display-only.
- 🔨 **G9 — Front page zones 1–2** (two src/ commits; both BUILT, awaiting final Mac check of the chart).
  **Commit A ✅ owner-verified:** removed the duplicate in-page header (deleted `FormGuideHead.jsx`; Health now
  sits under the shared masthead) + the rolling-7-day **box-score band** (`BoxScoreBand.jsx` + `gymFormat.js`).
  **+ TZ fix ✅ owner-verified:** box score / training-days / streak now share one Europe/Amsterdam calendar-day
  helper (`gymDates.js`) — Sessions reads the true 6, stable across time of day. **Commit B ✅ BUILT (awaiting
  Mac check):** a hand-rolled inline-SVG **trend chart** (`TrendChart.jsx` + calc `gymTrend.js`), no new dep —
  toggle: weekly volume (default) / weekly sessions / most-frequent lift's est-1RM; latest weekly point matches
  the band (Node-verified). Display-only.
- 🔨 **G10 — Front page zone 3: consistency heatmap ✅ BUILT (awaiting Mac check).** `gymHeatmap.js` (calc) +
  `ConsistencyHeatmap.jsx` (kit): a ~12-week grid of rolling 7-Amsterdam-day columns (last column = the band
  window, so it agrees with band/streak — Node-verified), calm terracotta tints graded by sets/day. Leads with
  **sessions-per-week** (G7 headline decision); daily streak is a small secondary figure. Display-only.
- 🔨 **G11 — Front page zones 4–5 ✅ BUILT (awaiting Mac check). FRONT PAGE COMPLETE (zones 1–5).**
  **Commit A:** body-part balance (`gymBalance.js` + `MuscleBalance.jsx`) — last-7-days working sets per PRIMARY
  muscle group (G6 dictionary join, resolved in the UI), ranked calm bars, same window as the band.
  **Commit B:** recent-sessions table (`gymSessions.js` + `RecentSessions.jsx`) — date · title · volume · time ·
  a PR dot (reuses `prWeight`, warm-ups excluded), newest-first, "show all" toggle, static rows (G12 opens them).
- 🔨 **G12 — Session report ✅ BUILT (awaiting Mac check).** Drill-in for one workout, reached by tapping a
  recent-sessions row (`SessionReport.jsx` + `SessionExercise.jsx` kit + `sessionReport.css`). Header (title,
  Amsterdam date, totals) + a templated "new best" line (`gymStory.sessionStory`, no AI, reuses PR logic);
  a line per exercise (resolved name + muscle, top set · volume · est 1RM) that EXPANDS its set table
  (weight×reps/reps/duration, set type, RPE) with warm-ups marked + excluded from the best mark. Nav = a
  sub-state inside Health (`openId`), no new top-level nav. Display-only.
- 🔨 **G13 — Archive ✅ BUILT (awaiting Mac check).** Full history grouped by Amsterdam month, newest first
  (`GymArchive.jsx` + calc `gymArchive.js` + `gymArchive.css`): per-month subtotal (sessions · volume · time) +
  an all-time head line; an exercise-name search (case-insensitive substring on resolved titles); rows reuse
  the recent-sessions look and tap into the **G12 SessionReport as-is** (back → Archive). Entry = a "The full
  archive →" link under the Recent-sessions zone; nav via Health `view` state ('front' | 'archive'), no new
  top-level nav. Display-only; renders the full history (~92 rows; trivial — would paginate at thousands).
- 🔨 **G14 — Records ✅ BUILT (awaiting Mac check). First front-end WRITE in the module.** Per-lift PR
  (heaviest working set + Amsterdam date) + best est-1RM (`GymRecords.jsx` + calc `gymRecords.js`); PIN/UNPIN
  to the existing `gym_pins` (`gymPins.js` — upsert ignoreDuplicates / delete, no user_id passed (RLS default),
  optimistic + revert on error, the app's `{error}` pattern); pinned lifts featured first, then most-trained,
  then alphabetical; a hand-rolled SVG **top-set climb chart** (`ClimbChart.jsx`, PR point marked) for pinned/
  expanded lifts. Entry = a "Records →" link by the Archive link; Health `view` state gains 'records'.
  src/-only (a runtime write, no schema change).
- 🔨 **G15 — the proactive hook (BACKEND) ✅ BUILT (awaiting deploy + brief verify).** *(Story headline +
  polish was reassigned: the headline shipped at G8; G15 is now the optional Gym line in the morning brief.)*
  `brief/gym.ts` (read-only, AI-free, degrade-safe) returns AT MOST ONE line — a fresh PR (last session ≤2
  days, heaviest-weight PR, warm-ups excluded) OR a real gap (≥3 days since training); most mornings null.
  `brief/index.ts` appends it AFTER Gemini wrote the prose (gym data never reaches the model). Backend-only
  commit; deploy `brief` WITH jwt. **NEXT: G16 polish + end-to-end.**
- ✅ **G16 — finishing polish + end-to-end audit. MODULE CLOSED.** Full walkthrough audit (all four screens,
  every empty/edge state, units/dates/type, dead code): the module is clean. Only code change was a pure
  refactor — three identical `pretty()` muscle-name helpers merged into one `prettyMuscle()` in
  `gym/gymFormat` (identical output; `src/`-only commit `a5acc5c`). Chart motion left static by choice.
  **DEFERRED TO V2 (owner's call, recorded — not a bug, not forgotten):** the front page does not hold
  **zero-scroll** — it stacks the headline + 5 full-width zones in one ~900px column and scrolls on a laptop.
  Densifying it (tighter 2-column grid / smaller charts to fit one viewport) is its **own careful later piece**
  with per-zone re-verification. Everything else is finished + verified.

*(Mobile Health/Gym is a deliberately deferred later spec — not in G0–G16.)*

---

## 🛌 Track S — Health → Sleep & Body Stats   ← NEW (full plan: 10-sleep-body-stats.md)

Health's second sub-section: Sleep + Body Stats. Reads Apple Health (Watch sleep,
smart-scale body) by PUSH — an Apple Shortcut fires 4×/day → private Edge Function.
Active coach, LOGIC-ONLY V1 (no AI; paid no-training key is a later piece). Goals
owner-set; nudges via Marty. Additive tables, RLS, free-tier, two-track.

- ✅ S0 — Paperwork (this plan + 02/03). No code.
- 🟦 S1 — Prove the pipe (Edge Function + test Shortcut returns 200; no DB/UI).
       DEPLOYED + server-verified by curl (correct secret → 200 `ok:true`; bad/no
       secret → 401). Secret `HEALTH_INGEST_SECRET` set. Closes when the owner's
       iPhone Shortcut shows `ok:true`.
- 🟦 S2 — Tables (sleep_nights, body_metrics, health_goals). CHECKER-GATED, own commit.
       SQL written + committed (`db/24_sleep_body_tables.sql`); tables CONFIRMED LIVE
       (verified via API). Closes on the checker's explicit sign-off.
- 🟦 S3a — Body ingest + backfill (generic). health-ingest accepts {kind:"body",
       readings:[…]} → upserts body_metrics. DEPLOYED + server-verified (DB-level dedupe,
       latest-wins, skip-count, auth). Closes when the owner's backfill Shortcut fills
       real rows back toward 1 Jan 2026.
- 🟦 S3c — activity_hourly table (hourly buckets: steps/active_energy/heart_rate).
       SQL written + committed (`db/25_activity_hourly.sql`). CHECKER-GATED — closes on
       the checker's sign-off + the owner running it live. (Ingest wiring is a later piece.)
- 🟦 S3b — Sleep ingest ({kind:"sleep"} → sleep_nights, one row/night). DEPLOYED +
       server-verified: sessionises per-stage segments, drops naps, sums stages,
       idempotent. Closes when the owner's sleep Shortcut sends real nights.
- 🟦 S4 — 4×/day automation + Settings "last received" line. DONE (awaiting owner's
       Mac check of the status line). Part A: owner wired 3 grouped shortcuts (Activity/
       Body/Sleep) under a "Health Sync" master, 4 Time-of-Day automations 06/12/18/00
       with Run Immediately ON — pipe now self-feeds. Part B: read-only HealthStatus block
       in Settings (per-metric "last received"), mirrors HevyStatus. Cleanup done: sleep
       source normalised to "apple-health"; an S3a test batch (24-Jun) purged; all
       metric_type now canonical lowercase. (Carried items #1/#2 closed.)
- 🟦 S5 — Calc layer (compute-on-read, pure). BUILT + owner-verified via a throwaway
       #health-debug readout (since removed): 7/30/90 presets, trend, goals, gap-pausing
       streak, bedtime consistency. (heart_rate averages per day — fix verified.)
- 🟦 S5b — Store sleep SEGMENTS as a nullable jsonb column on sleep_nights (the hypnogram
       source). CHECKER-APPROVED + run live; function deployed. Per-night ordered
       {stage,start,end}; older rows stay null (page falls back to a proportion band).
- 🟦 Health Hub — section front (Sleep · Body · Gym cards) replaces the Gym-only Health
       landing; real headline numbers + "as of" freshness; Gym page wrapped unchanged.
       BUILT + owner-verified.
- 🟦 S6 — Sleep front page (Night/Week/Month; interactive hypnogram + proportion-band
       fallback; bar→night drill-in; zero-scroll night view). BUILT + owner-verified.
       Full locked spec in 03-decisions.md.
- 🟦 S7 — Body front page (read-only). Latest / Week / Month / 90-day range switcher;
       Composition group (weight/body_fat/lean — value + age + trend + 90-day sparkline,
       fat-vs-lean composition bar with ratio-mode guard, weight goal-progress) + Vitals
       group (resting HR / respiratory as 7-day averages + personal band). Compute-on-read
       via S7-prep getters. BUILT + owner-verified. Full locked spec in 03-decisions.md.
- ✅ S8 — Drill-ins — ABSORBED, no separate piece. S6's Week/Month bar→night drill-in
       already delivers the sleep-night detail; S7's Latest/Week/Month/90 range switcher
       delivers the body-history view. Settled this session (see 03-decisions.md).
- 🟦 S9 — Goals editor (the first in-app WRITE). Inline popover from the Sleep/Body
       "set a goal" prompts: weight + body_fat (value + frozen direction), sleep duration
       + bedtime (combined editor). Append-only health_goals log (newest row wins; clear =
       active=false marker) — NO schema change needed. Optimistic write + Toast-on-failure;
       validation blocks nonsense; confirm-on-clear (no explicit undo — append-only history
       + re-set is the safety net). New Popover kit primitive. BUILT + owner-verified.
       Full spec in 03-decisions.md.
- ⬜ S10 — Coach hooks (bedtime reminder + brief lines, logic-only).  [DEFERRED — owner chose the Food module next]
- ⬜ Final — Polish + audit to the design laws.  [DEFERRED — with S10]

OPEN (Layer 4): how Gym/Sleep/Body coexist under the Health banner — gates layouts.

---

## 🍎 Track F — Food: Cookbook & Nutrition   (full plan: 11-food-nutrition.md)

The first pillar outside Health. A Nutrition logger (meal-by-meal cal+macro ledger
vs owner-set goals) + a typographic Cookbook (recipe library, cooking mode, timers),
joined by a cook→log bridge. Food data from Open Food Facts + USDA by text search
(barcode deferred to mobile). One AI touch — recipe import — on the FREE Gemini key
(recipe text isn't sensitive). Intake-reasoning (agentic meal-planner, alcohol
impact) deferred to a paid no-training key. Additive tables, RLS, free-tier,
two-track. AMENDS Gym G0: Food is its own top-level pillar, not a Health sub-section.

- ✅ F0 — Paperwork (this plan + 02/03). No code.  (commit 7e0000a)
- ✅ F1 — Tables: 5 ONLY (food_items, food_log_entries, recipes, recipe_ingredients,
       recipe_steps) in db/28_food_tables.sql. Goals reuse health_goals; drinks =
       is_alcohol+alcohol_units flag; favourites = is_favourite flag; recents derived.
       No new goals/drinks/recents tables. Checker-approved, run live on Frankfurt +
       owner-verified. (commit 507188b)
- ✅ F2 — food-search Edge Function (OFF search-a-licious + USDA POST → one shape;
       verify_jwt=true + CORS; owner food_items via caller JWT). Owner-verified: nutella
       (OFF, sodium 42.8 mg) + chicken breast raw (USDA, 112 kcal/22.5 g). (commits a973545,
       ae12aec, aea2cbb, 7ca63a4, 83b0437)
- ✅ F3 — Calc layer (compute-on-read, pure): foodCalc.js + recipeCalc.js + foodFormat.js. The 7
       getters; negative clamp in entryMacros; ±10% inclusive band; sum-per-day; no-goals path.
       Verified in Node vs real OFF/USDA records; full day/range path completes at F6. (commit c1dd0a6)
- ✅ F4 — Pillar scaffold: 5th nav pillar (TODAY·CALENDAR·HEALTH·FOOD·SETTINGS) + Log|Cookbook
       toggle (food-tabs) + warm empty states, read-only. Desktop-verified. (commit 16b11ef)
- ✅ F5 — Logger front page (read): editorial calorie arc + macro bar + meal ledger + day/week/month.
       7 files (LogPage + CalorieArc/MacroBar/MealLedger/FoodRange/FoodTrend/foodLoad). Seed-verified
       vs the F3 math; empty/no-goals real-now. (commit 466896e)
- ✅ F6 — Logging WRITES: add-food (search/saved/manual) + goals editor (reuse S9) + recents/favourites.
       foodWrite + useFoodWrites optimistic orchestration; cache-on-log dedup; edit/swap recompute.
       No schema change. Dev-server verified. (commit c70d579)
- ✅ F7 — Cookbook: cards + recipe page + cooking mode (timers) + editor + portion/weight table.
       portions.js + cookTimers parser; recipeLoad/Write + useRecipeWrites; edit rewrites children.
       No schema change. Dev-server verified. (commit 4e31c0a)
- ✅ F8 — Recipe import (AI): paste/URL → fetch → Gemini → auto-match + flag → review → save.
       recipe-import Edge Function (JSON-LD-first extract + Gemini house-schema); conservative
       comma-boundary matching; reuses food-search + the F7 editor/write. (commits 904c18e, 0c456c5)
- ✅ F9 — Cook→log bridge: "Log this meal" → inline staging (servings + slot + live preview) → a
       frozen macro snapshot (recipeMacros.perServing × servings) + recipe_id, entry_source
       'recipe_cook' into food_log_entries; stamps recipes.last_cooked_at (forward-only; undo
       restores prior). Cook-only swap DROPPED. Lights the ledger cook entry + the "cooked" sort.
       Two-track: db/29 last_cooked_at (own commit, run live) → src → docs. (commits f20d1fc db,
       bcf9fc9 src)
- ⬜ F10 — Alcohol-lite: drinks (units + kcal), daily/weekly count.
- ⬜ F11 — Polish + audit to the design laws.

### Food V2 — the in-place upgrade (P0–P8 + P9 CLEANUP DONE; full detail in 04-handoff-log.md)
DONE + committed: P0 (schema + getters), P1 (food-search reranker + Basics + fallback, live), P2
(converged finder), P3 (logSnapshot + last_cooked_at compute-on-read), P4 (logger read), P5 (logger
write: estimate + save-as-meal + quick-add meals), P6 (cookbook: library/recipe page/editor + AI
rescue), P7 (marquee cook page + resume-a-cook; finish-together→SEQUENTIAL amendment — deferred until
a trustworthy dep source exists; scheduler built dep-ready), P8 (cook→log staging sheet). P9 CLEANUP
done: dead recipes.last_cooked_at column dropped (db/35, checker-gated; P3 entry-gate re-cleared on
real data first), dead-code sweep, brain-doc amendments recorded (03-decisions.md).

- ✅ SESSION-SURFACING — DONE (owner-verified): A route/view persistence (dd9f1ae; app-wide, shipped +
     verified alone across every pillar) + C done-card (255d610) + B resume banner (553ceb4). db/35
     last_cooked_at drop confirmed live. **FOOD V2 UPGRADE FULLY CLOSED — no tracked Food work remains.**

OPEN: caching live API hits into food_items (the cache-on-select write) lands at F6, not F2
      (F2 is read-only).   F4 — nav order of the five pillars.
SETTLED AT RECON: 5 tables only; goals/drinks/recents reuse; ±10% on-target band;
      portion table for ingredient→weight (F7, an F0 amendment); USDA_FDC_API_KEY owner-supplied.
F2 LIVE NOTES: OFF search = search-a-licious (search.openfoodfacts.org); world.openfoodfacts.org
      search 503s. USDA = POST body (nginx 400s on percent-encoded parens in a GET dataType).
      Secrets: USDA_FDC_API_KEY, OFF_CONTACT_EMAIL (User-Agent contact, never hardcoded).

---

## ⬜ Phase 8 — Signals & polish
Turn on the activity log; smooth rough edges; make it nice to look at.
**Done when:** V1 done, foundations quietly logging for the future.

---

## ⬜ Later — Health pillar, then Life pillar
Each is its own cluster of phases that ADDS tables and screens and writes
tasks into the core. We do not touch the spine.

---

## Session notes (most recent on top)
- **2026-06-29 — Track F — Food F9 — the cook→log bridge (two-track; commits f20d1fc db + bcf9fc9 src).** The piece that
  finally joins the two halves: a cooked recipe → a logged meal in the day's ledger. The FIRST schema change since
  F1 — checker-gated: `db/29_recipe_last_cooked.sql` adds ONE nullable column `recipes.last_cooked_at` (additive, RLS
  inherited, no backfill), its own commit, run live on Frankfurt + cache-reloaded + device-verified BEFORE any src.
  Everything else REUSES existing columns — the cook entry is a `food_log_entries` row with the 7-number snapshot,
  `recipe_id` set, `entry_source='recipe_cook'` (already allowed by the F1 CHECK), `amount`=servings, `unit`='serving',
  `food_item_id` null. NEW: `LogMealPanel` (ONE shared inline staging panel — servings stepper + slot defaulting to
  time-of-day + a live `recipeMacros.perServing × servings` preview + the "~ N unestimated" honesty note; two
  triggers: the recipe page's "Log this meal" + cook mode's "Done cooking"). `useCookLog` COMPOSES the F6
  `logEntry`/`removeEntry` primitives + a small `stampLastCooked` with the F6 optimistic/undo/error-toast pattern
  (NOT a forked write path). THE UNDO RULE: capture the PRIOR `last_cooked_at`, restore it on undo (the earlier real
  date, NOT null); ALL-OR-NOTHING — entry first, then stamp; a stamp failure rolls the entry back, so a failed log
  leaves nothing. The snapshot is FROZEN (later recipe edits never rewrite logged history) and stores only MATCHED
  ingredients (an approximate recipe's logged kcal is a known undercount; the staging note is the honesty). Wired:
  the ledger cook entry (title + kcal; expand → "View recipe", a cross-tab Log→Cookbook jump via FoodPage); the
  EditEntryPanel recipe variant (edit SERVINGS not grams, no swap — the arithmetic rescale falls out of
  entryToFood/entryMacros); the "cooked" sort (last_cooked_at desc, never-cooked after, faintly tagged; grid refreshes
  on return); the recipe-page "Last cooked <date>" line. `slotForHour` moved to `foodCalc` (one definition).
  Owner-verified by row on the dev server: snapshot = preview, reload-persists, undo-restores-prior (tested on an
  already-cooked recipe), forced-failure left no entry + last_cooked_at unchanged, servings-rescale arithmetic, the
  cooked sort, the cross-tab link. RECONCILES: cook-only ingredient swap DROPPED (log then edit); last_cooked_at
  FORWARD-ONLY (stored, not derived — undo restores prior, a LATER ledger-delete does NOT roll it back). **NEXT:
  F10 — alcohol-lite: drinks (units + kcal) via the existing is_alcohol/alcohol_units flags, daily/weekly count.**
- **2026-06-29 — Track F — Food F8 — recipe import, the ONE AI touch (two-track; commits 904c18e fn + 0c456c5 src).**
  Paste text OR a URL → a recipe pre-fills the F7 editor (the review screen) → spot-check → save via the F7 create
  path. New private Edge Function `recipe-import` (verify_jwt=true, CORS like food-search): for a URL, server-side
  fetch + extract (schema.org/Recipe JSON-LD first, else stripped page text) → `callGemini` (FREE key, the shared
  seam) with a strict house-schema responseSchema → defensive JSON parse. Only recipe text leaves the app (paste /
  page text) — nothing personal/logged — so the free key is fine. ONE AbortController + timer wrap BOTH `fetch()`
  AND `res.text()` (a body-read hang was freezing the UI; now aborts at 8s → clean fetch_fail), plus a 25s client
  backstop so the UI can never hang. Distinct errors: fetch_fail / parse_fail / unreachable (a transport failure
  never masquerades as "not a recipe"). Ingredient auto-match reuses food-search, CLEAR HITS ONLY via a conservative
  comma-boundary rule (`recipeMatch`: exact or leads with "<parsed>," → keeps "Garlic, raw" + "chicken breast" →
  "Chicken, breast…", rejects "Garlic Baguettes"/"Peanut butter"); ambiguous stay flagged text; every match shows
  its food name + kcal in the editor (the spot-check). Save reuses F7 + stores `source_url`; the recipe page shows a
  "from <host>" provenance link. NO new write path, NO schema change. Verified on messy inputs (live URL, blog,
  paywalled→paste, paste, junk→parse_fail, the freeze site). **HAZARD logged: the Edge Function can be evicted on
  free-tier idle — if import says "couldn't reach the import service," REDEPLOY recipe-import before debugging (cost
  a full round this session).** **NEXT: F9 — the cook→log bridge: "Cook this" → a staged draft (servings + slot +
  optional cook-only ingredient swap) → log a macro SNAPSHOT.**
- **2026-06-28 — Track F — Food F7 — the Cookbook (recipe writes; src/ only, commit 4e31c0a).** The other half of the
  Food pillar. `portions.js` — a curated household→grams table + resolver ("1 onion"→110 g; food-aware
  cup/tbsp/tsp, generic fallback; off-list → grams-prompt → no-macros) — the F0 amendment. `cookTimers.js` — the
  step-duration parser (catches min/hour/sec/decimals/bare units; RANGES take the LOWER end; first match; no match
  → no auto-timer). `recipeLoad.js` / `recipeWrite.js` / `useRecipeWrites.js` — create/edit/delete across recipes +
  recipe_ingredients + recipe_steps; EDIT rewrites children (delete + re-insert; the recipe row stamps updated_at
  explicitly), CREATE rolls back its orphan on a mid-save failure (no half-written recipe). The EDITOR adds
  ingredients via the F6 search + cache-on-log + a portions-aware amount step, with live `recipeMacros`; title-only
  required (drafts ok). The LIBRARY: a typographic card grid (title · time · servings · kcal/serving) + a sort
  toggle (added/cooked/A–Z; "cooked" falls back to added-order until F9, not a dead end) + an onboarding empty
  state (import stubbed → F8). The RECIPE PAGE: breadcrumb (Cookbook ▸ Recipe), the full per-serving macro block,
  per-ingredient kcal + an unmatched MARK + a ~approximate total signal, a VIEW-ONLY servings stepper (rescales
  live, never mutates the saved recipe), Cook + Log-this-meal (stub → F9) + Edit + delete (⋯ confirm; history
  preserved via `food_log_entries.recipe_id` SET NULL). COOKING MODE: a reflow toggle (not a route) — bigger steps,
  collapsed ingredients, auto-detected step timers + a free manual timer running CONCURRENTLY in a floating
  summary, tap-step-done, Wake Lock + a keep-awake indicator + release-on-exit (graceful fallback). Cook progress
  is ephemeral (no DB). NO schema change (existing F1 tables; archive deferred → confirm-delete only). Dev-server
  verified (recipe rows persist + edit advances updated_at + rewrites children + delete cascades; the parser +
  portions resolutions; forced-failure leaves no orphan). **NEXT: F8 — recipe import (the one AI touch): paste
  text/URL → server-side fetch → Gemini extract → auto-match + flag → a review screen → save; URL-fail → paste.**
- **2026-06-28 — Track F — Food F6 — logging WRITES (the first Food write track; src/ only, commit c70d579).** Turned
  F5's stubbed affordances into real actions. `foodWrite.js` (logEntry/updateEntry/removeEntry, cacheFoodOnLog
  upsert, insertManualFood, setFavourite) + `useFoodWrites.js` (optimistic add/edit/delete — the change shows at
  once, REVERTS + toasts on failure (no silent loss), undo on add & delete). The add-food modal: a DEBOUNCED live
  search via the food-search Edge Function (the FIRST app→Edge-Function call) + a manual form (per-serving →
  per-100g normalisation). CACHE-ON-LOG: logging a searched OFF/USDA food upserts it into `food_items` on the
  unique (user_id,source,source_ref) — links, never duplicates — and the entry FKs to it, so names always resolve
  (closes the F5 manual-name gap; manual adds also create a `food_items` row). Edit panel: amount/slot/swap/remove,
  recomputing the snapshot via `entryMacros` (per-100g reverse-derived from the stored snapshot) and stamping
  `updated_at` EXPLICITLY (no auto-update trigger → keeps verify-by-updated_at honest). Favourite star + a quick-add
  strip (blended favourites+recents → the pre-filled amount step). Goals editor popover (calories required, P/C/F
  optional) reusing the S9 `useGoalWrites`/Popover/Toast + append-only set + clear-confirm. Seams: hour→slot
  04–11/11–16/16–22/else-Snacks; serving-else-gram chips; quick-add opens the pre-filled amount step. NO schema
  change (existing tables only — src-only, no checker gate). Verified on the dev server (cache reuse + name; manual
  round-trip; edit/swap recompute + updated_at advance; remove+undo; favourite persists; goals show targets only
  for set macros; forced-failure reverts). **NEXT: F7 — the Cookbook: cards + recipe page + cooking mode (concurrent
  timers) + recipe create/edit + the curated portion/weight table (portions.js).**
- **2026-06-28 — Track F — Food F5 — the Logger front page (read-only; src/ only, commit 466896e).** The first Food
  screen with real content. Fills FoodPage's Log tab via a new 7-file set: `foodLoad.js` (fetch-only entries +
  name resolution), `LogPage.jsx` (orchestrator — Day/Week/Month switcher + chevron date nav, load-once /
  slice-client-side), `CalorieArc.jsx` (the NEW 270°-open SVG ring — a faint track + ink value arc filled via
  `stroke-dasharray`/`stroke-dashoffset` so a single CSS transition animates the sweep; consumed kcal big in
  Fraunces at centre; a faint concentric terracotta over-arc past goal), `MacroBar.jsx` (day = P/C/F PROPORTION
  by calories via macroSplit + grams/faint-targets), `MealLedger.jsx` (4 slots + subtotals, CAP rows + "+N more",
  tap-row → full 7 numbers + an Edit affordance), `FoodRange.jsx` + `FoodTrend.jsx` (Week/Month avg-arc +
  calories trend + per-day list → drill-in; aggregate macros = AVG-GRAMS-vs-goal, intentionally different from the
  day proportion). FoodTrend MIRRORS BodyChart's full chart with `foodFormat` (Body left untouched — its chart is
  metric-coupled and would mis-format kcal). EVERY number comes from the F3 getters; components do no macro math.
  Names resolve via `food_item_id → food_items.name` / `recipe_id → recipes.title` (the loader joins). Accent only
  on the over-arc, the today kicker, the active range tab. READ-ONLY — the +add/Edit/recents affordances are placed
  but stubbed (actions are F6). **Verified:** State A (empty + no-goals) real-now; B–E seed-verified against the F3
  math (150 g chicken + 30 g nutella → 330 kcal, P 35.6/120 · C 17.3/240 · F 12.2/70, sodium 112 mg; over-arc;
  week/month reframe); day view held desktop zero-scroll; the precise seed cleanup left all three tables at 0.
  Carry-forward: a manual entry has no stored name → F6's manual-add creates a food_items row for it (no schema
  change). **NEXT: F6 — logging WRITES: add-food (search/saved/manual) + the goals editor (reuse the S9 popover) +
  recents/favourites; wire ONE food end-to-end first.**
- **2026-06-28 — Track F — Food F4 — pillar scaffold (read-only shell; src/ only, commit 16b11ef).** Food is now
  the 5th top-level pillar (nav order TODAY · CALENDAR · HEALTH · FOOD · SETTINGS — additive; the other four
  untouched). Tapping Food lands on the Log; a Log | Cookbook toggle (Log default) switches the two faces,
  mirroring the BodyPage tab pattern as its own `food-tabs` class (no cross-coupling to Body's CSS). No top-level
  back button (Food's a pillar — you leave via the nav; back arrives with F7's recipe drill-in). The loading
  branch + a self-contained spinner are present for F5 but inert now — F4 renders content directly (no perpetual
  spinner). Warm one-line empty states under each tab (G16 warm-edge law), not a cold "no data". READ-ONLY: no
  calc, no fetch, no writes. Files: `src/food/FoodPage.jsx` + `foodPage.css`, plus the `EditionHeader` NAV add and
  the `LoggedIn` `view==='food'` branch. Desktop-verified (nav order, lands on Log, toggle, warm tabs, zero-scroll,
  other pillars unchanged). Phone five-item nav-wrap = DEFERRED to the mobile layer (Food's design laws are
  desktop-only by design), not an open gap. **NEXT: F5 — the Logger front page (read): the editorial calorie arc
  + macro stacked bar + meal ledger + day/week/month range switcher + the muted set-targets prompt.**
- **2026-06-28 — Track F — Food F3 — the calc layer (compute-on-read, pure; src/ only, commit c1dd0a6).** Built
  `src/food/foodCalc.js` + `recipeCalc.js` + `foodFormat.js` — the 7 locked getters that turn raw rows into every
  number the Food screens show, mirroring the Body utils (reuses `presetRange`/`statsForRange` + the shared
  Amsterdam-day helper; no new day definition). Key design: a log entry STORES its 7-number macro snapshot, so
  `entryMacros` computes that snapshot at WRITE time (F6/recipe-cook) while `dailyTotals`/`dayLedger` read entries
  that already carry the numbers and just SUM — so `dailyTotals` is a NEW sum-per-day primitive (nutrition sums
  where Body averages; the Body daily-collapse is deliberately NOT reused). The NEGATIVE CLAMP lives in
  `entryMacros` (USDA's −0.428 carbs → 0). `dayLedger` = 4 meal slots + subtotals + day total + alcohol-lite
  {units,kcal} + ±10% vs-goal per macro (edges INCLUSIVE; 0/null target → null) + a `hasGoals` flag for the
  no-goals "set your targets" path (no crash, no fake 0 target). `macroSplit` by CALORIES (4/4/9 Atwater);
  `calorieArc` (no goal → no arc fill); `rangeTotals` averages over LOGGED days only (reuses the Body windowing);
  `recipeMacros` → total + per-serving (÷servings) + `unestimatedCount` (never hide). **Verified by running the
  files in Node against REAL OFF/USDA records** (day total 329.7 kcal / 35.64 g protein / 111.54 mg sodium; clamp;
  inclusive band; recipe per-serving + unestimatedCount; null shows "—" on an item but adds as 0 in a total). The
  full stored-entries → day → range path completes end-to-end only once F6 writes exist (not fake-greened).
  **NEXT: F4 — pillar scaffold (5th nav pillar + Log|Cookbook tabs + frame + empty states, read-only, src/ only).**
- **2026-06-28 — Track F — Food F1 + F2 — tables live + food-search shipped (schema + supabase, two-track).** F1:
  the 5 additive tables (`db/28_food_tables.sql`, commit `507188b`) — checker-approved, run live on Frankfurt,
  owner-verified. Goals reuse `health_goals`; drinks = `is_alcohol`+`alcohol_units` on the log; favourites =
  `is_favourite` flag; recents derived (no new goals/drinks/recents tables). F2: the private `food-search` edge
  function (commits `a973545` → `83b0437`) — the FIRST app→Edge-Function call (`verify_jwt=true`, called as the
  owner; needed CORS, the second new-ground thing). Read-only text search normalising the owner's saved
  `food_items` (read via the caller's JWT under RLS), Open Food Facts and USDA FoodData Central into ONE per-100g
  record; missing numbers null (never 0); each source degrades independently. **Owner-verified on device:** nutella
  (OFF branded jar, sodium 42.8 mg — g→mg confirmed) + chicken breast raw (USDA, 112 kcal/22.5 g protein);
  `sources {off:9, usda:10}`. Real-data fixes along the way: USDA macros key on `nutrientId` not `nutrientNumber`;
  OFF search via search-a-licious (world.openfoodfacts.org 503s); USDA via POST body (nginx 400s on percent-encoded
  parens in a GET dataType); 8s USDA timeout; drop no-kcal crowd entries. Secrets: `USDA_FDC_API_KEY`,
  `OFF_CONTACT_EMAIL` (built into the User-Agent at run time, never hardcoded — the functions dir is public).
  **NEXT: F3 — the calc layer (compute-on-read, mirror the Body utils); carry-forward: clamp negative macros to 0.**
- **2026-06-28 — Track F — Food F0 — spec locked into the brain (paperwork only, no code).** Opened the new
  **F-track** (Food: Cookbook & Nutrition) as its own **top-level pillar** — an AMENDMENT to Gym G0, which had
  parked nutrition under the Health banner (recorded openly). Created `11-food-nutrition.md` (the full spec);
  recorded the F0 locked decisions in `03-decisions.md` and this Track-F roadmap block. V1 = Cookbook +
  Nutrition logger + cook→log bridge + lite alcohol log; one AI touch (recipe import) on the FREE key (recipe
  text isn't sensitive); agentic meal-planner + barcode + alcohol-impact deferred. F1 recon settled the schema:
  **5 tables only** (`db/28_food_tables.sql`); nutrition goals reuse `health_goals`, drinks = `is_alcohol`+
  `alcohol_units` flag on the log, favourites = `is_favourite` flag + recents derived (no new goals/drinks/
  recents tables). Locked: ±10% on-target band; a curated portion/weight table at F7 (an F0 amendment beyond
  the skip-or-manual minimum); `USDA_FDC_API_KEY` owner-supplied; food-search `verify_jwt=true` (first-ever
  app→Edge-Function call). F0 done; F1–F11 not started. **NEXT: F1 — the 5 tables (schema; checker-gated, own
  SQL commit + "checker approved" + owner runs it on Frankfurt + owner verifies live before any src/).**
- **2026-06-24 — Health → Gym G2 — the gym tables written (SQL only; ⚠️ schema change, checker-gated).** Five
  additive tables (`db/17`–`db/21`, commit `e9238a9`): `gym_workouts` (unique user_id+hevy_id), `gym_exercises`
  (+exercise_template_id), `gym_sets` (+cardio cols), `gym_sync_state` (one row/owner), `gym_pins`. Owner-RLS
  on each; no spine FK; intra-module FKs only. **NOT DONE until the checker signs the four points + the owner
  runs the SQL on Frankfurt + verifies.** NEXT: G3 backfill.**
- **2026-06-24 — Health → Gym G1 — proved the Hevy connection (plumbing only; no DB, no src/).** New private
  edge function `gym` reads Hevy `/v1/workouts/count` with the secret `HEVY_API_KEY`; deployed Frankfurt and
  **owner-verified — real count `92`.** Hevy sent no rate-limit headers (confirm the ceiling at G3 backfill).
  **NEXT: G2 — the gym tables (schema; checker-gated, own SQL commit + checker + owner verify).**
- **2026-06-24 — Health → Gym G0 — locked the spec into the brain (paperwork only, no code).** Opened the new
  **G-track** (a read-only Hevy "Form Guide" under a new **Health** section — name baked in from line one).
  Created `09-gym-form-guide.md`; recorded the locked decisions (`03-decisions.md`), the Fraunces big-numbers
  exception (`06-design.md`), and the four-screen Health spec (`07-ux-flows.md`); added this G-track section
  with the two-track "never share a commit" note. G0 done; G1–G15 not started. **NEXT: G1 — a private edge
  function that returns the real Hevy workout count (plumbing only; owner verifies the count before G2).**
- **2026-06-24 — Marty track M10 Piece 1 — retired the test scaffolding. M10 + THE WHOLE M-TRACK COMPLETE.**
  Owner confirmed only two live crons (real 7am brief + real hourly nudge; NO every-3-min test job), so the
  bypass code was safe to remove. Removed: the brief `test` 0-day path (`buildAndSend()` always uses
  FORGOTTEN_DAYS), the brief `force`/hour-gate bypass (the 7am gate is now just `scheduled && localHour() !==
  SEND_HOUR`), and `scanForNudge`'s `force` param (it now ALWAYS enforces 9–6 + caps + never-back-to-back).
  Triggers: "brief" (on-demand, real-rule) and "nudge" (on-demand, fully guardrailed — offers only if it's
  genuinely 9–6, within caps, with a real window; otherwise silent). `fireBrief()`/`fireNudge()` take no
  args; "brief test"/"nudge test" gone. Confirmed by sweep: NO force/test/bypass route left in any code path
  — the only ways to fire (on-demand "brief"/"nudge" + the two live crons) all go through the guardrailed
  path. Stale comments tidied; cron jobs untouched. Deployed both functions (`bb3253a`). **The Marty backend
  track M0–M10 is DONE. NEXT: resume the paused Phase 7 front-end redesign (Settings re-skin, mobile, T12).**
- **2026-06-24 — Marty track M10 — hardening pass (pieces 2–4 done + deployed; piece 1 flagged, not done).**
  Cleanup only, as separate commits. (2) `_shared/gemini.ts`: the shared retry loop re-asked on ANY non-ok
  status; a deterministic 4xx returns the same result at temp 0, so now it fails fast on 4xx and keeps only
  the transient retry (5xx/408/network) — saves ~6s of pointless re-asks, same user-visible result
  (`49b5abc`). (3) split `edit.ts` (was 242, the engine for M3/M8/M9): commit/commitReply + Change/CommitResult
  moved to a leaf `editcore.ts`; edit.ts→203; `nudge.ts` imports from editcore now; pure move, identical
  behaviour (`12d7d32`). (4) `telegram/nudge.ts` acceptNudge re-checks the slot is still free before the
  block (the M9 checker's non-blocking flag) → declines gracefully if taken, never double-books; conservative
  on a read failure (`0ee52b8`). No schema change; deployed both functions to Frankfurt. **Piece 1 (retire
  test scaffolding) NOT done** — flagged for the owner: I can't see the live cron jobs, and removing the
  `force`/every-3-min code while a test cron still calls it would break things. Owner to run
  `select jobname, schedule, command from cron.job;` and confirm the every-3-min brief-test job is gone;
  then I'll retire "brief test" 0-day + force + "nudge test" bypass, keeping "brief"/"nudge" as
  guardrail-respecting on-demand triggers. **NEXT: owner confirms cron state → I do piece 1.**
- **2026-06-24 — Marty track M9 — daytime opportunity nudges (built + deployed; AWAITING SQL + checker). END
  OF THE M-TRACK FEATURE PHASES.** Highest nag-risk, so guardrails are the feature. Surfaced two decisions
  first (owner chose: add the `marty_nudges` table; keep all test scaffolding). Built a NUDGE mode into the
  brief function (`brief/nudge.ts`, reuses cron/pg_net + DST-safe local-hour gate): scans for a 60+ min free
  window 9–6, offers the most-overdue task or one quick-win, enforces max 2/day (1 morning + 1 afternoon)
  + never-back-to-back via `marty_nudges`. "yes" → blocks the task into the slot through M3's edit engine
  (exported `commitReply` — undoable); "no" → closes today's offer (no block, no memory). Telegram:
  "nudge test" trigger (mirrors "brief test"), yes/no routing that only fires when an offer is open (no
  regression to done-1 / pending / classify). `db/16` = production cron (owner-run; verify via "nudge test"
  instead). Kept "brief test" + force per owner. ⚠️ **SCHEMA CHANGE — checker-gated like M2/M4/M6/M8: not
  done until `db/15_marty_nudges.sql` is run AND the checker reviews.** Committed `2a15010`; deployed BOTH
  functions to Frankfurt. **NEXT: owner runs SQL → phone checks → checker sign-off. That completes M0–M9;
  only the M10 hardening cleanup remains (deferred).**
- **2026-06-24 — Marty track M8 — interactive + smarter brief (built + deployed; AWAITING SQL + checker).**
  Surfaced the state decision first; owner chose to STORE the number-map at send-time (vs fragile
  re-derive). Part A reordered the existing brief (schedule leads; due/overdue → NEEDS ATTENTION footer;
  same one-nudge/one-gap caps) in `day.ts` + `write.ts` prompt — didn't rebuild it. Part B: threaded row
  IDs through `day.ts`, new `brief/actions.ts` builds a deduped numbered list + map, `brief/store.ts`
  parks it in the new `marty_brief` table at send-time; `telegram/briefmap.ts` reads it; `intent.ts`
  gained `target_number`; `edit.ts handleEdit` gained a forced-target path so "done 1" acts on the EXACT
  briefed row via the existing M3 edit engine (undoable); names still work. ⚠️ **SCHEMA CHANGE —
  checker-gated like M2/M4/M6: not done until `db/14_marty_brief.sql` is run AND the checker reviews.**
  Numbers only show once the map can store (so pre-SQL the brief is just the reorder). Committed `33610a1`;
  deployed BOTH functions to Frankfurt (brief genuinely changed this time). **NEXT: owner runs SQL → phone
  checks → checker sign-off; then M9 — daytime nudges.** (Note: `edit.ts` is 240 lines — split candidate
  for M10.)
- **2026-06-23 — Marty track M7 — voice notes (built + deployed; no schema change).** Speak to Marty. A
  voice note is transcribed and the transcript runs through the EXACT SAME pipeline as typed — nothing
  re-implemented. Surfaced the one decision first (owner chose FULL PARITY: voice can do everything typed
  can, with the echo + undo as the safety net). Built: `_shared/gemini.ts` factored a shared `post()` core
  and added `transcribeAudio` (inline audio part, same key/model/endpoint/retry, free tier per M0);
  `voice.ts` (getFile → download the OGG → base64 → transcribe via the seam); `index.ts` now detects
  `message.voice` where non-text was silently dropped, transcribes, feeds the transcript to `route()`, and
  prefixes the reply with `Heard: "…"`. Typed path byte-for-byte unchanged (echo empty). No `src/`, no
  schema. Committed `0bf9f17`; deployed both functions to Frankfurt. **NEXT: owner runs the voice phone
  checks; then M8 — interactive brief.** (Watch: if voice transcription consistently errors, the model
  may not accept audio — the fix is to point the audio call at a fuller Gemini model in the seam.)
- **2026-06-23 — Marty track M6 — category guessing that learns (built + deployed; AWAITING SQL + checker).**
  Capture stops dumping everything in Inbox. New `categorize.ts`: `guessCategories` reads the owner's REAL
  categories (excludes the literal "Inbox" → null) + the learned corrections; a met learned preference wins
  (>= LEARN_THRESHOLD=2 corrections to the same category among items sharing a content word), else the AI's
  pick from the real list, else Inbox. The guess is SHOWN in the confirmation. `save.ts` now writes the
  guessed `category_id` (threaded through saveBatch + appendToAction). Worded correction "that's Errands"
  → new `categorize` op in the classifier + `opCategorize` in edit.ts, which refiles via the EXISTING edit
  commit path (undoable) and logs the correction on success (`marty_category_learning`, a new table). Found
  M3 had NO category op — added one on M3's machinery (not a parallel path). Confirmed Inbox = null (the
  seeded Inbox row is excluded from guesses). ⚠️ **SCHEMA CHANGE — checker-gated like M2/M4: not done until
  `db/13_marty_category_learning.sql` is run AND the checker reviews. Threshold = 2.** Guessing is live on
  deploy (reads existing categories); learning activates after the SQL. Committed `d432a49`; deployed both
  functions to Frankfurt. **NEXT: owner runs the SQL → phone checks → checker sign-off; then M7 — voice
  notes.**
- **2026-06-23 — Marty track M5 — multi-item capture (built + deployed; no schema change).** One message →
  several items with clear-save-ask-unclear. Confirmed the batch parsing already existed (M2) — extended it
  rather than rebuilt. Rule: all clear → save together; exactly ONE missing a time → save the clear ones
  immediately and ask about only that one; 2+ missing a time → save the clear ones and list which still
  need a time (no multiple follow-ups — the simplest-safe choice the owner approved). The unclear-item
  follow-up reuses M4's `marty_pending`; the parked draft now also stores the batch's create-action id, so
  the answer is APPENDED to that action (via new `appendToAction`) — undo still pulls the whole batch as
  one. `save.ts` grew `saveItemsTracked`/`appendToAction` (logCreate returns the action id); no second
  pending mechanism, no schema change. Committed `5890cd6`; deployed both functions to Frankfurt. **NEXT:
  owner runs the phone checks; then M6 — category learning.** (M5 = multi-item capture shifted the later
  phases down one → track now M0–M10.)
- **2026-06-23 — Marty track M4 — multi-turn capture (built + deployed; AWAITING SQL + checker).** First
  time the bot remembers across two messages. When a capture is an event missing its time, Marty asks once
  ("What time?") and completes on the reply. Owner-approved the storage decision up front: a tiny new table
  `marty_pending` (one row/owner, PK user_id, ~5-min code expiry) over flaky in-memory. Built: `needs_time`
  on the parser (`understand.ts`); `pending.ts` (get/set/clear + parseTimeAnswer that only accepts a reply
  that's essentially just a time, so a command/question/new-capture is never mis-attached; completePending
  saves via the normal path → Inbox, undoable); `route.ts` pending-answer check at the top + a one-time
  follow-up in the capture branch. Discipline held: at most one follow-up; complete captures save with no
  question; a non-answer drops the parked question cleanly. ⚠️ **SCHEMA CHANGE — checker-gated like M2: not
  done until `db/12_marty_pending.sql` is run AND the checker reviews.** Code deploys safely before the SQL
  (setPending fails → falls back to a normal save). Committed `367dce2`; deployed both functions to
  Frankfurt. **NEXT: owner runs the SQL → phone checks → checker sign-off; then M5 — category learning.**
- **2026-06-23 — Marty track M3.5 — reconcile Marty's delete with the app's Archive (no schema change).**
  Closed a data-loss gap: M3's text-delete archived an item (set `archived_at`) but left `archive_batch_id`
  NULL, so it never appeared in the app's Archive screen — recoverable only by Marty's one-level undo, then
  lost to BOTH paths once another action moved past it. Read the app's `src/archive.js` to match its pattern
  exactly: `opDelete` now creates an `archive_batches` row (label = title, source_type) and stamps
  `archive_batch_id` on the row(s) + subtasks, like `archiveTask`/`archiveEvent`. So a text-deleted item now
  shows in Archive and restores there, AND Marty's undo still reverts it exactly (now also deleting the
  empty batch, like the app's restore). No second/parallel archive state. Backend only; no `src/` touched;
  no schema change. Committed `f2edb88`; deployed both functions to Frankfurt. **NEXT: owner runs the 4
  recovery checks; then M4 — multi-turn capture.** Don't start M4 until M3.5 verifies.
- **2026-06-23 — Marty track M3 — edit + delete by chat (built + deployed, no schema change).** Marty can
  now CHANGE existing items, every change riding the M2 undo. Four ops: complete ("done X"), reschedule
  ("move X to Tuesday"), rename ("rename X to Y"), delete ("delete the 3pm"). New `find.ts` locates the
  target (active-only) and acts only on EXACTLY one match — asks when several, says so when none. Each op
  logs prior state to `marty_actions` BEFORE changing (complete/reschedule/rename = `edit` action, undo
  PATCHes before-values; delete = ARCHIVE, undo clears `archived_at` → restores exactly, cascades
  subtasks). **Piece 0:** fixed the bare-date bug (a bare month-day never resolves to the past — Gemini
  rule + a code guard scoped by a `bare_date` flag so "yesterday" is safe). Classifier gained an `edit`
  kind (one call). Tidied the M2 checker nit (owner filter on the log's own deletes). Uses M2's table —
  no schema change. Committed `a13613d`; deployed both functions to Frankfurt. **NEXT: owner runs the
  per-op phone checks; then M4 — multi-turn capture.** Don't start M4 until M3 verifies.
- **2026-06-23 — Marty track M2 — undo foundation (built + deployed; AWAITING SQL + checker).** Built the
  load-bearing mechanism to reverse anything Marty touches, BEFORE any edit/delete feature exists. New
  table `marty_actions` (`db/11_marty_actions.sql`) is a generalised action log: one row = one action,
  JSONB `items` array holds 1+ items with room for prior-state (so M3 edit/delete needs no schema change);
  only `kind='create'` is written today. Undo grammar in `undo.ts`: "undo" reverses the whole last action,
  "undo <name>" reverses one item, ambiguous → ask. To prove batch undo, capture (`understand.ts`/`save.ts`)
  now parses several items per message and logs them as ONE action. Surgical + owner-only — never touches
  hand-made app rows. Committed `894b120`; deployed both functions to Frankfurt. **⚠️ THIS CHANGES THE DB:
  not done until the owner runs `db/11_marty_actions.sql` AND the checker reviews.** **NEXT: owner runs
  the SQL → phone checks → checker sign-off; then M3 — edit/delete/move.** Don't start M3 until M2 is
  checker-approved.
- **2026-06-23 — Marty track M1 — conversational queries (read-only), deployed.** Marty now answers
  questions and changes nothing. Split routing out of `telegram/index.ts` into `route.ts` (index is now
  just security + owner gate + text check + hand-off); added `intent.ts` (Gemini classifies
  question/capture/unclear via the M0 seam, temp 0 — "unclear" makes Marty ASK rather than risk a wrong
  save) and `query.ts` (read-only **by construction** — imports only `select`, no write code anywhere).
  Three question types: what's-on-[day], what-did-I-forget (overdue + due today), am-I-free-[day/part].
  Capture path untouched (`understand.ts` unchanged). All files <250 lines. Committed `6775646`;
  **deployed both functions to Frankfurt** (telegram changed; brief unchanged, redeployed for parity).
  Known bare-date bug respected, not fixed (the "forgot" answer can show a phantom-overdue task). **NEXT:
  owner runs the phone checks; then M2 — edit/delete/move by chat.** Don't start M2 until M1 verifies.
- **2026-06-23 — Marty track M0 — prep + one Gemini config seam (backend only, no behaviour change).**
  Opened the backend Marty track (M0–M9) to make the bot conversational, kept entirely separate from
  the paused Phase 7 front-end redesign (different folder: `supabase/functions/` vs `src/`). Two commits:
  (1) docs rollback anchor `7afca2e` — added `08-marty-upgrade.md`, paused Phase 7, recorded the M0–M9
  numbering decision; (2) the Gemini seam — one shared `_shared/gemini.ts` (key + model + endpoint +
  retry/429 in one place), both callers (`telegram/understand.ts`, `brief/write.ts`) point at it and
  keep their own parsing + fallback. Pure refactor; `GEMINI_API_KEY` now read in ONE place; "go paid"
  is a one-secret swap. **NEXT: owner deploys the two functions + verifies capture/event/brief unchanged,
  then M1 — the router.** Don't start M1 until M0 verifies.
- **2026-06-23 — Phase 7, AUTH-2 — the cutover: magic link removed from the UI; email+password
  deployed (first deploy carrying AUTH-1 + SUB + AUTH-2).** Found AUTH-1 had never been deployed
  (prod = `fa3bfc2`, magic-link-only), so password login wasn't verified in production — I STOPPED and
  asked; the owner chose to **proceed with the full cutover**. Removed the magic-link UI from the
  login (email+password + "Forgot password?" only; no sign-up). **Auth-config constraint:** there's no
  flag to disable magic-link-only (it shares the email provider with password — disabling it would
  lockout), so I made **no config change**; the cutover is UI-level and the email provider stays ON as
  the **recovery backstop** (dashboard can re-send a magic link / set a password). Pushed + deployed.
  Save point `e3348da`. ⚠️ Owner must final-verify password login on Mac + phone (keep a Supabase
  dashboard tab open to re-enable if needed). **NEXT: owner verifies; then Calendar (re-skin-vs-
  rebuild), Settings re-skin, mobile, T12.**
- **2026-06-23 — Phase 7, AUTH-1 DONE — email + password login added (magic link STAYS as the safety
  net).** Frankfurt Auth: **public sign-up disabled** (`disable_signup=true`, closed single-user);
  the email provider was already on so password sign-in is additive; **magic link left ENABLED**.
  Built the broadsheet login (blackletter masthead, **email + password**, "Log in", "Forgot
  password?", and a kept **"email me a login link"** fallback — no "create account"), and a **reset
  page** (App intercepts the PASSWORD_RECOVERY session → set new password via `updateUser`). Uses the
  existing Supabase methods (`signInWithPassword` / `resetPasswordForEmail` / `signInWithOtp` /
  `updateUser`). NO app data/schema/other-screen change. **No lockout:** the live site (old login)
  still does magic link, which works for the existing owner even with signups closed. Save point
  `20f68c8`. ⚠️ **Owner must DEPLOY (or run locally) to test — login can't be exercised otherwise.**
  Owner then: set a password (Forgot-password flow or dashboard "Send password recovery"), log in
  with email+password on Mac AND phone, test reset, and confirm **magic link still works**. **AUTH-2
  (disable magic link) must NOT run until the owner confirms all that.** **NEXT: deploy AUTH-1 →
  owner verifies → AUTH-2; plus Calendar / Settings re-skin / mobile / T12.**
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
