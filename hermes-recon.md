# Hermes Read-Path Recon — LifeOS

> **⚠️ STALE SNAPSHOT — banner added 2026-07-15 (doc-drift audit D-19).** True as of
> 2026-07-08, before `hermes-read`/`hermes-write` were deployed. Since then: NINE edge
> functions exist (this doc counts seven); hermes-read gained **people + finance**
> sections; hermes-write shipped, was split (health.ts, people.ts, finance.ts), and
> serves eight domains. Current truth: `00-hermes-track.md` + the architecture doc's
> function inventory. This snapshot's value is being the record of that date.

> Recon date: 2026-07-08. Read-only investigation. NO CHANGES MADE.

---

## 1. EXISTING EDGE FUNCTIONS AS READ SURFACES

Seven edge functions are deployed:

| Function | verify_jwt | Auth method | Read/Write |
|---|---|---|---|
| `telegram` | default (true, but receives Telegram webhook) | `X-Telegram-Bot-Api-Secret-Token` header + OWNER_CHAT_ID gate | Read+Write |
| `brief` | true (PRIVATE) | Service-role key (`Authorization: Bearer <service-role>`) | Read+Write (tiny: stores brief map) |
| `gym` | true (PRIVATE) | Service-role key | Read+Write (sync/backfill) |
| `health-ingest` | **false** (pinned in config.toml) | `x-health-secret` header | Write only |
| `food-search` | true | Owner's JWT (browser session) | Read only |
| `meal-estimate` | true | Owner's JWT (browser session) | Read only (AI call) |
| `recipe-import` | true | Owner's JWT (browser session) | Read only (AI call) |

### 1a. `brief` — the strongest existing read surface

**What it reads:** Today's events, Today-bucket tasks, due-today tasks, overdue tasks, time-blocked tasks, the one most-forgotten This Week task, a gap offer, yesterday's focus time, and a gym summary line. Essentially a complete daily snapshot.

**How it's triggered:** `POST https://<project>.supabase.co/functions/v1/brief` with body `{}` (on-demand) or `{ "scheduled": true }` (cron) or `{ "nudge": true }`.

**Auth:** The function is deployed WITH JWT verification. Only callers presenting the **service-role key** as a Bearer token can invoke it. The telegram function does this internally.

**Output path:** It does NOT return the data in the HTTP response. It sends the brief text to Telegram via the Bot API and returns a bare `"sent"` / `"error-handled"` string. **An external agent cannot call this and get data back in the response.**

**Could Hermes use it?** Not directly as-is. The brief gathers exactly the data Hermes wants, but it sends the result to Telegram rather than returning it. To use this as a read surface, you would need either:
- A new mode (e.g. `{ "return": true }`) that returns the gathered data as JSON instead of sending to Telegram, OR
- A new lightweight function that reuses `brief/day.ts`'s `gatherDay()` logic and returns JSON.

### 1b. `telegram` — has a read-only query path, but locked to Telegram

The router (`route.ts`) has a read-only QUESTION path (`query.ts`) that answers things like "what's on Thursday?", "am I free Friday afternoon?", "what did I forget?". It imports only `select` from `db.ts` — no writes.

**Auth:** Locked behind Telegram's webhook secret header AND the OWNER_CHAT_ID gate. An external HTTPS caller cannot reach this — it requires a valid Telegram webhook payload shape.

**Could Hermes use it?** No, not without significant reworking.

### 1c. `gym` — count mode returns data in response

**What it reads (count mode):** Calls the Hevy API and returns `{ ok: true, workout_count: N }`.

**Auth:** Service-role key.

**Could Hermes use it?** The count mode returns data via HTTP response, but it only returns a workout count from Hevy's API — not from your local gym tables. Not useful for analysis.

### 1d. `food-search`, `meal-estimate`, `recipe-import`

All require the **owner's browser JWT** (a logged-in session). An external agent on a VPS cannot easily mint or hold this JWT — it expires hourly and requires the owner's auth credentials.

---

## 2. DIRECT SUPABASE READ PATH (PostgREST)

### 2a. RLS status — confirmed ON for every table

Every table has RLS enabled with four owner-only policies (`auth.uid() = user_id` for SELECT/INSERT/UPDATE/DELETE). Confirmed in the SQL definitions:

| Table | RLS | Policies |
|---|---|---|
| `tasks` | ON | owner-only (select/insert/update/delete) |
| `events` | ON | owner-only |
| `categories` | ON | owner-only |
| `food_items` | ON | owner-only |
| `food_log_entries` | ON | owner-only |
| `recipes` | ON | owner-only |
| `recipe_ingredients` | ON | owner-only |
| `recipe_steps` | ON | owner-only |
| `gym_workouts` | ON | owner-only |
| `gym_exercises` | ON | owner-only |
| `gym_sets` | ON | owner-only |
| `gym_exercise_templates` | ON | owner-only |
| `gym_sync_state` | ON | owner-only |
| `sleep_nights` | ON | owner-only |
| `body_metrics` | ON | owner-only |
| `health_goals` | ON | owner-only |
| `activity_hourly` | ON | owner-only |
| `focus_sessions` | ON | owner-only |
| `recurrences` | ON | owner-only |
| `marty_actions` | ON | owner-only |

### 2b. Can the anon key read?

**No.** RLS policies use `auth.uid() = user_id`. The anon key carries no user identity (`auth.uid()` returns NULL), so every SELECT returns zero rows. The anon key alone cannot read any data.

### 2c. Can a user JWT read?

**Yes.** If the owner signs in via Supabase Auth (email/password) and obtains a JWT, that JWT can be used with the anon key to read all owner rows via PostgREST. The JWT carries `auth.uid()` matching the owner's `user_id`.

**Problem:** A user JWT is a full session token. The RLS policies grant SELECT, INSERT, UPDATE, and DELETE. There is no read-only RLS policy — the owner's JWT can also write and delete rows. There is no way to scope a user JWT to read-only via the current schema.

### 2d. Can the service-role key read?

**Yes.** The service-role key bypasses RLS entirely. It can read (and write/delete) all rows in all tables. This is what `brief`, `telegram`, and `gym` use internally — they add an explicit `user_id=eq.<OWNER_USER_ID>` filter as defence-in-depth.

### 2e. Tables an analysis agent would want

| Table | What it holds | Analysis value |
|---|---|---|
| `tasks` | All tasks (open/done), buckets, due dates, categories | Daily task load, completion patterns |
| `events` | Calendar events with times | Schedule density, time usage |
| `categories` | Category tree | Grouping/labelling |
| `food_log_entries` | Daily food log with macro snapshots | Nutrition tracking, meal patterns |
| `food_items` | Food library (per-100g macros) | Reference data for food analysis |
| `recipes` | Saved recipes | Cooking patterns |
| `sleep_nights` | Nightly sleep data (stages, times) | Sleep quality trends |
| `body_metrics` | Weight, body fat, etc. | Body composition trends |
| `activity_hourly` | Steps, active energy, heart rate by hour | Activity patterns |
| `focus_sessions` | Focus timer sessions | Productivity analysis |
| `gym_workouts` + `gym_exercises` + `gym_sets` | Workout history with exercises and sets | Training trends, PRs |
| `health_goals` | Targets for sleep, weight, focus, nutrition | Goal vs. actual comparison |
| `recurrences` | Repeating event/task patterns | Routine mapping |

---

## 3. KEYS & AUTH — what a read-only connection needs

### 3a. Available key types

| Key | What it can do | Risk level |
|---|---|---|
| **Anon key** (`SUPABASE_ANON_KEY`) | Included in every PostgREST request as `apikey`. Alone, it reads nothing (RLS blocks). Combined with a user JWT, it reads AND writes. | Low alone, medium with JWT |
| **Service-role key** (`SUPABASE_SERVICE_ROLE_KEY`) | Bypasses ALL RLS. Full read+write+delete on every table. | **HIGH** — a write-capable god key |
| **User JWT** (from Supabase Auth sign-in) | Scoped to the owner via RLS. Can read, write, update, delete the owner's rows. Expires hourly (refresh token extends). | Medium — full CRUD on owner data |

### 3b. Is there a read-only path today?

**No.** There is currently no way for an external caller to READ data without also being able to WRITE:

- The **service-role key** bypasses RLS entirely (read+write+delete everything).
- A **user JWT** + anon key passes RLS but the policies grant full CRUD (read+write+delete owner rows).
- The **anon key alone** can read nothing.
- No existing edge function returns read data in its HTTP response to an external caller.

### 3c. MINIMUM-PRIVILEGE recommendation (what to build later — NOT now)

The lowest-risk read path for Hermes is a **new edge function** (e.g. `hermes-read`) that:

1. Is deployed with `verify_jwt = false` (like `health-ingest`) since Hermes has no Supabase session.
2. Authenticates via a dedicated **shared secret header** (e.g. `x-hermes-secret`), checked as the first thing.
3. Internally uses the **service-role key** (auto-injected) to read from PostgREST with an explicit `user_id=eq.<OWNER_USER_ID>` filter — the same pattern `brief/sb.ts` already uses.
4. Returns structured JSON in the HTTP response.
5. **Contains NO write operations** — only imports `select`, never `insert`/`update`/`del`.

This means:
- Hermes only needs **one secret** (the `x-hermes-secret` value) — not the service-role key.
- The function is read-only by construction (no write code exists in it).
- If the secret leaks, the attacker can only read — they cannot write or delete anything.
- The service-role key stays inside Supabase's Vault, never on the VPS.

**Alternative (simpler, higher risk):** Create a Postgres role with SELECT-only grants, generate a custom JWT for that role, and use it via PostgREST. This requires more Supabase configuration (custom roles, custom JWT claims) and is less well-trodden on the free tier.

---

## 4. THE SAFE WRITE PATH (document only — build nothing)

### 4a. Existing write functions and their protections

The existing edge functions are the correct write path. They enforce:

- **Undo logging** — every create/edit/delete is recorded in `marty_actions` with prior state, enabling reversal.
- **Archive-on-delete** — deletes stamp `archived_at` + `archive_batch_id` rather than hard-deleting; undo restores.
- **Spine protection** — modules add rows; they never ALTER the core task/event/category tables.
- **Source tagging** — telegram-created tasks carry `source: 'telegram'`.
- **Owner stamping** — every row gets `user_id = OWNER_USER_ID` explicitly.

### 4b. Write endpoints Hermes would later call

| Action | Function | Endpoint | Body | Auth |
|---|---|---|---|---|
| **Add a task** | `telegram` | Telegram Bot API (send text to bot) | The task in natural language | Telegram webhook secret + OWNER_CHAT_ID |
| **Add an event** | `telegram` | Same | "meeting with X at 3pm Thursday" | Same |
| **Mark done** | `telegram` | Same | "done <task name>" or "done 1" | Same |
| **Reschedule** | `telegram` | Same | "move <task> to Friday" | Same |
| **Delete** | `telegram` | Same | "delete <task>" | Same |
| **Undo** | `telegram` | Same | "undo" or "undo <name>" | Same |
| **Log food** | Direct PostgREST | `POST /rest/v1/food_log_entries` | Row JSON | Owner JWT or service-role key |
| **Trigger brief** | `brief` | `POST /functions/v1/brief` with `{}` | Empty or `{}` | Service-role key as Bearer |

**Note on the Telegram path:** For an agent to use the `telegram` function's write capabilities, the cleanest approach would be to have the agent send messages through the Telegram Bot API (as if texting the bot), which routes through all the existing safety rails. Alternatively, a new write function could be built that reuses the same `save.ts`/`edit.ts`/`undo.ts` logic with a dedicated secret header.

---

## RECOMMENDATION

**The single lowest-risk way for Hermes to READ your data for analysis:**

Build a new edge function called `hermes-read` (a later session — NOT now). It would:

1. **Authenticate** with a single shared secret in a header (`x-hermes-secret`), just like `health-ingest` does with `x-health-secret`.
2. **Read** using the service-role key internally (auto-injected by Supabase, never exposed to Hermes).
3. **Return** a JSON snapshot of the data Hermes needs (tasks, events, food log, sleep, body, activity, gym, focus, categories).
4. **Never write** — the function's code would only import `select`, making it read-only by construction.

**What you'd supply to Hermes on the VPS:**
- The function's URL: `https://cntlptuacsujbdtwvbis.supabase.co/functions/v1/hermes-read`
- One secret: the `x-hermes-secret` value (stored in Supabase Vault, set by you)
- Nothing else — no service-role key, no user JWT, no anon key

**What stays safe:**
- The service-role key never leaves Supabase
- If the hermes secret leaks, the attacker can only read — no writes, no deletes
- RLS on all tables is untouched
- All existing write paths (undo, archive, source tagging, spine protection) are undisturbed

---

**NO CHANGES MADE — recon only.**
