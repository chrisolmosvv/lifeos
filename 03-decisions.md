# LifeOS — Decisions

> I am the record of "what we chose and why," so we never re-argue settled
> things or contradict ourselves. LIVING doc — add to me, never silently
> reverse me. New decisions on top.

## Format
**[Decision]** — the choice. **Why:** the reason. **Trade-off:** what we gave up.

---

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
