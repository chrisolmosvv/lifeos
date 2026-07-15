# LifeOS — Health V2 — Build Doc
### Sleep · Body Composition · Activity (in Gym) — evolve in place

> **⚠️ STALE STATUS — banner added 2026-07-15 (doc-drift audit D-20); extended 2026-07-15
> at close.** The STATUS line below stopped at 2026-06-30. Since then the **Sleep redesign**
> (Pieces 1–6 + a goal-hit-rate follow-up, 2026-07-13→15 — CSS split, awakenings/respiratory
> cut, the rebuilt Last-night footer, the generalised clock chart, Week/Month/90-day adopting
> it, the per-week goal-hit label) has reshaped every Sleep surface. **That pass is now recorded
> AS-BUILT in `PART C` (bottom of this doc) — read Part C first for the current Sleep UI; its
> drift ledger corrects the specific stale claims in Parts A/B (NEXT=P3, HealthStub-pending,
> the dial marker, the "bottom-pinned" readout, sleep/body-chrome, the 165px masthead, the axis).

> Companion artifact to the Module Upgrade Playbook V2. This is the compiled, locked spec for the
> Health V2 upgrade, plus the change ledger, provisional deletion list, amendments, the
> schema/ingest verdict, and the risk-ordered build order. It is the source the per-piece Builder
> prompts are drawn from. **Each piece still goes to a fresh Builder chat with the recon-first
> hard stop** — the Builder reads no prior Planner context, so the relevant slice of this doc is
> pasted in full with each piece.
>
> **Owner:** Chris (sole owner, does not read code, verifies on his own Mac/iPhone).
> **Approach B — Characterise & Evolve In-Place.** No parallel copy. The module stays working at
> every commit.

---


> **STATUS (updated 2026-06-30):** P1 (Sleep) + P2.0 (shared kit) + P2 (Body) are **SHIPPED and
> owner-verified on the 13" built-in.** This doc is now in two parts:
> **Part A — As-Built Consolidation** is **authoritative for Sleep + Body** (what actually shipped,
> with commit refs, the corrected band-render reality, the carried flags, and amendments 10–19).
> **Part B — Original Locked Intent** is the pre-build spec + decision archaeology; where the two
> disagree about Sleep/Body, **Part A wins.** Superseded sections in Part B are tagged inline.
> **Activity (Part B §4C), Gym (§4D, §8), and the close (§7 P4/P5, §10–11) are NOT yet built — they
> remain live forward spec.** NEXT piece = **P3 shared-kit consolidation** (its inventory is
> pre-written in Part A §4).
> *(corrected 2026-07-15: P3 shipped 2026-06-30 `5904429`; P4 shipped 2026-07-01; the Sleep
> redesign (Part C) is the P5-era pass. "NEXT = P3" is stale wherever it appears below.)*

---

# PART A — AS-BUILT CONSOLIDATION (P1 Sleep + P2 Body + P2.0)

> Status: P1 (Sleep) and P2 (Body) COMPLETE and owner-verified on the 13" built-in.
> This section supersedes the per-piece prose for Sleep + Body; §4A/§4B in **Part B below** are the
> original intent, this is what actually shipped. Source = committed code + handoff log.
> Pipeline (P0a–c) unchanged. NEXT = P3 shared-kit consolidation, then P4 Gym, P5 close.

## 1. THE VISUAL LOCK (reusable law — Body inherited it from Sleep; Activity/Gym next)

- **Distributed chrome.** Breadcrumb (`Health / X`) on the left, shared **RangeSwitcher**
  on the right, centre clean against the nav. Two placements coexist:
  - *Sleep "Last night"* distributes chrome **into the columns** (breadcrumb tops the
    left column, switcher tops the right column — no chrome band).
  - *Sleep aggregate + all of Body* use a **thin top chrome row** (`.sleep-chrome` /
    `.body-chrome`) because their top is a full-width stats/table, not columns.
- **Full-height fit + zero-scroll**, judged on the **MacBook 13" built-in**. The
  `.health-fit` model (in `healthChrome.css`): the page is pinned to
  `height: var(--health-vh, calc(100vh - 220px))` with `overflow: hidden`, a flex
  column; the inner fade wrapper is `flex: 1; min-height: 0`, and the page's primary
  content (Sleep lanes / Body table rows) is the **flex-grow child** that fills exactly
  to the fold. `--health-vh` is the single tuning knob.
  > NOTE: the **220px** offset is an **empirically-tuned value for the owner's 13"
  > built-in** (masthead ~165px + page padding ~32px + slack), **not a constant** — it's
  > the fitted height for *this* screen and will need re-tuning for a different
  > viewport/masthead. `--health-vh` exists precisely so it can be overridden without
  > touching the model.
  > *(corrected 2026-07-15 — Part C §C2: this whole model was REPLACED. `.health-fit` is now
  > `height: 100%`; `--health-vh` and the `calc(100vh - 220px)` guess are deleted. The masthead
  > measures **123px**, not ~165px — the bad guess left a 97px dead strip, now fixed.)*
- **Hour-time language.** Clock times throughout; noon-anchored (Sleep dials/band) and
  18:00→12:00 (Sleep 7-night clock) axes so evening→morning reads without midnight wrap.
- **Motion = subtle life.** Page **fade-up** (`.sleep-fade` / `.body-fade`), cross-fade on
  range switch (keyed fade wrapper), gentle **draw-in** (Sleep stage blocks `stl-grow`),
  hover transitions; all gated by `prefers-reduced-motion`.
- **Loading = skeleton broadsheet** (replaces the spinner); **fetch failure = inline
  error + retry**. Both shared kit.

### The BAND SYSTEM (three types — when each applies)
| type | metrics | source | render |
|---|---|---|---|
| **fixed-clinical** | BMI (18.5–25), blood_oxygen (95–100) | `fixedBand()` + `FIXED_BANDS` (healthBodyRange) | shown from the first reading (no floor) |
| **personal** | resting_HR, respiratory | `baselineBand()` p10–p90 over 90d | **hidden until ≥14 daily readings** ("n/14") |
| **journey** | weight, body_fat | `goalProgress()` (anchored at first reading) | a progress bar toward the target |

> ⚠️ **CLARIFICATION for P3 (this corrects the "shared band visual" framing):** the
> *shaded-region-behind-the-line* band is **Body-only** — `BodyChart`'s `.body-chart-band`
> rect (range charts) plus the table cell band (`.bt-band`). **Sleep does NOT use a
> behind-the-line band**: Sleep's "band" is the **clock-dial min–max envelope arc**
> (`.dial-band`, fed by `clockExtent`), a different visual on a different component. So the
> band *system* (the three types) is a real shared concept, but the band *render code* is
> NOT shared between Sleep and Body. P3 should treat the dial arc as Sleep-signature and
> the chart/cell band as Body's; only the verdict logic (`fixedBand`) is common.

## 2. SLEEP V2 (P1) — final as-built
Commits: calc `0dfbf03` · sub-1 layout `0b62d1c` · sub-1 deletion `f4b414e` ·
sub-2 layout `04f9c61` · sub-2 deletion `c9ca58c`.

- **"Last night" — three full-height columns, full-height hairline rules:**
  - **Left (journey):** a fixed-length spine — `● in bed 22:28` → **8h 2m** (modest,
    terracotta, the column's one accent) → `○ woke 06:46`; below, a 2×2 footer
    (target/on-time · goal · respiratory · awakenings).
  - **Centre (stage timeline):** four lanes **Awake / REM / Core / Deep** with faint
    vertical **hour gridlines**; hovering a block shows "stage · clock range · duration",
    mouse-out **clears** (the old caption was removed). A bottom-pinned 2×2 stage readout
    (min + %). Segmentless nights fall back to the proportion band.
    > *(corrected 2026-07-15 — Part C drift ledger): the footer no longer shows respiratory or
    > awakenings (both CUT, Piece 2); the stage readout is TOP-aligned under the lanes, not
    > bottom-pinned; the dial **avg** marker is INK (`.dial-avg`), the terracotta is the min-max
    > band; the clock columns are **22:00→12:00** (not 18:00→12:00) and span **any range**.*
  - **Right (rhythm):** two **12-hour clock dials** (Bed, Wake) — hairline circle, 4
    cardinal ticks (no numerals), a faint terracotta **min–max envelope arc**, **avg** =
    terracotta radial tick, **median** = hollow ink dot, avg time in Fraunces below; then
    the **seven-night clock columns** (18:00 top → 12:00 bottom, each night's block at its
    true clock position with stages stacked, hour labels on the right divider, hover →
    bed · wake · asleep).
- **Aggregate (Week / Month / 90-day):** chrome row → full-width **stats row** (avg
  duration hero · avg bed · avg wake · goal X/N · awake avg · baseline) → **stacked
  per-night stage bars** (terracotta goal line; per-bar duration labels on Week only,
  hover-readout on Month/90) → right **ledger** (goal X/N + streak + target · rhythm ·
  **consistency — Week only**, it's a 7-night metric · awakenings). **90-day collapses to
  ~13 weekly bars** (each = that week's average night), **hides the baseline** (no window
  > 90), and a weekly bar **drills to that week** (Week view anchored to it, with a
  "week of X" breadcrumb crumb).
- **Snapshot re-baseline (not a code change):** bed/wake are **22:28 / 06:46** (Amsterdam).
  The earlier recon snapshot's 20:28/04:46 was a recon read error (CLI rendered UTC); the
  app always displayed Amsterdam. Derived stats unaffected (std-dev is shift-invariant).
- **New calc:** `circularMedianClock`, `clockExtent` — moved into **`healthRhythm.js`**
  (with the pre-existing `averageClock` + `rangeBedWakeAverages`) to keep `healthSleep.js`
  under the size guard.

## 3. BODY V2 (P2) — final as-built
Commits: P2.0 extraction `15f9736` · calc `b3a41ee` · layout `7cc8b25` · deletion `8056c9f`.

- **The "Scale Ticket" table — three groups, columns
  `METRIC · LATEST · MOVEMENT · 90-DAY TRACE · TARGET/BAND`**, each group an uppercase
  eyebrow + 2px top rule + a **freshness note** (the honest two-source flag).
  | group | metrics | LATEST = | TARGET/BAND |
  |---|---|---|---|
  | **Composition** (now) | weight, body_fat, lean_mass, **BMI** | latest raw | weight/body_fat journey bars · lean trend-only · **BMI fixed band 18.5–25** |
  | **Energy** (to yesterday) | **active_energy**, **resting_energy** | latest completed day total | **active_energy days-hit** move-goal · **resting_energy greyed** "waiting for first sync" (0 rows) |
  | **Vitals** (7-day) | resting_HR, respiratory, **blood_oxygen** | 7-day avg | RHR/resp **personal band** (hidden <14 → "n/14") · **blood_oxygen fixed 95–100** |
- **Two-source join:** Composition/Vitals = `body_metrics` (point/7-day); Energy =
  `activity_hourly` daily totals to yesterday (the page's **first `healthActivity`
  import**). The per-group freshness labels make the differing semantics explicit.
- **New calc:** `activityDaysHit` (in `healthActivity.js`) — `nightsHitGoal`-shaped:
  X of N days in the window whose daily total hit the target, no streak. Verified vs real
  data (target 500 → 4/7).
- **Range views (Week/Month/90):** the **same table, widened** — LATEST → range average,
  MOVEMENT → `windowDelta`, 90-DAY TRACE → a **compact full chart** (line + shaded band +
  goal line, no axis ticks; `BodyChart` gained a `compact` mode). Weight keeps its goal line.
- **Bottom summary bars (kept):** fat/lean split (composition bar, ratio-mode fallback
  preserved) + weight-to-goal journey bar.
- New files: `bodyGroups.jsx` (group builders), `BodyCells.jsx` (Movement/Trace/Journey/
  Band), `BodyTable.jsx`, `BodySummary.jsx`. `bodyFormat` META added for the four new
  metrics. Dead `BodyTile` + V1 tile CSS removed.

## 4. SHARED KIT REALITY (P2.0 + what P3 must resolve)
**Actually shared today** — `src/health/healthChrome.css` (imported by both pages):
`RangeSwitcher` (`.range-*`), `Breadcrumb` (`.crumb-*`), `Skeleton` (`.skeleton`/`.sk-*`),
`InlineError` (`.inline-error*`), and the **`.health-fit` / `--health-vh`** fit model.

| piece | status | P3 verdict |
|---|---|---|
| `.sleep-chrome` vs `.body-chrome` | ~~**duplicated**~~ **DONE (P3): merged → one `.health-chrome`** *(corrected 2026-07-15)* | ✅ |
| `.sleep-fade` vs `.body-fade` | **duplicated** (same fade-up + fit inner-child rule) | **consolidate** → one `.health-fade` |
| `.skeleton` grid template | shared base is **Sleep-shaped** (3-col 260/1fr/300); Body overrides to `repeat(4,1fr)` | **consolidate** → make the column template a prop/variant, not hard-coded |
| **band render** | **NOT shared** — Sleep `.dial-band` (clock arc) vs Body `.body-chart-band` rect + `.bt-band` cell | **signature, leave** (only `fixedBand` verdict logic is common) |
| **hover readout** | Sleep-only (timeline `.stl-caption`, clock `.bw-readout`, dials); Body table is static reads | **signature, leave** |
| "condensed tile" (build-doc Part B §3 named it shared) | **did not materialise** — Body went **table rows** (`.bt-row`), Sleep has its own pieces; no shared tile emerged | **drop from the shared-kit plan** |

## 5. CARRIED FLAGS / DEBT
- **Dead goal-bar path:** `GoalBar` / `GoalWaiting` / `GoalPrompt` are still imported by
  `BodyComposition` but **never rendered** (BodySummary passes `goals=[]`; the Latest
  journeys use `BodyCells.JourneyBar`). Harmless; a cleanup can drop that path. (`.body-goal*`
  CSS + `.body-tile-label` are still referenced by these, so kept.)
- **active_energy MOVEMENT = 7-day delta in all ranges** — `activity` has no range-windowed
  delta getter; adding one would be new calc, **deliberately avoided**.
- **Move-goal direction force-"up"** — done at the Body submit site, **scoped to
  active_energy only** (GoalEditor's value-inferred direction is wrong for "hit at least").
  weight/body_fat keep inferred direction; Food untouched (separate write path).
  > **FORWARD-FLAG for P4 Activity:** Activity will surface the same activity-hourly
  > move-goals (e.g. steps, flights, stand_minutes). It **must apply the same direction-
  > force** ("up") — either by **sharing the Body submit path** (lift the active_energy
  > submit handler into a shared helper that forces "up" for the activity move-goal set) or
  > by replicating the scoped override. Do NOT let P4 fall back to GoalEditor's value-
  > inferred direction for any move-goal.
- **`HealthStub.jsx`** — still dead (17 lines, 0 importers). **P5 deletes.**
  *(corrected 2026-07-15: already DELETED — no `HealthStub` reference exists under `src/`. This
  line and the §10 deletion-list entry are historical only.)*

### Operational carry-forwards — resolve BEFORE P4 (Activity) builds the affected tiles
- **walking_speed units magnitude-check.** Real data reads **~4 m/s** for walking, which is
  implausibly fast (≈14 km/h). Likely a **units bug at the Shortcut/source**. Verify the
  magnitude (and unit) on a real push **before** P4 renders a walking_speed tile, or the
  tile will show a wrong number. (`walking_step_length` ~57 cm and `walking_heart_rate_avg`
  ~110 bpm read sane — speed is the suspect one.)
- **Plain `heart_rate` (activity) stays OFF until the Shortcut sends RAW samples.** The
  corrupt pre-summed `heart_rate` rows were purged (P0b); the ingest averages correctly,
  but the Apple Shortcut was sending one pre-aggregated value/hour, so re-sent data is junk
  (avg ~thousands of "bpm"). **Do not surface any activity heart_rate in P4** until the
  Shortcut is fixed to send raw per-reading samples. (`walking_heart_rate_avg` is a separate,
  already-averaged metric and reads sane — this caveat is the *plain* `heart_rate` series.)

## 6. AMENDMENTS LEDGER — P1/P2 additions (continue the original §9 numbering, 10+)
10. **Sleep aggregate hero = stacked bars (mockup-1)**, not the trend-line §4A named.
    *Why:* owner pick; matches the generated Week/Month mockups; reuses bar logic.
11. **Sleep "Last night" = the "Stage timeline" mockup** (owner pick from 4 variations).
12. **`healthSleep.js` split → `healthRhythm.js`.** *Why:* the two new rhythm getters
    pushed it past the ~250 guard.
13. **90-day Sleep = weekly-bar collapse + anchored-week drill** ("week of X" crumb).
    *Why:* 90 nightly bars are unreadable; weekly averages + drill keep it legible.
14. **Body = the "Scale Ticket" table** (V3 mockup direction), not the tile mockups
    (v1/v2/v4). *Why:* the table was the only mockup with a natural home for BMI/SpO2 and
    a new Energy group; its `TARGET/BAND` column neutrally holds bands AND the move-goal.
15. **P2.0 chrome/fit extraction** (`healthChrome.css`, rename `.sleep-page--fit` →
    `.health-fit`). *Why:* prerequisite so Body could reuse the P1 kit without loading
    `sleepPage.css`; a step not in the original order.
16. **active_energy move-goal = days-hit** (`activityDaysHit`) + **forced "up" direction**.
    *Why:* a daily "hit at least X" goal isn't a journey-to-target; days-hit (X/N) fits.
17. **`BodyChart` gained a `compact` mode** (table-cell range charts: line + band + goal,
    no ticks). *Why:* a native-aspect full chart would overflow a table row and break
    zero-scroll.
18. **Snapshot re-baseline to Amsterdam bed/wake** (recon error, not a code change). *Why:*
    the recon read UTC from the CLI; the app always rendered Amsterdam.
19. **Sleep consistency omitted on Month/90 (shown on Week only).** *Why:* `bedtimeConsistency`
    is a fixed **7-night** metric; showing it under a "month/90-day" frame would mislabel its
    window. **Honest omission beats a mislabelled stat.** A windowed-consistency getter is a
    noted future item, not built.

## 7. CALC FOOTPRINT (the whole upgrade)
**Three new view getters added across P1+P2:**
- `circularMedianClock(minsList)` — robust median bed/wake (noon-anchored). *(P1, healthRhythm)*
- `clockExtent(minsList)` — earliest→latest envelope for the dial band. *(P1, healthRhythm)*
- `activityDaysHit(rows, {target,direction,end,days})` — move-goal X/N days-hit. *(P2, healthActivity)*

**Plus the P0c calc-layer prep** (pre-P1, already shipped): `healthActivity` SUM/AVG metric
lists + the **avg-over-active-hours** rule (a 0-value mobility hour = "didn't happen", not
rate 0); `healthStats` DEADBAND entries for the new metrics; `healthBodyRange.fixedBand` +
`FIXED_BANDS`; `bodyFormat` META.

**Standing rule, intact:** everything else stayed **compute-on-read / presentation** — no
derived numbers stored. The one recorded storage exception remains BMI (Amendment #1 in the
original §9 — stored verbatim from the device, not derived from weight/height).

---

# PART B — ORIGINAL LOCKED INTENT & DECISION ARCHAEOLOGY

> These are the original sections 0–11 as locked **before** the build. They are kept for the *why*
> behind each decision and for the parts not yet built. Where Part B and Part A disagree about
> **Sleep/Body, Part A (as-built) wins.** **Activity (§4C), Gym (§4D + §8), and the close (§7 P4/P5,
> §10–11) remain LIVE forward spec.**

---

## 0. What V2 is

A full UI/UX rework of the Health module's three faces, plus ten new Apple-Health data points,
evolved in place. *(Originally eleven — `walking_steadiness` dropped 2026-06-30: the owner's
device records no steadiness data. See Amendment #9.)* The faces stay three (Sleep / Body / Gym); **Gym grows to hold a new Activity
section** (this closes the long-open Layer-4 IA question — no fourth card).

- **Sleep** — presentation-only rework. **No new metrics, no calc or ingest changes.** Its
  snapshot numbers must come out byte-identical; only the skin moves.
- **Body Composition** — rework + four new metrics (`bmi`, `blood_oxygen`, `active_energy`,
  `resting_energy`). Becomes a **two-source page** (point readings + daily-total shape).
- **Activity (inside the Gym page, below training)** — new section, six metrics (`steps`,
  `stand_minutes`, `flights_climbed`, `walking_speed`, `walking_heart_rate_avg`,
  `walking_step_length`). Inherits the interaction system wholesale.
- **Gym front page** — reopened for a full zero-scroll respec (the deferred Form-Guide debt) and
  to host Activity. **Recon-gated** — Gym internals were never mapped; its piece begins with a
  characterisation.

The single biggest fact for risk: **there are NO schema changes in this entire upgrade.** Every
new metric rides an existing generic shape (`activity_hourly` free-text `metric_type`,
`body_metrics` generic, `health_goals` append-only). No checker gate anywhere. Two-track
discipline still holds: backend (`supabase/`), db-data (`db/`), and `src/` commits never mix.

---

## 1. Project / stack facts (for the Builder prompt header)

React + Vite; plain CSS (no Tailwind); Supabase Postgres (Frankfurt, ref `cntlptuacsujbdtwvbis`
— never touch the old Ireland project); Vercel; GitHub `chrisolmosvv/lifeos`. Edge Functions in
Deno/TypeScript. Apple-Health data arrives by PUSH — an Apple Shortcut fires 4×/day into the
`health-ingest` Edge Function.

**Design laws:** desktop zero-scroll (target), calm (law), no clutter. When zero-scroll and calm
fight, **calm wins** — but V2's whole mechanism (broadsheet columns + detail-in-hover/ranges) is
designed so they don't have to.

**Aesthetic tokens:** Fraunces serif headlines, Inter body/UI; paper `#F6F5F1`; near-black ink;
terracotta `#C8643D` used sparingly; hairline rules, never boxes; no shadows (narrow exception:
faint elevation on a lifted/active block only — not used here, since hover reveals a readout
rather than lifting tiles).

---

## 2. HARD RULES (paste into every piece, unchanged)

```
- ADDITIVE-ONLY ON THE SPINE. Never alter the tasks/events/categories spine, no FK into it.
- TWO-TRACK COMMITS. src/, supabase/, and db/ NEVER share a commit.
- BASELINE BEFORE TOUCH. The approved V1 Behavioural Snapshot is the only definition of "still
  works." Re-verify untouched behaviour against it after every piece.
- EVOLVE IN PLACE, NEVER FORK. No parallel V2 copy. The module stays working at every commit.
- PROVE-IT'S-DEAD DELETION. Find EVERY reference before removing anything. Deletion is its OWN
  commit, AFTER its replacement verifies live.
- REUSE BEFORE ADD. Extend the existing calc/kit/component layer before writing anything new.
- COMPUTE-ON-READ. Derived numbers live in the pure calc layer, never stored. (ONE recorded
  exception this upgrade: BMI — Amendment #1.)
- RLS owner-only on every table. Free-tier services only. Frankfurt project only.
- ONE day-boundary truth (the shared Amsterdam-day helper, gymDates.js). Reuse it.
- VERIFY-DON'T-TRUST. "Deployed is not done." Owner witnesses results on his devices; for writes,
  verify the ROW landed (by updated_at / new rows), not the screen.
- RECON BEFORE CHANGES. Confirm the V1 Map against live state before touching anything.
- DOOM-LOOP RULE. If a fix compounds the problem, STOP and roll back to the last save point.
- DESIGN LAWS: desktop zero-scroll (target), calm (law), no clutter. Calm wins if they fight.
```

---

## 3. The locked interaction system (applies to ALL surfaces)

This is the spine of the rework. Sleep and Body are fully specced against it; Activity inherits it;
Gym inherits it once its zones are mapped.

- **Full-width broadsheet multi-column.** Sections become columns across the viewport, separated
  by **vertical hairline rules** (the one new layout primitive). Columns are the mechanism that
  makes honest zero-scroll achievable.
- **Range switcher: top-right, no title** (preserves the V1 Body decision — freshness lives
  per-metric). A **segmented control**, a single shared `RangeSwitcher` component, **identical
  position on every surface**. Ranges: **Latest / Week / Month / 90-day** (Sleep relabels
  "Latest" → "Last night").
- **Range switch = quick cross-fade**, no loading state — data is loaded once per open, every
  reframe is an instant recompute (compute-on-read), never a refetch.
- **Detail lives in hover + range views; Latest stays minimal.** This is the governing density
  principle — zero-scroll is achieved by relocating detail, never by shrinking or scrolling.
- **Hover reveals a chart readout: value + date + delta vs goal/baseline**, across every chart
  (one language, extends the hypnogram's existing tap/hover). Adapts per metric — delta-vs-goal
  for weight, delta-vs-band for BMI/SpO2, delta-vs-baseline for trend-only.
- **Tiles are reads — no per-metric drill-in** (V1 decision preserved; hover gives the detail in
  place). The one real drill-in is Sleep bar → night, which keeps its routed sub-view.
- **Bands render as a soft shaded region behind the line** — same visual for fixed-clinical and
  personal bands; only the source of the bounds differs.
- **Motion = "subtle life":** page fade-up on open, cross-fade on range switch, gentle chart
  line-draw/fade-up, hover transitions. Restrained, never flashy.
- **Loading = a skeleton broadsheet** (placeholder columns/tiles that fill in) — replaces the V1
  spinner. **Fetch failure = inline error + retry**, calm, no crash.
- **Navigation: hub-and-spoke** (unchanged routing). The **Hub stays 3 cards, restyled to
  broadsheet.** Return affordance = a **breadcrumb (Health / Body)**, replacing the "← Health"
  back link, applied uniformly.
- **Desktop-only target.** Desktop is the design target, the zero-scroll judge, and the
  verification surface. The grid still reflows **2-up → 1-up** on narrow widths so it isn't
  broken on iPhone, but that's a free CSS safety net — **no hover-readout on touch, mobile polish
  deferred** to the future mobile layer.
- **Kit: shared where natural, signature per-surface.** Shared (into a common Health kit):
  `RangeSwitcher`, skeleton, inline-error, breadcrumb, band overlay, hover-readout, column rules,
  condensed tile, the extended `BodyChart` line engine. Signature (stay in-surface): Sleep's
  glance band, the hypnogram, the composition bar.
- **Tokens: one shared base, per-surface accent moments.** Type scale, hairline weights, gutters
  identical across surfaces.
- **Terracotta = affordances + goal lines + sleep-Deep, extended to the new active-energy goal
  line. Never status, never an alert colour.** An out-of-band BMI/SpO2 is carried by its band,
  not by turning terracotta.

---

## 4. Per-surface locked spec

> **SUPERSEDED for Sleep + Body by Part A (as-built).** 4A and 4B below are the ORIGINAL INTENT, kept for archaeology; what shipped differs (Sleep aggregate hero became stacked bars, not a trend line; Body became the Scale Ticket table). **4C Activity and 4D Gym remain LIVE spec — not yet built.**

### 4A. Sleep — presentation-only rework (no new data)

> **SUPERSEDED — see Part A §2 (Sleep V2 as-built).** Below is the original intent.

- **Ranges:** Last night / Week / Month / 90-day. (Calc already exposes 90-day via
  `PRESETS = [7, 30, 90]` — page-level change only.)
- **"Last night" view:**
  - **Hero = a new glance band:** big duration numeral, four stage chips beside it (REM / Core /
    Deep / Awake, min + %), vs-goal as a sub-line. (New kit primitive.)
  - **Secondary (elevated) = bedtime consistency / regularity** — the std-dev spread, the
    regularity word, the week bed/wake dot band.
  - Hypnogram below the band; then bed/wake times, awakenings/awake-min, that night's resp.
  - *Exact vertical order (hypnogram vs consistency) is a layout-pass decision — not pre-locked.*
- **Aggregate (Week / Month / 90):** **avg-duration trend line as hero** (extend the `BodyChart`
  line engine — one chart language with Body), per-night stacked stage bars below; summary = avg
  duration, circular-mean bed/wake, goal streak, nights-hit, 90-day baseline compare.
- **Empty/sparse:** behaviour preserved, restyled to the new language — segmentless-night
  proportion band, sleep-gap disabled bars, consistency hidden in ranges, no-resp "—",
  no-goal prompt. **The snapshot must verify byte-identical in behaviour.**

### 4B. Body Composition — rework + new metrics (two-source)

> **SUPERSEDED — see Part A §3 (Body V2 as-built).** Below is the original intent.

- **Three groups:**
  - **Composition:** weight (goal-line) · body_fat (trend) · lean_mass (trend) · **BMI**
    (fixed band 18.5–25). Plus the fat-vs-lean composition bar — **kept and restyled**, ratio-mode
    fallback behaviour preserved.
  - **Energy:** **active_energy** (move-goal + trend) · **resting_energy** (trend-only). Daily
    totals sourced from `activity_hourly` via the `healthActivity` calc layer (the Body page's
    first import from `healthActivity`).
  - **Vitals:** resting_heart_rate (personal p10–p90 band) · respiratory_rate (personal band) ·
    **blood_oxygen** (fixed band 95–100).
- **Band/overlay treatment is per-metric, not per-group** — universal-clinical metrics
  (BMI, SpO2) get fixed reference bands; personal-variation metrics (RHR, resp) keep personal
  baselines; weight keeps its goal line; fat/lean are trend-only. (Fixed band is a small new
  primitive alongside the existing personal `baselineBand` in `healthBodyRange`.)
- **Latest layout:** Composition is the **wide lead column** (full tiles + sparklines, hover
  lives there); Energy and Vitals are **narrower columns, number + trend arrow only** — their
  charts + hover move to the range views.
- **Range views:** all new metrics as extended-`BodyChart` lines, soft shaded bands overlaid.
- **No-data-yet:** a greyed **"waiting for first sync"** tile (Amendment #5 — a behaviour change
  from V1's "no data yet"). The stale-but-exists state (latest value + age) is unchanged.
- **active_energy goal:** a new `health_goals` goal_type (direction up), additive — generic
  resolvers light it up with no migration. The `GoalEditor` write path extends to take it; the
  active_energy tile gets a move-progress treatment. **⚠ RECON GATE (§6).**
- **Hub Body card:** light restyle, same content (the latest-raw-RHR vs Vitals-7-day-avg quirk
  persists by that choice).
- **BMI stored verbatim** (Amendment #1) — body_metrics point reading; the generic body ingest
  path takes it with zero code once the Shortcut sends it.

### 4C. Activity — new section inside the Gym page (below training)

- **Two groups:** **Activity** (steps / flights_climbed / stand_minutes — cumulative daily
  totals) + **Mobility** (walking_speed / walking_heart_rate_avg / walking_step_length —
  averages). *(walking_steadiness dropped — no device data; Amendment #9.)*
- **Hero = steps** (full treatment; the rest condense — mirrors Body's lead-column pattern).
- Inherits the entire interaction system: same switcher, hover-readouts, skeleton, motion,
  condensed tiles. Almost pure inheritance — minimal genuinely-new surface.
- Reuses `healthActivity` + the condensed tile (same shape as Body's Energy group).

### 4D. Gym front page — full zero-scroll respec (RECON-GATED)

- **Approach locked; per-zone layout NOT pre-specced** — Gym's internal zones, its calc, and its
  overflow points were never mapped. The Gym piece **begins with a characterisation** (§7), then
  applies the locked system.
- **One range switcher governs the whole Gym page** (training + Activity) → the existing training
  zones become **range-switchable** (Latest/Week/Month/90). **⚠ This is the heaviest, most
  uncertain item — feasibility gate in §6.**
- Gym inherits the "subtle life" motion language (Amendment #2 — overturns Gym's "static reads
  calm" call, for module coherence).

---

## 5. Schema / ingest verdict

> See also **Part A §5 Operational carry-forwards** — the walking_speed units magnitude-check and the plain heart_rate raw-sample gate, both to resolve BEFORE P4 Activity.

**No schema changes. No checker gate.** Confirmed against the V1 Map: `activity_hourly` is
free-text on `metric_type`, `body_metrics` is generic, `health_goals` is append-only and generic.

**Backend code change — ✅ DONE (P0a, commit `e7d2f1d`, deployed + verified live).** Extended the
`activity.ts` `METRICS` map (a hard allow-list — an unlisted metric_type is *skipped*):

| metric_type             | agg | unit  | for                | status            |
| ----------------------- | --- | ----- | ------------------ | ----------------- |
| `resting_energy`        | sum | kcal  | Body / Energy      | flowing           |
| `stand_minutes`         | sum | min   | Activity           | flowing           |
| `flights_climbed`       | sum | count | Activity           | flowing           |
| `walking_speed`         | avg | m/s   | Activity / Mobility| flowing           |
| `walking_heart_rate_avg`| avg | bpm   | Activity / Mobility| flowing           |
| `walking_step_length`   | avg | cm    | Activity / Mobility| flowing           |
| `walking_steadiness`    | avg | %     | (dropped)          | **wired, unused** |

(`steps`, `active_energy`, `heart_rate` already present. `bmi`, `blood_oxygen` need NO ingest code
— they ride the generic body branch once the Shortcut sends them.)

> **`walking_steadiness` left in the map deliberately** (Amendment #9): the entry is inert when
> nothing is sent, so removing it would be a backend commit + redeploy for zero functional gain —
> and it's ready if a future device ever records steadiness. No tile/getter is built for it.

> **Shortcut lesson (2026-06-30): decimal locale broke JSON.** The owner's NL locale rendered
> decimal values with a comma (`113,5`), which is invalid JSON → `bad_json`. Whole-number metrics
> (steps/stand/flights) were unaffected; every *decimal* metric failed. Fix lives on the device:
> a per-sample Replace `,`→`.` on the value before the JSON Text block (must NOT touch the
> structural commas between samples/fields). All eight flowing metrics confirmed after the fix.

**Data cleanup (own commit, `db/`, guarded SQL like db/26 — NOT checker-gated, no ALTER):** purge
the corrupt `activity_hourly.heart_rate` rows (avg ~1965 bpm, max 53,392).

**Owner device task (a gate, not a commit):** fix the Apple Shortcut to send **raw per-sample**
HR before any HR surfaces. `walking_heart_rate_avg` carries the same pre-aggregation risk class as
`heart_rate` — its display is gated behind this fix.

---

## 6. Recon gates (must clear before the relevant build)

1. **Food / `health_goals` leak check (before the active_energy goal builds).** `health_goals` is
   shared with the Food module (`foodCalc.js` imports `presetRange`/`statsForRange`; `LogPage.jsx`
   imports `fetchGoals`/`resolveGoals`; Food stores calories/protein/carbs/fat goal rows there).
   Recon MUST confirm Food consumes goals by **specific keys** (so a new `active_energy` goal can't
   surface in Food's UI) and that the `GoalEditor` write path adds the new goal_type without
   special-casing. This is the one cross-track ripple in the upgrade.
2. **Gym-calc range feasibility (#1 Gym question).** Can the gym calc reframe its training zones by
   an arbitrary Latest/Week/Month/90 range? If it already computes volume/sessions over arbitrary
   windows → this is layout. If not → it's a real calc-extension and the heaviest item; surface it
   before committing to the page-wide switcher.
3. **V1 Map drift.** The Sleep/Body/pipeline map is a session old — recon re-confirms getters,
   consumers, and routes still exist as mapped before any change.

---

## 7. Risk-ordered build order

> **STATUS:** P0a/P0b/P0c, **P1 (Sleep)**, **P2.0 (shared-kit extraction)** and **P2 (Body)** are SHIPPED and owner-verified — see Part A for as-built detail + commit refs. **NEXT = P3 (shared-kit consolidation).** P4 (Gym, recon-gated) and P5 (close) remain live.

Pipeline-in first (the rework has nothing true to render until the new series flow), then the
fully-characterised surfaces, then the recon-gated Gym piece. Commit (save point) before each;
schema/db/backend/src never mix; the module stays working at every commit; each REPLACE piece
pairs with a SEPARATE deletion commit after its replacement verifies live.

**PREP — backend + data + calc (no UI):**
- **P0a — `activity.ts` METRICS extension** (§5 table). ✅ **DONE** — commit `e7d2f1d`, deployed +
  verified live; eight new metrics confirmed flowing from the owner's Shortcuts (after the
  decimal-locale fix). No checker.
- **P0b — heart_rate purge.** `db/` guarded data SQL, own commit. *(Owner: fix the Shortcut.)* ← **NEXT**
- **P0c — calc getters.** Extend `healthActivity` for the new activity/mobility metrics
  (daily totals / averages); confirm `healthBody`/`healthBodyRange` produce bmi/blood_oxygen/energy
  view-models; add the fixed-band primitive to `healthBodyRange`. **Verify against REAL data** —
  and note **most new metrics have zero rows today**, so verify shapes + the empty-data path
  explicitly. Own commit; show the owner the numbers before any screen reads them.

**SURFACES (fully characterised):**
- **P1 — Sleep rework** (lowest risk, presentation-only). Build the broadsheet layout, glance
  band, consistency-secondary, aggregate trend line, shared switcher, skeleton/error/breadcrumb,
  subtle motion. **Verify new behaviour vs spec AND re-verify the snapshot byte-identical**
  (the 8h 2m night, the empty/sparse cases). Then a deletion commit for any superseded Sleep V1 UI.
- **P2 — Body Composition rework.** Three-group broadsheet, Energy via `healthActivity`, fixed +
  personal bands, condensed columns, composition-bar restyle, no-data tiles. Wire the
  **active_energy goal end-to-end first** (after recon gate #1) — set → display → reload → change →
  clear — verify the ROW lands in `health_goals` (new active row on set, active:false on clear),
  forced-failure (Wi-Fi off) reverts with a toast. Verify + snapshot. Deletion commit.
- **P3 — Shared kit consolidation.** As the shared pieces emerge from P1/P2, extract them into the
  common Health kit (RangeSwitcher, skeleton, inline-error, breadcrumb, band overlay, hover-readout,
  column rules, condensed tile). Reuse-before-add; don't leave two sources of truth.

**GYM (reopened, recon-gated):**
- **P4a — CHARACTERISE the Gym front page** (the prompt in §8). Map zones, gym calc, snapshot,
  and the **gym-calc range-feasibility verdict** (recon gate #2). STOP and report; the Planner +
  owner approve before P4b.
- **P4b — Gym zero-scroll respec** + range-switchable training (per the feasibility verdict),
  applying the locked system and inheriting the motion language. Verify per-zone against the Gym
  snapshot.
- **P4c — Activity section** below training (inherits the system). Verify. *(HR/walking-HR display
  gated on the Shortcut fix.)* Deletion commits paired.

**CLOSE:**
- **P5 — Polish + sweep.** Zero-scroll honesty on the owner's actual screen (calm wins if a surface
  can't fit); accent-sparing pass; final dead-code sweep — including deleting **`HealthStub.jsx`**
  (17 lines, confirmed dead, imported nowhere). Then the docs-only close ritual (§9).

---

## 8. Gym characterisation prompt (paste to a fresh Builder for P4a)

```
LifeOS — Track S — Gym front page + new Activity section: CHARACTERISE (no changes yet)

You're the executor in a 3-instance relay. I'm Chris, sole owner; I don't read code. We are
upgrading the Health module. Two things now reach the Gym front page: (1) a full layout respec to
hold desktop zero-scroll (the deferred Form-Guide debt), and (2) a new ACTIVITY section below the
training zones. A single Latest/Week/Month/90 range switcher will govern the WHOLE page, so the
training zones must become range-switchable — confirming whether the gym calc can do that is the
single most important thing this characterisation settles. Make NO changes.

Read the brain docs first — CLAUDE.md, 09-gym-form-guide.md, 10-sleep-body-stats.md,
03-decisions.md, 04-handoff-log.md.

SCOPE: the Gym/Form-Guide FRONT PAGE (reached from the Health Hub's Gym card), its calc layer, and
the activity_hourly pipeline the Activity section consumes. The rest of Gym stays sealed except as
it appears on the front page. Make NO changes.

PRODUCE THREE ARTIFACTS, then STOP:
1) GYM FRONT-PAGE V1 MAP — every zone (the headline + the ~5 full-width zones): its job, what it
   renders, the calc getter(s) it consumes, file + line count. The gym calc getters: signatures +
   what each computes, AND CRUCIALLY whether each can be reframed over an arbitrary date range
   (Latest/Week/Month/90) or is hard-wired to a fixed period (e.g. "this week"). Consumers (the
   Hub Gym card, etc. — grep the repo). Decision archaeology: WHY five stacked full-width zones,
   the recorded reason it was deferred from zero-scroll, any per-zone constraint that resists
   densifying. Flag anything whose reason you can't find.
2) ACTIVITY-READINESS NOTE — query the live DB read-only: which of steps, active_energy,
   stand_minutes, flights_climbed, walking_speed, walking_heart_rate_avg, walking_step_length,
   walking_steadiness (and the corrupt heart_rate) have rows, and how many. Confirm NO gym code
   reads activity_hourly today (the Activity section introduces it via healthActivity as a NEW
   source into the Gym page). Restate the corrupt heart_rate state.
3) BEHAVIOURAL SNAPSHOT of the Gym front page (against my REAL data) — per zone, the current
   numbers/shape; WHERE the page overflows one viewport on a normal laptop (the zero-scroll
   baseline we're fixing); empty/sparse states currently firing.

Then STOP and show me all three. Don't spec, don't propose the new layout, don't touch files.
```

---

## 9. Amendments (record openly at close — the upgrade’s most important record)

> **CONTINUED in Part A §6** — amendments 10 through 19 (the P1/P2 additions).

1. **BMI stored verbatim** — the single exception to the store-raw/compute-on-read law. Reason:
   zero ingest code, no height capture. Trade-off accepted: a stored BMI may visibly disagree with
   the displayed daily-average weight.
2. **Gentle chart draw-in** overturns Gym's "static reads calm" decision; the respecced Gym
   inherits the "subtle life" motion language for module coherence.
3. **Breadcrumb (Health / X)** replaces the "← Health" back link.
4. **Skeleton broadsheet load** replaces the spinner.
5. **Greyed "waiting for first sync"** replaces the V1 "no data yet" tile.
6. **IA resolution:** three faces stand; Gym grows to hold Activity (closes the long-open Layer-4
   "how do the three faces coexist" item).
7. **One range switcher governs the whole Gym page** → training zones become range-switchable
   (deeper than densification; feasibility recon-gated, gate #2).
8. **Sleep range model** Night/Week/Month → Last night/Week/Month/90-day (aligns with Body).
9. **`walking_steadiness` dropped** (2026-06-30) — the owner's device records no steadiness data.
   Removed from the Activity/Mobility group (Mobility now three metrics; total ten). The P0a
   allow-list entry is left in place as inert/wired-but-unused (removing it would be a needless
   redeploy).

---

## 10. Provisional deletion list (prove dead before removing — own commits)

- **`HealthStub.jsx`** (17 lines) — confirmed dead code, imported nowhere. Safe delete. No consumer.
- **Corrupt `activity_hourly.heart_rate` rows** — data purge (P0b).
- **The spinner pattern / "← Health" link / "no data yet" tile** — superseded by skeleton /
  breadcrumb / greyed waiting; remove where they're left standing after their replacements verify.
- **Any V1 Sleep/Body chart or tile code** the extended kit supersedes — TBD per recon; pair each
  with its replacement piece.

**Consumer cautions (do NOT delete/rename without re-pointing):** `HealthStatus.jsx` reads exact
metric_type strings (we only ADD metric_types, so safe); `health_goals` shared with Food (gate #1);
`gymDates.js` shared (untouched, reused).

---

## 11. Verify (the snapshot is the oracle)

After each piece, the owner checks two directions on his Mac:
- **New behaviour vs the spec** — numbers, shape, states.
- **Untouched behaviour vs the snapshot** — the recorded baselines that V2 wasn't meant to change
  (Sleep's 8h 2m night and its empty/sparse cases; Body's ratio-mode composition bar, the hidden
  vitals bands, the "—" trends). These must still match.
- **For the active_energy goal write:** verify the ROW (set → reload → still there; new active row
  on set, active:false marker on clear), by `updated_at`/new rows, not by the screen. Forced
  Wi-Fi-off failure must revert optimistically with a toast.
- **"Correctly absent" cases need deliberate looking** — they don't announce themselves.

Only on the owner's explicit "verified — [new behaviour] + snapshot still holds" does the Builder
move to the next piece (and only then to that piece's deletion commit).

---

# PART C — SLEEP REDESIGN (as-built, 2026-07-13 → 2026-07-15)

> **AUTHORITATIVE for the current Sleep UI.** This is the pass that ran AFTER P1/P2/P3/P4 shipped
> (see the drift ledger at the end — the P1-era prose above is now stale in the specific places it
> lists). It reshaped every Sleep surface in seven small src-only pieces plus a follow-up. No
> schema, no ingest, no calc-meaning change — presentation + one pure per-week getter reuse.
> **Where Part C and Parts A/B disagree about Sleep, Part C wins.** Appended, not rewritten:
> the older sections are left intact for archaeology.

**Commit map (src piece · docs handoff):**
Piece 1 CSS split `2068b8b` + health-fit fix `7ef19da` · `59d7fcb` — Piece 2 metric cuts `313fc2d`
· `5f06679` — Piece 3 footer rebuild `2f9b346` + band 45→60 `ce8642b` + 60/40 split `96c7734` ·
`4154227`/`2542286`/`3d12a92` — Piece 4 clock-chart generalised `6f78ce0` · `9ec9b11` — Piece 5
Week & Month adopt the chart `836e6d2` · `a5119c2` — Piece 6 90-day clock-truth `ae4152f` ·
`478a0b9` — goal-hit-rate follow-up `69ce525` · `681bb47`.

## C1. CSS split (Piece 1) — `sleepPage.css` (was 846) → six sheets
All under `src/desktop/kit/`. Present line counts:

| file | lines |
|---|---|
| `sleepPage.css` | 189 |
| `sleepNight.css` | 209 |
| `sleepAggregate.css` | 218 |
| `sleepClockChart.css` | **268** ⚠️ (over the ~250 guide — see the roadmap debt note 2026-07-15) |
| `sleepStageTimeline.css` | 90 |
| `sleepNightFooter.css` | 77 |

Piece 1's split produced **five** sheets (pure move, zero visual change, `2068b8b`); Piece 3 later
carved out the **sixth**, `sleepNightFooter.css`, when it rebuilt the footer. **LOAD ORDER MATTERS**
and is documented at the single import site, `src/desktop/health/SleepPage.jsx:17-26`:
`healthChrome.css` → `sleepPage.css` → `sleepClockChart.css` → `sleepStageTimeline.css` →
`sleepNight.css` → `sleepNightFooter.css` → `sleepAggregate.css`. Two dependency comments live
there: `:19` "must load BEFORE sleepNight.css, because Night's reflow media query overrides
.stl-lanes"; `:25` "after sleepNight.css: it owns the 40% half of the ratio". Do not reorder these
imports without re-reading those notes.

## C2. Health-wide dead-space fix (Piece 1) — shared chrome, all three faces
The `.health-fit` model no longer pins to a viewport-height guess. It is now simply
`height: 100%` (`src/desktop/health/healthChrome.css:22`), inheriting its real parent height.
`--health-vh` and its `calc(100vh - 220px)` fallback are **deleted** — they survive only as WAS-
comments (`healthChrome.css:9-12`). The `220px` guess assumed a ~165px masthead; the masthead
actually measures **123px**, so every Health page had come up ~97px short (a dead strip at the
fold). A `flex-grow` version was tried first and **correctly reverted** — the parent isn't a flex
container, so flex-grow had nothing to grow against; `height: 100%` was the honest fix. This lives
in the **shared** `healthChrome.css`, so it fixed **Sleep, Body and Gym** at once (not a Sleep-only
change). (Commit `7ef19da`.)

## C3. Metric cuts (Piece 2) — everywhere, desktop + mobile
**Cut from every Sleep surface** (Last night / Week / Month / 90-day + mobile): **awakenings** and
**respiratory rate**. Respiratory now lives on Body only (`bodyGroups.jsx`, `HubBodyCard.jsx`);
awakenings is gone from the UI entirely. Traces that remain are data-layer only and intentional:
`healthSleep.js:59` still computes `awakenings` into the night-detail object (unconsumed) and
`healthLoad.js:46` still SELECTs the column — neither renders. (Commit `313fc2d`.)

**KEPT** (deliberately — verified present): bedtime **consistency** (std-dev of bedtime, Week only —
`bedtimeConsistency`, `healthSleep.js:151`), the per-stage **segment detail line** (min + %,
`SleepNight.jsx:201-212`), the **baseline-vs-90-day** compare (`SleepRange.jsx:54-59`), the **goal
streak** (`goalStreak`, `healthSleep.js:102`), and **"awake avg"** (`SleepRange.jsx:53`). Note
"awake avg" is a **duration** (awake_minutes averaged) — deliberately distinct from the cut
awakenings **count**, and kept for that reason.

## C4. Last-night footer (Piece 3) — three rows that fill the column
The left column is an explicit **60/40 vertical split** between the journey/segment block (60%) and
the footer (40%), enforced by paired flex-basis rules meant to be edited together: `.journey
{ flex: 1 1 60% }` (`sleepNight.css:65`) and `.snv-footer { flex: 1 1 40% }`
(`sleepNightFooter.css:14`). Percentage bases (not `0`) were chosen after **flex-fill hit three
measured traps**: the spine shrinking under flex-shrink, margins double-counting outside the box
model, and padding eating the percentage before the split — read the commit CSS if that precision
is ever needed again. The footer's three rows: **Target/Goal · vs-7-night-avg / Streak ·
Restorative (deep + REM)**.

**Terracotta threshold on "vs 7-night avg" = 60 minutes** (`NIGHT_DEADBAND.sleep_duration.abs`,
`healthStats.js:53`; applied `SleepNight.jsx:127`). **The value is 60, not 45.** 45 was a mid-build
placeholder set during Piece 3; the owner **locked it at 60 after seeing what it actually controls**
(commit `ce8642b`; the history is a comment at `healthStats.js:50`). 45 must not appear anywhere as
if it shipped.

## C5. The clock chart, generalised (Piece 4) — then adopted by every view (Pieces 5-6)
`SleepClockColumns` + `sleepClockChart.js` were generalised from "seven nights" to **any range**.
- **Axis: 22:00 (top) → 12:00 (bottom)** — a 14-hour window (`WINDOW_MIN = 840`) that crops the
  dead midday hours so each night's block is big. (This replaced the older 18:00→12:00; both older
  "noon→noon" descriptions in prose/comments were wrong — see the drift ledger.)
- **Crop handling:** a night whose bedtime is **before 22:00** (or wake after 12:00) no longer
  vanishes — it pins to the window edge and fades out there ("continues beyond this line"). ⚠️
  **This is verified by construction + the pure-function logic, NOT yet by a real early night** —
  none has occurred in the owner's data. **Open verification item**, not closed.
- **Goal-met terracotta:** an individual night that hit the duration goal gets a 2px terracotta
  left edge (`.scc-block--goal`) — terracotta's one sanctioned data use in the chart.
- **onDrill** (column → night/week) and **average bed/wake marks** (ink dashed hairlines across the
  columns — ink, never terracotta) are shared by all views.
- **Stage colours (the ramp, `sleepPage.css:152-160`)** — the doc must carry the real numbers:
  Deep `#3a2e24` → Core `#6b5b48` → REM `#9e8e77` → Awake `#d2c4ac` (in-bed `#e6dccb`, generic
  asleep `#7d6d58`, other `#c0b29a`). This **replaced the old ramp** (`#423b32` → `#c9c1b2`) — both
  endpoints moved warmer/deeper.

**Week & Month (Piece 5, `836e6d2`)** now render the clock columns (per-night, stage-stacked, with
the terracotta goal-met edge), retiring the old stacked-duration bars (deleted, proved dead first).

**90-day (Piece 6, `ae4152f`)** retired its legacy bars too — **`SleepRangeLegacyBars.jsx` deleted**
— and now shows **13 weekly bed→wake spans on the same chart**. This is a deliberate, owner-locked
change of **what the bar means: clock-truth (average bed→wake position), not duration-truth (how
long)** — the two aren't the same number and one bar can't honestly show both. The weekly span is a
flat `#7d6d58` fill (stage-less; it's an average, not a night). The old duration goal-line had no
home on a timing chart and was dropped; goal context moved to the stats strip + ledger, then to C6.

## C6. Per-week goal-hit label (follow-up, `69ce525`)
Each 90-day weekly column carries a small permanent **"X/N" label** below it — nights that hit the
sleep-duration goal (X) out of nights with data (N). It reuses `nightsHitGoal` (the getter already
behind "goal 2/90 hit" and the streak), bucketed one week at a time over the **same [wStart, wEnd]
range** as that week's span, so the two always agree. A week with **zero logged nights shows
nothing** (an honest blank, not "0/0"); **no sleep-duration goal → no labels anywhere**. Small Inter
tabular numerals, **ink**. Verified in-app: two populated weeks read "1/5" (week of 2 Jul) and "1/6"
(week of 9 Jul), cross-checked against Frankfurt's `sleep_nights` (the two hits sum to "2/90").
**Terracotta on an all-hit week (X==N) was considered and explicitly declined by the owner** —
terracotta stays reserved to per-night marks; extending it to an aggregate is a new meaning, not a
free extension (see 03-decisions.md 2026-07-15).

## C7. DRIFT LEDGER — Parts A/B claims corrected 2026-07-15
The pieces above outran the P1-era prose. These claims are now **STALE** (verified against code);
the correction stands here as the authoritative record:
1. **"NEXT = P3"** (STATUS block, §7 P5 note) — STALE. **P3 shipped 2026-06-30 (`5904429`)** and
   **P4 shipped 2026-07-01**; the true remaining line was P5 (this Sleep pass + the sweep).
2. **"HealthStub.jsx still dead, P5 deletes it"** (§5, §7, §10) — STALE. **Already deleted** — no
   `HealthStub` reference exists under `src/`. It survives only in these docs.
3. **Dial average marker "terracotta"** (§2 key-legend) — STALE. The avg marker is **ink**
   (`.dial-avg { stroke: var(--ink) }`, `sleepClockChart.css:37`); the dial's one terracotta accent
   is the **min-max envelope arc** (`.dial-band`, `:30`). (A stale in-code comment at
   `SleepClockDial.jsx:6-7` still says "terracotta radial tick" — flagged for the next src touch.)
4. **Stage readout "bottom-pinned"** (§2) — STALE. It is **top-aligned, flowing directly under the
   lanes** (`.stl-caption { flex: 0 0 auto }`, `sleepStageTimeline.css:19`), not pinned to the
   container bottom.
5. **".sleep-chrome vs .body-chrome, separate, to consolidate"** (§1, §4) — STALE. **Merged into one
   `.health-chrome`** in P3 (`healthChrome.css:47`); no `.sleep-chrome`/`.body-chrome` selector
   remains.
6. **Masthead "~165px"** (§1 note) — STALE. It measures **123px** (`healthChrome.css:9`); this is
   the 97px dead-strip fixed in C2.
7. **Axis "noon→noon" / "18:00→12:00"** (§1 prose) — STALE. The chart is **22:00→12:00** (C5). Two
   in-code CSS comments (`sleepClockChart.css:3`, `:81`) still say "noon→noon" — flagged for the
   next src touch (not fixed here: docs-only commit).
