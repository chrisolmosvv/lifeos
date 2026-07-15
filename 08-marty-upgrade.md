# LifeOS — The Marty Upgrade (backend track M0–M9)

> **⚠️ SUPERSEDED 2026-07-08 — this is no longer how Marty works.** The serverless
> bot this doc describes was replaced by **Hermes** (a self-hosted agent — see
> `00-hermes-track.md`, the source of truth for Marty's brain). The M-track backend
> is kept **parked, not deleted**, as the 30-second rollback, so this doc stays as
> the record of what it is and how it worked. Do not build new Marty behaviour here.
> *(Banner added 2026-07-15, doc-drift audit D-09.)*

> I am the plan for making Marty (the Telegram bot) **conversational**.
> Plain English. This track is **backend only** — it touches ONLY
> `supabase/functions/`. It must not disturb the Phase 7 front-end redesign,
> which lives in `src/` and is mid-flight. The two tracks run side by side and
> do not collide.

## Why a separate M-track (and not "Phase 8")
The redesign is numbered as **Phase 7** and is unfinished. To avoid confusing
two unfinished bodies of work that touch different folders, the Marty upgrade
gets its own short prefix — **M0 through M9** — so a roadmap line, a commit, or
a decision is instantly recognisable as "the bot track" vs "the redesign track."
See the decision recorded in `03-decisions.md`.

## What we're building (the point)
Today Marty can do three things: **capture** a texted task/event, **undo** the
last thing he saved, and fire the **brief** ("brief" / "brief test"). Routing is a
short ladder of exact-word checks in `telegram/index.ts`; anything that isn't a
known word is assumed to be a capture and sent to Gemini.

The upgrade makes him a real assistant you can **talk to**: ask him questions,
have him **edit / delete / move** things, finish a capture over a **short
back-and-forth**, learn which **category** things belong in, take **voice notes**,
let you **reply to the morning brief**, and get a gentle **daytime nudge**.

## The two ground rules for the whole track
1. **Backend only.** Never edit `src/`. If a change seems to need the front-end,
   STOP and flag it — it belongs to Phase 7, not here.
2. **Protect the spine.** New abilities ADD tables and write tasks/events through
   the existing shapes. They never change what a task/event/category *means*, and
   RLS stays owner-only. (Same rule as the rest of LifeOS.)

---

## The phases

Only **M0** is built and locked. **M1–M9 below are the intended shape, not yet
locked** — each gets its own small piece, its own save point, its own owner
verify, and its own decision entry when we actually build it. The order may shift.

- **M0 — Prep + one Gemini config seam.** *(built this session)*
  A clean docs rollback anchor for the whole track, then route **both** existing
  Gemini callers (`telegram/understand.ts`, `brief/write.ts`) through **one**
  shared module (`_shared/gemini.ts`) that owns the key, the model name, the
  endpoint, and the fetch+retry+rate-limit loop. Pure refactor — **no behaviour
  change**. Makes a future switch to a paid Gemini key a one-place change.

- **M1 — The router + read-only questions.** *(built — the router seam and the
  question types, originally sketched as two phases, were built together.)* Routing
  pulled out of `telegram/index.ts` into `route.ts` (the thin front door now just does
  security → owner gate → text check → hand off). A Gemini **intent step** (`intent.ts`,
  via the M0 seam, temperature 0) labels each message **question / capture / unclear** —
  and on a genuine toss-up returns **unclear** so Marty ASKS rather than risk a wrong
  save. Three **read-only** question types (`query.ts`, imports only `select` — no write
  code at all): **"what's on Thursday?"** (that day's events + tasks, time order),
  **"what did I forget?"** (overdue + due today), **"am I free Friday afternoon?"** (gap
  check). Plain-text answers; capture behaviour unchanged.

- **M2 — Undo foundation (load-bearing plumbing).** *(done — SQL run, checker-signed-off.)*
  A generalised **action log** (`marty_actions`, new table) replaces
  the old create-only `telegram_saves`: one row = one logical action, holding 1+ items
  with room for **prior state** (edit before-values, the full deleted row) so M3 needs no
  further schema change. Today only `kind='create'` is written. The **undo grammar** is
  in: **"undo"** reverses the whole last action (a multi-item capture is one action),
  **"undo <name>"** reverses one item, ambiguous → ask. Proven on the capture path only
  (un-creating bot-saved rows); to prove batch undo, capture now parses several items
  from one message. No edit/delete/move features yet — that's M3. Surgical + owner-only:
  it never touches a hand-made app row except to restore one Marty itself deleted.

- **M3 — Edit / delete / move by chat.** *(built + deployed.)* Four ops, each riding the
  M2 undo: **complete** ("done X"), **reschedule** ("move X to Tuesday"), **rename**
  ("rename X to Y"), **delete** ("delete the 3pm"). The classifier gained an `edit` kind;
  `find.ts` locates the target (active-only) and **acts only on exactly one match, asks
  when several, says so when none**. Each op logs prior state to `marty_actions` BEFORE
  changing anything: complete/reschedule/rename = an `edit` action (undo PATCHes the
  before-values back); **delete = archive** (set `archived_at`; undo clears it → restores
  exactly, nothing destroyed; cascades to subtasks). Also **Piece 0**: the bare-date fix
  (a bare month-day never resolves into the past — Gemini rule + a code-side guard scoped
  by a `bare_date` flag so "yesterday" is untouched). No schema change (M2's table held
  the room). The checker's M2 nit (owner filter on the log's own deletes) is tidied.

- **M3.5 — Reconcile Marty's delete with the app's Archive.** *(built + deployed.)* Closed
  a data-loss gap: M3's delete set `archived_at` but left `archive_batch_id` **null**, so a
  text-deleted item never appeared in the app's **Archive screen** — recoverable only by
  Marty's one-level undo, then lost to both paths. Now Marty's delete creates an
  `archive_batches` row and stamps `archive_batch_id` on the row(s), **exactly like the
  app's `archiveTask`/`archiveEvent`** (label = title, source_type, subtasks in the same
  batch). So a text-deleted item **shows in the Archive screen and restores there**, AND
  stays undoable via Marty (undo reverts the rows and removes the now-empty batch, matching
  the app's restore). No schema change — reuses the existing archive machinery; no second
  parallel "archived" state.

- **M4 — Multi-turn capture.** *(done — SQL run, checker-approved.)*
  When a capture is missing the ONE key detail (an event with no time), Marty asks **once**
  ("What time?") and completes on the reply: "add lunch Friday" → "What time?" → "1pm" →
  saved as a Friday 1pm event (Inbox, undoable). The discipline: **at most one** follow-up,
  only when the missing thing genuinely blocks a sensible save (tasks almost never ask);
  a complete capture saves with no question. State lives in a tiny table **`marty_pending`**
  (one row per owner, ~5-min expiry) — **only the very next message** can complete it, and
  only if it's actually a time; a new capture / question / undo drops the parked question
  cleanly. First time the bot remembers across messages.

- **M5 — Multi-item capture.** *(built + deployed; no schema change.)* One message → several
  items with the clear-save-ask-unclear rule. All clear → save together, confirmed in one
  message ("buy milk, call plumber, dentist Thursday 3pm" → 3 saved, undo pulls all 3).
  When exactly ONE item is missing its time → **save the clear ones immediately** and ask
  about only that one (reusing M4's pending), linking the question to the batch's action so
  the answer completes into the SAME action (undo still pulls the whole batch). When 2+ are
  missing a time → save the clear ones and **list which still need a time** (never fire
  multiple follow-ups). Reuses M2's batch parsing + M4's pending — no new mechanism.

- **M6 — Category guessing that learns.** *(built + deployed — awaiting SQL run + checker.)*
  Capture no longer dumps everything in Inbox: Marty GUESSES a category from your REAL
  categories and SHOWS it ("Saved 'call plumber' → Admin"); Inbox (null) when nothing fits.
  You correct in words ("that's Errands") → it refiles THAT item immediately via the M3
  edit path (so it's undoable). Learning is by PATTERN, not one-off: corrections are logged
  to a new table **`marty_category_learning`**, and a learned preference only kicks in once
  the SAME kind of correction has happened **2** times (LEARN_THRESHOLD) — then the next
  similar capture auto-files there. A single odd correction never retrains him.

- **M7 — Voice notes.** *(built + deployed; no schema change.)* Speak instead of typing: a
  Telegram voice note is transcribed (Gemini audio, through the M0 seam, free tier) and the
  transcript runs through the EXACT SAME `route()` a typed message uses — so capture,
  multi-item split, category guessing, and the M4/M5 follow-up all apply automatically.
  Every reply is prefixed with **`Heard: "…"`** so a mis-hear is obvious and undoable.
  **Owner's call: full parity** — voice can do everything typing can (incl. undo/edit/
  delete); the echo + undo are the safety net. (Fixes the old "non-text silently dropped".)

- **M8 — Interactive + smarter brief.** *(built + deployed — awaiting SQL run + checker.)*
  **Part A (reorder, not rebuild):** the 7am brief now LEADS with today's schedule and puts
  due/overdue in a NEEDS-ATTENTION footer; same caps (one nudge + one gap). **Part B
  (interactive):** the brief numbers its actionable items and appends a "Reply to act" list;
  a reply **"done 1"** / **"move 3 to Friday"** acts on the EXACT briefed item via M3's edit
  engine (so it's undoable) — names still work too. The number→item map is stored at
  send-time (owner's choice over re-deriving) in a new table **`marty_brief`**, which the
  telegram function reads when a numbered reply arrives. (Numbers only show once the map can
  be stored, i.e. after the SQL is run.)

- **M9 — Daytime opportunity nudges.** *(built + deployed — awaiting SQL run + checker.)*
  The highest nag-risk piece, so the guardrails ARE the feature. A scheduled scan (the
  brief function's new NUDGE mode — same cron/pg_net + DST-safe local-hour gate) offers ONE
  calm use of a 60+ min free window: the single most-overdue task, or one quick-win. **Hard
  caps:** 9am–6pm only, max 2/day (one morning, one afternoon), never back-to-back — enforced
  via a new `marty_nudges` table. **"yes"** blocks the task into the slot via M3's edit engine
  (undoable); **"no"** closes it for today only (no block, no memory). "nudge test" mirrors
  "brief test" for on-demand verifying.

- **M10 — Hardening pass (close-out).** *(DONE — all four pieces + deployed.)* Cleanup, no new
  features, as small separate commits. (1) **Retired the test scaffolding** (owner confirmed no
  every-3-min cron): removed the "brief test" 0-day path, the brief's `force`/hour-gate bypass,
  and "nudge test"'s force. "brief" and "nudge" remain as on-demand triggers that go through the
  FULLY-guardrailed path — `scanForNudge()` always enforces 9–6 + max-2/day + never-back-to-back,
  with NO bypass left anywhere. (2) Gemini retry loop fails fast on deterministic 4xx, keeps the
  transient (5xx/408/network) "server busy" retry. (3) Split `edit.ts` (242→203): the commit
  engine moved to a leaf `editcore.ts`, behaviour identical. (4) The nudge "yes" re-checks the
  slot is still free before blocking (no double-book; declines gracefully if taken). No schema
  change; cron jobs untouched.

> **M-track COMPLETE.** M0–M9 are all built, deployed, SQL-run and checker-approved; M10 (this
> hardening pass) is done. Marty is now conversational + proactive end to end — capture by text
> and voice, questions, edit/delete, multi-turn and multi-item, category learning, the
> interactive numbered brief, and guardrailed daytime nudges — all undoable, all on free tiers.

> **Numbering note:** the track has grown as phases were defined session by session.
> M1 merged "router" + "questions"; M2 became the **undo foundation** (before edit/delete);
> M3.5 reconciled delete with Archive; **M5 became multi-item capture**, pushing category
> learning → M6, voice → M7, interactive brief → M8, daytime nudges → M9, hardening → M10.
> Track now runs **M0–M10**; the exact shape past M6 is still open.

---

## Known things to design around (carried from the M0 recon)
- **Bare dates with no year** (e.g. "Jan 10") — **FIXED in M3 Piece 0.** Gemini is told a
  bare month-day means the next upcoming occurrence (never the past), and a code-side
  guard (`rollPastBareDateForward`, scoped by a `bare_date` flag so relative refs like
  "yesterday" are untouched) rolls any past bare date forward a year. So "what did I
  forget?" no longer surfaces a phantom-overdue from this.
- **`undo` is now action-based and multi-step (M2)** — `marty_actions` records each
  action with prior-state room, so editing/deleting (M3) is reversible. The old
  create-only `telegram_saves` is superseded (left in place, no longer read/written).
- **`source='telegram'` is stamped on tasks but not events** — remember this if a
  feature wants "everything Marty made" uniformly.
- **The telegram function keeps its own copy of the date/time helpers**; the shared
  `_shared/datetime.ts` is used only by the brief. Unifying those is a **separate
  later cleanup**, deliberately NOT part of M0.
