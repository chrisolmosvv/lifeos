# Hermes Write-Path Recon

> **⚠️ STALE SNAPSHOT — banner added 2026-07-15 (doc-drift audit D-19).** True as of
> 2026-07-08, before `hermes-write` was built. The function has since shipped, been
> **split** (health handlers → `health.ts` in the H-0 refactor; people → `people.ts`;
> finance → `finance.ts`) and grown **people + finance-transaction** domains. Current
> truth: `00-hermes-track.md` + the architecture doc. This snapshot's value is being
> the record of that date.

> Recon date: 2026-07-08. Read-only investigation. NO CHANGES MADE.

---

## 1. EXISTING WRITE PATHS (the telegram function)

### What telegram can currently WRITE

| Op | Tables | How undo works |
|---|---|---|
| **Create** task | `tasks` | `marty_actions` row with `kind:'create'`, items `[{table,id,title}]`. Undo = hard-DELETE the row by id+owner. |
| **Create** event | `events` | Same pattern. |
| **Edit** (complete, reschedule, rename, categorize) | `tasks`, `events` | `marty_actions` row with `kind:'edit'`, items `[{table,id,title,before:{...}}]`. Undo = PATCH prior values back. |
| **Delete** (archive) | `tasks`, `events` | `marty_actions` row with `kind:'delete'`, items `[{table,id,title,before:{archived_at,archive_batch_id},batch_id}]`. Creates an `archive_batches` row first, stamps `archived_at`+`archive_batch_id`. Undo = PATCH `archived_at`/`archive_batch_id` back to null + delete the empty `archive_batches` row. |

### marty_actions table shape (the undo log)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | auto |
| `user_id` | uuid NOT NULL | owner ref |
| `kind` | text NOT NULL | CHECK `('create','edit','delete')` |
| `label` | text | human label |
| `items` | jsonb NOT NULL DEFAULT `'[]'` | array of `{table, id, title, before?, batch_id?}` |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |

**Key detail:** The `table` field inside `items` is a plain string — NOT restricted to `tasks`/`events`. The undo code (`reverseItem`) dispatches on `kind`, not on `table`:
- `kind:'create'` → DELETE from `${item.table}` where `id=eq.${item.id}`
- `kind:'edit'`/`kind:'delete'` → PATCH `${item.table}` with `item.before`

This means **any table name can be stored in the items array**, and undo will work generically. A hermes-write insert for `food_log_entries` can log `{table:"food_log_entries", id:"<uuid>", title:"Lunch — chicken burrito"}` and `undo` will DELETE it by id+owner.

### Which domains ALREADY have an undo-safe write path?

| Domain | Has undo-safe path? | Notes |
|---|---|---|
| **Tasks** | YES | Full CRUD via telegram (create/edit/delete) |
| **Events** | YES | Full CRUD via telegram |
| **Food log** | NO | App writes directly; no undo log. No conversational path. |
| **Body metrics** | NO | Apple Shortcut writes via `health-ingest`; upsert, no undo log. |
| **Sleep** | NO | Apple Shortcut writes via `health-ingest`; upsert, no undo log. |
| **Gym** | NO | Hevy sync writes via `gym` function; sync/backfill, no undo log. |
| **Focus** | NO | App writes directly; soft-delete via `archived_at`, no undo log. |

---

## 2. WRITE-TARGET TABLE SHAPES

### 2a. food_log_entries

| Column | Type | Required? | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | uuid PK | auto | `gen_random_uuid()` | | |
| `user_id` | uuid | NOT NULL | `auth.uid()` | FK → auth.users | stamp OWNER_USER_ID |
| `entry_date` | date | **NOT NULL** | none | | Amsterdam day — must be supplied |
| `meal_slot` | text | **NOT NULL** | none | CHECK `('breakfast','lunch','dinner','snacks')` | |
| `food_item_id` | uuid | nullable | null | FK → food_items, SET NULL on delete | |
| `recipe_id` | uuid | nullable | null | FK → recipes, SET NULL on delete | |
| `amount` | numeric | nullable | null | | e.g. 1, 200, 1.5 |
| `unit` | text | nullable | null | | e.g. "serving", "g" |
| `kcal` | numeric | nullable | null | | **SNAPSHOT** — frozen at log time |
| `protein` | numeric | nullable | null | | **SNAPSHOT** |
| `carbs` | numeric | nullable | null | | **SNAPSHOT** |
| `fat` | numeric | nullable | null | | **SNAPSHOT** |
| `fibre` | numeric | nullable | null | | **SNAPSHOT** |
| `sugar` | numeric | nullable | null | | **SNAPSHOT** |
| `sodium` | numeric | nullable | null | | **SNAPSHOT** |
| `entry_source` | text | **NOT NULL** | none | CHECK `('manual','search','recipe_cook')` | **PROBLEM — see below** |
| `is_estimated` | boolean | nullable? | — | | live in DB, added before SQL files |
| `is_alcohol` | boolean | NOT NULL | false | | |
| `alcohol_units` | numeric | nullable | null | | |
| `entry_label` | text | nullable | null | | display name for estimate entries |
| `created_at` | timestamptz | NOT NULL | now() | | |
| `updated_at` | timestamptz | NOT NULL | now() | | |

**Macro SNAPSHOT contract:** The seven columns `kcal, protein, carbs, fat, fibre, sugar, sodium` are REAL STORED numerics copied at write time. They are deliberately NOT derived — what was eaten must not change when a food's DB numbers later change. Hermes must supply these at insert time (they can be null individually, but the caller should provide kcal/protein/carbs/fat at minimum).

**Minimum valid row:**
```json
{
  "user_id": "<OWNER>",
  "entry_date": "2026-07-08",
  "meal_slot": "lunch",
  "entry_source": "manual",
  "kcal": 450, "protein": 30, "carbs": 40, "fat": 15,
  "entry_label": "Chicken burrito"
}
```

**PROBLEM — `entry_source` CHECK constraint:** The CHECK is `('manual','search','recipe_cook')`. There is no `'hermes'` value. Hermes-logged entries would need to use `'manual'` (semantically acceptable — Hermes is entering on the owner's behalf) OR the CHECK would need an ALTER to add `'hermes'`. Using `'manual'` works today with NO schema change; adding `'hermes'` is a Checker-gated schema touch.

### 2b. body_metrics

| Column | Type | Required? | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid PK | auto | `gen_random_uuid()` | |
| `user_id` | uuid | NOT NULL | `auth.uid()` | FK → auth.users |
| `metric_date` | date | **NOT NULL** | none | Amsterdam day |
| `metric_type` | text | **NOT NULL** | none | free text (weight, body_fat, lean_mass, bmi) |
| `value` | numeric | **NOT NULL** | none | |
| `unit` | text | nullable | null | e.g. "kg", "%" |
| `reading_at` | timestamptz | **NOT NULL** | none | exact timestamp |
| `source` | text | nullable | null | free text — can use `'hermes'` with no schema change |
| `created_at` | timestamptz | NOT NULL | now() | |

**UNIQUE:** `(user_id, metric_type, reading_at, source)` — natural dedup key. A retry with the same `reading_at` + `source` would conflict (409) or upsert.

**Minimum valid row:**
```json
{
  "user_id": "<OWNER>",
  "metric_date": "2026-07-08",
  "metric_type": "weight",
  "value": 82.5,
  "unit": "kg",
  "reading_at": "2026-07-08T07:30:00Z",
  "source": "hermes"
}
```

### 2c. sleep_nights

| Column | Type | Required? | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid PK | auto | `gen_random_uuid()` | |
| `user_id` | uuid | NOT NULL | `auth.uid()` | FK → auth.users |
| `night_date` | date | **NOT NULL** | none | wake-up date |
| `in_bed_at` | timestamptz | nullable | null | |
| `woke_at` | timestamptz | nullable | null | |
| `asleep_minutes` | integer | nullable | null | |
| `rem_minutes` | integer | nullable | null | |
| `core_minutes` | integer | nullable | null | |
| `deep_minutes` | integer | nullable | null | |
| `awake_minutes` | integer | nullable | null | |
| `awakenings` | integer | nullable | null | |
| `score` | integer | nullable | null | reserved |
| `source` | text | nullable | null | free text — can use `'hermes'` |
| `created_at` | timestamptz | NOT NULL | now() | |
| `updated_at` | timestamptz | NOT NULL | now() | |

**UNIQUE:** `(user_id, night_date)` — one row per night. A re-send of the same night would conflict (409) or upsert (merge-duplicates).

**Minimum valid row:**
```json
{
  "user_id": "<OWNER>",
  "night_date": "2026-07-08",
  "asleep_minutes": 420,
  "source": "hermes"
}
```

### 2d. gym_workouts

| Column | Type | Required? | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid PK | auto | `gen_random_uuid()` | |
| `user_id` | uuid | NOT NULL | `auth.uid()` | FK → auth.users |
| `hevy_id` | text | **NOT NULL** | none | Hevy's external workout id |
| `title` | text | nullable | null | |
| `started_at` | timestamptz | nullable | null | |
| `ended_at` | timestamptz | nullable | null | |
| `created_at` | timestamptz | NOT NULL | now() | |

**UNIQUE:** `(user_id, hevy_id)` — requires a `hevy_id`.

**PROBLEM:** This table is a CACHE of Hevy data. `hevy_id` is NOT NULL and part of the unique key. Hermes doesn't know the Hevy id. **Hermes should NOT write to this table.** Gym data flows exclusively from Hevy via the `gym` sync function. If Hermes wants to log a workout not from Hevy, that's a different feature requiring a new table or column — flag for later.

### 2e. focus_sessions

| Column | Type | Required? | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid PK | auto | `gen_random_uuid()` | |
| `user_id` | uuid | NOT NULL | `auth.uid()` | FK → auth.users |
| `started_at` | timestamptz | **NOT NULL** | none | |
| `ended_at` | timestamptz | nullable | null | null = running |
| `mode` | text | **NOT NULL** | none | CHECK `('count_up','count_down','intervals')` |
| `target_seconds` | int | nullable | null | |
| `break_seconds` | int | nullable | null | |
| `task_id` | uuid | nullable | null | soft ref, no FK |
| `task_title_snapshot` | text | nullable | null | |
| `category_id` | uuid | nullable | null | soft ref, no FK |
| `category_snapshot` | jsonb | nullable | null | |
| `segments` | jsonb | NOT NULL | `'[]'` | raw focus/break blocks |
| `source` | text | NOT NULL | `'timer'` | CHECK `('timer','manual')` |
| `rating` | smallint | nullable | null | CHECK `1..5` |
| `note` | text | nullable | null | |
| `archived_at` | timestamptz | nullable | null | soft-delete |
| `created_at` | timestamptz | NOT NULL | now() | |
| `updated_at` | timestamptz | NOT NULL | now() | |

**PROBLEM — `source` CHECK constraint:** `('timer','manual')`. No `'hermes'` value. A Hermes-logged session would use `'manual'` (semantically correct — it's a back-filled past session). OR the CHECK needs an ALTER to add `'hermes'`. Using `'manual'` works today with no schema change.

**Minimum valid row:**
```json
{
  "user_id": "<OWNER>",
  "started_at": "2026-07-08T14:00:00Z",
  "ended_at": "2026-07-08T15:30:00Z",
  "mode": "count_up",
  "source": "manual"
}
```

---

## 3. UNDO FOR NEW DOMAINS

### Can marty_actions log a food/health insert?

**YES.** The `items` jsonb array stores `{table, id, title}` with `table` as a plain string — there is no CHECK or constraint limiting it to `"tasks"` or `"events"`. The undo code in `undo.ts` dispatches generically:

```typescript
// kind === "create" → DELETE from ${item.table} where id = ${item.id}
const deleted = await del(`${item.table}?id=eq.${item.id}&user_id=eq.${OWNER_USER_ID}`);
```

So a hermes-write insert of a `food_log_entries` row logged as:
```json
{ "kind": "create", "label": "Lunch — chicken burrito",
  "items": [{"table":"food_log_entries","id":"<uuid>","title":"Lunch — chicken burrito"}] }
```
...is fully reversible via `undo` (which will DELETE the food_log_entries row by id+owner). Same for `body_metrics`, `sleep_nights`, `focus_sessions`.

**One caveat:** The existing `undo` command in the Telegram bot currently only works through the Telegram function (the user texts "undo"). Hermes-write would need its own undo endpoint, or the user undoes via Telegram. Either way, `marty_actions` can store the action and the reversal code is generic.

### Undo patterns per domain

| Domain | Undo strategy | Notes |
|---|---|---|
| **Task create** | `kind:'create'` → DELETE row | Already works |
| **Event create** | `kind:'create'` → DELETE row | Already works |
| **Food log** | `kind:'create'` → DELETE row | Works generically — no schema change |
| **Body metric** | `kind:'create'` → DELETE row | Works generically |
| **Sleep night** | `kind:'create'` → DELETE row | Works generically |
| **Focus session** | `kind:'create'` → DELETE row | Works generically |
| **Gym workout** | N/A | Hermes should NOT write gym_workouts (Hevy cache) |

---

## 4. SOURCE TAGGING + DEDUP

### Source columns per table

| Table | Source column | Type | CHECK constraint | Can use `'hermes'`? |
|---|---|---|---|---|
| `tasks` | `source` | text, nullable | none (free text) | **YES** — no schema change needed. Telegram uses `'telegram'`. |
| `events` | none | — | — | No source column. Events don't track origin. |
| `food_log_entries` | `entry_source` | text, NOT NULL | `('manual','search','recipe_cook')` | **NO** — would need ALTER to add `'hermes'`, OR use `'manual'`. |
| `body_metrics` | `source` | text, nullable | none (free text) | **YES** — Apple Shortcut uses `'apple-health'`. |
| `sleep_nights` | `source` | text, nullable | none (free text) | **YES** |
| `focus_sessions` | `source` | text, NOT NULL | `('timer','manual')` | **NO** — would need ALTER, OR use `'manual'`. |
| `gym_workouts` | N/A | — | — | Hermes doesn't write here. |

### Dedup per domain

| Table | Natural unique key | Agent-retry safety |
|---|---|---|
| `tasks` | none | No natural dedup. hermes-write needs app-level idempotency (e.g. a caller-supplied idempotency key, or check-before-insert). |
| `events` | none | Same — no natural dedup. |
| `food_log_entries` | none | Same. |
| `body_metrics` | `(user_id, metric_type, reading_at, source)` | **YES** — a retry with the same `reading_at`+`source='hermes'` will conflict. Safe to use upsert (merge-duplicates). |
| `sleep_nights` | `(user_id, night_date)` | **YES** — a retry with the same `night_date` will conflict. Safe to upsert. |
| `focus_sessions` | none | No natural dedup. |

### Schema touches needed for source tagging (Checker-gated, NOT done)

To distinctly tag Hermes-written rows (instead of piggybacking on `'manual'`):

1. **`food_log_entries.entry_source`** — ALTER the CHECK to add `'hermes'`:
   ```sql
   ALTER TABLE food_log_entries DROP CONSTRAINT food_log_entries_entry_source_check;
   ALTER TABLE food_log_entries ADD CONSTRAINT food_log_entries_entry_source_check
     CHECK (entry_source IN ('manual','search','recipe_cook','hermes'));
   ```
2. **`focus_sessions.source`** — ALTER the CHECK to add `'hermes'`:
   ```sql
   ALTER TABLE focus_sessions DROP CONSTRAINT focus_sessions_source_check;
   ALTER TABLE focus_sessions ADD CONSTRAINT focus_sessions_source_check
     CHECK (source IN ('timer','manual','hermes'));
   ```
3. **`archive_batches.source_type`** — if hermes ever deletes (it shouldn't initially), would need `'food_log_entry'` etc. Not needed for create-only.

These are additive CHECK expansions — no data migration, no column change, no FK, no spine impact. But they ARE schema touches requiring a Checker gate.

**Viable without schema change:** Use `entry_source='manual'` and `source='manual'` for now. The `marty_actions` log already identifies the source (`hermes-write` would log under its own label). A later migration can reclassify.

---

## 5. RLS + SAFETY

### RLS status — confirmed ON + owner-only for every write target

| Table | RLS | Policies |
|---|---|---|
| `tasks` | ON | owner-only (select/insert/update/delete) |
| `events` | ON | owner-only |
| `food_log_entries` | ON | owner-only |
| `body_metrics` | ON | owner-only |
| `sleep_nights` | ON | owner-only |
| `focus_sessions` | ON | owner-only |
| `marty_actions` | ON | owner-only |
| `archive_batches` | ON | owner-only |

### Spine safety

- **Tasks/events writes:** hermes-write would use the SAME insert path as telegram/save.ts (service-role key + explicit `user_id=OWNER_USER_ID`). No spine columns are altered. Source tagged `'hermes'` (tasks.source is free text). Category can be null (→ Inbox) or a valid category_id.
- **Health/food writes:** These tables have NO FK into the spine. `food_log_entries.food_item_id` and `.recipe_id` are intra-module FKs (Food → Food), and hermes would set both to null (a manual/estimated entry). `focus_sessions.task_id` and `.category_id` are soft refs (plain uuid, no FK) — safe to set or leave null.
- **No write to categories/tasks/events meaning** is required for any health domain write.

---

## RECOMMENDATION

### Per-kind payload contract

```typescript
// The caller sends ONE of these per request.
type HermesWritePayload =
  | { kind: "task",    data: { title: string; due_date?: string; time_bucket?: string; category_id?: string } }
  | { kind: "event",   data: { title: string; date: string; time: string; duration_minutes?: number; category_id?: string } }
  | { kind: "food",    data: { entry_date: string; meal_slot: string; kcal: number; protein: number; carbs: number; fat: number; entry_label: string; fibre?: number; sugar?: number; sodium?: number; is_alcohol?: boolean; alcohol_units?: number; is_estimated?: boolean } }
  | { kind: "weight",  data: { value: number; unit?: string; reading_at?: string } }
  | { kind: "sleep",   data: { night_date: string; asleep_minutes: number; in_bed_at?: string; woke_at?: string; rem_minutes?: number; core_minutes?: number; deep_minutes?: number; awake_minutes?: number; awakenings?: number } }
  | { kind: "focus",   data: { started_at: string; ended_at: string; mode?: string; task_title_snapshot?: string; rating?: number; note?: string } }
  | { kind: "undo" }  // reverses the last hermes-write action
```

Every successful create returns `{ ok: true, id: "<uuid>", undo_id: "<action-uuid>" }`.
Every create is logged to `marty_actions` with `kind:'create'` before returning.
`kind:"undo"` reverses the most recent hermes-write action (reuses the same undo logic).

### Items requiring a Checker-gated schema change

| # | What | Why | Impact |
|---|---|---|---|
| 1 | `food_log_entries.entry_source` CHECK → add `'hermes'` | Distinct tagging of Hermes food logs | Additive CHECK expansion only |
| 2 | `focus_sessions.source` CHECK → add `'hermes'` | Distinct tagging of Hermes focus sessions | Additive CHECK expansion only |

**Both are OPTIONAL** — using `'manual'` works without any schema change and is semantically acceptable. The distinct `'hermes'` tag is a nice-to-have for audit/filtering.

### Items explicitly NOT needed

- Gym writes — Hermes should not write to the Hevy cache tables.
- No new tables required.
- No FK changes.
- No spine alterations.
- `marty_actions` works generically for all tables with no change.

---

**NO CHANGES MADE — recon only.**
