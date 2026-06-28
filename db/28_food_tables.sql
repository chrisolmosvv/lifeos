-- LifeOS — Food: Cookbook & Nutrition tables (Track F, F1: the five tables).
--
-- WHAT THIS IS (plain English): the storage for the new Food pillar (the first pillar
-- outside Health). FIVE brand-new tables, each owner-only. The app READS them (the logger,
-- the cookbook) and WRITES them (logging food, saving recipes, cooking). This is its OWN
-- module's storage — it ADDS tables and never changes the task/event/category spine.
--   1) food_items         — the food library / resolved-DB cache (per-100g macros).
--   2) food_log_entries   — one row per logged item (the day ledger); carries a macro
--                           SNAPSHOT + the lite alcohol flag. No separate drinks table.
--   3) recipes            — one row per recipe (title, servings, times).
--   4) recipe_ingredients — a recipe's structured ingredients (intra-module FK).
--   5) recipe_steps       — a recipe's ordered steps + optional timers (intra-module FK).
--
-- Nutrition GOALS reuse the existing health_goals log (free-text goal_type: calories /
-- protein / carbs / fat) — NO goals table here. FAVOURITES are a flag on food_items;
-- RECENTS are derived from food_log_entries — NO recents table. (See 11-food-nutrition.md.)
--
-- FOR THE CHECKER — this is a schema change; please confirm these four at a glance:
--   1) ADDITIVE — five brand-new tables; NOTHING about tasks/events/categories is altered
--      (no ALTER/DROP/RENAME on the spine anywhere in this file).
--   2) NO foreign key into the spine — the ONLY references are (a) user_id → auth.users
--      (ownership, the same anti-spoof pattern as gym_*/health), and (b) INTRA-MODULE FKs
--      within Food: food_log_entries.food_item_id → food_items, food_log_entries.recipe_id
--      → recipes, recipe_ingredients.{recipe_id → recipes, food_item_id → food_items},
--      recipe_steps.recipe_id → recipes. `source`, `meal_slot`, `entry_source`, `unit` are
--      PLAIN values (CHECK-constrained where closed), never a tasks/events/categories id.
--   3) Owner-only RLS is ON for ALL FIVE — the four owner policies per table below
--      (select/insert/update/delete, auth.uid() = user_id), exactly like gym_*/health_*.
--   4) INTRA-MODULE FKs only, matching the spec: recipe children CASCADE from their recipe;
--      the two food_item_id refs + food_log_entries.recipe_id are SET NULL on delete (a
--      logged entry survives its source food/recipe being removed — its macro SNAPSHOT is
--      already stored, so history is never rewritten).
--
-- ONE DELIBERATE EXCEPTION to "compute on read": the snapshot columns on food_log_entries
-- (kcal/protein/carbs/fat/fibre/sugar/sodium) are REAL STORED columns — copied at write
-- time — NOT a view or a generated column, because what was actually eaten must not change
-- when a food's DB numbers or a recipe later change. This is the spec's stated exception.
--
-- Run this in the Supabase SQL editor (Frankfurt project cntlptuacsujbdtwvbis) AFTER the
-- earlier db/ files. You should see "Success. No rows returned." THEN run
--   notify pgrst, 'reload schema';
-- so PostgREST picks up the new tables/columns before any write.

-- 1) food_items — the food library / resolved-DB cache (per-100g macros) -----------------
create table if not exists public.food_items (
  id            uuid        primary key default gen_random_uuid(),

  -- Owner reference (same anti-spoof pattern as the spine). Owner gone → their data too.
  user_id       uuid        not null default auth.uid()
                            references auth.users (id) on delete cascade,

  name          text        not null,
  brand         text,

  -- Where this item came from. A cached API row keeps its source + ref so the same food is
  -- one stable row; 'manual' is an owner-typed food (source_ref null).
  source        text        not null check (source in ('off', 'usda', 'manual')),
  source_ref    text,

  -- Per-100g (or per-unit) macros — the storage basis; amount/serving scaling is computed
  -- on read. kcal + the six macro numbers; sodium in mg, the rest in g (kcal in kcal).
  kcal          numeric,
  protein       numeric,
  carbs         numeric,
  fat           numeric,
  fibre         numeric,
  sugar         numeric,
  sodium        numeric,

  -- One serving's weight + its label ("1 slice", "1 cup") for friendly amounts.
  serving_grams numeric,
  serving_label text,

  is_favourite  boolean     not null default false,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- A cached API item is ONE row per owner; a re-resolve of the same food updates it.
  unique (user_id, source, source_ref)
);

-- Name search + favourites lookups (the library list / picker).
create index if not exists food_items_user_name_idx
  on public.food_items (user_id, name);
create index if not exists food_items_user_fav_idx
  on public.food_items (user_id, is_favourite);

alter table public.food_items enable row level security;

drop policy if exists "Owner can read own food_items"   on public.food_items;
drop policy if exists "Owner can insert own food_items" on public.food_items;
drop policy if exists "Owner can update own food_items" on public.food_items;
drop policy if exists "Owner can delete own food_items" on public.food_items;

create policy "Owner can read own food_items"
  on public.food_items for select
  using (auth.uid() = user_id);
create policy "Owner can insert own food_items"
  on public.food_items for insert
  with check (auth.uid() = user_id);
create policy "Owner can update own food_items"
  on public.food_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owner can delete own food_items"
  on public.food_items for delete
  using (auth.uid() = user_id);

-- 2) food_log_entries — one row per logged item (the day ledger) -------------------------
-- NOTE: recipe_id references recipes (table 3 below) — a forward reference. The column is
-- declared here and its FK is added by an ALTER at the foot of this file, once recipes
-- exists. food_item_id can reference inline (food_items is table 1, already created).
create table if not exists public.food_log_entries (
  id            uuid        primary key default gen_random_uuid(),

  user_id       uuid        not null default auth.uid()
                            references auth.users (id) on delete cascade,

  -- The Amsterdam day this item belongs to — SET BY THE WRITE LAYER (the shared localYMD
  -- helper), deliberately NOT a DB default, so the app owns the one definition of "a day".
  entry_date    date        not null,

  meal_slot     text        not null
                            check (meal_slot in ('breakfast', 'lunch', 'dinner', 'snacks')),

  -- Both nullable + intra-module; SET NULL on delete so the entry (with its snapshot)
  -- survives its source food/recipe being removed. A row is normally one OR the other.
  food_item_id  uuid        references public.food_items (id) on delete set null,
  recipe_id     uuid,       -- FK added at the foot of this file (forward ref to recipes)

  amount        numeric,
  unit          text,

  -- The macro SNAPSHOT — REAL stored numerics, copied at write time, NEVER derived. The one
  -- deliberate store-derived exception (see header): what was eaten must not change later.
  kcal          numeric,
  protein       numeric,
  carbs         numeric,
  fat           numeric,
  fibre         numeric,
  sugar         numeric,
  sodium        numeric,

  entry_source  text        not null
                            check (entry_source in ('manual', 'search', 'recipe_cook')),

  -- The lite alcohol log lives HERE — a drink is an intake entry like any other (no drinks
  -- table). is_alcohol marks it; alcohol_units carries the units count (kcal is in the
  -- snapshot above, so drink calories already land in the day total).
  is_alcohol    boolean     not null default false,
  alcohol_units numeric,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- The day/range ledger reads by (owner, day); recents read newest-first by created_at.
create index if not exists food_log_entries_user_date_idx
  on public.food_log_entries (user_id, entry_date desc);
create index if not exists food_log_entries_user_created_idx
  on public.food_log_entries (user_id, created_at desc);

alter table public.food_log_entries enable row level security;

drop policy if exists "Owner can read own food_log_entries"   on public.food_log_entries;
drop policy if exists "Owner can insert own food_log_entries" on public.food_log_entries;
drop policy if exists "Owner can update own food_log_entries" on public.food_log_entries;
drop policy if exists "Owner can delete own food_log_entries" on public.food_log_entries;

create policy "Owner can read own food_log_entries"
  on public.food_log_entries for select
  using (auth.uid() = user_id);
create policy "Owner can insert own food_log_entries"
  on public.food_log_entries for insert
  with check (auth.uid() = user_id);
create policy "Owner can update own food_log_entries"
  on public.food_log_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owner can delete own food_log_entries"
  on public.food_log_entries for delete
  using (auth.uid() = user_id);

-- 3) recipes — one row per recipe --------------------------------------------------------
create table if not exists public.recipes (
  id            uuid        primary key default gen_random_uuid(),

  user_id       uuid        not null default auth.uid()
                            references auth.users (id) on delete cascade,

  title         text        not null,
  servings      integer,

  prep_minutes  integer,
  cook_minutes  integer,

  -- Stashed by the import flow for provenance; not a displayed field in V1.
  source_url    text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- The cookbook list (owner's recipes, newest first).
create index if not exists recipes_user_created_idx
  on public.recipes (user_id, created_at desc);

alter table public.recipes enable row level security;

drop policy if exists "Owner can read own recipes"   on public.recipes;
drop policy if exists "Owner can insert own recipes" on public.recipes;
drop policy if exists "Owner can update own recipes" on public.recipes;
drop policy if exists "Owner can delete own recipes" on public.recipes;

create policy "Owner can read own recipes"
  on public.recipes for select
  using (auth.uid() = user_id);
create policy "Owner can insert own recipes"
  on public.recipes for insert
  with check (auth.uid() = user_id);
create policy "Owner can update own recipes"
  on public.recipes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owner can delete own recipes"
  on public.recipes for delete
  using (auth.uid() = user_id);

-- 4) recipe_ingredients — a recipe's structured ingredients ------------------------------
create table if not exists public.recipe_ingredients (
  id            uuid        primary key default gen_random_uuid(),

  user_id       uuid        not null default auth.uid()
                            references auth.users (id) on delete cascade,

  -- Intra-module: an ingredient belongs to its recipe; delete the recipe → its ingredients go.
  recipe_id     uuid        not null references public.recipes (id) on delete cascade,

  -- The resolved food (nullable): SET NULL if that library item is removed; the raw_text +
  -- any manual_macros still describe the line.
  food_item_id  uuid        references public.food_items (id) on delete set null,

  raw_text      text,
  amount        numeric,
  unit          text,

  -- Hand-entered macros for an off-DB ingredient (the warm sparse-state path); jsonb so the
  -- shape can hold the seven numbers without seven nullable columns here.
  manual_macros jsonb,
  -- Marked "no macros" (e.g. "salt to taste") → excluded from the recipe total, shown plainly.
  no_macros     boolean     not null default false,

  position      integer,

  created_at    timestamptz not null default now()
);

-- Read a recipe's ingredients in display order.
create index if not exists recipe_ingredients_recipe_pos_idx
  on public.recipe_ingredients (recipe_id, position);

alter table public.recipe_ingredients enable row level security;

drop policy if exists "Owner can read own recipe_ingredients"   on public.recipe_ingredients;
drop policy if exists "Owner can insert own recipe_ingredients" on public.recipe_ingredients;
drop policy if exists "Owner can update own recipe_ingredients" on public.recipe_ingredients;
drop policy if exists "Owner can delete own recipe_ingredients" on public.recipe_ingredients;

create policy "Owner can read own recipe_ingredients"
  on public.recipe_ingredients for select
  using (auth.uid() = user_id);
create policy "Owner can insert own recipe_ingredients"
  on public.recipe_ingredients for insert
  with check (auth.uid() = user_id);
create policy "Owner can update own recipe_ingredients"
  on public.recipe_ingredients for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owner can delete own recipe_ingredients"
  on public.recipe_ingredients for delete
  using (auth.uid() = user_id);

-- 5) recipe_steps — a recipe's ordered steps + optional timers ---------------------------
create table if not exists public.recipe_steps (
  id            uuid        primary key default gen_random_uuid(),

  user_id       uuid        not null default auth.uid()
                            references auth.users (id) on delete cascade,

  -- Intra-module: a step belongs to its recipe; delete the recipe → its steps go.
  recipe_id     uuid        not null references public.recipes (id) on delete cascade,

  position      integer,
  text          text        not null,

  -- An optional inline step timer, in seconds (null = no timer on this step).
  timer_seconds integer,

  created_at    timestamptz not null default now()
);

-- Read a recipe's steps in order (cooking mode).
create index if not exists recipe_steps_recipe_pos_idx
  on public.recipe_steps (recipe_id, position);

alter table public.recipe_steps enable row level security;

drop policy if exists "Owner can read own recipe_steps"   on public.recipe_steps;
drop policy if exists "Owner can insert own recipe_steps" on public.recipe_steps;
drop policy if exists "Owner can update own recipe_steps" on public.recipe_steps;
drop policy if exists "Owner can delete own recipe_steps" on public.recipe_steps;

create policy "Owner can read own recipe_steps"
  on public.recipe_steps for select
  using (auth.uid() = user_id);
create policy "Owner can insert own recipe_steps"
  on public.recipe_steps for insert
  with check (auth.uid() = user_id);
create policy "Owner can update own recipe_steps"
  on public.recipe_steps for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owner can delete own recipe_steps"
  on public.recipe_steps for delete
  using (auth.uid() = user_id);

-- Deferred FK: food_log_entries.recipe_id → recipes (a cooked-recipe entry). Added here
-- because recipes (table 3) is created after food_log_entries (table 2). SET NULL on delete
-- so a logged cook survives the recipe being removed (its snapshot is already stored).
-- INTRA-MODULE — Food → Food, never into the spine.
alter table public.food_log_entries
  drop constraint if exists food_log_entries_recipe_id_fkey;
alter table public.food_log_entries
  add constraint food_log_entries_recipe_id_fkey
  foreign key (recipe_id) references public.recipes (id) on delete set null;

-- Index the cooked-recipe back-reference (entries for a given recipe).
create index if not exists food_log_entries_recipe_idx
  on public.food_log_entries (recipe_id);
