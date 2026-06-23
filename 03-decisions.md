# LifeOS — Decisions

> I am the record of "what we chose and why," so we never re-argue settled
> things or contradict ourselves. LIVING doc — add to me, never silently
> reverse me. New decisions on top.

## Format
**[Decision]** — the choice. **Why:** the reason. **Trade-off:** what we gave up.

---

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
