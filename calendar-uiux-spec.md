# LifeOS — Calendar (desktop) UI/UX spec

> The full, locked behaviour + look for the desktop Calendar rebuild. Compiled
> from the owner's decisions across ten review batches. This is the build
> contract — nothing gets built until the owner signs off on this document.
> **Desktop only.** Mobile Calendar is a separate later spec.
> Slots into `07-ux-flows.md` §5 (Calendar), superseding the old description.

---

## 0. The shape of the work

- **Rebuild-and-converge, not re-skin.** Calendar is rebuilt on Today's
  component kit so the two screens become *one* engine. The intentional
  duplication created during the Today rebuild collapses: the old Calendar
  panels merge into Today's shared form, and the old shared drag hooks merge
  with Today's grid-interaction logic.
- **Built in small, separately-verified pieces** (mirrors the Today rebuild),
  each its own commit with a save point committed before it, each owner-verified
  on Mac before the next. Any schema change is flagged for the checker.
- **Carried over from Today without change:** tinted blocks, the shared
  create/edit form, the same kit + theme tokens (paper `#F6F5F1`, ink,
  terracotta `#C8643D`, Fraunces/Inter, the category palette), and the shared
  masthead + nav (already shipped).

---

## 1. Frame & layout

- **Full-width.** The week grid uses the whole window width (comfortable side
  padding); the shared header sits on top, unchanged.
- **The page never scrolls.** Only the **calendar body scrolls internally**.
  Everything else (header, nav, toolbar, day-header row, all-day band) is fixed.
- Two view modes, chosen by a toolbar toggle: **Week** (the working sheet) and
  **Month** (the light zoom-out). **No day view** — Today already is the single
  day in detail.

---

## 2. Time navigation

> **AMENDED 2026-07-14 (Today/Planning desktop bundle).** Added — everything below
> still stands:
> - **← / → step the screen from the keyboard**: whole weeks in Week mode, whole
>   months in Month mode. They call the SAME step the ‹ › buttons call, so there is
>   only ever one way the calendar moves.
> - The keys **stand down** while you are typing, while the **event panel** is open,
>   while the **tray drawer** is open, and when a modifier key is held. The single
>   definition of "the user is typing" lives in `kit/keyNav.js` and is shared with
>   Today — do not write a second one.
> - **A step travels in a direction:** the month grid now slides the way you're going
>   (the week grid already did). A **jump** — "Back to this month", or arriving from
>   Week — keeps its plain settle-fade. Eased, no bounce; reduced-motion respected.
> - **The side frame is the shared `--frame` token** (theme.css, 24px), the same one
>   the masthead, Today and Planning hang off — so the toolbar, the month grid and the
>   masthead all line up. It is ONE number: change it there and the whole edition
>   re-frames.

- **Arrows only** — a fixed prev/next stepper (the same paired cluster as Today,
  so the arrows never shift) plus a quiet **"Back to this week"** that appears
  whenever you've navigated away. **No date picker.**
- **The home view is today-anchored (rolling).** On landing, **today is the
  first column** and the next six days follow (7 columns total). E.g. today =
  Wed Jun 24 → columns Wed 24 → Tue 30.
- **Arrowing off home snaps to standard Monday–Sunday weeks.** From the home
  view:
  - **Next →** the next Monday-aligned week (the Monday *after* this week's
    Monday). Today Wed 24 → Next → **Mon Jun 29 – Sun Jul 5**.
  - **Prev →** the current calendar week → **Mon Jun 22 – Sun Jun 28**.
  - Further arrows step whole Mon–Sun weeks.
  - **"Back to this week"** always returns to the rolling today-anchored home.

---

## 3. The week grid

- **Window: full 24 hours, internal scroll**, **defaulting with 07:00 at the
  top** — scroll up for the small hours. No "expand to 24h" control (it's always
  the full day).
- **24-hour time everywhere** time text appears (gutter, form, drag tooltip):
  gutter reads `07, 08 … 23, 00`. Matches the masthead clock.
- **Today's column** carries a terracotta date circle in its header and the
  now-line — but **no column background tint** (corrected 2026-07-03; the faint
  today-column wash was removed, and the weekend wash raised to 6%, so today is
  read from its circle + now-line, not a tint). **Now-line: today's column only**
  — a terracotta line + dot at the current time, which **ticks** as time passes
  (not on any other column).
- **The past goes quiet:** finished blocks grey down (like a done task), past
  hours dim subtly; the current and future stay full ink.

---

## 4. Blocks (events + scheduled tasks)

- **Tinted blocks** — the category colour as a low-opacity fill + a coloured
  left bar (Apple-Calendar style, kept soft so it still reads as paper).
  *(Corrected 2026-07-03: this filled look is now the EVENT block specifically; a
  TASK renders HOLLOW — no fill, a hairline category outline on top/right/bottom, a
  single dashed category left edge, and a small neutral to-do ring leading its
  title. Both come from the one shared block.)*
- **Tinted by the item's OWN category**, including sub-categories — a task filed
  deep uses its **shaded branch colour**, not the parent's.
- **Timed blocks show their start–end time** (corrected 2026-07-03; was "title only — blocks never
  show a time"). Today always showed times; the week now matches, via the one shared `timeRange`
  helper. The time only appears when the block is tall enough (the shared short-block rule), so a
  very short block still falls back to title-only — which keeps the old "tiny block can't fit its
  text" problem solved. All-day bars carry no time.
- **Tasks vs events on the grid:**
  - A **scheduled task** behaves like on Today — its block can be **ticked done
    right on the grid** (greys + strikethrough till midnight, then rolls off);
    undo always available.
  - An **event never gets a "done" tick** — once past it just goes quiet
    (greyed), like Today.

---

## 5. Overlaps

- **Even split.** Everything that clashes in a column shares the width equally
  (2, 3, 4… each get thinner). Honest and simple.

---

## 6. All-day & multi-day band

- A band sits **above the timed grid** for all-day items; **multi-day events
  stretch as one bar** across the days they cover.
- **Auto-height:** the band **grows** with the number of all-day rows and
  **collapses to nothing when there's nothing in view** (the grid height shifts
  accordingly).
- **Fully interactive:** **click an empty band cell to create** an all-day item
  (form opens preset to all-day), **drag a bar across days** to set its span, and
  **drag to move** it. The form's all-day toggle is the other way in.
- These same bars **carry into Month** as full-width strips.
- ⚠️ **Flag for the checker:** all-day / multi-day may need a small **additive
  schema change** (e.g. an `all_day` flag; multi-day is just an end date on a
  later day). To confirm against the live `events` table and, if needed, build as
  its own flagged piece.

---

## 7. Creating something

- **On the grid:** **click an empty slot → a default 1-hour block**; **click-drag
  → draw the exact span**. Either way the **shared form opens**, with a
  **task/event toggle defaulting to event**. Create / drag / resize all **snap to
  15 minutes**.
- **"+ Add event" button (toolbar):** opens a **blank form** (default event),
  **nothing prefilled** — you set day and time yourself. The toggle can flip it
  to a task.
- **Drag an undated task from the tray onto a slot → a 1-hour block** at the drop
  point (then freely resizable).

---

## 8. Moving, resizing, re-daying

- **Full direct manipulation:** drag a block to **move**, drag its top/bottom
  edge to **resize**, drag it into another day's column to **re-day** it. All
  **snap to 15 minutes**.
- **Re-day keeps the time:** horizontal drag = change **day only** (Thu 14:00 →
  Sat 14:00); vertical = change **time**; diagonal = both. A pure sideways drag
  never nudges the clock.
- **Drag a block OFF the grid to unschedule it** → it drops back into the **tray
  as a loose task.** **Only tasks can be unscheduled this way** — an **event
  dragged off snaps back** (an event must have a time). *(Corrected 2026-07-03:
  this now works — dragging a TASK off the grid or onto the open tray unschedules
  it and returns it to the tray (filed under its due week if that's a different
  week); an EVENT snaps back. The drag-END bug that previously blocked this in
  practice is fixed — a release is now heard window-wide, so a drag ends wherever
  the cursor is.)*
- **Drag feedback: a faint ghost** of where the block will land **+ a live time
  label** (`14:15–15:15`), updating on the 15-min snap.
- **Paper-true lift while dragging:** the grabbed block **scales up a hair + gets
  a crisp hairline outline** — "picked up" without a drop-shadow (honours the
  ink-on-paper rule; no shadows/cards).

---

## 9. The unscheduled tray

- **Opened by an explicit toolbar button** (no edge handle). It's a **right-side
  drawer**.
- **Behaviour = push:** opening it **squeezes the week so all 7 columns stay
  visible** (narrower); closing restores full width.
- **Contents:** **undated tasks + this week's tasks that aren't yet
  time-blocked**, ordered **due-soonest**.
- **It's a working mini-list, not just a source.** Each row shows **category
  dot + tag · title · due date**. The tray has a **"+ add"** (drops a new loose
  task straight in) and you can **tick a task complete** from the tray — as well
  as **drag it onto the grid** to schedule.
- **After you drop a task on the grid:** it's now scheduled, so it **leaves the
  tray**, and **the tray stays open** for the next placement.

---

## 10. The shared form (create + edit, same form)

- **One form with a task/event toggle on top;** fields swap by type.
  - **Event:** Title · Category · **All-day toggle** · Start/End (24h) ·
    Location · **Repeats** (live — see below) · Notes · Delete.
  - **Task:** Title · Category · Status (3-state) · Day/Time · Priority · Notes ·
    Delete.
- **Opening to edit: one click on a block opens the full form** — no preview
  step (consistent with Today).
- **Selected state:** while a block's form is open, **the block gets a quiet
  outline** so you can see what you're editing; it clears on close.
- **Repeats is LIVE** *(corrected 2026-07-03; T10 shipped — was a disabled
  placeholder)*. A single **Repeats** dropdown (Does not repeat / Daily / Weekly /
  Monthly / Yearly) on BOTH the event and task form; choosing a repeat reveals a
  compact detail line (a weekday chooser for Weekly, and the end option Never /
  After N / On a date for all). Saving a repeat generates real occurrences. Editing
  or deleting one occurrence asks the scope — **This one / This and following /
  All** (a calm hairline prompt); a repeat occurrence carries a small neutral loop
  (↻) top-right on its block. Full contract in `03-decisions.md`.

---

## 11. Completing tasks

- Tick a scheduled task done **anywhere it appears** (grid block, the tray, the
  form). It **greys (a greyed version of its category colour) + strikethrough**
  and **stays till midnight**, then rolls off. **Undo always available.**
- Events are never completed — they just pass into the quiet/greyed past.

---

## 12. Delete & undo

- **Toast-undo, no confirm dialogs.** Deleting anything **archives** it (delete =
  archive, per the existing Archive feature) and shows an **"Archived · Undo"**
  toast; Undo reverses it.
- **The one exception: repeating events ask "this one / all?"** — reserved for
  when recurrence exists (**T10**); until then no recurring events exist, so the
  branch is inactive.

---

## 13. Month view

- **Standard calendar month:** the current month 1st → last on a **6-row grid**;
  **adjacent-month days fill the edges, greyed**; **today marked**; arrows step
  **whole months**. **Fixed to one screen — no scroll.**
- **Each day cell shows events AND tasks** (tasks marked), so Month doubles as a
  **"how loaded am I"** view. Capped at **~3 items per day**, then a **"+N
  more."** Multi-day events render as **full-width strips**.
- **Month never opens a form. Clicks are navigational:**
  - **Click a day's empty space → jump into that week** (rolling/Mon-week per the
    nav rules), with that day marked.
  - **Click an item → jump to that week and select/scroll to that item.**
  - **Click "+N more" → jump to that week** (you see the full day there).

---

## 14. Motion (rich, but paper-true)

- **Week ↔ Month zooms; arrowing weeks slides horizontally** (next = slide left);
  **new blocks fade in**; **completing a task settles to grey**; **the now-line
  ticks**; **the tray eases in/out** with the push.
- **No shadows or bounce.** The dragged-block lift is the **paper-true** treatment
  (scale + hairline outline), not a drop-shadow.
- **Reduced-motion respected** — all of the above is opt-out.

---

## 15. Empty & loading states

- **Empty = blank, no copy.** An empty week shows just the grid + now-line; an
  empty tray and empty month show nothing.
- **Loading:** show the **grid + gutter immediately**, **blocks fade in** when
  the data arrives. **No spinner.**

---

## 16. Convergence & build notes

**What merges (the "converge" half of the rebuild):**
- The old Calendar create/edit **panels → the one shared form** (the same form
  Today uses).
- Today's `useTodayGrid` **+** the old shared `useEventDrag` / `useScheduleDrag`
  **→ one grid-interaction engine** used by both screens.
- The week reads stay on the existing `useWeekData` (already archive-filtered).
- **Retire now-duplicated old code conservatively** — only what's provably
  unused, in separate commits, verified.

**Out of scope for this rebuild (their own later pieces):**
- ~~**Recurring events (T10)**~~ — *shipped 2026-07-03 (full recurrence + This one /
  This and following / All on edit AND delete; events + tasks). See above +
  `03-decisions.md`.*
- **Mobile Calendar** — a separate spec.

**Proposed build sequence (each its own small, verified piece):**
1. **C1 — Week grid display (read-only).** The rolling/Mon-week nav, tinted
   title-only blocks, today column + ticking now-line, past-greying, 24h gutter,
   full-width, internal scroll. (No create/drag yet.)
2. **C2 — Grid interactions.** Click/drag create, move, resize, re-day, 15-min
   snap, even-split overlap, ghost + live time label, paper-true lift.
3. **C3 — The shared form.** Converge panels → one form; one-click edit; selected
   outline; delete → archive toast.
4. **C4 — Drag-logic convergence.** Merge the duplicated hooks; retire dead code.
5. **C5 — The tray.** Button, push, working mini-list (+ add, complete, drag to
   schedule, drag-off to unschedule), tray-stays-open after a drop.
6. **C6 — All-day band + Month.** Auto-height interactive band + multi-day spans;
   the standard-month view with events + tasks, "+N more," navigational clicks,
   strips. *(Flag any all-day/multi-day schema need for the checker first.)*

---

## 17. Defaults at a glance

| Thing | Default |
|---|---|
| Views | Week (lead) + Month; no day view |
| Landing week | Today-anchored rolling 7 days (today = column 1) |
| Off-home arrows | Standard Monday–Sunday weeks |
| Window | Full 24h, internal scroll, 07:00 at top |
| Time format | 24h everywhere; blocks show **no** time |
| Block | Start–end time + title, by its own (sub-)category. EVENT = tinted fill + solid left bar; TASK = hollow (outline) + dashed left bar + neutral to-do ring; a repeat occurrence adds a small neutral loop (↻) top-right (corrected 2026-07-03) |
| Now-line | Today's column only, ticking |
| Past | Greyed/dimmed |
| Grid click | 1-hour block, event (toggle to task) |
| Grid drag | Exact span, 15-min snap |
| Tray task → grid | 1-hour block |
| "+ Add event" | Blank form, default event, nothing prefilled |
| Overlap | Even split |
| All-day band | Auto-height; collapses when empty; fully interactive |
| Re-day drag | Keeps time (horizontal = day, vertical = time) |
| Drag off grid | Tasks → tray (unschedule); events → snap back (corrected 2026-07-03: now working — drag-END bug fixed) |
| Drag look | Paper-true lift (scale + hairline, no shadow) |
| Open to edit | One click → full form, quiet selected outline |
| Repeat field | LIVE (corrected 2026-07-03): Repeats dropdown → occurrences; This one/following/All on edit+delete; loop marker on occurrences |
| Delete | Archive + "Undo" toast; recurring → "this one/all?" (T10) |
| Tray | Right drawer, push, button-opened; working mini-list |
| After a drop | Task leaves tray, tray stays open |
| Month cell | Events + tasks (tasks marked), ~3 then "+N more" |
| Month clicks | Navigational only (never opens a form) |
| Empty | Blank, no copy |
| Loading | Grid first, blocks fade in, no spinner |
| Motion | Rich + paper-true; reduced-motion respected |

---

## 18. Flags to resolve before / during build

1. **All-day / multi-day schema** — confirm the live `events` table supports an
   all-day flag + multi-day end; if not, an additive change flagged for the
   checker (its own piece).
2. **24h gutter** — the earlier mockup used a 12-hour gutop (`7 AM`); the spec
   locks **24h** (`07`). The build follows the spec.
