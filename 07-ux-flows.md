# LifeOS — UX Flows

> I am "how it WORKS" — the flows, defaults, and rules for the core V1
> experience. Not visuals (see 06-design.md for the look). Build chats follow
> me for behaviour. LIVING doc — if a flow changes, change me and say why.

> **Status — Phase 7 behaviour reference, NOT locked (added 2026-06-22).**
> This doc is the agreed *starting* description of how the core experience
> should work, and it is the behaviour reference we hold up while redesigning.
> But it is **open, not settled**: as Phase 7 redesigns the app screen by
> screen, **every flow here is up for relitigation** — the owner art-directs,
> and any flow can be reopened, changed, or dropped on its screen's turn. When
> a flow does change, update it here and say why (per the rule above).
>
> Two honest mismatches to keep in mind while reading: (1) §6 splits the
> proactive layer into a calm 7am brief **plus** a separate nudge layer — this
> is the *intended* future shape and differs from what Phase 6 actually shipped
> (one bundled 7am brief that already folds in the staleness nudge + gap offer);
> the split is recorded as open intent, not built yet. (2) §3's "tasks today /
> next 7 days" home model is the agreed direction but is a later Phase-7 piece,
> not the current built Today / This Week / Someday view.

## The one principle behind every flow

Design around how the owner actually lives, not around the database. The owner
thinks in tables by instinct — so the UX must never make them "create a
category, then create a task, then assign it." You say a thing in the loosest
form you've got; the data follows quietly behind. **Capture must cost less than
the thought itself.**

And the real point of the product is the **proactive layer** (the brief + the
nudges), not the task list. Everything below is the foundation; the brief and
nudges are the payoff.

---

## A note on tasks vs events (this shapes everything)

- A **task** is something *you do*. It has a state (not started → in progress →
  done), can be loose or scheduled, and gets checked off. "Done" means something.
- An **event** is something *that happens and you attend*. It has a start/end.
  It is never "completed" — the clock passing moves it into the past on its own.

Tasks have states you set; events have a timeline that moves them for you.

---

## 1. Capture — catch a thought for less than it costs to think it

Three entry points. Default for anything caught with no extras: **Inbox, no
day, no priority, no due date, status = not started.** A loose thought, caught
and safe. Every capture confirms what it did and where.

**Marty (Telegram) — text or voice note.**
- You send whatever context you've got (typed or hold-to-talk voice note).
- Marty replies with: the **type** (task/event), **where** it landed (Inbox or a
  category), and **any time he set** — in plain words.
- He **reads times** and tells you what he understood ("set Thursday 2pm — reply
  'no' if wrong"), so a misread is one reply to fix. He never interrogates you on
  capture; he logs instantly with the defaults and confirms.
- You can reply to **edit, reschedule, or delete** — that reply loop is part of
  capture, so you needn't open the app.

**Mobile — the centre plus.**
- Tap plus → the name line is focused with **Task** pre-selected → type → save to
  Inbox. Two taps, zero decisions, for the common case.
- Flip to **Event** only when needed — and *then* it asks for a day (an event
  needs a date). "Other" is reserved/empty in V1 (space for later modules).
- Category / day / time are all optional on a task.

**Desktop — two honest modes.**
- *Schedule it:* click a time block on Today or the calendar (see Calendar flow
  for sizing + the task/event toggle).
- *Catch it:* add a loose task in the task list. (More add-points later as needed;
  this is the primary one.)

**Rule:** the agent never interrogates on capture. Questions only happen in
triage, and only when the owner goes looking.

**Unhappy paths:** offline → the thought saves/queues and appears immediately, so
it never feels lost; Marty only confirms once it's actually logged (honest
receipt). A huge Inbox doesn't affect capture — you're always adding one line.

---

## 2. Triage — give things a home, only if you want to

Three doors into the same room; an item can stay loose forever.

- **Calm, one at a time (in-app):** open an Inbox item → it expands → set
  category / day / priority on that one thing → next. No forced fields. Also where
  you edit or delete it.
- **Drag onto real time (the unassigned tray):** on Today and the calendar, pull
  open a tray of loose tasks and **drag one onto a slot** = "I'll do this here."
  This sets the task's scheduled time (so it appears on the calendar) and clears
  it from loose. Best way to decide *when* — you're planning against the real
  shape of the day, not picking an abstract date.
- **Marty drives it when things stack up:** he reaches out to suggest sorting,
  *when* to do something, or *cutting* things that have sat too long. Cutting is
  as valuable as scheduling — this is the anti-staleness engine.

Everything stays movable (see below). Nothing dragged onto the calendar is stuck.

---

## 3. Today — "here is your day, already in order"

**Desktop — three zones, no vertical scroll. Job: glance and know what's next.**
- **Left:** the day, hour by hour (events + time-blocked tasks on the timeline).
- **Top right — "tasks today":** **tasks only, never events.** Shows every task
  that's *due today, scheduled today, or in the Today bucket* — including
  scheduled ones (so it's a full task tally). A high-priority loose task can
  headline here when the timeline has gaps.
- **Bottom right — "next 7 days":** **tomorrow → +7**, so it never repeats today.

**Mobile — agenda-first (single day).** Open it, see what's on today: the
timeline with events + time-blocked tasks, loose-but-due tasks tucked at the edge.

**"What's next" logic (drives the desktop sense of next action):** *time leads,
priority breaks ties.* If you're booked, the next thing on the clock is "next";
in a free stretch, the highest-priority loose task is what's suggested. (The
brief's gap-fill uses the same logic, so they stay consistent.)

---

## 4. Completing & interactions — how tasks/events change state and move

**Mark done (tasks):** tick from anywhere it appears (today module, timeline,
task list, expanded task, or by replying to Marty). It goes **grey (a greyed
version of its category colour) with a strikethrough** and **stays till midnight**
so the day's progress is visible, then rolls off. **Undo always available.**

**In progress (three states): not started → in progress → done.**
- One tap takes not-started → done directly; in-progress is an *optional* middle
  tap, never forced.
- Natural ways in (no chore): a two-stage tick, or an offer to "start" when you
  open a task / when a scheduled block is *now*. (Exact gesture = a row-design
  detail.)
- **Stale in-progress:** it stays exactly as left (nothing auto-resets), **and**
  if untouched ~2–3 days Marty gently asks "still going, or done?" He asks; you
  decide.

**Move a task in time — three ways, all stay movable after:**
- *Open it* and set day/time (the "change anything" path).
- *Quick day-flick on the row:* Today / Tomorrow / This Week / pick-a-date — for
  blitzing without opening anything. (Sets a **day**, not a clock time.)
- *Drag from the tray onto a slot:* sets a precise **time** on the grid.

**Buckets (Today / This Week / Someday):** you say "when" at whatever precision
you've got and the rest follows — a bucket flick, a due date, or a real slot;
never manage all three by hand. **Someday** is the honest long-term home (out of
view, never nagged, resurfaced only if it sits forever).

**Edit / delete (tasks):** expand to change name / category / priority / day, or
delete; deletes confirm only when not trivially undone.

**Events:** drag to move, drag the edge to resize. Once past, they go **quiet
(greyed, like a done task)** but never get a "done" tick — they just pass.
**Repeating events ask "this one or all?" on both edit and delete.**

**Snapping:** creating, dragging, and resizing all snap to **15-minute**
increments so the calendar never looks subtly misaligned.

---

## 5. Calendar — proper sheets you live in

Events and time-blocked tasks share **one timeline** (not two lists).

**Making something on the grid:**
- **Click** an empty slot → a **1-hour block** by default, starting where you
  clicked.
- **Click-and-drag** → draw the exact span yourself (15-min snapping), start time
  where you began.
- Either way you get a **task/event toggle, defaulting to event** (clicking a time
  slot usually means "book something here"); flip to task always available. Tasks
  also reach the grid via the tray drag.

**Views:** desktop leads with the **week** (7 columns); mobile leads with the
**single day**. Same sheet, different zoom — a view toggle, no data difference.

**Default window: 7am → midnight** (hides only the dead 12am–7am hours),
**expandable to full 24** for a rare early thing (which Marty would flag is
there). Same window on desktop week and mobile day.

**Now-line + today marker** carry over from the shell. The **unassigned tray**
opens on both day and week.

Everything on the calendar is freely **draggable, resizable, re-dayable, or
pullable back to loose** — a plan you push around, never a commitment you've
locked yourself into.

---

## 6. The proactive layer — the whole point

**This splits into TWO things** (a deliberate revision of the roadmap's earlier
"one bundled 7am brief" description — recorded here as the new intent; add a line
to 03-decisions.md so build chats don't follow the old version):

### 6a. The 7am brief — a calm "here's your day, ready?"
- One message, ~7am. Its *only* job: make sure you know what you wanted to do
  today. Reads like a quiet good-morning: *"Morning. Three things on today:
  dentist at 2, the essay block at 4, and 'call the bank' to fit in. Nothing
  urgent."*
- States **what's actually on today** (events + scheduled tasks + today-bucket
  tasks); goes quiet on a light day ("Pretty open today").
- It does **NOT** raise stale items, the inbox pile, or overdue stuff — those are
  the separate nudge layer.
- One-way good-morning by default; you *can* reply (reschedule, add) but it isn't
  asking you to. This is the one free, expected message.

### 6b. The nudge layer — reaches out when genuinely relevant
Marty **reaches out** (Telegram) through the day when something matters — because
a tool built to fix "logged and forgotten" must be willing to find you. The
discipline that keeps this from nagging:

- **Hard rate limit:** beyond the 7am brief, **no more than ~2–3 unprompted
  nudges/day, often zero.** A quiet day means silence.
- **One nudge per thing:** raise it once; if you don't act it waits and may
  resurface much later, not tomorrow.
- **Relevance gates everything:** only fires if **actionable right now** (a real
  free slot, a genuinely time-critical thing, a threshold tripped). "Just checking
  in" is banned.
- **Timed to the moment, not a fixed clock.**

**Nudge hierarchy:**
- **Time-critical → reaches out promptly:** something due/scheduled about to slip;
  an imminent unconfirmed appointment.
- **Planning → at a sensible moment:** "free stretch coming — want to put
  something in it?"; "in progress 3 days — done or still going?"
- **Housekeeping → only on a threshold:** the **10+ loose-inbox** ping; an
  occasional "want to cut some old stuff?" sweep. Rare, never urgent-toned.

**Chattiness = a dial (ship reserved, tune later).** Default posture is
**reserved**: hold planning nudges unless it's been quiet a while or the
opportunity is unusually good. "How chatty is Marty" becomes an adjustable setting
once the owner has lived with it — start quiet (a too-chatty week one gets him
muted), loosen from real experience.

---

## Defaults at a glance (the "if I add nothing" table)

| Thing | Default |
|---|---|
| A captured item | Inbox, no day, no priority, no due date, not started |
| Mobile plus | Task, name-focused, saves to Inbox |
| Grid click | 1-hour block, event (toggle to task) |
| New block size | 1 hour; drag = exact span, 15-min snap |
| Calendar window | 7am–midnight, expandable to 24h |
| Today (desktop) | 3 zones: day timeline / tasks-today / next-7-days (tomorrow→+7) |
| Today (mobile) | Single-day agenda |
| Done task | Grey + strikethrough till midnight, undo always |
| 7am brief | Calm day overview only; no stale/inbox/overdue |
| Nudges | ≤2–3/day, reserved by default, relevance-gated |

---

## Cross-cutting rules

- **Every action answers "did that work / what changed?"** — especially Marty,
  who always names what he logged and where.
- **Nothing is ever stuck** — tasks and events stay movable, completion is
  undoable, loose items can stay loose forever.
- **The agent never silently changes your data** — it asks (rides the brief or a
  nudge); you decide.
- **Never make the owner think in tables** — loosest-form-first; the data follows.
