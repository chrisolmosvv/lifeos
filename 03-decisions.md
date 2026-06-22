# LifeOS — Decisions

> I am the record of "what we chose and why," so we never re-argue settled
> things or contradict ourselves. LIVING doc — add to me, never silently
> reverse me. New decisions on top.

## Format
**[Decision]** — the choice. **Why:** the reason. **Trade-off:** what we gave up.

---

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
