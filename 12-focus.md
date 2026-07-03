# LifeOS — Focus module (Time Tracker) — brain doc (12)

> **STATUS: SHIPPED 2026-07-02 — pieces 1–8, owner-verified.** This is the build
> contract, now the module's reference. What actually shipped, the amendments, and the
> known gaps are recorded in `03-decisions.md` (Focus, 2026-07-02) and `04-handoff-log.md`
> (2026-07-02). The DEFERRED Marty focus-control track is not built. Below is the LOCKED
> SPEC v3 as-signed-off.
>
> **Corrected 2026-07-02 — OVERVIEW REDESIGN (src-only):** the Overview screen was
> restructured after ship — the top-strip range switcher is retired, the stacked-bar chart
> now lives INSIDE the overview (two columns: dial left, chart-over-ledger right), the dial
> puts MIDNIGHT at the BOTTOM with hour markers and no goal ring, and the week strip carries
> H:MM-in-ring + a day filter. The §L/§6/§9 composition below is SUPERSEDED for the overview;
> the full redesign + trade-offs are in `03-decisions.md` (Focus overview redesign, 2026-07-02).
> New files: `FocusChart`, `FocusRangeControls`, `useFocusData`; `FocusOverview` orchestrates
> the two columns; `RangeView` is now only the "expand" target.

---

## (original) LifeOS — Focus module (Time Tracker) — LOCKED SPEC v3

> The full, locked behaviour + look, compiled from the six foundation sets, the
> ten-batch deep drill, AND the five-batch layout-refinement pass. This is the
> **build contract** — nothing is built until the owner signs off. Becomes brain
> doc `12-focus.md` at close. **Desktop-first; the 13" MacBook full-width screen is
> the zero-scroll judgment surface;** mobile is a later pass.

---

## 0. Shape of the work

- **New top-level pillar**, inserted **after Today, before Calendar**:
  `TODAY · FOCUS · CALENDAR · HEALTH · FOOD · SETTINGS`. Additive nav swap only.
- **A WRITE module** → new table → **schema change, checker-gated** (piece 0). Its
  whole point is **integration** into other screens.
- **Additive-only, spine-protected.** No FK *into* the tasks/events/categories
  spine; the task link is a **soft uuid reference**, not an enforced FK.
- **THREE surfaces:** **Overview** (the dial) → **Setup** (choose the session) →
  **In-focus** (the split-flap). You cross overview ↔ in-focus by starting/stopping.
- **Visual direction (locked by mock review):** Overview = Mock 4 dial; In-focus =
  Mock 1A split-flap (now displays all three timer modes). House style throughout
  (paper `#F6F5F1`, ink `#1C1916`, muted `#5C564C`, terracotta `#C8643D` sparingly,
  Fraunces heroes, Inter UI, hairlines, no boxes/shadows).
- **Design laws:** the **overview is strict zero-scroll** (owner's call); calm by
  default; the house "calm wins if it can't honestly fit" stays only as a last-ditch
  escape.

---

## L. Layout & fit — the 13" zero-scroll, full-width contract (refinement pass)

**Governing law:** the **Overview and the Range view are strict zero-scroll on a 13"
MacBook, full-width.** In-focus, Setup, and the save card are zero-scroll too. Only
the **full ledger page** (via "see all") and the task-filtered ledger may scroll —
they're history/inventory, not the overview.

**Overview composition (full-width):**
- **LEFT — a MEDIUM dial** (hero but sized so the ledger + foot band all fit):
  - Category-own-colour focus arcs + ghost/hatched rest arcs; a faint now-tick; arcs
    **sweep in clockwise** on open.
  - **Centre:** today's total as **progress "5h / 6h"** (total / daily goal, Fraunces
    hero) with a **rim tick at the goal** (ring goes terracotta when met); two small
    lines beneath — **trend** ("+1h vs 6-wk avg") and **rest** ("· 25m rest"). No goal
    → just the total + a muted "set a target."
- **RIGHT COLUMN — the session ledger** (NO separate legend; arcs + row dots carry
  category):
  - **Newest first; one tight line per row:** time · category-dot · task · duration ·
    ★rating · note-glyph.
  - **Fills the available height** (never a long internal scroll); **"see all" → a
    dedicated full ledger page** (the flat, filterable session history; may scroll).
  - **Tap a category** (arc or row) → **dims the other dial arcs** + filters the
    ledger; a clear "clear." Per-category totals surface here on filter.
- **FOOT BAND (full-width) — the week mini-ring strip** (+ the weekly-target marker).
- **Range switcher — a Gym-style segmented control, TOP-RIGHT** (Today/Week/Month/90).

**Range view (Week/Month/90):** **full-width stacked bars per day**, category-
segmented, filling the sheet, with a **foot band** carrying the trend + period totals
— mirrors the overview's zero-scroll.

**In-focus (split-flap):** Mock 1A as-is **+ a slim progress line** under the flap
(count-down / interval / overtime). Interval/overtime reads **two ways** — the slim
line labels it AND **the flap shifts register** (break = muted, overtime = terracotta).
Subject above, pause/stop below.

**Setup screen:** a **centred column** — subject · mode toggle (up / down / intervals)
· duration/interval fields · big **Start** — fits zero-scroll. Start → the focal
dial-gives-way-to-timer zoom.

**Save card:** a small **centred pop-up over the flap** (a global overlay).

**Header marker:** a pulsing terracotta dot + live elapsed, **pinned far-right of the
nav band so the centred nav never shifts**; tap → the small popover (elapsed · Stop ·
open).

---

## 1. Data model (recon MUST settle the schema + the interval shape)

```
focus_sessions
  id              uuid pk
  user_id         uuid    (RLS owner-only: auth.uid() = user_id)
  started_at      timestamptz
  ended_at        timestamptz  NULL   -- NULL = a live/running session
  mode            text    -- 'count_up' | 'count_down' | 'intervals'
  target_seconds  int  NULL          -- count_down length / interval focus length
  break_seconds   int  NULL          -- intervals only
  task_id         uuid    NULL        -- SOFT reference, NO FK into the spine
  task_title_snapshot   text NULL     -- captured at log time (delete-proof)
  category_id     uuid    NULL        -- soft reference
  category_snapshot     jsonb NULL    -- id + name + colour at log time
  source          text    -- 'timer' | 'manual'
  rating          smallint NULL       -- 1..5 session-quality stars (5 great)
  note            text    NULL
  created_at / updated_at
```

- **Intervals + breaks:** an interval session is focus + break *segments*, not one
  block. *(Corrected 2026-07-02: SETTLED — it shipped as a `segments jsonb` COLUMN on
  `focus_sessions` (confirmed live), NOT a child `focus_segments` table; each block is
  `{ kind:'focus'|'break', start, end }`; count_up/count_down store `segments: []` and the
  single focus block is `started_at → ended_at`.)* **Only focus segments count** toward
  logged time + the dial; **breaks render as distinct rest arcs**, and today's "focused"
  total is focus-only.
- **Duration is compute-on-read** (never stored). **A running session = `ended_at`
  NULL**; the dial excludes running rows; the **header marker = "a running row
  exists."** Survives reload.
- **Snapshots** make each session self-sufficient (ledger reads right after the task
  is deleted). Tasks stay freely deletable; spine untouched.
- **Calc layer (pure, compute-on-read, verified vs REAL data):** day arcs (focus +
  rest), day ledger, day focus-total, category totals, rest total, week ring-strip,
  week vs trailing-6-wk avg (N-weeks-so-far), daily/weekly goal progress,
  **per-task all-time total** (feeds the row tag + form section).

---

## 2. Start flow

- **▶ lives in the tap-to-edit task form only** (rows stay clean). The form opens
  from Today / Calendar / Planning, so "start from anywhere" holds via the form's ▶.
- **▶ (or the overview's "Start a session") → the Setup screen**, prefilled with the
  task + its category snapshot when arriving via ▶.
- **If a session is already running:** ▶ is **blocked with a gentle nudge** ("a
  session's already running — stop it first"). No silent switching.

## 3. Setup screen (surface 2)

- A **dedicated "set up your session" screen**: the subject (task / category-only /
  no-label), a **mode toggle** — count-up (free), count-down (set a length),
  intervals (focus + break) — and the relevant **duration / interval fields**, then
  **Start**.
- **Remembers your last mode + durations** for fast repeats.
- Start → the focal **dial-gives-way-to-timer** transition → In-focus.

## 4. In-focus (surface 3 — the split-flap)

- **Split-flap numerals**, displaying whichever mode is running:
  - **count-up:** free, no end.
  - **count-down:** counts down; at zero **gently chimes then keeps counting UP into
    overtime** — you stop when ready (logged time is the true elapsed).
  - **intervals:** focus interval → break interval (a visibly different break state)
    → repeat. Breaks are logged (as rest), not counted as focus.
    *(Corrected 2026-07-02 — intervals are now HAND-BOUNDED, no auto-switch: the flap counts UP
    to the target and HOLDS there with a muted "+M:SS" overage (count-down's countdown is
    unchanged; intervals count up); a chime fires once at the target but NOTHING switches; the
    owner presses a terracotta "Enter break / End break" control to change phase. Lengths are
    OPTIONAL — a blank phase is a free hand-run stopwatch (no target/hold/over/chime). The
    overage logs as plain time of that phase's kind (a 27:00 focus phase = one 27-min focus
    segment, real elapsed). Phase boundaries are persisted to the running row AS phases end, so
    a mid-session reload restores the TRUE hand-set split — `reconstructIntervals` is now only
    the fallback for legacy/lengthless rows.)*
- **Controls: pause/resume + stop only.** To change task you stop and start fresh,
  so **every session is exactly one subject start-to-stop.**
  *(Corrected 2026-07-02: intervals add a third control — the terracotta "Enter break / End
  break" button — to hand-switch focus↔break within the one session; the "one subject
  start-to-stop" rule is unchanged.)*
- **Leave mid-session → keeps running + the header live-marker** on every screen.

---

## 5. Stop → the save card

- A **mini pop-up card centred over the split-flap** — and a **global overlay** (can
  appear over any screen when you Stop from the header popover). Reuses the app's
  popover primitive.
- Fields: **confirm / adjust the duration** (handles forgot-to-stop) · a **1–5 star
  session-quality rating** (5 great, 1 poor) · a **"mark this task done?" toggle**
  (only when task-linked) · **free-form notes**. **Save** or **Discard** (discard
  keeps a fat-fingered start out of the ledger). Rating + notes always optional.
- **The done toggle completes the task via the EXISTING complete path** (the status
  pill's update → the DB trigger stamps `completed_at`) — byte-identical to
  completing anywhere else, user-initiated. No new spine writer.

---

## 6. Overview — the dial (surface 1)

- **The dial is TODAY:** a 24-hour ring; saved **focus** sessions as soft
  **category-own-colour arcs** (matches Calendar/Today); **rest** as quiet
  **ghost/hatched** arcs; a **faint now-tick** on the rim (no hand); the **focus
  total** in the centre (rest shown as a separate secondary stat).
  *(Corrected 2026-07-02: the ring now puts **MIDNIGHT at the BOTTOM** (noon top, 06 left,
  18 right) via the single time→position offset — arcs + now-tick rotate together; it carries
  **eight 3-hour hour ticks** with only the four cardinals labelled (00/06/12/18); the centre
  is two lines — big total + a muted "of 6h · 35m rest".)*
- **Arcs sweep in clockwise, drawn like a pen** (staggered) on open.
- **Running session is NOT on the dial** (it lives in the in-focus view); first-ever
  / empty day = a **faint empty ring + a quiet invite**.
- **Daily goal notch** on the rim, terracotta when met; unmet = simply not filled
  (never red, never a nag). No-target = a muted "set a target" in its place.
  *(Corrected 2026-07-02: the goal ring/notch was DROPPED from the dial — the daily goal now
  lives ONLY in the centre text ("of 6h", no-target → "set a target"). Daily-goal progress +
  the terracotta "met" cue moved to the week strip's day-rings.)*

## 7. The ledger (beside the dial)

- **Newest first.** Each row: time range · task · category · duration · **star
  rating** (compact) · a **note glyph you tap** to reveal the note.
- **Capped for strict zero-scroll**, with a **"see all"** to the full list (never a
  long internal scroll on the sheet).
- **Tap a category** (legend row or arc) → filters the ledger to that category +
  highlights its arc; tap again to release.

## 8. Targets & trend

- **Daily target** = the dial notch. **Weekly target** = the week strip / range
  view. Both set via the **existing goals-editor popover**.
- **Lead trend** = this week vs the **trailing 6-week average**, shown as a **number
  + delta** ("8h this week · +1h vs your 6-wk avg"), always labelled **"N weeks so
  far"** until the baseline is full (weeks 0–1: just this week's total + "building
  your baseline").

## 9. Range view

- **Switcher: Today / Week / Month / 90 days** (matches Gym's Model C).
- **Week/Month/90 primary visual = stacked bars per day, segmented by category**
  (per-day totals + the category mix shifting over time in one chart). The overview's
  foot keeps the **mini-ring week strip** for the glance.

---

## 10. Task ↔ focus (the reverse view)

- **Row:** a tiny **"· 2h 15m" total tag** when a task has focus (rows without focus
  stay clean). *Additive read on the shared `TodayTaskRow`; needs the per-task total
  getter; appears wherever the row renders — verify vs snapshots.*
- **Form:** a **"Focus" section** = **all-time total** + a **session list** (date ·
  duration · stars · note) + a **"see all"** link to the task-filtered Focus view.
- **Full control in the section:** edit + delete a session inline (with undo) and
  **▶ to start a new one** (→ prefilled setup).
- **No subtree roll-up** — each task shows only its own focus.

## 11. Sessions — the record & fixing it

- Records: start, end, duration (computed), subject, **1–5 star rating**, optional
  **note**, mode, source. **Manual back-fill: yes, with start + end times** (places
  on the dial; snapshots subject; `source 'manual'`). **Edit any field + delete,
  with undo** (reuses the app's undo toast).

## 12. Empty / sparse / missing states

- First use → faint empty ring + invite. Mid-session → dial stays empty (live count
  only in-focus; marker still signals a run). Sparse baseline → trend labelled "N
  weeks so far"; no target → muted "set a target".

---

## 13. Integrations (the whole point)

1. **Header live-marker (all screens):** a pulsing terracotta dot + live elapsed, at
   the **right edge of the nav band**; tap → a **small popover (elapsed · Stop ·
   open)**. Stop → the global save-card overlay. *Additive to `EditionHeader`.*
2. **▶ start-focus from the task form** (surface reach via the shared form).
3. **Today:** a quiet **"focused today · 3h 40m"** line (a glance, no second dial).
4. **Calendar:** logged focus as a **distinct "actual time" layer beside planned
   blocks.** ⚠️ Heaviest, highest calm-risk → **LAST**; own **art-direction pass**
   first + a **show/hide toggle**. *Modifies Calendar V2 block-render; snapshot-guarded.*
5. **Morning brief:** a calm line on yesterday's focus (rides with the core).
6. **Marty control** (start/stop/report by chat): **deferred follow-on track.**

## 14. Motion & density

- Arcs **draw in** (pen-sweep, staggered). Overview → in-focus = the **focal
  dial-gives-way-to-timer** zoom at Start. Premium-editorial easing; **reduced-motion
  respected** (degrade to instant/crossfade).
- **Overview = strict zero-scroll** (capped ledger + see-all); range view may scroll.

## 15. Amendments to prior locks (called out openly)

- **Pomodoro REINSTATED** as the "intervals" mode (reverses the Set-3 "stopwatch only,
  pomodoro dropped"). Adds count-down too → three modes. *(Corrected 2026-07-02: the
  "intervals" mode is now HAND-BOUNDED — no auto-advance; see §4 + `03-decisions.md` "Focus
  INTERVALS hand-bounded, 2026-07-02". It's still classic Pomodoro focus/break, but the owner
  presses to switch, and the lengths are optional.)*
- **Start flow via a Setup screen** (reverses the earlier "▶ starts in place, stays
  on page").
- **deep/shallow → a 1–5 star quality rating.**
- **Save card gains a "mark task done?"** — user-initiated, via the existing complete
  path (consistent with "status = offer only, never automatic").
- **Delete = snapshot** (spine untouched; block-delete/force-archive parked).
- **Sparse trend = disclose ("N weeks so far"), not omit.**

---

## 16. Build order — CONSOLIDATED (owner's call: fewer, bigger test rounds; max 8)

> Re-planned to 8 pieces, each a single test-once unit. Two safety lines held
> regardless: the **schema stays its own checker-gated commit** (never merged into
> src), and the **Calendar actual-layer stays isolated** (it modifies a locked,
> verified module — the highest regression risk). Each piece still commits a save
> point before it and is owner-verified before the next; there are just fewer of them.

- **RECON FIRST, then STOP** — plan + file layout + the exact schema verdict
  (table(s) + interval shape); wait for go.

1. **Foundation — schema + calc** (two commits, one verify round): the checker-gated
   `focus_sessions` (+ segments) schema commit, then the pure calc-layer commit (all
   getters — day arcs, ledger, totals, week, 6-wk trend, per-task total, goal
   progress). *Verify:* schema live + confirmed; getters output correct vs REAL
   seeded data.
2. **Record a session (the whole write loop)** — scaffold + nav insert; the Setup
   screen (3 modes, remembers last); the in-focus split-flap (3 modes, slim line, flap
   register); Stop → the save card (duration + stars + done toggle + notes); wired end
   to end for one session. *Verify:* each mode runs; save → row lands → reload
   persists → edit → delete+undo; forced Wi-Fi failure reverts.
3. **The Overview (all read, strict zero-scroll)** — medium dial (arcs, now-tick,
   sweep-in, centre 5h/6h + trend + rest) + height-filling ledger (newest-first,
   tap-filter, "see all" → full ledger page) + week foot strip + daily/weekly targets
   (goals popover) + Today/Week/Month/90 switcher + stacked-bar range view + empty/
   sparse states. *Verify:* strict zero-scroll on the 13"; every state; switcher;
   filter.
4. **Task ↔ focus + manual back-fill** — the task form's Focus section (all-time total
   + session list + see-all + inline edit/delete) + the per-task row total tag +
   manual add-past-session (start+end). *Verify:* back-fill paints on the dial; task
   form + row tag correct; task-bearing screens (Today/Planning) unchanged (snapshot).
5. **The global running layer** — header marker (far-right, no nav shift) + popover
   (elapsed / Stop / open) + the global save-card overlay + block-if-running +
   keeps-running-on-navigate + the **▶ start-from-task-form** entry → Setup. *Verify:*
   start from ▶, wander screens, marker persists, Stop from popover → save card over
   any screen; header byte-for-byte otherwise.
6. **Today line + brief line** — the quiet "focused today" line on Today + the brief
   mention (own `supabase/` track for the brief; re-pin `verify_jwt=false`). *Verify:*
   Today line; brief via the test trigger.
7. **Calendar actual-layer (ISOLATED)** — art-direction pass FIRST, then the distinct
   planned-vs-actual layer + show/hide toggle. *Verify:* focus renders distinctly;
   toggle works; ALL existing Calendar behaviour byte-for-byte (snapshot).
8. **Polish** — strict zero-scroll honesty pass on the owner's screen, accent-sparing,
   dead-code sweep. (Light; fold into 7 if you'd rather land on 7 pieces.)

- **DEFERRED track:** Marty focus control.

## 17. Verify (owner, Mac + iPhone)

- **Writes:** verify the ROW by `updated_at`; reload to prove persistence; running =
  `ended_at` NULL, finalised on save; forced Wi-Fi failure on save must revert +
  toast; done-toggle stamps `completed_at` via the trigger.
- **Correctly-absent:** empty dial, omitted-then-labelled trend, unmet notch, running
  session NOT on the dial, clean rows on focus-less tasks — look on purpose.
- **Integrations:** each verified twice — new behaviour works AND the touched screen
  (header / Today / Calendar / every task row + form) is byte-for-byte its snapshot.
- **Design law:** strict zero-scroll on the owner's actual screen.
