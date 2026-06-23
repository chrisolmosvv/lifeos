# LifeOS — Handoff Log

> I am the message that lets the chats and Claude Code talk through you.
> LIVING doc. Newest entry on top. Keep entries short.

## How the relay works
You (the owner) are the messenger. Nobody reads this automatically except
Claude Code. To coordinate:

1. **Planner chat → Builder.** You discuss a phase in a chat here; it gives you
   a clear instruction. You paste that into Claude Code.
2. **Builder writes an entry here** describing what it did and how to verify.
3. **Builder → Checker chat.** You paste the latest entry (plus screenshots or
   the file it names) into a fresh "checker" chat here. Ask it to review.
4. **Checker → Builder.** The checker writes a short "fix list." You paste that
   back into Claude Code.

Tip: to give a chat here the current code, either paste the file, upload it, or
(if your GitHub repo is public) paste the raw file link and ask the chat to read it.

---

## Entry template (copy this)
```
### [date] — Phase X — <short title>
WHAT CHANGED: (1-3 bullets, plain English)
FILES TOUCHED: (names only)
HOW TO VERIFY: (exact steps the owner does, and what they should see)
KNOWN GAPS / RISKS: (anything unfinished or uncertain — be honest)
NEXT: (the single next task)
FOR THE CHECKER: (what specifically to review, if anything)
```

---

## Log

### 2026-06-23 — Phase 7, T2 — data-layer readiness audit for the Today rebuild (READ-ONLY; nothing changed)
WHAT THIS WAS: a read-only check of the LIVE Frankfurt DB (`cntlptuacsujbdtwvbis`) to
confirm, against reality, what the locked Today forms need. NO schema change, NO
migration run, NO src/ change, NO writes of any kind.
HOW I READ IT (and the access caveat): the Management API token (`SUPABASE_ACCESS_TOKEN`)
and `supabase db dump --linked` BOTH returned 403 on Frankfurt — that token only lists
and can reach the OLD **Ireland** project (`qupudazcutkbnxseciwn`, eu-west-1), which I did
NOT touch. The anon OpenAPI root is locked to service_role (401). So I read the live
schema the one available read-only way: PostgREST column probes with the anon key (an
existing column → 200; a missing one → 400 "does not exist"; a control fake column
correctly came back MISSING), plus malformed-filter probes that make Postgres name each
column's real type. This gives live, verified **column existence + types**; it does NOT
give defaults, NOT NULL/nullable, or CHECK value-sets (those need service_role / DB
password / a Frankfurt-authorised token, none of which are in this environment).
KEY FINDINGS:
- **tasks (15 cols) and events (11 cols) live exactly match the committed migrations
  (db/03_tasks.sql, db/04_events.sql) — nothing missing, nothing extra.**
- **All four form fields the spec needs ALREADY EXIST live:** `tasks.notes` (text),
  `tasks.priority` (text), `events.location` (text), `events.notes` (text). **So NO
  migration is needed for T2's form fields.** (Confirms the decisions-doc belief from
  reality, not assumption.)
- **All depended-on fields exist:** tasks.status, due_date (date), scheduled_start/end
  (timestamptz), category_id (uuid); events.start_at/end_at (timestamptz, real names —
  NOT bare `start`/`end`), category_id (uuid).
- **LOUD FLAG — the 3-state status gap:** the live `status` column exists and is text,
  but its allowed VALUES could not be read live. The migration that built it allows only
  `open`/`done` (2 states), which does NOT cover the Today pill's three states (to do /
  in progress / done). This needs confirming + a small additive change when the status
  pill (T7) is built — it is NOT part of T2's form-field check and no SQL was written for
  it here.
RESULT: **No additive migration required for T2.** The apply step that would have
followed is unnecessary. (Verbatim defaults/nullable/CHECKs, if wanted, need a one-line
query in the dashboard SQL editor — provided in the session report.)
FILES TOUCHED: 04-handoff-log.md, 02-roadmap.md (status note only). NO src/, NO db/, NO
supabase/, NO schema, NO data. No save point (nothing changed).
FOR THE CHECKER: (1) confirm this was read-only and hit Frankfurt only, never Ireland;
(2) note the access anomaly above (the token can't reach Frankfurt — worth the owner
checking project/org access); (3) the "already exists" answers are LIVE probes, not
doc assumptions; (4) the status 2-vs-3-state gap is real and lands at T7.

### 2026-06-23 — Phase 7, T1 — paper token + reusable header kit, applied to every screen (LOOK ONLY)
WHAT CHANGED: (presentation only — no behaviour, no data reads/writes, no schema)
- **Paper cooled to `#F6F5F1`** (from the cream `#F4EFE4`) in `src/theme.css` — one
  token, so it changes the whole app's background at once (incl. the login screen,
  which inherits it). Added a `--font-black` variable for the blackletter nameplate.
- **Started the reusable component kit** in a new sealed folder `src/kit/`: the five
  header blocks the broadsheet top needs — **Masthead** (the blackletter "LifeOS"
  wordmark), **Topline** (the thin uppercase strapline above it), **Folio** (the line
  under it: date · motto · live clock · edition no.), **HairlineRule**, and
  **SmallCapsLabel** (the kicker, built now for later screens). Each block is
  self-contained and its CSS lives in one `kit/kit.css` where every class is prefixed
  `kit-` and used ONLY by the kit, so a tweak on one screen can't leak to another.
- **Loaded the blackletter webfont** `UnifrakturMaguntia` (Google Fonts) — added to
  the existing font `<link>` in `index.html` alongside Fraunces + Inter (both already
  loaded, confirmed). A font is the only new asset T1 added; **no JS libraries**.
- **The folio clock ticks live and is display-only** — it reads the device clock
  (`new Date()`) and nothing else; it touches no app data.
- **Renamed the old header** `src/Masthead.jsx` → `src/EditionHeader.jsx` (and
  `masthead.css` → `editionHeader.css`) so the kit can own the name "Masthead" for
  the wordmark. `EditionHeader` now composes the kit top block (topline + blackletter
  masthead + folio + hairline) and then renders the **existing nav unchanged**.
- **Applied across screens:** the header is shared by all three logged-in destinations
  (Today / Calendar / Settings) via the single instance in `LoggedIn.jsx`, so
  upgrading that one header upgrades all three. **Everything below the header is
  untouched** — the Phase 6 calendar, task lists and settings are exactly as they were.
SACRED SAVE POINT (Step 0, the rollback target): **commit `ac665cb`** — "Phase 7 T1
save point — clean Phase 6 Today (sacred rollback)." If T1 ever needs undoing, roll
back to this.
COLOUR NUDGES: **none.** Ink (`#1C1916`) and muted-ink (`#5C564C`) actually gain a
hair of contrast on the cooler paper and read cleanly; the hairline `--rule`
(`#D8D0BE`) reads a touch warmer than the new paper but still works as a quiet
divider, so I left it. (Cooling the rule tone is a fine on-screen tweak to do together
later if you want it.)
FILES TOUCHED: index.html, src/theme.css, src/LoggedIn.jsx (header import + tag only —
the below-header rendering is unchanged); ADDED src/EditionHeader.jsx,
src/editionHeader.css, src/kit/{Masthead,Topline,Folio,HairlineRule,SmallCapsLabel}.jsx,
src/kit/kit.css; REMOVED src/Masthead.jsx, src/masthead.css (renamed). NO db/, NO
supabase/, NO data-layer or below-header file changed. `npm run build` passes clean
(116 modules).
HOW TO VERIFY (owner — on Mac AND phone):
- The paper is the cooler off-white **everywhere** (incl. the login screen).
- The **blackletter "LifeOS"** nameplate renders at the top, with the uppercase
  topline above it and the folio line below (date · motto · clock · edition).
- The **folio clock ticks** every second.
- **Below the header still behaves exactly like Phase 6:** click Today / Calendar /
  Settings and confirm nav still switches screens; the existing calendar and task list
  still look and work as before. (Nothing below the header was changed.)
KNOWN GAPS / RISKS:
- **Couldn't visually verify the logged-in masthead myself** — it only shows after a
  magic-link login, which I can't do headlessly. I verified the **build compiles
  clean** and the wiring by code; the on-screen look is your check on Mac/phone.
- **Folio/topline copy is placeholder** ("A Personal Daily" / "All the day that's fit
  to do" / "Vol. I · No. 142") — not final, easy to change in `EditionHeader.jsx`.
- **Login screen left as-is** (deliberate): it has no nav, so it keeps its own centred
  Fraunces "LifeOS" card and just inherits the new paper. If you'd like its title in
  the blackletter face too, that's a tiny follow-up — say the word.
- `SmallCapsLabel` is built but not yet rendered anywhere (it's kit groundwork for the
  module kickers in later T-pieces).
NEXT: T2 — the additive schema CHECK (then add only the fields confirmed missing;
remember `tasks` likely already has notes + priority). Flagged for the checker. Its own
save point before it.
FOR THE CHECKER: confirm (1) LOOK ONLY — no data reads/writes, no behaviour, no schema,
no new JS dependency (only the blackletter webfont); (2) nothing below the header
changed and nav still works; (3) the kit CSS is sealed (all classes `kit-` prefixed,
used only by kit components); (4) the folio clock reads the device clock only.

### 2026-06-23 — Phase 7, Piece 1c — record the Today rebuild decision (owner's explicit call)
WHAT CHANGED: (paperwork only — NO app code, NO schema change)
- Recorded in `03-decisions.md` the owner's **explicit, eyes-open decision**: Today
  (desktop) is a **clean front-end rebuild of that one screen** — an **escalation
  from Phase 7's default "re-skin, don't rewrite" stance**, made deliberately
  because Today gained substantial new behaviour (workspace calendar, status pill,
  drag-to-schedule, whole-page date-flip, the 3-level category tree). It is
  **explicitly NOT a whole-app rewrite**. Four hard guardrails are written in:
  (1) **front-end only — the data layer (reads, writes, existing tables) is
  preserved and reused untouched**; schema changes happen only via the
  separately-flagged additive pieces (category hierarchy, recurrence, the T2 field
  check), never silently inside a look/build commit; (2) **the save point before T1
  is sacred** — if the rebuild goes wrong we roll back to the working plain Phase 6
  Today, we do **not** dig (the CLAUDE.md doom-loop rule applies hard); (3) the
  rebuild **stays scoped to Today** and is not licence to rebuild other screens —
  each later screen gets its own re-skin-vs-rebuild call when reached; (4) **every
  T-piece keeps its own save point and its own owner verification on Mac and phone**
  before the next starts.
- Reflected it in `02-roadmap.md`: a Piece-1c line under Phase 7, a note tying the
  pre-T1 save point to the "sacred rollback" guardrail, and a session note.
FILES TOUCHED: 03-decisions.md, 02-roadmap.md, 04-handoff-log.md. (No src/, no db/,
no schema. 07-ux-flows.md and 06-design.md unchanged — the spec/look they hold from
Pieces 1/1b still stand.)
HOW TO VERIFY (owner):
- Top of `03-decisions.md` → a block **"Phase 7 — Today is a clean front-end rebuild
  (owner's explicit call, LOCKED 2026-06-23, Piece 1c)"** with the four numbered
  guardrails.
- `02-roadmap.md` → Phase 7 shows **Piece 1c ✅**, and the build-sequence intro now
  calls the pre-T1 save point the **sacred rollback point**.
- `git log --oneline -1` shows this docs commit; nothing under `src/` or `db/`
  changed (the app still looks exactly like Phase 6).
KNOWN GAPS / RISKS:
- This piece only **formalises the decision** — still nothing built. The clean
  rebuild begins at **T1**, the first piece to touch `src/`.
- The guardrails are now binding for the whole T1–T12 run: if anything in the
  rebuild starts a doom-loop, the correct move is **roll back to the pre-T1 save
  point**, not patch onward.
NEXT (unchanged): T1 — the paper token + reusable component kit (header, hairline,
small-caps label, tinted calendar block, task row, status pill, motion timings) and
apply the header + `#F6F5F1` paper. First piece that touches `src/`; **commit its
save point before starting — that commit is the sacred rollback to Phase 6 Today.**
FOR THE CHECKER: confirm (1) no src/ or db/ file changed and no schema changed;
(2) the recorded decision matches the owner's wording — a clean front-end rebuild of
Today only, an explicit escalation, not a whole-app rewrite, with the four guardrails
intact (data layer untouched, sacred save point / no digging, Today-scoped, per-piece
save points + Mac-and-phone verification).

### 2026-06-23 — Phase 7, Piece 1b — lock the Today (desktop) spec + the rebuild plan
WHAT CHANGED: (paperwork only — NO app code, NO schema change)
- Replaced the **Today** section of `07-ux-flows.md` with the **locked desktop
  spec** (marked "LOCKED — Today, desktop only; mobile Today is a separate later
  spec"). It pins down the whole screen: a **workspace calendar** on the left you
  can click-create / drag / resize / snap-to-15 on (events default, with an
  event/task toggle), soft tinted blocks, now-line only on the real today; a
  **"tasks today"** module (no events) with a 3-segment status pill and
  done-till-midnight + undo; a **"next 7 days"** module (tomorrow→+7 of the viewed
  day, undated tasks at the bottom); a quiet **"All tasks →"** box; a **one-tap
  full edit form** everywhere; a **3-level category tree** (5 top × 3–5 × 3–5) you
  can file at any level via a **drill-in picker**; **recurring events** with "this
  one or all?"; quiet **undo toasts**; and date arrows that **flip the whole page**
  to another day's edition.
- Recorded in `03-decisions.md`: the **scope call** — Today is a front-end
  **rebuild, not a re-skin**, but the **data spine is preserved and reused**
  (schema changes **additive only + checker-flagged**; **conservative deletion** —
  provably unused, one trim per commit, separate from build commits, verified) —
  plus the locked Today decisions, each tagged **new behaviour** vs **look**.
- Wrote the **12-step Today build sequence (T1–T12)** into `02-roadmap.md`, each its
  own small verified piece with a save point before it, schema pieces flagged; added
  a session note and a Piece-1b line.
FILES TOUCHED: 07-ux-flows.md, 03-decisions.md, 02-roadmap.md, 04-handoff-log.md.
(No 06-design.md change needed — the look choices it carries from Piece 1 still
hold. No src/, no db/, no schema.)
HOW TO VERIFY (owner):
- Open `07-ux-flows.md` → §3 "Today" now starts with a **"LOCKED — Today, desktop
  only"** banner and reads as a full spec (Frame / Layout / the calendar /
  tasks-today / next-7-days / Forms / Category picker / Delete / the rest).
- Skim the top of `03-decisions.md` → a **"Phase 7 — the Today desktop spec +
  rebuild approach (LOCKED 2026-06-23, Piece 1b)"** block, with each Today choice
  tagged [NEW BEHAVIOUR] or [LOOK].
- `02-roadmap.md` → under Phase 7 you'll see **Piece 1b ✅** and a **T1–T12** build
  sequence.
- `git log --oneline -1` shows this docs commit; nothing under `src/` or `db/`
  changed (the app still looks exactly like Phase 6).
KNOWN GAPS / RISKS:
- Still **nothing visual built** — this is the *plan*. The app looks like Phase 6
  until T1 starts touching `src/`.
- **Honest flag for the schema check (T2):** the locked `tasks` shape (Phase 3,
  Piece 1) **already includes `notes` and `priority`**, so two of the four
  "confirmed missing" candidates may already exist. T2 must **check the real schema
  first** and add only what's genuinely missing — the **category tree** and **event
  recurrence** are the parts most likely to need additive fields. Don't add columns
  from the candidate list without confirming.
- The **3-level fixed-depth category tree** (5 × 3–5 × 3–5, file at any level) is a
  real change to today's arbitrary-depth category model; T3 is flagged large and may
  sub-split, and its storage shape needs a checker-flagged decision when built.
- **Mobile Today** is deliberately left unspecced (separate later spec).
NEXT: T1 — the paper token + reusable component kit (header, hairline, small-caps
label, tinted calendar block, task row, status pill, motion timings) and apply the
header + `#F6F5F1` paper. First piece that touches `src/`; save point before it.
FOR THE CHECKER: confirm (1) no src/ or db/ file changed and no schema changed;
(2) the locked spec in 07-ux-flows.md §3 matches this instruction set; (3) the
decisions correctly separate **new behaviour** from **look**; (4) the T2 schema
note flags `tasks.notes` / `tasks.priority` as likely-already-present rather than
asserting all four candidate fields are missing.

### 2026-06-22 — Phase 7, Piece 1 — open the redesign (clean save point + record decisions)
WHAT CHANGED: (paperwork only — NO app code, NO schema change)
- Made a **clean pre-redesign save point**: a labeled commit at the exact Phase 6
  working state, so we can roll the whole redesign back to here if it goes wrong.
- Added **`07-ux-flows.md`** to the repo as Phase 7's **behaviour reference** —
  the agreed description of how the core experience should work. It is **NOT
  locked**: it carries a status banner saying every flow is open to relitigation
  screen by screen as we redesign, and it flags two spots where it describes
  future intent rather than what Phase 6 actually shipped (the proactive layer
  splitting into brief + nudges; the "tasks today / next 7 days" home model).
- Recorded the **opening Phase 7 decisions** (locked) in `03-decisions.md` and
  mirrored the doc-level ones into `06-design.md`; flipped the roadmap's Phase 7
  to in-progress with a Piece-1 line + session note. The seven decisions: styling
  = a **small reusable component kit** on the existing theme tokens (over plain
  CSS / Tailwind; animation + chart toolkits added later); Phase 7 **may make
  schema/logic changes** when the UX needs them (reverses the old "look-only"
  stance — each such change surfaced first and built as its own verified piece);
  visual target = the approved **Apple-tinted** look with **blackletter masthead +
  folio header**; **masthead stays blackletter** (settles that open question);
  **paper → `#F6F5F1`** (from cream `#F4EFE4`; the theme.css change is Piece 2);
  calendar category = **soft tinted block** Apple-Calendar style (overrides the
  old "small dot, not big blocks of colour" line); Today home model = **"tasks
  today" + "next 7 days"** (display-logic only, a later piece).
FILES TOUCHED: 07-ux-flows.md (new), 03-decisions.md, 06-design.md, 02-roadmap.md,
04-handoff-log.md. (Plus two git commits — the empty save-point marker, then this
docs commit. No src/, no db/, no schema.)
HOW TO VERIFY (owner):
- In a terminal in the project, run `git log --oneline -3`. You should see, newest
  first: this Phase-7-Piece-1 docs commit, then **"Phase 7 start — save point
  before the redesign (Phase 6 working state)."**, then the Phase 6 close-out.
  That middle commit is the rollback point.
- Open `07-ux-flows.md` — it sits next to the other 0x- brain docs and opens with a
  "Phase 7 behaviour reference, NOT locked" banner.
- Skim the top of `03-decisions.md` — the new "Phase 7 — the redesign: opening
  decisions" block is there; and `06-design.md` now says paper `#F6F5F1`, masthead
  stays blackletter, and calendar categories as tinted blocks.
KNOWN GAPS / RISKS:
- Nothing visual changed yet — the app still looks exactly like Phase 6. All the
  colour/masthead/calendar choices are *recorded*, not *built*; they land from
  Piece 2 on. (The `#F6F5F1` paper is still the old cream in the running app until
  Piece 2 touches `src/theme.css`.)
- The save point is an empty marker commit (a clean label, no file changes) — a
  stray `.DS_Store` Finder-metadata change was discarded so the point is clean.
- `07-ux-flows.md` deliberately describes some behaviour that differs from what's
  built (see its banner) — it's a *target/reference*, not a claim of current state.
NEXT: Phase 7, Piece 2 — the theme/token + component-kit groundwork, including the
`#F6F5F1` paper change in `src/theme.css` (the first piece that touches app code).
FOR THE CHECKER: confirm (1) no src/ or db/ file was touched and no schema changed;
(2) the recorded decisions match this instruction set; (3) each doc-level decision
that overrides an earlier line in 06-design.md is amended in place (not silently),
and the "look-only / zero schema" reversal points back to the old
[Data foundation before design] decision rather than deleting it.

### 2026-06-22 — Phase 6 COMPLETE & owner-verified (close-out) — the V1 finish line
WHAT THE WHOLE PHASE DELIVERS (plain English): every morning at 7am Amsterdam, Marty
texts me a short, warm recap of my day — on his own, with nobody watching.
- He reads my real day (events + time-blocked tasks, today's tasks, anything due today,
  anything overdue) and writes it in the calm "quiet broadsheet" voice (Gemini, plain
  words, no hype/emoji). If the AI is down he sends the plain checklist instead.
- He adds at most ONE gentle "you've been meaning to…" nudge (the oldest open This Week
  task that's been sitting 3+ days) and at most ONE reserved "you've got a free window
  for X" offer (only when there's a real 2h+ gap AND something genuinely worth doing).
- The 7am run ALWAYS sends something — a calm "quiet one" on an empty day — so a silent
  morning would mean the alarm itself broke.
BUILT IN PIECES: 6a (the on-demand pipe — a private `brief` edge function) → 6b (reads
my real day, plain text) → 6c (Gemini writes it, with a checklist fallback) → 6d (the
staleness nudge) → 6e (the reserved gap offer) → 6f (the 7am alarm). All on-demand
pieces were owner-verified on the phone; the real 7am self-delivery is now confirmed,
so PHASE 6 IS ✅ — the proactive engagement layer (the product's whole point) is alive.

WHAT'S IN THE DATABASE NOW (scheduling infra only — added in 6f, nothing else changed):
- Extensions enabled: pg_cron 1.6.4, pg_net 0.20.3 (supabase_vault was already on).
- Vault secret `brief_service_role_key` (the service-role key, read at run time).
- One cron job `brief_daily_7am_ams` (`0 5,6 * * *`) calling the private brief with
  { scheduled: true }; the 7am-Amsterdam hour gate is in the function (DST-safe).
- The temporary `brief_test_every3min` proving job has been REMOVED (confirmed: only
  `brief_daily_7am_ams` remains active). NO change to tasks/events/categories, no new
  columns, no activity_log, no src/ change. The brief is read-only on the spine + private.

DOC RECONCILE THIS SESSION (no code/schema touched): roadmap Phase 6 → ✅ owner-verified,
NEXT pointer → Phase 7; decisions doc got a Phase-6 close-out recap of the seven brief
decisions; architecture's runtime section now describes pg_cron + pg_net → the private
brief with the key in Vault; design's "Settled so far" records the quiet-broadsheet brief
voice as in use; glossary gained the brief, pg_net, Vault, service-role key, and the
"brief"/"brief test" triggers.

KNOWN FOLLOW-UPS (recorded so they're not lost — NOT done here):
- The temporary "brief test" trigger WORD (0-day forgotten threshold) is still LIVE by
  the owner's choice — a small code removal in telegram/index.ts + brief when ready.
  (Separate from the every-3-min cron job, which is already removed.)
- CAPTURE QUIRK TO CHECK SOMEDAY: a task ("text Steve") showed as ~163 days OVERDUE,
  which hints the Phase-5 capture flow may read a bare date (e.g. "Jan 10") as the
  nearest PAST date instead of the next upcoming one. Likely just test data — but worth
  confirming it isn't a parsing bug, since a wrongly-overdue task pollutes the brief
  (it'd show under OVERDUE and could be chosen as the gap candidate). Lives in the
  telegram/understand.ts date rules if it turns out real.

NEXT: Phase 7 — the redesign (the full per-screen look-and-feel pass to the broadsheet
identity in 06-design.md; the owner art-directs). The data foundation and core flows are
now all real, which is exactly the precondition Phase 7 was waiting on.

### 2026-06-22 — Phase 6 (Piece 6f) — The 7am alarm + the always-send safety net
WHAT CHANGED (the brief now runs ITSELF, on a schedule, with nobody watching):
- The PRIVATE `brief` edge function is now invoked by Supabase's scheduler (pg_cron),
  authenticating with the service-role key read from Vault. The function gained:
  - a SCHEDULED mode ({ scheduled: true }) that applies a 7am-Amsterdam-hour gate and
    ALWAYS sends (even an empty day sends a calm "quiet one" — silence now means the
    JOB broke, the owner's chosen failure signal);
  - a FORCE flag ({ force: true }) that bypasses the hour gate (the temp test job);
  - an always-send safety net: if building the brief throws, it still attempts a
    minimal "Good morning — I had trouble building your brief today" rather than dying
    silently. 6c's plain-checklist fallback (Gemini down) stays.
- On-demand "brief" (real 3-day rule) and "brief test" (0-day) are UNCHANGED.

EXACTLY WHAT CHANGED IN THE DATABASE (only scheduling infrastructure — the checker
should review these):
1. EXTENSIONS ENABLED (both were available, now installed):
   - pg_cron 1.6.4 (the scheduler).
   - pg_net 0.20.3 (lets the database make the outbound HTTPS call to the function).
   - supabase_vault 0.3.1 was already enabled (not changed).
2. VAULT SECRET created: name `brief_service_role_key` = the project's service-role
   key. The cron SQL reads it from `vault.decrypted_secrets` at run time — the key is
   NOT hardcoded in any cron definition, NOT in the repo, NOT in the function files.
3. TWO CRON JOBS created (cron.job):
   - `brief_daily_7am_ams` — schedule `0 5,6 * * *` (fires 05:00 AND 06:00 UTC). Calls
     the brief function with body { scheduled: true }. DST-safe 7am: the function
     proceeds ONLY when the Europe/Amsterdam hour is 7, so exactly ONE of the two
     daily fires sends (05:00 UTC = 07:00 in summer; 06:00 UTC = 07:00 in winter) —
     year-round, no manual switching, never double-sends.
   - `brief_test_every3min` — schedule `*/3 * * * *` (every 3 minutes). Calls the brief
     with body { scheduled: true, force: true } so it BYPASSES the hour gate and always
     sends. ⚠️ TEMPORARY — proves the wiring; must be removed once you've seen it fire.
- NO change to tasks/events/categories, NO new app columns, NO writes to the spine, NO
  activity_log. NO src/ change → no Vercel redeploy. The brief stays READ-ONLY on the
  spine and stays PRIVATE (jwt-verified; anonymous POST → 401).

FILES TOUCHED (code): supabase/functions/brief/index.ts (scheduled/force/always-send +
error safety net), supabase/functions/_shared/datetime.ts (localHour helper),
02-roadmap.md, 03-decisions.md, 04-handoff-log.md. (The cron jobs/extensions/Vault
secret live in the database, not in the repo.)

HOW TO VERIFY (no waiting until 7am):
1. WITHIN ~3-6 MINUTES of now, with you doing NOTHING, a brief should arrive on your
   phone on its own (from brief_test_every3min) — proving scheduler → function →
   Telegram end to end. It should arrive again ~3 min later.
2. Text "brief" yourself → still works exactly as before (on-demand path intact).
3. On an empty test day the message reads as a calm "quiet one," not silence.

⚠️ REMOVE THE TEMP TEST SCHEDULE (do this once you've seen it fire — it's texting you
every 3 minutes). The exact one line (run in the Supabase SQL editor, or I can run it):
    select cron.unschedule('brief_test_every3min');
The real `brief_daily_7am_ams` job stays. (To check what's scheduled:
`select jobname, schedule, active from cron.job;`)

KNOWN GAPS / RISKS:
- The temp 3-min job is LIVE and will text you every 3 minutes until unscheduled — the
  immediate next step is to remove it.
- DST correctness rests on the function's hour gate (05:00/06:00 UTC fire, proceed only
  at Amsterdam hour 7). Verified by reasoning; the real proof is tomorrow's 7am send.
- pg_net sends the HTTP call fire-and-forget; if a single morning's call fails at the
  network layer, that day is missed (no retry) — acceptable for a personal brief; the
  always-send + the "had trouble" net cover function-side failures.

NEXT: remove the temp `brief_test_every3min` schedule, then confirm tomorrow's real
07:00 Amsterdam brief lands on its own. Only after the owner sees BOTH the unprompted
fire AND the real 7am delivery do we mark Phase 6 ✅ (the V1 finish line).

FOR THE CHECKER: review the three DB changes above (extensions pg_cron/pg_net; the
Vault secret brief_service_role_key; the two cron jobs and their UTC schedules + bodies).
Confirm the service-role key is read from Vault (not hardcoded in cron SQL or the repo),
the brief stays private and read-only on the spine, the 7am gate is DST-safe and
single-send, and the scheduled run always sends. Source: supabase/functions/brief/index.ts,
_shared/datetime.ts; cron.job + vault.secrets in the database.

### 2026-06-22 — Phase 6 (Piece 6e) — The "fill a gap" suggestion (reserved mode)
WHAT CHANGED:
- When today has a real empty stretch AND a genuinely worth-doing task is waiting, the
  brief now offers ONE gentle suggestion to use that time for it. Reserved, not eager —
  when in doubt it says nothing. CODE finds the gap and picks the task (deterministic);
  Gemini only phrases the offer (it can't pick the slot/task or invent one).
- GAP = a continuous free stretch in TODAY's calendar of ≥ GAP_MIN_HOURS (2h), inside
  GAP_WINDOW_START–GAP_WINDOW_END (08:00–20:00 Europe/Amsterdam), with NO events and NO
  time-blocked tasks; earliest qualifying stretch wins. (Named constants in gap.ts.)
- WORTH-DOING candidate (in priority order, first that exists): 1) the 6d forgotten
  task, 2) most overdue open task, 3) a task due today, 4) a high-priority open Today/
  This Week task. None of those → NO suggestion (a low/none-priority undated task that
  isn't the forgotten one never qualifies — that's the reserved gate).
- Both a gap AND a candidate are required, else no line. Hard cap ONE suggestion. It's
  an OFFER, never a command, in the quiet-broadsheet voice.
- NO DOUBLE MENTION: if the gap task is already mentioned elsewhere (the 6d forgotten
  line, or an overdue/due-today body item, or a high-priority Today task in the TODAY
  list), the writer gets a `sameItem` flag and folds it into ONE coherent thought. If
  it's the exact forgotten task, the checklist also merges the two into one line.
- In BOTH the prose AND the plain-checklist fallback ("FREE WINDOW / • <start>–<end> —
  could tackle: <title>", or merged into BEEN WAITING), so it survives a Gemini outage.
- Refactor: the shared read-only DB helper moved to brief/sb.ts (used by day.ts +
  gap.ts); 6b read, 6c writer, 6d picker behave exactly as verified.

FILES TOUCHED: supabase/functions/brief/sb.ts (new — shared read helper + today
window), supabase/functions/brief/gap.ts (new — gap finder + candidate + offer),
supabase/functions/brief/day.ts (use sb.ts; thread gap into checklist/facts),
supabase/functions/brief/index.ts (compute + pass the gap offer),
supabase/functions/brief/write.ts (prompt: the gentle free-window offer),
02-roadmap.md, 03-decisions.md, 04-handoff-log.md

SAFETY / RLS: still READ-ONLY — only SELECTs, every read filtered to the owner's
user_id; NO new columns, NO schema change, db/ untouched. No src/ change → no Vercel
redeploy. `brief` redeployed PRIVATE (anonymous POST → 401 confirmed). The telegram
function was NOT changed this piece (the "brief"/"brief test" triggers from 6d are
unchanged); the gap logic runs identically under both. Free Gemini tier only.

PREVIEW OF MY REAL DATA (so expectations match): today is packed 08:00–20:00 (event
08–10, event 11:15–14:15, Homework 15:00–17:30, Call mom 19:15–20:00), so the largest
free stretch is 17:30–19:15 = 1h45 — UNDER 2h → NO gap line right now (correct). The
forgotten pick under "brief test" is still "tesrt".

HOW TO VERIFY (from your phone):
1. FORCE A SUGGESTION: in the app clear a free afternoon today (≥2h with no event/
   scheduled task between 08:00–20:00) AND make sure you have a worth-doing task — set
   one to HIGH priority, or due today, or leave an overdue one. Then text "brief" (or
   "brief test") → the brief includes ONE gentle gap offer naming that free window and
   that task. Only one.
   NOTE on which task it names: the candidate order takes the FORGOTTEN task first. So
   under "brief test" (everything counts as forgotten) the offer pairs with your oldest
   waiting This Week task, folded into one "been waiting + free window" line. To test
   the overdue/due-today/high-priority branch specifically, use plain "brief" (today
   nothing is 3+ days old, so there's no forgotten task and the pressing one is chosen).
2. Fill the day so there's no 2-hour gap → text again → NO gap line (correct).
3. Make the only waiting task low-priority with no date → text again → NO gap line
   (reserved mode staying quiet — correct).
4. If the gap task is also your forgotten task → confirm it reads as ONE combined line,
   not the task named twice.
5. Text a normal item like "book dentist" → still captured as a task as before.

KNOWN GAPS / RISKS:
- Candidate order is forgotten-first (per the agreed rules), so under "brief test" the
  gap pairs with the forgotten task, not necessarily a high-priority one — see the note.
- A worth-doing task that's ALREADY scheduled today can still be the gap candidate (the
  rules don't exclude it); it would read a little oddly but the sameItem fold keeps it
  to one mention. Refine later if wanted.
- Gap ignores any sub-2h free slivers and anything outside 08:00–20:00 (by design).
- Still on-demand only — the 7am schedule is 6f.

NEXT: Phase 6, Piece 6f — the 7am alarm (the scheduler calls the brief automatically)
+ the silent-failure safety net.

FOR THE CHECKER: confirm the gap (≥2h, 08:00–20:00, no events/scheduled tasks, earliest)
and the candidate (forgotten→overdue→due-today→high-priority, else none) are CODE-picked;
that a suggestion needs BOTH and is capped at one; that a same-as-existing task is folded
(no double mention); that it's in prose AND the checklist fallback; that it's READ-ONLY,
no schema/column change; and that `brief` stays private. Source:
supabase/functions/brief/{gap.ts, day.ts, index.ts, write.ts, sb.ts}.

### 2026-06-22 — Phase 6 (Piece 6d) — The anti-staleness nudge (the real point)
WHAT "FORGOTTEN / UNTOUCHED" MEANS (given the columns that actually exist):
- I inspected the live tasks table. Its only timestamp columns are: created_at,
  completed_at (set only when done, null while open), scheduled_start/scheduled_end,
  due_date. There is NO updated_at / last-modified column (not in the repo, not live).
- So "untouched for 3+ days" is defined using created_at ONLY: an OPEN task in
  time_bucket 'This Week' whose created_at is 3+ days ago. CONSEQUENCE (stated
  plainly): editing a task or MOVING it between buckets does NOT reset the 3-day
  clock — there is no signal that could. Completing it removes it (no longer open).
  I did NOT add or change any column (read-only, as instructed).

WHAT CHANGED:
- The code now picks the ONE forgotten task per brief (hard cap one) and weaves it in
  gently. Rule: open + This Week + created 3+ days ago (FORGOTTEN_DAYS=3, a single
  named constant) + NOT already shown elsewhere in the brief — i.e. not due today, not
  overdue, and not scheduled onto today's calendar. Of those, the single MOST
  untouched (oldest created_at). If none qualify, NO nudge line at all (silence is
  correct — we never invent one).
- The CODE selects it (deterministic, verifiable); Gemini only PHRASES it as one calm
  line in the existing quiet-broadsheet voice, using the task exactly as named — it
  can't choose, add, or invent the item.
- The chosen item is put in BOTH the prose AND the plain-checklist fallback
  ("BEEN WAITING / • <title>"), so the rescue still works if Gemini is unavailable.
- 6b's day-read and 6c's writer + never-silent fallback are unchanged.

TEMPORARY TEST AID: a second trigger "brief test" (texted to Marty) runs the IDENTICAL
brief but with the threshold at 0 days, so the picker fires on my real This Week tasks
immediately (no 3-day wait). Plain "brief" uses the real 3-day rule. Telegram maps
"brief test" → the brief with { test: true }. Marked temporary in code + here; we may
remove it later.

FILES TOUCHED: supabase/functions/brief/day.ts (pickForgotten + FORGOTTEN_DAYS +
forgotten threaded into checklist/facts), supabase/functions/brief/index.ts (read
test flag, pick threshold, select forgotten), supabase/functions/brief/write.ts
(prompt: weave in the one gentle reminder if given), supabase/functions/telegram/index.ts
("brief test" trigger + pass test flag), 02-roadmap.md, 03-decisions.md, 04-handoff-log.md

SAFETY / RLS: still READ-ONLY — only SELECTs, every read filtered to the owner's
user_id; NO new columns, NO schema change, db/ untouched. No src/ change → no Vercel
redeploy. `brief` redeployed PRIVATE (anonymous POST → 401 confirmed, even with a test
body). telegram redeployed --no-verify-jwt (the new "brief test" trigger); a forged
"brief test" with no webhook secret → 401 (confirmed); plain capture + plain "brief"
behave as before. Free Gemini tier only.

PREVIEW OF MY REAL DATA (so I know what to expect): I have 3 open This Week tasks, all
created today — "tesrt" (no due, not scheduled), "Assignment b" (due tomorrow),
"Call mom" (due tomorrow, scheduled today 17:15). So "brief test" should name "tesrt"
(oldest qualifier); "Call mom" is correctly excluded (scheduled today → in EVENTS
TODAY); "Assignment b" is eligible but newer. Plain "brief" shows NO nudge yet (nothing
is 3+ days old) — correct.

HOW TO VERIFY (from your phone):
1. Text "brief test" → the brief includes ONE gentle "been waiting" line naming a real
   open This Week task (right now: "tesrt"). Only one.
2. In the app, confirm that task really is an open This Week task, is the oldest
   qualifying one, and ISN'T already due today / overdue / scheduled today.
3. Text plain "brief" → if you have a This Week task untouched 3+ days it appears; if
   not (the case today), there's simply no nudge line (correct).
4. Text a normal item like "email landlord" → still captured as a task as before.

KNOWN GAPS / RISKS:
- created_at is the only "untouched" signal (no updated_at) — so moving a task between
  buckets won't reset its 3-day clock. A true last-touched notion would need a new
  column (a schema change) — NOT done; flagged for a separate decision if wanted.
- A This Week task scheduled on ANOTHER day (not today) still counts as forgotten — by
  the exact rule ("not scheduled onto TODAY'S calendar"); refine in a later piece if
  you'd rather any scheduling exempt it.
- One nudge max, by design. "brief test" is a temporary aid. Still on-demand only —
  the 7am schedule is 6f.

NEXT: Phase 6, Piece 6e — the "fill a gap in the day" suggestion.

FOR THE CHECKER: confirm the forgotten task is chosen by CODE (open + This Week +
created ≥3 days + not due-today/overdue/scheduled-today, oldest), capped at one, none
when nothing qualifies; that Gemini only phrases it (no choosing/inventing); that it's
in BOTH prose and the checklist fallback; that it's READ-ONLY with no schema/column
change; and that `brief` stays private. Source: supabase/functions/brief/day.ts
(pickForgotten), index.ts, write.ts; telegram/index.ts (brief test).

### 2026-06-22 — Phase 6 (Piece 6c) — Gemini writes the brief in real words (voice, no schedule)
WHAT CHANGED:
- The brief now READS the day exactly as 6b did (unchanged, verified source of
  truth), then hands those SAME facts to Gemini, which writes them as a short,
  warm-but-restrained morning message in the "quiet broadsheet" voice (06-design.md
  "Voice & words"): sentence case, plain verbs, ~2-4 short sentences, no hype, no
  emoji, no exclamation marks. The bulleted checklist is no longer what I normally
  receive — I get real words.
- Gemini ONLY rewrites the supplied facts — it must not invent, add, drop, or guess
  any item. The facts handed over are the exact 6b groups (events + time-blocked
  tasks, Today bucket, due today, overdue) with empty groups stated plainly and the
  days-overdue count PRECOMPUTED (so Gemini never does date math). Temperature 0 for
  steadiness; same Europe/Amsterdam "today".
- FALL BACK, NEVER SILENT: if Gemini is missing/errors/returns junk/hits its free
  limit (429) or has high demand (503 after retries), the brief sends the plain 6b
  checklist instead — so I ALWAYS get my day. It never crashes and never sends nothing.
- Reuses the EXISTING Gemini setup: same GEMINI_API_KEY secret, same model string
  (gemini-3.1-flash-lite). This is the OPPOSITE direction from capture: data -> words.

FILES TOUCHED: supabase/functions/brief/index.ts,
supabase/functions/brief/day.ts (split: gatherDay + formatChecklist + factsForGemini),
supabase/functions/brief/write.ts (new — the Gemini writer + fallback),
supabase/functions/_shared/datetime.ts (added daysBetweenYMD),
02-roadmap.md, 03-decisions.md, 04-handoff-log.md

SAFETY / RLS: still READ-ONLY — only SELECTs, every read filtered to the owner's
user_id; no new columns, no schema change, db/ untouched. No src/ change → no Vercel
redeploy. `brief` redeployed PRIVATE (anonymous POST → 401 confirmed). The telegram
webhook + capture are untouched (telegram NOT redeployed; still 401 without its secret).
Free Gemini tier only — same task/event data class as Phase 5, no new sensitive data,
no paid key.

HOW TO VERIFY (from your phone):
1. Text Marty "brief" → you get a short, warm, plain-English morning message (not a
   bullet list). Check every FACT against your real day / the 6b facts you already
   trust: nothing invented, nothing missing, right times, right groups.
2. Text "brief" a few times → the facts stay correct each time (wording may vary a
   little; the day must not change).
3. Text a normal item like "pay rent friday" → still captured as a task as before.
(If you ever get the plain bulleted checklist instead of prose, that's the safety net
— Gemini was briefly unavailable; the facts are still 100% correct.)

KNOWN GAPS / RISKS:
- Wording varies run to run (that's fine — only the facts must hold). If a phrasing
  ever drifts from the facts, tell me the line; the fallback is always exact.
- Still on-demand only ("brief") — the 7am schedule is a later piece.
- No prioritising, no "stale" nudges, no gap suggestion yet — that's 6d.
- Duplication still flagged from 6b: telegram keeps its own copy of the timezone
  helpers and its own GEMINI_MODEL const; the brief uses the shared/its own copies.
  Consolidating is a safe later cleanup (left so capture stays byte-for-byte unchanged).

NEXT: Phase 6, Piece 6d — the anti-staleness brain (smarter selection: stale-item
nudges + a suggestion to fill a gap in the day).

FOR THE CHECKER: confirm Gemini is told to use ONLY the supplied facts (no inventing/
dropping), that ANY Gemini failure (missing key, !ok, 429, junk, empty, exception)
returns the plain checklist (never silent, never crash), that the read step is
unchanged and READ-ONLY (owner-filtered, no writes/schema change), and that `brief`
is still private (401 anonymously). Source: supabase/functions/brief/{write.ts,
day.ts, index.ts}.

### 2026-06-22 — Phase 6 (Piece 6b) — The brief reads my real day (plain text, no AI)
WHAT CHANGED:
- The `brief` function no longer sends a fixed line — it now reads MY real data
  today (READ-ONLY) and sends a plain, rule-built summary. No AI, no schedule, no
  prioritising, no "stale" logic — deliberately robotic, so I can eyeball it against
  the app and trust the READING before Gemini (6c) ever rewrites it.
- Four labelled groups, in order, exactly as agreed:
  1. EVENTS TODAY — today's events AND time-blocked tasks (open tasks scheduled
     today), merged and sorted earliest-first; a scheduled task is marked "(task)".
  2. TODAY — open tasks in the 'Today' bucket.
  3. DUE TODAY — open tasks whose due_date is today (any bucket).
  4. OVERDUE — open tasks whose due_date is before today (shows when it was due).
  An EMPTY group is STATED plainly ("No events today.", "Nothing overdue."), never
  hidden. A task can appear in more than one group — not deduped, by design (6d).
- "Today" = the calendar day in Europe/Amsterdam (midnight→midnight), the SAME
  timezone/definition telegram capture uses. To keep that consistent without
  touching the working capture flow, the shared timezone logic now lives in a new
  `_shared/datetime.ts` (same TZ, same "today", same UTC conversion as before); the
  brief uses it. (See KNOWN GAPS re: telegram still holding its own copy.)
- If any read fails (a transient DB blip), it sends "I couldn't read your day just
  now — give it a moment and ask again." rather than a half-brief.

HOW THE READ IS SAFE / RLS INTACT: reads use Supabase's service-role key (auto-
injected, server-side only, never sent to a client or committed) and every query is
filtered to user_id = OWNER_USER_ID (defence in depth — service-role bypasses RLS,
so the explicit filter is the guard). It only SELECTs; it never writes. No new
columns, no schema change, db/ untouched — it reads existing fields only (events:
title, start_at; tasks: title, time_bucket, due_date, status, scheduled_start).

FILES TOUCHED: supabase/functions/brief/index.ts,
supabase/functions/brief/day.ts (new), supabase/functions/_shared/datetime.ts (new),
02-roadmap.md, 03-decisions.md, 04-handoff-log.md

DEPLOY STATE: `brief` redeployed PRIVATE (jwt verification on) to the real project
cntlptuacsujbdtwvbis (Frankfurt) via the access token. Verified live: an anonymous
POST to the brief URL still returns 401 (private), and the telegram webhook still
returns 401 without its secret (capture path untouched — telegram NOT redeployed).
No src/ change → no Vercel redeploy.

HOW TO VERIFY (from your phone, then check each line against the app):
1. Text Marty "brief" → you get a plain summary of today. Open the app and confirm
   EVERY line: the right events at the right times, time-blocked tasks marked
   "(task)", the right Today-bucket tasks, anything due today, anything overdue —
   and empty groups stated plainly.
2. In the app, add a quick task DUE TODAY and an OVERDUE task (due date in the past).
   Text "brief" again → confirm they appear in DUE TODAY and OVERDUE.
3. Text a normal item like "buy milk" → it's still captured as a task as before.

KNOWN GAPS / RISKS:
- DUPLICATION (transparent): the shared timezone helpers now live in
  `_shared/datetime.ts` for the brief, but the telegram function STILL carries its
  own copy (I left it byte-for-byte unchanged to protect the working capture flow).
  Pointing telegram at the shared module is a safe later cleanup — flagged, not done.
- Selection is deliberately literal (6b): a task can show in several groups (no
  dedupe); no prioritising, no "stale" nudges, no gap suggestion — that's 6d. No AI
  wording yet — that's 6c. Time-blocked tasks shown are open only (a done one isn't
  "your day ahead").
- Still on-demand only ("brief") — the 7am schedule is a later piece.

NEXT: Phase 6, Piece 6c — Gemini writes the brief in real words (turn this robotic
summary into a warm, plain-English morning message).

FOR THE CHECKER: confirm the brief is READ-ONLY (only SELECTs; no insert/update/
delete), every read is filtered to the owner's user_id, it reads only existing
columns (no schema change), empty groups are stated not hidden, and `brief` is still
deployed private (its URL returns 401 anonymously). Source:
supabase/functions/brief/day.ts, supabase/functions/brief/index.ts,
supabase/functions/_shared/datetime.ts.

### 2026-06-22 — Phase 6 (Piece 6a) — The empty pipe (Marty texts me unprompted, on demand)
WHAT CHANGED:
- Built a NEW, SEPARATE edge function `brief` (supabase/functions/brief/index.ts).
  This is the function the 7am alarm will call directly in a later piece, so the
  brief logic lives here from the start — never inside the telegram/webhook function.
  Its ONLY job this piece: send ME one fixed Telegram message ("Good morning. This
  is your LifeOS brief — just testing the wiring today; the real edition is coming
  soon."). No AI, no reading tasks/events, no schedule, no database.
- `brief` is deployed PRIVATE (normal deploy, jwt verification ON — NOT
  --no-verify-jwt), so its public URL refuses anonymous calls. Only a caller holding
  the service-role key (the telegram function today, the 7am alarm later) can invoke
  it. Deliberately stricter than the telegram webhook (which must stay public).
- In the existing `telegram` function: after the webhook-secret check and the
  owner-gate, if the message text (trimmed, lowercased) is exactly "brief", it
  invokes the `brief` function with the service-role key it already runs with, then
  STOPS — the capture/understand/save flow does NOT run for that message. "brief" is
  now a RESERVED trigger word. Every other message behaves exactly as before.
- On success the brief function sends the morning message itself (telegram sends no
  duplicate reply); only if firing it fails does telegram say "I couldn't fetch your
  brief just now — try again in a moment."

FILES TOUCHED: supabase/functions/brief/index.ts (new),
supabase/functions/telegram/index.ts, 02-roadmap.md, 03-decisions.md, 04-handoff-log.md

DEPLOY STATE: both functions deployed to the REAL project cntlptuacsujbdtwvbis
(Frankfurt) via a personal access token from the correct account (token NOT stored
in any file/repo — used inline for the deploy only). Verified live: an anonymous POST
to the brief URL returns 401 (private — refuses anonymous), and an unsecured POST to
telegram still returns 401 (webhook-secret check intact). No Vercel redeploy (no src/
change). NO database/schema change, NO new tables, NO change to tasks/events/categories.

HOW TO VERIFY (from your phone):
1. Text Marty the single word "brief" → within a few seconds you get the fixed
   "Good morning… just testing the wiring today" message — one you did NOT trigger
   by sending a task.
2. Text a normal item like "call mum tomorrow" → it's still captured as a task
   exactly as before (the new trigger didn't break normal capture).
3. Text "brief" again → the test message arrives again.

KNOWN GAPS / RISKS:
- The brief is a FIXED message — it doesn't read your real day yet (that's 6b).
- No scheduler yet — it only fires when you text "brief". The 7am alarm is a later
  piece; this proves the pipe first so you can test without waiting for 7am.
- "brief" is now reserved — a task literally titled "brief" can't be captured by text
  (negligible; type more words).

NEXT: Phase 6, Piece 6b — the brief reads my real day (today's events + tasks).

FOR THE CHECKER: confirm `brief` is its own function (not logic inside telegram),
deployed WITH jwt verification (its URL returns 401 anonymously), and that telegram's
"brief" branch sits AFTER the secret check + owner-gate, fires brief with the
service-role key, and returns without running capture/save. No DB/schema change; no
secret/token in the repo. Source: supabase/functions/brief/index.ts,
supabase/functions/telegram/index.ts.

### 2026-06-22 — Phase 5 COMPLETE & owner-verified (close-out)
WHAT THE WHOLE PHASE DELIVERS: I add things to LifeOS by texting Marty.
- He only listens to me (owner chat-id gate) and only accepts genuine Telegram
  calls (webhook secret-token check, fail-closed).
- He reads a plain-English message with Gemini (Europe/Amsterdam; vague day = next
  upcoming; a clock time ⇒ event, otherwise a task) and SAVES the right row:
  EVENT = a 1-hour calendar block; dated TASK = a due date (deadline, not a block);
  bot items land in Inbox, in Today (no date / today) or This Week (a future date);
  he never guesses a category. Then he confirms exactly what + where.
- Chit-chat / gibberish / unsure reads save NOTHING and get a kind reply.
- "undo" removes the single most recent thing he saved (one level), via the
  telegram_saves log — exactly that row by id, owner-only, never a row I made in
  the app.
VERIFIED on the owner's phone: security (forged calls rejected, real texts work),
graceful misses, and undo (incl. confirming a hand-made app task is left untouched).
DEPLOY STATE: the edge function deploys to Supabase (not Vercel) and is already
live; the live function matches the repo (nothing unpushed). Phase 5 changed NO
browser-app (src/) code and NO core schema/meaning — so NO Vercel redeploy was
needed. Only addition to the DB was the separate, owner-only telegram_saves log
table (db/06_telegram_saves.sql), which ADDS to the spine without changing it.
SECRETS in place (Supabase secret store, never the repo): TELEGRAM_BOT_TOKEN,
TELEGRAM_WEBHOOK_SECRET, OWNER_CHAT_ID, OWNER_USER_ID, GEMINI_API_KEY.
NEXT: Phase 6 — the 7am brief + anti-staleness engine (the real V1 finish line):
the scheduler wakes the agent each morning and Gemini writes a brief (day overview
+ a nudge on stale items + a suggestion to fill a gap), sent over Telegram.

### 2026-06-22 — Phase 5 (Piece 5e) — "Make it trustworthy" (security + misses + undo) — PHASE 5 READY (pending owner verify)
WHAT CHANGED (three parts):
- (A) SECURITY: the function now REJECTS any request whose Telegram secret-token
  header doesn't match our stored secret — as its very first action, before reading
  anything. We set a random secret on the Telegram webhook (`setWebhook secret_token`)
  and stored it as the `TELEGRAM_WEBHOOK_SECRET` Supabase secret; Telegram sends it in
  the `X-Telegram-Bot-Api-Secret-Token` header on every call. Fails CLOSED (if the
  secret isn't configured, everything is rejected). The 5b owner-gate (chat id = mine)
  stays as a second check behind it. Kept `--no-verify-jwt` (the secret token is what
  authenticates now). In plain English: the bot's public web address is now useless to
  anyone who doesn't have the secret, so a forged "message from me" can't get in.
- (B) GRACEFUL MISSES: an unsure read, or anything that isn't a task/event (chit-chat
  like "how are you", gibberish), SAVES NOTHING and gets a kinder reply ("That didn't
  look like a task or appointment… send me something to do or an appointment and I'll
  file it"). No junk rows, ever.
- (C) UNDO: texting "undo" removes the SINGLE most recent item Marty saved and confirms
  ("Removed the event 'dentist'."). One level only. If there's nothing to undo, it says
  so. Built on a NEW small log table `telegram_saves` (db/06_telegram_saves.sql) that
  records each bot-saved item's table + id; undo reads the latest entry and deletes that
  EXACT row by id, owner-only. It can never touch a row you made in the app (those are
  never in the log).

HOW THE LOG TABLE WAS ADDED: it's a SEPARATE table (does not change tasks/events/
categories meaning — "modules add tables, protect the spine"). I applied it for you via
Supabase's management API, so you didn't need the SQL editor; db/06_telegram_saves.sql is
the record (RLS owner-only, confirmed: 4 policies, RLS on).

DATA SAFETY (the 5d slip does not recur): undo deletes exactly ONE row, by its unique id,
filtered to user_id = me — no pattern/broad deletes. Verified live: a hand-made app task
(not logged) was untouched by "undo". RLS owner-only on all tables is unchanged.

FILES TOUCHED: supabase/functions/telegram/{index.ts, understand.ts, save.ts, db.ts (new),
undo.ts (new)}, db/06_telegram_saves.sql (new), 02-roadmap.md, 03-decisions.md,
04-handoff-log.md

HOW TO VERIFY (from your phone):
- (A) Security — your real texts work as normal (Telegram sends the secret for you). To
  see a forged call refused: I tested it directly — a request to the function URL with no
  secret token (or a wrong one) gets "401 forbidden" and does nothing; only the correct
  secret returns 200. You can't easily forge a request from your phone, which is the point.
- (B) Misses — text "how are you" and a gibberish string → kind reply, and the app shows
  NOTHING new (I confirmed 0 rows saved for both).
- (C) Undo — text "dentist Thursday 2pm" (it saves) → text "undo" → "Removed the event
  'dentist'." → app: it's gone. Text "undo" again → "nothing recent to undo". Then make a
  task yourself in the app and text "undo" → it will NOT remove your hand-made task (it
  only removes things Marty saved). Reload / log out & in → state persists, only yours.
(I verified all of the above against the deployed function; all test rows removed, your
test/test2 events untouched.)

KNOWN GAPS / RISKS:
- One message = one item still (multi-item not parsed).
- Undo is one level (just the last item), by design.
- Free-tier Gemini limit (gemini-3.1-flash-lite, 500/day) — heavy bursts can still 429
  ("hit my AI limit"); handled gracefully.

NEXT: Phase 5's "done when" (I add things by texting, safely) is MET pending your phone
check. After you confirm, we mark Phase 5 ✅ together. Then Phase 6 — the 7am brief.

FOR THE CHECKER: confirm the secret-token check is first and fails closed; undo deletes
exactly one row by id filtered to the owner and can't hit app-made rows; the new table
doesn't change core-table meaning; RLS unchanged; no secret/key in the repo. Source:
supabase/functions/telegram/*.ts, db/06_telegram_saves.sql.

### 2026-06-22 — Phase 5 (Piece 5d) — "Save it for real"
WHAT CHANGED:
- Marty now WRITES a confident read into your data and confirms exactly what
  landed: an EVENT (start = the time, end = +1h) or a TASK (a stated date becomes
  the due_date; no date or today → 'Today' bucket, any other date → 'This Week').
  Bot items are uncategorised (category null = Inbox) and tagged source='telegram'.
- An unsure/gibberish read saves NOTHING and asks you to rephrase. Rate-limit /
  read errors also save nothing and say so.
- New file save.ts does the DB write + rules + confirmation; understand.ts now
  exports the reading helpers it reuses; index.ts orchestrates. No schema change,
  no categories table touched, db/ untouched.
- Model switched to gemini-3.1-flash-lite (free: 500 req/day, 15/min). Reason: the
  2.5 flash + 2.5 flash-lite free tiers are only ~20 req/day and were exhausted; the
  owner's AI-Studio rate-limit dashboard showed 3.1-flash-lite has 500/day. One-line
  GEMINI_MODEL change.

HOW THE SAVED ROW IS OWNED BY ME / RLS INTACT (per the brief):
- The write uses Supabase's service-role key (auto-injected into the function,
  server-side only, never sent to a client or committed) and sets user_id =
  OWNER_USER_ID explicitly on every row, so each row belongs to me. RLS owner-only
  policies on tasks/events are UNCHANGED — verified by reading them; this code only
  inserts rows. OWNER_USER_ID (my auth id, af1a4adf-…) is a Supabase secret, not in
  the repo. Confirmed live: every test row carried my user_id; app reads them via
  RLS as mine.

FILES TOUCHED: supabase/functions/telegram/{index.ts, understand.ts, save.ts (new)},
02-roadmap.md, 03-decisions.md, 04-handoff-log.md

HOW TO VERIFY (from your phone, spacing messages a few seconds apart):
1. "dentist Thursday 2pm" → reply "Saved an EVENT: 'dentist', Thu 25 Jun 14:00–
   15:00, Inbox." → open app: it's on Thursday's calendar 14:00–15:00.
2. "buy milk tomorrow" → "Saved a TASK: 'buy milk', due Tue 23 Jun, This Week,
   Inbox." → app: task in This Week, due tomorrow.
3. "call the plumber" → "Saved a TASK: …, no due date, Today, Inbox." → app: Today.
4. "lunch with Mum Friday" → "Saved a TASK: …, due Fri 26 Jun, This Week, Inbox."
5. Gibberish → "I'm not sure…", nothing saved.
6. Reload + log out/in: items persist and are only yours.
(I verified all of the above against the deployed function; rows were owner-stamped
and Inbox, then I deleted my test rows.)

KNOWN GAPS / RISKS:
- TRUST/SECURITY (for 5e): the function is public (--no-verify-jwt) and the owner
  gate trusts the chat id in the (forgeable) request body. Anyone who knew the
  function URL AND your chat id could POST a fake update and inject a row. Fix in
  5e: set a Telegram webhook secret_token and verify the X-Telegram-Bot-Api-Secret-
  Token header so only real Telegram calls are accepted. (No undo yet either —
  that's 5e too.)
- One message = one item still (multi-item not parsed).
- TRANSPARENCY: while testing cleanup I briefly deleted two of your pre-existing
  events ('test','test2') with an over-broad delete, then immediately restored them
  with their original ids/times. They are intact now. Lesson applied: test cleanup
  now deletes ONLY bot-created rows, matched precisely (never "most recent N").
- Free-tier limits are modest (500/day now); heavy bursts can still 429 → "hit my
  AI limit" (handled, just retry later).

NEXT: 5e — graceful misses + undo (and lock the endpoint to real Telegram calls).

FOR THE CHECKER: confirm rows match db/03_tasks.sql + db/04_events.sql exactly (no
new columns), user_id is set to the owner on every insert, RLS policies are
unchanged, unsure reads save nothing, and no secret/key is in the repo. Source:
supabase/functions/telegram/*.ts.

### 2026-06-22 — Phase 5 (Piece 5c) — "Gemini reads it" (understanding only, saves nothing)
WHAT CHANGED:
- Marty now sends your message (plus today's local date/time) to Gemini, which
  reads it into structured fields, and he replies telling you what he understood.
  NOTHING is saved — every reply ends with "(Not saved yet.)" / "(Nothing saved.)".
- Rules baked in (your choices): timezone Europe/Amsterdam; a vague day = the next
  upcoming one (today if it's today); a specific clock time ⇒ EVENT, otherwise TASK.
- Gemini is forced to return ONLY structured JSON (strict schema, temperature 0);
  if it returns junk or is unavailable, Marty says "I couldn't read that one"
  instead of crashing (with a small auto-retry for transient blips).
- Gemini key stored as the Supabase secret GEMINI_API_KEY (free Flash tier), never
  in the repo. The 5b owner-gate still holds. Function split into index.ts (gate +
  plumbing) and understand.ts (the AI + reply) to stay small.

FILES TOUCHED: supabase/functions/telegram/index.ts,
supabase/functions/telegram/understand.ts (new), 02-roadmap.md, 03-decisions.md,
04-handoff-log.md

HOW TO VERIFY (from your phone, then check the app shows NOTHING new):
1. Text Marty "dentist Thursday 2pm" → "I read that as an EVENT: 'dentist',
   Thu 25 Jun, 14:00. (Not saved yet.)"
2. "call the plumber" → "a TASK: 'call the plumber', no date."
3. "lunch with Mum Friday" → "a TASK: 'lunch with Mum', Fri 26 Jun." (no clock
   time, so TASK — this is the no-time case to eyeball before 5d saves anything.)
4. "buy milk tomorrow" → "a TASK: 'buy milk', Tue 23 Jun."
5. Gibberish (e.g. "asdkjh qwe") → "I'm not sure I understood that — could you
   rephrase?" (he invents nothing).
6. Open the app: your tasks/calendar are UNCHANGED. Nothing was saved.

KNOWN GAPS / RISKS:
- Saves nothing yet (by design) — that's 5d.
- "lunch with Mum Friday" reads as a TASK (no clock time). If you'd rather social
  things default to events, that's a rule tweak to decide before 5d.
- "gym at 7" resolved to 19:00 (7pm) — Gemini picks a sensible time when am/pm is
  omitted; worth watching.
- Model: settled on gemini-2.5-flash-lite (free, higher limits). gemini-2.0-flash's
  free tier is limit 0; gemini-2.5-flash works but its low free DAILY cap got drained
  by this session's testing (owner saw "hit my AI limit" twice a minute apart — a
  per-day limit). flash-lite reads equally well and has a separate, fresh quota.
  Failure handling stays: 503 → retry with backoff; 429 → honest "I've hit my AI
  limit — try again in a minute" (not "couldn't read that"). Swap the model in one
  line (GEMINI_MODEL in understand.ts) if limits ever bite again.
- The access token the owner believed was revoked STILL worked this session (third
  time) — owner to confirm at the tokens page that dead tokens are actually gone.

- Owner-observed: a message listing SEVERAL items ("dentist Thursday 2pm, call the
  plumber, buy milk tomorrow") is read as ONE item (the first). One text = one thing
  for now; multi-item parsing is a later enhancement, not in 5c/5d scope. Owner is
  fine with this ("good enough for now").

5c VERIFIED by owner on phone (dinner/dentist/plumber/milk/gibberish all read
correctly; nothing saved).

NEXT: 5d — "save it for real": take what Gemini understood and write it as a real
task/event in the database (and confirm what was saved + where).

FOR THE CHECKER: confirm nothing is written to the DB (no client/insert), the
owner-gate still runs first, Gemini is asked for JSON-only and malformed output is
handled, and the key lives in a secret. Source: supabase/functions/telegram/*.ts.

### 2026-06-22 — Phase 5 (Piece 5b) — Lock the bot to the owner's chat ID
WHAT CHANGED:
- Added a gate at the very front of the `telegram` function: it reads the
  sender's chat ID first, and only the owner (chat id 8864259574) gets a reply.
  Anyone else is read, ignored (no message sent), and acked with 200.
- The owner's chat ID is stored as a Supabase secret (`OWNER_CHAT_ID`), NOT
  hard-coded in the file or committed to GitHub (same discipline as the tokens).
- Owner's own experience is unchanged: you still get the 5a echo.
- No AI, no database, no schema change. Redeployed with `--no-verify-jwt`.

FILES TOUCHED: supabase/functions/telegram/index.ts, 02-roadmap.md,
03-decisions.md, 04-handoff-log.md

HOW TO VERIFY:
1. From your phone (your account), text Marty: hello
   → you STILL get "Got it: hello — your Telegram chat ID is 8864259574".
2. (Optional, the real lock test) From a DIFFERENT Telegram account that isn't
   you, text Marty anything → you get NOTHING back. Silence is success.
3. Can't use a second account? It was already proven without one: a direct test
   call with a stranger's id (9999) returned "ignored" and sent no message, while
   a call with your id returned "ok" and delivered a real reply to your phone.
   (The function answers Telegram 200 either way; it returns the internal word
   "ok" vs "ignored" purely so the gate is checkable from outside — Telegram
   ignores the response body, so nothing in any chat changes.)

KNOWN GAPS / RISKS:
- The bot is now owner-only, but it still just echoes — it does NOT understand
  or save anything yet. That's 5c.
- Setup note: the access token the owner believed was revoked still worked this
  session — owner to confirm at the tokens page that any token meant to be dead
  is actually gone.

NEXT: 5c — "Gemini reads it": the bot understands a plain-English message (e.g.
"dentist Thursday 2pm") instead of just echoing it. (Saving comes after.)

FOR THE CHECKER: confirm the gate is the first thing the function does (before any
reply), that the owner id lives in a secret (not the file/repo), that deploy used
--no-verify-jwt, and that the owner's echo is unchanged. Source:
supabase/functions/telegram/index.ts.

### 2026-06-22 — Phase 5 (Piece 5a) — Telegram "round trip" (plumbing only)
WHAT CHANGED:
- Built the project's first cloud (edge) function, `telegram`. When you text the
  bot, it replies "Got it: <your text> — your Telegram chat ID is <number>". No
  AI, no database, no schema change — this only proves Telegram → cloud → reply.
- Deployed it with the login-check OFF (`--no-verify-jwt`) so Telegram's calls
  aren't rejected, and pointed Telegram's webhook at it.
- Stored the bot token in Supabase's encrypted secret store (`TELEGRAM_BOT_TOKEN`),
  never in the repo/GitHub.
- Setup fix: the Supabase command-line tool was logged into an OLD abandoned
  "lifeos" project; connected it to the REAL one (`cntlptuacsujbdtwvbis`) via an
  access token from the correct account. (See decisions doc.)

FILES TOUCHED: supabase/functions/telegram/index.ts, supabase/config.toml (new),
supabase/.gitignore (new), 02-roadmap.md, 03-decisions.md, 04-handoff-log.md

HOW TO VERIFY (on your phone):
1. Open Telegram and go to your bot's chat.
2. Send it: hello
3. Within a second or two you should get back:
   "Got it: hello — your Telegram chat ID is <some number>"
4. Send me that number — Piece 5b uses it to lock the bot to only you.

KNOWN GAPS / RISKS (expected, not bugs):
- The bot replies to ANYONE who messages it until 5b locks it to your chat id.
  Fine for now — nobody knows it exists.
- No saving yet: it does not create tasks/events and does not use Gemini. That
  starts after 5b.
- Stickers/photos/voice (messages with no text) are quietly ignored for now.

NEXT: 5b — lock the bot to your Telegram chat id only (using the number you send).

FOR THE CHECKER: confirm the function is small and only echoes (no DB writes, no
schema change); that deploy used --no-verify-jwt; and that no token is committed
to the repo. Source: supabase/functions/telegram/index.ts.

### 2026-06-22 — Phase 3 (Piece 3e) — Subtasks (one level) — LAST PHASE-3 PIECE
⚠️ RUN THE SQL FIRST — the feature won't work (and the one-level rule won't be
enforced) until you do. A missed SQL step has bitten this project before.

SUPABASE STEP (required, once):
1. Open the SQL editor:
   https://supabase.com/dashboard/project/cntlptuacsujbdtwvbis/sql/new
2. Open `db/05_subtasks_guard.sql`, copy the WHOLE file, paste it in, click **Run**.
   You should see "Success. No rows returned."

WHAT CHANGED (UI + one new DB guard — NO table schema or RLS change):
- **Add a subtask:** tap a top-level task to open its editor → a calm **"+ Add
  subtask"** there. Subtasks are real tasks (same row: tick, edit, priority, due
  date, category). They inherit the parent's bucket.
- **Nesting:** subtasks show **indented under their parent** in Today/This Week/
  Someday, reusing the Categories tree's calm indentation. **One level only.**
- **Parent count:** a parent with subtasks shows a quiet **"X of Y done"** — it
  does **NOT** auto-complete and is never blocked; the parent has its own tick.
- **Completing/reopening a subtask** updates the count; **completing the parent is
  independent.**
- **One level only is enforced in the DB** (new trigger `tasks_before_write` in
  `db/05_subtasks_guard.sql`) as well as the UI (no "+ Add subtask" on a subtask).
- **Parent-delete promotes children:** I added a **"Delete task"** action in the
  list editor. The `parent_task_id` FK was ALREADY `ON DELETE SET NULL` (from
  Piece 1) — so deleting a parent **promotes its subtasks to top-level (they
  survive)**, never deletes them. (Checked the FK; no change needed.)

FILES TOUCHED:
- New: `db/05_subtasks_guard.sql` (the one-level DB guard — RUN IT)
- Edited: `src/Today.jsx` (select parent_task_id; group subtasks; add-subtask +
  delete handlers), `src/TaskBlock.jsx` (render parent + nested subtasks),
  `src/TaskRow.jsx` (indent, count, "+ Add subtask", Delete), `src/tasks.css`
- NOT touched: the tasks table schema / RLS policies (the guard is an added
  trigger, not a schema/RLS change).

HOW TO VERIFY (on your Mac — RUN THE SQL FIRST):
1. After running the SQL: `npm run dev`, log in → **Today**.
2. Add a **parent task**. Tap it → **"+ Add subtask"** → add **two** subtasks.
   They appear **indented** under the parent, which shows **"0 of 2 done"**.
3. **Complete one subtask** → the count becomes **"1 of 2 done"** and the parent
   is **NOT** auto-completed.
4. **You cannot add a subtask to a subtask** — tap a subtask: there's no "+ Add
   subtask" option. (The database also refuses it if bypassed.)
5. **Complete the parent** with its own tick → that's independent of the subtasks.
6. **Delete the parent** (tap it → **Delete task**) → its subtasks **survive**,
   now promoted to top-level tasks in their bucket (NOT gone).
7. **Reload**, then **Settings → Log out** and back in → everything persisted and
   only yours.

KNOWN GAPS / RISKS:
- **If the SQL isn't run:** the one-level rule isn't DB-enforced and adding a
  subtask may error — run `db/05_subtasks_guard.sql` first.
- One level only (by design); no drag-to-reorder, no drag-to-reparent, no subtask
  nesting on the calendar grid. Delete has no confirm dialog (matches Categories;
  parent-delete is non-destructive — children promote).

NEXT: **Phase 3 is now fully closed pending your verification** (3a–3e all done).
After you verify, tell me and I'll mark Phase 3 fully ✅. Then **Phase 5 — Telegram
capture** (Phase 4 is already verified done).

FOR THE CHECKER:
- **One-level rule is enforced at the DATABASE** (`db/05_subtasks_guard.sql`'s
  `tasks_before_write` trigger), not just the UI.
- **RLS stays owner-only** — the trigger only validates (no SECURITY DEFINER); no
  policy change.
- **The parent shows a count and does NOT auto-complete** (and isn't blocked).
- **Deleting a parent does NOT silently destroy its subtasks** — the FK is
  `ON DELETE SET NULL`, so children are promoted to top-level.
- No table schema / RLS change (a trigger was added; no columns or policies changed).

### 2026-06-22 — Phase 3 (Piece 3d) — The Someday view
WHAT CHANGED (UI only — NO database/schema/RLS change; reads/writes time_bucket='Someday'):
- **A quiet "Someday" expander below the This Week block**, collapsed by default —
  a single muted line (uppercase "Someday" + a count + a caret), deliberately NOT a
  third headline competing with Today/This Week.
- **Expanding it reveals the Someday tasks** (time_bucket='Someday') using the
  **exact same shared task rows** as Today/This Week (tick to complete/reopen, tap
  to edit, dot+tag, priority, due-date dateline) and the same **"+ Add a task"**
  (adding lands the task in Someday). Reuses `TaskBlock` with its big headline
  suppressed (a new `hideTitle` prop) — not a re-implementation.
- **Open/closed is session-only** (no persistence — kept simple).
- **Zero-scroll holds:** the drawer opens into its **own scroll region** (a
  max-height area that scrolls internally), so it never lengthens the page.

FILES TOUCHED:
- New: `src/SomedayDrawer.jsx`
- Edited: `src/TaskBlock.jsx` (`hideTitle` prop), `src/Today.jsx` (compute Someday
  tasks + render the drawer), `src/today.css`
- NOT touched: `db/` (no schema/RLS change).

HOW TO VERIFY (on your Mac — no SQL):
1. `npm run dev`, log in → **Today**. Below **This Week** you'll see a quiet
   **"Someday"** line with a count and a ▸ caret — collapsed.
2. Click it to **expand** (caret turns ▾). Use its **"+ Add a task"** to add a
   couple of tasks (one with a **due date** and a **priority**) — confirm the rows
   look exactly like Today/This Week rows.
3. **Tick one done** and **tap one to edit** — full row behaviour works.
4. With it **expanded, confirm the page still doesn't scroll** — the Someday list
   scrolls inside its own area (add several to see the inner scroll).
5. **Collapse** it again (the rows hide; it's a single quiet line).
6. **Reload**, then **Settings → Log out** and back in → the Someday tasks
   persisted and are only yours.

KNOWN GAPS / RISKS:
- Open/closed state resets on reload (session-only, by design).
- A task's bucket is set when adding / in the editor — **no drag-between-buckets
  UI** (not this piece).

NEXT: Phase 3, Piece 3e — subtasks (the last Phase-3 piece), then Phase 5.

FOR THE CHECKER:
- **No schema/RLS change.** `db/` untouched; Someday just reads/writes the existing
  `time_bucket` column (value 'Someday').
- **Someday reuses the shared task row/block** (`TaskBlock`/`TaskRow` with
  `hideTitle`) — not a parallel implementation.
- **Expanding does NOT break desktop zero-scroll** — the drawer body has its own
  `max-height`/`overflow-y:auto`; the page (`.today`) stays `overflow:hidden`.

### 2026-06-22 — Phase 3 (Piece 3c) — Due dates on tasks
WHAT CHANGED (UI only — NO database/schema/RLS change; writes only the existing due_date column):
- **A due-date control in the shared task editor** (`TaskEditForm`) — set or clear
  a task's due date (a date, not a time). Because the form is shared, it appears
  **wherever a task is edited — the list AND the calendar**.
- **A calm dateline in the task rows** (Today / This Week): "Due Jun 25" or "Due
  today", in the muted dateline style. Only shows when a due date is set.
- **Overdue treatment:** a task due in the past (and not done) shows its dateline
  in the **brick `--overdue` colour** — NOT the terracotta accent (accent stays
  reserved). A task due **today reads "Due today", not overdue**. A **done task
  never shows overdue** (dateline drops to muted).
- Due date is kept **distinct from scheduled_start/end** — it's a deadline, not a
  scheduled time, and is **never rendered as a block on the calendar grid**.
- Added a `--overdue` token to theme.css (brick; the prompt assumed it existed —
  it didn't). `due_date` added to the two task SELECTs (reading an existing
  column).

FILES TOUCHED:
- New: `src/dueDate.js` (status + calm formatting, parsed as a local date)
- Edited: `src/TaskEditForm.jsx` (the control), `src/TaskRow.jsx` (the dateline),
  `src/tasks.css`, `src/theme.css` (`--overdue`), `src/Today.jsx` +
  `src/useWeekData.js` (select due_date)
- NOT touched: `db/` (no schema/RLS change).

HOW TO VERIFY (on your Mac — no SQL):
1. `npm run dev`, log in → **Today**.
2. Tap a task → in the editor, **set a Due date** → the row shows a calm "Due
   <date>" dateline.
3. Set a task's due date to a **past date** → the dateline reads in the **brick
   overdue colour** (a muted dark red, NOT the bright terracotta accent).
4. Set a task's due date to **today** → it reads **"Due today"** in the normal
   muted colour (not overdue).
5. **Mark an overdue task done** → the overdue colour drops (the dateline goes
   muted / the row strikes through).
6. **Clear** a due date (the Clear button in the editor) → the dateline disappears.
7. **Reload**, then **Settings → Log out** and back in → due dates persisted and
   only yours.

KNOWN GAPS / RISKS:
- Display + edit only — **no sorting/filtering by due date**, and no reminders
  (that's the Telegram brief's job later).
- Due dates don't appear on the calendar grid by design (a deadline isn't a
  scheduled time).

NEXT: Phase 3, Piece 3d — the Someday view (then 3e subtasks, then Phase 5).

FOR THE CHECKER:
- **No schema/RLS change.** `db/` untouched; the editor writes only the existing
  `due_date` column (clearing sets it null); SELECTs just read it.
- **due_date is distinct from scheduled_start/end** — it's shown as a row dateline,
  never as a calendar block.
- **Overdue uses `--overdue` (brick `#A85C44`), not the terracotta accent**; "due
  today" is not overdue; done tasks never show overdue.

### 2026-06-22 — Phase 4 verified DONE; roadmap corrected; 3c–3e are next
WHAT CHANGED (docs only — no code/schema/RLS):
- **Phase 4 (the calendar) is owner-verified complete** → marked ✅ in the roadmap.
- **Phase 3 marker corrected:** it had been functionally done for several sessions
  but still read "🔨 CURRENT" while Phase 4 was built on top — flipped to ✅ for the
  core (add/edit/complete/prioritise/time-bucket, tasks reference categories,
  schedulable onto the calendar).
- **Three deferred Phase-3 pieces** — subtasks, the due-date picker, the Someday
  view — were never built and are the immediate next builds, **in this order:
  3c due-dates → 3d Someday → 3e subtasks**, before Phase 5. UI only (the columns
  already exist from Piece 1; no schema change). Recorded in the decisions doc.

NEXT: Piece 3c — the due-date picker (then 3d Someday, 3e subtasks, then Phase 5 —
Telegram capture).

### 2026-06-22 — Phase 4 (Piece 4h) — Resize & create on the week + task editor on the calendar
WHAT CHANGED (UI only — NO database/schema/RLS change; writes only existing columns):
- **Resize on the week:** dragging a block's **top/bottom edge** now resizes it
  (15-min snap, clamped so it can't invert) — exactly as the day column. An
  **edge-grab resizes; a middle-grab moves** (incl. cross-day from 4g). The two
  views now behave identically.
- **Create on the week:** **tap an empty slot** in a day's column → the new-event
  panel pre-filled at that day + time (one-hour default); a quiet **"+ Add event"**
  bar above the grid opens the same panel at the next hour. Saves + re-renders
  with the side-by-side overlap split.
- **Tap a task block → edit the task** (your pick): on the day AND the week,
  tapping a dotted task block opens the **task editor** (title / notes / category /
  priority) as a calm overlay. It **stays a task** (writes only task columns). The
  editor fields are now a shared `TaskEditForm` used by both the list row and the
  calendar overlay (reuse, not a copy).
- This brings the week to **full parity with the day column** — the calendar's
  core interactions are complete.

FILES TOUCHED:
- New: `src/TaskEditForm.jsx` (shared task fields), `src/TaskPanel.jsx` (calendar
  task overlay), `src/useWeekData.js` (week data + writes, split out to keep
  WeekCalendar small)
- Edited: `src/WeekCalendar.jsx` (resize on, create, task panel; uses useWeekData),
  `src/DayTimeline.jsx` (task panel on the day), `src/Today.jsx` (passes the task
  editor wiring), `src/TaskRow.jsx` (uses the shared TaskEditForm), `src/calendar.css`
- NOT touched: `db/` (no schema/RLS change).

HOW TO VERIFY (on your Mac, mouse/trackpad — no SQL):
1. `npm run dev`, log in → **Calendar**.
2. **Resize:** drag a block's **top** edge (start changes) and **bottom** edge
   (end changes) → snaps to 15 min; reload → it kept the new size.
3. **Move vs resize don't conflict:** grab the **middle** and drag → it **moves**
   (and can cross to another day); grab an **edge** → it **resizes**.
4. **Create by slot:** click an empty time on, say, Thursday's column → the panel
   opens at Thursday, that hour, 3:00–4:00 default; add it → it appears there.
5. **Create by button:** click **"+ Add event"** (top right) → the panel opens at
   the next hour; add one.
6. **Task editor:** tap a **dotted task block** → the task editor opens (title /
   notes / category / priority); change its category or priority → it updates and
   the task is **still in its Today/This Week list** (unchanged type).
7. **Overlap:** resize/drag two items into the same time on one day → they **split
   side by side**.
8. **Reload**, then **Settings → Log out** and back in → everything persisted and
   only yours.

WHAT THE PHONE DOES (unchanged): the Calendar route still falls back to the
single-day view on narrow screens; no touch interactions added here.

KNOWN GAPS / RISKS:
- Multi-day events still show on their start day only; no recurrence; no week
  navigation to other weeks; nothing here touches Telegram/the brief.

NEXT: **Phase 4 is feature-complete pending your verification.** This was the last
of the calendar's core interactions (events + scheduled tasks, day + week, tap-
edit / move / cross-day / resize / create). After you verify, tell me and I'll
mark Phase 4 done in the roadmap. (I have NOT marked it done yet.) Then: Phase 5 —
Telegram capture.

FOR THE CHECKER:
- **No schema/RLS change.** `db/` untouched; resize writes `start_at`/`end_at`
  (events) or `scheduled_start`/`scheduled_end` (tasks); create inserts an event
  with title/times/etc; the task editor writes title/notes/category_id/priority —
  all existing columns; the four owner-only policies are intact.
- **Edge-resize and create reuse the day column's paths** (the same `useEventDrag`
  with `allowResize`, the same `EventPanel`) — not re-implementations.
- **Edge-grab now resizes (not moves) on the week** — the two views match — and
  middle-grab move / cross-day drag from 4g still work alongside it.
- **The task editor is the shared Piece-2a form** (`TaskEditForm`), so a task is
  edited the same way from the list and the calendar; it stays a task.

### 2026-06-22 — Phase 4 (Piece 4g) — Edit & move on the week (incl. cross-day drag)
WHAT CHANGED (UI only — NO database/schema/RLS change; writes only existing time columns):
- **The week view is now interactive** (was read-only in 4f):
  - **Tap an event block → the same edit panel** as the day column (4c); edit and
    save work exactly as on the day view.
  - **Drag to move within a day** — vertical drag changes the time, snapping to 15
    minutes (reuses the day's drag hook, not a second one).
  - **Drag across day columns — the new part:** dragging a block left/right into
    another day changes its **date** while keeping its **time** (combined
    vertical+horizontal changes both). The block follows the pointer across
    columns with a calm snapped preview; horizontal snaps to whole day-columns.
  - **Scheduled tasks move too** (within a day or across days) — writes their
    scheduled_start/scheduled_end; they stay tasks in their list.
- **Tap-vs-drag preserved** — a plain tap still opens the panel; only a drag past
  the ~4px threshold moves a block. A careful tap never starts a cross-day drag.
- **Overlap re-splits side by side on drop** in the destination day (reuses
  eventLayout.js). Moving keeps duration fixed, so it can't invert (end-before-
  start guard never reached).
- **Reused, not rebuilt:** the day's drag hook now takes a `geometry` object so
  the same hook drives both views (day = X ignored; week = X → which column). The
  edit panel, DayColumn, EventBlock and eventLayout.js are all shared.

FILES TOUCHED:
- New: `src/WeekDragPreview.jsx` (the floating cross-column drag preview)
- Edited: `src/useEventDrag.js` (geometry-injected; cross-day via `dayStartMsAt`;
  resize/unschedule flags), `src/WeekCalendar.jsx` (interactive: loads + writes,
  the hook with week geometry, the panel, the overlay), `src/DayTimeline.jsx`
  (builds its day geometry), `src/DayColumn.jsx` (+ ghost/resizable),
  `src/EventBlock.jsx` (+ ghost / resizable gating), `src/calendar.css`,
  `src/dayTimeline.css`
- NOT touched: `db/` (no schema/RLS change).

HOW TO VERIFY (on your Mac, mouse/trackpad — no SQL):
1. `npm run dev`, log in. On **Today**, make a couple of events and schedule a
   task; edit some events' dates so you have items on a few different days.
2. Click **Calendar**.
3. **Tap an event** → the **edit panel** opens; change something, Save → it
   updates. (Confirms tap-to-edit works.)
4. **Move within a day:** drag an event up/down → it snaps to 15 min; release,
   **reload** → it stayed at the new time.
5. **Cross-day:** drag an event from one day's column to another → its **date
   changes, its time holds**; reload → it's on the new day.
6. **Task across days:** drag a dotted task block to another day → it moves and is
   **still in its task list** (check the Today list).
7. **Tap still works:** a quick click still opens the panel (drag didn't eat it).
8. **Overlap:** drag two items onto the same time in one day → they **split side
   by side**.
9. **Narrow the window** → still falls back to the **single-day view** (not a
   squished grid). **Reload**, log out/in → all persisted and only yours.

WHAT THE PHONE DOES (unchanged): the Calendar route still falls back to the
single-day view (DayAgenda) on narrow screens — no touch-drag on the week (touch
never starts a drag).

KNOWN GAPS / RISKS:
- **Resize on the week and create on the week are NOT in this piece** — that's 4h.
  (On the week, grabbing a block edge moves it, it doesn't resize.)
- **Tapping a scheduled-task block does nothing** (consistent with the day view —
  edit a task's text in its list; it stays a task). If you'd like a task editor
  reachable from the grid, say so and I'll add it as a small follow-up.
- Multi-day events still show on their start day only; no recurrence; no week nav.

NEXT: Phase 4, Piece 4h — resize + create on the week view.

FOR THE CHECKER:
- **No schema/RLS change.** `db/` untouched; moving writes only `start_at`/`end_at`
  (events) or `scheduled_start`/`scheduled_end` (tasks) on existing columns; the
  four owner-only policies are intact.
- **The week reuses the day column's drag hook and edit panel** (not a
  re-implementation) — same `useEventDrag` (now geometry-injected), same
  `EventPanel`, `DayColumn`, `EventBlock`, `eventLayout.js`.
- **Tap-to-edit works alongside drag** — selection stays on the click; a press
  under the threshold is a tap, not a zero-distance drag.
- **Cross-day drag changes the date while keeping the time** (the move sets the
  new day's midnight + the same minutes; duration fixed).

### 2026-06-22 — Phase 4 (Piece 4f) — The week view, made real (read-only)
WHAT CHANGED (UI only — NO database/schema/RLS change; read-only render):
- **The Calendar route now renders a real week** (was the empty Phase-1 shell):
  seven day columns **Mon–Sun**, the week's date range in the header corner, hour
  rows down the side, today's column subtly marked, the **now-line on today**.
- **Events render in each day** as blocks (same style as the day column: paper,
  hairline, category-coloured left rule, kicker + time + title; uncategorised =
  neutral, no Inbox tag).
- **Scheduled tasks render as dotted blocks** in each day (same 4e treatment) —
  still belonging to their task list; this is just their second view on the week.
- **Overlaps within a day split side by side**, reusing the same packing as the
  day column — an event and a scheduled task overlapping in one day split too.
- **Only the current week** shows (no week navigation — none existed; not built).
- **Shared, not duplicated:** factored a `DayColumn` component used by BOTH the
  day timeline and the week (the day view is the interactive version; the week is
  read-only). The overlap layout, the item-building, the block render and the
  scroll-to-now are all shared.
- **Desktop zero-scroll:** the grid scrolls through the hours internally (opens
  around now/7am); the page itself stays put.

WHAT THE PHONE DOES (unchanged — confirm it's not a squished week):
- On a narrow screen the Calendar route still falls back to the existing
  single-day view (DayAgenda), NOT a 7-column grid. (That phone day view is still
  the plain shell — wiring events into the phone Calendar view isn't this piece;
  the Today route's phone timeline already shows events.)

FILES TOUCHED:
- New: `src/DayColumn.jsx` (shared one-day column render)
- Edited: `src/WeekCalendar.jsx` (loads the week's events + scheduled tasks +
  categories; renders seven DayColumns), `src/DayTimeline.jsx` (now uses
  DayColumn for its interactive column), `src/EventBlock.jsx` (an `interactive`
  flag — hides handles / × / grab cursor when read-only), `src/eventLayout.js`
  (shared `buildDayItems`), `src/dateUtils.js` (shared `nowScrollTop`),
  `src/calendar.css`, `src/dayTimeline.css`
- NOT touched: `db/` (no schema/RLS change).

HOW TO VERIFY (on your Mac — no SQL):
1. `npm run dev`, log in. On **Today**, add a couple of events on the day grid,
   and (via the grip) schedule a task or two. To get items on OTHER days this
   week, set an event's date in its edit panel (Start/End date), or schedule
   tasks then drag/edit — anything that lands them on different days this week.
2. Click **Calendar**. You should see **seven columns Mon–Sun**, the week range in
   the top-left, hour rows, and **today's column marked with the now-line**.
3. Your **events** sit on the right days at the right times with their category
   colours; **scheduled tasks** show as **dotted blocks**.
4. Put two items at the same time on one day → they **split side by side**, both
   readable. (An event + a scheduled task overlapping splits too.)
5. **Narrow the window** (or open on a phone) → it falls back to the **single-day
   view**, not a squished 7-column grid.
6. **Reload** → the whole week renders again from the database.

KNOWN GAPS / RISKS:
- **Read-only** — you can't drag/move/resize/create on the week yet (that's 4g);
  tapping a week block does nothing.
- **Multi-day events show on their start day only** (no all-day/multi-day banners
  this piece) — a known gap.
- **No week navigation** (current week only) — deferred.
- The phone Calendar view is still the plain day shell (no events drawn there yet).

NEXT: Phase 4, Piece 4g — drag/edit on the week view.

FOR THE CHECKER:
- **No schema/RLS change.** `db/` is untouched; the week view only READS events +
  tasks (owner-only RLS still applies). No writes.
- **The week reuses the day column's logic, not a re-implementation** — both
  render through the shared `DayColumn` + `eventLayout.js` + `EventBlock`; the week
  passes the read-only (non-interactive) variant.
- **Overlap splits side by side** on the week (same `layoutEvents` over a day's
  events + scheduled tasks).
- **The phone still falls back to the single-day view** (DayAgenda), not a squished
  week.

### 2026-06-22 — Phase 4 (Piece 4e) — Drag a task onto the grid to schedule it
WHAT CHANGED (UI only — NO database/schema/RLS change; writes only scheduled_start/scheduled_end):
- **Drag a task from its list row (a quiet grip "⠿") onto "The Day"** → it gets a
  time block: `scheduled_start` at the drop time, `scheduled_end` one hour later
  (snapped to 15 min). Saves on drop. A ghost chip follows the pointer.
- **A scheduled task STAYS a task** (the core rule): it still shows in its Today/
  This Week list (now with a small "scheduled" note), is still ticked complete
  there, and its grid block is just a second view. Ticking it done in the list
  shows the grid block struck through.
- **Scheduled tasks render as dashed/dotted blocks** on the grid — visually
  distinct from events (solid) — same category colour + kicker otherwise.
- **Move/resize a task block reuses the 4d drag** (writes scheduled_start/
  scheduled_end). **Task and event blocks share the same side-by-side overlap
  layout** — overlapping ones split, both readable.
- **Unschedule two ways:** drag the block off the grid's right edge (it fades as
  you cross), OR click the small "×" on the block. Either way the task returns to
  a plain list item with no time block — nothing deleted, just the times cleared.

FILES TOUCHED:
- New: `src/useScheduleDrag.js` (list→grid scheduling drag)
- Edited: `src/useEventDrag.js` (now kind-aware: events vs scheduled-task blocks,
  + unschedule on off-grid drop), `src/DayTimeline.jsx` (merges events + scheduled
  tasks into one layout; routes saves by kind), `src/EventBlock.jsx` (dashed task
  block, completion, "×" unschedule), `src/Today.jsx` (shared scrollRef, schedule/
  unschedule handlers, scheduled-task data, ghost), `src/TaskBlock.jsx` +
  `src/TaskRow.jsx` (the drag grip), `src/dayTimeline.css`, `src/tasks.css`,
  `src/today.css`
- NOT touched: `db/` (no schema/RLS change).

HOW TO VERIFY (on your Mac, with a mouse/trackpad — no SQL):
1. `npm run dev`, log in → **Today**. Have a task or two in the **Today** block.
2. **Schedule:** press the grip (⠿) on a Today task and drag it onto the grid at
   ~3pm, release → it appears as a **dashed block, 3:00–4:00**, AND the task is
   **still listed in Today** (now tagged "scheduled").
3. **Resize:** drag the block's bottom edge → its end changes; release. Reload →
   the new size persisted.
4. **Completion reflects:** tick the task complete in the **Today list** → the
   grid block shows **struck through**. Untick → back to normal.
5. **Unschedule (both ways):** click the block's **×** → it leaves the grid and
   the task stays in the list. Schedule it again, then **drag it off to the right
   edge** → same result (it fades, then on release it unschedules).
6. **Overlap:** schedule a task over an existing event (same time) → they **split
   side by side**, both readable.
7. **Reload**, then **Settings → Log out** and back in → everything persisted and
   only yours. (Nothing was deleted by unscheduling — the tasks are all still there.)

WHAT TOUCH DOES (unchanged — touch-drag isn't the target):
- On touch, the grip does nothing (touch never starts a drag); tasks stay in their
  blocks and the timeline still taps to edit/create. No touch-drag this piece.

KNOWN GAPS / RISKS:
- Tapping a scheduled-task *block* on the grid does nothing (edit a task's details
  in its list row — it's still a task); the block's controls are drag + the ×.
- Scheduling is by drag only (no "type a time" in a panel) — that can come later.
- **The week view is still 4f/4g** — this is the day column only. No recurrence,
  no multi-day.

NEXT: Phase 4, Piece 4f — make the week view real.

FOR THE CHECKER:
- **No schema/RLS change.** `db/` is untouched; scheduling writes only
  `scheduled_start`/`scheduled_end` (unschedule sets them null) on existing task
  columns; the four owner-only policies are intact.
- **A scheduled task is STILL a task** — same row in the tasks table (type
  unchanged), still in its Today/This Week list, still ticked there; only its two
  scheduled_* columns change.
- **Scheduled-task blocks join the same overlap layout as events** (one
  `layoutEvents` call over both), so a task block and an event block overlapping
  split side by side.

### 2026-06-22 — Phase 4 (Piece 4d) — Drag to move / resize events on the day column
WHAT CHANGED (UI only — NO database/schema/RLS change; drag writes only start_at/end_at):
- **Drag an event block up/down to move it** (duration stays fixed); **drag its
  top edge to change the start, its bottom edge to change the end** (resize).
- **Snaps to 15-minute steps live** as you drag — the block follows the pointer
  (snapped), so what you see is where it lands. Smooth, no bounce.
- **On release it saves** the new start_at/end_at to the database; the grid
  re-lays-out (so a drag into an overlap splits side by side as in 4b).
- **Taps are preserved** — the careful bit. A press only becomes a drag past a
  ~4px threshold; under that it's a tap: a plain tap on a block still opens the
  edit panel (4c), a tap on an empty slot still creates an event (4c).
- **Resize can't go backwards** — it stops at a 15-minute minimum duration, so an
  event's end can never cross its start (the DB guard isn't even reached).
- **Auto-scrolls** the day column when you drag near its top/bottom edge; the page
  itself never scrolls.
- Gesture logic is isolated in a small hook (`useEventDrag.js`), separate from the
  render.

WHAT TOUCH DOES (unchanged — touch-drag is deliberately NOT built this piece):
- On touch screens, dragging an event does nothing (touch never starts a drag);
  the column scrolls and **tap-to-edit / tap-to-create still work exactly as
  before**. Touch-drag polish is a later concern, not this piece's target.

FILES TOUCHED:
- New: `src/useEventDrag.js` (the drag hook — pointer handling, snap, threshold)
- Edited: `src/EventBlock.jsx` (spreads the drag handlers, adds edge handles),
  `src/DayTimeline.jsx` (uses the hook, live preview per block),
  `src/dayTimeline.css` (grab cursor, resize handles, dragging state)
- NOT touched: `db/` (no schema/RLS change), the event panel, tasks code.

HOW TO VERIFY (on your Mac, with a mouse/trackpad — no SQL):
1. `npm run dev`, log in → **Today**. Have a few events on the grid (add via tap /
   "+ Add event" if needed).
2. **Move:** press the middle of an event and drag up/down → it follows in
   15-min snaps. Release → it stays. **Reload** → it's at the new time.
3. **Resize:** drag the **top edge** → the start changes; drag the **bottom edge**
   → the end changes. Release, reload → the new size persisted.
4. **Taps still work:** a quick click on an event opens the **edit panel**; a click
   on an **empty slot** still creates an event. (Drag didn't eat them.)
5. **Overlap:** drag one event over another → on release they **split side by
   side**, both readable.
6. **No backwards:** drag the bottom edge up past the top (or the top down past the
   bottom) → it **stops** at a 15-minute minimum; it won't invert.
7. **Reload**, then **Settings → Log out** and back in → everything persisted and
   only yours.

KNOWN GAPS / RISKS:
- **Touch-drag isn't built** (mouse/trackpad only) — tap still works on touch.
- The time label inside a block shows the saved start until you release (the
  block's position is the live preview); updates on save.
- **Task-scheduling onto the grid is still later (4e)** and **the week view (4f/4g)**
  — this is events-only, day-column-only, move + resize only. No recurrence,
  no multi-day drag.

NEXT: Phase 4, Piece 4e — drag-to-schedule tasks onto the day grid.

FOR THE CHECKER:
- **No schema/RLS change.** `db/` is untouched; a drag writes only `start_at` /
  `end_at` on existing columns; the four owner-only policies on `events` are intact.
- **Tap-to-edit and tap-empty-slot-to-create still work** — selection stays on the
  click; only a real drag (past the threshold) swallows the click. A press that
  doesn't cross the threshold is a tap, not a zero-distance drag.
- **Resize can't produce a backwards event** — clamped to a 15-minute minimum
  duration, so end ≥ start always holds before any save.

### 2026-06-22 — Phase 4 (Piece 4c) — Add / edit / delete events on the timeline
WHAT CHANGED (UI only — NO database/schema/RLS change; writes to existing columns):
- **The day timeline is now editable.** Four ways in:
  - **Tap an empty slot** on the grid → a new-event panel pre-filled at that hour,
    one-hour default (e.g. tap 2pm → 2:00–3:00), adjustable.
  - **"+ Add event"** (a quiet accent affordance, like "+ Add a task") → the same
    panel at the next whole hour.
  - **Tap an event block** → an edit panel: change title, notes, start, end,
    location, and category (the same CategoryTag chip picker as tasks). Saving
    updates the block on the grid.
  - **Delete** from inside the edit panel → the block leaves the grid.
- The panel is a **calm overlay** over the day column (the grid behind stays put,
  so the page never scrolls). It reuses the task edit panel's field + chip styling
  so it feels like the same family (decision recorded). Category chips offer
  "Uncategorised" (neutral, not Inbox) plus your categories.
- **DB guards respected, not re-implemented:** a backwards event (end before
  start) is refused by the database and shown as a calm message in the panel
  ("That event ends before it starts — check the times"). The category-on-delete
  rule (4a) is unchanged.
- **Retired the 4a "Events (verify)" section in Settings** — events are managed on
  the timeline now. (`EventsVerify.jsx` + `events.css` deleted; Settings is back to
  account + Categories.)

FILES TOUCHED:
- New: `src/EventPanel.jsx`, `src/eventPanel.css`
- Edited: `src/DayTimeline.jsx` (tap-to-create, "+ Add event", overlay panel),
  `src/EventBlock.jsx` (tap-to-edit), `src/Today.jsx` (event create/edit/delete
  handlers + notes/location in the query), `src/dayTimeline.css`, `src/today.css`
  (phone height), `src/calendar.css` (now-line click-through), `src/Settings.jsx`,
  `src/settings.css`
- Deleted: `src/EventsVerify.jsx`, `src/events.css`
- NOT touched: `db/` (no schema/RLS change).

HOW TO VERIFY (on your Mac — no SQL):
1. `npm run dev`, open http://localhost:5173, log in → you land on **Today**.
2. On "The Day" column, **tap an empty slot** (say around 2pm) → a panel opens
   with Start 2:00 and End 3:00. Give it a title, pick a category, **Save** → the
   block appears on the grid at 2–3pm with its category colour.
3. Click **+ Add event** (top of the column) → the same panel opens defaulted to
   the next hour. Add one.
4. **Tap an existing event** → the edit panel opens; change its title, time and
   category, **Save** → the block updates in place.
5. Add a new event that **overlaps** an existing one → they split **side by side**,
   both readable.
6. Open an event, set **End before Start**, **Save** → a calm message appears and
   it doesn't save.
7. Open an event and click **Delete** → the block leaves the grid.
8. **Reload** (Cmd-R) → everything is still there. **Settings → Log out**, log
   back in → still there and only yours. (Settings no longer has an Events
   section.)

KNOWN GAPS / RISKS:
- **No dragging to move/resize yet** — create/edit/delete is via the panel; drag
  is the next piece.
- **Time-blocked tasks still aren't on the grid** (the dotted-task block) — that
  comes with drag-to-schedule.
- `repeat_rule` stays unused in the UI (no recurrence); no quiet-hours, no week
  view.
- Tap-to-create rounds to the tapped hour; fine-tune the minutes in the panel.

NEXT: Phase 4, next piece — likely drag-to-move/resize events on the grid.

FOR THE CHECKER:
- **No schema/RLS change.** `db/` is untouched; create/edit/delete write only to
  existing event columns (title, notes, start_at, end_at, location, category_id);
  the four owner-only policies on `events` are unchanged.
- **The Settings verify UI is retired** (files deleted; events created only on the
  timeline now).
- **The DB guards still hold through the new UI:** the backwards-time CHECK refuses
  bad saves (surfaced as a plain message), and the category set-null-on-delete rule
  is untouched.

### 2026-06-22 — Phase 4 (Piece 4b) — The day-column timeline (read-only)
WHAT CHANGED (UI only — NO database/schema/RLS change; pure read + render):
- **Replaced the "The Day" placeholder** on the Today page with a real **24-hour
  day timeline** for today, matching the week-shell's hour range and behaviour:
  it scrolls inside its own column and opens **centred around now** (or ~7am if
  now is outside working hours). The page itself does not scroll (zero-scroll).
- **The terracotta now-line** (the existing `NowLine`) shows the current time.
- **Today's events render as blocks**, positioned by start_at/end_at: paper
  background, hairline border, a **category-coloured left rule**, a small-caps
  **category kicker + start time**, and the title. Uses the existing palette
  colours. **Uncategorised events get a calm neutral rule and no category kicker**
  — never an "Inbox" tag (events don't use Inbox).
- **Only today's events appear** — the load query fetches just events whose
  start is within today's local bounds; other days never show here.
- **Overlap = side by side** (your choice): overlapping events split the lane
  into columns so each is visible but narrower; nothing is hidden. (Decision
  recorded; logic is in the pure `src/eventLayout.js`.)
- **Read-only:** tapping an event does nothing this piece (editing is 4c). Events
  are still managed only via the 4a verify UI in Settings.

WHAT THE PHONE DOES (kept working, not polished — desktop is this piece's target):
- The Today page stacks to one column and the whole page scrolls; the day
  timeline sits on top in a fixed ~60vh scroll area (so it doesn't collapse),
  with the task blocks below. The standalone Calendar route's phone day view is
  unchanged. Full phone-calendar polish is a later piece.

FILES TOUCHED:
- New: `src/DayTimeline.jsx`, `src/EventBlock.jsx`, `src/eventLayout.js` (pure
  overlap packing), `src/dayTimeline.css`
- Edited: `src/Today.jsx` (loads today's events, renders the timeline),
  `src/today.css` (dropped the dead placeholder styles; phone timeline height)
- NOT touched: `db/` (no schema/RLS change), the events verify UI, tasks code.

HOW TO VERIFY (on your Mac — no SQL):
1. `npm run dev`, open http://localhost:5173, log in. Go to **Settings → Events
   (verify)** and add a few events **for today** at different times, plus **one
   for tomorrow**. Make **two of today's overlap** (e.g. 14:00–15:00 and
   14:30–15:30). Add **one uncategorised** (Category = Uncategorised).
2. Click **Today**. On the left "The Day" column you should see:
   - the hour grid, opened around the current time, with the **terracotta
     now-line**;
   - today's events as blocks at the right times, each with its **category colour**
     on the left rule + a small-caps kicker;
   - the **two overlapping events side by side**, both readable, neither hidden;
   - the **uncategorised event neutral** (grey rule, no category kicker);
   - the **tomorrow event does NOT appear**.
3. **Reload** (Cmd-R) → it all renders again from the database.
4. (Optional) Resize the window narrow / open on a phone → the page stacks, the
   timeline shows in a scroll area on top, task blocks below — nothing breaks.

KNOWN GAPS / RISKS:
- **Time-blocked tasks are deliberately NOT on the grid yet** (the dotted-task
  block in the mock) — nothing can schedule a task until the drag-to-schedule
  piece; this is events-only for now.
- No add/edit/delete on the timeline (read-only — that's 4c); no recurrence,
  quiet-hours collapsing, week view, or drag.
- Multi-day events: only events whose START is today show here (kept simple).
- Built from your description + the week-shell conventions (the mock file still
  isn't in the repo) — compare to your mock and I'll tune spacing/type.

NEXT: Phase 4, Piece 4c — adding / editing / deleting events on the timeline.

FOR THE CHECKER:
- **No schema/RLS change.** `db/` is untouched; this piece only READS the events
  table (owner-only RLS still applies). No writes from the timeline.
- **Only today's events render** — fetched with `start_at` ≥ today 00:00 and <
  tomorrow 00:00 (local); other days can't appear.
- **Overlap splits side-by-side** (see `eventLayout.js`) — each event gets its own
  column; neither is hidden or covered.
- **Uncategorised events show neutral** — a grey left rule and no category kicker,
  never an "Inbox" tag.

### 2026-06-22 — Phase 4 (Piece 4a) — Events spine table + bare-bones verify UI
WHAT CHANGED:
- **New `events` table in Supabase**, built to the FULL architecture shape so the
  4b timeline + future Apple-sync bolt on with no rebuild: title, notes, category,
  start_at / end_at (calendar-standard span), location, repeat_rule, the hidden
  external_id, created_at. SQL: `db/04_events.sql` (run it once — steps below).
  RLS ON, owner-only (the same four `auth.uid() = user_id` policies as tasks).
- **Category link is set-null-on-delete, NEVER cascade** — deleting a category
  empties its events' category (they fall to uncategorised) instead of deleting
  them. Mirrors the tasks rule exactly. Enforced in the DB.
- **Backwards-event guard in the DB** — a CHECK constraint (`end_at >= start_at`)
  means an event that ends before it starts can never be stored.
- **A calm Events (verify) section** lists events with their span + category
  dot+tag, adds one (title + start + end pickers + optional category), and
  deletes one. Reuses the paper/ink/Fraunces foundation + `CategoryTag`. This is
  a throwaway verify UI — the real events live on the Phase-4b timeline.
- NOT built: the timeline / hour grid, event blocks, the now-line, drag-to-
  schedule, recurrence logic, overlap handling, the week/day calendar split. The
  schema has the fields; the UI just proves save/read/delete.

WHERE I PUT THE VERIFY UI:
- Inside **Settings**, below the Categories manager (a temporary section behind a
  hairline). It's throwaway — it'll be removed when the real calendar lands.

FILES TOUCHED:
- New: `db/04_events.sql`, `src/EventsVerify.jsx`, `src/events.css`
- Edited: `src/Settings.jsx` (renders the verify section), `src/settings.css`
- NOT touched: `db/03_tasks.sql`, the categories SQL, any task/category code.

SUPABASE STEP (do this once, before verifying):
1. Open the SQL editor:
   https://supabase.com/dashboard/project/cntlptuacsujbdtwvbis/sql/new
2. Open `db/04_events.sql`, copy the WHOLE file, paste it in, click **Run**.
   You should see "Success. No rows returned." (It needs the earlier db/ files,
   which are already run.)

HOW TO VERIFY (on your Mac):
1. `npm run dev`, open http://localhost:5173, log in, go to **Settings**.
2. Scroll to **Events (verify)** (below Categories).
3. Type an event title, pick a **Start** and an **End** (end after start),
   optionally pick a category, click **Add event** → it appears in the list with
   its time span and its category dot+tag.
4. **Category-survives test:** give an event a category, then go up to the
   Categories manager and **delete that category**. Back in Events, the event is
   **still there**, now showing **Uncategorised** (NOT gone).
5. **Backwards-event test:** add an event with the **End before the Start** →
   it's **refused** with a plain message ("That event ends before it starts").
6. **Delete** an event with its Delete button → it disappears.
7. **Log out and back in** (Settings → Log out), reopen Settings → your events
   are still there. Confirms they persisted and are only yours.

KNOWN GAPS / RISKS:
- The verify UI is deliberately plain and parked in Settings — no timeline yet.
- Uncategorised events show a hollow "Uncategorised" dot/tag (events don't use the
  Inbox bucket — that's a tasks concept).
- Times are entered/shown in your local wall-clock; stored as proper UTC
  timestamps.

NEXT: Phase 4, Piece 4b — the day-column timeline (renders events + scheduled
tasks together; fills the Today "The Day" column for real).

FOR THE CHECKER (please confirm against `db/04_events.sql`):
- The `events` table is **owner-only**: RLS enabled, all four policies
  (select/insert/update/delete) keyed to `auth.uid() = user_id`; `user_id`
  defaults to `auth.uid()` so an owner can't be forged.
- `category_id` **references `public.categories(id)` with `ON DELETE SET NULL`**
  (NOT cascade) — matches the tasks table exactly; deleting a category empties its
  events, never deletes them.
- The **end-before-start guard** exists: CHECK `end_at >= start_at`.
- `external_id` is **present but unused** (nullable, shown in no UI).
- This **ADDS** the events table and does **NOT** change the tasks or categories
  tables or their meaning (no edits to their SQL or code).

### 2026-06-22 — The real Today home — Today / This Week task blocks (Front Page)
WHAT CHANGED (UI only — NO database or schema change):
- **Built the real Today screen** to the approved Front Page two-column shape,
  replacing the temporary task view that sat on the Today route.
- **Left "The Day" column** is a calm placeholder for now — events don't exist
  until Phase 4, so it shows a quiet invitation ("Your day's timeline arrives
  with events") and keeps the two-column shape. NO hour grid / event blocks yet.
- **Right side is real:** a **Today** block and a **This Week** block, each a
  Fraunces headline over a hairline-ruled list. **Today** lists tasks with
  time_bucket = Today; **This Week** lists time_bucket = This Week. (Someday tasks
  aren't shown here — by design.) Rows reuse everything from before: the dot+tag
  (`CategoryTag`), the calm priority treatment, and completed tasks shown
  struck-through with the filled terracotta tick.
- **All the task behaviours carried over:** each block has a quiet "+ Add a task"
  (a task added in the Today block lands in Today; in This Week, lands in This
  Week); tap a task to open the Piece-2a edit panel (title/notes/category/
  priority); tick to complete / reopen.
- **Retired the redundant standalone task view** (`Tasks.jsx` deleted) now that
  Today covers it; its row styles live on (TaskRow now owns the `tasks.css`
  import).
- Desktop **zero-scroll:** the page itself doesn't scroll; only the right column
  scrolls, and only if the two blocks together run long.

NOTE: the mock file `mockups/lifeos-today-frontpage.html` was again NOT in the
repo, so this was built from your written description + 06-design.md. Compare to
your mock and I'll adjust spacing/type.

FILES TOUCHED:
- New: `src/Today.jsx`, `src/TaskBlock.jsx`, `src/today.css`
- Edited: `src/LoggedIn.jsx` (Today route now renders <Today/>),
  `src/TaskRow.jsx` (now imports tasks.css)
- Deleted: `src/Tasks.jsx`
- NOT touched: `db/` (no schema/RLS change), `Categories.jsx`, `Settings.jsx`

HOW TO VERIFY (on your Mac — no SQL):
1. `npm run dev`, open http://localhost:5173, log in. You land on **Today**.
2. You see the masthead, then two columns: **The Day** (a calm placeholder line)
   on the left, and **Today** + **This Week** task blocks on the right with your
   tasks, each showing its dot+tag.
3. In the **Today** block click **+ Add a task**, type a title, Add → it appears
   in Today. Do the same in **This Week** → it appears under This Week. (Confirms
   each lands in the right bucket.)
4. **Tap a task** → the edit panel opens (title, notes, category, priority); set
   a priority and watch the calm kicker appear.
5. **Tick** a task → it strikes through with a filled tick. **Untick** → it
   reopens.
6. **Reload** (Cmd-R) → everything is still there and in the right block.
7. **Settings → Log out**, then log back in → you land on Today, tasks intact and
   only yours.

KNOWN GAPS / RISKS:
- **The left "The Day" column is a Phase-4 placeholder** — no real timeline /
  events yet (decision recorded).
- Built from description, not the actual mock (missing from repo) — spacing/type
  may need a tweak once you compare.
- Someday-bucket tasks aren't shown on this page (intended); there's no UI yet to
  move a task between buckets except by adding it in the right block (bucket-move
  is Piece 2b's other half).

NEXT: Phase 4 — events and the day-column timeline (this fills the left "The Day"
column for real).

FOR THE CHECKER:
- **No schema or RLS change.** `db/` is untouched; Today only reads/writes columns
  that already existed (adds set `time_bucket`; edits/ticks as before). The
  owner-only policies on `tasks` are unchanged.
- **The two blocks split strictly by `time_bucket`** (Today vs This Week); an add
  in a block writes that block's bucket.
- A task still means "Inbox" only by `category_id = null` (adds leave it null;
  the edit panel's Inbox chip writes null) — the Piece-1 rule holds.

### 2026-06-22 — Navigation skeleton — broadsheet masthead + Today/Calendar/Settings nav
WHAT CHANGED (UI/routing only — NO database or schema change):
- **New top app frame** matching the approved "Front Page" mock: the **LifeOS**
  nameplate (Fraunces), an edition line + today's date + the live clock, a
  hairline rule, then a **nav strip — Today / Calendar / Settings** — with the
  active item marked by a **terracotta underline**. Uses existing theme.css
  variables only (no new colours).
- **Three routes** (a simple in-app view switch — no router library, matching the
  single-user app as it is):
  - **Today** → renders the EXISTING task view for now (the real Today layout is
    the next piece — not built yet).
  - **Calendar** → the existing empty week-view shell (desktop) / day view (phone).
  - **Settings** → a NEW page holding the **Categories manager moved here
    unchanged**, plus the **signed-in email** and the **Log out** action.
- **Retired the temporary entry points:** the old masthead Calendar/Categories
  switch and the separate Tasks link are gone — their destinations now live in the
  nav. **Categories is no longer a top-level destination** (it's under Settings).
- **Optional flourishes built in but easy to drop** (your call as art director):
  the "Vol. I · No. 142" edition line, the italic colophon at the foot, and the
  "categories, account" subtitle under Settings. Say the word and I'll remove any.

NOTE: the mock file `mockups/lifeos-today-frontpage.html` was NOT in the repo, so
this was built from your written description + 06-design.md. Match it against your
mock when you have it and I'll adjust.

FILES TOUCHED:
- New: `src/Settings.jsx`, `src/settings.css`
- Edited: `src/Masthead.jsx` (two-tier header + new nav, Log out removed),
  `src/masthead.css`, `src/LoggedIn.jsx` (3 routes + colophon footer),
  `src/calendar.css` (colophon style)
- NOT touched: `src/Categories.jsx` / `src/categories.css` (moved intact), all of
  `db/` (no schema/RLS change).

HOW TO VERIFY (on your Mac — no SQL):
1. `npm run dev`, open http://localhost:5173, log in.
2. You should see the **LifeOS** masthead with the date + live clock, a hairline
   rule, and a **Today / Calendar / Settings** nav. **Today** is active (terracotta
   underline) and shows **your tasks**.
3. Click **Calendar** → the empty week-view shell. The underline moves to Calendar.
4. Click **Settings** → you see **Signed in as <your email>**, a **Log out**
   button, and the **Categories** manager below it.
5. In Settings, **add or find a category** (e.g. type a name, Add) — it works
   exactly as before.
6. Click **Log out** from Settings → you're signed out. Log back in → you land on
   **Today** with your tasks.
7. Confirm there's no longer a separate "Tasks" or "Categories" link up top.

KNOWN GAPS / RISKS:
- **Today is a placeholder** — it shows the existing task list, NOT the real Today
  front-page layout (that's NEXT).
- Built from description, not the actual mock file (missing from repo) — spacing/
  type may need a tweak once you compare to your mock.
- The decorative flourishes are on by default; tell me if you want them off.

NEXT: the Today home layout (the real Front Page — today's tasks + appointments,
the day-column timeline comes with the calendar work).

FOR THE CHECKER:
- **No schema or RLS change.** `db/` is untouched; this is UI/routing only. No
  query changed — Categories/Tasks read-write exactly as before.
- **Categories moved into Settings intact** — `Categories.jsx`/`categories.css`
  were not edited; Settings just renders `<Categories />` under an account band.
- **The three routes each load the right screen:** Today → the task view,
  Calendar → the week/day shell, Settings → Categories + email + Log out.

### 2026-06-22 — Phase 3 (Piece 2a) — Editing a task (title, notes, category, priority)
WHAT CHANGED:
- **Tap a task → an inline edit panel opens** (the same calm expand-on-tap
  pattern as the Categories manager). In it you can edit the **title**, add/edit
  **notes**, **reassign the category** (selectable dot+tag chips reusing the
  `CategoryTag` look, including an "Inbox" option), and set **priority**
  (None / Low / Med / High).
- **Saving is inline, no Save button:** title + notes persist when you click away
  (on blur); category + priority persist the moment you tap. All writes go to
  columns that already existed from Piece 1.
- **Priority now shows in the list, calmly** (see the choice below).
- The tick-to-complete and add-by-title behaviour from Piece 1 are unchanged.
- Split the row into its own `TaskRow.jsx` to keep files small.

PRIORITY-DISPLAY CHOICE (and why — tweak this freely, you're the art director):
- I did NOT use colour for priority. The design doc reserves the terracotta
  accent for today / the now-line / overdue, and keeps warm reds darker than it
  so nothing falsely reads as "urgent". A red "high" flag would fight that.
- Instead, priority reads through **ink and weight**, the broadsheet way:
  - **High:** a small uppercase **"High"** kicker in full-strength ink, and the
    task title nudged to medium weight — the "lead item" feel. It quietly draws
    the eye without shouting.
  - **Med:** a small uppercase **"Med"** kicker in muted grey. Present, but it
    doesn't pull focus.
  - **Low / None:** nothing shown at all — near-invisible, so only what matters
    draws the eye.
  - Priority marks hide on a done task (it's no longer pending).
- If you'd prefer a different mark (a small dot/square, italics, a thin rule, or
  showing Low too), it's a quick change — tell me and I'll tune it, then I'll
  record the locked choice in the decisions doc.

FILES TOUCHED:
- New: `src/TaskRow.jsx`
- Edited: `src/Tasks.jsx` (refactored to use TaskRow + edit handlers),
  `src/tasks.css` (edit panel, chips, priority styles)
- NO database files touched (`db/` unchanged).

HOW TO VERIFY (on your Mac — no SQL this time):
1. `npm run dev`, open http://localhost:5173, log in, click **Tasks**.
2. **Tap a task's title** (not the circle). A panel opens below it.
3. Change the **title**, then click away → the line above updates and it sticks.
4. Type some **notes**, click away (notes are kept; they'll be shown in a later
   piece — for now just confirm they persist, step 7).
5. Under **Category**, tap a different category chip → the dot+tag on the task
   updates immediately. Tap **Inbox** → it goes back to the Inbox tag.
6. Under **Priority**, tap **High** → the title gets a touch bolder and a small
   "High" kicker appears. Tap **Med** → it changes to a muted "Med". Tap
   **None** → the mark disappears.
7. **Reload the page** (Cmd-R). Open the same task again — your title, notes,
   category and priority are all still there.
8. **Log out and back in**, open **Tasks** — everything persisted and it's only
   yours (owner-only).

KNOWN GAPS / RISKS:
- The priority display is intentionally up for your eye (see the choice above) —
  not yet locked in the decisions doc.
- Still bare on purpose: no time-bucket views, no due-date picker, no subtasks UI
  (those columns exist; their UI is Pieces 2b–2d). No per-task delete in the UI
  yet.
- Notes are saved but not shown in the calm list line yet (kept minimal); they
  appear in the edit panel.

NEXT: Phase 3, Piece 2b — time-bucket views (Today / This Week / Someday) and
moving tasks between them.

FOR THE CHECKER:
- **No schema or RLS change.** `db/` is untouched; the edit panel only writes to
  columns that already existed (`title`, `notes`, `category_id`, `priority`).
  The four owner-only policies on `tasks` are exactly as shipped in Piece 1.
- **Nothing touches events or the calendar** — this piece is the tasks list only.
- Category reassignment keeps the Piece-1 rule: a task means "Inbox" by having
  `category_id = null` (the "Inbox" chip writes null), never by pointing at the
  Inbox row's id.

### 2026-06-22 — Phase 3 (Piece 1) — Tasks spine table + bare-bones verify UI
WHAT CHANGED:
- **New `tasks` table in Supabase**, built to the FULL architecture shape so
  later pieces bolt on with no rebuild: title, notes, category, parent task
  (subtasks), priority, time bucket, due date, scheduled start/end, status,
  completed_at, source, created_at. SQL: `db/03_tasks.sql` (run it once — steps
  below). RLS ON, owner-only. ADDS to the spine; does NOT change categories.
- **Category link is "empty on delete" (SET NULL), never cascade** — deleting a
  category drops its tasks into Inbox instead of deleting them. Same for the
  parent-task link (subtasks get promoted, not deleted). Enforced in the DB.
- **Fixed-value fields locked in the DB** (CHECK constraints) for status,
  priority and time_bucket — a bad value can never be stored.
- **`completed_at` kept honest by a DB trigger** — stamped when a task is marked
  done, cleared when reopened, so the "finished at" time can never lie.
- **A calm Tasks view** (reachable from a new "Tasks" link in the masthead):
  lists your tasks, add one by typing a title (lands in Today), optional
  category picker (Inbox by default), and a tick to mark done / reopen. Done
  tasks show a struck title + a quiet "Done · <time>". Reuses the paper/ink/
  Fraunces foundation and the dot+tag (`CategoryTag`).
- This is the VERIFY UI, not the real task manager. No priority controls,
  time-bucket views, due-date picker, subtasks UI, calendar, or activity_log —
  those columns exist but the UI doesn't touch them yet (Piece 2+).

FILES TOUCHED:
- New: `db/03_tasks.sql`, `src/Tasks.jsx`, `src/tasks.css`
- Edited: `src/LoggedIn.jsx` (Tasks view), `src/Masthead.jsx` (Tasks nav link)

SUPABASE STEP (do this once, before verifying):
1. Open the SQL editor:
   https://supabase.com/dashboard/project/_/sql/new
   (or Dashboard → your project → SQL Editor → New query).
2. Open `db/03_tasks.sql`, copy the WHOLE file, paste it in, click **Run**.
   You should see "Success. No rows returned." (It needs `db/01_categories.sql`
   already run, which it is.)

HOW TO VERIFY (on your Mac):
1. `npm run dev`, open http://localhost:5173, log in.
2. Click **Tasks** in the masthead. You'll see an empty list + an add row.
3. Type a title (e.g. "Buy milk"), leave the picker on **Inbox**, click **Add**.
   It appears with an **Inbox** tag (Slate dot).
4. Add another and pick one of your categories — it shows that category's
   coloured dot + tag.
5. Click the circle to the left of a task → it fills terracotta, the title gets
   struck through, and a **"Done · <date, time>"** stamp appears.
6. Click the filled circle again to reopen → the strike + the Done stamp both
   vanish (the finish time is cleared, so it can never be stale).
7. Go to **Categories**, delete the category you assigned in step 4. Return to
   **Tasks** — that task is **still there**, now back in **Inbox** (NOT gone).
8. Click **Log out**, then log back in, open **Tasks** — your tasks are still
   there. Confirms they persisted and are only yours (owner-only).

KNOWN GAPS / RISKS:
- Bare-bones on purpose: no priority/time-bucket/due-date/subtasks UI yet (the
  schema has the columns; the UI is Piece 2+). No edit/delete of a task in the
  UI yet (that's the real task manager, Piece 2).
- The category picker is a plain dropdown; nesting shows as simple indentation.

NEXT: Phase 3, Piece 2 — the REAL task UI (edit, priority, time buckets, due
dates, and so on).

FOR THE CHECKER (please confirm against `db/03_tasks.sql`):
- The `tasks` table is **owner-only**: RLS is enabled and all four policies
  (select/insert/update/delete) are keyed to `auth.uid() = user_id`; `user_id`
  defaults to `auth.uid()` so an owner can't be forged.
- `category_id` **references `public.categories(id)` with `ON DELETE SET NULL`**
  (NOT cascade) — deleting a category empties its tasks into Inbox, never
  deletes them. (`parent_task_id` self-FK is also SET NULL.)
- The fixed-value fields have **DB CHECK constraints**: `status` (open/done),
  `priority` (high/med/low), `time_bucket` (Today/This Week/Someday).
- `completed_at` is managed by the `tasks_sync_completed_at` trigger (set on
  done, cleared on reopen).
- This change **ADDS** the tasks table and does **NOT** modify the categories
  table or its meaning (no edits to `db/01_categories.sql` /
  `db/02_categories_guards.sql`).

### 2026-06-22 — Phase 2 (Piece 3b) — Category colour palette wired in (PHASE 2 DONE)
WHAT CHANGED:
- **Locked the 16-colour palette** (12 distinct + 4 lighter shades) after you
  signed off on the eye-validation preview. The full set with names + hexes is in
  the decisions doc and `06-design.md`; the editable source is `src/palette.js`.
- **Removed the temporary "Palette" preview tab** (and its files) now that it's
  done its job.
- **Colour on the Categories list:** tap a category → an expanded panel now has a
  **Colour** row of the curated swatches (the set only — no free hex picker).
  Pick one and the row shows the calm **coloured dot + short uppercase tag**.
  There's a "no colour" hollow swatch to clear it again.
- **Inbox** shows **Slate** by default (set once on load). **New categories start
  uncoloured** — a quiet hollow dot — until you pick.
- The dot/tag is a **reusable component** (`CategoryTag`) so the calendar can use
  the exact look later. It is **not** wired into the calendar/tasks/events — the
  Categories view is the only place colour shows for now.
- **No database change** — colour reuses the existing `color` column (it stores
  the colour's name-id like `teal`, not a hex). RLS untouched.

FILES TOUCHED:
- New: `src/palette.js`, `src/CategoryTag.jsx`, `src/categoryTag.css`
- Edited: `src/Categories.jsx`, `src/CategoryRow.jsx`, `src/categories.css`,
  `src/Masthead.jsx`, `src/LoggedIn.jsx`
- Removed: `src/PalettePreview.jsx`, `src/palettePreview.css`

HOW TO VERIFY (on your Mac — no SQL needed this time):
1. `npm run dev`, open http://localhost:5173, log in, click **Categories**.
2. **Inbox** should show a **Slate** dot beside its uppercase tag.
3. Tap one of your categories (e.g. "Uni"). In the expanded panel, under
   **Colour**, click a swatch (say Teal). The row's dot turns that colour and the
   name shows as a small uppercase tag.
4. Click the hollow "no colour" swatch — the dot goes back to an empty outline.
5. Give a couple of categories different colours so you can see them side by side.
6. **Proof it persists & is only yours:** **Log out**, log back in, open
   Categories — your colours are exactly as you left them.

KNOWN GAPS / RISKS:
- Colour shows on the Categories view only — the calendar/tasks don't use it yet
  (Phases 3–4), though `CategoryTag` is ready for them.
- Dark-mode colours aren't built — the palette is structured for them, but there's
  no dark mode to validate against yet.
- No drag-to-reorder; ordering is still by creation.
- Local preview only this session (not redeployed).

NEXT: **Phase 3 — Tasks.** Add/edit/complete/prioritise tasks, time-buckets,
subtasks, due dates — tasks reference a category. This is the next real spine
table; same rules (RLS owner-only, ADD to the spine, don't change core meaning).

FOR THE CHECKER: Confirm there was **no schema or policy change** — colour is just
the existing `categories.color` text column (now holding a palette id like
`'teal'`), and **RLS is untouched** (still the four owner-only `auth.uid() =
user_id` policies from Pieces 2/3a). Confirm nothing touches tasks/events/the
calendar, and that the colour set is the curated list (no free hex input).

### 2026-06-22 — Phase 2 (Piece 3a) — Real category manager: rename, nest, delete
WHAT CHANGED:
- The Categories page is now a real manager. Buckets show as an **indented tree**.
  **Tap a row** to expand calm inline actions: **rename** it, **move it inside**
  another bucket (nesting), **add a sub-category**, or **delete** it.
- **Delete reparents children up one level** — delete a middle bucket and its
  sub-buckets move up to its parent; delete a top-level bucket and its children
  become top-level. Nothing is lost (your chosen rule).
- **Duplicate names are blocked under the same parent** (case-insensitive);
  different parents may reuse a name. You'll see a plain message if it clashes.
- **Inbox is protected in the database**: it can't be deleted, renamed, or
  nested — not just hidden in the UI. It shows as a "default bucket", no actions.
- **Cycles are blocked**: you can't move a category inside itself or one of its
  own sub-categories (the move list hides those; the database refuses it too).
- The decision back-and-forth (delete→reparent-up; duplicates→block per parent)
  is recorded in the decisions doc.

FILES TOUCHED:
- New: `db/02_categories_guards.sql` (the DB rules/triggers), `src/CategoryRow.jsx`,
  `src/categoryTree.js`
- Edited: `src/Categories.jsx` (now the manager), `src/categories.css` (tree +
  panel styles)

SUPABASE / SQL STEPS (do this once, on your Mac, BEFORE testing):
1. Open the SQL editor:
   https://supabase.com/dashboard/project/cntlptuacsujbdtwvbis/sql/new
2. Open `db/02_categories_guards.sql`, copy ALL of it, paste, click **Run**.
   Expect "Success. No rows returned."
   (If it errors on the unique index, you already have two categories with the
   same name under the same parent — delete one in the Table editor and re-run.)

HOW TO VERIFY (in the app, on your Mac):
1. `npm run dev`, open http://localhost:5173, log in, click **Categories**.
2. **Add some nesting:** add a top-level "Uni" (box at the bottom). Tap **Uni**,
   use "Add a sub-category" to add "Q2". Tap **Q2**, add "Class A". You should
   see Uni → Q2 → Class A stepping in with indentation.
3. **Rename:** tap "Class A", change the name box, click **Rename** — the row
   updates.
4. **Move (nest an existing one):** add a top-level "Reading", tap it, and in the
   "Inside" dropdown pick "Uni" — it slides under Uni.
5. **Inbox can't be deleted:** Inbox shows "default bucket" with no Delete button.
   It's also blocked in the database (a UI bypass would still be refused).
6. **No cycles:** tap "Uni", open the "Inside" dropdown — notice Q2 and Class A
   (its own descendants) are NOT offered, so you can't nest Uni inside itself.
7. **Delete a normal category and watch the children move up:** tap **Q2** and
   click **Delete**. Q2 disappears and **Class A moves up under Uni** (it wasn't
   deleted with it).
8. **Duplicate guard:** try adding a second top-level "Uni" — you'll get
   "A category with that name already exists here." (But "Uni" under a different
   parent is allowed.)
9. **Proof it's saved & only yours:** **Log out**, log back in, open Categories —
   your tree is exactly as you left it (RLS returns only your rows).

KNOWN GAPS / RISKS:
- You must run `db/02_categories_guards.sql` once first, or the new rules aren't
  active (deletes would cascade-delete children instead of reparenting them).
- No colour anything yet — that's Piece 3b. No drag-to-reorder; ordering is by
  creation for now. Renaming the Inbox is intentionally not allowed.
- Rare edge: deleting a category whose child would collide with a same-named
  bucket at the destination is refused (duplicate rule) — move/rename first.
- Local preview only this session (not deployed). The DB rules live in Supabase
  once you run the SQL, so deploy needs nothing extra.

NEXT: **Phase 2, Piece 3b** — the 16-colour curated palette + the dot/uppercase-
tag look, done with the owner as art director. Do NOT start until 3a is verified.

FOR THE CHECKER: Confirm **RLS is still owner-only** after the new update/delete
paths (the triggers add rules, they don't change the four `auth.uid() = user_id`
policies, and run as the invoker so they can't touch other owners' rows). Confirm
**Inbox is undeletable AND unrenamable/un-nestable at the DB level** (the
`before delete` / `before write` triggers in `db/02_categories_guards.sql`), not
just hidden in the UI. Confirm **cycles cannot be created** (trigger walks
ancestors and rejects; UI also hides descendants) and that a **parent must belong
to the same owner**. Confirm this is still spine-only: no task/event tables
touched, no colour/palette work, `color` column still unused.

### 2026-06-22 — Phase 2 (Piece 2 of 3) — Categories table + bare-bones view
WHAT CHANGED:
- Created the **categories** table — the first real spine table. It holds your
  buckets, can nest later (a `parent_id` self-link), has an empty `color` column
  for the Piece-3 palette, a `sort_order`, and a `created_at`. Row-level security
  is ON and owner-only: the database only ever returns or accepts rows belonging
  to the logged-in owner (read/add/change/delete all locked to your account).
- **Inbox** is seeded as the default first bucket — a normal category row, not
  special machinery. The seed is idempotent (won't make a second Inbox).
- Built a plain **Categories view**: lists your buckets (Inbox shows up) and lets
  you add one by typing a name. No colours, no nesting, no edit/delete yet — on
  purpose. It reuses the Piece-1 paper/ink/fonts so it fits in.
- Added a small **Calendar / Categories** switch in the masthead to open it
  (temporary placement — we'll give it a proper home later).

FILES TOUCHED:
- New: `db/01_categories.sql` (the table + RLS + Inbox seed),
  `src/Categories.jsx`, `src/categories.css`
- Edited: `src/Masthead.jsx`, `src/masthead.css` (the view switch),
  `src/LoggedIn.jsx` (calendar ↔ categories)

SUPABASE / SQL STEPS (do this once, on your Mac):
1. Open the Supabase SQL editor:
   https://supabase.com/dashboard/project/cntlptuacsujbdtwvbis/sql/new
2. Open `db/01_categories.sql` from the project, copy ALL of it, paste into the
   editor, and click **Run**. You should see "Success. No rows returned."
3. (Optional sanity check) In the dashboard → Table editor → `categories`, you
   should see one row named **Inbox**.

HOW TO VERIFY (in the app, on your Mac):
1. In Terminal, from the lifeos folder: `npm run dev`, then open
   http://localhost:5173 and log in.
2. In the top strip, click **Categories**. You should see a calm page titled
   "Categories" with **Inbox** listed, and a box to add one.
3. Type a name (e.g. "Uni") and click **Add** — it should appear in the list
   immediately, under Inbox.
4. Click **Calendar** then **Categories** again — your new category is still
   there (it saved to the database).
5. **Prove it's only yours / really saved:** click **Log out**, then log back in,
   open **Categories** — Inbox and "Uni" should still be there. (RLS means the
   database only ever hands back your own rows.)

KNOWN GAPS / RISKS:
- You must run the SQL once before the view works; until then, opening
  Categories will show a red error message (the table doesn't exist yet).
- Bare-bones on purpose: no colour, no sub-categories, no editing/renaming or
  deleting yet. Adding the same name twice is currently allowed.
- Not deployed to Vercel this session (local preview only). When we deploy, the
  table already lives in Supabase, so nothing extra is needed there.

NEXT: **Phase 2, Piece 3** — the 16-colour curated category palette (needs your
eye-validation), then later the nesting UI and edit/delete. Do NOT start Piece 3
until you've verified this one.

FOR THE CHECKER: Confirm the `categories` table is **owner-only via RLS** — all
four policies key on `auth.uid() = user_id`, and `user_id` defaults to
`auth.uid()` so a client can't insert rows for anyone else. Confirm an **Inbox**
default exists (seeded as a normal row, idempotent — not special machinery).
Confirm this **adds to the spine without changing core meaning**: it only adds
the `categories` table per the architecture doc (nullable `parent_id`/`color`
present but unused in UI), and touches no task/event tables. Confirm no colour
palette, nesting UI, or edit/delete was built (those are later pieces).

### 2026-06-22 — Phase 2 (Piece 1 of 3) — Shared visual foundation (NOT locked)
WHAT CHANGED:
- Loaded two fonts: **Fraunces** (the serif, for the masthead + headlines) and
  **Inter** (the sans, for body, UI and all numbers), regular + medium only,
  straight from Google Fonts in `index.html`. Numbers use Inter's tabular
  figures so they line up and the clock doesn't jitter.
- Added one small **theme file** (`src/theme.css`) holding every colour and
  font as variables, so the whole look is tweakable from one place. Starting
  colours (warm, all yours to change): paper `#F4EFE4`, ink `#1C1916`, muted
  grey `#5C564C`, hairline `#D8D0BE`, terracotta accent `#C8643D`. A dark-mode
  block is pre-written and commented out for later.
- Built one **masthead** strip across the top: the "LifeOS" nameplate in
  Fraunces, today's date, a live ticking clock, and a thin hairline beneath.
  Moved the **Log out** button into it, so there's now a single top bar (the
  old duplicate one is gone). Left a gap where weather will slot in later — no
  weather is shown (we have no source yet).
- Made the **login screen** and the **calendar** inherit the new fonts and
  paper/ink automatically. Removed the calendar's own duplicate "LifeOS" text
  (the masthead provides it now). The calendar's grid/layout is unchanged — it
  just picked up the warm colours and the terracotta now-line/today marker.

FILES TOUCHED: index.html, src/main.jsx, src/theme.css (new),
src/masthead.css (new), src/Masthead.jsx (new), src/dateUtils.js,
src/LoggedIn.jsx, src/App.jsx, src/Login.jsx, src/calendar.css

HOW TO VERIFY (on your Mac):
1. In Terminal, from the lifeos folder, run:  `npm run dev`
2. Open  http://localhost:5173 .
3. **Login screen** (if logged out): "LifeOS" should now be in the Fraunces
   serif, on a warm off-white (not white) background, with a near-black
   button. (If you're already logged in, click Log out to see it.)
4. **Calendar** (after logging in): up top, a single thin strip — "LifeOS" in
   serif on the left, today's date in small uppercase letters, and a clock
   ticking every second beside it (the digits should NOT jiggle as seconds
   change), with Log out on the right and a hairline rule under the whole
   strip. The grid below should look the same shape as before but warmer: off-
   white paper, terracotta "now" line and today circle, hour labels lined up.
5. Make the window narrow (under ~768px) — the masthead stays one strip and the
   single-day phone view shows, both in the new colours.

KNOWN GAPS / RISKS:
- **Not locked.** These are starting fonts/colours — the owner wants to eyeball
  and tweak before we commit to them. Do not treat the palette as final.
- Fonts load from Google's servers; on a cold load there can be a brief moment
  before Fraunces/Inter swap in (text shows in a fallback first, no blank flash).
- Visual only — still no categories, Inbox, colour palette, tasks or events.
- Not deployed to Vercel yet (local preview only this session).

NEXT: **Phase 2, Piece 2** — categories (the buckets) with their own table and
the Inbox as default. (First piece that adds a real table: RLS on, owner-only,
adds to the spine without changing the task/event/category core meaning.) Do
NOT start it until the owner has signed off on Piece 1's look.

FOR THE CHECKER: This is visual-only — confirm no database tables, categories,
Inbox or category-colour palette were added (those are Pieces 2 & 3). Confirm
all colours/fonts come from the one theme file (`src/theme.css`) via CSS
variables, that there's a single top bar (no stacked headers), and that the
calendar grid's layout is unchanged from the prior shell (only colours/type
differ). Note the type/accent now depart from the design doc's old working
faces — that was the owner's art-director call, recorded in the decisions doc.

### 2026-06-22 — Phase 1 — DEPLOYED & VERIFIED (phase complete)
WHAT CHANGED:
- Pushed the calendar-shell commit to GitHub (it had been committed locally but
  not pushed, so Vercel hadn't built it).
- Diagnosed the blank live site: Vercel was missing the two Supabase env vars
  because `.env` is gitignored and never reaches GitHub. Added `VITE_SUPABASE_URL`
  and `VITE_SUPABASE_ANON_KEY` in the Vercel dashboard, then redeployed.
- Owner verified end-to-end: logged in successfully on BOTH Mac and iPhone against
  the LIVE Vercel site, and the empty week-view calendar renders on both. This
  meets Phase 1's "done when" (open the app on my phone and log in). Phase 1 is
  done; Phase 2 (Categories & Inbox) is now the current phase.
- No code changed this session — this was deploy + verify only. Brain docs updated.

FILES TOUCHED: 02-roadmap.md, 03-decisions.md, 04-handoff-log.md
(no app source changed; the env vars live in the Vercel dashboard, not the repo)

HOW TO VERIFY:
1. On your iPhone, open the live Vercel URL, log in via the email magic link —
   you should land on the empty single-day calendar view.
2. On your Mac, open the same live Vercel URL (not localhost), log in — you should
   see the full week grid. Both already confirmed working by the owner.
3. Run `git log --oneline -1` in the lifeos folder and confirm the latest commit
   is this session's brain-doc update, and `git status` shows nothing to push.

KNOWN GAPS / RISKS:
- The two Vercel env vars are a manual, off-GitHub step. If the Supabase keys ever
  change, or a new deploy target is added, they must be re-entered in the Vercel
  dashboard and the app redeployed (Vercel bakes them in at build time).
- Still a visual-only shell — no categories, tasks, or events exist yet.
- New-user signups remain open by default (noted in step-1 entry); fine for now
  under single-user + RLS, lock down later.

NEXT: Phase 2 — Categories & Inbox. Create/edit buckets with colors and
sub-levels, with Inbox as the default bucket. (Done when my real-life categories
exist.) This is the first phase that ADDS a real table — keep RLS on and do not
touch the core task/event meaning.

FOR THE CHECKER: Nothing to review in code this session (deploy + verify only).
Going into Phase 2, please sanity-check the plan before building: confirm the new
categories table is owner-only via RLS, has an Inbox default, and ADDS to the
spine without changing the task/event/category core meaning per CLAUDE.md.

### 2026-06-22 — Phase 1 (step 2) — Empty week-view calendar shell
WHAT CHANGED:
- After login, the old "you're logged in" placeholder is gone — you now land on
  the calendar. The Log out button moved into a top bar (always reachable).
- Desktop: an empty Apple-Calendar-style WEEK view — 7 columns (Mon–Sun) with
  hour rows down the left, the current week's date range in the top bar, today's
  column subtly tinted with a red date circle, and a live red "now" line. It
  scrolls and opens around 7am. No events — it's purely the visual shell.
- Phone (narrow screens): instead of a squished 7-column grid, a clean single
  DAY view for today — big date header, "Nothing scheduled yet", and the same
  tidy hour list with the red now-line.
- No data, no database, no task/event/category tables touched.

FILES TOUCHED: src/App.jsx, src/LoggedIn.jsx (rewritten as the app frame),
src/WeekCalendar.jsx (new), src/DayAgenda.jsx (new), src/NowLine.jsx (new),
src/dateUtils.js (new), src/calendar.css (new)

HOW TO VERIFY:
Desktop (on your Mac):
1. In Terminal, from the lifeos folder, run:  npm run dev
2. Open  http://localhost:5173  and log in (email magic link, as before).
3. You should see a full-screen week grid: a top bar reading "LifeOS",
   the week's date range (e.g. "Jun 22–28, 2026"), and a "Log out" button.
   Below: 7 day columns with hour labels down the side. Today's column is
   faintly tinted, today's date sits in a red circle, and a thin red line
   marks the current time. Scroll up/down through the hours. The grid is empty.
4. Click "Log out" — you should return to the login screen.
Phone (do this after we deploy, OR on your Mac to preview the layout):
- Make the browser window very narrow (under ~768px wide) — the week grid
  should switch to a single clean day view for today with a big date header.

KNOWN GAPS / RISKS:
- This is a visual shell only — nothing can be added to it yet (that's Phase 3+).
- Not deployed to Vercel yet, so the phone test is best done after deploy.
- Tailwind (named in the architecture doc) is still not used; we styled with a
  small plain CSS file instead — see the new entry in the decisions doc.

NEXT: Deploy this to Vercel (the same two env vars are already set there from
step 1; just push and let it build), then open it on your phone and log in —
that completes Phase 1's "done when".

FOR THE CHECKER: Confirm no task/event/category tables or data were added (this
should be visual-only), that the desktop week view and phone day view both render
from the same data-free components, and that no Supabase keys are hard-coded.

### 2026-06-21 — Phase 1 (step 1) — Supabase connection + email magic-link login
WHAT CHANGED:
- Installed the official Supabase library and connected the app to Supabase
  using environment variables (no keys in the code; real keys live in a local
  .env that is gitignored and NOT committed).
- Built an email magic-link login: type your email → get a login link → tap it
  → you're back in the app logged in. Logged-in view shows "You're logged in as
  <email>" and a Log out button. (No calendar yet — that's the next step.)

FILES TOUCHED: package.json, package-lock.json, .gitignore, .env.example,
index.html, src/supabaseClient.js, src/Login.jsx, src/LoggedIn.jsx, src/App.jsx
(plus a local .env holding the real keys — gitignored, never committed)

HOW TO VERIFY (do this on your Mac before we deploy):
1. In the Supabase dashboard → Authentication → URL Configuration:
   set Site URL to  http://localhost:5173  and add Redirect URL
   http://localhost:5173/**  — then Save.
   Direct link: https://supabase.com/dashboard/project/cntlptuacsujbdtwvbis/auth/url-configuration
2. In Terminal, from the lifeos folder, run:  npm run dev
3. Open  http://localhost:5173 , type your email, click "Send me a login link".
4. Check your inbox, tap the link — you should land back on the app showing
   "You're logged in as <your email>" and a Log out button.
5. Click Log out — you should return to the login screen.

KNOWN GAPS / RISKS:
- I confirmed it BUILDS cleanly, but I can't complete the email round-trip myself
  (I can't read your inbox). Your local test above is the real confirmation.
- Step 1 (the dashboard redirect URL) is required or the link won't return you to
  the app — easy to forget.
- Supabase's built-in email sender has a low hourly limit; if links stop arriving
  during repeated testing, wait a while or check spam.
- New-user signups are allowed by default. Single-user + RLS makes this fine for
  now; we can lock signups down later.

NEXT: Phase 1 (step 2) — empty week-view calendar on desktop + a stripped phone
layout. After that we deploy to Vercel (adding the same two env vars there and the
Vercel URL to Supabase redirect URLs) and you log in on your phone.

FOR THE CHECKER: Confirm NO .env file is committed (only .env.example, which holds
placeholders), and that no Supabase URL or key is hard-coded in any source file
(they must come only from import.meta.env via .env).

### 2026-06-21 — Phase 0 — Setup complete, empty app live
WHAT CHANGED:
- Created all five free accounts: GitHub (chrisolmosvv), Supabase, Vercel,
  Telegram bot, Google AI Studio (Gemini).
- Initialized the git repo, added all seven brain docs, and pushed to GitHub.
- Built a minimal React+Vite app (one page: "LifeOS" centered on screen),
  confirmed it builds cleanly, committed, pushed, and deployed live on Vercel.

FILES TOUCHED: 00-overview.md, 01-architecture.md, 02-roadmap.md, 03-decisions.md,
CLAUDE.md, 04-handoff-log.md, 05-glossary.md, index.html, vite.config.js,
package.json, package-lock.json, src/main.jsx, src/App.jsx, .gitignore

HOW TO VERIFY:
- Repo on GitHub: https://github.com/chrisolmosvv/lifeos — should show all files.
- Live app on Vercel: open the Vercel dashboard, find the lifeos project, click
  the deployment URL — you should see a white page with "LifeOS" in the center.
- Run `git log --oneline` in the lifeos folder — should show 3 commits.

KNOWN GAPS / RISKS:
- Claude Code login showed "Claude Pro" in the UI during setup — worth confirming
  it is actually running on the Max plan (Pro won't have enough capacity for long
  build sessions).
- Vercel deployment was done manually in the browser; not yet connected to
  auto-deploy on git push (Vercel usually sets this up automatically — confirm
  it's active in the Vercel dashboard).

NEXT: Phase 1 — build the real app shell: Supabase login (magic link or Google),
empty week-view calendar visible on desktop, stripped layout on phone.

FOR THE CHECKER: Confirm the live Vercel URL loads correctly and the GitHub repo
contains only the brain docs + app source (no node_modules, no .env files).
