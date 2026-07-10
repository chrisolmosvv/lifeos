# People / Rolodex Module — Recon #2 (Build-Grounding + Schema Proposal)

> Recon date: 2026-07-09. Read-only investigation. NO CHANGES MADE.
> This grounds the Planner's locked spec against the live code and proposes the exact schema.
> The Planner reviews this report. The Checker gates the schema on "checker approved."

---

## 1. LIVE COLUMNS of Every Relevant Table

### `events` table (db/04 + db/10 + db/09 + db/37)

| Column | Type | Constraints / Default | Notes |
|---|---|---|---|
| id | uuid PK | gen_random_uuid() | |
| user_id | uuid NOT NULL | FK auth.users, default auth.uid() | |
| title | text NOT NULL | | |
| notes | text | nullable | |
| category_id | uuid | FK categories ON DELETE SET NULL | |
| start_at | timestamptz NOT NULL | | |
| end_at | timestamptz NOT NULL | CHECK end_at >= start_at | |
| location | text | nullable | |
| repeat_rule | text | nullable, DORMANT (unused) | |
| external_id | text | nullable, hidden (future Apple sync) | |
| all_day | boolean NOT NULL | default false (db/10) | |
| series_id | uuid | FK recurrences ON DELETE SET NULL (db/37) | |
| series_detached | boolean NOT NULL | default false (db/37) | |
| archived_at | timestamptz | nullable (db/09) | |
| archive_batch_id | uuid | FK archive_batches ON DELETE SET NULL (db/09) | |
| created_at | timestamptz NOT NULL | default now() | |

**NO `source` column.** Events do not track origin. **NO `updated_at`.** This is confirmed — the events table has `created_at` only. (Tasks also have no `updated_at`.)

**`source` is allowed values on tasks.source:** free text, nullable, default `'typed by me'`. NO CHECK constraint — any string is valid. Values in use: `'typed by me'`, `'telegram'`, `'hermes'`. A People module writing tasks with `source='people'` needs **no schema change**.

### `recurrences` table (db/37)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid NOT NULL | FK auth.users |
| target_kind | text NOT NULL | CHECK ('event', 'task') |
| freq | text NOT NULL | CHECK ('daily', 'weekly', 'monthly', 'yearly') |
| weekdays | smallint[] | nullable; JS getDay values |
| end_kind | text NOT NULL | CHECK ('never', 'count', 'until') |
| end_count | int | used when end_kind='count' |
| end_until | date | used when end_kind='until' |
| start_date | date NOT NULL | anchor (first occurrence) |
| wall_time | time | nullable; null = all-day |
| duration_minutes | int | nullable |
| timezone | text NOT NULL | default 'Europe/Amsterdam' |
| title | text NOT NULL | template |
| notes | text | |
| category_id | uuid | FK categories ON DELETE SET NULL |
| location | text | |
| all_day | boolean NOT NULL | default false |
| time_bucket | text | CHECK null or ('Today','This Week','Someday') |
| generated_until | date | rolling window bookmark |
| split_parent_id | uuid | FK recurrences ON DELETE SET NULL |
| created_at | timestamptz NOT NULL | |

**NO `updated_at`** on recurrences. **NO `source` column** on recurrences.

### `categories` table (db/01 + db/02 + db/07 + db/09)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid NOT NULL | FK auth.users |
| name | text NOT NULL | |
| parent_id | uuid | FK categories ON DELETE CASCADE |
| color | text | nullable; palette id (e.g. 'teal') |
| sort_order | integer NOT NULL | default 0 |
| archived_at | timestamptz | nullable (db/09) |
| archive_batch_id | uuid | FK archive_batches ON DELETE SET NULL (db/09) |
| created_at | timestamptz NOT NULL | |

**NO `updated_at`.** A "Birthdays" category can be found-or-created as a normal category row with `name='Birthdays'`, `parent_id=null`, a colour (e.g. `'plum'` or owner's choice). No special machinery needed.

### `archive_batches` table (db/09)

`source_type` has CHECK `('category', 'task', 'event')`. **People archiving would need this expanded** to include `'person'` (an additive CHECK extension, same pattern as db/42 hermes source tags). This goes in the same schema migration.

### Confirmed: NO existing person / contact / circle table

Searched the full migration set (db/01–42). Zero person/contact/circle/people tables or columns anywhere.

### Tables that LACK `updated_at`

**No `updated_at`:** `tasks`, `events`, `categories`, `recurrences`, `archive_batches`, `gym_workouts`, `gym_exercises`, `gym_sets`, `gym_exercise_templates`, `gym_sync_state`, `marty_actions`, `marty_pending`, `marty_category_learning`, `marty_brief`, `marty_nudges`, `telegram_saves`, `body_metrics`.

**Have `updated_at`:** `food_items`, `food_log_entries`, `recipes`, `recipe_ingredients`, `recipe_steps`, `sleep_nights`, `activity_hourly`, `focus_sessions`, `cook_session`.

**For People tables:** the `people` table and `people_interactions` (catch-up log) should have `updated_at` since they're user-editable records. Membership/link tables (`people_circles`, `people_circle_members`, `people_connections`, `people_group_members`, `people_dates`) should too, since edits (like setting/unsetting a home circle or toggling show-on-calendar) are real user actions.

---

## 2. CREATE / EDIT / SAVE Plumbing

### How the app creates a YEARLY ALL-DAY RECURRING event

The path the People module would use for a birthday:

1. **Build the recipe** — the `buildRecipe(k, v)` function in `src/desktop/recur/recipe.js` constructs a `recurrences` row from form fields. For a birthday, the People module would build it directly (not through the form):

   ```js
   const recipe = {
     target_kind: 'event',
     freq: 'yearly',
     end_kind: 'never',
     start_date: '1990-03-15',  // the birthday date (year = birth year or arbitrary)
     all_day: true,
     wall_time: null,
     timezone: 'Europe/Amsterdam',
     title: "Sarah's birthday",
     notes: null,
     category_id: birthdaysCategoryId,  // the "Birthdays" category, or null
     location: null,
   }
   ```

2. **Create + materialise** — call `createSeriesAndMaterialise(recipe)` from `src/desktop/recur/series.js`. This:
   - Inserts the `recurrences` row
   - Calls `occurrencesBetween(recipe, start_date, horizon)` from `engine.js` to get the occurrence dates
   - Inserts real `events` rows via `occurrenceRow(recipe, ymd)` — for a yearly all-day event, each occurrence gets `all_day: true`, `start_at: midnight(ymd)`, `end_at: midnight(ymd+1)`, `series_id: recipe.id`
   - Sets `generated_until` to ~365 days out
   - Returns `{ seriesId }` or `{ error }`

3. **Top-up** — `ensureGeneratedThrough(targetYMD)` in `topup.js` extends "forever" series as the user navigates ahead. The People module doesn't need to touch this — it's called automatically by the week/today fetch.

4. **Store the link** — the `people_dates` row stores the `recurrence_id` (the recipe's uuid) as a **plain value** (no FK into recurrences). The generated event's id isn't stored — the People module finds it by querying `events.series_id = recurrence_id` when needed. This avoids a fragile stored-id that breaks when the recurrence engine regenerates.

   **WAIT — the spec says "the generated event's id is stored on the date row."** I can express this, but it's fragile: the recurrence engine can regenerate events (via `editThisAndFollowing` or `deleteOccurrenceScope`), which archives the old events and creates new ones with new ids. A stored event id would go stale after any series edit. **Recommendation for the Planner:** store the `recurrence_id` (the recipe id) instead of the event id. To find the next birthday event: `SELECT id FROM events WHERE series_id = <recurrence_id> AND archived_at IS NULL ORDER BY start_at LIMIT 1`. This survives all recurrence edits. If the Planner prefers a stored event id, I can express it — but it must be updated after any recurrence mutation.

### How the FOOD MODULE writes its own tables (the pattern to mirror)

**File: `src/spine/data/foodWrite.js`** — plain Supabase insert/update/delete:
```js
export async function logEntry(row) {
  const { data, error } = await supabase.from("food_log_entries").insert(row).select(RETURN_COLS).single();
  if (error) throw new Error(error.message);
  return data;
}
```

**File: `src/spine/data/foodLoad.js`** — plain Supabase select with pagination:
```js
export function fetchEntries(start, end) {
  return fetchAll("food_log_entries", ENTRY_COLS, (q) =>
    q.gte("entry_date", start).lte("entry_date", end).order("entry_date", { ascending: true }));
}
```

**Pattern for People:**
- `src/spine/data/peopleLoad.js` — fetch people, circles, connections, interactions, dates
- `src/spine/data/peopleWrite.js` — create/update/archive people, manage circles, log interactions, manage connections/groups/dates
- `src/desktop/people/peopleLoad.js` → re-export from spine
- `src/desktop/people/peopleWrite.js` → re-export from spine

### Where hermes-write validates `{kind, data, confirmed}`

**File: `supabase/functions/hermes-write/index.ts`, line 332:**
```ts
switch (kind) {
  case "task": return await handleTask(data);
  case "event": return await handleEvent(data);
  case "food": return await handleFood(data, confirmed);
  case "weight": return await handleWeight(data);
  case "sleep": return await handleSleep(data);
  case "focus": return await handleFocus(data);
  case "undo": return await handleUndo();
  default: return fail(`unknown kind "${kind}" — …`);
}
```

**To add `people` kinds:** add new cases here (e.g. `case "person":`, `case "catchup":`, `case "connect":`). Each handler follows the same pattern:
1. Validate required fields
2. Dedup check
3. `insert()` the row with `user_id: OWNER_USER_ID`
4. `logCreate()` to `marty_actions` (undo log)
5. If undo log fails, roll back the insert
6. Return `{ ok: true, id, undo_id }`

**Confirm-gate** (line 328): `if ((kind === "weight" || kind === "sleep") && !confirmed) return fail(…, 422)`. For People, the spec says new person and new connection require `confirmed=true` — add them to the gate condition.

**Undo** works for free — `marty_actions.items[].table` is a plain string, so `"people"`, `"people_connections"`, etc. just work with the existing generic DELETE-by-id undo.

---

## 3. FETCH / RENDER on Every Surface

### A `source='people'` ALL-DAY RECURRING event in the calendar

**CONFIRMED: flows through the existing pipeline with NO new calendar code.** The path:

1. **Today** (`src/spine/data/useTodayData.js`): fetches events by overlap (`start_at < dayEnd AND end_at > dayStart`), selects `all_day`, `series_id`. An all-day birthday event is included.

2. **Calendar Week** (`src/desktop/useWeekData.js`): same overlap query. All-day events render in the `AllDayBand` component.

3. **Calendar Month** (`src/desktop/useMonthData.js`): fetches events for the month. All-day events show as month-cell items.

4. **Today's all-day strip** (`src/desktop/kit/TodayAllDay.jsx`): renders all-day events in the day's header area.

5. **The tinted block** (`src/desktop/kit/TintedBlock.jsx` / `useBlockAppearance.js`): renders the event with its category colour (the "Birthdays" category colour).

The event is a plain `events` row with `all_day=true` and a `category_id`. The render pipeline doesn't check `source`; it renders any active event it fetches. **No new code needed** for birthday events to appear on the calendar.

### The FOUR NAV TOUCH POINTS to mount "People" (after Food)

1. **NAV array** — `src/desktop/EditionHeader.jsx:19-26`: add `{ id: 'people', label: 'People' }` after the Food entry.

2. **PILLARS array** — `src/desktop/LoggedIn.jsx:24`: add `'people'` to the array so localStorage restore works.

3. **View switch** — `src/desktop/LoggedIn.jsx:91+`: add a `view === 'people'` branch:
   ```jsx
   ) : view === 'people' ? (
     <div className="cal-wrap"><PeoplePage /></div>
   ```

4. **Import** — `src/desktop/LoggedIn.jsx` top: `import PeoplePage from './people/PeoplePage'`

All four are proven by Food's addition. **No file goes over 250 lines** from these four changes (LoggedIn.jsx is 106 lines; EditionHeader.jsx is 147 lines).

---

## 4. EDIT / DELETE Mechanics

### Editing or deleting a GENERATED recurring event (birthday lifecycle)

**Editing a single occurrence** (`editThisOccurrence` in `series.js`): patches the event + sets `series_detached=true`. The People module would NOT use this path — birthday edits go through the person's date row, which updates the recurrence recipe.

**Editing the whole series** (`editWholeSeries`): updates the recipe template + all non-detached occurrences. If the People module changes a birthday title (e.g. the person's name changes), it calls this to update all generated events.

**Deleting**: `deleteOccurrenceScope` archives all occurrences + retires the recipe (sets `end_until` to before `start_date`). The People module would call this when:
- A date's show-on-calendar flag is cleared
- A date is deleted
- A person is archived

The `generated_until` is handled by the delete — it sets the recipe's end to before the start, so `topup` never regenerates. **No special cleanup needed.**

**Stored recurrence_id vs event_id (critical):** if the People module stores the `recurrence_id`, all these operations "just work" — the recurrence_id is stable across edits/regeneration. If it stores the event_id, it would need to update the stored id after every series mutation. **Strong recommendation: store `recurrence_id`.**

### Archive / soft-delete pattern for People

**The existing pattern** (`src/desktop/archive.js`):
- `archiveRows(label, sourceType, sets)` — creates an `archive_batches` row, stamps `archived_at` + `archive_batch_id` on the listed rows
- `unarchiveBatch(batchId)` — clears the stamps and deletes the batch
- `archive_batches.source_type` CHECK: currently `('category', 'task', 'event')` — **needs extending to include `'person'`**

**For People archiving:** the People module will have its own `archivePerson(id)` function that:
1. Creates an archive batch with `source_type='person'`
2. Stamps `archived_at` + `archive_batch_id` on the person row
3. If the person has a birthday recurrence → calls `deleteOccurrenceScope('all', 'event', occ)` to archive the birthday events + retire the recipe
4. The person's connections, interactions, dates, circle memberships are NOT archived separately — they stay in the DB but are hidden because the person is archived. When the person is restored, everything reappears. This mirrors the task/event pattern (archiving a task doesn't archive its subtask rows individually — the parent being archived makes the whole unit invisible).

**The `unarchiveBatch` function** currently only scans `tasks`, `events`, `categories`. It does NOT scan any module tables. **For People:** the module's own restore function would clear `archived_at` on the person row + re-create the birthday recurrence if it was present. The existing `unarchiveBatch` from the Archive screen would NOT automatically restore people — this is intentional (People archive is managed from the People screen, not the global Archive).

**Alternative:** extend `unarchiveBatch` to also scan the `people` table. This is simpler but couples the archive module to People. **Recommendation for the Planner:** keep People's archive self-contained (like Focus's `archived_at` on `focus_sessions`, which is NOT part of the global archive batch system). The person has `archived_at` for soft-delete; the archive batch is only used for birthday events (which ARE spine rows and DO flow through the global system).

---

## 5. PROPOSED SCHEMA

All tables: additive, owner-only RLS (four policies each), NO FK into the spine. Stored in **one migration file `db/43_people.sql`**, Checker-gated, committed ALONE before any src code uses it. After running: `notify pgrst, 'reload schema';`.

### Table 1: `people`

The person record. `archived_at` for soft-delete. `source` for audit trail.

```
people
  id                uuid PK default gen_random_uuid()
  user_id           uuid NOT NULL default auth.uid() FK auth.users ON DELETE CASCADE
  name              text NOT NULL
  how_you_know      text                  -- optional one-liner
  notes             text                  -- freeform plain text
  phone             text                  -- optional
  email             text                  -- optional
  other_contact     text                  -- free "other contact" line
  source            text NOT NULL default 'app' CHECK ('app', 'hermes')
  archived_at       timestamptz           -- NULL = active
  created_at        timestamptz NOT NULL default now()
  updated_at        timestamptz NOT NULL default now()
```

Indexes: `user_id`, `name` (for search). RLS: owner-only (four policies).

### Table 2: `people_circles`

Owner-defined groupings. Start blank (no seeded circles). Custom sort order.

```
people_circles
  id                uuid PK default gen_random_uuid()
  user_id           uuid NOT NULL default auth.uid() FK auth.users ON DELETE CASCADE
  name              text NOT NULL
  sort_order        integer NOT NULL default 0
  created_at        timestamptz NOT NULL default now()
  updated_at        timestamptz NOT NULL default now()
```

Indexes: `user_id`. RLS: owner-only.

### Table 3: `people_circle_members`

Person ↔ circle membership. A person can be in MANY circles. At most one "home" circle per person (the one used for directory filing).

```
people_circle_members
  id                uuid PK default gen_random_uuid()
  user_id           uuid NOT NULL default auth.uid() FK auth.users ON DELETE CASCADE
  person_id         uuid NOT NULL FK people ON DELETE CASCADE
  circle_id         uuid NOT NULL FK people_circles ON DELETE CASCADE
  is_home           boolean NOT NULL default false
  created_at        timestamptz NOT NULL default now()

  UNIQUE (person_id, circle_id)
```

**Home-circle enforcement:** application-side (when setting `is_home=true` on one membership, the app clears it on the person's other memberships in one transaction). A DB-level partial unique index could enforce "at most one home per person" but is not available on the free tier's PostgREST path cleanly — app enforcement is the same pattern used for focus sessions' "one running at a time."

Indexes: `user_id`, `person_id`, `circle_id`. RLS: owner-only.

### Table 4: `people_connections`

Mutual person-to-person links. Each connection is ONE row (not two directional rows). `person_a_id` < `person_b_id` by convention (enforced by CHECK) to prevent duplicate pairs.

```
people_connections
  id                uuid PK default gen_random_uuid()
  user_id           uuid NOT NULL default auth.uid() FK auth.users ON DELETE CASCADE
  person_a_id       uuid NOT NULL FK people ON DELETE CASCADE
  person_b_id       uuid NOT NULL FK people ON DELETE CASCADE
  label_a_to_b      text                  -- what A calls B (e.g. "parent")
  label_b_to_a      text                  -- what B calls A (e.g. "child")
  source            text NOT NULL default 'app' CHECK ('app', 'hermes')
  created_at        timestamptz NOT NULL default now()
  updated_at        timestamptz NOT NULL default now()

  CHECK (person_a_id < person_b_id)
  UNIQUE (person_a_id, person_b_id)
```

**Smart-inverse labels:** stored as TWO COLUMNS (`label_a_to_b`, `label_b_to_a`). When the user picks a directional preset (e.g. "parent"), the app sets BOTH columns at once ("parent" / "child"). When the user picks a symmetric preset or types a custom label, both columns get the same value. The app reads whichever column applies to the viewing direction.

**Why two columns, not a relationship-type + inverse map:** the inverse map approach requires a maintained lookup table (either in the DB or hardcoded in the app) and breaks for custom labels. Two stored words are simpler, more flexible, and let the user override the inverse if wanted. The presets are UI-only — the DB just stores two labels.

Indexes: `user_id`, `person_a_id`, `person_b_id`. RLS: owner-only.

### Table 5: `people_groups`

Named cliques. No per-group page in V1. Managed from the Circles & Groups screen.

```
people_groups
  id                uuid PK default gen_random_uuid()
  user_id           uuid NOT NULL default auth.uid() FK auth.users ON DELETE CASCADE
  name              text NOT NULL
  created_at        timestamptz NOT NULL default now()
  updated_at        timestamptz NOT NULL default now()
```

Indexes: `user_id`. RLS: owner-only.

### Table 6: `people_group_members`

Person ↔ group membership. Groups render VIRTUALLY — co-members are surfaced by shared group membership, NOT by materialised connection rows.

```
people_group_members
  id                uuid PK default gen_random_uuid()
  user_id           uuid NOT NULL default auth.uid() FK auth.users ON DELETE CASCADE
  person_id         uuid NOT NULL FK people ON DELETE CASCADE
  group_id          uuid NOT NULL FK people_groups ON DELETE CASCADE
  created_at        timestamptz NOT NULL default now()

  UNIQUE (person_id, group_id)
```

**Virtual rendering confirmed clean:** to show "the uni crew" on Sarah's file, the app queries `people_group_members WHERE group_id = <uni_crew_id> AND person_id != <sarah_id>`, joins to `people` for names. No individual connection rows are created. This is a simple query on a small membership table — performant for a personal-scale dataset (< 500 people, < 50 groups).

Indexes: `user_id`, `person_id`, `group_id`. RLS: owner-only.

### Table 7: `people_interactions`

The catch-up log. Dated interactions per person. Fully editable/deletable.

```
people_interactions
  id                uuid PK default gen_random_uuid()
  user_id           uuid NOT NULL default auth.uid() FK auth.users ON DELETE CASCADE
  person_id         uuid NOT NULL FK people ON DELETE CASCADE
  interaction_date  date NOT NULL
  interaction_time  time                  -- optional precise time
  channel           text NOT NULL CHECK ('in_person', 'call', 'video', 'message', 'letter', 'other')
  note              text                  -- optional
  source            text NOT NULL default 'app' CHECK ('app', 'hermes')
  created_at        timestamptz NOT NULL default now()
  updated_at        timestamptz NOT NULL default now()
```

**"Last contact" = computed on read:** `SELECT MAX(interaction_date) FROM people_interactions WHERE person_id = <id>`. No derived column stored.

Indexes: `user_id`, `person_id`, `interaction_date`. RLS: owner-only.

### Table 8: `people_dates`

Birthday (kind='birthday') + custom labelled dates. At most ONE birthday per person (app-enforced, like the home-circle rule). A date marked `show_on_calendar=true` gets a yearly all-day recurring event.

```
people_dates
  id                uuid PK default gen_random_uuid()
  user_id           uuid NOT NULL default auth.uid() FK auth.users ON DELETE CASCADE
  person_id         uuid NOT NULL FK people ON DELETE CASCADE
  kind              text NOT NULL default 'custom' CHECK ('birthday', 'custom')
  label             text                  -- e.g. "Anniversary", "Name day". NULL for birthday.
  date_value        date NOT NULL         -- the date (month-day matter; year optional — see below)
  year_known        boolean NOT NULL default true  -- if false, year is arbitrary (don't show age)
  show_on_calendar  boolean NOT NULL default false -- birthday defaults true (app-side on create)
  recurrence_id     uuid                  -- PLAIN VALUE (not FK) → the recurrences row, if calendar-shown
  created_at        timestamptz NOT NULL default now()
  updated_at        timestamptz NOT NULL default now()
```

**Why `recurrence_id` as a plain value (not FK):** the spec says "store the generated event's id as a PLAIN VALUE so a deleted spine row is 'already gone', never a cascade." The `recurrence_id` is the recipe's uuid. If the recurrence is deleted (via the recurrence engine), this column becomes a stale pointer — the code handles it as "already gone" and doesn't crash. No FK = no cascade = no blocking.

**Year-optional birthday:** when `year_known=false`, the `date_value` still stores a full date (with an arbitrary year, e.g. `1900-03-15`), but the UI only shows "15 March" and suppresses the age calculation.

**Age computation:** `person_age = current_year - date_value.year` (only when `kind='birthday' AND year_known=true`). Computed on read, never stored.

Indexes: `user_id`, `person_id`. RLS: owner-only.

### Schema touches on EXISTING tables

**1. `archive_batches.source_type`** — extend CHECK to include `'person'`:
```sql
ALTER TABLE public.archive_batches DROP CONSTRAINT IF EXISTS archive_batches_source_type_check;
ALTER TABLE public.archive_batches ADD CONSTRAINT archive_batches_source_type_check
  CHECK (source_type IN ('category', 'task', 'event', 'person'));
```
This is additive (existing values still valid), no data change, no RLS change.

**2. `source='people'` on events and tasks** — **NOT needed as a schema change.** `tasks.source` is free text with no CHECK constraint (any string is allowed). `events` has NO source column at all. Birthday events are just normal events — they don't need a source tag; the link is via `series_id` → `recurrences` → `people_dates.recurrence_id`. If a source tag is wanted later for audit, it would require adding a `source` column to events (a separate schema piece, not part of this one).

### PostgREST reload + commit discipline

The migration ends with `notify pgrst, 'reload schema';`. The whole schema is one file `db/43_people.sql`, committed ALONE (two-track rule), Checker-gated.

---

## 6. ENGINEERING RECOMMENDATIONS

### Birthday as a unified `person_dates` row vs its own fields on the person

**Recommendation: `person_dates` (unified).** Reasons:
- Keeps the person table lean (no birthday_date, birthday_year_known, birthday_show_on_calendar, birthday_recurrence_id cluttering it)
- The recurrence-event generation path is identical for birthday and custom dates — one code path, not two
- A person with no birthday simply has no `kind='birthday'` row — clean

**Trade-off:** one extra join to get the birthday when rendering the person file. Negligible on a personal-scale dataset.

### Connection labels: TWO STORED direction-words vs RELATIONSHIP-TYPE + inverse map

**Recommendation: TWO STORED WORDS (`label_a_to_b`, `label_b_to_a`).** Reasons:
- Simpler — no lookup table to maintain, no special handling for custom labels
- Flexible — the user can override either side independently
- The presets (parent/child, mentor/mentee, etc.) are UI-only: a dropdown that fills both fields at once
- Custom labels: the user types one word, it goes in both columns (symmetric by default; they can edit the other side if wanted)

**Trade-off:** slightly more storage (two text columns vs one enum), but trivially small. The alternative (a `relationship_types` table with `inverse_id` self-ref) adds a table, a FK, and complexity for custom labels — overkill for a single-user personal app.

### Groups rendered VIRTUALLY vs materialised connection rows

**Recommendation: VIRTUAL (confirmed clean and performant).** The query to surface co-members is:
```sql
SELECT p.id, p.name FROM people_group_members m
JOIN people p ON p.id = m.person_id
WHERE m.group_id = <group_id> AND m.person_id != <viewing_person_id> AND p.archived_at IS NULL
```
For a personal dataset (< 500 people, < 50 groups), this is instant. Materialising connection rows would:
- Create O(n^2) connections for an n-member group (a 10-person group = 45 connections)
- Make group membership changes explosive (add a member = insert 9 connections; remove = delete 9)
- Pollute the connection list with group-generated links that the user didn't explicitly create

**Virtual is clearly better.** No trade-off.

### The SPLIT-PANE layout

**Recommendation: a NEW kit component (`SplitPane` or `DirectoryLayout`).** No existing layout in the kit serves this purpose:
- The Planning board is drag-oriented, column-based — wrong shape
- The Calendar has a grid + tray — the tray is a drawer, not a fixed panel
- The Food page is tab-switched — no side-by-side

The new component is a simple CSS grid (`grid-template-columns: 340px 1fr` or similar) with a hairline divider, responsive (stacks on narrow screens). ~30-50 lines of JSX + CSS. Lives in `src/desktop/kit/SplitPane.jsx` + `splitPane.css`.

**Trade-off:** one new kit component (simple, well within conventions). The alternative (hand-rolling the grid in PeoplePage) would work but misses the kit's "sealed, reusable block" philosophy.

### Any library genuinely needed

**None.** No new dependencies. The feature is built with:
- React 18 (existing)
- Supabase client (existing)
- The kit components (existing + SplitPane)
- Plain CSS (existing pattern)

The "whole web" constellation view is hand-drawn SVG (circles + lines), not a graph library — a personal-scale dataset (< 500 people) doesn't need D3 or similar.

---

## 7. FILE SPLITS

### Files the nav/view work would push over ~250 lines

**None.** `LoggedIn.jsx` is 106 lines; adding a People branch adds ~3 lines. `EditionHeader.jsx` is 147 lines; adding one NAV entry adds 1 line.

**The one existing over-ceiling file:** `Today.jsx` at 509 lines is flagged in the roadmap for splitting but is NOT touched by People. No split-first commit needed for People.

### New files / feature folder

Mirror Food's structure:

```
src/desktop/people/
  PeoplePage.jsx          -- shell (the tab/view state)
  Directory.jsx           -- the left-pane directory list
  FocusPanel.jsx          -- the right-pane quick view
  PersonFile.jsx          -- the full person file page
  PersonForm.jsx          -- add/edit person form
  ConnectionWeb.jsx       -- the connection web visualisation
  ConstellationView.jsx   -- the whole-web map toggle
  CirclesManager.jsx      -- circles & groups management screen
  InteractionLog.jsx      -- catch-up history list
  DatesList.jsx           -- key dates section
  people.css              -- styles
  peopleLoad.js           -- re-export from spine
  peopleWrite.js          -- re-export from spine

src/spine/data/
  peopleLoad.js           -- fetch people, circles, connections, interactions, dates
  peopleWrite.js          -- create/update/archive people, manage circles, etc.

src/desktop/kit/
  SplitPane.jsx           -- NEW: the two-pane layout component
  splitPane.css           -- NEW: styles
```

All files will stay under ~250 lines. The largest component (PersonFile) will be split into sections (left column, right column) if it grows.

---

## 8. TRACK PER PIECE

**Confirmed piece sequence:**

| Piece | What | Scope | Checker-gated? |
|---|---|---|---|
| **D1** | Schema (`db/43_people.sql`) | DB only | **YES** — own commit, Checker-gated |
| **D2** | Data hooks + SplitPane kit component | SRC only | No |
| **D3** | Directory + Focus panel (the front page) | SRC only | No |
| **D4** | Person file page (view + edit) | SRC only | No |
| **D5** | Circles & Groups management | SRC only | No |
| **D6** | Connections + connection web | SRC only | No |
| **D7** | Catch-up log + last-contact stat | SRC only | No |
| **D8** | Key dates + birthday → calendar event lifecycle | SRC only | No |
| **D9** | Constellation (whole-web) view | SRC only | No |
| **D10** | Hermes integration (hermes-read + hermes-write + box skill) | BEYOND SRC | Known — touches edge functions + box SKILL.md + possibly config.toml verify_jwt re-pin |

**Confirmed:** D1 is the schema (Checker-gated, own commit). D2–D9 are SRC-only. D10 is the Hermes piece — BEYOND src-only (touches `supabase/functions/hermes-read/index.ts`, `supabase/functions/hermes-write/index.ts`, the box's SKILL.md files, and needs `config.toml` `verify_jwt=false` re-pinned on redeploy). This is **known and sequenced last** — not a surprise.

**No other piece is forced beyond src-only.** The birthday→calendar lifecycle (D8) uses the existing `recurrences` engine client-side — no edge function, no cron, no config.

---

## 9. CONTRADICTIONS / FRAGILITY vs the Spec

### The stored event id question (critical)

The spec says: "the generated event's id is stored on the date row (as a PLAIN VALUE) so editing the date updates the event and deleting the date / clearing the flag / ARCHIVING THE PERSON removes it."

**Problem:** the recurrence engine (`series.js`) can archive old occurrences and create new ones with new ids during `editThisAndFollowing` and `deleteOccurrenceScope`. A stored event id would go stale. **Recommendation:** store the `recurrence_id` instead. The People module can find the generated events via `events.series_id = recurrence_id`. Deleting the date → call `deleteOccurrenceScope('all', ...)` on the series to archive all generated events + retire the recipe. Editing the date → call `editWholeSeries(...)` to update all generated events. This is robust and uses the proven series edit/delete paths.

### The `archive_batches.source_type` CHECK

Current CHECK is `('category', 'task', 'event')`. The People module's archive needs `'person'` added. **This is part of the schema migration (db/43)** — an additive CHECK expansion, same pattern as db/42's hermes source tags. Confirmed expressible.

### Events have no `source` column

The spec says birthday events are "tagged `source='people'`". Events have **no `source` column**. Adding one would be a spine change. **Recommendation:** don't add a source column to events for this. The birthday event is identified by its `series_id` linking to a `recurrences` row, which links to a `people_dates` row. No source tag is needed for identification. If the Planner wants a source column on events, that's a separate schema decision (spine touch, Checker-gated, not part of db/43).

### `unarchiveBatch` only scans spine tables

The existing `unarchiveBatch` function in `archive.js` scans `tasks`, `events`, `categories` — not module tables. If a person is archived via the global archive batch system, restore won't find the person row. **Recommendation:** People archiving is self-contained (managed from the People screen, not the global Archive). The person's `archived_at` is set/cleared directly; the archive batch is only used for the birthday events (which ARE spine rows in `events`). This matches `focus_sessions` which has its own `archived_at` outside the global batch system.

### The Hermes confirm-gate for new connections

The spec says new connections require `confirmed=true`. The current confirm-gate in hermes-write is a simple condition at line 328. Adding `kind === "connect"` to the gate is trivial. The gate is server-enforced — the model cannot bypass it. Confirmed clean.

### The "Birthdays" category

The spec says birthday events go "in a 'Birthdays' category (Inbox fallback)". The People module would find-or-create this category on first birthday creation. `categories` is a spine table — inserting a row via the normal Supabase client is fine (the app already creates categories from the Settings manager). The People module doesn't ALTER the categories table — it just writes a row. No spine change.

### Calendar render: no fragility

Birthday events are plain `events` rows. They flow through the existing fetch + render pipeline. The only thing that makes them "birthday events" is the `series_id` → `recurrences` → `people_dates` chain, which is invisible to the calendar. **Confirmed no fragility.**

### Recurrence engine: no fragility for yearly all-day events

The `occurrencesBetween` function handles `freq='yearly'` via the `addMonthsYMD` stepper (step = 12 months). A yearly all-day birthday with `end_kind='never'` materialises ~1 occurrence per year, with `generated_until` ~365 days out. `topup` extends it as the user navigates. **Confirmed stable — this is the simplest possible recurrence pattern.**

---

## SUMMARY FOR THE OWNER

The codebase cleanly supports everything in the spec. The schema proposal covers eight new tables (person, circles, circle members, connections, groups, group members, interactions, dates) plus one small existing-table tweak (the archive source-type CHECK). All tables are additive, owner-only, no FK into the spine.

Two things for the Planner to rule on: (1) I recommend storing the recurrence recipe id on the date row (not the generated event id), because the recurrence engine can regenerate events with new ids — the recipe id is stable; (2) events have no `source` column, so birthday events can't be tagged `source='people'` without a spine change — I recommend skipping the tag (the birthday is identified through its series link, not a source tag).

The build is ten pieces: schema first (Checker-gated), eight src-only pieces, Hermes last (known to be beyond src-only). No surprises.

**NO CHANGES MADE — recon only.**
