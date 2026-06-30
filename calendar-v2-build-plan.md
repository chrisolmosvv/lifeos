# LifeOS — Calendar V2 — Build Plan (this round)

> The execution plan for the agreed cut. Detailed contracts live in `calendar-v2-spec.md` (v1.1);
> this doc is the sequence, the gates, and the per-step acceptance Chris verifies on the Mac.
> Work the relay: Planner specced, Builder executes, Chris carries + verifies. No code-reading.

---

## Locked scope

**IN (7 pieces):** V2-0 grid fix · V2-1 colour unify · V2-2 block motion · V2-3 drag feel ·
V2-4 nav transitions · V2-6 tray squeeze · V2-5 free interactive swipe.

**DEFERRED (not this round):** V2-7 keyboard nav · V2-8 brief all-day fix · standalone
`onDeleteEvent` removal. (Each is independent and can be picked up later.)

**Consequence of the cut:** this round is **100% front-end**. **No schema, no Edge Functions →
no Checker gate, no migration/rollback, no secret rotation.** All risk is UI/interaction risk.

---

## Pre-flight — three gates before any build

1. **Sign off `calendar-v2-spec.md` v1.1** (and the open §16-5 call: keep Today 7am–midnight vs
   Calendar 24h, or unify — currently *keep* unless you say otherwise).
2. **Walk the V1 Behavioural Snapshot on the Mac** — still owed. Record the grid-alignment bug as
   **known-broken** (note the wrong-time behaviour as the V1 state) so V2-0 can be *proven fixed*,
   not re-confirmed.
3. **Recon (Builder), then STOP for your approval.** Builder must: (a) diagnose the V2-0 cause
   (`HOUR_HEIGHT` vs CSS row height vs top offset vs label centering); (b) confirm the V1 Map
   against live state (shared consumers `useGridDrag`/`ItemForm`/`TintedBlock`/`eventLayout`,
   getters, routes); (c) give a definitive **day-strip vs triggered-slide** verdict for V2-5,
   preserving `eventLayout`. → You approve the plan → build begins.

---

## Cross-cutting discipline (every step)

- **Save point (commit) before each step.** One step at a time. Verified on the Mac before the next.
- **⚠️Today steps** (1–4) get a **directed Today re-verify**: behaviour must be byte-for-byte
  vs the snapshot; look/motion is *intended* to match Calendar. A changed Today *write* = regression;
  a changed Today *animation/colour* = success.
- **REPLACE steps** (5, and 7 if the render is replaced): build commit + a **separate deletion
  commit** once verified — one clean revert each.
- **Reduced-motion**: every motion step ships its minimal-crossfade fallback in the same piece.
- **Deploy cadence:** V2-0 deploys to Vercel **immediately**. The rest deploy when you choose —
  "deployed is not done," you witness each on the Mac.
- **Doom-loop rule:** if a fix compounds, STOP and roll back to the last save point.

---

## The sequence

### Step 1 — V2-0 · Grid geometry & precision fix  ⚠️Today · DEPLOY FIRST
**Goal:** line = the hour boundary; exact click-to-time; create-start snaps to nearest 15;
authoritative floating time label; full-span gutter highlight; short-block clamp reduced (true
height) **with a minimum hit area**; identical on both screens.
**Touches:** `HOUR_HEIGHT` / CSS row height, gutter render, `useGridDrag` pixel↔time math,
`eventLayout` `MIN_HOURS`, `TintedBlock` min-height, `DayGrid` + `WeekColumn`/`WeekGrid`.
**Commit:** own commit → **deploy now.**
**Acceptance (both screens):** click the **09:00 line → block starts 09:00**, label reads
"09:00", the **9am gutter row highlights**; existing blocks sit at their true times; a 15-min block
**looks** 15 min and is still grabbable; the now-line sits exactly at the current time; 07:00 lands
flush at the top.
**Today re-verify:** every Today create / drag / resize works **and is now correct**.

### Step 2 — V2-1 · Colour unify  ⚠️Today
**Goal:** Today's block tint moves raw → **shaded** sub-branch colour, matching Calendar.
**Touches:** `DayGrid` colour input → `resolveColor`.
**Commit:** own.
**Acceptance:** a deeply-filed sub-category task shows the **same shaded colour** on Today and
Calendar (no flatter parent colour on Today anymore).
**Today re-verify:** behaviour unchanged.

### Step 3 — V2-2 · Block motion vocabulary  ⚠️Today
**Goal:** staggered fade-in (**load + create only**, never on nav); completion cross-fade to grey
+ strikethrough draws across (~300ms); hover faint tint-deepen; eased now-line tick. Both screens.
**Touches:** `TintedBlock` states, grid render, now-line.
**Commit:** own.
**Acceptance:** fresh load → blocks ripple in top-down; tick a task → eases to grey, strike draws;
hover → tint deepens; watch the now-line ease (~1 min); turn on **Reduce Motion** → all become
quiet crossfades, no movement; identical on both screens.
**Today re-verify:** completion + all behaviour identical.

### Step 4 — V2-3 · Drag feel + gutter highlight  ⚠️Today (load-bearing)
**Goal:** lift = scale + hairline **+ faint elevation** fading in; drop = **firmer, quicker snap**;
during drag: ghost + authoritative label + **full-span gutter highlight**. Behaviour byte-for-byte.
**Touches:** `useGridDrag` (drop snap), `TintedBlock` (lift elevation), gutter-highlight wiring.
**Commit:** own.
**Acceptance:** pick up a block → slight lift + faint elevation; drag → ghost + label + gutter
shows the full span; release → firm snap; sideways re-day keeps the time; off-grid task
unschedules, off-grid event snaps back — **all exactly as before, only nicer.**
**Today re-verify:** the critical one — Today drag / create / resize / off-grid all identical.

### Step 5 — V2-4 · Nav transitions (Calendar-only) · REPLACE → paired deletion
**Goal:** content-only arrow slide (frame fixed, blocks slide/fade, next = left); **true
Week↔Month zoom**; zoom-and-settle on Month→Week + "Back to this week". Slow/luxe tier for the
zoom; interruptible; reduced-motion = crossfade.
**Touches:** `CalendarWeek` transitions, Week↔Month switch, `WeekView`/`MonthView` mount.
**Commits:** (a) new transitions; (b) **separate deletion commit** removing the old transition
code once (a) verifies.
**Acceptance:** arrow → blocks slide, gutter/headers stay put; Month toggle → zooms out of the
focused week; click a Month day → zooms into that week/day; Back-to-this-week → zoom-settles home;
interrupt one mid-play → the new action takes over instantly; Reduce Motion → crossfades.
**Today re-verify:** confirm Today untouched.

### Step 6 — V2-6 · Tray squeeze (Calendar-only)
**Goal:** synchronized squeeze — drawer glides in **as** the week narrows, one motion; reverse on
close. Medium tier; reduced-motion = fade.
**Touches:** `TrayDrawer` + week width.
**Commit:** own.
**Acceptance:** open tray → week narrows + drawer enters as one motion, all 7 columns stay
visible; close → restores full width; drop a task → it leaves the tray, the tray stays open.

### Step 7 — V2-5 · Free interactive swipe (Calendar-only) ⚠️ HEAVY · RECON-GATED · last
**Goal:** trackpad two-finger horizontal = **free pan**, tracks the finger, **light inertia**,
**clean ease snap to nearest day** (no overshoot), **axis-lock** (vertical still scrolls hours).
`weekNav` gains the **free-offset** state + the seam (arrow from a free window → nearest Mon–Sun
week; "Back to this week" → rolling home). Builds on Step 5's slide mechanism.
**Gate:** recon verdict already given (Step pre-flight 3c) — **pannable day-strip** vs **triggered
fallback**, `eventLayout` preserved. **Wire ONE gesture end-to-end first.**
**Touches:** `WeekGrid` render (likely → day-strip), `weekNav` (free state + seam), gesture
handling. If the render is replaced → **paired deletion commit**.
**Acceptance:** two-finger horizontal → week pans with the finger, lands snapped to a day with a
small glide and a clean ease, **no bounce**; vertical still scrolls hours, no diagonal week-jump;
from a free window, an arrow snaps to the nearest Mon–Sun week; Back-to-this-week → rolling home;
**mouse click-drag still creates events** (no collision).
**Risk note:** highest-risk piece. If it can't be made flawless, **fall back to the triggered
slide** (still good) — a janky swipe reads as anti-premium, so don't ship one.

### Close — minimal sweep
- Final **dead-code sweep** (catch anything the paired deletions missed).
- **Design-law honesty check** on your screen: zero-scroll (calm wins if it can't fit honestly),
  accent-sparing pass.
- **Reduced-motion** verified across all new motion in one pass.
- **Brain docs:** decisions doc (the 3 amendments + the scope cut, with reasoning), roadmap,
  handoff log (commit chain incl. deletion commits), fold `calendar-v2-spec.md` forward to read as
  current truth. **Docs-only commit**, show the hash, clean tree. Re-upload to project knowledge.
- *(Optional hygiene, if you want it:)* prove-dead removal of `onDeleteEvent`, own commit.

---

## Handoff to the Builder

Use the evolve prompt in `calendar-v2-spec.md` §17 **with one scope override:** the build order is
**this plan's 7 steps** (Steps 1–7 above), not the spec's full §15 list — keyboard nav, the brief
all-day fix, and the standalone `onDeleteEvent` removal are **deferred**. Everything else in the
prompt (hard rules, recon-first-then-stop, verify discipline, V2-0 deploy-first) stands.
