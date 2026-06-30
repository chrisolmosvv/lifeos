# LifeOS — Calendar V2 (desktop) — locked spec + build handoff  (v1.1)

> The signed-off build contract for the **Calendar V2 upgrade** — an in-place evolution
> (Approach B) of the live, complete desktop Calendar. Compiled from Chris's decisions across
> nine spec batches + three characterisation flags + five refinement batches (10–14).
> Companion to `calendar-uiux-spec.md` (V1, now archaeology) and the approved **V1 Map +
> Behavioural Snapshot**. **Desktop only.** Mobile Calendar remains a separate later spec.
> Nothing builds until Chris signs off THIS doc **and** has walked the V1 snapshot on his Mac —
> except V2-0 (the daily-bug fix), which ships first.

---

## 0. What V2 is for

A **motion-led premium pass** over the Calendar, on top of a **correctness fix** that has to land
first. The calendar already works as a tool; V2 makes it *feel* premium (Fantastical / Notion
register) — but only once the grid math is right, because the daily click-drag bug means events
currently land on the wrong time.

- **Lead priority (ranked):** 1) Motion  2) Interaction feel  3) Visual craft.
- **V2-0 comes before all of it:** the grid-alignment + precision fix (§2), shipped and deployed
  on its own, first.
- **Scope:** polish + small UX tweaks, plus one new touch (keyboard nav). Richness via **motion
  and timing**, not depth — the still frame stays ink-on-paper (one scoped exception, Amendment 1).
- **No data-model, spine, or schema change.** `events.all_day` already exists (C7). The only
  back-end work is read-logic in three Edge Functions (§9).

> **Honest scope note:** the motion programme (all four moments + interactive swipe + bringing
> Today fully along) is real work, not a touch-up — a deliberate owner choice. The heaviest item
> (interactive swipe, §4) has its own feasibility gate and a clean fallback. V2-5 can split off as
> a follow-on if this round should stay lighter (off-ramp in §15).

---

## 1. The motion grammar

One legible spatial language, so motion reads as considered:

- **Vertical** = time within a week (hours scroll).  **Horizontal slide** = across weeks.
  **Zoom** = changing scale (Week ↔ Month, Month → Week).
- **Personality:** smooth & gliding — you feel the movement. **No overshoot / bounce**, anywhere.
- **Timing tiers (the lock; exact ms is a build detail):**
  - **Fast** — arrows, completion settle, hover.
  - **Medium** — tray squeeze, block fade.
  - **Slow / luxe** — Week ↔ Month zoom, Month → Week settle.
- **Interruptible:** every transition is cancelable — a new action takes over instantly (motions
  must be retargetable animation, never blocking timers).
- **Stagger is reserved** for first load + new-block create. Navigation *carries* existing blocks
  (the content-only slide), never re-staggers — this also prevents pan-shimmer.
- **Reduced-motion:** degrade to a **minimal crossfade everywhere** — no movement/zoom/slide,
  but never a hard instant cut. Swipe still navigates (just without the animated pan).

---

## 2. Grid geometry & precision contract — V2-0 (the daily-bug fix, ships first)

**The bug:** the horizontal hour lines don't line up with the gutter numbers on **both** Today and
Calendar, so click-drag creates events at the wrong hour/minute. Cause is a Builder/recon
diagnosis — almost certainly one of: CSS hour-row height ≠ `HOUR_HEIGHT` (48px); a top
padding/border offset the drag math doesn't subtract; or labels *centered* on the line rather than
marking it (the V1 handoff flagged the 00:00 label "centres on the edge line").

**The target contract (the acceptance bar the fix must hit):**
- **The line IS the hour boundary.** The "07" line *is* 07:00; the 7am hour fills the space below
  it down to the "08" line. Labels sit **at** their line (Apple/Google convention).
- **Click-to-time is exact:** a click on the 09:00 line creates a **09:00** start.
- **Create start = nearest 15 min** to the press position.
- **The floating time label is authoritative** — it shows the snapped, committed time, and that is
  exactly what writes. Source of truth is the number, not the eyeballed row, so the grid is
  resilient to any residual sub-pixel offset.
- **Gutter highlight = the full span** (start row → end row) during create/drag/resize, so the
  block's whole time footprint is visible as it lands.
- **Grid draws hour lines only** — no half/quarter sub-hour guides (the 15-min snap is felt).
- **Short-block clamp reduced:** blocks render at their **true height** (drop the 30-min
  floor-clamp in the shared `eventLayout`), so a 15-min block looks like 15 min — **but keep a
  minimum hit area** so tiny blocks stay grabbable.
- **Applies identically to Today and Calendar** (same `HOUR_HEIGHT`, same line=boundary, same drag
  math, same shared code). The now-line sits exactly at the current time on the corrected grid;
  the 07:00 line lands flush at the top on the default scroll.

**Acceptance test (Chris, on the Mac, both screens):** click the 09:00 line → block starts 09:00,
label reads "09:00", the 9am gutter row highlights; a 15-min block looks 15 min and is still
grabbable; existing blocks sit at their true times.

**V2-0 ships on its own and deploys immediately** — premium pieces follow. No schema. Shared-kit
change (touches Today) → directed both-screen verify.

---

## 3. Navigation — two deliberate models

**Arrows = locked, structured (unchanged from V1):** rolling home (today = col 1, +6 days);
arrowing off home snaps to Mon–Sun weeks; "Back to this week" returns to rolling home.

**Swipe = the new, free model:**
- **Trackpad two-finger horizontal scroll** (vertical still scrolls hours).
- **Free pan** — lands on any 7-day window, snapping to the nearest **day** on release; not forced
  to Mondays.
- **Interactive** — tracks the finger live.
- **Light inertia** — a quick flick glides a little, but won't run away.
- **Clean ease to the snapped day, no overshoot** (honours no-bounce; "rubber-band" = inertia/
  resistance only, never a bouncy overshoot).
- **Axis-lock** — once a gesture starts it commits to the dominant axis; no diagonal drift, so
  scrolling the hours never jumps a week.
- Mouse click-drag on the grid stays reserved for **creating**; swipe is the trackpad gesture
  only. Real touch-swipe = mobile spec.

**The seam:** from a free-swiped window, pressing an arrow snaps to the nearest Mon–Sun week then
steps weekly; "Back to this week" returns to rolling home from anywhere. `weekNav` gains one new
state: **free-offset**.

**Transitions:**
- **Arrowing weeks:** content-only slide — frame (gutter, headers, band) fixed, blocks slide/fade
  (next = slide left).
- **Week ↔ Month:** **true zoom** — Month expands out of / collapses into the focused week.
- **Month → Week jump & "Back to this week":** gentle **zoom-and-settle** onto the target day.

---

## 4. ⚠️ The heavy item — interactive swipe (own slice, own gate)

The interactive free pan likely needs the week to become a **horizontally pannable day-strip**
(adjacent days rendered and scrolled through) rather than 7 fixed columns redrawn per week — the
one part of V2 that crosses into real interaction-architecture.

- **Feasibility settled at recon, before build.** Fallback if too invasive: the **triggered
  content-slide** (swipe fires it on a completed gesture instead of finger-tracking).
- **Hard constraint:** the day-strip must keep consuming the **shared `eventLayout`** — change how
  columns mount, never `eventLayout`'s contract.
- Built as its own piece, one gesture wired end-to-end first.

---

## 5. Blocks & lifecycle

- **Block look unchanged** (tint fill + left bar + title-only). The only block-visual change in V2
  is the colour unify.
- **Colour unify (Flag 1 fix):** Today moves from raw category colour to the **shaded** sub-branch
  colour, matching Calendar (drift, not a decision — see Amendments).
- **Appear:** soft fade-in, lightly staggered by start-time (top-down ripple), **on load + create
  only** (not on nav — §1).
- **Completion settle:** cross-fade to grey while the strikethrough draws across, ~300ms (fast
  tier).

---

## 6. Drag

- **Lift:** scale + hairline **+ a faint elevation fading in** (Amendment 1) — the only thing that
  lifts off the paper.
- **Drop:** a firmer, quicker snap into the slot — less float.
- **Feedback:** ghost + the authoritative time label + the **full-span gutter highlight** (§2).
- All drag *behaviour* (15-min snap, re-day-keeps-time, off-grid unschedule, event-snaps-back) is
  byte-for-byte unchanged — only feel changes.

---

## 7. Ambient & resting states

- **Tray:** synchronized squeeze — drawer glides in as the week narrows, one motion.
- **Now-line:** gentle eased tick to the new spot each minute (soft step, not a jump, not a creep).
- **Hover a block:** faint tint-deepen.  **Selected block:** quiet outline only (no elevation).

---

## 8. Visual craft, keyboard, Month

- **Visual craft: light** — motion carries it; block look unchanged (§5).
- **Keyboard nav (the new touch): minimal** — **Esc** closes the form / deselects; **← / →** step
  (a week in Week, a month in Month). No other keys. (Esc is a no-op in Month.)
- **Month:** true zoom in/out + ← / → steps months; internals (dots, rings, strips, "+N more",
  navigational-only clicks) unchanged.

---

## 9. Brief all-day awareness (Flag 2 fix — back-end, separate track)

The 7am brief + gap/nudge don't understand all-day events (stored at local-midnight → read as a
00:00 item / a 24h busy block). V2 makes them all-day-aware:

- **Display:** an all-day event shows as an **all-day line**, not a 00:00 timed item.
- **Free-time behaviour: the middle option** — gap/nudge **still offer free slots** that day, but
  the brief **mentions the all-day item** (not treated as a full-day block).
- **Track:** `brief/day.ts`, `brief/gap.ts`, `brief/nudge.ts` — Edge Function read-logic only, no
  schema. **supabase/ commit track, never mixed with src.** Re-pin `config.toml verify_jwt =
  false` on redeploy (known silent regression).

---

## 10. Empty / sparse / missing states

- Empty week = grid + now-line, no copy. Empty tray / month = blank. (Unchanged.)
- All-day band still collapses to zero height when empty. (Unchanged.)
- Loading: grid + gutter first, blocks fade in (the staggered fade) — no spinner.
- New-motion guard: no stagger on zero blocks; no gutter-highlight without a drag.
- Reduced-motion: per §1 (minimal crossfade).

---

## 11. Convergence principle (standing rule for V2)

**Today and Calendar look and feel the same; shared behaviour lives in shared code.** A change to a
shared surface (grid geometry, blocks, drag, hover, completion, colour, now-line, gutter) is made
**once, in the shared kit**, and surfaces on both screens identically — never forked Calendar-only.
The only Calendar-only things are features Today has no equivalent for (Week ↔ Month, swipe, tray,
all-day band, Month). **Reuse/extend before clone**; the final sweep catches any accidental fork.

---

## 12. Amendments to prior locks (record openly — do not "fix" back)

1. **No-shadow / paper-true → faint elevation on the lifted/dragged block only.** Scoped to the
   drag moment; the still frame stays pure paper.
2. **"Arrows only / no date picker" → arrows + Mon-locked trackpad swipe (still no date picker).**
   Additive; arrows unchanged and primary. *(Superseded the original "free-live any-day swipe" —
   the Week swipe now steps whole Mon–Sun weeks via the SAME path as the arrows. See §18 for the
   arc + reasoning.)*
3. **"Today stays byte-for-byte" → Today's visual/motion skin comes along; behaviour stays frozen.**
   Shared look/motion applied to both (now a standing principle, §11). Today's **behaviour** remains
   a hard oracle: every Today click/drag/resize/complete/write must still do exactly the same data
   thing. *Verify consequence:* a changed Today animation/colour = success; a changed Today write =
   regression. Sub-record: Today's block colour moves raw → shaded (closes Flag 1).
   - *Clarification (not an amendment):* the swipe "rubber-band" means inertia, not overshoot — the
     no-bounce law is intact.

---

## 13. Change ledger (KEEP / EXTEND / REPLACE)

| Part | V2 action | Touches Today? |
|---|---|---|
| Grid geometry + `eventLayout` clamp (V2-0) | **FIX/EXTEND** — line=boundary, authoritative label, reduced clamp + min hit area, full-span highlight | **yes** |
| `weekNav.js` | **EXTEND** — free-offset state + swipe routing + seam; arrows unchanged | no |
| Week render (`WeekGrid`/`WeekColumn`) | **REPLACE (likely)** — pannable day-strip *(recon-gated; fallback = triggered slide)* | no (preserve shared `eventLayout`) |
| Week ↔ Month transition | **REPLACE** — true zoom | no |
| Arrow week transition | **EXTEND** — content-only slide | no |
| `useGridDrag` (shared) | **EXTEND** — firmer drop, gutter-highlight; behaviour kept | **yes** |
| `TintedBlock` (shared) | **EXTEND** — drag-lift elevation, hover tint-deepen, completion cross-fade+strike, eased now-line, colour unify | **yes** |
| `DayGrid` (Today) | **EXTEND** — colour unify + all shared polish | **yes** |
| Tray | **EXTEND** — synchronized squeeze | no |
| Month | **EXTEND** — true zoom + ←/→ months; internals unchanged | no |
| Keyboard nav | **NEW** — Esc + ← / → | yes (Esc → shared form) |
| `brief/day|gap|nudge.ts` | **EXTEND** — all-day-aware, middle behaviour | no |
| `onDeleteEvent` | **DELETE** — prove-dead, own commit | no |

---

## 14. Provisional deletion list (prove dead first; each its own commit)

1. **`onDeleteEvent`** (`useWeekData`) — no consumer (dead since C3). Prove-dead, own commit. *Safe.*
2. **Superseded transition code/CSS** (old Week↔Month zoom + arrow motion) — paired deletion commit
   of the REPLACE piece. *Calendar-only.*
3. **(Conditional)** old fixed-7-column render path — only if the day-strip replaces it.
   *Calendar-only — do NOT delete shared `eventLayout`.*

No spine touch, no schema, no migration → no rollback needed.

---

## 15. Risk-ordered build order

Save point before each; owner-verified on the Mac before the next; schema/src never mix; module
works at every commit. **⚠️Today** = directed both-screen behavioural re-verify against the snapshot.
Per §11, prefer shared-kit changes so both screens move together.

- **V2-0 — Grid geometry & precision fix (§2). SHIPS ALONE, DEPLOYS FIRST.** ⚠️Today. The daily bug.
- **V2-1 — Colour unify** (Today → shaded; closes Flag 1). ⚠️Today.
- **V2-2 — Shared block motion vocabulary:** staggered fade-in, completion cross-fade+strike, hover
  tint-deepen, eased now-line. ⚠️Today.
- **V2-3 — Drag feel:** firmer drop + drag-lift elevation (Amend. 1) + full-span gutter highlight.
  ⚠️Today (directed: behaviour identical, feel changed).
- **V2-4 — Nav transitions (Calendar-only):** content-only arrow slide + true Week↔Month zoom +
  zoom-settle. **REPLACE → paired deletion commit.**
- **V2-5 — ⚠️Interactive swipe + free-offset nav (heavy slice).** Own recon/feasibility gate first
  (day-strip vs triggered fallback). One gesture end-to-end first.
- **V2-6 — Tray squeeze** (Calendar-only).
- **V2-7 — Keyboard nav** (Esc + ← / →; reaches Month).
- **V2-8 — Brief all-day awareness** (supabase track, own commit(s); re-pin verify_jwt; verify on a
  real all-day day).
- **V2-9 — Cleanup + sweep:** prove-dead `onDeleteEvent`; dead-code sweep; design-law honesty check
  (zero-scroll on Chris's screen — calm wins); accent-sparing pass; reduced-motion verify across all
  new motion.

> **Off-ramp:** V2-5 (interactive swipe) can split off as its own follow-on; V2-0→V2-4 + V2-6→V2-9
> still deliver the full premium feel with the triggered-slide fallback.

---

## 16. Open flags for recon to settle

1. **Grid-bug cause (V2-0)** — diagnose: `HOUR_HEIGHT` vs CSS row height vs top offset vs label
   centering. Fix to the §2 contract; verify on both screens.
2. **Day-strip feasibility (V2-5)** — interactive pan via day-strip, or triggered slide? Preserve
   `eventLayout`.
3. **Confirm the V1 Map against live state** — re-verify shared consumers (`useGridDrag`/`ItemForm`/
   `TintedBlock`/`eventLayout`), getters, routes; flag drift.
4. **`onDeleteEvent` truly dead** — grep every reference before the V2-9 deletion.
5. **OPEN (Chris to decide):** Today's grid is 7am–midnight, Calendar full 24h. Keep that
   deliberate window difference, or unify (e.g. Today also full-24h with 07:00 default)? Not
   changing it unless Chris says so.

---

## 17. The evolve prompt — paste to a fresh Builder chat AFTER sign-off + the snapshot walk
> (V2-0 may begin as soon as the spec + snapshot are signed off — it's the deploy-first bugfix.)

```
LifeOS — Calendar (Track C) — Calendar V2: evolve in place

CONTEXT — read before doing anything
You're the executor in a 3-instance relay. I'm Chris, sole owner; I don't read code. A Planner
designed this spec, you build, a Checker reviews schema (none expected). I carry messages and
verify every result on my Mac. We are upgrading the desktop Calendar IN PLACE — no parallel copy;
it stays working at every commit. Work ONE piece at a time, commit a save point before each, and
after recon STOP and show me your plan before touching files. Read the brain docs first —
CLAUDE.md, calendar-uiux-spec.md (V1), calendar-v2-spec.md (THIS spec, v1.1), 03-decisions.md,
04-handoff-log.md — and the approved V1 Map + Behavioural Snapshot.

PROJECT
React + Vite, plain CSS (no Tailwind). Supabase Postgres, Frankfurt, ref cntlptuacsujbdtwvbis.
Vercel, GitHub chrisolmosvv/lifeos. Fraunces (headlines/data) + Inter (body/UI); paper #F6F5F1,
near-black ink, terracotta #C8643D used sparingly; hairlines. Design laws: desktop zero-scroll
(target), calm (law), no clutter. When zero-scroll and calm fight, CALM WINS.

HARD RULES (every piece): additive-only spine, no FK into spine, spine untouchable, V2 needs NO
schema. Two-track commits (src/ never with supabase/; the brief piece V2-8 is its own supabase
commit). Baseline before touch: the approved V1 Snapshot is the only definition of "still works";
Today's BEHAVIOUR is a hard oracle, its look/motion is INTENTIONALLY changing (Amend. 3 / §11).
Evolve in place, never fork; REUSE/EXTEND before add (shared kit, both screens move together,
§11); PROVE-IT'S-DEAD before any deletion (own commit, after its replacement verifies).
Compute-on-read; FETCH/WRITE/CALC separate; RLS owner-only; free-tier; Frankfurt only; one
day-boundary truth; files <250 lines. Verify-don't-trust ("deployed is not done"): I witness on
my Mac; writes verified by updated_at + reload; for the upgrade I ALSO re-verify the snapshot I
didn't mean to change. Recon before changes. Doom-loop: if a fix compounds, STOP and roll back.

WHAT THIS IS
A correctness fix (V2-0, the grid geometry/precision bug) shipped + deployed FIRST, then a
motion-led premium V2, evolved in place. Full decisions, the grid contract (§2), change ledger,
deletion list, amendments, convergence principle, and build order are in calendar-v2-spec.md.
Motion = smooth & gliding, no bounce, interruptible, mixed timing tiers; Today comes fully along
on shared look/feel (§11), Calendar-only structure = zoom/swipe/tray/band/Month.

RECON FIRST — then STOP and show me your plan + file layout, and wait for go:
- DIAGNOSE the V2-0 grid bug: HOUR_HEIGHT vs CSS row height vs a top offset vs label centering.
  State the cause and the exact fix to hit the §2 contract on BOTH Today and Calendar.
- CONFIRM the V1 Map against live state (a session old): re-verify shared consumers (useGridDrag,
  ItemForm, TintedBlock, eventLayout), getters, routes. Flag drift.
- DEFINITIVE VERDICT on V2-5: interactive swipe via pannable day-strip, or triggered slide?
  Preserve eventLayout's contract either way.
- Inventory the kit to reuse/extend per piece; flag anything you expect to be presentation that
  turns out to need real calc/architecture — STOP, don't inline.
- For onDeleteEvent + superseded transition code, state how you'll PROVE dead.
- Propose file layout + the build order (§15), each REPLACE paired with its deletion commit, and
  the one gesture wired end-to-end first for V2-5.

BUILD ORDER (after I approve the plan): per §15 of calendar-v2-spec.md. V2-0 ships ALONE and
DEPLOYS first. Commit before each; schema/src never mix; module works at every commit; ⚠️Today
pieces get a directed both-screen re-verify.

VERIFY — after each piece tell me PRECISELY what to look at: (a) the NEW behaviour vs the spec,
AND (b) the SNAPSHOT behaviour around it that must NOT regress (⚠️Today = the Today behavioural
baseline specifically). V2-0 acceptance: click the 09:00 line → 09:00 start, label "09:00", 9am
row highlights, both screens; 15-min block looks 15 min + grabbable. Brief piece: the exact
all-day day + function to check. Reduced-motion checked on new motion. Then WAIT for my explicit
"verified — [new specifics] + snapshot still holds" before the next piece (and its deletion).

When recon's done, show me the plan and WAIT. Don't build yet.
```

---

## 18. V2-5 — Interactive swipe (LOCKED detail — supersedes the §3/§4 sketch)

Drilled and locked after the V2-4 build, costed against the code as it then stood.

> ### ⭐ AS BUILT (final) — supersedes the FREE-LIVE detail below. DO NOT rebuild as free.
> **The arc (kept so it isn't re-litigated):**
> 1. **Locked FREE-LIVE** here — continuous finger-tracked pan, Week landing on any day-aligned
>    window via a pannable day-strip.
> 2. **Built FREE-TRIGGERED** — at the Week build the day-strip proved to be a large, multi-file,
>    blind (un-self-testable) rebuild on the screen verified hardest. Per the owner's "fall back
>    rather than dig" rule, took §18's sanctioned fallback: a swipe commits to a window **on
>    release** (no live track), reusing the verified V2-4 slide; the fixed 7-col render stayed, so
>    `dayStartMsAt` + the whole drag geometry were byte-for-byte. (`weekNav` gained a FREE/any-day
>    state for this.) Month likewise free-triggered (one month per swipe).
> 3. **Simplified to MON-LOCKED (final, owner decision)** — the free/any-day window was dropped.
>    The Week swipe now behaves **exactly like the arrows: one Mon–Sun week per swipe**
>    (forward = next, back = prev), **distance-independent**, calling the **same `navNext`/`navPrev`
>    step** so swipe + arrows are a single path (and it rides the V2-4 slide + the reload gate). The
>    `weekNav` FREE state + `navShift` + the arrow-from-free seam were **proven-dead and removed**
>    (its own commit) — `weekNav` is back to its 2-state HOME/WEEK form.
>
> **Final behaviour, all screens (all TRIGGERED, distance-independent, one step per swipe):**
> - **Week** — one **Mon-week** per swipe (locked to Mon–Sun; never a mid-week start), via the arrow
>   path; the V2-4 slide plays. Arrows unchanged. "Back to this week" → rolling home.
> - **Today** — one **day** per swipe (the existing `viewed`-step). Unchanged from sub-step 1.
> - **Month** — one **month** per swipe (the existing month step + `mv-in` fade).
> - Shared `kit/useSwipe` detector (wheel capture, axis-lock on the dominant axis, ~120ms gesture-end
>   gap, **non-passive `preventDefault`** to kill the macOS history-swipe). Vertical still scrolls
>   hours. Reduced-motion: no live track (there is none now) — the commit rides each screen's
>   existing slide/fade/crossfade.
> **Why it's better here:** for discrete Mon-week / month / day navigation the continuous live track
> bought little, at the cost of a blind multi-file rebuild (and, for Week, an any-day model the owner
> didn't ultimately want). Calm + one nav path won.

**The FREE-LIVE detail below is HISTORICAL — what was locked at recon, not what shipped.**

**Driver & collision**
- **Trackpad two-finger horizontal scroll ONLY.** No mouse-drag swipe → wheel/scroll and pointer
  are different event streams → **no collision** with click-drag create/re-day. The heavy
  gesture-arbitration the Builder warned about is off the table.
- Allowed **anywhere on the grid body** (safe precisely because it's scroll, not pointer).
- Vertical scroll still scrolls the hours; **axis-lock** once a gesture commits (Batch 13).

**Per-screen behaviour (different views → different actions; shared detector)**
- **Calendar Week — FREE-LIVE.** Continuous finger-tracked pan; lands on **any day-aligned 7-day
  window**; light inertia; clean ease to the snapped day on release, **no overshoot**. Needs the
  week rebuilt as a **pannable day-strip** (Calendar-only render change), preserving `eventLayout`'s
  per-day contract.
- **Calendar Month — FREE-LIVE between whole-month panels.** Continuous finger-tracked pan through
  horizontally-adjacent month grids, **snapping to a complete month** on release (a month grid is
  discrete — no partial-month window). Same calm-skeleton + reduced-motion rules.
- **Today — SIMPLE.** One day per swipe, **triggered** (swipe → next/prev day via the existing
  `viewed`-step). No live tracking. Trivial, low-risk.
- A shared **swipe detector** (axis-lock, horizontal-vs-vertical, threshold) where sensible; the
  **action differs per screen**.

**Arrows (unchanged)**
- Arrows stay structured (rolling home → Mon-weeks; Month arrows step whole months). Seam: an arrow
  from a free-swiped window snaps to the nearest Mon–Sun week (Batch 5 rule). "Back to this week" →
  rolling home.

**Data windowing**
- **Calm skeleton:** days/months not yet loaded show a quiet placeholder during a fast pan, fill on
  settle. Week reuses `useWeekData` per `weekKey`; Month reuses `useMonthData` per `monthAnchor` —
  recon defines the buffer / just-in-time fetch.

**Reduced-motion**
- Calendar live-pan degrades to: **no live finger-track, a quick crossfade to the snapped window.**
  Today swipe is already trivial; arrows unaffected.

**Fallback (the recon gate)**
- If recon finds the free-live day-strip can't keep the drag geometry honest (the panned origin vs
  `useGridDrag`'s live `getBoundingClientRect` reads), fall back to **FREE-TRIGGERED**: a swipe
  slides to any day-aligned window, committing on release (no continuous tracking). Keeps "free,"
  drops the strip. Same fallback for Month.

**Risk / scope**
- The **only** real risk is the day-strip render + coordinate-origin coordination with
  `useGridDrag`'s live rects — **Calendar-only, no engine rewrite.** Trackpad-only killed the
  mouse-gesture arbitration.

**Build sub-sequencing (within V2-5; recon-gated; one gesture end-to-end first)**
1. Shared swipe detector + **Today day-step** (trivial, low-risk — ship/verify first).
2. **Calendar Week free-live day-strip** (the heavy core; fallback = free-triggered). Prove Today +
   create / re-day / resize unchanged and the drag geometry intact before extending.
3. **Calendar Month free-live panels.**
Each its own commit; the week-render REPLACE pairs with a prove-dead deletion.
