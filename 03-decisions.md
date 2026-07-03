# LifeOS — Decisions

> I am the record of "what we chose and why," so we never re-argue settled
> things or contradict ourselves. LIVING doc — add to me, never silently
> reverse me. New decisions on top.

## Format
**[Decision]** — the choice. **Why:** the reason. **Trade-off:** what we gave up.

---

## Cook running-marker mirrors the Focus pattern — 2026-07-03

- **[FEATURE] Global cook-session header marker shipped.** A running cook now shows the same
  global header marker as Focus — pulsing terracotta dot + live elapsed, far-right of the nav,
  on every screen; tap → popover with Open / Finish. Finish = set status='done' + deep-jump into
  that recipe with the staging sheet open (exact "Done cooking" parity, reached from the header).
  **Why:** the owner had no way to end a cook from outside the cook page itself.
- **[LAYOUT] Dual markers sit side by side in a right-pinned flex container** — cook left of
  focus, nav never shifts. **Why:** avoids hardcoded offset numbers; flex handles any combination
  (focus-only, cook-only, both). **Trade-off:** lightly lifts Focus's own `right:1rem` absolute
  positioning into the shared container — layout-only, Focus logic/data untouched.
- **[BUILD] Parallel twin, not a shared extraction.** Cook marker is its own CSS classes + JSX,
  mirroring Focus identically. Focus code is not touched. **Why:** zero regression risk.
  **Trade-off:** a future refactor could extract one shared NavMarker component; deferred.
- **[ELAPSED] Uses `created_at` from cook_session** (when the row was first inserted, = first
  interaction in the cook). No schema change needed. **Trade-off:** a few seconds off from when
  the user tapped "Cook" — negligible.
- **Src-only, no schema change.** Nothing for the Checker.

---

## Recurring events + tasks — T10 shipped (schema + 6 src pieces) — 2026-07-03

The full repeating-events-and-tasks feature (commits 4e2f22f schema → 692cb42). One checker-gated
schema commit, then six src-only build pieces.

- **[FEATURE] Recurring events + tasks shipped.** Patterns: Daily / Weekly (chosen weekdays) /
  Monthly (same date) / Yearly, each ending Never / After N times / Until a date. BOTH events and
  tasks can repeat. **Why:** the common, useful set without over-building (no every-N, no
  monthly-by-weekday). **Trade-off:** the rarer patterns aren't available.
- **[ARCHITECTURE] Approach A — "materialise".** Each occurrence is a REAL events/tasks row generated
  from a retained recipe (the new `recurrences` table); occurrences render through the existing
  Week/Today/Month pipeline with NO new drawing code. **Why:** single-occurrence edit/move/complete
  and independently-completing recurring tasks come free; the recipe stays for regeneration + future
  Apple sync. **Trade-off:** many rows per series (bounded up front / forever topped up lazily).
- **[DST] Wall-clock time + a fixed timezone (Europe/Amsterdam).** Each occurrence's exact instant is
  computed per-date by a hand-rolled Intl-based generator (no rrule.js, no date library), reusing the
  gymDates.js pattern. **Why:** "09:00 every Monday" stays 09:00 across the clock change; no
  dependency added. **Trade-off:** none of note.
- **[TOP-UP] Bounded repeats materialise fully up front; "forever" repeats keep a ~12-month window
  and top up LAZILY client-side on Week/Month navigation** (a strictly-after-generated_until
  duplicate guard). **Why:** avoids server infra (no cron/edge). **Trade-off:** a far-future jump
  tops up on arrival, not before.
- **[EDIT MODEL] This one / This and following / All** (a calm hairline scope prompt). "This one"
  DETACHES it (series_detached); "All" updates recipe + non-detached occurrences; "This and
  following" bounds the old recipe + archives the non-detached future + creates a new recipe
  (split_parent_id) carrying the change. A detached (customised) occurrence is PRESERVED by
  series-level edits. **Why:** the standard calendar mental model; edit protects your work.
  **Trade-off:** changing the PATTERN itself via edit is deferred (delete + recreate for now).
- **[DELETE MODEL] Same three scopes, but DELIBERATELY DIFFERENT from edit: a series-scope delete
  removes EVERYTHING in scope INCLUDING detached occurrences** ("All" also retires the recipe). All
  modes are undoable via the existing archive-batch (one batch = one Undo). **Why:** deleting a
  series should leave nothing behind — edit protects work, delete is a clean sweep. **Trade-off:**
  none.
- **[RENDERING] A small NEUTRAL-ink hairline loop (↻) top-right on repeat occurrences** (Week +
  Today, events and tasks); one-offs show none; intentionally SKIPPED on the tiny Month cells (calm).
  A single "Repeats" dropdown in the shared form reveals a compact detail line (weekday chooser / end
  option) when a repeat is chosen. **Why:** quiet at-a-glance repeat cue; terracotta stays reserved.
- **[TASK BEHAVIOUR] A recurring task is due-dated by default; if the recipe carries a wall-clock
  time, each occurrence is ALSO calendar-scheduled** (mirrors a single task). Decided by wall_time
  presence — no extra column. **Why:** matches how one-off tasks behave. **Trade-off:** none.
- **[TODAY FETCH] Today's event fetch brought in line with the Week (all_day + overlap) via a new
  useTodayData hook (also the Today.jsx split, 584→508).** All-day / multi-day events + all-day
  repeats now render on Today in a calm all-day strip reusing the week band's look. **Why:** all-day
  repeats must render on Today too; the split was overdue. **Trade-off:** Today.jsx still ~508 (render
  bulk); Today's strip is view-only (no drag) for now.

## Calendar/Today event-vs-task block distinction (src-only) — 2026-07-03

Two src commits (e965798 CSS split, 5a615b6 styling). No schema.

- **[DISTINCTION] Events vs tasks are now visually distinct on the shared calendar/Today block**
  (they were identical before). EVENT = soft category-tint fill + solid 3px left bar + title + time
  + no mark (unchanged). TASK = hollow (no fill) + hairline category outline on top/right/bottom + a
  single 3px DASHED category left edge (the dash IS the bar, not doubled) + a small neutral hairline
  RING (a true circle, `var(--rule)` — never a category colour, never terracotta) leading the title;
  the ring is STATIC, not tickable this pass. Both from the one shared block (TintedBlock), so Today
  and the Calendar week match. **Why:** the owner couldn't tell events from tasks; hollow tasks also
  read calmer (the soft fill stays the one sanctioned block fill, now reserved for events).
  **Trade-off:** none for events (byte-for-byte unchanged).
- **[HOUSEKEEPING] Block styles extracted to blockKit.css** — the `.tk-block*` rules were lifted
  out of the oversized todayKit.css (588→483) into a new small blockKit.css (~125), a pure move with
  no visual change, done first so the task styling didn't grow an already-over-ceiling file. **Why:**
  the size law (files under ~250). **Trade-off:** none — a relocation.
- **[PARKED] Two deliberate follow-ups:** (1) the done-state look on a hollow task is undesigned (a
  done task now shows hollow outline + ring PLUS the existing 60% fade + strikethrough); (2) a
  tickable to-do ring is a separate future decision. **Why:** each is its own design call, not this
  pass. **Trade-off:** a done task's look is provisional until (1) lands.

## Calendar/Today drag-END bug fixed (src-only) — 2026-07-03

The deferred drag-END bug (from the six-fix bundle below, point (viii)) is fixed in one src commit
(142379c). No schema.

- **[FIXED] The drag-END bug is resolved.** Root cause: the drag's move/release listeners lived on
  the individual blocks/columns, and the pointer-capture safety net was pinned to the dragged block
  — which is removed from the screen the moment it crosses off-grid toward the tray, so nothing
  heard the release and the drag never ended. **Fix:** move/release/cancel listeners now live on the
  WINDOW for the life of the drag; pointer capture removed as no longer needed. **Why:** a release
  must be heard wherever the cursor is, immune to the dragged block being removed mid-drag.
  **Trade-off:** none — src-only, one file (`useGridDrag.js`, the shared engine — verified on both
  Today and the Calendar week).
- **[CLOSED] Drag-a-task-to-the-tray-to-unschedule now works** (the original #3a want) as a direct
  result — the tray sits outside the grid so it already counted as "off-grid"; the existing
  unschedule rule simply couldn't run until the release was heard. No extra logic. Events dragged
  off still snap back. **Why:** the fix unblocked a rule that was already correct. **Trade-off:**
  none.
- **[KNOWN GAP — not built by ruling]** The dragged task still vanishes at the grid's right edge
  (clipped) and reappears in the tray on release, rather than sliding a ghost across. Accepted; an
  optional faint drag-ghost is a tiny follow-up if the vanish feels abrupt. **Why:** the minimal
  fix was the ask; visual polish is separable. **Trade-off:** no off-grid drag feedback for now.

## Calendar/Today six-fix bundle (src-only) — 2026-07-03

Six small display + interaction fixes on the Calendar week + Today (commits 08d893f → c553d69,
cleanup 9be564b). All front-end; no schema, nothing for the Checker.

- **[REVERSAL] The "blocks never show a time" rule is RETIRED** — the week's timed blocks now show
  start–end times, reusing Today's single `timeRange` formatter (lifted into dateUtils). **Why:**
  Today already showed times, so the rule was already false in practice; one engine, one look.
  **Trade-off:** none (all-day bars still carry no time).
- **[REMOVED] The V2-3 full-span gutter highlight is gone from BOTH screens.** **Why:** it
  contradicted its own amendment (the gutter carries no elevation/shadow) — the amendment now holds
  literally. **Trade-off:** slightly less drag feedback in the gutter; the dragged block's own lift
  remains.
- **[SHADING] Today's column background tint REMOVED; weekend tint 4% → 6%; today keeps its date
  circle + now-line.** **Why:** today (5%) and weekend (4%) were near-identical; this gives three
  distinct column looks with terracotta still rare. **Trade-off:** today no longer carries a column
  wash, only its circle + now-line.
- **[DATA] The week EVENTS fetch is now OVERLAP-based** (start < week-end AND end > week-start),
  not start-in-week. **Why:** an event starting before the visible week could never load; overlap
  is the correct general test. **Trade-off:** it also loads timed multi-day events the grid can't
  yet draw (see follow-up below).
- **[DISPLAY] Multi-day ALL-DAY bars show a date range** — title first, lighter/smaller range on
  the same one thin line, title truncates first; full month name; en-dash; the end-exclusive stored
  end has one day subtracted so it reads e.g. "July 3 – July 5"; single-day all-day = no date text.
  **Why:** an off-screen start can still communicate its true span. **Trade-off:** none.
- **[TRAY] The unscheduled tray now EXCLUDES completed (done) tasks.** **Why:** completed loose
  tasks cluttered the unscheduled drawer. **Trade-off:** none.
- **[FOLLOW-UP] Timed multi-day RENDERING (splitting a block across day columns) is accepted as
  out-of-scope for now** — the all-day case shipped. **Why:** it's a materially bigger piece and
  wasn't the request. **Trade-off:** a timed event whose start is off-screen is fetched but not
  drawn.
- **[DEFERRED] The drag-END bug is deferred to its own diagnostic piece** — releasing over the open
  tray doesn't end the drag (a pointer-up capture bug, NOT the off-grid clearing logic, which was
  proven intact). **Why:** a real bug needing focused root-cause; not ridden alongside six clean
  fixes. **Trade-off:** drag-off-to-unschedule doesn't work in practice until it lands. *(Resolved
  2026-07-03 — see "Calendar/Today drag-END bug fixed" entry above.)*

## Focus INTERVALS hand-bounded (src-only, D1–D3) — 2026-07-02

The in-focus INTERVAL timer no longer auto-advances; the owner hand-bounds every phase (commits
c80584b → eff2fcb). Intervals mode ONLY — count-up and count-down are untouched. No schema.

- **[REVERSAL] Intervals NO LONGER auto-advance.** The shipped behaviour (focus→break→focus flips on
  its own at the set length) is reversed — a manual "Enter break / End break" control switches phase.
  **Why:** the owner wants to decide when to switch, not be forced at a boundary. **Trade-off:** one
  more press per phase (the point of the fix).
- **[DISPLAY] The interval flap FLIPPED from a countdown to a COUNT-UP** — it counts up to the target,
  HOLDS there, and shows a muted "+M:SS" overage ("25:00 · +2:00"); symmetric for break in the muted
  register. **Why:** the only way "hold at target · +over" reads correctly, and it makes optional
  lengths fall out as one consistent count-up display. **Trade-off:** you watch time climb toward the
  target, not tick down. INTERVALS ONLY — count-down keeps its own countdown + terracotta overtime.
- **[CHIME] A gentle chime fires ONCE when a phase hits its target** — nothing switches on the chime;
  it only marks the line. **Why:** a nudge, not a trigger. **Trade-off:** none.
- **[COLOUR] The Enter/End break button is TERRACOTTA OUTLINE** (distinct from Stop's terracotta FILL,
  which is shared with count-up/count-down and couldn't be restyled). It is the only new terracotta;
  the "+over" counter reads muted (the interval over-state does NOT tint the flap terracotta — that
  register stays count-down's). **Why:** terracotta on the action, calm elsewhere. **Trade-off:** two
  terracotta button styles (fill vs outline) coexist.
- **[RECORDING] Overage logs as PLAIN TIME of that phase's kind** — a focus phase run to 27:00 logs as
  one 27-minute FOCUS segment at real elapsed, NOT clamped to the target, NOT split into "target +
  over", NOT a separate bucket. The "+over" is display-only; the dial + all totals see real elapsed.
  **Why:** the record is the truth. **Trade-off:** none.
- **[SETUP] Interval focus/break LENGTHS are now OPTIONAL.** A BLANK field = a pure hand-run stopwatch
  for that phase (count up, no target/hold/over/chime, ended only by the button); a SET field = the
  hold-at-target behaviour. Mixed (one blank, one set) is allowed, each phase per its own field; Setup
  remembers a blank as blank. **Why:** free hand-run sessions without inventing a target. **Trade-off:**
  the fields no longer force a number (count-down still requires its length).
- **[WRITE PATH] Interval phase boundaries are now written to the RUNNING row AS phases end** (was:
  segments written only at Stop). The current open phase persists as an end-less marker in the SAME
  `segments` jsonb column (NO new column). **Why:** a mid-session reload restores the TRUE hand-set
  split instead of re-guessing even intervals. `reconstructIntervals` is KEPT only as the fallback for
  legacy / lengthless rows with no persisted segments. The boundary save is best-effort / non-blocking
  (the phase switch never waits on it). **Trade-off:** small extra writes per phase switch (negligible).
- **[KNOWN GAP — pre-existing, not introduced here]** A mid-session reload does NOT preserve
  pause/resume history — elapsed can be slightly off if a session was paused before the reload; the
  save card corrects it at Stop. The phase SPLIT itself is now faithful across reload.

## Focus OVERVIEW redesign (src-only, P1–P6) — 2026-07-02

A full redesign of the Focus tab's Overview screen (commits afb0026 → 806f1b0, cleanup 4a7297b).
Overview-only; the in-focus timer, task-form Focus section, header marker, Calendar overlay and
Today's focus line were left untouched. No schema, no Checker.

- **[LAYOUT] Top-strip range switcher retired from the overview.** The tab opens straight into a
  two-column overview; the full-screen range view (RangeView) survives ONLY as the "expand" target.
  **Why:** frees vertical height for zero-scroll + the chart now lives in the overview. **Trade-off:**
  the switcher's Today/Week/Month/90 chrome is gone from the tab (kit/RangeSwitcher still used by Health).
- **[LAYOUT] The bar chart now lives INSIDE the overview** (was a separate switcher screen). **Why:**
  glance the week beside the dial. **Trade-off:** the chart shares a half-width column with the ledger.
- **[LAYOUT] The ledger is intentionally SHORTER** (chart-led right column). **Why:** the chart is the
  hero on the right. **Trade-off:** fewer ledger rows before "see all".
- **[CHART] Gridlines added** — faint 2h hairlines behind the bars (against the usual no-gridlines
  rule), kept hairline-faint; the "2h/4h" labels keep a small paper backing so they read behind bars.
  **Why:** a readable scale. **Trade-off:** one earned exception to "no gridlines / minimal fills."
- **[CHART] Day totals ALWAYS shown above the bars** (not hover-only); hover adds per-segment category
  NAME + duration — the names are the colour key, so there is NO separate legend. **Why:** read the day
  at rest; name the colours on demand. **Trade-off:** hover carries the key (no always-on legend).
- **[CHART] Fixed category stack order at DRAW time** (a colour holds the same slot in every bar);
  rangeBars itself untouched. **Why:** stable reading across days. **Trade-off:** a draw-time re-sort.
- **[CHART] Rolling windows** (Week = last 7 ending today, Month ≈ 30, 90 ≈ 90) with arrow-stepping by
  the window's length. Month/90d SUPPRESS per-bar totals + day-letters (too many bars for the half-width
  column). **Why:** honest density over collision. **Trade-off:** "expand" mainly earns its keep on Week.
- **[CHART] "expand" reuses the PLAINER RangeView** (no gridlines/totals/hover) — a visible mismatch
  with the inline chart, consciously accepted. **Why:** reuse over rebuild. **Trade-off:** the two charts
  don't match; a later parity pass is optional.
- **[CHART] Hover readout is BORDERLESS** (text on paper). **Why:** calm. **Trade-off:** none.
- **[DIAL] Midnight moved to the BOTTOM** (noon top, 6am left, 6pm right) via the SINGLE time→position
  offset (arcs + now-tick move together); eight 3-hour ticks with only the four cardinals labelled
  (00/06/12/18); the separate goal ring/notch DROPPED from the dial — the goal now lives in the centre
  text only. **Why:** a clock that reads like a day + a calmer dial. **Trade-off:** the goal is a number,
  not a rim mark.
- **[WEEK STRIP] H:MM shown INSIDE each day ring**; TERRACOTTA now means "day goal MET" (reassigned from
  "today"); TODAY = a subtle grey outline; the foot shows weekly target + trend ("X / weekly-goal · +Y
  vs avg"); tapping a day ring filters the chart + ledger to that day — a SECOND filter coexisting with
  the category filter, each with its OWN clear; the dial always stays "today" (not re-keyed). **Why:**
  the strip is the home for daily-goal progress + a quick day pivot. **Trade-off:** two independent
  filters to reason about.
- **[DROPPED BY DECISION] The running-transform** ("Start a session" → "Open the running session" under
  the dial). **Why:** it collides with the tab's running-swap AND the header "Open" marker, both out of
  this fix's scope; what it would have done (prevent a second start / redirect to the running session)
  already works today. **Trade-off:** negligible gain vs reopening a locked, verified module — a possible
  future STANDALONE piece that would need its own recon (it touches the header).

## Today task rows converged (small fix, src-only) — 2026-07-02

Both Today modules (Tasks Today + The Next 7 Days) now render ONE identical row via a
new Today-only row piece. Today-only — Planning's Time + Category rows and the form's
StatusPill left untouched. New Today-only kit pieces: TodayRow + StatusCycle. The old
TodayTaskRow + StatusPill were left intact and are now used by Planning (Time + Category)
and the form/subtasks respectively. Src-only, 3 commits, no schema, no Checker.

- [NEW BEHAVIOUR] ▶ now lives on task rows — openly reopens the Focus lock "rows stay
  clean, ▶ in the form only" (12-focus.md). Reuses the existing requestFocus({mode:'setup',
  prefill, taskId}) shim → Focus Setup prefilled with the task; blocked with the existing
  running-session nudge. Row ▶ is a quiet INK glyph, NOT terracotta (the form's ▶ stays the
  accent). Why: owner wanted start-from-the-row. Trade-off: rows slightly less bare —
  mitigated by the quiet glyph.

- [NEW BEHAVIOUR + LOOK] A single cycling status control replaces the 3-segment pill ON ROWS
  — one tap target, cycles To do → In progress → Done → back to To do (the wrap is the
  existing undo), via the existing status write path (the DB trigger still owns completed_at).
  Look = state glyph + word: open ring / half ring / filled dot, ink/muted, states by TYPE
  (To do muted · In progress ink · Done struck+greyed), no box/pill/fill. Makes In progress a
  FORCED middle step (reverses the old "one tap To do → Done; in progress optional"). A NEW
  row-only piece (StatusCycle); StatusPill kept for the task form + subtask rows (unchanged).
  Why: owner wanted one box, not three. Trade-off: a second status component — accepted.

- [NEW BEHAVIOUR] The Next 7 Days gains the status control + ▶ + a shown due date — it had no
  pill, no ▶, and hid its due dates before. Reverses "pill on Tasks Today only" and the
  hidden-due. Undated tasks keep the "undated" tag. Why: convergence.

- [LOOK] Priority removed from the row — no HIGH/MED kicker, and the bold high-priority title
  dropped too (a priority-derived render). Display-only: priority stays in the data + the task
  form; sorting/ordering UNCHANGED. Why: calm — matches the Planning card.

- Drag UNCHANGED on both (Ruling A) — recon corrected a wrong belief that Next 7 didn't drag;
  it already did (trayBind). Drag was exempt from convergence, so nothing was added or removed;
  both keep the grip → truly identical rows.

- [DEBT LOGGED] `todayKit.css` reached ~466 lines (over the ~250 guide) — this fix added the
  row + status-control styles modestly rather than split it. Joins the parked CSS/JS
  split-candidate debt (`Today.jsx`, `todayForm.css`). Split deferred, not done here.

---

## Focus module (time tracker) — 2026-07-02

- **[New Focus pillar = additive, spine-protected.]** A new `focus_sessions` table (checker
  approved, `db/36`), owner-only RLS, NO foreign key into tasks/events/categories — `task_id`/
  `category_id` are plain soft references alongside name/colour snapshots. **Why:** the
  established added-module pattern (Marty/gym/food). **Trade-off:** a deleted spine row leaves a
  stale pointer that's simply reported "already gone" — accepted.
- **[Interval segments stored as `segments jsonb` on the row, not a child table.]** **Why:** one
  atomic write, so a failed save (Wi-Fi off) reverts cleanly. **Trade-off:** no relational query
  over segments — not needed.
- **[A running session = a real row with `ended_at` NULL, written at Start.]** **Why:** the only
  way the header marker rides every screen and survives a reload cheaply. **Trade-off:** in-memory
  pause/segment history isn't persisted — a mid-session reload resumes from `started_at`, and the
  save card's editable duration corrects it. **Discard HARD-deletes** the unsaved running row;
  deleting a SAVED session **soft-archives** (`archived_at`) with an undo toast.
- **[Duration is compute-on-read, never stored.]** Only FOCUS time counts toward totals + the
  dial; interval BREAKS are logged as separate rest.
- **[Daily/weekly focus GOALS reuse the existing `health_goals` table]** (`goal_type`
  `focus_daily`/`focus_weekly`, direction `up`, unit `seconds`). **Why (ruling C, condition 1):**
  `health_goals` is a GENERIC append-only goals log already read by `resolveGoals`/`vsGoal`;
  reusing it avoids a parallel goals system. **No schema change was needed** — `health_goals.
  goal_type` is free `text` with NO check/enum, so the focus goal-types are just new VALUES the
  app writes (confirmed live; the Checker was told). **Trade-off:** a "health" table now also
  holds focus goals — purely additive, nothing about health changed.
- **[Calendar actual-layer = a terracotta hatched overlay, owner-chosen, isolated behind a toggle
  (default OFF).]** **Why:** highest regression risk (touches locked Calendar V2); OFF = the grid
  is byte-for-byte unchanged; the overlay is `pointer-events:none` so drag/create pass through.
  **Trade-off:** opt-in — hidden until the toggle is turned on.
- **[Cross-pillar wiring via window events + small module providers]** (`focusNav`,
  `FocusSessionProvider`, `FocusTotalsProvider`) instead of prop-drilling through Today/Planning/
  Calendar. **Why:** keeps those screens byte-for-byte; the row tag reads a context (null → no tag).
- **Amendments to prior locks (from the spec, called out openly):** Pomodoro REINSTATED as the
  "intervals" mode + count-down added → three modes; deep/shallow → a 1–5 star quality rating;
  the save card gains "mark task done?" — via the EXISTING status→`done` path (the trigger stamps
  `completed_at`), no new spine writer; delete = snapshot / soft-archive (block-delete parked).

## Calendar create cursor — no system green plus (2026-07-01)

- **[Empty calendar space uses a LifeOS cursor, not the OS `copy` cursor.]** The
  Today lane, Calendar week columns, and all-day strip now use a shared ink
  target cursor for create-on-grid areas. **Why:** the OS copy cursor can render
  as a green plus, which reads too loud and off-brand for the app. **Trade-off:**
  the cursor is custom CSS, with a normal crosshair fallback if a browser ever
  refuses the image cursor.

## Shared masthead — weather retired; personal edition moves right (2026-07-01)

- **[No live weather/location in the top-right header.]** The shared logged-in
  masthead now keeps only local date math: left dateline, centre LifeOS wordmark,
  right `Year XX` / `Day XX`. The old city/temp/condition widget and its fetch
  helper were removed. **Why:** the owner wanted the header calmer and the app
  below to gain vertical room; removing weather also removes a network/location
  dependency from every screen. **Trade-off:** no at-a-glance weather in LifeOS.
- **[The personal edition mark is now two-line, not under the wordmark.]** The
  centre nameplate is just `LifeOS`; the personal year/day sits as a compact
  right-side mark. **Why:** balances the dateline visually and lets the nav rule
  move up. **Trade-off:** the edition mark is less central than before.
- **[Phone nav gets its own tighter fit rule.]** At small widths the five top
  nav items use `space-between` with smaller tracking, so the shared header
  does not create sideways scroll. **Why:** the header is global; a global
  polish must be clean on phone too. **Trade-off:** the phone nav is a little
  denser than desktop.

## Calendar V2 — motion-led upgrade, COMPLETE (2026-06-30)

> Full as-built contract: `calendar-v2-spec.md` (§18 has the swipe arc). 8 pieces, each its own
> small commit, owner-verified on Mac + deployed live (V2-0, V2-0b, V2-1, V2-2, V2-3, V2-4, V2-6,
> V2-5). Pure front-end, no schema; shared-kit changes surface on Today + Calendar identically.

- **[Three amendments to prior V1 locks — recorded openly; do NOT "fix" back.]**
  (1) **No-shadow / paper-true → a faint elevation on the ACTIVELY-DRAGGED block only** (V2-3) —
  scoped to the drag moment; the still frame stays pure paper; hover/selected carry no shadow.
  (2) **"Arrows only / no date picker" → arrows + a MON-LOCKED trackpad swipe** (still no date
  picker; arrows unchanged + primary). (3) **"Today stays byte-for-byte" → Today's LOOK/MOTION comes
  along (shared kit), BEHAVIOUR stays a frozen oracle** (convergence): a changed Today colour/animation
  = success, a changed Today WRITE = regression. Sub-record: Today's block tint + row-tag dot moved
  raw → shaded `resolveColor` (V2-1, closes the colour-drift flag). **Why:** V2 was a motion-led
  premium pass — these were deliberate, owner-approved loosenings, each small. **Trade-off:** the V1
  locks must be read WITH these three.

- **[The swipe arc — locked free-live → built free-triggered → simplified to MON-LOCKED. DO NOT
  REBUILD AS FREE.]** The swipe (trackpad two-finger horizontal; wheel ≠ pointer → no collision with
  create/re-day; shared `kit/useSwipe` with axis-lock + a NON-PASSIVE `preventDefault` to kill the
  macOS history-swipe) went through three states:
  (1) **Locked FREE-LIVE** at recon — continuous finger-track, Week landing on any day via a pannable
  day-strip.
  (2) **Built FREE-TRIGGERED** — at the Week build the day-strip proved to be a large, multi-file,
  un-self-testable (blind) rebuild (synced header/band/column strips, a pan/momentum/snap/rebase
  state machine, skeleton buffers, `weekNav` free-offset) landing as ONE commit on the hardest-
  verified screen. Per the doom-loop / "fall back rather than dig" rule, took the spec's sanctioned
  fallback: commit on release (no live track), reusing the verified V2-4 slide; the fixed 7-col
  render stayed, so `dayStartMsAt` + the whole drag geometry were byte-for-byte. **The geometry GATE
  itself PASSED** (transform-aware `getBoundingClientRect` self-corrects) — the risk was the
  surrounding blind rebuild, not the rect math.
  (3) **Simplified to MON-LOCKED (owner decision)** — the free/any-day window was dropped; the Week
  swipe now behaves EXACTLY like the arrows (one Mon–Sun week per swipe, distance-independent, via the
  SAME `navNext`/`navPrev` — swipe + arrows are one path). `weekNav`'s FREE state + `navShift` + the
  arrow-from-free seam were **proven-dead and removed** (own commit); `weekNav` is back to its 2-state
  HOME/WEEK form. Today = one day per swipe; Month = one month per swipe (both triggered).
  **Why:** for discrete Mon-week / day / month navigation the continuous live track bought little, at
  the cost of a blind multi-file rebuild (and an any-day model the owner ultimately didn't want);
  calm + one nav path won. **Trade-off:** no continuous finger-tracked pan — reserved, not built. If
  ever revived it's the day-strip rebuild the spec describes, done as a verifiable multi-commit
  sub-sequence, NOT folded in.

- **[Deferred, untouched (confirmed at the close).]** V2-7 keyboard nav (Esc + ←/→); V2-8 brief
  all-day awareness (its OWN `supabase/` commit track — the 7am brief still reads an all-day event at
  00:00); standalone `onDeleteEvent` removal (dead in `useWeekData`, left in place per the deferral).

## Planning view — P6: fold in / retire All Tasks (2026-06-29)

- **[All Tasks is RETIRED; Planning's category mode is now the sole backlog home.]** Today's bottom-left
  box opens Planning ("Planning · N"); the old All Tasks screen + its route are gone. **Why:** P4 made
  category mode a coverage-identical replacement (it reuses `allTasksModel` verbatim), so two backlog
  surfaces was redundant. **Trade-off:** the drill-in navigation is gone — replaced by collapsible groups
  (the deliberate P4 presentation); the same tasks/counts remain reachable.
- **[Run as STAGED replace-then-delete — never delete a live surface in one step.]** **Stage 1
  (`18c5498`) — re-point (replace):** Today's box → Planning, the redundant parallel "Planning →" link +
  its wrapper removed, `onOpenAllTasks` dropped; the `'alltasks'` route + `AllTasks` import were KEPT
  present-but-unreachable. **Owner ran a live PARITY GATE** here — side-by-side category mode vs the still-
  present old screen (via a throwaway uncommitted `#alltasks` hash toggle, reverted before Stage 2),
  across multiple categories + Inbox + show-done. **Stage 2 (`adc6b10`) — prove-dead deletion**, only on
  the owner's parity OK. **Why:** the first deletion on this surface; the same conservative pattern as the
  C4 Calendar-cluster retirement — prove the replacement live before removing the original. **Trade-off:**
  two commits + a gate instead of one — accepted; it's what makes a deletion safe and one-step revertible.
- **[The dead set was proven a CLOSED ISLAND before deletion.]** `grep` showed the only references to
  `AllTasks` were `LoggedIn`'s import + the `'alltasks'` route; `CategoryDrillRow.jsx` and
  `allTasksKit.css` had **zero importers outside the dead set** (each other + `AllTasks`). **Deleted (3):**
  `src/AllTasks.jsx`, `src/kit/CategoryDrillRow.jsx`, `src/kit/allTasksKit.css`. **Why:** delete only a
  provably-closed set; no live code path could touch them. **Trade-off:** none.
- **[`allTasksModel.js` was DELIBERATELY KEPT — the critical boundary.]** It is NOT a screen file: it's the
  shared backlog logic, still imported by `Today` (`activeTotal`) and by category mode
  (`PlanningCategory` + `PlanningGroup`, the very reuse that licensed this retirement). Only the All Tasks
  *screen* + its *screen-specific* kit (`CategoryDrillRow`, `allTasksKit.css`) retired. **Why:** deleting
  the model would have broken Today and category mode. **Trade-off:** none — this is the spine-protecting
  call. **🎉 Planning view P1–P6 complete:** three modes + rail triage live, All Tasks retired, its backlog
  fully served by category mode. (Only P7 — Marty/brief — remains on the Planning track.)

## Planning view — P5: triage — the Inbox rail goes interactive (2026-06-29)

- **[⚠️ SCOPE CORRECTION at recon — the original P5 premise was WRONG; do NOT reintroduce it.]** The P5
  spec assumed the Inbox rail sits beside **all three modes** and that a rail card could be dragged onto
  a **board column** or a **category group**. That is **not what shipped**: in P3 the board has a filter
  row + status columns (no rail; Inbox tasks just sit in the To-do column / are a filter option), and in
  P4 category mode folds Inbox into its **first collapsible group** (no rail). So the rail lives **only in
  time mode**, and a board column / category group is **never co-visible** with the rail — those drag
  targets are impossible without re-architecting the shell. **Corrected (owner-approved) to PATH A:**
  triage where the rail actually lives. **Why:** Path B (a persistent rail beside every mode) would
  change the board + category layouts and show Inbox **twice** in category mode (rail + group) —
  redundant, with a big P3/P4 regression surface. Path A honours both locked gestures' intent with no
  shell re-architecture. **Trade-off:** no "drag a rail card onto a board column / category group" — but
  the category **chip** delivers the rail→category outcome, and board's own status-drag (P3) handles
  Inbox tasks in its To-do column. The board-column-drop "stays in rail" question the spec raised is
  **moot under Path A**.
- **[Two triage gestures on the TIME-MODE rail, both via existing write paths.]** (1) The rail is a drag
  **SOURCE**: a rail card dropped on a lane routes through the EXISTING `handleDrop → planDrop →
  updateTask`, which for an undated/uncategorised dump sets **only `due_date`** → the card leaves the
  rail. (2) Tapping a rail card opens `TriagePopover` (on the existing `Popover` primitive): **one-tap**
  date chips (Today / This week / Later, reusing `planDrop`) + a category step (reuses `CategoryPicker`)
  + an "open full editor" link. **Why:** reuse-before-add — no new writer, no cloned drag, no new picker.
  **Trade-off:** none.
- **[Date chips are ONE TAP each (not a form).]** Dating a dump is the most common triage, so each date
  chip is a single tap that writes and closes. **Why:** the high-frequency action must feel fast.
  **Trade-off:** the chips are coarse (lane-grained Today/This week/Later, not a date picker) — the full
  editor link covers a precise date.
- **[The two triage axes stay INDEPENDENT (same rule as the form's chips).]** A date triage (drag or
  chip) writes **only `due_date`**; a category triage (drag-less — the chip/picker) writes **only
  `category_id`** (and is a no-op if unchanged). Never both in one gesture. **Why:** due date = the target
  day and category = the project area are orthogonal; triage must not silently entangle them. Owner-
  verified on the row each time. **Trade-off:** triaging both axes is two taps — accepted (honest).
- **[Rail membership stays DERIVED; triage WRITES the field, the read re-derives the card out.]** Inbox =
  uncategorised + undated; setting a date and/or category lifts the card by definition. Write-then-reload
  (no phantom on failure — the card stays in the rail). The lanes' own rows still open the edit form
  unchanged. **All Tasks untouched; board/category modes unchanged.** No schema.

## Planning view — P4: category mode (collapsible groups) (2026-06-29)

- **[Category mode = COLLAPSIBLE GROUPS, not the All Tasks drill-in.]** Inbox first, then each
  top-level category as a collapsible group, recursively nested (3-level tree); expanding reveals a
  category's own tasks then its sub-category groups; many open at once. **Why:** a scannable overview
  beats one-branch-at-a-time navigation, and it's the presentation that replaces All Tasks. **Trade-off:**
  a deep tree can get tall — the body scrolls (calm wins over zero-scroll), groups collapsed by default.
- **[COVERAGE PARITY WITH ALL TASKS IS BY CONSTRUCTION — and THIS is the gate that licenses P6.]**
  `PlanningGroup` reuses `allTasksModel` **verbatim** (`subtreeCount` / `inboxCount` / `ownTasks` /
  `orderTasks` / `childrenOf`) on the **same task read** Planning already does. So the task SET, the
  whole-sub-tree active counts, the order (due-soonest, undated at the bottom) and the show-done
  behaviour are identical to All Tasks — not a re-implementation that could subtly drift. **Why:** P6
  may only retire All Tasks once category mode is a proven full replacement; reusing the exact functions
  makes "shows the same thing" true by construction, not by testing luck. Owner-confirmed side-by-side
  (counts + task set + order identical, incl. Inbox). **Trade-off:** none — this is the safe path.
  (Bonus: category mode also resolves P1's "categorised-but-undated task is invisible in time mode" gap —
  those tasks appear here under their category, exactly as in All Tasks.)
- **[Subtask inline-expand + per-group "+ add" are INCLUDED in P4 (not deferred), to close the only
  capability gaps.]** Subtasks nest under their parent as expandable rows (reusing `TodayTaskRow`'s
  `isSub`/`subLabel`); each expanded group has a "+ add a task" that opens the shared form prefilled with
  that category + `time_bucket:'This Week'` (matching All Tasks), via the EXISTING insert path. **Why:**
  P6 can't retire All Tasks if a capability is lost; both reuse paths Planning already had, so including
  them now is cleaner than a coverage gap. **Trade-off:** "+ add" is a create (slightly beyond
  "render-forward"), accepted because it reuses the existing form/insert path — no new writer.
- **[Rows reuse `TodayTaskRow`; the one allowed write is the existing status-pill / tap-to-edit path.]**
  Same as time mode. Show-done off by default; counts always exclude done. No drill-in, no
  recategorise-drag (that's P5), no time/board/rail change. **All Tasks stays FULLY INTACT** (untouched).
- **[The verified time-mode body was extracted to `kit/PlanningTime.jsx` as a PURE VERBATIM MOVE.]**
  Adding a third mode pushed `Planning.jsx` over the ~250 rule, so the P1/P2 time code (lanes render +
  `planDrop` drag) moved out unchanged, making `Planning.jsx` a thin three-mode shell (206 lines). **Why:**
  split rather than balloon; a symmetric shell (PlanningTime / PlanningBoard / PlanningCategory) is the
  honest structure now. **Trade-off:** it touched verified code — mitigated by shipping in the same commit
  and RE-EXERCISING time-drag + board-drag in verify (f) (owner re-confirmed both still write), so any
  move regression reverts as one piece.

## Planning view — P3: board mode (status kanban) (2026-06-29)

- **[Board mode = a kanban by STATUS — three columns To do / In progress / Done.]** Mapped to the
  existing stored values `'open'` / `'in_progress'` / `'done'` (the status pill's vocabulary). Top-level
  tasks only (matches the time lanes). Columns are DERIVED from `status` at render; nothing stored.
  **Why:** status is the one axis the board sorts by; deriving keeps a single source of truth.
  **Trade-off:** none — it's the natural board.
- **[Dragging a card to a column writes `status` through the EXISTING task-update path; the DB trigger
  owns `completed_at`.]** The drag calls the same `updateTask(id, {status})` the status pill uses. The
  app never writes `completed_at` — the `tasks_sync_completed_at` trigger (db/03_tasks.sql) stamps it
  when status→'done' and nulls it on re-open. So "complete on the board" is byte-identical to completing
  anywhere else (Today, All Tasks). **Why:** reuse-before-add; no parallel "complete" can drift.
  **Trade-off:** none. Owner-verified the round-trip (set on Done, null on re-open, all trigger-driven).
- **[A small NEW `PlanningCard`, not a bent `TodayTaskRow`.]** The card face = title + category dot/tag +
  due date (overdue-tinted) + subtask x/N. **No priority, no status pill** (the column IS the status).
  `TodayTaskRow` shows priority, which the board card must not, so a small new card assembled from the
  reusable bits (`CategoryTag`, `formatDue`, `progressOf`) was cleaner than adding a hide-priority prop
  to the shared row. **Why:** don't distort a shared kit block for one screen. **Trade-off:** a second
  small card component — accepted (sealed, ~30 lines).
- **[A calm two-select filter: category (subtree) + time (laneOf vocabulary).]** Category filters to a
  category's whole sub-tree (via `descendantIds`, matching All Tasks), plus an Inbox option; time reuses
  P2's `laneOf` (All / Overdue / Today / This week / Later) so the words match time mode. Default = all.
  **Why:** the two axes a board is actually triaged on, in the app's existing vocabulary. **Trade-off:**
  exact-category (non-subtree) wasn't offered — subtree matches the rest of the app.
- **[Done shows ALL done, newest-completed first, scrolling internally — no date cap.]** **Why:** nothing
  ever silently vanishes (calmest), and it's the simplest honest version (no cutoff logic). The column
  scrolls so the page stays zero-scroll. **Trade-off:** a very old, large Done list renders many cards;
  if it ever feels heavy we add a "recent only" later (not now — don't over-build). Owner chose this over
  a 7-day cap.
- **[Board reuses P2's drag + `PlanningColumn`; P2's time-drag code is UNTOUCHED, gated behind the
  toggle.]** Native HTML5 drag (mouse-only → phone tap-only); `PlanningColumn`'s draggable-cards + drop-
  target serve both modes. The board lives in `kit/PlanningBoard.jsx`; `PlanningModes` generalised to a
  `liveModes` list (`['time','board']`; category still inert). **Why:** build-in-place, never fork; don't
  move verified code. **Trade-off:** none — (h) re-verified time mode intact.

## Planning view — P2: time-mode dragging sets due date (2026-06-29)

- **[Dragging a task between the four time-lanes SETS its `due_date`; lanes stay derived.]** The drop
  writes a representative date through the EXISTING task-update path, then the re-read re-derives
  placement (P1's `buildPlanning`/`laneOf`). Nothing about the lane is stored. **Why:** serves the
  locked dates-only model (due date = the target day) and keeps one source of truth (the date).
  **Trade-off:** a representative date is a guess at intent — softened by the "no-yank" rule below.
- **[Drop-date rules (per lane), in a pure `planDrop(task, target, today)`.]** Today → `due_date` =
  today. This week → keep the date if already within this week (after today through the upcoming
  Sunday), else Sunday. Later → keep the date if already beyond Sunday, else the Monday after.
  **Dropping on the lane a task is already in = a no-op** (no write, no yank). **Why:** never change a
  date that already lands in the target window; calm beats churn. **Trade-off:** the representative
  dates (Sunday / next Monday) are conventions, not the user's pick — accepted for P2.
- **[Overdue is a drag-FROM lane, NOT a drop target.]** Dropping a card on Overdue snaps back, writes
  nothing. **Why:** you don't plan something into the past; rescuing OUT of Overdue is the real use.
  **Trade-off:** none meaningful.
- **[⚠️ AMENDMENT to "a lane drag must not rewrite `time_bucket`" — the surgical chip-clear.]** The P2
  spec's default is **never touch `time_bucket` on a drag**, and that holds for every dated / non-
  chipped task. **The one exception:** a **Today-chipped** task (`time_bucket='Today'`) stays pinned to
  the Today lane for ANY non-past date (the lane precedence is past-date → Today-chip → date), so
  setting `due_date` alone **cannot move it off Today — it snaps right back.** Therefore, when a chipped
  task is dropped into **This week or Later**, `planDrop` also flips `time_bucket 'Today' → 'This Week'`.
  **Strictly that case:** never on a drop onto Today, never for a dated-today task, never for a non-
  chipped task. **Why:** a chipped task is otherwise un-draggable-off-Today; the visible date and the
  hidden chip would contradict each other. **Trade-off:** one hidden-bucket write on a drag — owner-
  approved (2026-06-29) as a deliberate, recorded amendment, not a silent reversal. (An already-in-
  window date is still preserved in this case — only the chip flips, the date is kept.)
- **[Write pattern = write-then-reload (the app's established safe pattern), NOT optimistic.]** The card
  moves only after the DB confirms; on failure nothing moves and the error line shows. **Why:** matches
  every other Planning/Today/All-Tasks write and kills the "phantom move that wasn't saved" risk
  (owner-verified by forced Wi-Fi failure). **Trade-off:** a brief beat before the card re-lands —
  accepted; it's the honest signal that the save landed.
- **[Planning-LOCAL native HTML5 drag, not the grid hook.]** The shared `useGridDrag` is pixel/time-
  geometry built for the calendar sheet — the wrong shape for kanban lanes; cloning it would be
  needless. A small native `draggable`-card + lane-drop-target handler is used instead, leaving
  `TodayTaskRow` untouched. **Why:** reuse-before-add, but don't force a hook where it doesn't fit.
  **Trade-off:** HTML5 DnD is mouse-only (no touch) — fine, and consistent with the app's "drag is
  mouse-only, phone stays tap-only" law. (The Inbox rail is still display-only — rail drag is P5.)

## Planning view — P1: shell + time mode, render-only (2026-06-29)

- **[The Planning view is a NEW surface, built fresh on the existing kit — additive, never a fork.]**
  Nothing existing changes behaviour; it reuses the existing task read path and the
  `TodayTaskRow`/`StatusPill`/`ItemForm`/`Toast` blocks as-is. **Why:** the backlog needs a real
  planning home (time / board / category), and building on the kit keeps the two engines one.
  **Trade-off:** a second screen that reads tasks — accepted; it's the future home All Tasks folds
  into (P6).
- **[Entry is a quiet PARALLEL "Planning →" link, not a repoint — All Tasks stays fully intact.]**
  Today's bottom-left "All tasks · N" box is left byte-for-byte unchanged; a small separate
  "Planning →" link sits beside it. **Why:** guarantees zero regression on the All Tasks path while
  Planning is built; All Tasks retires later, deliberately, in P6 — not by being quietly hidden now.
  **Trade-off:** two backlog entries on Today for a while — accepted as temporary.
- **[The four lanes are COMPUTE-ON-READ via a pure getter, and MUTUALLY EXCLUSIVE.]**
  `buildPlanning(tasks, today)` (`src/planningModel.js`) sorts tasks into
  `{ overdue, today, thisWeek, later, inbox }` at render — nothing stored, no new column. A task's
  **effective day** = its due date (the target day), else its scheduled day. **Precedence (strict
  waterfall, exactly one lane each):** Overdue (eff is a real past date — a `Today`-chip does NOT
  rescue it) → Today (eff is today OR `time_bucket='Today'`) → This week (eff after today through
  the upcoming Sunday) → Later. **Why mutual exclusivity:** a task in two lanes (or silently
  dropped) is a planning lie; the owner explicitly asked for one-task-one-lane. **Why Overdue beats
  the Today-chip:** a real past due date is a harder signal than a casual "today" intention.
  **End-of-week = the upcoming Sunday** (the app's weeks run Mon→Sun via `startOfWeek`) so Planning
  stays in step with the Calendar. **Trade-off:** a future-due `Today`-chipped task shows in Today,
  not This week — accepted, and consistent with the existing Today screen.
- **[Inbox rail = uncategorised + undated + not `Today`-chipped — the locked Inbox definition.]**
  Mutually exclusive with the lanes (a `Today`-chipped uncategorised undated task goes to the Today
  lane, not the rail). **Why:** matches the capture model (quick-add dumps land here, stamped
  'Someday', null category). **Trade-off / KNOWN P1 LIMITATION:** a task that is **categorised but
  undated and not `Today`-chipped** lands in **no lane and not the rail** — invisible in P1. This is
  deliberate: it's the undated backlog that **board / category mode (P4)** surfaces. Flagged so it's
  not mistaken for a bug.
- **[P1 is render-only; the one allowed write is the reused row's existing path.]** No drag, no new
  write path, no triage gestures (those are P2/P5). Reusing `TodayTaskRow` pulls in the status pill
  and tap-to-edit, which write via the EXISTING task paths — the single sanctioned write this piece.
  **Why:** reuse-before-add beats cloning a read-only row. **Trade-off:** Planning *can* change a
  status / edit a task in P1 — owner expects it (verify step f).

## Today V2 — Piece 3c: two entries / drop the in-form toggle (2026-06-29) — CLOSES the form cluster (3a/3b/3c)

- **[The create-only task/event TOGGLE is replaced by two type-declared entries.]** The shared
  `kit/ItemForm` no longer flips its field set in-form; the TYPE is fixed by the caller — `kind` on
  create (each entry declares task or event), the item on edit (unchanged). **Why:** a form that opens
  already knowing what it is, is calmer and removes a decision; the toggle was the last bit of "pick a
  mode" friction. **Trade-off:** each entry point must declare its type (it already effectively did).
- **[Done in TWO independently-revertible commits — replacement before deletion (prove-it's-dead).]**
  **Stage 1 (`4e86ddd`)** removed `toggle: true` from the 4 create sites so the toggle UI (gated on the
  prop) stopped rendering — the form opened type-locked, the machinery left dormant. **Stage 2
  (`4cc51f1`)**, only after owner verify, deleted the dead machinery behind a grep prove-dead gate.
  **Why:** never delete a shared-form path until the replacement is proven live; each commit reverts in
  one clean step. **Trade-off:** two commits instead of one — accepted for safety.
- **[Entry → type map.]** Today "+ add a task" → task. All Tasks "+ add" → task. Today grid / Calendar
  grid / Calendar "+ Add event" / all-day band → **event, always**. Edit → type from the item.
- **[RETIRED PATH (owner-accepted): the one-click grid→task is gone; Calendar tasks go via the tray.]**
  The toggle's only real power was flipping a grid-created event into a task. After 3c the grid makes
  events only; **a task reaches the Calendar grid by creating it in the tray ("+ add" → a loose Someday
  task) then tapping it to detail / dragging its grip to schedule** — the locked model (07-ux-flows §3:
  "drag a task from a module onto the grid = schedule it"). **No new task-on-grid create path was
  built.** **Why:** keep one way to put a task on time (the schedule gesture); don't reintroduce a
  second. **Trade-off:** creating a fully-detailed task on Calendar is now two steps (tray-create →
  tap to edit) instead of one — owner confirmed acceptable.
- **[Deletion list as executed (Stage 2).]** `ItemForm.jsx`: dropped the `toggle` prop, collapsed
  `const [k, setK] = useState(kind)` → `const k = kind`, removed the toggle UI block, refreshed the
  header comment (242 lines). `todayForm.css`: deleted `.tk-form-toggle` + `.tk-form-tog`.
  `Today.jsx` + `WeekView.jsx`: removed the `toggle={form.toggle}` passthroughs + stale comments.
  Prove-dead grep confirmed no live `tk-form-toggle`/`setK`/`form.toggle` remained — only unrelated
  `toggle` uses (Week/Month, expanders, gym pins, the 3a `moretoggle`, the all-day checkbox) + two doc
  comments.
- **[Glance result: grid-create-as-event is correctly mapped.]** The drawn slot prefills `start_at`/
  `end_at` on both Today and Calendar; the only unmapped path was the old grid→task one (Piece-1 note),
  now retired — nothing to fix.

## Today V2 — Piece 3b: Today/Park chips on the task form (2026-06-29)

- **[Two plain-language chips — "Today" / "Park" — quietly set the hidden time_bucket; the user never
  sees "bucket".]** In the task form's core timing area (a quiet "When" label, by Due date):
  Today→'Today', Park→'Someday'. Mutually exclusive; 'This Week' shows neither active. **Why:** the
  locked time model is dates-only with buckets as HIDDEN logic — the chips give the two plain actions
  (put on today / park in the backlog) without exposing the machinery. **Trade-off:** 'This Week' has
  no chip of its own (it's the silent middle) — fine; it's reachable via dates, and neither-active
  preserves it.
- **[Events get NO chips; subtasks get none either.]** Events have no `time_bucket` → no chips on the
  event form. Subtasks are hidden too (their bucket is inert for Today display, like priority). **Why:**
  chips only mean something for a top-level task's Today/backlog placement. **Trade-off:** none.
- **[Save writes a clean `time_bucket: bucket`; the SINGLE `|| 'Someday'` fallback is relocated, not
  duplicated.]** A `bucket` state in `ItemForm` initialises to `origBucket = t.time_bucket || 'Someday'`
  — the Piece-1 create fallback **moved** from the save line into the state initialiser. `save()` now
  writes `time_bucket: bucket` with no fallback of its own. **Why:** NOT NULL spine → `t.time_bucket` is
  always truthy on edit and the create paths prefill, so there's nothing to fall through; keeping one
  fallback (at the init) avoids layering a second. **Trade-off:** none — exactly one `|| 'Someday'`
  remains in the codebase.
- **[De-selecting an active chip reverts to `origBucket` — never a forced default.]** Tapping the active
  chip sets the bucket back to the value it had on open (the Piece-1 no-forced-default guarantee
  restated); tapping the other chip switches. **Why:** editing a task must never silently re-bucket it.
  **Trade-off:** a task that opened as 'Today' can't be "cleared" to nothing via the chip (there is no
  nothing — NOT NULL) — to move it off today you tap Park.
- **[Chips set ONLY `time_bucket`; the date axes stay independent.]** They never touch `due_date` or
  `scheduled_*`. A task can carry a due date AND be Today or Park at once. **Why:** "when I'll deal with
  it" (bucket) and "when it's due" (date) are different facts. **Trade-off:** none.
- **[`ItemForm` kept whole at 247 lines — under the 250 guide, no split.]** Active chip earns the
  sparing terracotta; inactive chips are the calm hairline shape (matching the priority chips).

## Today V2 — Piece 3a: progressive disclosure in the shared form (2026-06-29)

- **[The shared form splits into a calm CORE + a "more" expander — layout only, never what-saves.]**
  `kit/ItemForm` (+ `ItemTypeFields`) reorganised so the heavy fields hide behind "more" (collapsed by
  default). **Task core:** Title · Category · Due — **more:** Scheduled time · Priority · Subtasks ·
  Notes · Status. **Event core:** Title · Category · All-day · Start/End — **more:** Location · Notes ·
  Repeat (the existing disabled placeholder; recurrence is still T10). **Why:** the form was too heavy
  for a quick add; capture should be light, depth on demand. **Trade-off:** advanced fields are one
  click away — accepted; the core is what most adds need.
- **[Render is by `slot`; Notes moved into `ItemTypeFields`.]** `ItemTypeFields` now takes
  `slot='core'|'more'` and renders only that group per kind; Notes moved in so each kind's "more"
  order matches the spec exactly. The inputs/setters are byte-for-byte the same as before — `save()` +
  validation live in `ItemForm` and were untouched, so a layout reorg **provably cannot** change what
  saves or what's validated. **Why:** the only safe way to reorder shared-form fields. **Trade-off:**
  none.
- **[EDIT auto-expands "more" when it holds data (chosen over a "more · N set" badge).]** A pure
  `moreHasData` read of the item (scheduled time / priority / location / notes / subtasks) sets the
  initial expanded state on edit; CREATE is always collapsed. **Status and the disabled Repeat do NOT
  trigger auto-expand** (Status always has a value; Repeat holds none) — but Status still lives under
  "more". **Why:** auto-expand is the safest against a silent-hide regression (the values are on
  screen, not a click away) and needs no per-kind counting UI. **Trade-off:** opening an item with any
  advanced data shows a taller form — fine, calm wins over zero-scroll here.
- **[Event-core order = Title → Category → All-day → Start/End (owner-approved tweak).]** Reordered
  from the spec's literal "Title, Start/End, Category, All-day" so **Category sits 2nd on BOTH forms**
  (consistent, calmer) and All-day stays directly above the Start/End it controls. Same fields, tidier
  order. **Why:** consistency across task/event + cleaner implementation. **Trade-off:** none.
- **[`ItemForm` kept whole at 238 lines — under the 250 guide, no split.]** The expander body stayed
  inline; the planned sibling-extraction contingency was not needed.

## Today V2 — Piece 2: quick-add capture box on Today (2026-06-29)

- **[A lightweight quick-add box on Today, separate from the shared form.]** A one-line input
  ("Add to inbox…") at the top of Today's right column: Enter dumps a task with no type, no
  category, no date. It does NOT open or use `kit/ItemForm` — it writes straight through Today's
  existing `writeTask` insert path. **Why:** capture must cost less than the thought (07-ux-flows §1);
  the full form is for deliberate filing, not a quick dump. **Trade-off:** a second capture affordance
  on Today (alongside the form's "+ add a task"), accepted because they serve different intents.
- **[The dump is stamped `time_bucket:'Someday', category_id:null`, undated.]** Per the Piece-1 fact
  (time_bucket is NOT NULL — buckets are hidden, never absent), a dump is EXPLICITLY 'Someday' (keeps
  it off "tasks today" AND off "next 7 days" — `buildToday` excludes Someday from the undated tail
  too) with null category = Inbox (findable in All Tasks). **Why:** a dump is a backlog thought, not a
  today commitment. **Trade-off:** the dump is invisible on Today by design — mitigated by a brief
  "Added to Inbox" toast naming where it went.
- **[Confirmation = a brief "Added to Inbox" toast; the write is NOT optimistic.]** Reuses the
  existing `Toast` (auto-dismiss, no Undo — a dump has little to undo). `writeTask` reloads from the
  DB on success, so nothing renders until the real row is read back; a failed write shows the error
  line, keeps the typed text, and leaves no phantom row. **Why:** owner's concern was "dump something
  and not see where it went" — the toast answers it; verify-don't-trust rules out optimistic data loss.
- **[`QuickAddInput` is a SEALED KIT BLOCK, wired only on Today this piece.]** Presentation-only (the
  write belongs to the caller via `onAdd`); slated to also sit on Planning, the All-Tasks area, and
  Calendar later — added one screen at a time, never forked. **Why:** build the reusable furniture
  once (the Phase-7 kit principle); don't bolt it onto four screens before the first is proven.

## Today V2 — Piece 1: Calendar-grid create no longer lands in 'Today' (2026-06-29)

- **[ItemForm's save fallback changes 'Today' → 'Someday'.]** A task created from the Calendar grid
  (draw slot → flip to task), the one create path with no bucket prefill, now falls back to
  'Someday' instead of 'Today' — so it rests in the backlog, not on today's list. **Why:** recon
  corrected the original premise. `time_bucket` is NOT NULL DEFAULT 'Today' CHECK (in 'Today','This
  Week','Someday') on the spine (`db/03_tasks.sql:40`) — there is NO bucket-less task, so "preserve
  null" was impossible and editing never misfired. The only real leak was the Calendar-grid
  flip-to-task falling through to 'Today'. 'Someday' matches the existing Calendar C5 rule (a
  no-context task must never land in Today); `useWeekData`'s loose-add already uses it. **Trade-off:**
  a Calendar-grid task lands in the hidden backlog rather than a visible list — accepted; it's
  findable in All Tasks, and not-on-today is the point.
- **[Scope: src/ only, one line (`ItemForm.jsx:72`).]** No schema, no migration, no row touched;
  forward-looking. Intentional prefills (Today 'Today', All Tasks 'This Week') untouched — truthy,
  never hit the fallback. Subtask-insert fallbacks left as-is (inherit parent, inert).
- **[CORRECTION FOR THE RECORD: buckets are hidden, never absent.]** The dates-only timing model
  rests on three ALWAYS-PRESENT hidden bucket values (NOT NULL spine), not on a nullable/absent
  bucket. The full time-model amendment at the upgrade's close must state this — buckets are hidden,
  never absent. (This supersedes the V1 Map §F "bucket-less task" wording.)

## Food — F9: the cook→log bridge (2026-06-29)

- **ONE new column: `recipes.last_cooked_at` (timestamptz, nullable) — the only schema change since
  F1.** Every other field the cook-log row needs already exists on `food_log_entries` (`recipe_id`,
  `amount`, `unit`, the 7 snapshot numbers, `food_item_id` nullable), and `entry_source='recipe_cook'`
  was already permitted by the F1 CHECK. Two-track: its own checker-gated `db/29` commit, run live +
  cache-reloaded + device-verified before any src. **Why:** the cooked-sort + the "last cooked" line
  need a stored cook signal; everything else reuses the spine of the Food module. **Trade-off:** none.
- **`last_cooked_at` is FORWARD-ONLY (stored, not derived).** Set when a cook is logged; the immediate
  undo restores the PRIOR value (the earlier real date, NOT null); a LATER ledger-delete of a cook
  entry does NOT roll it back. **Why:** deriving `max(entry_date where recipe_cook)` would silently
  revert on delete and change the meaning; "last cooked" is a forward fact. **Trade-off:** a cook
  entry deleted long after the fact leaves `last_cooked_at` slightly stale — an accepted soft signal
  for V1.
- **The snapshot stores only MATCHED ingredients (unestimated → 0).** An approximate recipe's logged
  kcal is therefore a known undercount; the honesty lives in the staging note ("~ N unestimated —
  macros approximate"), NOT a per-entry approximate flag. **Why:** the ledger stays calm; the
  approximation is surfaced at log-time + on the recipe page, where it's actionable. **Trade-off:**
  no after-the-fact "this entry was approximate" mark in the ledger.
- **Cook-only ingredient swap DROPPED (reverses an F0 float).** F0 floated a per-ingredient swap in
  the cook→log confirm step; F9 omits it — log the meal, then edit the entry (servings/slot/remove)
  if needed. **Why:** the swap UI added confirm-step weight for a rare case, and a logged cook is a
  recipe (not a food) so a food-swap doesn't fit. **Trade-off:** a one-off substitution isn't
  captured per-cook; the recipe itself is the place to change ingredients.
- **ONE shared inline staging panel, two triggers; the write reuses the F6 seam.** `LogMealPanel`
  serves both "Log this meal" (recipe page) and "Done cooking" (cook mode). `useCookLog` composes the
  F6 `logEntry`/`removeEntry` primitives + a small `stampLastCooked` with the F6 optimistic/undo/
  error-toast pattern, all-or-nothing on failure. **Why:** one staging surface, no forked write path,
  history never rewritten by later recipe edits (frozen snapshot). **Trade-off:** the cook-log fires
  from the Cookbook tab (no live ledger to mutate there) — the entry appears when the Log tab
  refetches; "optimism" is the toast + the live "last cooked" line.

## Food — F8: recipe import (the one AI touch in V1) (2026-06-29)

- **The Gemini boundary.** Recipe import is the ONLY V1 AI call, on the FREE key (the shared
  `callGemini` seam — same key/model as Marty). **Only recipe text leaves the app** — the pasted
  text or the fetched page's text — NOTHING personal, nothing from the user's logs/health/goals.
  **Why:** recipe text isn't sensitive, so the free (trains-on-input) key is acceptable here; the
  "health data → paid key" rule is never tripped. **Trade-off:** none for V1; anything reasoning
  over intake stays deferred to a paid no-training key.
- **The review screen IS the F7 editor.** The parsed recipe pre-fills the editor as an imported
  draft; the owner edits inline and saves via the F7 CREATE path (+ `source_url`). **Why:** no
  separate review surface, no new write path — F8's save == a hand-made recipe. **Trade-off:** none.
- **Auto-match = CLEAR HITS ONLY (under-match, never mis-match).** Each parsed ingredient runs
  through food-search; auto-link only via the conservative comma-boundary rule (exact, or the
  parsed words lead the result ending at a comma/end — "Garlic, raw" ✓, "chicken breast" →
  "Chicken, breast…" ✓, "Garlic Baguettes"/"Peanut butter" ✗). Ambiguous → flagged text. Every
  match shows its food NAME + kcal in the editor row (the spot-check) so a wrong match is catchable
  BEFORE save. **Why:** a wrong match silently corrupts macros; a missing one is fixable in a tap.
  **Trade-off:** some real foods flag rather than match (e.g. USDA names that don't lead cleanly) —
  accepted, the owner matches them by hand.
- **Distinct error types — transport never masquerades as parse.** `fetch_fail` (URL couldn't be
  fetched → offer paste), `parse_fail` (Gemini gave nothing usable / not a recipe → honest, text
  kept), `unreachable` (couldn't reach the function — transport/timeout → "try again"). **Why:** a
  connection problem reading as "couldn't read a recipe" sent us debugging the wrong layer.
  **Trade-off:** none.
- **Timeout covers the whole read + a client backstop.** The function's AbortController wraps BOTH
  `fetch()` AND `res.text()` (a stalled body was freezing the UI forever); a 25s client-side race
  guarantees the UI never hangs even if the function doesn't respond. **Why:** a frozen "Reading…"
  with no exit is worse than a clean failure. **Trade-off:** none.
- **URL import is best-effort; paste is the universal path.** Cooperating sites (clean JSON-LD,
  no datacenter-IP block) import from a URL; sites that block server-side fetches (many big recipe
  publishers 402/403 the edge IP) fall back to paste. **Why:** we can't beat IP-based blocks from a
  datacenter edge; paste always works. **Trade-off:** not every URL imports — by design, with a
  clear fallback.

## Food — F7: the Cookbook (recipe library + cooking mode + editor) (2026-06-28)

- **Archive DEFERRED (Option B) → delete is CONFIRM-ONLY.** No archive column; deleting a recipe
  removes it + cascades its children, but logged history survives because
  `food_log_entries.recipe_id` is SET NULL (the snapshot already stands alone). **Why:** keeps F7
  src-only (no schema). **Trade-off:** no "restore a deleted recipe" — acceptable; the confirm guards it.
- **Unmatched ingredients = per-ingredient MARKS + a ~approximate TOTAL signal** (not the F0 "N
  unestimated" count line). Each unestimated ingredient shows "· unestimated"; the per-serving total
  carries a leading `~` + a one-line footnote. **Why:** the total never *looks* complete when it
  isn't, without a heavy count banner. **Trade-off:** none — `recipeMacros.unestimatedCount` still
  drives it.
- **The F0 free MANUAL timer is RETAINED alongside auto-detected step timers.** Cooking mode parses
  durations from step text (a new parser) AND keeps an ad-hoc manual timer; both run concurrently.
  **Why:** recipes don't name every wait. **Trade-off:** none.
- **Timer ranges use the LOWER end** ("8–10 min" → 8:00). **Why:** check sooner, don't overcook; add
  a quick manual timer for the extra. **Trade-off:** you may re-check; safer than overshooting.
- **Portions override is PER-INGREDIENT, stored as the resolved grams** (amount + unit='g'), with
  `raw_text` keeping the human label ("1 onion"). **Why:** no schema; the override is just editing the
  stored grams. **Trade-off:** none. The curated table (portions.js) is common items + conversions,
  not exhaustive — off-list → grams prompt → no-macros.
- **Draft is DERIVED, not stored.** A recipe with no ingredients (+ no steps) reads as a draft; save
  needs only a title. **Why:** no flag to keep in sync. **Trade-off:** none.
- **Cook progress is EPHEMERAL** (done steps, running timers live in component state; reset on
  exit/reload — no DB). **Why:** transient cooking state isn't worth persisting. **Trade-off:** a reload
  mid-cook loses the checkmarks — acceptable.
- **EDIT rewrites children** (delete all recipe_ingredients/steps, re-insert the current set; the
  recipe row stamps updated_at). **Why:** the child tables have no updated_at and re-ordering/removal
  is common — a full rewrite is simpler + correct than diffing. **Trade-off:** new child row ids each
  edit (fine — they're not referenced elsewhere). CREATE rolls back its orphan on a mid-save failure.
- **Stubs:** 'Log this meal' (cook→log) is wired at F9; the "cooked" sort has no data until F9 (falls
  back to added-order, never a dead end); recipe Import is F8. **Why:** F7 is the cookbook surface;
  the bridges come next. **Trade-off:** none.

## Food — F6: logging writes (the first Food write track) (2026-06-28)

- **RECONCILE (a): macro goals are now OPTIONAL.** F0 locked "calories + FULL P/C/F". F6 relaxes
  it: **calories required, protein/carbs/fat optional.** The macro-label faint target (`P 95/120g`)
  shows ONLY for macros actually set; a calories-only day shows macro grams with no target. The
  deferred adherence rule becomes **"all SET goals within ±10%."** **Why:** forcing four targets to
  start is friction; one number (calories) is enough to be useful. **Trade-off:** none — the band
  rule already keys off whatever goals exist.
- **RECONCILE (b): mixed write-safety model, intentional.** LOG writes (add/edit/remove) are
  **optimistic + an UNDO toast** (S9 itself had no undo; a logged row is a real delete, so undo
  fits and prevents accidental loss). The **goal CLEAR keeps S9's confirm** (append-only, no undo).
  **Why:** logs are frequent + reversible; clearing a goal is rare + destructive of the live target.
  **Trade-off:** two interaction patterns in one module — acceptable, each fits its action.
- **No schema change.** F6 writes only EXISTING tables: `food_log_entries` (the log), `food_items`
  (manual foods + cache-on-log + is_favourite), `health_goals` (nutrition goal_types). **Why:** the
  F1 shapes already fit. **Trade-off:** `food_log_entries.updated_at` has no auto-update trigger, so
  the write layer stamps `updated_at` EXPLICITLY on edits (keeps verify-by-updated_at honest).
- **Cache-on-log (the F2-deferred write lands here).** Logging a searched OFF/USDA food upserts it
  into `food_items` on the unique `(user_id, source, source_ref)` — links to the existing row, never
  duplicates — and the entry FKs to it. A MANUAL add inserts a `food_items` row too. **Why:** every
  entry gets a `food_item_id`, so names always resolve (closes the F5 manual-name gap) and foods
  become reusable (recents/favourites). **Trade-off:** manual `source_ref` is null and nulls are
  distinct in the unique index, so two manual foods of the same name DON'T dedupe — intended for V1.
- **The stored snapshot stays the source of truth.** `entryMacros` computes the 7 numbers at WRITE
  time; an amount/food edit RE-RUNS it (per-100g reverse-derived from the existing snapshot, no
  refetch). **Why:** history never silently shifts when a food's DB numbers change later. **Trade-off:**
  a clamped-to-0 macro can't be un-clamped on edit (fine — 0 is correct).
- **Locked seams.** Time-of-day → default slot: 04–11 Breakfast · 11–16 Lunch · 16–22 Dinner · else
  Snacks (Amsterdam clock, changeable per add). Amount chips: serving (½·1·2) when the food has a
  serving size, else gram chips (50·100·150); default 1 serving / 100 g; grams always editable.
  Quick-add / pick always opens the **pre-filled amount step** (no accidental logs). Goals editor
  reached from the no-goals prompt AND a tap on the arc. **Why:** sensible defaults, one confirm tap.
  **Trade-off:** none.

## Food — F5: the Logger front-page layout (2026-06-28)

- **Lead = a calorie ARC + a macro BAR, side by side.** The arc is a **270°-open ring** (gap at
  the foot), hairline not chunky, with **consumed kcal big in Fraunces** at centre and "of {goal}"
  beneath; over goal draws a **faint concentric terracotta over-arc**. Built as an SVG primitive
  (`stroke-dasharray`/`stroke-dashoffset` + one CSS transition for the sweep). **Why:** one calm
  glance at calories + composition, on-brand (editorial, not app-ish). **Trade-off:** a genuinely
  new primitive (the riskiest part of F5) — kept editorial via hairline strokes.
- **Macro bar = a PROPORTION in the day view, AVG-GRAMS-vs-goal in the aggregate.** Day = P/C/F
  share of calories (4/4/9 via macroSplit) + grams/faint-targets; Week/Month = avg grams vs goal
  per macro. **Why:** proportion answers "what's my day made of"; aggregate answers "am I near my
  targets on average". **Trade-off:** the two views read differently on purpose — labelled "avg/day".
- **Meal ledger = the 4 fixed slots, dense but calm.** Slot header (name + subtotal kcal + P/C/F);
  rows capped with **"+N more"** (inline expand — page may scroll on user action); **tap a row →
  full 7 numbers + Edit**. **Why:** zero-scroll on the overview without dropping data. **Trade-off:**
  none — restraint via type, not by hiding.
- **Warm states.** No calorie goal → a muted **"Set your daily targets"** prompt REPLACES the arc
  (the day total still shows in the ledger/secondary line — logging without a goal isn't a black
  hole). Empty day → a warm **"nothing logged yet"** invite + the primary add; the 4 slots
  materialise on first add. **Why:** the G16 warm-edge law. **Trade-off:** none.
- **Week/Month reframe the whole page:** an **avg-day arc + a calories trend + a per-day list**
  (date · kcal · P/C/F) that drills into that day's ledger. Aggregate views MAY scroll (zero-scroll
  governs the day overview only). The trend MIRRORS the Body chart's structure with `foodFormat` —
  Body's chart is left untouched (metric-coupled). **Why:** familiar range pattern, Body untouched.
  **Trade-off:** a small `FoodTrend` rather than reusing `BodyChart`.
- **Chevron `‹ ›` date nav** flanks the date (the calendar house pattern), moving by the ACTIVE unit
  (day/week/month); a subtle **"today" kicker** marks today; past days are fully usable. **Accent
  (terracotta) lands ONLY on the over-arc, the today kicker, and the active range tab** — everything
  else is ink. **Why:** sparing accent is a design law. **Trade-off:** none.
- **Names resolve via the FKs** (`food_item_id → food_items.name`, `recipe_id → recipes.title`);
  `food_log_entries` stores no name column. **F6 CARRY-FORWARDS:** the +add / per-slot '+' / Edit /
  recents-favourites affordances are placed but **stubbed** (their writes are F6); a **manual add
  creates a `food_items` row** so the entry has a name + is reusable (NO schema change). **Why:**
  one source of truth for a row's name; keeps F5 read-only. **Trade-off:** none.

## Food — Cookbook & Nutrition — F0: the locked plan (2026-06-28)

- **Food is its own TOP-LEVEL PILLAR (AMENDS Gym G0).** G0 parked nutrition as a
  future Health sub-section; that is superseded. **Why:** a Cookbook is library
  content, not health tracking, and the logger stands alone. **Trade-off:** a fifth
  nav pillar (order set at F4); G0's other decisions are untouched.
- **V1 scope = Cookbook + Nutrition logger + cook→log bridge + lite alcohol log.**
  **Why:** the integration (cook a meal → it logs) is the module's soul. **Trade-off:**
  barcode (→ mobile), the agentic meal-planner, and alcohol impact analysis are deferred.
- **AI boundary = recipe import only, on the FREE key.** Recipe text/URLs aren't
  sensitive health data. **Why:** keeps import useful without tripping the
  "health data → paid AI" rule. **Trade-off:** nothing reasons over intake in V1; the
  agentic layer waits for a paid no-training key.
- **Logger lead = calorie arc + macro stacked bar; goals = cal + P/C/F grams.**
  Fibre/sugar/sodium captured + shown, not targeted. **Why:** one calm glance at the
  four things that matter. **Trade-off:** the arc renders as a hairline editorial arc,
  not a chunky ring (stays on-brand; a new kit primitive).
- **Day = fixed meal ledger (B/L/D/Snacks); history = day/week/month.** Reuses the
  Body range-switcher UI + windowing, but the day collapse is a NEW sum-per-day
  primitive (dailyTotals) — nutrition sums where Body averages. **No streak/adherence
  in V1**, but "all four within a ±10% band" is the locked on-target rule for later.
  **Why:** familiar, calm, no new pattern; the band is decided once. **Trade-off:** none.
- **Add food = DB search (OFF + USDA) + saved picks + manual; quick-add recents +
  favourites.** **Why:** best coverage for NL groceries (OFF branded) + whole foods
  (USDA) with low repetition. **Trade-off:** the food-search function must normalise
  two schemas into one shape — the build's centre of gravity. It's the first-ever
  app→Edge-Function call (verify_jwt=true, called as the owner).
- **Recipe = ingredients + steps + times + servings; macros computed from ingredients
  via the food DB, no recipe-level override.** No tags/photos (typographic). **Why:**
  one source of truth for a recipe's numbers; on-brand overview. **Trade-off:**
  ingredients are structured {match, amount, unit}; unmatchable ones need a path.
- **Ingredient→weight = a curated portion table (AMENDMENT to F0).** Common items +
  unit conversions (cup/tbsp/tsp→g) inside the Food module resolve "1 onion" to grams;
  off-list items fall back to skip-or-manual. Lands at F7 with the Cookbook. **Why:**
  most recipes use household measures; pure skip-or-manual would leave too many recipes
  unestimated. **Trade-off:** a little more work than the F0 minimum — accepted, scoped
  small + curated.
- **Cooking mode = full recipe on one page, inline step timers + a free manual timer
  (concurrent).** Zero-scroll doesn't bind a long-form recipe. **Why:** calm wins;
  cooking needs >1 timer. **Trade-off:** none.
- **Cook→log = "Cook this" → staged draft (servings + slot), optional cook-only
  ingredient swap; logs a macro SNAPSHOT.** **Why:** nothing writes blind; history
  isn't rewritten by later recipe edits. **Trade-off:** a per-ingredient swap UI in
  the confirm step.
- **Recipe import = paste text/URL → Gemini extracts → auto-match confident
  ingredients, flag the rest → review screen → save; URL fail falls back to paste.**
  **Why:** accuracy is protected by a confirm step; graceful degradation. **Trade-off:**
  URL import needs a server-side fetch before Gemini.
- **Warm sparse states.** No goals → muted "set targets" prompt (S9 pattern);
  unmatchable ingredient → portion table, then skip-with-note or manual; incomplete
  recipe → show resolved macros + "N unestimated" flag. **Why:** the warm-edge-state
  law (Gym G16). **Trade-off:** none.
- **No coach hooks in V1.** **Why:** intake-reasoning needs the paid key. **Trade-off:**
  the proactive layer waits for the agentic piece.
- **Schema = 5 tables only; goals + drinks + favourites/recents REUSE, no new tables
  (CONFIRMED at recon).** Goals → health_goals (free-text goal_type + generic
  resolveGoals + the S9 write path, verbatim); drinks → is_alcohol + alcohol_units on
  food_log_entries (one ledger, one day-total); favourites → is_favourite on
  food_items; recents → derived from the log. **Why:** a drink is an intake entry like
  any other; duplicating truth into side tables invites drift; the goals shape already
  fits. **Trade-off:** none.

## Sleep & Body drill-ins (S8) — ABSORBED, not built (2026-06-28)
S8's two deliverables already shipped inside S6/S7, so **no separate S8 piece is built**:
- **Sleep-night detail** = S6's Week/Month **bar→night drill-in** (taps into the full Night
  view for any night; proportion-band fallback for segmentless nights).
- **Body-history view** = S7's **Latest / Week / Month / 90-day range switcher** (reframes
  every metric to range averages + window-delta trends + real-date line charts).
**Why:** a separate S8 would duplicate UI already built + owner-verified. **Trade-off:**
none — it's a recognition that the work is done, not a cut. **Next module = Food** (owner's
choice), ahead of the S-track tail (S10 coach hooks + Final, both deferred).

## Goals editor (S9) — LOCKED & BUILT 2026-06-28
The first in-app WRITE in Track S (S5–S7 were read-only). Inline editor reached by
tapping the muted "set a goal" prompts on the Sleep + Body pages.
- **health_goals is an APPEND-ONLY event log — NO schema change was needed.** The S2
  table already allowed many rows per goal_type (no unique constraint) and has an
  `active` flag. The reader (resolveGoals) was changed src-only: the SINGLE NEWEST row
  per goal_type is the verdict — active=true = live goal, active=false = a "cleared
  marker" meaning no active goal (no fallback to an older row). **Why:** append-only
  keeps full history + a clean clear, with zero migration. **Verified** identical to the
  old "first active wins" reader for all existing goals; cleared-marker is new-only.
- **Writes are inserts only — never update/delete.** set = new active row; change = new
  active row (old retained); clear = an active=false null-target row. **Why:** drift-free
  history; the reader decides from the newest row.
- **Direction is FROZEN at set time** (inferred from the current daily-average reading
  vs the target for weight/body_fat; implicit up for sleep duration, by_time for
  bedtime). **Why:** passing the target later must not flip the progress bar.
- **body_fat promoted to goal-able** (was trend-only in S7): the fat tile gains the SAME
  goalProgress bar as weight (generic calc, no new maths). **Lean stays trend-only —
  the asymmetry is intentional.** RHR/respiratory stay monitor-only bands, NEVER goals.
- **Sleep editor is COMBINED** (duration + bedtime in one popover) with quick presets +
  custom. **Clear wipes BOTH** sleep goals together (owner-approved for now; per-goal
  clear is a possible later change).
- **Optimistic write + Toast on failure** (reused kit/Toast). **Confirm only on clear**
  (set/change are low-stakes + re-editable); **no explicit undo** — append-only history +
  re-set is the safety net. Validation blocks nonsense (target = current, fat >100/≤0,
  non-positive sleep, already-met target) with Save disabled until valid.
- **New UI primitive: Popover** (kit/Popover) — anchored float, clamps in viewport /
  flips above, degrades to a centered sheet on narrow screens. None existed before.
- **Two-track:** this was SRC-ONLY (no schema, no checker gate) precisely because the S2
  table already fit the append-only model.

## Body front page (S7) — LOCKED & BUILT 2026-06-28
- Two groups, range-switchable, zero-scroll on the Latest snapshot. Range switcher only at
  top — NO header/date (freshness lives per-metric as reading-age labels).
- Range switcher: latest / week / month / 90-day. Switching reframes the WHOLE page —
  values → that range's average, trends → that range's delta, sparklines → full line charts
  with goal-line (weight) or normal-range band (vitals) overlaid. No per-metric drill-in.
- COMPOSITION group (weight / body_fat / lean_mass — visually balanced, none dominant):
  · each tile = value + trend arrow + 90-day sparkline + reading-age label.
  · Current value in Latest = LATEST single reading (deliberate override of the daily-
    average-headline rule; trends/sparklines/averages still roll over the daily-average
    series).
  · body_fat also shown as fat-mass kg (latest weight × fat%).
  · composition bar = fat mass vs lean mass; never forced to sum to scale weight — if the
    remainder goes negative (fat+lean slightly exceeds weight, which happens on real data)
    it drops to a fat:lean ratio. Weight shown 2dp on this page; body_fat/lean 1dp.
  · ONLY weight carries a goal → progress bar (anchored at first-ever reading, clamped
    0–1). body_fat/lean are trend-only.
- VITALS group (resting_heart_rate / respiratory_rate — framed distinct as recovery):
  · same tile format, but value = smoothed 7-day average (single readings are noisy).
  · personal-baseline "normal range" band instead of a goal: p10–p90 over a 90-day window,
    requires ≥14 daily readings to show (percentile over mean±SD for outlier-robustness);
    hidden until then.
- Empty/sparse: no recent reading → latest value + age; metric never reported → "no data
  yet" tile; thin data → show raw lines however thin, but suppress the personal band until
  ≥14 readings, and trends show "—" when a comparison window is empty.
- Nothing feeds Marty yet (page only; coach hooks are S10). Replaces the Body stub; desktop-
  first.
- Calc layer (S7-prep, src/health/healthBodyRange.js, commit 63fc978): windowDelta (30/90-
  day deltas; "—" when no prior window), baselineBand, composition (negative-remainder
  guard), goalProgress. All verified against real data.
- PARKED tuning: the ≥14-reading band floor + the band definition, once enough history.

## Sleep front page (S6) — LOCKED & BUILT 2026-06-26
- Segmented Night / Week / Month; opens on Night; compute-on-read; "as of" = data last received.
- Hero: last-night duration (big serif) + interactive time-axis hypnogram (from stored
  segments) + understated goal marker at in-bed + goal-duration ("where goal-length lands").
  NO composite/sleep-score (V1 deferral held).
- Night view order: hero → bed/wake → stages → the rest. Built to desktop zero-scroll.
- Bed/wake: in-bed → woke; vs target bedtime only if a by_time bedtime goal exists.
- Consistency: 7-night std-dev regularity word + bed/wake dot band. Hidden on past-night
  drill-ins (it's a rolling "as of now" metric, meaningless for one past night).
- Stages: REM/Core/Deep/Awake, each BOTH minutes and %. Sleep stages % of time-asleep;
  Awake % of time-in-bed.
- The rest: awakenings count + awake minutes + that night's respiratory rate.
- Week/Month: per-night stacked stage bars; summary (avg duration + circular-mean bed/wake,
  ≥3 nights); goal streak (gap-pausing) + nights-hit-goal (e.g. 4/7); baseline = 7-day vs
  90-day avg; tap a bar → that night's Night view.
- Fallback: nights without stored segments show a proportion band, not the time-axis graph.
- Empty: no last-night data → "No sleep recorded" + nudge to Week (no auto-fallback to an
  older night). No goal → display-only "set a goal" prompt (real editor is S9).
- Trends: arrow + delta; terracotta only on Deep, movement, and tap affordances.
- PARKED tuning (needs ~2 weeks real data): REGULARITY_MIN thresholds + trend dead-bands.

## by_time goal storage — LOCKED 2026-06-26
Bedtime / by_time goals stored as minutes-after-midnight (0–1439), Amsterdam local.
Direction-aware goal engine handles down / up / by_time.

## Edge Function deploy lessons (S5b saga) — RECORDED 2026-06-26
- config.toml MUST pin verify_jwt = false for every header-authed function (e.g.
  health-ingest, authed via x-health-secret). A plain `supabase functions deploy` defaults
  verify_jwt = true when the function has no [functions] entry → the function rejects the
  Apple Shortcut with "missing authorization header" BEFORE any code runs. Fixed via
  [functions.health-ingest] verify_jwt = false (commit a517eac).
  → LATENT RISK: telegram, brief, gym are still absent from config.toml — same trap on any
    redeploy. Backend-track cleanup: pin each (check current value via Management API first).
- Verify writes by updated_at, NOT by the value looking right — a stale row with correct-
  looking totals nearly sent us debugging the wrong layer (the "segments null" saga was
  really an auth-wall + stale-row mirage, not a storage bug).
  → CAVEAT (2026-07-02): this is tasks-SPECIFIC gotcha — the **`tasks`** table has NO
    `updated_at` column (only `created_at` + `completed_at`; a live `order by updated_at`
    on tasks errors 42703 "column updated_at does not exist"). So to verify a **tasks** row
    changed, identify it by **title or id** (or `completed_at` for done-state), NEVER by
    updated_at. Do NOT assume other tables lack it — `focus_sessions`, `food_log_entries`,
    `recipes` etc. DO have `updated_at`; the verify-by-the-row rule itself stands. If unsure
    which tables have the column, confirm from the live schema first.
- After ALTER TABLE ADD COLUMN, PostgREST may need `notify pgrst, 'reload schema'` before
  the new column accepts writes (the schema cache lags the DB).
- Read-only real-data check from the CLI (avoids the stale SUPABASE_ACCESS_TOKEN wrong-
  account trap): env -u SUPABASE_ACCESS_TOKEN supabase db query --linked "<SQL>".
- Access tokens pasted into chat must be rotated at session close.

## Health → Sleep & Body Stats — S3b: sleep ingest / sessionising (2026-06-25)

- **[Apple's per-stage segments are sessionised into ONE row per night, in the function.]**
  health-ingest's `kind:"sleep"` branch maps stages (case-insensitive, spaces ignored), clusters
  segments into sessions, drops naps, and writes one `sleep_nights` row per night. **Why:** Apple
  emits dozens of segments + the odd nap; the night is the unit the owner cares about. **Trade-off:**
  the clustering is heuristic (see constants) rather than reading Apple's own session id.
- **[Session gap = 180 min; nap rule = largest in-bed span per wake-date.]** A gap over
  `SESSION_GAP_MIN` (180) starts a new session; per wake-date (Amsterdam date of the latest end) only
  the largest-span session is kept. **Why:** separates a real night from a daytime nap without a
  check-in. **Trade-off:** an unusually long nap on a no-sleep night would be kept as that night —
  acceptable; constants are tunable at the top of sleep.ts.
- **[asleep = REM+Core+Deep+generic-asleep; Awake & In-Bed excluded; awakenings = Awake ≥ 5 min.]**
  `AWAKENING_MIN_MIN` (5) filters micro-wakes. **Why:** matches how Apple frames asleep-vs-in-bed.
  **Trade-off:** none. `score` stays null (reserved); `source` = "apple_health".
- **[Empty window is a success, not an error: {ok:true, nights:0, note:"no_segments"}.]** **Why:** a
  test/quiet window should be recognisable, not look like a failure. **Trade-off:** none.
- **[Upsert on (user_id, night_date), latest send wins.]** Same idempotent pattern as body/activity.
  **Why:** re-running backfill/4×-day is the recovery net. **Trade-off:** a partial re-send of a night
  replaces it — fine, the Shortcut sends a night's full segment set.

## Health → Sleep & Body Stats — S3c: activity_hourly table (2026-06-25)

- **[A SEPARATE table for hourly activity, not more body_metrics rows.]** `activity_hourly`
  (`db/25`) holds one row per (metric_type, day, hour) for steps / active_energy / heart_rate.
  **Why:** these are only meaningful bucketed by the hour, a different shape from body_metrics'
  point-in-time readings (a weigh-in). Mixing them would muddy both. **Trade-off:** a second
  table to read, but each stays clean and single-purpose.
- **[Dedupe = UNIQUE (user_id, metric_type, day, hour, source); source NOT NULL DEFAULT
  'apple-health'.]** **Why:** a re-send of the same hour must upsert, not duplicate. body_metrics'
  source is nullable (the function always supplies it), but here `source` is in the unique key —
  and Postgres treats NULLs as DISTINCT, so a NULL source would silently break the dedupe. NOT
  NULL with a default guarantees the "no dupes" rule actually holds. **Trade-off:** none — a
  deliberate, documented divergence from body_metrics.
- **[metric_type stays free text (no CHECK), hour CHECK 0–23.]** **Why:** keep new hourly metrics
  additive (no migration), same as body_metrics; but hour is a true 0–23 range worth enforcing.
  **Trade-off:** a typo'd metric_type makes a stray series (acceptable; the Shortcut controls names).

## Health → Sleep & Body Stats — S3a: body ingest + backfill (2026-06-25)

- **[ONE idempotent endpoint for backfill AND the recurring runs — no "mode" flag.]** The
  one-time backfill (a wide date window) and the 4×/day runs POST the SAME
  `{kind:"body", readings:[…]}` to health-ingest; re-sends dedupe on the table's unique key.
  **Why:** the unique constraint already makes every write safe to repeat, so a mode flag would
  be dead weight; re-running IS the recovery net. **Trade-off:** none.
- **[Generic over metric_type — a new stat is just a new value, never a code/schema change.]**
  The function never enumerates weight/body_fat/etc.; it stores whatever `metric_type` arrives.
  **Why:** matches the body_metrics shape (S2) and the "store raw" rule. **Trade-off:** a typo'd
  metric_type would create a stray series — acceptable; the Shortcut controls the names.
- **[Malformed readings are SKIPPED + counted, never fatal.]** A bad row (missing metric_type,
  non-numeric value, unparseable `at`) is dropped and tallied; the response is
  `{ok:true, inserted:N, skipped:M}`. **Why:** one bad reading in a big backfill must not sink
  the batch. **Trade-off:** silent-ish skips — the count surfaces them; deeper logging is later.
- **[reading_at normalised to UTC; metric_date = Amsterdam day of `at`.]** Uses the shared
  `localYMD` helper, so Sleep/Body/Gym agree on "a day". **Why:** stable dedupe key + one day
  definition. **Trade-off:** none.
- **[Server-side write via service-role; user_id stamped = OWNER_USER_ID.]** Same pattern as
  gym_*/marty_*; the existing project-wide `OWNER_USER_ID` secret is reused (not re-set).
  **Why:** keeps owner-only RLS intact without a JWT from the Shortcut. **Trade-off:** none.

## Health → Sleep & Body Stats — S2: the three tables (2026-06-25)

- **[Three additive owner-RLS tables; same pattern as gym_*/marty_*]** — `sleep_nights`,
  `body_metrics`, `health_goals` in `db/24_sleep_body_tables.sql`. Each has `user_id default
  auth.uid()` → `auth.users` and four owner policies; RLS on; **no FK into the spine**.
  **Why:** new module ADDS tables, never touches the task/event/category spine. **Trade-off:** none.
- **[Night-date convention CONFIRMED: a night belongs to its wake-up date (Amsterdam day).]**
  `sleep_nights.night_date` is `date`, `UNIQUE (user_id, night_date)`. **Why:** one stable key per
  night; a re-push UPDATES the row (latest wins), so the 4×/day runs can't duplicate a night.
  **Trade-off:** none — this was the [OPEN until S2] item from S0, now closed.
- **[body_metrics dedupe = UNIQUE (user_id, metric_type, reading_at, source).]** **Why:** the four
  daily runs must not double-log the same scale reading; daily average is derived ON READ, never
  stored (no drift). **Trade-off:** none. A new stat is a new `metric_type` value, never a migration.
- **[health_goals keeps history; no unique key.]** Newest `active` row per `goal_type` is the live
  goal; old ones stay. `direction` is CHECK-constrained to `up`/`down`/`by_time`. **Why:** goals
  change over time and history is useful; the check keeps the value clean. **Trade-off:** none.
- **[score column reserved nullable on sleep_nights.]** **Why:** the Watch sleep score isn't
  readable by a Shortcut in V1; a nullable column now saves a later migration. **Trade-off:** null
  until the AI/V2 world fills it.

## Health → Sleep & Body Stats — S4: automation + status line (2026-06-26)

- **Ingest automation = 3 grouped shortcuts under one master.** The 9 per-metric
  shortcuts are nested into 3 group shortcuts by payload kind (Activity 8h · Body 1d ·
  Sleep 1d) run by one "Health Sync" master, wired to 4 Time-of-Day automations
  (06/12/18/00, Amsterdam). **Why:** the 3 kinds have different payload shapes so they
  can't share one POST, but each kind's metrics share a window → grouping is free; gives
  4 automations to maintain (not 9×4) while each original stays independently testable.
  **Trade-off:** 1 extra wrapper layer vs a single mega-shortcut — chosen for debuggability.
- **Automation gotcha locked:** each Time-of-Day automation runs with **Run Immediately
  ON** (else it only shows a prompt). **Why:** Apple defaults to ask-before-running.
- **Source string standardised to `apple-health` (hyphen).** Sleep had written
  `apple_health`; normalised the code (sleep.ts) + existing rows to the majority hyphen.
  **Why:** one consistent source label across all 9 metrics. **Trade-off:** none.
- **Settings "last received" = per-metric, grouped under 3 headers; freshness = newest
  created_at.** A read-only block mirroring the Gym/Hevy line. **Why:** per-metric (not
  per-group) catches a single stalled source; created_at is the uniform "we got something"
  signal. **Trade-off:** busier than 3 lines — acceptable on Settings (a diagnostic, not a
  calm front page). Body lines lag naturally (sparse weigh-ins) — not a fault.

## Health → Sleep & Body Stats — S0: the locked plan (2026-06-25)

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

## Health → Gym "The Form Guide" — G16: module complete; front-page zero-scroll deferred to V2 (2026-06-25)

- **[The Gym/Health module is COMPLETE (G1–G16); front-page zero-scroll is deliberately deferred to a V2
  piece]** — the G16 finishing audit found the whole module clean (every empty/edge state warm, units/dates/
  type consistent, no dead code) EXCEPT one thing: the Form Guide front page does **not** hold the desktop
  **zero-scroll** law — it stacks the story headline + 5 full-width zones in one ~900px column and scrolls on
  a normal laptop. **Why deferred (owner's call):** densifying it to fit one viewport (a tighter 2-column grid
  / smaller charts, with per-zone re-verification) is a real layout rework, not a finishing-polish nit, and it
  must not regress the verified zones — so it is its **own careful later (V2) piece**, not a bug and not
  forgotten. Everything else in the module is finished and verified. **Trade-off:** the front page scrolls for
  now; accepted deliberately so the module can close without a risky end-of-track layout rework.
- **[G16 polish was scoped to a pure `pretty()` dedupe; chart motion left static]** — the only code change in
  G16 was moving three identical `pretty()` muscle-name helpers into one `prettyMuscle()` in `gym/gymFormat`
  (identical output). **Why:** the audit's other ideas (quiet chart draw-in motion) were declined — static
  reads calm and motion risked the "gaudy" trap. **Trade-off:** none.

## Health → Gym — G7: the calc layer + consistency metric (2026-06-24)
- **[Consistency headline = sessions-per-week; daily streak is a small secondary
  stat only]** — the front page leads on **how many sessions per week** (last 8
  weeks); a strict consecutive-**day** streak is shown small, beside it, never as
  the headline. **Why:** rest days are normal and correct in training — a daily
  streak punishes healthy recovery and would read as "you're failing" on a planned
  off-day; sessions-per-week rewards the real habit. (Owner-confirmed after
  hand-checking G7 Commit A against real Hevy data.) **Trade-off:** none — both
  numbers are computed; this is purely which one gets the visual weight.
- **[Calc layer order: built the maths (calc util) BEFORE the visible shell]** —
  the doc lists the shell as G7 and the calc as G8; the owner reordered to build
  and **hand-verify the maths first**, then dress the empty page. **Why:** numbers
  you can't see can still be wrong — verifying them against real sessions before
  any UI exists removes the risk that a styled page hides a maths bug. **Trade-off:**
  none — same files, safer order.

## Health → Gym — G3: the backfill (2026-06-24)

- **[Replace-children on re-import, not merge]** — when a workout already exists,
  the backfill **deletes that workout's exercises (sets cascade) and reinserts
  them fresh** from Hevy, rather than diffing/merging set-by-set. **Why:** a
  workout edited in Hevy (a set added/removed/changed) re-imports correctly and
  sets can never silently accumulate; it's the simplest correct recovery net. This
  is a **within-module (gym→gym) delete — it never touches the spine.**
  **Trade-off:** a re-run rewrites every child row even when nothing changed (more
  writes), which is fine for a twice-daily / on-demand job on one user's data.
- **[Idempotency key = upsert on (user_id, hevy_id) + replace-children]** — re-
  running the backfill can never duplicate. **Why:** this IS the module's recovery
  net (we keep no undo log for gym). **Trade-off:** none.
- **[Page size 10, ~350 ms between pages, ONE 429 backoff then stop]** — Hevy caps
  pageSize at 10; we pace requests and, on a 429, back off once (honouring
  `Retry-After` if sent) then **stop cleanly and report progress**. **Why:** Hevy's
  real rate ceiling is still unknown (G1 saw no headers); a clean stop is safe
  because the job is idempotent — the owner just re-runs. The run also **measures**
  the ceiling (we surface every rate-limit header seen). **Trade-off:** a low cap
  means more pages, but history is small (~92 workouts ≈ 10 pages).
- **[Store Hevy's raw `set.type` verbatim]** — no normalisation at write time
  (normal/warmup/dropset/failure stored as-is, free text, no CHECK). **Why:** a
  read-only cache must never break on an unseen Hevy tag; the known tags + warm-up
  exclusion live in the read-time calc util (G8). **Trade-off:** none.
- **[Mapping coded against Hevy's documented v1 shape, defensively]** — `id→hevy_id`,
  `start_time→started_at`, `end_time→ended_at`; exercise `index→position`,
  `exercise_template_id` kept now (for G6); set `index→position`, `weight_kg`,
  `reps`, `type→set_type`, `rpe`, `distance_meters→distance_m`, `duration_seconds`.
  Unknown/renamed fields degrade to `null` rather than crashing. **Why:** the key
  is a server-only secret, so the live payload is confirmed by the owner's run, not
  from the dev machine. **Trade-off:** if Hevy's real shape differs, the backfill
  stops with a clear note instead of writing bad rows — by design.

---

## Health → Gym "The Form Guide" — G0: the locked decisions (2026-06-24)

> A new **read-only** Health module that caches Hevy workout data into its own
> tables and reports it on four desktop screens. Full plan: `09-gym-form-guide.md`.
> Section is **Health** (nav: Today · Calendar · Health · Settings; view id
> `health`); **Gym is Health's front page** for now.

- **[The section is "Health", not "Gym"]** — Gym / "The Form Guide" is the
  *content* of a Health section. **Why:** later Health sub-sections (sleep, mood,
  nutrition, body stats) slot under the same banner with no new nav change.
  **Trade-off:** none — Health = Gym until a second sub-section exists.
- **[Read-only + no AI]** — LifeOS only reads Hevy (never a write endpoint), and
  the one "story" headline is built from **code-picked templates, not Gemini**.
  **Why:** keeps Health/Gym free + private and means the **"health data → paid
  AI"** hard constraint never trips (no health data is ever sent to an AI).
  **Trade-off:** the headline is template-shaped, not free-written prose — fine.
- **[Estimated 1RM = Epley]** — `weight × (1 + reps / 30)`. **Why:** a simple,
  widely-used estimate, good enough for trend/records. **Trade-off:** an estimate,
  not a measured max (all formulas are).
- **[PR = heaviest weight, used consistently everywhere]** — **Why:** one
  unambiguous definition across every screen avoids "which PR?" confusion.
  **Trade-off:** doesn't credit a rep-PR at lower weight (estimated-1RM covers that
  separately).
- **[Warm-ups excluded from PR / estimated-1RM / top-set; total volume counts ALL
  sets]** — Hevy tags each set normal / warmup / dropset / failure. **Why:** a
  warm-up shouldn't set a record, but it is still work done (volume). **Trade-off:**
  none — it matches how lifters read their own numbers.
- **[Rolling-7-day box-score band]** — Volume, Sessions, Time, New PRs. **Why:** a
  glanceable "last week of training" line, the front page's lead stat. **Trade-off:**
  a rolling window, not calendar-week — chosen for "how am I doing right now".
- **[Sync twice daily via pg_cron, reusing the existing Vault service-role key]** —
  real Vault name confirmed when the cron is built at G5; Hevy webhooks are a later
  upgrade; **G1 confirms Hevy's own rate limits** first. **Why:** mirrors the proven
  brief/nudge cron pattern; twice daily is plenty for a personal log. **Trade-off:**
  up to ~12h stale between syncs — invisible for this use.
- **[Metrics computed ON-READ; store only RAW Hevy data]** — a `src/` calc util
  derives every number at read time; nothing derived is stored. **Why:** no drift
  between cache and source; the backfill stays the single truth. **Trade-off:**
  a little compute per page load (cache later only if perf ever needs it).
- **[Store `exercise_template_id` from the start; muscle groups via a G6 lookup]** —
  **Why:** keeping the template id lets us add the muscle-group lookup
  (`/v1/exercise_templates`) later **without re-pulling history**. **Trade-off:**
  one extra stored id now — trivial.
- **[No undo-log piece for Gym]** — unlike Marty's `marty_actions`. **Why:** the
  gym tables are a **read-only cache** of Hevy, so **re-running the backfill (G3)
  is the recovery net**. **Trade-off:** none — there's nothing owner-authored to undo.
- **[Tables: additive, owner-RLS, no spine FK]** — `gym_workouts`
  (`unique(user_id, hevy_id)`), `gym_exercises` (with `exercise_template_id`),
  `gym_sets`, `gym_sync_state`, `gym_pins` (all G2); the exercise-templates lookup
  (G6). **Why:** same spine-protecting pattern as the `marty_*` tables. **Trade-off:**
  none.
- **[The Hevy key is a secret: `HEVY_API_KEY` in the Supabase secret store]** —
  never in `src/`, never in the repo; a later Settings "Hevy" line (G5) shows
  **connection / last-synced status only**, never the key. **Why:** the repo is
  public and anything in `src/` ships to the browser. **Trade-off:** none.
- **[Two-track boundary rule]** — Health/Gym runs in parallel with the paused
  Phase 7 redesign. Every Gym front-end piece is **new files only** (may touch
  `LoggedIn.jsx` + the `NAV` array in `EditionHeader.jsx` and nothing else in the
  shell; imports kit blocks as-is; new primitives only as new `src/kit/` blocks);
  **never a single commit that mixes `src/` with `supabase/functions/`**. **Why:**
  the two tracks must never entangle so either can roll back cleanly. **Trade-off:**
  some pieces span two commits — worth it.
- **[Doc home `09-gym-form-guide.md`; phase prefix `G` (G0–G15)]** — **Why:** `08`
  is the Marty plan; `G` collides with no existing prefix (Phase 0–8, M, T, C, A,
  SUB, AUTH, DESK). **Trade-off:** none.

## Marty M10 — hardening pass: trim the wasted re-ask, split the edit engine, double-book guard; scaffolding deferred (2026-06-24)

- **[The Gemini retry loop now fails fast on deterministic errors, keeping only the transient retry]** — it
  re-asked on ANY non-ok status; at temperature 0 a deterministic 4xx returns the same result, so it now
  retries only 5xx/408/network (the genuine "server busy") and errors immediately on other 4xx. **Why:** the
  recon's "wasted re-ask." **Trade-off:** none user-visible — same error reply, just ~6s faster on the rare
  deterministic error; the real server-busy retry is untouched. (Distinct from the M0 fix that moved the
  capture JSON parse out of the retry loop — that wasted re-ask was already gone.)
- **[`edit.ts` split: the commit engine extracted to a leaf `editcore.ts`]** — `edit.ts` had grown to 242
  (the shared engine for M3 edits, M8 numbered replies, M9 "yes"). The `commit`/`commitReply` engine +
  `Change`/`CommitResult` types moved to `editcore.ts`; `edit.ts` (ops + dispatch) and `nudge.ts` import from
  it (no cycle: editcore is a leaf). **Why:** the ~250-line rule on a load-bearing file. **Trade-off:** none
  — pure code move, behaviour identical (edit.ts→203).
- **[The nudge "yes" re-checks the slot is still free before blocking]** — the M9 checker noted accept
  checked the window hadn't passed + the task exists, but not whether the owner filled that hour between the
  offer and the reply. `acceptNudge` now re-reads events + other scheduled tasks overlapping the slot; if
  anything's there it declines ("looks like that hour's taken now — left your calendar as it is") rather than
  double-book. Conservative: a read failure also declines. **Trade-off:** one extra read on accept — fine.
- **[Test scaffolding RETIRED (owner confirmed no every-3-min cron)]** — the owner verified only two live
  cron jobs (the real 7am brief + the real hourly nudge, both `scheduled`, neither `force`), so the bypass
  code served nothing live and was safe to remove. Removed: the brief `test` 0-day path, the brief
  `force`/hour-gate bypass, and `scanForNudge`'s `force` param (it now ALWAYS enforces 9–6 + caps +
  never-back-to-back). **Kept** "brief" and "nudge" as on-demand triggers that go through the FULLY-
  guardrailed path — an on-demand "nudge" offers only when it genuinely would (9–6, within caps, real
  window) and is silent otherwise. **Verified by sweep:** no force/test/bypass route remains in any code
  path; the only ways to fire a brief/nudge (on-demand + the two live crons) all run the guarded code.
  **Why:** retire dead test paths without losing on-demand testing, and never remove code a live cron serves.
  **Trade-off:** an on-demand "nudge" outside hours / over caps now stays silent (correct, by design — there
  is no longer any way to force one).

- **[Built as a NUDGE mode of the brief function, reusing its cron/pg_net + DST-safe local-hour gate]** —
  rather than a new function or a new timezone scheme, the daytime scan is a `{ nudge: true }` mode of the
  brief function, with its OWN 9–6 gate inside `scanForNudge` (the 7am gate doesn't apply). **Why:** reuse
  the proven scheduling pattern (the spec said "same cron/pg_net, don't invent a new timezone scheme") and
  the existing day reads. **Trade-off:** the brief function now has two proactive modes — acceptable, both
  are "proactive engagement."
- **[The guardrails ARE the feature — all enforced in code]** — 9am–6pm only; max 2/day (one morning, one
  afternoon); never back-to-back (≥2h since the last offer); ONE offer, one task (most-overdue, else one
  quick-win), never a list. Enforced via `marty_nudges` (today's rows). **Why:** "never annoying" matters
  more than the nudge being clever. **Trade-off:** the scan stays silent most fires — intended.
- **["yes" writes the calendar block through the M3 edit engine (undoable); "no" keeps NO memory]** — a "yes"
  sets the task's scheduled_start/end via the exported `commitReply` (logs before-values → "undo" clears the
  block). A "no" only marks today's offer answered (so the cap holds); yesterday's rows are ignored, so there
  is no lasting "don't offer X" memory — it may come up again another day. **Why:** the spec exactly. **Trade-off:**
  none.
- **[New `marty_nudges` table — caps + open-offer state; additive, owner-only, NO FK to spine — CHECKER-GATED]**
  — needed because the brief function sends the offer but the yes/no arrives at the telegram function (no
  shared memory), AND the caps need persistent daily state. `offered_task_id` is a plain uuid (no FK), so a
  deleted task can't block/cascade. The offer expires when its window passes (a stale "yes" → "that window's
  gone"). Must be run + checker-reviewed before M9 is done.
- **[Kept the test scaffolding; added "nudge test"]** — owner's call: leave "brief test" (still used) and the
  `force`/every-3-min bypass in place; retire them in the deferred M10 hardening pass once the every-3-min
  cron job is confirmed gone. Added "nudge test" (mirrors "brief test") so the scan is verifiable on demand
  without waiting for cron. **Why:** don't remove something the owner may still be using. The production cron
  (`db/16`) is owner-run scheduling infra, not a spine change.

- **[Part A: reorder the existing brief, don't rebuild it]** — the brief now LEADS with today's schedule and
  puts due/overdue under a NEEDS-ATTENTION footer; the one-nudge + one-gap caps are unchanged. Done by
  reordering `day.ts` (checklist + facts) and the `write.ts` prompt — no new brief logic. **Why:** "don't
  increase what the brief says — just order so what matters leads." **Trade-off:** none.
- **[Part B: the number→item map is STORED at send-time, not re-derived on reply (owner's choice)]** — when
  the brief sends, its numbered actionable list is parked in a new `marty_brief` table; a reply reads it, so
  "1" is authoritative even if the data changed. **Why:** re-deriving is fragile — an item added/removed
  between brief and reply would shift the numbers and act on the WRONG item; "verify, don't trust." The two
  functions (brief sends, telegram receives the reply) can't share memory, so a table is required. **Trade-off:**
  a schema change (checker-gated); accepted for correctness. A reply to a since-deleted number says "that
  one's gone."
- **[A numbered reply acts on the EXACT row via the existing M3 edit engine — a forced target, not a re-match]**
  — `intent.ts` gained `target_number`; the number resolves (via `marty_brief`) to {table,id}, and
  `handleEdit` takes a forced candidate so the op runs on that precise row (bypassing title matching). **Why:**
  reuse M3 (so every brief action is undoable) AND avoid a title re-match that could hit a duplicate. Names
  still work (the non-forced path). **Trade-off:** `edit.ts` grew to ~240 lines (split candidate for M10).
- **[New `marty_brief` table — one row/owner, no FK to spine — CHECKER-GATED]** — PK = user_id (a new brief
  overwrites); `items` is JSON [{n,table,id,title}] with the ids as plain values (no FK), so a deleted
  task/event can't block/cascade through the map. The brief function got its one small write (`store.ts`);
  it stays read-only otherwise. Numbers are only shown when the map actually stored, so pre-SQL the brief is
  simply the reordered version (no dangling numbers). Must be run + checker-reviewed before M8 is done.

- **[A voice note is transcribed, then fed into the SAME `route()` as a typed message — nothing is
  re-implemented]** — the transcript flows through capture / multi-item / category guessing / the follow-up
  automatically. **Why:** the goal was "feed it in as if I'd typed it." **Trade-off:** none; it's the least
  code and stays consistent with every existing behaviour.
- **[Full parity — voice can do everything typing can, incl. undo/edit/delete — OWNER's call]** — surfaced
  the risk first (a mis-heard destructive command acts immediately) and the owner chose full parity over
  scoping voice to capture+questions. **Why:** matches "feed as if typed" and the project's act-when-sure +
  undo philosophy; delete = archive (restorable) and every reply ECHOES the transcript, so a mis-hear is
  visible and reversible. **Trade-off:** voice is the least-reliable input, so a mis-heard destructive action
  does happen — mitigated by the echo + undo, accepted deliberately.
- **[Always echo "Heard: …" joined to the normal confirmation]** — the transcript is prefixed to whatever
  the router replies. **Why:** a mis-hear must be obvious at a glance and reversible. The typed path is
  unchanged (the echo prefix is empty for text), so M1–M6 don't regress.
- **[Transcription goes through the M0 seam; a new `transcribeAudio` helper, free tier]** — `_shared/gemini.ts`
  factored its fetch/retry into a shared `post()` and added an audio helper (inline audio part, SAME
  key/model/endpoint). No key/model/endpoint in `voice.ts`. **Why:** the M0 decision — one place owns Gemini
  access; a spoken "buy milk" isn't sensitive, so the free tier is fine. **Trade-off / watch:** the shared
  model (`gemini-3.1-flash-lite`) is assumed to accept audio; if it doesn't, the audio call gets a different
  model in the seam (a one-line change) — no other code moves.
- **[No schema change]** — voice is purely an input adapter in front of the existing pipeline.

- **[Capture GUESSES a category from the owner's REAL categories and SHOWS it; never invents, never silent]**
  — `guessCategories` reads the actual categories table; the AI picks from that exact list or returns Inbox
  (null) when nothing fits. The guess is in the confirmation text ("Saved 'call plumber' → Admin"). **Why:**
  an honest "I don't know → Inbox" beats a bad guess, and a soft AI guess must be visible to be correctable.
  **Trade-off:** capture now makes an extra Gemini call (classify + understand + guess); fine for one user,
  a candidate for M10 hardening.
- **[Inbox stays `null`; the seeded "Inbox" category row is excluded from guesses]** — the spine convention
  is category_id null = Inbox, so the guess maps "no fit"/"Inbox" to null and never assigns the Inbox row's
  id. **Why:** consistency with the existing capture + app behaviour; don't create a second meaning of Inbox.
- **[A worded correction reuses the M3 edit path — a new `categorize` op, NOT a parallel write]** — M3 had
  no category op, so one was added on M3's `commit` machinery (logs before-values → undoable). "that's
  Errands" refiles the LAST captured item; "call plumber is Work" refiles a named one. **Why:** the spec's
  "reuse the existing edit path, the fix is itself undoable." **Trade-off:** a bare "that's X" needs the
  last-created item to be unambiguous (one item); after a batch it asks which.
- **[Learning is by PATTERN (threshold = 2), enforced in code — a single correction never retrains]** — each
  correction is logged; a learned preference for a new item applies only when >= 2 past corrections to the
  SAME category exist among items SHARING a content word with it. So: 1 correction = a one-off fix; the 2nd
  matching correction establishes the pattern; the next similar capture auto-files. **Why:** the spec — don't
  change the habit on a one-off. The threshold is deterministic and code-side (not left to the AI). **Trade-off:**
  the "same kind" match is a shared-content-word heuristic (no embeddings), so it can be a touch broad — but
  the result is always SHOWN and correctable, which the design depends on.
- **[New `marty_category_learning` table — additive, owner-only, NO FK to the spine — CHECKER-GATED]** — it
  logs (title, guessed_category_id, corrected_category_id); the category ids are plain uuids (NOT FKs) so a
  deleted category can't block/cascade through the log (a stale preference is just ignored). It changes no
  spine meaning; the only spine behaviour change is writing a real category_id (a value the column already
  allowed) instead of null. Must be run + checker-reviewed before M6 is done.

- **[Don't block a batch on one ambiguous item — save the clear ones immediately, then ask about the one
  unclear]** — when most items are savable and exactly one is an event missing its time, the clear items
  are saved at once and Marty asks only about that one. **Why:** the value (capturing several things fast)
  shouldn't be held hostage to one missing detail. **Trade-off:** none worth noting; matches the M4
  discipline of at-most-one follow-up.
- **[2+ unclear → save the clear ones and LIST which need a time; never fire multiple follow-ups]** — owner
  confirmed this as the simplest safe choice. **Why:** a chain of follow-ups would be an interrogation and
  needs multi-slot pending state. Listing them lets the owner re-send each with a time. **Trade-off:** the
  owner re-types the unclear ones rather than answering inline — accepted for simplicity.
- **[The follow-up completes into the SAME batch action, so undo still pulls the whole batch]** — the clear
  items are saved as one create action; the parked question stores that action's id; when answered, the
  completed item is APPENDED to that action (new `appendToAction`) rather than logged as a new one. **Why:**
  the spec requires "a batch where one item was completed via a follow-up still undoes as one logical
  action." `undo` / `undo <name>` grammar is unchanged. **Trade-off:** `save.ts` exposes the action id
  (`saveItemsTracked`) and an append path; if the batch was already undone before the answer, the completed
  item falls back to its own action so it stays undoable.
- **[Reused M4's pending — no second mechanism, no schema change]** — the only addition is storing
  `batchActionId` inside the existing `marty_pending.draft` JSON. Confirmed: reuses M2's action log + M4's
  pending table; no `db/` change. The batch parsing itself already existed (built in M2 to prove
  batch-undo) — M5 extended the routing, it did not rebuild parsing.

- **[Pending capture lives in a new table `marty_pending`, NOT in function memory]** — the owner was asked
  to decide up front and chose the table. **Why:** edge functions are short-lived and can restart between
  the two messages, so an in-memory draft could be silently forgotten — unacceptable for a feature you rely
  on. The table is reliable, owner-scoped, and survives a restart. **Trade-off:** it's a schema change
  (checker-gated, owner runs the SQL) rather than zero-schema — accepted for reliability.
- **[One row per owner via PK = user_id; ~5-minute expiry enforced in code]** — a new question simply
  overwrites the old (no pile-up), and `getPending` ignores+clears anything older than 5 minutes. **Why:**
  structurally guarantees "only the latest, recent question is live" so a stray later message can't attach
  to a stale one. Cleared on completion, on abandonment, and on expiry. **Trade-off:** none worth noting.
- **[Ask at most ONE follow-up, only for an event missing its time]** — a new `needs_time` flag on the
  parser marks an appointment/event that wants a clock time but got none (lunch/dinner/meeting), distinct
  from ordinary to-dos. Only a SINGLE-item capture that's `needs_time` with no time triggers the question;
  everything else saves straight away. **Why:** the discipline is "don't interrogate" — a task saves on a
  title alone, a complete capture saves with no question. **Trade-off:** a multi-item message never asks
  (saves all per existing rules) — intentional, keeps it minimal.
- **[Only the very next message completes it, and only if it's essentially just a time]** — `parseTimeAnswer`
  returns a time ONLY when the whole reply is a time-of-day answer (validated to HH:MM); a command,
  question, or new capture — even one that mentions a time, like "move dentist to 3pm" — is treated as
  not-an-answer, which drops the parked question and routes the message normally. Reserved commands
  (undo/brief) short-circuit (no AI call) and always abandon the pending. **Why:** never force-fit an
  unrelated message as the answer; never lose a real command/question to a stale capture. **Trade-off:** a
  rare genuine bare-time meant as something else could be read as the answer — acceptable.
- **[Completion saves through the EXISTING capture path]** — the finished draft becomes a timed event and
  is saved via `saveItems`, so it lands in Inbox, stamps source, and is undoable via M2/M3 exactly like any
  capture. No second save path. **[No-schema-yet fallback]:** if `marty_pending` isn't set up, `setPending`
  fails and the item just saves normally (no broken half-state) — so the code deploys safely before the SQL.
- **[Schema change → checker-gated]** — `db/12_marty_pending.sql` must be run by the owner and reviewed by
  the checker before M4 counts as done.

- **[Marty's delete now creates a real archive_batch, exactly like the app — superseding M3's batch-less
  archive]** — M3 set `archived_at` but left `archive_batch_id` NULL. **The drift:** the app's Archive
  screen finds deleted items by their `archive_batch_id` (grouped under an `archive_batches` row), so a
  batch-less Marty-archived row was invisible there — recoverable only by Marty's one-level undo, and once
  another action moved past that, recoverable by NEITHER Marty nor Archive. A real data-loss gap and a
  drift from the spine's "delete = archive into a restorable batch" rule. **The fix:** `opDelete` now
  inserts an `archive_batches` row (label = item title, source_type = 'task'|'event') and stamps
  `archive_batch_id` on the row(s) + active subtasks — byte-for-byte the shape `src/archive.js`
  (`archiveTask`/`archiveEvent`) writes. So a text-deleted item shows in the Archive screen and restores
  there, AND Marty's undo still reverts it exactly. **Why:** one archive system, two recovery paths, no
  parallel "archived" state. **Trade-off:** none — it removes a special case and matches the app.
- **[Marty's undo of a delete also removes the now-empty batch, matching the app's restore]** — after
  reverting the rows (clearing `archived_at` + `archive_batch_id`), undo deletes the `archive_batches`
  row, but ONLY once every item under that batch has been reverted (full undo, or the last item of a
  partial `undo <name>`). **Why:** mirrors the app's `unarchiveBatch` (clear rows, drop batch) and avoids
  leaving an empty batch in the Archive screen; the "only when empty" guard prevents the FK's ON DELETE
  SET NULL from orphaning a still-archived sibling. **Trade-off:** a partial `undo <name>` of a multi-item
  delete leaves the batch until its last item is restored — correct, not a bug.
- **[No schema change]** — reuses `archive_batches` / `archived_at` / `archive_batch_id` and stores the
  batch id inside the existing `marty_actions.items` JSONB. Confirmed: no `db/` change.

- **[Marty's delete ARCHIVES the row (sets `archived_at`), it does not hard-delete]** — "delete X" sets
  `archived_at` (like the app's own delete) and undo clears it. **Why:** it restores **exactly** (the row
  is never destroyed, so all FKs/subtasks stay intact) and it honours the spine's "delete = archive, never
  destroy" principle. A hard delete + re-insert couldn't restore exactly — `parent_task_id`/`category_id`
  are `ON DELETE SET NULL`, so children would detach. **Trade-off:** this deviates from M2's originally
  sketched "store the full prior row, restore by re-insert" — we store the prior archive-columns instead
  and revert them, which is strictly safer. A Marty-deleted item is archived (hidden everywhere
  active-only is read) and restorable via Marty's "undo"; it is **not** wrapped in an app `archive_batch`
  (so it won't show in the app's Archive screen) — a deliberate simplification, a possible later nicety.
  Deleting a task cascades to its active subtasks in the same action (matching the app).
- **[complete/reschedule/rename are `edit` actions reverted by PATCHing before-values; the DB trigger keeps
  completed_at honest]** — each op records only the columns it changes. Complete records just `status`
  because the `tasks_sync_completed_at` trigger sets/clears `completed_at` from status — so reverting
  status reverts the finish time automatically. **Trade-off:** none; minimal recorded state.
- **[Prior state is logged BEFORE the change; nothing changes without a logged way back]** — `commit()`
  inserts the `marty_actions` entry first; if that fails it changes nothing. **Why:** guarantees every
  change is undoable. **Trade-off:** an apply that fails after logging leaves a log entry whose undo is a
  harmless no-op — acceptable.
- **[One item, or ask: act only on an exact single match]** — `find.ts` reads active-only candidates and
  matches by name (exact, then contains) + optional time/date hints. Zero → "couldn't find"; one → act;
  many → name them and ask. **Why:** never edit/delete the wrong row. **Trade-off:** the owner sometimes
  has to disambiguate — correct for destructive ops.
- **[Edit classification folded into the ONE intent classifier]** — the existing classify() call now also
  returns `edit` + op + target/new fields, so an edit costs ONE Gemini call (no target row is parsed by a
  second call). **Trade-off:** a larger classifier prompt; mitigated by temperature 0 + per-op examples,
  with "unclear" still the safety net.
- **[Bare-date fix — belt-and-suspenders, scoped so "yesterday" is safe]** — both Gemini prompts say a
  bare month-day means the next upcoming occurrence (never the past), AND a code guard
  (`rollPastBareDateForward`) rolls a past bare date forward a year. The guard runs ONLY when the model
  flags the date `bare_date=true` (an absolute month-day with no year), so legitimate past relative refs
  ("yesterday", "last Monday") are never rolled. **Why:** M3 lets you reschedule onto dates, so a past
  bare date had to be impossible. **Trade-off:** one extra boolean field on the parse.

- **[Undo foundation built FIRST, as its own phase, before edit/delete exists]** — M2 builds and proves the
  reversal mechanism on the only existing write (capture) before any edit/delete/move feature is added.
  **Why:** edit/delete are the dangerous operations; having a proven "reverse anything" substrate before
  they exist means M3 can't ship an irreversible action. **Trade-off:** a phase with no new user-facing
  feature — accepted because it's load-bearing for everything after.
- **[A generalised action log with a JSONB items array, replacing create-only `telegram_saves`]** — new
  table `marty_actions`: one row = one logical action (`kind` create/edit/delete), with `items` JSONB
  holding one element per affected item and room for **prior state** (edit before-values; the full deleted
  row). **Why:** "one action = one entry" makes a multi-item capture undo as a unit, and storing prior
  state is what lets an edit/delete be reversed — designed now so M3 needs **no further schema change**.
  Chose JSONB over a child table because the per-kind shape varies and one row per action is simpler to
  read/clear. **Trade-off:** prior-state values live in JSON (not typed columns); fine for a private log.
- **[No FK from the log to spine rows; superseded `telegram_saves` left in place]** — `items[].id` is a
  plain value, not a foreign key, so a row deleted elsewhere just goes stale ("already gone — nothing
  changed") and the log can never block/cascade a spine row. `telegram_saves` is not dropped (additive
  principle); it's simply no longer read or written. **Trade-off:** a dead table remains until a later
  cleanup.
- **[Capture became multi-item to PROVE batch undo — still capture, not a new edit feature]** — `understand`
  now returns an array and `save` logs all items as ONE create action. **Why:** the verify requires
  "capture three in one message → undo pulls all three (one action)." Single-item capture wording is kept
  byte-for-byte. **Trade-off:** a slightly larger capture prompt; mitigated by "prefer one item unless
  clearly several."
- **[Undo grammar: whole-action vs named-item, ask when ambiguous; surgical + owner-only]** — "undo" =
  reverse the last action; "undo <name>" = reverse one item (exact title match preferred, else contains);
  more than one match → ASK, change nothing. Every spine deletion is by `id` + `user_id` owner filter, one
  action at a time. **Why:** never guess a destructive action; never touch a human-made row (those are
  never in the log) except to restore one Marty deleted on an explicit undo. **Trade-off:** "undo <name>"
  can't act on app-made items — correct by design (Marty only reverses its own actions).
- **[Schema change → checker-gated]** — M2 is NOT done on the builder's say-so. `db/11_marty_actions.sql`
  must be run by the owner and the change reviewed by the checker before M2 counts as complete.

- **[Routing moved into its own `route.ts`; `index.ts` is a thin front door]** — `index.ts` now only does
  security → owner gate → text check → hand the message to `route()`. **Why:** new message types
  (questions now, edit/delete later) need a clean place to slot in; the old inline word-ladder would have
  ballooned `index.ts` and tangled security with intent. **Trade-off:** one more file and a hop, for a
  front door that stays small and a router that's easy to extend.
- **[A Gemini intent step decides question vs capture — and returns "unclear" on a toss-up, so Marty ASKS
  rather than guess]** — `intent.ts` classifies each non-trigger message (via the M0 `_shared/gemini.ts`
  seam, temperature 0) as **question / capture / unclear**. **Why:** a wrong "capture" guess would WRITE
  something the owner didn't ask for; making the model fall back to "unclear → ask a one-liner" keeps a
  bad guess from silently saving. **Trade-off:** a clear capture now costs **two** Gemini calls (classify,
  then the unchanged capture parse) instead of one, and an occasional genuine capture might get the
  "did you mean to add that?" question. We accept both: safety over a silent wrong write, and the free
  tier easily covers one owner's volume. Clear captures are anchored with examples so they pass straight
  through; capture behaviour itself is byte-for-byte unchanged (`understand.ts` untouched).
- **[The query path is read-only BY CONSTRUCTION, not by discipline]** — `query.ts` imports **only**
  `select` from `db.ts` (never `insert`/`del`); there is no write/update/delete code in it at all. Reads
  are owner-scoped AND active-only (`archived_at IS NULL`), the same rules the brief uses. **Why:** "a
  question must never change data" is enforced by what the module *can* do, not by remembering not to
  call a writer. **Trade-off:** none worth noting.
- **[Reuse judgement: shared date helpers, not the brief's today-locked readers]** — M1 reuses
  `_shared/datetime.ts` (the genuinely shared date math) and writes its own small per-question readers,
  rather than refactoring the brief's `day.ts`/`gap.ts` (which are hard-wired to "today"). **Why:**
  parameterising the verified brief readers by arbitrary date is real surgery on a working feature;
  keeping M1 self-contained in `telegram/` avoids risking the brief. **Trade-off:** a little read logic
  resembles the brief's; extracting a shared day-reader is a possible later cleanup, noted in the plan.
- **[Known bare-date bug is respected, not fixed, and not hidden]** — "what did I forget?" reports
  overdue as the data says, which can include a phantom-overdue task caused by the un-guarded bare-date
  resolution. M1 neither fixes that bug nor builds anything that hides or depends on it. **Why:** fixing
  bare-dates is a separate decision (before or after this track); M1 stays scoped.

- **[The Telegram-bot upgrade is its own track, prefixed M0–M9, not folded into the phase numbers]** —
  The redesign is **Phase 7** and is unfinished; the bot upgrade is a second, independent body of work.
  Giving the bot work its own short prefix (M0–M9) keeps every roadmap line, commit, and decision
  instantly identifiable as "the bot track" vs "the redesign track," so two in-flight efforts don't get
  confused for one. **Why:** the two touch **different folders** — Phase 7 is `src/` (front-end), the
  Marty track is `supabase/functions/` (backend) — so they can run side by side without colliding, as
  long as they're never mixed in one commit. **Trade-off:** the roadmap now carries two "in progress"
  tracks at once instead of a single linear sequence; we accept that because the folder split makes them
  genuinely non-overlapping. Full plan in `08-marty-upgrade.md`; Phase 7 marked ⏸ PAUSED in the roadmap.

- **[The twin hooks collapsed into ONE `kit/useGridDrag`; full merge, no type-(ii) blocker]** — The
  diff of `useTodayGrid` vs `useWeekGrid` found **every** difference to be type (i) a parameter, not a
  behavioural divergence. Config: `geomRef` (lane vs body), `startMin` (7am=420 vs 0), `dayStartMsAt(x)`
  (Today a constant fn → single day; week the column under x = re-day), `offAt(x,y)→target|null`
  (Today: which module; week: offGrid), `onOff(item,target)` (Today re-bucket; week unschedule),
  `eventsShowOff` (event off-preview: Today false, week true), optional `onTraySelect` (present → tray
  rows clickable). **Event-snap-back is shared core** (same rule both screens), not a divergence. So a
  **full merge** was correct — the escape hatch (keep the twins) was not needed.
- **[Today is the reference; reproduced byte-for-byte — incl. the justDragged subtlety]** — The merge
  rule was "the hook reproduces Today exactly; week-specific behaviour is the parameterised part; never
  adjust Today to fit the merge." The one trap a naive merge hits: Today's tray grip has **no onClick**,
  so a Today tray drag must **not** set `justDragged` (else it would swallow the next block click).
  Gated on `onTraySelect` presence — Today (no onTraySelect) never sets it; week (has it) does. The
  unified `blockPreview`/`createDraft` carry extra fields (item/dayStartMs) that Today's DayGrid simply
  ignores; `dragLabel` is computed but Today never renders it (setStates batch → no extra renders).
  Return shape unchanged, so DayGrid/WeekGrid/WeekColumn needed no edits.
- **[Calendar rebuild closed out]** — With C4 done, Calendar is one engine on Today's kit (one grid
  sheet, the shared form, tray, Month, all-day band, one `useGridDrag`); the old Calendar cluster is
  deleted. `TaskEditForm` remains only because the *old task-list* cluster still uses it — a separate
  future cleanup, not the Calendar rebuild.

## Phase 7 — Calendar C7: all-day/multi-day band + the one schema change (2026-06-23)

- **[Model (a): an `all_day` flag + existing start/end carrying the date(s)]** — Chosen over (b)
  (date-only/normalised everywhere) for simplicity. `all_day=true` → the event is all-day; start/end
  carry the dates, the time is ignored by the grid. **Storage convention: local midnight,
  end-EXCLUSIVE** (a Mon–Wed all-day stores `start_at = Mon 00:00`, `end_at = Thu 00:00`). **Why
  end-exclusive:** it matches the EXISTING multi-day span detection (`monthLayout` reads `end_at −
  1ms`), so all-day and timed multi-day share ONE span model — no special-casing. The form shows the
  **inclusive** last date (`end_at − 1 day`).
- **[Migration-first, verified on the LIVE table before any UI (Phase 4 rule)]** — `db/10` adds
  `all_day boolean not null default false` — additive, idempotent (`if not exists`), existing rows
  backfill to false, no renames/drops, RLS unchanged. The owner ran it in the Supabase SQL editor;
  **proven applied** by re-probing the live REST endpoint (`select=all_day` went `42703 column does
  not exist` → `200`) + the owner's row-count check. **No UI was written until that passed.** This is
  the **only** database change in the entire Calendar rebuild — **flagged for the checker.**
- **[The band is fully separate from the timed grid; one shared form]** — `WeekGrid`'s timed columns
  receive **only timed events** (all-day routed to the band), so an all-day item can never disturb the
  timed even-split/overlap below. Band interactions live in a small day-grained `useBandDrag` sibling
  (mirrors the gesture idiom; the timed `useWeekGrid` is untouched). The All-day toggle reuses the one
  shared `ItemForm` — no second form, no parallel all-day store. The band sits in a **sticky head+band
  block** (so it stays fixed while the timed grid scrolls) and **auto-collapses when empty**.

## Phase 7 — Calendar C6: Month view; all-day band split out to C7 (2026-06-23)

- **[C6 = Month only; the all-day band is now its own piece C7]** — The original C6 ("all-day band +
  Month") is split: **C6 ships Month** (read-only, no schema), and the **interactive all-day band +
  multi-day editing become C7**, because that genuinely needs the **flagged additive schema** (an
  `all_day` flag on `events`; multi-day = an end on a later day) and shouldn't ride a no-schema piece.
  Multi-day events already **render** as strips in Week/Month from C6 ("just render what exists"); C7
  adds creating/editing them + the band, and lights up the C3 form's disabled All-day toggle.
- **[A read-only `useMonthData` sibling, not a generalised `useWeekData`]** — `useWeekData` is
  week-coupled (a 7-day window + the viewed-week tray); generalising it to arbitrary ranges would risk
  the Week view. The month read is genuinely different (a 42-day grid range, overlap-aware so
  multi-day strips have their data, tasks scheduled-or-due in range, no tray). So a **read-only**
  `useMonthData(monthAnchor)` sibling — same documented-twin pattern as C2/C3/C5, reusing `activeOnly`
  + `resolveColor`. **Read-only; flagged for the checker.**
- **[Month never opens a form; clicks are navigational, reusing the nav]** — Per spec §13, Month is a
  "how loaded am I" zoom-out, not an editor. Day/"+N" clicks jump to that day's week; an item-click
  jumps + selects + scrolls to it + marks the day. The jump reuses `weekNav` via a new **pure
  `navToDay(day, today)`** (HOME if within the rolling window, else the Monday-week) — Month never
  reimplements nav.
- **[Month→Week handoff via an additive `focus` prop]** — The landing week carries a `focus`
  ({day, itemId, ms}); `WeekView`/`WeekGrid` use it to outline the item (reusing C3's
  `.tk-block.is-selected`), scroll its time into view, and mark the day's header. `focus` is
  **undefined in all normal Week use → Week behaves byte-for-byte as before**; cleared on any week
  arrow / back / view-toggle so a later week never mis-marks.
- **[Tasks marked in cells; colours reuse `resolveColor`]** — Event = a solid tinted dot, task = a
  ringed/hollow dot (visibly "a task"), both from the same (sub-)category colour as the week grid — no
  parallel colour code. Cap ~3 items + "+N more"; empty cell = blank (no copy, spec §15).

## Phase 7 — Calendar C5: the unscheduled tray (viewed-week, push, mirrored drag) (2026-06-23)

- **[Tray contents = (a) the VIEWED week, not the fixed current week]** — The tray shows undated
  tasks + tasks due in the **week currently on screen** that aren't time-blocked (due-soonest, undated
  last). **Why:** the tray's whole intent is "plan THIS stretch of days onto real slots" — arrowing to
  next week should redraw the tray to next week's loose tasks; a fixed current-week tray (b) would sit
  showing this week while you look at next week (quietly confusing). (a) is also the cheaper build —
  it keys off the `days` WeekView already has and rides the per-week remount. (The undated backlog
  shows either way; only the dated slice differs.)
- **[Drag-to-schedule reuses Today's mechanism by MIRRORING it into `useWeekGrid`]** — Today's
  module-to-grid drag is the `tray` gesture in `useTodayGrid` (`startTray`/ghost/`trayBind` →
  `onSchedule`). C5 adds the **same** gesture to the C2 sibling `useWeekGrid`, but the drop computes
  the **day from x** (`dayStartMsAt`) + **time from y** (`minutesAt`) — Today's mechanism + the week's
  drop geometry. `useTodayGrid`/Today untouched; the old `useScheduleDrag` is **not** revived (C4
  deletes it). Same documented-twin pattern as C2/C3 → cheap C4 collapse.
- **[Push, not overlay; the squeeze needs no JS]** — The drawer is a flex sibling of the grid, so
  opening it narrows the grid; because `dayStartMsAt`/`offGrid` read the body/scroll rects **live**,
  x→day re-maps automatically. **Open gate:** the squeezed 7-column week must stay *readable* with
  real overlapping events (not just geometrically correct) — verified visually before C5 is "done";
  if a narrow column makes title-only blocks or even-split slivers unreadable, we choose together
  between **overlay-below-a-width** or **fewer-days-in-view** (not picked unilaterally).
- **[A loose task is `time_bucket='Someday'`, set EXPLICITLY]** — The `tasks.time_bucket` column
  **defaults to 'Today'**, so the "+ add" insert sets `'Someday'` explicitly (with null due/scheduled)
  — an undated backlog task must never land in Today's bucket. The C2 off-grid unschedule + this one
  reload share the data path, so off-grid → reappears-in-tray falls out for free.

## Phase 7 — Calendar C3: ONE shared form (promote TodayForm), type-locked on edit (2026-06-23)

- **[The form converges by PROMOTING `TodayForm` → canonical `ItemForm`, both screens point at it]**
  — `TodayForm` was already the converged form (task+event, create+edit, toggle, graceful when the
  subtask props are absent); Calendar just wasn't using it. So we **renamed it `kit/ItemForm.jsx`**
  and pointed Today, All Tasks **and** Calendar at the one component — not a third form, not a
  copy-on-Calendar-migrate-Today-later split (path b), which would keep two near-duplicate forms
  alive (the thing we're converging away from). Per-type fields split into `kit/ItemTypeFields.jsx`
  to honour the <250 guardrail. **Today-risk accepted & bounded:** the only Today-visible changes are
  additive — the event form shows **All-day + Repeat as clearly-disabled placeholders**, and the
  **selected-block outline** comes to Today's grid too; no change to Today's writes/flow (its file
  diff is import+tag+selectedId).
- **[Type toggle on create only; type LOCKED on edit]** — New items default to event; the task/event
  toggle shows only while creating. Editing shows the item's type with **no event↔task conversion**
  (this was already Today's behaviour — toggle only passed on create). Same on both screens now.
- **[All-day + Repeat are disabled placeholders, not wired]** — `events` has **no `all_day` column**
  (it has `location` ✓ and an unused `repeat_rule`). So All-day renders disabled ("coming with
  all-day") and is completed in **C6** with the flagged additive schema; Repeat renders disabled
  ("coming soon") — recurrence is **T10**. **No schema change in C3.** The disabled controls are
  unmistakably off (muted, not tappable, a caption) so they read as "not yet", not "broken".
- **[Calendar delete = archive + Undo, replacing the old hard delete]** — Calendar's old
  `onDeleteEvent` hard-deleted (the odd one out, no undo). C3 routes delete through the existing
  `archive.js` path with an Undo toast, **matching Today** and the Archive feature. Needed a small
  `reload` exposed from `useWeekData` + an `onSaveTask`; the task select now also fetches
  `time_bucket` so a Calendar task edit can't clobber the bucket. **This is the one data-write
  behaviour change — flagged for the checker.** All existing columns; no schema.
- **[Old panels retired now, deleted in C4]** — `EventPanel`/`TaskPanel`/`TaskEditForm` are no longer
  imported (tree-shaken out) but their **files stay until C4**, because the dead `WeekCalendar.jsx`
  still imports them; the whole old cluster is removed as one surgical unit in C4 (avoids a partial
  teardown / broken import mid-rebuild).

## Phase 7 — Calendar C2: a documented SIBLING hook, not a generalised useTodayGrid (2026-06-23)

- **[Week interactions = a new kit sibling `useWeekGrid`, NOT generalising `useTodayGrid` in place]**
  — The purest-DRY path would edit the **verified, shipped** hook Today depends on (its create path,
  end-handler, the 7am offset, the preview shape) to make one screen work — risking the screen that's
  already approved. We don't take that trade mid-build. Instead we accept a **deliberate, documented
  second hook** now and **collapse the two in C4**, when merging is the whole point of the piece and
  both behaviours are pinned by working code to diff against. (Same reasoning as rebuild-over-reskin:
  pay convergence cost once, deliberately, not by quietly mutating something that works.) **Condition
  to keep it honest debt:** `useWeekGrid` mirrors `useTodayGrid`'s shapes/conventions as closely as
  the week allows (same `SNAP`/`THRESHOLD`/`EDGE`/`MIN_DUR`, the `blockPreview`/`createDraft` shapes,
  the bind pattern), the divergences are listed in its header, and the **roadmap C4 entry explicitly
  names "collapse `useTodayGrid` + `useWeekGrid` into one grid hook."** The old
  `useEventDrag`/`useScheduleDrag` is **not** revived (C4 deletes it) — wiring onto it would pull away
  from C4. **Trade-off:** two grid hooks until C4; accepted, and named.
- **[Re-day keeps the time; sideways never nudges the clock]** — A MOVE re-days via the column under
  pointer-X; the new start-minute derives from pointer-Y only. So a pure horizontal drag changes the
  day and leaves the time exactly (vertical = time, diagonal = both). Resize never changes day.
- **[Off-grid unschedule needs no tray, no C5 reorder]** — A task dragged off-grid clears
  `scheduled_start/end` through the **existing** `onUpdateTask` and leaves the week; it still lives in
  Today's lists and returns in the C5 tray. An event off-grid **snaps back** (events must keep a
  time) — no write. **Trade-off:** until C5 the unscheduled task has no on-Calendar home; accepted and
  sanctioned. (Flagged for the checker as the one new write.)
- **[Paper-true lift is week-scoped CSS, TintedBlock untouched]** — The grabbed block gets scale + a
  hairline outline (no shadow) via `.wk-col .tk-block.is-dragging`, scoped under the week so Today's
  identical block is never affected. **[Weekend tint]** — Sat/Sun get a faint `--accent` wash
  (fainter than, and overridden by, today's tint + circle), so weekends read at a glance with no new
  colour.

## Phase 7 — Calendar = rebuild-and-converge; C1 week-grid display (2026-06-23)

- **[Calendar is a REBUILD-and-converge, not a re-skin]** — Calendar is rebuilt on Today's
  component kit so the two screens become **one engine**: the old Calendar panels converge into
  Today's shared form, and the old shared drag hooks (`useEventDrag`/`useScheduleDrag`) merge with
  Today's `useTodayGrid`. The full, signed-off desktop contract is **`calendar-uiux-spec.md`**
  (added to the brain docs; slots into `07-ux-flows.md` §5). Built in small, separately-verified
  pieces **C1→C6**, each its own save point. **Why:** the Today rebuild deliberately duplicated
  this logic; converging now collapses the duplication instead of re-skinning two copies.
  **Trade-off:** more pieces than a re-skin, but no second engine to maintain.
- **[Old Calendar code is retired CONSERVATIVELY, not in C1]** — `WeekCalendar`, `DayColumn`,
  `EventBlock`, `WeekDragPreview`, the drag hooks and `calendar.css` are **left in place** through
  C1; superseded code is removed only in the convergence pieces (C4), provably-unused, in separate
  commits. **Why:** protects a clean rollback while the new path is proven.
- **[C1 = display only; the EXISTING editor is preserved]** — The new week grid is read-only:
  tapping a block opens the **existing** `EventPanel`/`TaskPanel` (view/edit/delete keep working).
  Click-to-create and drag/resize are an **intentional interim gap**, returning in **C2**. No
  schema/SQL/data-layer change.
- **[Per-week reload by remounting, NOT by editing the shared hook]** — `useWeekData` loads on
  mount only. Rather than change that shared hook (a data-layer change), C1 wraps it in a small
  `WeekView` mounted with a **`key` per week**, so navigating weeks remounts it and it reloads.
  **Why:** keeps the data layer untouched. **Trade-off:** a brief grid re-mount per nav (matches
  the spec's "grid first, blocks fade in" loading feel).
- **[Nav model: today-anchored rolling home + Monday-week snapping]** — Home = today is column 1,
  next six days (7 cols). From home: **Next** → the Monday after this week's Monday; **Prev** →
  the current calendar week; further arrows step whole Mon–Sun weeks; **"Back to this week"** →
  home. Pure date math in `weekNav.js`. (Spec §2; arrows only, no date picker.)
- **[24h gutter, full day, title-only tinted blocks]** — The grid is the **full 24h** (not Today's
  7am–midnight window), auto-scrolled so **07:00 sits at top**; gutter reads `07…23, 00`
  (resolving the mockup's 12h-vs-spec-24h flag → **24h per spec §18**). Blocks are **title-only**
  (position = the time), tinted by each item's **own sub-category shade** via `colorModel`'s
  `resolveColor` (Today colours from raw `color`; the spec wants the shaded branch colour). The
  **past greys** under a soft paper veil (whole past days; today down to the now-line) — chosen
  over per-block greying so `TintedBlock` stays unmodified.
- **[Toolbar shows the FINAL shape; only nav is live in C1]** — The toolbar renders arrows · range
  · "Back to this week" · Week/Month toggle · tray · "+ Add event", but the toggle/tray/＋ are
  **inert, clearly-marked placeholders** (Month=C6, tray=C5, create=C2). **Why:** the owner sees
  the destination composition without anything faked.

## Phase 7 — Today desktop re-skin: masthead, nav, full-width, live weather (DESK-1, 2026-06-23)

> Superseded 2026-07-01 for the weather part only: the top-right live weather/location was removed,
> `src/useWeather.js` was deleted, and the right side now carries the two-line `Year XX` / `Day XX`
> mark. The historical DESK-1 record below explains the original choice.

- **[Masthead = 3 columns; the big clock becomes a small dateline]** — Left: a live two-line
  dateline (`HH:MM` 24-hour + weekday / `D Month YYYY`). Centre: the blackletter "LifeOS"
  wordmark + a `YEAR {age} · DAY {n}` line. Right: city over weather. **Why:** matches the
  approved `today-mockup.html`; the dateline carries the same info as the old clock in far less
  ink, and the centre column earns the personal-edition line. Dropped: the "A PERSONAL DAILY"
  topline, the "All the day that's fit to do" tagline, and the Settings nav subtitle.
- **[Personal edition = pure date math from birthday 29 March 2002]** — Age = whole years old;
  Day = day-of-personal-year counting the birthday itself as **Day 1** (so 23 Jun 2026 →
  YEAR 24 · DAY 87). **Why:** it's a fixed, offline computation — no network, no app data.
  Lives in `src/personalEdition.js`. **Trade-off:** the birthday is a constant in code (correct
  for the single owner); not user-configurable (single-user app, never needs to be).
- **[City + weather are pulled LIVE now — not a placeholder]** — The owner asked to wire real
  data instead of the mock's hardcoded "Delft / 27°". Uses two **free, no-key, HTTPS** services:
  **ipapi.co** (approximate city + lat/lon from the connection, no permission prompt) →
  **Open-Meteo** (current temp + WMO condition code). Sealed in `src/useWeather.js`; refreshes
  every 30 min; on any failure it renders no weather rather than guessing. **Why free/no-key:**
  honours the "free tiers only" guardrail. **Trade-off:** IP-based location is silent but only
  city-accurate (fine for a label); a GPS-accurate opt-in could be a later toggle.
- **[Weather dot stays on-palette]** — The mockup's ochre condition dot becomes **terracotta
  (`--accent`) when sunny/clear, muted-grey (`--ink-muted`) otherwise**. **Why:** the build rule
  is "theme tokens only, no new colours"; the written rule overrides the mock's ochre.
- **[Nav = centred, small-caps, ruled top+bottom; active item is terracotta]** — Per the mockup,
  the active destination gets both terracotta text **and** a terracotta underline (the earlier
  spec said underline only). **Why:** match the mockup; terracotta is already the accent token.
- **[Today body goes full-width; Calendar + Settings do NOT]** — `.today` lost its `max-width:
  1100px` centring and gained a 56px side frame. Only `.today` (Today-only CSS) changed; the
  shared `.cal-wrap` was already full-width, and Settings keeps its own `max-width: 600px`.
  Today's grid column also widened to `1.35fr` vs the side column's `1fr` (mockup proportion).
  **Why:** the shared frame stays untouched, so each screen gets its own width pass later.
- **[Day arrows = one fixed cluster]** — `‹` and `›` are wrapped together in a `.today-stepper`
  pinned left of the day title, so the arrows never shift when the day name's length changes.
  Day-flipping stays scoped to the **Today screen only**; the masthead dateline is always the
  real now. **The shared header re-skin shows app-wide (Calendar + Settings too) — intended.**

## Phase 7 — sign-in is email + password; magic link retired (AUTH-1/AUTH-2, 2026-06-23)

- **[Login = email + password, single-user, CLOSED]** — Replaced magic-link sign-in with
  **email + password** + a "Forgot password?" email reset (an in-app reset page sets the new
  password). **Public sign-up disabled** (`disable_signup=true`) — only the owner's account
  exists. No "create account" UI, ever. **Why:** a password is faster day-to-day than waiting
  for a link email, and closed signup keeps it strictly single-user. **Safe two-step rollout:**
  AUTH-1 added password + reset and **kept magic link** as the proven fallback; AUTH-2 did the
  cutover only after the owner chose to proceed. Uses Supabase's own methods
  (`signInWithPassword` / `resetPasswordForEmail` / `updateUser`) — no new auth layer.
- **[Magic link removed at the UI level; the email provider stays ON as a backstop]** — There
  is **no Supabase config flag to disable magic-link-only** — magic link/OTP shares the single
  email provider with password, so disabling it would also break password + reset (**lockout**).
  So the cutover (AUTH-2) removes magic link from the **app UI** and leaves the email provider
  enabled. **Trade-off:** magic link is gone from the app but still technically API-reachable
  (equivalent to the reset flow's email exposure for a single-user app) — and that residual
  provider is the **recovery backstop** (the Supabase dashboard can re-send a login link or set
  a password if password sign-in ever fails). A true provider-level magic-link disable would
  need a Supabase change confirmed safe against password — not done.

## Phase 7 — the two open category questions, RESOLVED (T13, 2026-06-23)

> These were left OPEN in D1/D2; the Settings category manager (T13) settles them.

- **[Colour-branch model = shade-with-override]** — A category with **no explicit `color`**
  takes a **DERIVED** colour: a lighter shade of its parent's resolved colour, **computed at
  render time** (`src/colorModel.js`) — so re-colouring a parent re-shades its derived
  children. Setting a colour on a category **pins** it (custom); "use derived shade" clears it
  back to derived. **Storage:** `color` null = derived, a palette id = custom — **no new
  column**, and **derived shades are never written** (only ids or null are stored). Top-level
  with no colour → a calm neutral default (Stone). **Why:** lets the owner colour a few top
  branches and have everything beneath fall into tidy shades automatically, without a data
  migration. **Scope note:** derived colours currently render in the **manager only**;
  Today/All-Tasks/Calendar/the picker still read `color` as-is until a later piece adopts
  `resolveColor` (changing their rendering is out of T13's scope).
- **[Parent-delete behaviour = BLOCK (app-layer guard), for now]** — Deleting a category is
  **blocked if it has any tasks or any sub-categories** (a confirm dialog only appears for an
  empty leaf). Enforced in the **UI** (T13); the live FK stays `ON DELETE CASCADE` + the Phase-2
  re-parent-up trigger **unchanged** — the guard simply means that destructive path never
  fires. **Why:** safe and simple now; the richer **Archive** flow (retention / restore /
  cascade / task reassignment) is a separate later feature that will revisit this. (Supersedes
  the "STILL OPEN — parent-delete" item in D1.)

## Phase 7 — masthead vs daybar; reaffirmed open questions (owner, LOCKED 2026-06-23, Piece D2)

- **[The shared masthead/folio stays the REAL-today edition; Today's viewed day shows in
  Today's own daybar — not the masthead]** — On Today, the date arrows (T8) change a
  *viewed* day. That viewed day is shown in **Today's own daybar** (weekday title + date +
  "Back to today") and the tasks-module title — **not** in the shared masthead folio, which
  stays the real-today edition line. **Why:** the masthead/folio is the **shared app header**
  rendered on Calendar and Settings too; making it reflect Today's viewed day would mean
  editing the shared header and lifting Today's state into the shell — a scope-and-risk breach
  of the Phase-7 "don't disturb the other screens / don't restyle the shared header" rule. The
  newspaper metaphor still holds: the masthead is *today's* edition; you flip to another day's
  **page** within it, and "Back to today" makes the return obvious. **Trade-off:** the literal
  locked-spec line "the folio date reflects the viewed day" is not met at the masthead; it's
  met in Today's own daybar instead.
- **[STILL OPEN — flipping the masthead itself to the viewed day]** — Whether the masthead
  folio should *also* flip to the viewed day is **left open** for the owner. If wanted, it is
  its **own small shared-header piece** (thread a viewed-day prop through the header, defaulted
  to today so Calendar/Settings are unchanged) — not done silently inside a Today piece.
- **Reaffirmed still-OPEN (unchanged, see Piece D1 above — recorded here so they aren't lost):**
  the **colour-branch model** (how a sub-category's colour derives: inherit / shade / own;
  current behaviour = each category's own stored colour as-is) and the **parent-delete
  behaviour** (T3 left the FK `ON DELETE CASCADE` + the Phase-2 re-parent-up trigger; intended
  UX undecided). Both belong to the **Settings category manager (T13)** and must be decided
  before sub-category colours render or delete is wired.

## Phase 7 — category decisions (owner, LOCKED 2026-06-23, Piece D1)

> Several category calls were made in planning but never written down, so the docs and
> "next step" notes still referenced dropped work. Recorded here as owner decisions.
> Two items are explicitly left OPEN — do not assume them.

- **[No seeded category tree — "T3b" is DROPPED]** — There is **no pre-built starter
  tree**. The only category that exists at the start is **Inbox**; the owner builds their
  own categories in-app over time. The earlier plan to "seed the owner's real 5-top tree"
  (roadmap **T3b**) is **dropped entirely** — not deferred. **Why:** the owner would
  rather grow the structure from real use than design an abstract tree up front. (Roadmap
  T3b struck with this reason; history kept, not deleted.)

- **[No fixed number of categories at any level — only the depth-3 cap]** — There is **no
  limit on how many** top-level, child, or grandchild categories the owner can have. They
  can **add / nest / delete freely at every level.** The **only** hard structural
  constraint is **maximum depth 3**, already enforced in the database
  (`db/07_categories_depth.sql`, T3). (This supersedes any earlier "5 top × 3–5 × 3–5"
  shape from the locked Today spec — that was an illustrative size, never a limit; the
  3-level cap is the only rule.)

- **[Inbox is permanent, undeletable, and the default home for uncategorised capture]** —
  **Inbox always exists and can never be deleted or renamed.** Anything captured with no
  category lands in Inbox (a task means "Inbox" by having `category_id = NULL` — the
  existing model; Inbox is never re-pointed). The **delete action must refuse on Inbox
  wherever it can be triggered** — a guard to enforce in the UI when category management is
  built. (The DB already refuses to delete/rename Inbox via the Phase-2
  `categories_before_delete` / `categories_before_write` guards; this records that the UI
  must match.)

- **[Categories are managed in a dedicated Settings category manager — NOT inline in the
  Today picker]** — Creating, nesting, re-parenting and deleting categories happen in a
  **dedicated Settings category manager** (its own future piece). The **Today picker only
  READS the tree** (drill-in to pick a level) — it never edits it. **Why:** keep capture/
  filing calm and fast; structural edits live in one deliberate place. (The Settings
  category manager is a backlog piece — see the roadmap.)

- **[STILL OPEN — the colour-branch model]** — **Undecided, do not assume:** how a
  **sub-category gets its colour** — inherit the parent's exact colour, a lighter *shade*
  of it, or its own independently chosen colour. **This must be decided before
  sub-category colours render** in Settings or on Today. **Current behaviour (T4):** Today
  uses **each category's own stored `color` as-is** (no inheritance/shading logic) — so
  this open question doesn't block anything yet, but it gates the colour-branch work.
  (Resolves nothing here; flags it so no piece silently invents a model.)

- **[STILL OPEN — what happens to children when a parent category is deleted]** —
  **Undecided, do not assume:** the intended behaviour when a parent with children is
  deleted. **Current state (T3):** the `parent_id` FK is `ON DELETE CASCADE`, but a
  Phase-2 trigger (`categories_before_delete`) **re-parents children upward** before the
  delete, so children are never lost — yet whether "re-parent up" is the *intended* UX
  (vs "block the delete", vs "delete the subtree with a warning") is **not settled**. This
  belongs to the **Settings category-manager** piece and must be decided there before
  delete is wired.

## Phase 7 — Today is a clean front-end rebuild (owner's explicit call, LOCKED 2026-06-23, Piece 1c)

- **[Today (desktop) is a clean front-end rebuild of that ONE screen — the owner's
  explicit, eyes-open call]** — The owner has decided: rebuild Today's front end
  from a clean base rather than re-skin the interim verify UI. This is an
  **explicit escalation from Phase 7's default stance** ("re-skin, don't rewrite")
  — made deliberately, with eyes open, **because Today gained substantial NEW
  behaviour** the old screen wasn't built for: the **workspace calendar**
  (click-create / drag / resize / snap), the **status pill**, **drag-to-schedule**
  (and drag-off to unschedule), the **whole-page date-flip**, and the **3-level
  category tree** with any-level filing. Re-skinning around all that would fight the
  old shape; a clean rebuild is the honest path. (This supersedes/strengthens the
  Piece-1b note **[Today is a front-end REBUILD, not a re-skin]** below — same
  direction, now the owner's stated decision with the guardrails spelled out.)
  **It is NOT a whole-app rewrite.** It carries these **hard guardrails**:
  1. **Front-end only — the data layer is untouched.** The rebuild touches *only*
     Today's front-end. The **reads, the writes, and the existing tables are
     preserved and reused as-is.** Any schema change happens **only** through the
     separately-flagged **additive** pieces — the category hierarchy (T3), event
     recurrence (T10), and the T2 field check — **never silently inside a look/build
     commit.**
  2. **The save point before T1 is sacred.** If the rebuild goes wrong we **roll
     back to the working plain Phase 6 Today** — we do **not** dig. **The doom-loop
     rule (CLAUDE.md) applies hard here:** a fix that breaks the next thing means
     stop and restart from the save point with a clearer plan, not keep patching.
  3. **The rebuild stays scoped to Today.** It is **not** licence to rebuild other
     screens. **Each later screen gets its own scope decision (re-skin vs rebuild)
     when we reach it** — the rebuild call is made per screen, never assumed.
  4. **Every T-piece keeps its own save point and its own owner verification.** Each
     T-piece commits a **save point before it**, and the owner **verifies it on Mac
     and phone before the next piece starts.**
  **Why (owner-facing, plain):** Today is the home screen and the calmest, most-seen
  page; it's worth building right, and it changed enough that a clean base is
  cheaper and safer than wrestling the old one. **Trade-off:** more work on this one
  screen than a paint job — accepted, because the backend stays safe and the
  guardrails (sacred save point, no digging, scope fence) keep the risk boxed in.

## Phase 7 — the Today desktop spec + rebuild approach (LOCKED 2026-06-23, Piece 1b)

> Locks the desktop **Today** screen as a build target and sets how we rebuild it.
> The full screen-by-screen spec lives in `07-ux-flows.md` §3 ("LOCKED — Today,
> desktop only"); this records the *decisions* behind it, flagging which are new
> **behaviour** (not just look) so the checker and build pieces treat them right.

- **[Today is a front-end REBUILD, not a re-skin — but the data spine is preserved
  and reused]** — The Phase 7 Today work rebuilds the *front end* (the screen, its
  components, its interactions) rather than re-skinning the interim verify UI. **But
  the backend / data spine is kept and reused** — we do **not** rewrite working
  data or logic. **Schema changes are additive only**, each one **flagged for
  checker review** as its own piece (per **[Phase 7 MAY include schema and logic
  changes]**, Piece 1). **Deletion is conservative:** only **provably unused** code
  is removed, **one trim per commit**, in a **commit separate from build commits**,
  and **verified**. **Why:** the interim Today UI predates the locked spec and its
  shape diverges enough that re-skinning would fight it; meanwhile the tables, RLS,
  Telegram capture and the 7am brief all work and are expensive to get right —
  rebuilding the view on top of the same spine is the cheap, safe path. **Trade-off:**
  more front-end work than a paint job, but no risk to the working backend.

- **[Locked Today desktop decisions (Phase 7, Piece 1b)]** — The settled choices
  for the desktop Today screen (full detail in `07-ux-flows.md` §3). Tagged
  **[NEW BEHAVIOUR]** (changes how the app *works* — needs real build + checker
  attention) vs **[LOOK]** (presentation only):
  - **[NEW BEHAVIOUR] The left calendar is a workspace, not a read-out** — on Today
    you can click-create (event by default, with an event/task toggle), drag to
    move, drag-edge to resize, 15-min snap, side-by-side split on overlap, and drag
    tasks onto/off the grid to schedule/unschedule. (Today previously only *showed*
    the day.)
  - **[NEW BEHAVIOUR] A 3-level category tree with any-level filing** — 5 top × 3–5
    sub × 3–5 sub-sub; a task/event can be filed at **any level, not only a leaf**;
    a **drill-in picker** (breadcrumb + chevrons, label picks / chevron descends);
    display tinted by the **top-category colour** shading down the branch. This is a
    real change to the category model and its storage/UI (see the schema note below).
  - **[NEW BEHAVIOUR] Recurring events — full support** — a recurrence rule on
    events, repeats rendered on the calendar, and a **"this one or all?"** choice on
    **edit, move, resize, and delete**. (Not built before.)
  - **[NEW BEHAVIOUR] The "tasks today" + "next 7 days" content model** — "tasks
    today" = due today **or** Today-bucket **or** scheduled today (scheduled ones
    muted, with time), **ordered by priority**, max 5 then internal scroll; "next 7
    days" = tomorrow→+7 of the **viewed** day, date order, no day headers/empty
    lines. (Replaces Today / This Week / Someday on the home screen — display logic,
    confirmed no schema change; the buckets still exist in the data.)
  - **[NEW BEHAVIOUR] Undated tasks sit at the bottom of "next 7 days"** with a
    quiet grey "undated" tag (rather than being hidden).
  - **[NEW BEHAVIOUR] One tap opens the full create/edit form everywhere** — a tap
    on any calendar block or module row opens the same full form (no preview step);
    "+ add" opens it prefilled to today. A connected 3-segment status pill (To do ·
    In progress · Done) sets state inline; **Done greys+strikes till midnight, and
    tapping Done again before midnight is the undo**. Delete shows a quiet undo
    toast, no confirm dialog (exception: repeating events ask "this one or all?").
  - **[NEW BEHAVIOUR] Date arrows flip the whole page to another day's edition** —
    calendar + both modules re-anchor to the viewed day, the tasks module is titled
    by weekday name, the folio date follows, the now-line shows only on the real
    today, and a "Back to today" affordance appears when navigated away.
  - **[LOOK] Paper `#F6F5F1`; the broadsheet masthead (blackletter wordmark, topline,
    folio line — copy is placeholder); soft tinted calendar blocks (low-opacity fill
    + coloured left bar); blank/minimal empty states with no copy; the calendar
    window 7am–midnight scrolling internally inside a no-whole-page-scroll layout.**
  - **Scope fence:** Today carries **no settings, no Someday/backlog browsing, no
    capture beyond "+ add"** — those live on Calendar, mobile capture, Marty, and the
    future All Tasks screen. The quiet **"All tasks · [count] →"** box opens that
    (separately specced) inventory screen.
  - **Schema note (flag for the checker, resolved per-piece later):** the additive
    schema *check* (next-piece) should confirm what the spine already has before
    adding anything — the locked `tasks` shape (Phase 3, Piece 1) **already includes
    `notes` and `priority`**, so those two may **already exist** and need no change;
    the **3-level category tree + any-level filing** and **event recurrence** are the
    parts most likely to need additive fields. Add only what's genuinely missing,
    each as its own checker-flagged piece; never assume from this list alone.

## Phase 7 — the redesign: opening decisions (LOCKED 2026-06-22, Piece 1)

> Recorded together at the start of Phase 7. These are settled; the per-screen
> *layouts* are still an owner-art-directed conversation, but the choices below
> are the frame everything is built inside. Behaviour reference for the phase is
> the new `07-ux-flows.md` (which is itself **open to relitigation** screen by
> screen — see its status banner). Doc-level items below are mirrored into
> 06-design.md and/or 02-roadmap.md.

- **[Styling approach = a small reusable component kit]** — We build the look on
  top of the existing `src/theme.css` tokens (paper/ink/accent/category colours,
  type), and turn the repeating "furniture" (mastheads, rules, kickers, task
  rows, calendar blocks, etc.) into a handful of **sealed, reusable building
  blocks** we assemble screens from. **Chosen over** (a) plain ad-hoc CSS per
  screen — too easy to drift, every screen reinvents the same parts, the mess
  CLAUDE.md warns about; and (b) Tailwind — a whole utility vocabulary to learn,
  markup fills with class soup, and it pulls against the calm hand-set
  broadsheet feel. **Why the kit:** one place to define each piece of furniture,
  so the whole paper stays consistent and a change lands everywhere at once;
  small files; the tokens we already trust stay the source of truth. **Note:**
  this is the *styling* foundation only — an **animation toolkit (e.g. Motion)**
  is added on top later in Phase 7 for the editorial motion, and a **chart
  toolkit** comes later still with the data pillars (Gym/Nutrition/Finance), not
  now. **Trade-off:** a little up-front work building the kit before screens
  speed up — accepted, it pays back immediately.

- **[Phase 7 MAY include schema and logic changes — reverses the earlier
  "redesign is look-only / zero schema" stance]** — When the UI/UX genuinely
  needs a data or logic change to work right, Phase 7 is allowed to make it.
  **This reverses** the expectation in **[Data foundation before design]** below
  (and the roadmap's framing) that the redesign would "only touch layout, type
  and colour" with "nothing underneath has to move." **Why:** living with the
  real flows (see `07-ux-flows.md`) surfaces places where the right experience
  needs more than paint — e.g. a true last-touched signal for staleness, or
  fields a flow assumes. Pretending those are look-only would either fake the UX
  or smuggle schema work into a styling commit. **The discipline that keeps the
  spine safe:** every such change is (1) **surfaced to the owner first**, (2)
  built as **its own small, separately-verified piece** with its own SQL/handoff
  entry, and (3) **never folded into a look-only commit**. The architecture
  guardrails still hold — new shapes get recorded here with a reason, the core
  task/event/category meaning is protected. **Trade-off:** Phase 7 is no longer
  purely cosmetic, so it's a bit larger and slower — accepted, because the point
  of the phase is the app actually *feeling* finished, not just repainted.

- **[Today's design direction = the "Apple-tinted" approved mockup]** — The look
  we're building toward is the **Apple-tinted** version the owner approved: the
  warm broadsheet, kept, with softer Apple-style tinting where it earns it (see
  the calendar decision below). It keeps the **classic blackletter masthead + a
  folio (dateline/edition) header**. This is the agreed visual target for the
  phase; individual screen layouts are still proposed-and-approved per screen.

- **[Masthead stays blackletter]** — The "LifeOS" nameplate stays a **blackletter
  wordmark**. **This settles the open question** in 06-design.md ("keep the
  blackletter nameplate, or switch to a quieter high-contrast serif") — we keep
  blackletter. **Why:** it carries the most character and reads as a real paper's
  name; the owner wants that signature, not a quieter serif. (Mirrored into
  06-design.md: the open question is now resolved.)

- **[Paper warmed down to a cooler near-white `#F6F5F1`]** — The page background
  moves from the cream **`#F4EFE4`** to a cooler near-white **`#F6F5F1`**. **Why:**
  the cream read a touch too warm/yellow next to the Apple-tinted direction; the
  cooler near-white still isn't stark white (the broadsheet rule holds) but feels
  cleaner and more modern. **Mirrored** in 06-design.md's Colour section now; the
  actual `src/theme.css` token change happens in **Piece 2** (this piece touches
  no code).

- **[Calendar category = a soft tinted block, Apple-Calendar style]** — On the
  calendar, a category shows as a **soft tinted block**: the category colour at
  **low opacity as a fill** plus a **coloured left bar**, the way Apple Calendar
  colours an event — not a bare dot. **This overrides** the line in 06-design.md
  that said calendar colour should stay a small dot, "calm, not big blocks of
  colour." **Why:** on a real lived-in calendar the tint makes categories
  readable at a glance without shouting; the owner chose this treatment in Phase
  7. **Mirrored** in 06-design.md (the dot line is amended with a note that the
  owner picked the tinted block here). The tint stays soft/low-opacity so it
  still reads as paper, not a Temu dashboard.

- **[Today's content model = "tasks today" + "the next 7 days"]** — The home
  screen's task side moves from **Today / This Week / Someday** to two reads:
  **"tasks today"** (due today, scheduled today, or in the Today bucket) and
  **"the next 7 days"** (tomorrow → +7, so it never repeats today). This matches
  §3 of `07-ux-flows.md`. **This is a display-logic change only — NO schema
  change** (the Today/This Week/Someday buckets still exist in the data; this is
  how the *home page* reads them). Built as **its own verified piece later** in
  Phase 7, not in this paperwork piece. **Trade-off:** the explicit "Someday"
  drawer leaves the home screen — it still lives in the data and elsewhere; the
  home page is deliberately about now and the week ahead.

- **Phase 6 close-out — the seven decisions behind the 7am brief (recap; per-piece
  detail in the entries below).** Recorded together at phase close so the shape of the
  whole brief is in one place:
  1. **The brief is its OWN private edge function (`brief`), jwt-verified, fired by the
     service-role key — separate from the public Telegram webhook.** Why: the 7am alarm
     calls it directly; keeping it private means only trusted server code can fire it,
     and brief logic never tangles with the webhook. (6a)
  2. **Scheduler = pg_cron + pg_net, DST-safe 7am: fire at BOTH 05:00 and 06:00 UTC and
     proceed only when the Europe/Amsterdam hour is 7** (the other fire exits doing
     nothing). Why: pg_cron runs in UTC and 7am Amsterdam shifts summer/winter; this
     gives exactly one brief/day at 7am year-round, no manual DST changes, no
     double-sends. (6f)
  3. **Always-send safety net: the 7am run ALWAYS sends** — a calm "quiet one" on an
     empty day, a "had trouble building your brief" line on internal error. Why: with
     nobody watching at 7am, total silence now means the ALARM broke — silence is the
     failure signal. Trade-off: a text every morning even when there's nothing on —
     accepted (proving it's alive is the point). (6f)
  4. **The service-role key lives in Supabase Vault (read at run time), never in the
     cron SQL, the code, or GitHub.** Why: cron definitions are stored in the database
     and the service-role key is the database's master key — it must not sit in
     plaintext. (6f)
  5. **"Forgotten" = an OPEN This Week task, created 3+ days ago, not already shown in
     the brief; at most ONE/day, the oldest; CODE picks, Gemini phrases.** Why This Week:
     Today tasks are listed daily (not forgotten); Someday is deliberately quiet. KNOWN
     LIMITATION: the tasks table has only a created-at timestamp (no last-touched), so
     "untouched" means "created 3+ days ago and still open" — moving a task between
     buckets does NOT reset the clock. A true last-touched signal needs a new column (a
     schema change) — deliberately NOT done; revisit only if the nudge misfires. (6d)
  6. **"Fill a gap" = reserved mode: only when there's a 2h+ free stretch today within
     08:00–20:00 AND a genuinely worth-doing task (overdue, due today, high priority, or
     the forgotten one).** At most one offer, phrased as an offer not an order; if the
     gap task is already mentioned, fold it into one line (never named twice). CODE finds
     the gap + picks the task; Gemini phrases. Why reserved: an eager "here's a job for
     your free time" every morning is the nagging we're avoiding. (6e)
  7. **The brief stays on the FREE Gemini tier (gemini-3.1-flash-lite).** Why: it sends
     the same task/event data class already sent in Phase 5 — nothing newly sensitive —
     so automation alone doesn't change the privacy picture; the paid-key switch stays
     tied to future SENSITIVE modules (mood/health), not to turning on the schedule.
     Trade-off: free Flash can briefly rate-limit/err — covered by the checklist
     fallback and the always-send net.

- **The 7am alarm: pg_cron at 05:00 + 06:00 UTC, a 7am-Amsterdam hour gate in the
  function, service-role key from Vault, always-send (Phase 6, Piece 6f).** The brief
  runs itself daily with nobody watching. **Scheduling mechanism:** Supabase pg_cron
  invokes the PRIVATE brief function over HTTPS via pg_net, authenticating with the
  service-role key. **Key handling (security):** the key is stored in Supabase Vault
  (secret `brief_service_role_key`) and read at run time from `vault.decrypted_secrets`
  — never hardcoded in the cron SQL (cron defs live in the DB), never in the repo, never
  in the function files. **DST-safe 7am, exactly once/day, no manual switching:** the
  job fires at BOTH 05:00 and 06:00 UTC (`0 5,6 * * *`), and the function PROCEEDS only
  when the current Europe/Amsterdam hour is 7 — 05:00 UTC = 07:00 in summer, 06:00 UTC =
  07:00 in winter — so exactly one fire/day lands at 7am Amsterdam year-round and the
  other exits sending nothing. (DST transitions happen at ~02:00–03:00 local, well
  before the fire times, so both can never map to hour 7 — no double-send.) **Why this
  over a single fixed UTC time:** a fixed UTC time drifts by an hour across DST and would
  need manual switching twice a year; the two-fire + hour-gate pattern needs zero
  maintenance. **ALWAYS-SEND (owner's chosen safety net):** the scheduled run always
  sends — a calm "quiet one" on an empty day, and a minimal "had trouble" line if
  building throws — so a silent morning means the JOB broke (silence = the failure
  signal). 6c's plain-checklist fallback (Gemini down) stays. **DB changes (scheduling
  infra ONLY):** enabled pg_cron + pg_net; the Vault secret; cron jobs
  `brief_daily_7am_ams` and a TEMPORARY `brief_test_every3min` (every 3 min, force-sends,
  bypasses the gate, to be removed after the owner sees it fire). No spine/schema/column
  change; the brief stays read-only and private. Trade-off: pg_net is fire-and-forget
  (a network-level failure misses that day, no retry) — acceptable for a personal brief.

- **The "fill a gap" suggestion: reserved, code-picked, one per brief, never named
  twice (Phase 6, Piece 6e).** The brief offers to use a free stretch of today for a
  pressing task — but only when it's genuinely useful. **GAP** = a continuous free
  stretch in today's calendar of ≥ GAP_MIN_HOURS (2h), inside GAP_WINDOW_START–
  GAP_WINDOW_END (08:00–20:00 Europe/Amsterdam), containing NO events and NO
  time-blocked tasks; the earliest qualifying stretch wins (named constants in gap.ts,
  easy to change). **RESERVED — worth-doing candidate** (priority order, first that
  exists): 1) the 6d forgotten task, 2) the most overdue open task, 3) a task due
  today, 4) a high-priority open Today/This Week task. If none exist → NO suggestion;
  a low/none-priority undated task that isn't the forgotten one never qualifies. A
  suggestion needs BOTH a gap AND a candidate; hard cap ONE per brief; it's an OFFER,
  never a command. **CODE finds the gap and picks the task (deterministic, verifiable);
  Gemini only PHRASES it** — it can't choose the slot/task or invent one. **No double
  mention:** if the gap task is already mentioned elsewhere (the forgotten line, an
  overdue/due-today body item, or a high-priority Today task in the TODAY list), the
  writer gets a `sameItem` flag and folds it into ONE coherent thought; if it's the
  exact forgotten task, the checklist also merges the two lines. **In BOTH prose and
  the checklist fallback,** so it survives a Gemini outage. Refactor: the shared
  read-only DB helper moved to brief/sb.ts (used by day.ts + gap.ts). Read-only, free
  tier, no schedule, no schema/column change. Trade-offs (accepted): candidate order is
  forgotten-first, so under "brief test" the offer pairs with the forgotten task rather
  than a high-priority one; and a task already scheduled today can still be the
  candidate (the rules don't exclude it) — both refinable later.

- **The forgotten-task nudge: code-picked, one per brief, keyed off created_at
  because there's no updated_at (Phase 6, Piece 6d).** The brief surfaces the single
  most-forgotten task — the whole point of the product — but stays calm: at most ONE
  per brief, and none if nothing qualifies (silence, not invented anxiety). **The
  rule (code-side, deterministic, verifiable):** an OPEN task in time_bucket
  'This Week', created FORGOTTEN_DAYS (=3) or more ago, that is NOT already shown
  elsewhere in the brief — not due today, not overdue, not scheduled onto today's
  calendar — and of those the single oldest by created_at. **Why This Week only:**
  Today-bucket tasks are listed every day (not forgotten); Someday is deliberately
  out of scope (a possible later add). **"Untouched" signal = created_at ONLY:** the
  tasks table has NO updated_at/last-modified column (confirmed against the live
  table — only created_at, completed_at, scheduled_*, due_date). So "untouched 3+
  days" means "created 3+ days ago and still open in This Week"; a true last-touched
  notion would require a NEW column (a schema change) — deliberately NOT made
  (read-only piece), flagged for a separate decision. CONSEQUENCE: editing/moving a
  task between buckets does NOT reset the clock. **CODE picks, Gemini only phrases:**
  the chosen task is handed to the writer as the one gentle reminder; Gemini weaves it
  in as a single calm line using the exact title — it cannot choose, add, or invent
  it. **In BOTH prose and the checklist fallback** ("BEEN WAITING / • <title>"), so
  the nudge survives a Gemini outage (selection is code-side). **Temporary aid:** a
  "brief test" trigger runs the identical brief with the threshold at 0 days, so the
  picker can be verified on real tasks without a 3-day wait; marked temporary, may be
  removed. Trade-off: created_at is a coarse "untouched" signal until/unless a
  last-touched column is added — accepted to stay read-only.

- **Gemini writes the brief from the verified facts, in the "quiet broadsheet"
  voice; any AI failure falls back to the plain checklist — never silent (Phase 6,
  Piece 6c).** The brief reads the day exactly as 6b (the verified source of truth),
  then hands those SAME facts to Gemini to REWRITE in real words. **Direction:** this
  is data -> words, the opposite of Phase 5 capture (words -> data). **Voice**
  (06-design.md "Voice & words"): warm but restrained — a columnist, not a
  cheerleader; sentence case, plain verbs, ~2-4 short sentences, no hype, no emoji, no
  exclamation marks (a tiny post-filter also strips any stray "!"). **Truthfulness:**
  the prompt forbids inventing/adding/dropping/guessing any item; Gemini may only
  rephrase what's supplied; empty groups are stated plainly in the facts so it can't
  imply an item; the days-overdue count is PRECOMPUTED and passed in, so Gemini never
  does date math; temperature 0. **Reuse:** same GEMINI_API_KEY secret and same model
  string (gemini-3.1-flash-lite) as capture. **FALL BACK, NEVER GO SILENT (the key
  rule):** if Gemini is missing, errors, returns junk/empty, or hits its free-tier
  limit (429) / stays down after 503 retries, the brief sends the plain 6b checklist
  instead — the owner ALWAYS gets the day; the function never crashes and never sends
  nothing (a silent brief is the worst outcome — see Phase 6's plan). Still read-only,
  free tier, no schedule, no DB change. Trade-off: wording varies run to run (only the
  facts must hold) and the brief depends on a model call — both acceptable because the
  exact checklist is always the safety net.

- **The 6b brief is a robotic, rule-built read of the day — no AI, read-only, no
  dedupe (Phase 6, Piece 6b).** Before Gemini ever touches the brief, the owner must
  be able to trust the READING. So 6b builds the summary by plain rules and the owner
  eyeballs it against the app. **Groups, fixed order, each labelled:** (1) EVENTS
  TODAY = today's events PLUS time-blocked tasks (open tasks with a scheduled start
  today, marked "(task)"), merged and sorted earliest-first — because on the calendar
  those tasks sit alongside events; (2) TODAY = open tasks in the 'Today' bucket;
  (3) DUE TODAY = open tasks whose due_date is today (any bucket); (4) OVERDUE = open
  tasks whose due_date is before today. **Empty groups are STATED, never hidden**
  ("No events today.") — empty is information. **No dedupe across groups** — a task
  that is both due-today and in the Today bucket appears in both; selection refinement
  is 6d, not here. **"Today" = the Europe/Amsterdam calendar day** (midnight→midnight),
  the SAME definition capture uses. **Read-only + RLS intact:** reads use the service-
  role key and filter every query to user_id = OWNER_USER_ID (service-role bypasses
  RLS, so the explicit filter is the guard); only existing columns are read, no schema
  change. Any read failure sends a plain "couldn't read your day" rather than a
  half-brief. Trade-off: literal/robotic and a bit repetitive — intended, so the data
  is verifiable before AI wording (6c) and smarter selection/staleness (6d).

- **Shared timezone logic moved to `_shared/datetime.ts`; telegram left untouched
  (Phase 6, Piece 6b).** The brief must use the SAME timezone and "today" definition
  as capture. Rather than reinvent it, the helpers (TZ Europe/Amsterdam, todayYMD,
  localToUtc, humanDate, + clockLabel/addDaysYMD for the brief) now live in a shared
  module the brief imports. **Why not also refactor telegram onto it now:** the
  guardrails for this read-only piece say the capture flow must behave exactly as it
  does, so the working `telegram` function was left byte-for-byte unchanged (it still
  carries its own copy of TZ/todayYMD/localToUtc). **Trade-off (acknowledged):** the
  logic is duplicated until a later cleanup points telegram at the shared module —
  accepted deliberately to avoid redeploying/re-verifying capture during a display
  piece. The shared copy is lifted verbatim, so the two definitions agree.

- **The brief lives in its own PRIVATE edge function, fired by the reserved word
  "brief" (Phase 6, Piece 6a).** A new, SEPARATE function `brief`
  (supabase/functions/brief/index.ts) holds all brief logic from the very first
  piece, even though 6a only sends a fixed message. **Why separate, not inside
  telegram:** the 7am scheduler will call the brief DIRECTLY in a later piece, so its
  logic must not be tangled inside the Telegram webhook handler — keeping them apart
  means the alarm path and the chat path never interfere, and the brief can grow
  (reading the day, the AI) without bloating the webhook. **Why PRIVATE (deployed WITH
  jwt verification, NOT --no-verify-jwt):** the brief is never called by Telegram, only
  by trusted server callers (the telegram function today, the 7am alarm later) that
  hold the service-role key — so its public URL should refuse anonymous calls outright.
  This is deliberately STRICTER than the telegram function, which must stay public
  (--no-verify-jwt) because Telegram's webhook can't send a Supabase JWT. Verified live:
  an anonymous POST to the brief URL returns 401. **The trigger:** texting Marty the
  single word "brief" (trimmed, lowercased) is reserved from now on; the telegram
  function, AFTER its secret check + owner-gate, invokes the brief with its service-role
  key and STOPS — no capture/save for that message. On success the brief texts the
  owner itself (no duplicate reply); telegram only speaks up if firing it failed.
  Trade-off: "brief" can't be captured as a task title by text (negligible), and there's
  one more deployed function to keep matched to the repo.

- **The REAL Supabase project is `cntlptuacsujbdtwvbis`; an old `qupudazcutkbnxseciwn`
  exists and must be ignored (Phase 5, Piece 5a).** Setting up the first edge function
  revealed the Supabase CLI was logged into an account whose only "lifeos" project was
  `qupudazcutkbnxseciwn` (created 2026-06-02 — *before* this build started). The project
  the live app actually reads/writes is **`cntlptuacsujbdtwvbis`** (created 2026-06-21,
  Frankfurt), which lives under a **different Supabase account**. **Why this matters:**
  deploying functions / setting secrets / running the scheduler must always target
  `cntlptuacsujbdtwvbis`, or they'd be wired to the wrong (empty) backend. **How we
  connect the CLI:** a personal access token generated from the correct account (passed
  as `SUPABASE_ACCESS_TOKEN` per command, never written to a file or the repo); the repo
  is linked to `cntlptuacsujbdtwvbis` via `supabase link`. The `qupudaz…` project should
  be treated as dead. Trade-off: the CLI's plain `supabase login` picks the wrong account
  unless the browser is on the right one — use the access token to be sure.

- **The bot's public endpoint is authenticated by a Telegram webhook secret token,
  fail-closed (Phase 5, Piece 5e).** With `--no-verify-jwt` the function URL is publicly
  reachable, and the 5b owner-gate only checks the chat id inside the (forgeable) request
  body — so a forged "message from the owner" could otherwise inject rows. Fix: a random
  secret is set on the Telegram webhook (`setWebhook secret_token`) and stored as the
  `TELEGRAM_WEBHOOK_SECRET` Supabase secret; Telegram sends it in the
  `X-Telegram-Bot-Api-Secret-Token` header on every call. The function's FIRST action is
  to compare that header to the stored secret and return 401 on any mismatch — **fail
  closed** (if the secret env is missing, reject everything, never run open). The owner-gate
  stays as a second check behind it. **Why keep --no-verify-jwt:** Telegram can't send a
  Supabase JWT; the secret token is the right authenticator for a webhook. Verified: no
  header / wrong header → 401; correct → 200. Trade-off: none meaningful; rotating the
  secret means re-running setWebhook + updating the secret.

- **Undo uses a separate `telegram_saves` log table; deletes exactly one row by id
  (Phase 5, Piece 5e).** "undo" must remove the last thing the BOT saved and never touch a
  row the owner made in the app. Tasks carry `source='telegram'`, but the events table has
  no such column and we will NOT add one or repurpose the reserved `external_id` (that would
  touch the spine's meaning). **Chosen (owner's pick): a new, separate `telegram_saves`
  table** (db/06_telegram_saves.sql) that records each bot-saved item's `item_table` +
  `item_id` (+ title). Undo reads the owner's single most recent log entry and deletes that
  EXACT row by its unique id, filtered to `user_id = owner` (defence in depth; service-role
  bypasses RLS so the explicit filter is the guard). **Why a separate table:** it adds a
  module table without changing the core tables' meaning ("protect the spine"), works
  uniformly for tasks and events, and makes "the last item" a precise lookup. App-made rows
  are never in the log, so undo can't reach them — verified live (a hand-made task survived
  "undo"). No FK from the log to the core rows (a row deleted in the app just makes the log
  entry stale → undo says "already gone" and clears it). One level only (the last item).
  Trade-off: a tiny extra table + a log write per save — cheap for safe, precise undo.

- **Bot-saved rows: service-role write + explicit owner user_id; mapping rules
  (Phase 5, Piece 5d).** Marty writes a confident read straight into the spine tables,
  matching their existing shapes exactly (no new columns, no schema change, db/
  untouched). **Ownership / RLS:** the insert uses Supabase's service-role key
  (auto-injected into the edge function, server-side only, never sent to a client or
  committed) and sets `user_id = OWNER_USER_ID` (the owner's auth id, stored as a
  secret) on every row — so each row is owned by the owner and the tables' owner-only
  RLS policies are left UNCHANGED. We do not weaken RLS; the service-role write is
  trusted server code, and the explicit user_id is what makes the row mine. **Mapping
  (the owner's rules, baked in):** specific clock time → EVENT (start = the time, end
  = +1h default, matching tap-to-create); a stated date on a TASK → `due_date` (a
  deadline, NOT a scheduled calendar block); task bucket = 'Today' when no date or the
  date is today, else 'This Week'; category always null (= Inbox — Marty never guesses
  a category); tasks tagged `source='telegram'` (events have no source column).
  **Unsure/gibberish reads save NOTHING** (no junk row from a bad read); rate-limit and
  read errors also save nothing and say so. **Confirm-after-saving:** Marty replies
  only after the row lands, with type/title/when/bucket-or-calendar/category so it's
  findable. Trade-off: `source='telegram'` is a new value in the existing free-text
  `source` column (its intended purpose — marking origin) — owner accepted; changes no
  table meaning.

- **Gemini reads messages into structured JSON; understanding is a separate piece
  from saving (Phase 5, Piece 5c).** Marty sends the owner's text + today's local
  date/time to Gemini and gets back STRUCTURED fields (type/title/date/time +
  needs_clarification + note), then replies in plain English with "(Not saved yet.)".
  **Why split understanding from saving:** a misread is harmless this piece — the
  owner just sees a wrong reply, no junk row in the DB — so we can tune the reading
  before 5d ever writes. **How it's made reliable:** Gemini is given a strict
  `responseSchema` with `responseMimeType: application/json` at temperature 0, so it
  returns only JSON; if the call fails or the JSON is malformed, the function returns
  null and Marty says "I couldn't read that one" rather than crashing (with up to 3
  attempts to ride out a transient 503/429). The reading rules are the owner's:
  Europe/Amsterdam timezone, a vague day = the next upcoming occurrence (today if it
  is today), and a specific CLOCK TIME ⇒ event, otherwise task. Code is split into
  `index.ts` (gate + transport) and `understand.ts` (prompt + call + reply) to keep
  files small. Trade-off: relies on the model for date math — accepted because the
  owner verifies the reply before anything is saved.

- **Gemini model: gemini-3.1-flash-lite — chosen for the highest free DAILY limit
  (Phase 5, Pieces 5c→5d).** The architecture doc says "Gemini Flash, free tier."
  Journey: `gemini-2.0-flash` free tier = `limit: 0` (unusable); `gemini-2.5-flash`
  and `gemini-2.5-flash-lite` both work but their free tier is only **~20 requests/
  day** (the owner's AI-Studio rate-limit dashboard showed 22/20 — exhausted, which
  caused the "hit my AI limit" replies). **`gemini-3.1-flash-lite`** has **500 req/
  day, 15/min** on the free tier (per that dashboard) — far more headroom — and reads
  the samples just as well, so it's the settled choice. **Why a flash-LITE tier (not
  full flash like 3.5-flash):** the task is simple one-line extraction (lite is
  plenty), and full-flash free tiers carry *lower* daily caps (~20/day) that would
  reintroduce the rate-limit problem. **How to change:** the model is a single
  `GEMINI_MODEL` const in `understand.ts`. Still free; the paid-key switch for
  sensitive modules remains a LATER phase. Failure handling unchanged (503 → retry
  with backoff; 429 → "I've hit my AI limit, try again in a minute", saves nothing).
  Trade-off / failure handling: free Flash can briefly **503** ("high demand") or
  **429** (over the free per-minute/day limit). The function retries with backoff to
  ride out 503s, but treats a 429 distinctly — it stops (retrying in seconds can't help)
  and Marty replies "I've hit my AI limit — try again in a minute" rather than the
  misleading "couldn't read that". In real single-user use the limits are rarely hit;
  the one 429 seen in testing was self-inflicted (heavy test calls draining the
  per-minute quota just before an owner message).

- **The bot is locked to the owner by a chat-id gate at the front of the function;
  the id is a secret (Phase 5, Piece 5b).** The `telegram` function's first action
  is to read the sender's chat id and compare it (as a string) to `OWNER_CHAT_ID`;
  a non-match returns 200 immediately with NO reply sent. **Why a front gate, not
  per-feature checks:** one choke point means every later piece (Gemini, DB writes)
  is owner-only by construction — you can't forget to guard a new path. **Why the id
  is a Supabase secret, not hard-coded:** keeps a personal identifier out of the
  public repo, same discipline as the tokens; re-pointing to a different id is a
  secret change, no redeploy of logic. **Verification without a second account:** the
  function still answers Telegram 200 in both cases (so Telegram stops retrying), but
  returns the internal body `"ok"` when it processed the owner vs `"ignored"` when it
  blocked a stranger. Telegram ignores the response body, so nothing in any chat
  changes — but a direct test call can confirm the gate (stranger id → "ignored", no
  message; owner id → "ok", real reply). Trade-off: the distinct body faintly signals
  "a gate exists" to anyone probing the URL — harmless, since the owner id isn't
  revealed and the function touches no data.

- **Telegram bot calls the edge function with JWT verification OFF (Phase 5, Piece 5a).**
  The `telegram` function is deployed with `--no-verify-jwt`. **Why:** Telegram's webhook
  calls carry no Supabase login token, so with JWT checking on they'd all be rejected
  (401) and the bot would stay silent. **Trade-off / safety:** the endpoint is publicly
  callable, so security can't lean on the JWT gate — Piece 5b locks behaviour to the
  owner's chat id, and the function touches no database (nothing to leak). The bot token
  lives only in Supabase's secret store (`TELEGRAM_BOT_TOKEN`), never the repo.

- **Subtasks: one level only, enforced in the DB; parent shows a count and never
  auto-completes; parent-delete promotes children (Phase 3, Piece 3e).**
  - **One level only, enforced in BOTH places.** UI: "+ Add subtask" is offered
    only on a top-level task, never on a subtask. DB: a new trigger
    `tasks_before_write` (`db/05_subtasks_guard.sql`, mirroring the category
    guards) refuses to give a parent to a task whose chosen parent is itself a
    subtask, and refuses to turn a task that already has subtasks into a subtask —
    so a three-deep mess can't be saved even if the UI is bypassed. **Why DB too:**
    a UI-only rule can be bypassed; the one-level invariant is part of the spine.
    The trigger only validates (no `SECURITY DEFINER`), so **RLS stays owner-only.**
  - **The parent shows a quiet "X of Y done" count and does NOT auto-complete.**
    The count is information; completing all subtasks does nothing automatic to the
    parent, and the parent is never blocked from completing — it has its own tick,
    under the owner's control. **Why:** the owner stays in charge; a list that
    completes things on its own is surprising.
  - **Deleting a parent PROMOTES its subtasks to top-level (they survive).** The
    `parent_task_id` FK was already `ON DELETE SET NULL` from Piece 1, so this is
    the existing behaviour — checked, kept, NOT cascade. Subtasks inherit the
    parent's `time_bucket` on creation, so a promoted child lands in a sensible
    bucket. **Why:** least-destructive, matching the categories reparent-up rule;
    silent task loss is unacceptable. A task-delete action was added in the list
    editor to make this reachable (lists only — not the calendar task overlay).
  - Subtasks render indented under their parent (the calm Categories tree look),
    one level. UI only beyond the guard — no schema/RLS change.

- **Someday is a quiet collapsed drawer below This Week, opening a scroll region
  (Phase 3, Piece 3d).** Someday deliberately does NOT get equal billing with
  Today/This Week: collapsed by default, it's a single muted line (uppercase
  "Someday" + a count + a caret) under This Week — a drawer you open, not a third
  headline. **Why here / this shape:** it stays reachable without competing for
  daily attention. Expanded, it reuses the exact shared `TaskBlock`/`TaskRow`
  (with the big Fraunces headline suppressed via a `hideTitle` prop) so the rows
  match the other buckets; adding lands the task in `time_bucket='Someday'`. **Open
  state is session-only** (component state, not persisted — no storage complexity).
  **Zero-scroll:** the drawer's body has its own `max-height` + `overflow-y:auto`,
  so opening it reveals a contained scroll region rather than lengthening the page
  (the page stays under `.today`'s `overflow:hidden`). Trade-off: none meaningful.

- **Overdue colour = a new `--overdue` brick token; "due today" is not overdue
  (Phase 3, Piece 3c).** The prompt assumed an overdue colour already existed —
  it didn't, so a `--overdue: #A85C44` token (the palette's brick) was added to
  `theme.css`. **Why brick, not the accent:** the design doc keeps warm reds
  darker than the terracotta accent (`#C8643D`) so a deadline never reads as
  "urgent now"; the accent stays reserved for today / the now-line / key marks.
  Overdue datelines use `--overdue`; the accent is untouched. **Reading:** a task
  due in the past (and not done) shows its dateline in brick; **a task due today
  reads "Due today" in the normal muted colour, NOT overdue**; a done task never
  shows overdue (the dateline drops to muted). Due dates are deliberately calm —
  no bold, no icon — since most tasks won't have one. Trade-off: none; this just
  names a colour the design already implied. (Distinct from `scheduled_start/end`
  — a due date is a deadline, never rendered as a calendar block.)

- **[Phase 3 trailing pieces built after Phase 4]** — subtasks, the due-date
  picker, and the Someday-bucket view were not built during the main Phase 3 work
  and were finished after Phase 4 as Pieces 3c–3e, before starting Phase 5.
  **Why:** they slipped past as the calendar work took over; rather than carry
  them as silent gaps into the Telegram phase, we close them out so Phase 3 is
  honestly complete. **Trade-off:** a short detour back to tasks before Phase 5 —
  accepted, to avoid forgotten loose ends. The columns (`parent_task_id`,
  `due_date`, `time_bucket='Someday'`) already existed in the tasks table from
  Piece 1, so this is UI only, no schema change.

- **Tapping a scheduled-task block edits the task, from a shared editor (Phase 4,
  Piece 4h).** On the calendar (day and week), tapping a dotted task block opens
  the Piece-2a task editor (title / notes / category / priority) as a calm overlay
  — so a task can be edited from the grid. **It stays a task** (the editor writes
  only task columns; no type change). **Why this over a no-op (the owner's pick):**
  full parity with events (which already edit on tap), and you can fix a task
  without hunting for it in the list. **How (reuse, not duplicate):** the editor
  fields were extracted from the list row into a shared `TaskEditForm`, used by
  both the list's inline panel (`TaskRow`) and the calendar overlay (`TaskPanel`).
  Saves inline (text on blur, chips/priority on tap), a Close button dismisses it.
  Trade-off: one more overlay surface; offset by the shared form (no duplicated
  fields).

- **Cross-day drag = inject geometry into the shared hook; horizontal snaps to
  whole columns (Phase 4, Piece 4g).** The week reuses the day's drag hook rather
  than a second one; the only difference is geometry, so the hook now takes a
  `geometry` object — `minutesAt(y)` (vertical, snapped to 15 min, as before) and
  `dayStartMsAt(x)` (which day-column the pointer is over). On the day view
  `dayStartMsAt` is constant (today); on the week it maps X → the column, so
  dragging left/right changes the **date** while the time holds. **Horizontal
  snaps to whole day-columns** (no sub-day precision) — combined with the 15-min
  vertical snap, a block lands on a clean day+time. **Why:** one hook, one set of
  drag mechanics (snap, threshold, tap-vs-drag); the day-axis is just more
  geometry. **Cross-column live preview:** the real block stays mounted but
  invisible (so the pointer keeps its grip — unmounting would drop pointer
  capture) and a light floating preview follows the pointer across columns;
  overlap re-splits on drop (reload), as specified. Resize and unschedule are
  flagged off on the week (those are 4h / day-only). Trade-off: a couple of opt-in
  flags + a geometry object on the hook — cheaper than a parallel implementation.

- **Day and week views share one column render (Phase 4, Piece 4f).** The week
  view is a seven-day version of "The Day", not a new paradigm — so the
  hour-grid-with-blocks render was factored into a shared `DayColumn` component
  used by both: the interactive day timeline (drag/create wired in via props) and
  the read-only week (those props omitted). The overlap packing (`eventLayout.js`),
  the events+tasks item-building (`buildDayItems`), the `EventBlock` render
  (incl. the dotted scheduled-task treatment), and the scroll-to-now helper
  (`nowScrollTop`) are all shared — nothing is duplicated. **Why:** one source of
  truth for "a day's blocks" means the week automatically matches the day (and
  4g's week editing can reuse the same drag). `EventBlock` gained an `interactive`
  flag that hides the drag handles / unschedule control and the grab cursor when
  read-only. Trade-off: a couple of opt-in props on the shared component; worth it
  to avoid a parallel implementation.

- **A scheduled task STAYS a task — scheduling only sets times (Phase 4, Piece
  4e).** Dragging a task onto the day grid sets its `scheduled_start`/
  `scheduled_end` and nothing else. It does **not** become an event and does not
  change type: it still appears in its Today/This Week list, is still completed by
  ticking it there, and its grid block is just a second view of the same task.
  Unscheduling clears those two columns back to null — nothing is deleted.
  **Why (owner's decision, per the architecture doc):** tasks and events share one
  timeline but stay distinct types; one move (set times) is all scheduling should
  be, so the spine stays clean and there's no type-conversion to undo. **Built-in
  details:**
  - **Dotted (dashed) block on the grid** marks a scheduled task, vs an event's
    solid border — same category colour/kicker language otherwise. (This puts the
    mock's time-blocked-task treatment into use.)
  - **One-hour default** on drop (drop time → +1h), then adjustable with the 4d
    edge-drag. Snaps to 15 min like events.
  - **Unschedule two ways** (both built, owner's choice): drag the block off the
    grid's right edge (toward the task list), OR the small "×" on the block. Both
    just clear the scheduled times.
  - Move/resize of a placed task block **reuses the 4d drag hook** (writing
    `scheduled_start`/`scheduled_end` instead of `start_at`/`end_at`); task and
    event blocks join the **same side-by-side overlap layout**.
  - The list→grid drag is a separate small hook (`useScheduleDrag`) started from a
    quiet grip on each task row; mouse only (touch unchanged). Trade-off: a grip
    per row — kept subtle to respect "no clutter."

- **Drag on the day column: 15-minute snap + a 4px tap-vs-drag threshold (Phase
  4, Piece 4d).** Events can be dragged to move (duration fixed) or resized by
  their top/bottom edge, snapping to **15-minute** steps live as they move (the
  owner's choice — matches Apple Calendar and most people's mental model). **A
  press only becomes a drag once the pointer crosses ~4px**; under that it's a
  tap. **Why the threshold:** selection (open the edit panel) and empty-slot
  create are taps — a zero-distance "drag" must not eat them. Implementation keeps
  selection on the native `click` and only swallows the click that follows a real
  drag, so taps (mouse and touch) still open the panel. **Resize stops at a 1-step
  (15-min) minimum duration**, so an event can never be dragged to end before it
  starts — the DB backwards-time guard can't even be reached. **Touch starts no
  drag** (keeps native scroll/tap on phones); mouse only. Gesture logic is
  isolated in `src/useEventDrag.js` (apart from the render) so a bug stays
  contained. Trade-off: touch users can't drag yet (panel still edits); fine —
  touch-drag isn't this piece's target.

- **Event create/edit uses a calm OVERLAY panel, not an inline expand (Phase 4,
  Piece 4c).** The task edit panel (2a) inline-expands within a list row, but a
  time grid can't inline-expand a block without shoving the other events out of
  position. So the event editor is a small overlay card floating over the day
  column, with a faint scrim (no heavy shadow — keeps the paper feel). **Why:**
  the grid behind stays put, so the page never scrolls (zero-scroll law), and the
  panel still reuses the task panel's exact field + chip styling (`tasks.css`), so
  it reads as the same family rather than a new paradigm. **Trade-off:** an
  overlay isn't a literal inline expand; accepted because the grid demands it and
  the prompt allowed either.
- **Tapping a slot defaults to a one-hour event at the tapped hour (4c).** Tap
  empty grid → a new event from that hour to +1h (e.g. tap 2pm → 2:00–3:00),
  adjustable in the panel; "+ Add event" defaults to the next whole hour. **Why:**
  a sensible, predictable default is calmer than making the owner set both ends
  from scratch; one hour is the common case. Trade-off: tap rounds to the hour
  (not the exact minute), which the panel lets you fix.

- **Overlapping events split side-by-side on the day timeline (Phase 4, Piece
  4b).** When events overlap in time, the lane splits into columns: each event
  takes the first column where it doesn't collide, and a cluster's column count
  is the most that overlap at once — so both stay readable and neither is hidden.
  **Why (the owner's pick):** least information lost — you can always see every
  event, just narrower, the way Apple/Google Calendar handle a busy hour. The
  alternatives (stack/hide all but the top one; show a "+N more" pill) hide
  events, which fights "nothing forgotten." **Trade-off:** a very crowded hour
  makes each block narrow; acceptable, and tunable later. Logic lives in the pure
  `src/eventLayout.js` (no React) so it's easy to reason about. Read-only this
  piece — no drag/resize.

- **`events` table — the third spine table (Phase 4, Piece 4a).** Built now to
  its FULL architecture-doc shape so the Phase-4b timeline and future Apple
  Calendar sync bolt on with NO rebuild, even though this piece's UI only proves
  an event saves/reads/deletes. Final shape (source of truth: `db/04_events.sql`):
  `id` uuid PK · `user_id` uuid not null (default `auth.uid()`, FK→auth.users, on
  delete cascade — same anti-spoof pattern as tasks/categories) · `title` text
  not null · `notes` text null · `category_id` uuid null (FK→categories, **on
  delete SET NULL**) · `start_at` timestamptz not null · `end_at` timestamptz not
  null · `location` text null · `repeat_rule` text null (string only — NO
  recurrence logic yet) · `external_id` text null (hidden, never shown — free prep
  for Apple Calendar sync) · `created_at` timestamptz default now() · **CHECK
  `end_at >= start_at`** (a backwards event can never be stored; zero-length ok).
  - **Why this shape:** matches the architecture doc's events list exactly
    (calendar-standard span, location, repeat rule, hidden external_id). RLS is ON
    with owner-only select/insert/update/delete (all keyed to `auth.uid() =
    user_id`). Indexes on `user_id`, `category_id` and `start_at` (the 4b timeline
    reads a day's events in start order). This ADDS to the spine; it does not
    change the tasks/categories tables' meaning.
  - Trade-off: `repeat_rule`/`external_id` exist with no behaviour yet — intended
    (they reserve the shape so later pieces don't migrate).

- **Deleting a category EMPTIES its events (set-null), mirroring tasks (Phase 4,
  Piece 4a).** When a category is deleted, its events have their `category_id`
  emptied (they fall to uncategorised), enforced at the DB by `ON DELETE SET NULL`
  — never cascade. **Why:** this deliberately mirrors the tasks rule exactly
  (see "Deleting a category EMPTIES its tasks into Inbox") — least destructive,
  silent loss of events is unacceptable, and an event can never point at a
  category that no longer exists. The alternatives (cascade-delete the events;
  block deleting a non-empty category) were already weighed and rejected for
  tasks for the same reasons; events follow suit for consistency. Trade-off: a
  deleted category's events lose their label and need re-filing — acceptable and
  reversible.

- **[Today's left "The Day" column is a placeholder until Phase 4]** — The real
  Today home is built to the approved two-column Front Page shape, but the left
  "The Day" timeline needs events, which don't exist until Phase 4. So the left
  column renders a calm invitation ("Your day's timeline arrives with events"),
  NOT the hour grid / event blocks. **Why keep it (vs dropping the column until
  Phase 4):** keeping the two-column shape preserves the approved look and avoids
  a jarring relayout when events land — the placeholder is in the design's voice
  (an invitation, not an apology). **Trade-off:** a chunk of the page is a
  placeholder for now; acceptable, and it sets the slot the day-column timeline
  drops into later. Built from the owner's written description (the mock file
  `mockups/lifeos-today-frontpage.html` was again not present in the repo).

- **[Navigation skeleton brought forward from the redesign]** — We built the
  app's top frame and three-destination nav (Today / Calendar / Settings, with a
  broadsheet masthead) now, ahead of the Phase 7 redesign. **This is NOT a
  reversal of [Data foundation before design].** The nav is *bones*, not the
  redesign: it replaces the temporary entry points that were piling up (the
  masthead Calendar/Categories switch, the separate Tasks link) with one stable
  skeleton, so each new piece has an obvious home instead of another bolt-on
  link. The full per-screen redesign — the real Today home layout, the day-column
  timeline, type/colour/motion polish on every screen — still belongs to Phase 7.
  **Why now:** the interim entry points were becoming clutter and would be redone
  anyway; a single clean skeleton is cheap, stops the mess (CLAUDE.md), and gives
  the data-foundation pieces somewhere tidy to land. **Why it's still bones:**
  the Today route currently just renders the existing task view; Calendar is still
  the empty shell; no screen got its real redesign. **Trade-off:** a little
  design work lands early, but only structural navigation — the look-and-feel
  conversations the redesign phase owns are untouched. Built from the owner's
  written description of the approved "Front Page" mock (the mock file
  `mockups/lifeos-today-frontpage.html` was not present in the repo); the
  decorative flourishes (edition line "Vol. I · No. 142", foot colophon, the
  "categories, account" subtitle under Settings) are optional and easy to drop —
  owner to confirm as art director.

- **[Data foundation before design]** — Build all spine tables and data
  structures to their full architecture-doc shape first; the interim UIs that
  verify each piece stay deliberately plain and are NOT design-finalised. A
  dedicated UX/UI redesign phase comes later, after the data foundation is
  complete. **Why:** the data shapes are the expensive thing to get wrong — a
  later redesign that only touches layout, type and colour is cheap because
  nothing underneath has to move; polishing throwaway verify screens now is
  effort we'd redo. **Trade-off:** the app looks plain and unfinished for a
  while; visual choices (e.g. the task priority treatment) are intentionally left
  un-locked until the redesign phase, so don't record them as final before then.
  **For Claude Code:** stop asking the owner to art-direct interim verify screens
  — keep them functional and calm but don't fine-tune; save design decisions for
  the redesign phase.
  - **AMENDED (Phase 7, Piece 1):** the part of this that framed the redesign as
    "only touches layout, type and colour" with "nothing underneath has to move"
    is **superseded** by **[Phase 7 MAY include schema and logic changes]** at the
    top of this doc — Phase 7 may make data/logic changes where the UX genuinely
    needs them, each as its own surfaced, separately-verified piece. The rest of
    this decision (build the spine fully first; keep interim verify UIs plain)
    still stands.

- **`tasks` table — the second spine table (Phase 3, Piece 1).** Built now to its
  FULL architecture shape so later pieces (priority, time-bucket views, due-date
  picker, subtasks, calendar time-blocking) bolt on with NO rebuild, even though
  this piece's UI only touches title, category and done/open. Final shape
  (source of truth: `db/03_tasks.sql`):
  `id` uuid PK · `user_id` uuid not null (default `auth.uid()`, FK→auth.users, on
  delete cascade — same anti-spoof pattern as categories) · `title` text not null
  · `notes` text null · `category_id` uuid null (FK→categories, **on delete SET
  NULL**) · `parent_task_id` uuid null (self-FK, **on delete SET NULL**) ·
  `priority` text null (CHECK in high/med/low) · `time_bucket` text not null
  default `'Today'` (CHECK in Today/This Week/Someday) · `due_date` date null ·
  `scheduled_start`/`scheduled_end` timestamptz null · `status` text not null
  default `'open'` (CHECK in open/done) · `completed_at` timestamptz null ·
  `source` text default `'typed by me'` · `created_at` timestamptz default now().
  - **Why this shape:** matches the architecture doc's tasks list exactly,
    including the "one move that unlocks everything" (`source` — future modules
    just write tasks). RLS is ON with owner-only select/insert/update/delete (all
    keyed to `auth.uid() = user_id`), so the DB never returns or accepts another
    user's rows. This ADDS to the spine; it does not change the categories table's
    meaning.
  - **NULL category = Inbox, the ONE and ONLY representation.** A task means
    "uncategorised / Inbox" by having `category_id = null` — we never also
    re-point it at the real Inbox row's id. One representation only, so there's no
    "two ways to mean the same thing" trap (the same discipline we used to ban
    duplicate category names). Trade-off: the Inbox row exists as a category but
    tasks never reference it by id; that's intended.
  - **Fixed-value fields locked at the DB** via CHECK constraints on `status`,
    `priority` and `time_bucket`, so a bad value can never be stored even via a
    future module or Telegram — not just guarded in the UI. `priority` is nullable
    (NULL = "no priority set"; a CHECK passes on NULL).
  - **`completed_at` can never lie** — a `before insert/update` trigger
    (`tasks_sync_completed_at`) stamps it when `status` becomes `done` and clears
    it back to NULL when reopened, regardless of who writes the row. So an open
    task never carries a stale finish time. Trade-off: the app can't set an
    arbitrary completed_at while a task is open — correct for a truthful log.

- **Deleting a category EMPTIES its tasks into Inbox; deleting a parent task
  PROMOTES its subtasks (Phase 3, Piece 1).** Both enforced at the DB by `ON
  DELETE SET NULL` foreign keys, so they hold even if the app is bypassed and a
  task can never point at a category (or parent) that no longer exists.
  - **Category delete → tasks emptied (fall into Inbox).** This is the chosen
    behaviour. **Why:** least destructive — matches the category reparent-up rule
    and "calm, never shout"; silent task loss is unacceptable.
    - *Alternatives considered:*
      - **Delete the tasks too (ON DELETE CASCADE).** Pro: no leftovers. Con:
        silently destroys real tasks when a bucket is removed — unacceptable.
      - **Block deleting a non-empty category.** Pro: forces a deliberate choice.
        Con: a stop-and-fix chore mid-flow; fights the calm/least-friction goal.
    - Trade-off of the chosen path: a deleted category's tasks lose their bucket
      label and need re-filing if you want them elsewhere — acceptable and
      reversible.
  - **Parent task delete → subtasks promoted to standalone (also SET NULL).**
    **Why:** same least-destructive ethos; a subtask shouldn't vanish because its
    parent did. Trade-off: a subtask outlives its parent as a top-level task;
    revisit when the subtasks UI is built (Piece-later) if a different rule is
    wanted.

- **The category colour palette is LOCKED (Phase 2, Piece 3b).** 16 muted,
  editorial hues — the official record (source of truth: `src/palette.js`; mood
  record: `06-design.md`). The DB `color` column stores the colour **id** (e.g.
  `'teal'`), not a hex, so re-tuning a hue is a one-value edit with no data
  migration. **Why these / this structure:** kept the design doc's five anchors
  (Teal/Sage/Plum/Ochre/Slate) and filled the wheel evenly; warm reds are darker
  than the terracotta accent so a dot never reads as "urgent".
  - **Core 12 (distinct at a glance):** Slate `#6B7280`, Stone `#8C8275`, Teal
    `#3B6B6B`, Pine `#41705A`, Sage `#6E8B5A`, Olive `#87833F`, Ochre `#A87B3A`,
    Brick `#A85C44`, Wine `#874E58`, Plum `#9A6A7B`, Mauve `#7E6597`, Steel
    `#4E789C`.
  - **4 shades (lighter family variants, for sub-categories):** Moss `#9AAC7B`,
    Sky `#84A6C4`, Lilac `#B08FB8`, Sand `#C2A56B`.
  - **16-vs-12 decision:** we did NOT force 16 equal hues. True at-a-glance
    distinctness caps ~12, so the 12 are the standalone core and the 4 are
    explicit shades of existing families (green/blue/purple/gold). Validated by
    eye in the dot/tag preview before locking. Trade-off: the 4 shades aren't
    independently distinct — by design.
  - **Dark mode:** structure only. Each palette entry is an object so a per-colour
    `dark` value drops in later; no dark values built/validated yet (no dark mode
    to see them in).

- **New categories start UNCOLOURED until the owner picks; Inbox defaults to Slate
  (Piece 3b).** A new category shows a quiet hollow dot until a colour is chosen
  from the set. **Why:** colour stays intentional and "earns its place" (design
  doc) and the quick-add flow stays calm — auto-assigning would spend colours
  meaninglessly and repeat them. Colour is chosen from the curated set only (no
  free hex picker). Inbox is set to Slate once, on load, if still uncoloured.
  Trade-off: a brand-new category carries no colour until you give it one.

- **Deleting a category reparents its children UP one level (Phase 2, Piece 3a).**
  When a category is deleted, its sub-categories attach to the deleted one's
  parent; if it was top-level, they become top-level (`parent_id = null`).
  **Why:** least destructive — nothing is lost and the rest of the hierarchy
  stays intact (what Finder/Things do), matching "calm, never shout." Enforced
  in the DB by a `before delete` trigger (`db/02_categories_guards.sql`), so it
  holds even if the app is bypassed. Trade-off: in the rare case a reparented
  child would collide with a same-named sibling at the destination, the delete
  is refused (duplicate-name rule below); owner moves/renames first.

- **Duplicate category names are blocked under the SAME parent only (Piece 3a).**
  Case-insensitive; different parents may reuse a name ("Class A" under Q2 and
  under Q3 is fine). **Why:** two identical siblings are a future-you trap,
  especially once tasks attach to categories; a global unique-name rule would be
  wrong. Enforced by a unique index on `(user_id, coalesce(parent_id, sentinel),
  lower(name))` — DB-level, can't be bypassed; the app shows a plain message.

- **Inbox is protected at the DB level: undeletable, unrenamable, stays top-level
  (Piece 3a).** A `before delete` trigger refuses to delete it; a `before write`
  trigger refuses to rename it away from 'Inbox' or give it a parent. **Why:**
  it's the fallback bucket (the spine), so UI-only guards aren't enough; keeping
  its name/position fixed lets the guards anchor on "top-level row named Inbox"
  without adding a special column (stays "not special machinery" per the
  architecture doc). Trade-off: can't rename Inbox to something else; acceptable
  for the one fallback bucket.

- **Cycle & cross-owner nesting blocked in BOTH the UI and the DB (Piece 3a).**
  UI: the "move inside" list hides a category and its own descendants. DB: the
  `before write` trigger walks ancestors and rejects a cycle, rejects self-
  parenting, and requires the parent to belong to the same owner. **Why:** clear
  message in the UI, hard guarantee on the spine. RLS stays owner-only — these
  triggers add rules, they don't widen access.

- **`categories` table — the first spine table (Phase 2, Piece 2).** Final shape
  (recorded so future pieces bolt on without a rebuild; see `db/01_categories.sql`):
  `id` uuid PK · `user_id` uuid not null (default `auth.uid()`, FK→auth.users,
  on delete cascade) · `name` text not null · `parent_id` uuid null (self-FK,
  on delete cascade — lets buckets nest later) · `color` text null (stays empty
  until Piece 3) · `sort_order` int not null default 0 · `created_at` timestamptz
  default now(). **Why:** matches the architecture doc's "buckets that nest, Inbox
  is just the first one." RLS is ON with owner-only select/insert/update/delete
  (all keyed to `auth.uid() = user_id`), so the DB never returns or accepts
  another user's rows. `user_id` defaults to `auth.uid()` so the app inserts just
  a name and can't spoof an owner. **Inbox** is seeded by the SQL as a normal row
  (idempotent — no second Inbox), not special machinery, per the architecture doc.
  Trade-off: deleting a parent cascades to its children (sensible for nesting);
  revisit if we ever want orphan-promotion instead.

- **Defer colours, nesting UI, and edit/delete to later pieces (Phase 2).** The
  `color` and `parent_id` columns exist now but no UI touches them. **Why:** the
  16-colour curated palette needs the owner's eye-validation (Piece 3), and
  nesting/edit/delete are their own careful jobs — Piece 2 is just the data
  foundation plus a bare-bones list+add view to verify it. Trade-off: the
  Categories view is intentionally plain (no colour picker, no sub-levels, no
  edit/delete) until those pieces land.

- **Visual foundation: Fraunces + Inter, terracotta accent, one theme file.**
  (Phase 2, Piece 1 — *starting values, owner is art director and will tweak
  before we lock.*) Why each:
  - **Fonts loaded from Google Fonts** via two `<link>` tags in `index.html`
    (with `preconnect` + `display=swap`), only the two weights we use —
    regular (400) and medium (500) — of **Fraunces** (serif: masthead +
    headlines) and **Inter** (sans: body, UI, all numbers). Why this way:
    lightest possible, no build/install step, no offline font files to ship;
    `display=swap` means text never blank-flashes. Trade-off: depends on a
    Google request at load (can self-host later if we want zero third-party
    calls). This **replaces** the design doc's earlier working faces
    (UnifrakturCook / Playfair / Libre Caslon) — those were explicitly listed
    as open questions for the owner to settle.
  - **Numbers use Inter's tabular figures** (`font-variant-numeric: tabular-nums`)
    on the masthead clock and the calendar's hour/date labels, so digits never
    shift width.
  - **One theme file** (`src/theme.css`) holds every colour + font as CSS
    variables on `:root`, imported once globally so login and calendar both
    inherit. Starting hexes (warm, mine to tweak): `--paper #F4EFE4`,
    `--ink #1C1916`, `--ink-muted #5C564C`, `--rule #D8D0BE`,
    `--rule-faint #E7E0D0` (extra-light line for the hour grid),
    `--accent #C8643D` (warm terracotta, owner's pick over the doc's broadsheet
    red). A commented dark-mode block sits in the same file so the "evening
    edition" is a drop-in later — no rewrite. Trade-off: none meaningful;
    structured for easy tuning.

- **Supabase env vars must be set in Vercel by hand (twice).** The app reads
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from environment variables.
  Locally these live in a `.env` file that is gitignored, so it never reaches
  GitHub — and Vercel builds from GitHub. Why: keeping secrets out of GitHub is
  correct, but it means Vercel has no copy of them unless we add them in the
  Vercel dashboard (Settings → Environment Variables) ourselves. Without them the
  live site builds but renders blank. Trade-off: a manual step we must remember
  whenever the keys change or a new deploy target is added; Vercel bakes these in
  at BUILD time, so changing them requires a redeploy to take effect. (The anon
  key is safe to expose publicly — RLS is what protects the data, not the key.)

- **Plain CSS + inline styles for now, not Tailwind (yet).** Why: the app was
  built with simple inline styles from the start; Tailwind (named in the
  architecture doc as the intended styling tool) was never actually installed.
  Rather than bolt on a new tool mid-build, the calendar uses one small CSS file
  (`src/calendar.css`) for the grid and the desktop/phone switch. Trade-off: not
  yet on Tailwind as the architecture doc envisions — we can adopt it later if
  styling grows complex; revisit before the styling gets large.

- **GitHub repo is public.** Why: checker chats (Claude.ai) can read any file
  directly via its raw GitHub URL, with no login or file-upload needed. This
  keeps the review workflow smooth. Trade-off: source code is visible to anyone
  on the internet — acceptable because there are no secrets in the repo and this
  is a personal project with no proprietary logic yet.

- **npm global prefix set to ~/.npm-global.** Why: macOS system-owned directories
  block npm global installs by default, causing permission errors. A user-owned
  prefix (`~/.npm-global`) sidesteps this without using `sudo`. Trade-off: one-time
  setup step needed on any new machine.

- **Telegram, not iMessage.** Why: iMessage has no official way for an app to
  send/receive; the workarounds need the Mac on 24/7 and break constantly,
  killing "free + works when laptop closed." Telegram is free, official,
  cloud-based, two-way, supports voice notes. Trade-off: not in the native
  Messages app.

- **Notifications via Telegram, not PWA push.** Why: iPhone PWA push is flaky.
  Letting Telegram handle all nudges sidesteps it. Trade-off: none meaningful.

- **One responsive codebase, two layouts.** Desktop = full dashboard, phone =
  quick glance + fast input. Why: simplest path to both. Trade-off: none.

- **Gemini free tier for the agent (Flash).** Why: genuinely free, no card,
  plenty for one user. Trade-off: Google may train on inputs, and there's no
  uptime guarantee. **Plan:** start free; switch sensitive modules (mood,
  health) to pay-as-you-go (~$1-4/mo, no training) when we build them.

- **Consumer subscriptions can't power the in-app agent.** Why: Claude/ChatGPT/
  Gemini subscriptions are for the chat apps, not callable by code. The API is
  separate. (The Max plan DOES power Claude Code for *building*, though.)

- **Supabase + RLS for the database.** Why: free tier, built-in login and
  security, runs the agent code and the scheduler all in one place. Trade-off:
  free project can pause after long inactivity (fine for daily use).

- **Single user, no multi-user features.** Why: it's just the owner; skipping
  accounts/roles/sharing removes huge complexity. Trade-off: a friend can't use
  it later without real work.

- **Standalone calendar in V1, Apple sync as a later dream.** Why: standalone is
  far faster to build. We add a hidden external_id field now so future sync is
  "connect the pipes," not a rebuild. Trade-off: V1 calendar is separate from
  Apple Calendar until sync is built.

- **V1 = tasks + events only.** Why: keep the first usable version small so the
  owner engages fast. Other types (meals, friend notes) wait for their modules.
  Trade-off: can't capture a meal/note in V1.

- **Tasks live on the same calendar as events.** Tasks with a due date or a
  scheduled time block show up on the week view; tasks can be dragged onto slots.

- **Claude Code as the build tool (on Max).** Why: it keeps the whole project in
  view, the direct fix for past "AI loses the plot / messy codebase" failures.

- **All guardrails on (CLAUDE.md).** Brain docs, file-size ceiling, one feature
  at a time, commit after each feature, start/end session ritual.

## Food V2 (in-place upgrade P0–P8) — amendments + honest statuses (2026-07-01)

AMENDMENTS (before → after → why):
- ⚠️ FINISH-TOGETHER → SEQUENTIAL — WARNING TO THE FUTURE, not a to-do. Before: the cookbook spec
  locked a "finish-together kanban scheduler" (critical path drives the finish, short steps delayed to
  land together). After: P7 ships a SEQUENTIAL start-now timeline + a DEP-READY scheduler (cookSchedule
  accepts deps, degrades to sequential). Why: the import parse emits steps as PLAIN STRINGS with ZERO
  parallelism/dependency data — computing "finish together" would FABRICATE start-times (the silent-
  wrong-output failure). The scheduler is built dep-ready; it lights up when a trustworthy dep source
  exists. DO NOT rebuild finish-together on inferred / LLM-guessed deps — "sequential" is a deliberate
  honest choice, not incomplete work to "fix."
- QUICK-ADD source (amends the finder lock): recent MEALS + favourited MEALS + favourited FOODS,
  meals-first — NEVER recent foods. Why: a ★-favourited food is deliberate/curated, unlike a random
  recent ingredient; more useful day-one on sparse history. (Single-food recents stayed removed.)
- RECIPE PAGE zero-scroll via COLLAPSE-BY-DEFAULT (steps→titles, macros compact) — long-form was V1-
  exempt; the amendment makes a recipe fit one page.
- INGREDIENT MATCHING → AI AUTO-MATCH: the P1 reranker's top pick (results[top3[0]]) replaces
  recipeMatch's comma-boundary rule (recipeMatch deleted). No new AI surface; deterministic fallback
  (reranker off/quota → flagged → import completes).
- LOGGER amendments: empty meal slots SHOWN with an invitation (not hidden); ledger rows are always-on
  P·C·F shorthand (dropped the 4-row cap / "+N more" / tap-expand — full breakdown moved to Edit);
  the DRINKS line is omitted until F10 (the dayLedger alcohol READ getter is retained, just not
  rendered); Week/Month is a 2×2 bar-chart grid (retired the avg-day arc + per-day list); the ±10%
  on-target band is surfaced in the full-screen Goals editor (was a popover); macro goals are optional
  (calories required).
- BRIDGE amendments: recipes.last_cooked_at → COMPUTE-ON-READ (lastCookedFor); the V1 all-or-nothing
  entry-then-stamp ordering + undo-restore-prior-stamp are gone — undo is a UNIFORM remove-entry.
  Cook-only ingredient swap stays DROPPED (log then edit).
- DRAFT DOOR (split): a GRID-tap on a draft → the EDITOR (finish it); a DEEP-LINK → the PAGE (which
  renders a draft ready-to-finish, not broken-empty).

HONEST STATUSES (recorded truthfully, not fake-greened):
- is_estimated: PRE-EXISTED live (boolean, not-null, default false) — an out-of-band add, NOT in
  db/28/29 and NO git history; discovered by the P0 live check. Feature-B reuses it.
- SCHEMA GATE CONTRAST: db/31 (recipes.is_favourite), db/34 (cook_session), db/35 (drop last_cooked_at)
  were PROPERLY gated (exact "checker approved" received before commit). db/33 (food_log_entries.
  entry_label) RAN WITHOUT the phrase reaching the builder — an UNRECORDED gate, recorded honestly here,
  not falsely marked approved.
- Estimate deterministic fallback (meal-estimate off → manual entry): DESIGNED (the panel is a manual-
  editable 4-number form; AI only pre-fills) but owner AI-off verification was DECLINED — designed, not
  owner-verified.
- Synthetic-only branches: recipeKind 'draft' (no real 0-ingredient recipe exists) and lastCookedFor's
  "stepless-meal-WITH-a-cook-entry → null" branch (no real instance — the one meal was never cooked)
  are proven on labelled synthetics only, not real data.
- P3 ENTRY-GATE: CLEARED on real cook history (re-run at P9) — computed lastCookedFor faithfully
  reproduces the stored stamp on every has-steps recipe; the dead recipes.last_cooked_at column dropped
  (db/35).
