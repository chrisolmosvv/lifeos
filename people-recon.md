# People / Rolodex Module — Recon Report

> Recon date: 2026-07-09. Read-only investigation. NO CHANGES MADE.

---

## 1. Repo Map & Stack

### Top-level layout

```
lifeos/
├── 00-overview.md .. 12-focus.md   # Brain docs (numbered)
├── 00-hermes-track.md              # Hermes integration track
├── hermes-recon.md                 # Prior read-path recon
├── hermes-write-recon.md           # Prior write-path recon
├── CLAUDE.md / AGENTS.md           # Build rules
├── index.html                      # Vite entry (fonts: Fraunces + Inter + UnifrakturMaguntia)
├── package.json / vite.config.js
├── .env / .env.example
├── db/                             # SQL migrations (01–42)
├── supabase/
│   ├── config.toml                 # Function deploy config (verify_jwt pins)
│   └── functions/                  # 10 edge functions (see below)
├── scripts/                        # Test/fixture scripts
├── src/
│   ├── main.jsx                    # Boot: viewport gate → mobile or desktop tree
│   ├── buildGuard.js               # Vite plugin: desktop/mobile never cross-contaminate
│   ├── spine/                      # Shared layer (both trees import from here)
│   │   ├── theme/theme.css         # Design tokens
│   │   ├── data/                   # Supabase client, data hooks, writes
│   │   └── logic/                  # Pure calc/format helpers
│   ├── desktop/                    # Desktop tree (logged-in shell, views, kit)
│   │   ├── App.jsx → Login/LoggedIn
│   │   ├── kit/                    # ~65 reusable components + CSS
│   │   ├── food/ focus/ health/ gym/ recur/  # Feature folders
│   │   └── [top-level views]       # Today, Planning, Calendar, Settings, etc.
│   └── mobile/                     # Mobile tree (separate shell, tab bar)
│       ├── App.jsx → MobileShell
│       └── Mobile*.jsx             # Phone screens
├── mockups/                        # Design reference images
└── dist/                           # Build output
```

### Versions

| Dep | Version |
|---|---|
| React | ^18.3.1 |
| react-dom | ^18.3.1 |
| Vite | ^5.4.2 |
| @vitejs/plugin-react | ^4.3.1 |
| @supabase/supabase-js | ^2.108.2 |
| Edge functions runtime | Deno 2 (config.toml `deno_version = 2`) |
| Node / package manager | npm (package-lock.json present) |

### How the app is run / built / deployed

- `npm run dev` → Vite dev server
- `npm run build` → Vite production build → `dist/`
- Hosted on **Vercel** (no vercel.json found — uses Vite defaults)
- Edge functions deployed via `supabase functions deploy <name>` with `--no-verify-jwt` where needed (pinned in `config.toml`)
- **Env var names** (names only): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

---

## 2. App Shell, Navigation & Routing — the Food Precedent

### How the logged-in app switches between sections

**File: `src/main.jsx`** — viewport gate at boot:
```js
const isMobile = window.matchMedia('(max-width: 860px)').matches;
(isMobile ? import('./mobile/App.jsx') : import('./desktop/App.jsx'))
```
Locked at load — no resize listener swaps trees. Each tree is a separate React tree with its own shell.

**File: `src/desktop/App.jsx`** — auth check → `<LoggedIn email={…} />`.

**File: `src/desktop/LoggedIn.jsx`** — the logged-in shell. **State-based** view switching (NOT a router). A `view` string (`useState`) selects the current screen. Persisted to `localStorage` key `lifeos.view` (shallow — only the pillar, not sub-views).

```js
const PILLARS = ['today', 'focus', 'planning', 'archive', 'calendar', 'health', 'food', 'settings']
```

The view is set by `setView(v)` called from `EditionHeader`'s nav buttons.

### How Food was added (the template People will copy)

1. **Nav entry** — `src/desktop/EditionHeader.jsx:19-26`:
   ```js
   const NAV = [
     { id: 'today', label: 'Today' },
     { id: 'focus', label: 'Focus' },
     { id: 'calendar', label: 'Calendar' },
     { id: 'health', label: 'Health' },
     { id: 'food', label: 'Food' },
     { id: 'settings', label: 'Settings' },
   ]
   ```

2. **Active-state mark** — `src/desktop/editionHeader.css:91-93`:
   ```css
   .mast-nav button.is-active {
     color: var(--accent);          /* terracotta */
     border-bottom-color: var(--accent);
   }
   ```
   The `is-active` class is set by `item.id === view ? 'is-active' : ''`.

3. **View mount** — `src/desktop/LoggedIn.jsx:91-93`:
   ```jsx
   ) : view === 'food' ? (
     <div className="cal-wrap">
       <FoodPage stageRecipeId={…} … />
     </div>
   ```

4. **The view component** — `src/desktop/food/FoodPage.jsx` (46 lines): a shell with Log/Cookbook tab state.

5. **PILLARS array** — `LoggedIn.jsx:24`: Food is listed so localStorage restore works.

**To add People:** add `{ id: 'people', label: 'People' }` to NAV, add `'people'` to PILLARS, add a `view === 'people'` branch in LoggedIn's JSX, import and mount `PeoplePage`. That's the entire wiring — four touch points.

### The masthead / nav component

**`EditionHeader.jsx`** (147 lines) — renders three sections:
- Top row: dateline (left) · wordmark (centre) · edition mark (right)
- Nav band: centred buttons, `is-active` class → terracotta underline
- Running-session markers (focus + cook): absolute-positioned right of nav

The nav band is ruled top and bottom (`border-top/bottom: 1px solid var(--rule)`). Gap between items: `2.8rem`. Font: Inter, `0.72rem`, uppercase, `letter-spacing: 0.16em`.

---

## 3. Component Kit Inventory (`src/desktop/kit/`)

### Every exported primitive

| Component | Lines | Purpose | Reusable for People? |
|---|---|---|---|
| **Masthead** | 8 | Blackletter "LifeOS" wordmark | No (shared header) |
| **Folio** | 33 | Date · motto · clock · edition line | No (shared header) |
| **Topline** | 8 | Thin uppercase line above nameplate | Possible section label |
| **SmallCapsLabel** | 8 | Quiet uppercase section label ("kicker") | **YES — section/group labels** |
| **HairlineRule** | 8 | Thin rule separator (faint variant available) | **YES — list dividers** |
| **Toast** | 24 | "Deleted · Undo" auto-dismiss message | **YES — feedback** |
| **Popover** | 74 | Anchored overlay, sheet on narrow screens | **YES — person detail popover or quick view** |
| **ModuleHeader** | 13 | Small-caps kicker + hairline rule combo | **YES — section headers** |
| **HubCard** | 17 | Generic card shell (label + headline + children) | **YES — person cards** |
| **Skeleton** | 19 | Pulsing placeholder while loading | **YES — loading state** |
| **QuickAddInput** | 51 | One-line capture box (type + Enter) | **YES — "Find anyone" search input** |
| **ItemForm** | 246 | Shared create/edit form (task/event) | Template for person edit form |
| **CategoryPicker** | ~50 | Drill-in category chooser | Template for relationship/circle picker |
| **CategoryTag** | ~20 | Coloured dot + name tag | **YES — circle/relationship tag** |
| **TodayRow** | 117 | Converged task line (title + meta + status) | Template for person row |
| **TodayTaskRow** | 106 | Older task row (Planning/subtasks) | Not needed |
| **StatusCycle** | 58 | Cycling status control (open→in_progress→done) | Not needed |
| **StatusPill** | 37 | 3-segment status pill | Not needed |
| **TintedBlock** | 80 | Calendar grid block (tinted, titled) | Not needed |
| **WeekGrid** | 185 | The 24h calendar grid | Not needed |
| **WeekColumn** | 113 | Single day column in the grid | Not needed |
| **DayGrid** | ~60 | Today's 7am–midnight grid | Not needed |
| **AllDayBand** | ~40 | All-day event strip | Not needed |
| **TodayAllDay** | 32 | Today's all-day strip | Not needed |
| **TrayDrawer** | 85 | Slide-out drawer for unscheduled tasks | **MAYBE — connection list drawer** |
| **TriagePopover** | 49 | Quick-triage popover | Not needed |
| **MonthView** | ~60 | Month calendar grid | Not needed |
| **MonthCell** | ~40 | Single month cell | Not needed |
| **Breadcrumb** | ~20 | Category breadcrumb trail | **YES — navigation breadcrumb** |
| **RangeSwitcher** | 23 | Segmented tab control (7d/30d/90d) | **YES — "All / Favourites / Circle" filter** |
| **InlineError** | ~15 | Error display | **YES** |
| **ClimbChart** | ~50 | SVG line chart | Possible for "last seen" trend |
| **SubtaskList** | 81 | Subtask list with add row | Template for linked-people list |
| **RepeatField** | 90 | Recurrence picker | Not needed |
| **SeriesScopePrompt** | 22 | "This one / all" scope dialog | Not needed |
| **FocusSection** | ~40 | Focus integration in task form | Not needed |
| **PlanningBoard/Card/Column/Group/Category/Time/Modes** | ~450 total | Planning board components | Not needed |
| **Sleep*/Body*/Health*/Gym*/Walking*/Hypnogram/HevyStatus** | ~800 total | Health-specific visualisations | Not needed |
| **SessionExercise** | 72 | Gym exercise detail | Not needed |

### Hooks

| Hook | Purpose | Reusable? |
|---|---|---|
| **useGridDrag** | 250 lines, grid drag-and-drop | No |
| **useBandDrag** | 122 lines, all-day band drag | No |
| **useBlockAppearance** | 65 lines, block colour/style | No |
| **useSwipe** | 68 lines, touch swipe detection | **YES — mobile swipe navigation** |

### Type & spacing conventions

- **Fraunces** (serif): headlines, titles, large numbers (dial, elapsed clock)
- **Inter** (sans): body, UI, labels, nav, buttons
- **UnifrakturMaguntia** (blackletter): "LifeOS" wordmark only
- **Tabular numerals**: `.tnum` class for aligning numbers
- **Small-caps labels**: `SmallCapsLabel` component, Inter 500, `0.68rem`, uppercase, `letter-spacing: 0.1em`, `var(--ink-muted)`

---

## 4. Design Tokens

From `src/spine/theme/theme.css`:

```css
:root {
  /* Paper & ink — the warm broadsheet palette */
  --paper:      #F6F5F1;   /* cooler near-white background */
  --ink:        #1C1916;   /* soft near-black body text */
  --ink-muted:  #5C564C;   /* secondary text, labels, datelines */
  --rule:       #D8D0BE;   /* hairline divider */
  --rule-faint: #E7E0D0;   /* even fainter line for calendar grid */
  --accent:     #C8643D;   /* warm terracotta — today, the now-line */
  --overdue:    #A85C44;   /* brick — overdue/late marks */

  /* Type */
  --font-serif: 'Fraunces', Georgia, 'Times New Roman', serif;
  --font-sans:  'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-black: 'UnifrakturMaguntia', 'UnifrakturCook', Georgia, serif;
}
```

**Category palette** (from `src/spine/logic/palette.js`): 16 colours stored by id (e.g. `'teal'`), not hex. 12 core + 4 shades. The DB stores the id; hex is resolved at render time. Inbox default: `slate` (`#6B7280`).

**Dark-mode scaffolding**: commented-out `@media (prefers-color-scheme: dark)` block with tuned values. Not active.

---

## 5. Supabase Data Layer

### Where the client is created

**`src/spine/data/supabaseClient.js`**:
```js
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Data-hook pattern

- **Spine data layer** (`src/spine/data/`): shared fetch/write modules imported by both trees
  - `foodLoad.js`, `foodWrite.js`, `healthLoad.js`, `recipeLoad.js`, `recipeWrite.js`, `gymLoad.js`
  - React hooks: `useTodayData`, `useFoodDay`, `useFoodRange`, `useHealthData`, `useCookbook`, etc.
- **Desktop re-exports** (e.g. `src/desktop/food/foodLoad.js` = `export * from '../../spine/data/foodLoad.js'`)
- **Per-feature files** (not a single data hook): each module has its own load + write pair

### Representative READ (`src/spine/data/useTodayData.js`):
```js
const [taskRes, catRes, evRes] = await Promise.all([
  activeOnly(supabase.from('tasks').select('id, title, …').order('created_at', { ascending: true })),
  activeOnly(supabase.from('categories').select('id, name, …').order('sort_order', …)),
  activeOnly(supabase.from('events').select('id, title, …').lt('start_at', dayEnd).gt('end_at', dayStart)),
])
```

### Representative WRITE (`src/spine/data/foodWrite.js`):
```js
export async function logEntry(row) {
  const { data, error } = await supabase.from("food_log_entries").insert(row).select(RETURN_COLS).single();
  if (error) throw new Error(error.message);
  return data;
}
```

### RLS pattern

Every table has the **same four policies** (`src` confirmed in every migration file):
```sql
create policy "Owner can read own <table>"   on public.<table> for select using (auth.uid() = user_id);
create policy "Owner can insert own <table>"  on public.<table> for insert with check (auth.uid() = user_id);
create policy "Owner can update own <table>"  on public.<table> for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Owner can delete own <table>"  on public.<table> for delete using (auth.uid() = user_id);
```
**People tables must follow this exact pattern.**

### Migration workflow

- Migrations live in `db/NN_name.sql` (01–42 currently)
- Numbered sequentially, applied manually in the Supabase SQL editor (paste and Run)
- After any schema change: `notify pgrst, 'reload schema';` (PostgREST schema-cache reload)
- **Two-track commit rule**: src and db never in one commit (schema in its own commit, src in another)
- **Checker gate**: schema changes require a "checker approved" pass before applying. The checker reviews the SQL for spine safety, RLS, additivity. **This gate bent twice during Hermes** (noted as tech debt in `00-hermes-track.md`).
- **Next migration number: 43**

### Full table inventory

**SPINE (core — never modified by modules):**

| Table | Key Columns | Module |
|---|---|---|
| `categories` | id, user_id, name, parent_id, color, sort_order, archived_at, archive_batch_id | Core |
| `tasks` | id, user_id, title, notes, category_id, parent_task_id, priority, time_bucket, due_date, scheduled_start/end, status, completed_at, **source** (free text, default 'typed by me'), series_id, series_detached, archived_at, archive_batch_id | Core |
| `events` | id, user_id, title, notes, category_id, start_at, end_at, location, repeat_rule (dormant), external_id (hidden), all_day, series_id, series_detached, archived_at, archive_batch_id | Core |

**RECURRENCES (additive, linked from spine):**

| Table | Key Columns | Module |
|---|---|---|
| `recurrences` | id, user_id, target_kind, freq, weekdays, end_kind/count/until, start_date, wall_time, duration_minutes, timezone, title, notes, category_id, location, all_day, time_bucket, generated_until, split_parent_id | Repeat |

**MARTY / BOT:**

| Table | Purpose |
|---|---|
| `telegram_saves` | Superseded undo log (no longer written) |
| `marty_actions` | Generalised undo log (kind: create/edit/delete, items jsonb) |
| `marty_pending` | Half-finished capture scratchpad |
| `marty_category_learning` | Category correction log |
| `marty_brief` | Numbered brief action map |
| `marty_nudges` | Daytime nudge scheduling state |

**ARCHIVE:**

| Table | Purpose |
|---|---|
| `archive_batches` | One row per delete action (label, source_type, created_at) |

**GYM:**

| Table | Purpose |
|---|---|
| `gym_workouts` | Hevy cache (hevy_id required, NOT NULL) |
| `gym_exercises` | Per-workout exercises |
| `gym_sets` | Per-exercise sets |
| `gym_exercise_templates` | Exercise template library |
| `gym_sync_state` | Hevy sync cursor |

**HEALTH:**

| Table | Purpose |
|---|---|
| `sleep_nights` | Nightly sleep data (unique: user_id, night_date) |
| `body_metrics` | Weight/body fat etc. (unique: user_id, metric_type, reading_at, source) |
| `health_goals` | Targets for sleep/weight/focus/nutrition |
| `activity_hourly` | Steps/energy/HR by hour |

**FOOD (F-track):**

| Table | Purpose |
|---|---|
| `food_items` | Food library / resolved-DB cache |
| `food_log_entries` | Daily food log with macro snapshots |
| `recipes` | Saved recipes |
| `recipe_ingredients` | Per-recipe ingredients |
| `recipe_steps` | Per-recipe steps |
| `cook_session` | Active cook session header |
| `cook_event` | Append-only cook event log |

**FOCUS:**

| Table | Purpose |
|---|---|
| `focus_sessions` | Focus timer sessions |

### Module table pattern confirmed

Every module table follows: **additive, owner-RLS, NO foreign key into the spine** (ids stored as plain values or soft refs — `focus_sessions.task_id` is a plain uuid, no FK). A People link table connecting two people rows (both within the module) is fully consistent with this precedent — it's an intra-module FK, exactly like `recipe_ingredients.food_item_id → food_items`.

---

## 6. Feeding the Spine — Birthdays / Dates

### The `source`-tag mechanism

**`tasks.source`** — free text column, nullable, default `'typed by me'`. No CHECK constraint. Values in use: `'typed by me'` (app), `'telegram'` (old Marty), `'hermes'` (new Hermes). **Any module can write tasks with its own source tag.** MATCHES the architecture doc ("future modules write tasks with their own source").

**`events`** — **NO source column.** Events don't track origin.
DIVERGES: the architecture doc says "every task carries an optional source" but implies events would too. The code only has it on tasks.

### Does any existing module actually create tasks or events?

**YES.** The `telegram` function creates tasks (source='telegram') and events. The `hermes-write` function creates both (source='hermes' on tasks; events have no source column). The `recurrences` engine generates both from repeat recipes. So the mechanism is proven and in active use.

### How birthdays would work

**`events.all_day`** (boolean, db/10) — when true, start/end carry dates at local midnight, end-exclusive. Renders in the all-day band / month strip.

**`recurrences`** (db/37) — supports `freq: 'yearly'`, `all_day: true`, `target_kind: 'event'`. A birthday would be:
```sql
INSERT INTO recurrences (user_id, target_kind, freq, end_kind, start_date, all_day, title, category_id, timezone)
VALUES ('<OWNER>', 'event', 'yearly', 'never', '1990-03-15', true, 'Sarah''s birthday', null, 'Europe/Amsterdam');
```

The app's recurrence engine (`src/desktop/recur/engine.js`) generates real event rows from the recipe, so the birthday shows up in the calendar/Today automatically. **`generated_until`** tracks how far ahead occurrences are materialised; the app tops up on each view render (`topup.js`).

**The write path for a module creating a birthday recurrence:**
1. Insert a `recurrences` row (the recipe)
2. Call the `topup` engine to generate the first occurrence(s)
3. The generated events are ordinary `events` rows with `series_id` pointing to the recurrence

No spine change needed. RLS applies. The People module would own the person→recurrence link (store `recurrence_id` on the person row or a join table).

---

## 7. Marty → Hermes — "Input via Marty"

### Current state

**Old serverless Marty** (`telegram` + `brief` edge functions): **parked, not deleted**. Still deployed but Telegram delivery may have been redirected to Hermes (the cutover/webhook state is flagged as unverified — tidy-up #4 in `00-hermes-track.md`).

**Hermes** is the live bot. Running on the VPS (Hetzner CX23, `46.225.81.162`), powered by ChatGPT subscription via Codex bridge. Telegram delivery: **likely polling** (Hermes Agent uses polling by default; the webhook state is unverified).

### `hermes-read` — the full-life snapshot

**File: `supabase/functions/hermes-read/index.ts`** (215 lines)

- Auth: `X-Hermes-Secret` header, constant-time compare
- `verify_jwt = false` (pinned in config.toml)
- Returns a JSON snapshot: `{ ok, snapshot_date, window, categories, tasks, events, food_log, sleep, body, activity, focus, gym_workouts, health_goals }`
- `days` param: 1–90 (default 7)
- Per-table caps: tasks 500, events 200, categories 100, food_log 500, sleep 90, body 500, activity 90 days (daily aggregated), focus 200, gym 100, health_goals 50
- **People is NOT in it.** No people/person/contact table exists to read.

### `hermes-write` — the typed write door

**File: `supabase/functions/hermes-write/index.ts`** (343 lines)

- Auth: `X-Hermes-Write-Secret` header (separate from read)
- `verify_jwt = false` (pinned in config.toml)
- Contract: `{ kind, data, confirmed? }`
- **Kinds/domains today:** `task`, `event`, `food`, `weight`, `sleep`, `focus`, `undo`
- **Confirm-gate (server-enforced):** weight/sleep always require `confirmed=true`; food with `is_estimated=true` requires it. Task, event, explicit food, focus log directly.
- **Source tags:** task source='hermes', food entry_source='hermes', focus source='hermes', body/sleep source='hermes'
- **Dedup:** upsert for body/sleep (natural keys); check-before-insert (2-minute window) for task/event/food/focus
- **Undo:** logs to `marty_actions` with `kind:'create'`; the generic undo reverses by DELETE-from-`table`-by-id. `kind:"undo"` reverses the most recent hermes-write action.

### What it would take to add a `people` domain

1. **Add a handler** in `hermes-write/index.ts`: a new `case "people":` in the switch (line 332). The handler would validate the person fields, insert into the new `people` table, log to `marty_actions`, return `{ ok, id, undo_id }`.

2. **No source-tag schema touch needed** — a `people` table would be a brand-new table with its own columns; no CHECK constraint to expand.

3. **Undo works for free** — `marty_actions.items[].table` is a plain string; `"people"` just works with the existing generic undo code.

4. **Add to `hermes-read`** — add a `people` select to the parallel Promise.all in `hermes-read/index.ts`, return it in the snapshot.

5. **Validation** — the handler would enforce required fields (name, etc.) and optional fields (relationship, circle, notes).

### Box skills (`read-lifeos` / `write-lifeos` SKILL.md)

Located on the VPS at `/root/.hermes/skills/lifeos/read-lifeos/SKILL.md` and `write-lifeos/SKILL.md` (per `00-hermes-track.md:235-236`). These files are **on the box, not in this repo** — they describe the available domains to the agent. A people domain would need a new section added to both SKILL.md files (describing what people data is available and how to write it).

### In-app Marty parity

**NOT built.** Listed as horizon item #4 in `00-hermes-track.md:250`: "In-app parity — Marty present inside the LifeOS web app, not just Telegram." No code for it exists.

---

## 8. Mobile & Responsive — the Real Current State

### Entry point

**`src/main.jsx`** — viewport gate at boot:
```js
const isMobile = window.matchMedia('(max-width: 860px)').matches;
```
Loads exactly one tree. **Locked at boot — no resize swapping.** A `buildGuard.js` Vite plugin fails the build if desktop and mobile trees cross-contaminate (JS only; CSS excluded). Both trees import from `src/spine/` (shared).

### The mobile shell

**`src/mobile/App.jsx`** (119 lines) — `MobileShell`:
- Own login form (inline, not shared with desktop)
- `MobileMasthead` (compact: date ears + "LifeOS" nameplate)
- `MobileTabBar` (bottom nav): Today, Health, [+Capture], Food, More
- Tab state: `activeTab` string, same pattern as desktop's `view`

### Real mobile screens

| Tab | Component | Real treatment? |
|---|---|---|
| Today | `MobileToday` | **YES** — full mobile today grid + task sheets |
| Health | `MobileHealth` → `MobileHealthBody` / `MobileHealthGym` / `MobileHealthSleep` | **YES** |
| Capture | `MobileCapture` → `MobileTaskCapture` / `MobileEventCapture` / `MobileFoodCapture` / `MobileNoteCapture` | **YES** — full capture router |
| Food | `MobileFood` → `MobileFoodLog` / `MobileFoodRange` / `MobileCookbook` / `MobileRecipe` / `MobileCook` / `MobileFinder` / `MobileImport` | **YES** |
| More | `<Placeholder label="More" />` | **NO — placeholder ("coming soon")** |
| Calendar | `DayAgenda` (desktop tree, shown on desktop's phone breakpoint) | Partial — day view only |
| Focus | Not in mobile tab bar | **NO mobile screen** |
| Planning | Not in mobile tab bar | **NO mobile screen** |
| Settings | Not in mobile tab bar | **NO mobile screen** |

### What a People mobile screen would plug into

The mobile shell has a **`more` tab** that's currently a placeholder. People could either:
- Replace / live under the `More` tab
- Get its own tab (would require rearranging the 5-tab bar — already full)
- Be a sub-screen reachable from `More` (a mini-nav inside More)

The mobile shell already supports tab switching with `selectTab(tab)`. Adding a new screen follows the same `activeTab === 'people'` pattern.

### PWA / install setup

**No PWA setup found.** No `manifest.json`, no service worker, no workbox config. The architecture doc says "installs to phone + desktop (PWA)" — **DIVERGES: no PWA is configured.** The app is a plain web app accessed via the browser. (The owner may have added it to home screen as a browser shortcut, which works without a manifest on iOS/Android but doesn't provide offline or install prompts.)

---

## 9. Global Search / Command Surface

**No app-wide search or command palette exists.** Search is per-feature:
- **Food:** `Finder.jsx` (the food-search component) — a search input + results panel that calls the `food-search` Edge Function
- **Today:** `QuickAddInput` — a capture box, not a search
- **No global "Find anyone"** surface

The `QuickAddInput` component (`src/desktop/kit/QuickAddInput.jsx`, 51 lines) is a good template for a people search input — it's a single-line input with Enter-to-submit, already in the kit. The food `Finder` (`src/desktop/food/finder/Finder.jsx`) is a fuller search-with-results pattern.

---

## 10. Any Existing "Person" / Contact Concept

**NONE.** Searched the entire codebase for: `person`, `contact`, `attendee`, `guest`, `friend`, `rolodex`, `people`. Zero matches in code files (only "personal" in comments referring to the personal edition / personal cookbook).

- Events have **no attendee field**
- Recipes/cook sessions have **no "cook for" or "serves who" field**
- No contact table, no name-linked entity anywhere
- The word "people" appears only in `00-overview.md:19` ("Life — finances, people rolodex") as a future pillar

**This is a clean slate.** No existing concept to collide with.

---

## 11. Conventions & House Rules in Practice

### The ~250-line file ceiling

**Mostly honoured.** Only one file exceeds 250 lines in JSX/JS:
- `src/desktop/Today.jsx` — **509 lines** (flagged in the roadmap as needing componentisation: "componentise its render")

Several CSS files exceed 250 lines (e.g. `sleepPage.css` 846, `todayForm.css` 480, `todayKit.css` 483) — CSS files seem exempt from the ceiling in practice.

### How big features are split

**Feature folders** — each major module gets its own folder:
- `src/desktop/food/` — 40+ files (components, CSS, data hooks, logic)
- `src/desktop/focus/` — 25+ files
- `src/desktop/health/` — 15+ files
- `src/desktop/gym/` — 3 files
- `src/desktop/recur/` — 5 files
- `src/desktop/kit/` — ~65 files (the shared component library)

### Food module end-to-end (worked example)

**Folder: `src/desktop/food/`** (40+ files, total ~2700 lines of JSX/JS)

**Components** (the views):
- `FoodPage.jsx` (46 lines) — shell, Log/Cookbook tab toggle
- `LogPage.jsx` (211 lines) — the food log day view
- `Cookbook.jsx` (73 lines) — recipe grid/list
- `CookbookRegister.jsx` (168 lines) — the recipe register (grid view)
- `RecipeOverview.jsx` (126 lines) — single recipe view
- `RecipeEditor.jsx` (248 lines) — recipe editor
- `EditorSteps.jsx` (108 lines) — step editor (split from RecipeEditor)
- `CookCompanion.jsx` (172 lines) — live cook mode
- Plus ~15 more smaller components (DayView, MealLedger, LogMealSheet, ManualForm, etc.)

**Data hooks** (re-export from spine):
- `foodLoad.js` → `../../spine/data/foodLoad.js` (fetch entries, search, names)
- `foodWrite.js` → `../../spine/data/foodWrite.js` (log/update/remove entries, cache foods)
- `recipeLoad.js` → `../../spine/data/recipeLoad.js`
- `recipeWrite.js` → `../../spine/data/recipeWrite.js`
- `useFoodWrites.js` → `../../spine/data/useFoodWrites.js` (React hook wrapping writes)
- `useCookEvents.js`, `useCookLog.js`, `useRecipeWrites.js` — same pattern

**Tables** (5 core + 2 cook):
- `food_items`, `food_log_entries`, `recipes`, `recipe_ingredients`, `recipe_steps` (db/28)
- `cook_session`, `cook_event` (db/34, db/39)

**Edge functions** (3):
- `food-search` — search OFF/USDA/saved foods (JWT-authed)
- `meal-estimate` — AI meal macro estimation (JWT-authed)
- `recipe-import` — AI recipe import from URL/text (JWT-authed)

**Pattern for People:** Create `src/desktop/people/` with a `PeoplePage.jsx` shell, a directory component, a person detail view, data hooks in `src/spine/data/` (peopleLoad.js, peopleWrite.js), and a new `db/43_people.sql` migration. No edge function needed for V1.

### Naming conventions

| Entity | Convention | Example |
|---|---|---|
| Tables | snake_case, plural | `food_log_entries`, `gym_workouts` |
| Columns | snake_case | `entry_date`, `metric_type`, `user_id` |
| Components | PascalCase | `FoodPage`, `CookCompanion`, `TodayRow` |
| Component files | PascalCase.jsx | `FoodPage.jsx`, `RecipeEditor.jsx` |
| Logic/data files | camelCase.js | `foodLoad.js`, `recipeCalc.js` |
| CSS files | camelCase.css | `foodLog.css`, `todayKit.css` |
| CSS classes | kebab-case with prefixes | `tk-`, `kit-`, `food-`, `hub-`, `pop-` |
| Edge functions | kebab-case folders | `hermes-read`, `food-search` |
| Migrations | NN_snake_case.sql | `28_food_tables.sql`, `42_hermes_source_tags.sql` |

---

## 12. Surprises, Risks, Drift

### Divergences from brain docs

1. **DIVERGES: No PWA.** Architecture doc says "installs to phone + desktop (PWA)". No manifest.json or service worker exists. The app is a plain web app.

2. **DIVERGES: Events have no source column.** Architecture doc implies all spine items carry a source. Only tasks have it. Events created by Hermes or Telegram have no source tag.

3. **DIVERGES: Brain docs location.** Architecture doc references `brain/` directory. Brain docs are at repo root as numbered files (`00-overview.md`, etc.).

4. **DIVERGES: `Today.jsx` is 509 lines** — well over the 250-line ceiling. Flagged in roadmap but not yet split.

5. **DIVERGES: `activity_log` never built.** Architecture doc describes an `activity_log` table for quiet signal capture. No such table exists in any migration. (May be superseded by `focus_sessions` + the Hermes data.)

### Risks for People

1. **Nav bar space.** Desktop nav has 6 items. Adding People makes 7. On narrow desktop (768px breakpoint), the nav uses `space-between` with smaller text — 7 items should fit but needs visual verification.

2. **Mobile tab bar is full.** 5 tabs (Today, Health, +, Food, More). People must go under "More" or displace something. The More tab is a placeholder today.

3. **No two-pane layout primitive in the kit.** The "Directory + Focus" front page (searchable list left, detail right) has no existing split-pane component. The closest is the Planning board's column layout, but it's drag-oriented. A new `PeopleLayout` component would be needed — straightforward but new.

4. **Link table is a new pattern.** No existing module has an intra-module many-to-many link table (person↔person). The closest is `recipe_ingredients` (recipe↔food_item, one-to-many with its own columns). A `people_links` table with `person_a_id`, `person_b_id`, `link_type` is consistent with precedent (intra-module FK, owner-RLS, additive) but is the first bidirectional link.

5. **Freeform notes body.** No existing table has a large freeform text field beyond `tasks.notes` / `events.notes` (short text). A `people.notes` column (or a separate `people_notes` table for structured sections) is fine technically but may want a richer editor than the current plain `<textarea>`.

6. **Checker gate discipline.** The gate bent twice during Hermes. The People schema will need a proper Checker pass before applying.

### Tech debt in the relevant areas

- `Today.jsx` at 509 lines needs splitting before People adds any interaction with it
- Several CSS files over 250 lines (`todayKit.css` 483, `todayForm.css` 480) — not blocking but growing
- The old `telegram_saves` table is still in the DB (never read/written; cleanup deferred)
- Cutover state (old Marty vs Hermes webhook) is unverified

---

## Summary for the Owner

**Ground truth:** The codebase is clean and well-organised for adding People. Adding a new top-level section requires touching exactly four places (nav array, pillars array, view switch, component import) — the same pattern Food followed. Every module table follows the same additive/owner-RLS/no-spine-FK pattern, and a person-to-person link table fits that precedent. There's no existing person/contact concept anywhere in the code, so it's a clean build with zero collision risk.

**Two things to watch:** (1) the mobile tab bar is already full at 5 tabs, so People needs to live under "More" or the bar needs redesigning; (2) the "Directory + Focus" split-pane layout is a new UI pattern that doesn't exist in the kit yet — it'll need a fresh component, but the building blocks (search input, list rows, popovers, hairlines) are all there.

**NO CHANGES MADE — recon only.**
