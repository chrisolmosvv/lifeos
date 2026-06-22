# LifeOS — Decisions

> I am the record of "what we chose and why," so we never re-argue settled
> things or contradict ourselves. LIVING doc — add to me, never silently
> reverse me. New decisions on top.

## Format
**[Decision]** — the choice. **Why:** the reason. **Trade-off:** what we gave up.

---

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
