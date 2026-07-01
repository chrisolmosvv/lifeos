-- LifeOS — Food V2 P1: the BASICS seed (trusted staple food_items). DATA, not schema.
--
-- WHAT THIS IS (plain English): ~20 canonical staple foods (chicken breast, egg, oats, rice,
-- milk, olive oil, …) inserted as the owner's own food_items, so a search for "chicken" leads
-- with the plain generic instead of burying it under branded supermarket noise. They are NOT a
-- new table and NOT a new column — they are ordinary food_items rows, MARKED as canonical by a
-- CONVENTION: source='manual', source_ref='basics:<slug>'. The food-search function hoists any
-- row whose source_ref starts with 'basics:' to the front of results.
--
-- NOT A SCHEMA CHANGE: this is a DATA insert into an existing table (no ALTER/CREATE/DROP). It
-- is NOT checker-gated. Owner-only RLS already governs food_items; these rows are the owner's.
--
-- NUMBERS: per-100g, canonical USDA-derived values. Chicken breast + salmon are COOKED figures
-- (the owner logs them cooked); rice/pasta cooked; fruit/veg raw. Adjust any value freely — this
-- file is idempotent (re-running UPDATES the rows in place via the on-conflict below).
--
-- USER: single-user app → user_id is the one auth.users row. RLS is bypassed in the SQL editor
-- (service role), so the explicit user_id is what scopes these to the owner.
--
-- Run in the Supabase SQL editor (Frankfurt project cntlptuacsujbdtwvbis — NOT Ireland). Expect
-- "INSERT 0 20" (or an UPDATE count on a re-run). No PostgREST reload needed (no schema change).

insert into public.food_items
  (user_id, name, source, source_ref, kcal, protein, carbs, fat, fibre, sugar, sodium, serving_grams, serving_label)
select u.id, v.name, 'manual', v.source_ref,
       v.kcal, v.protein, v.carbs, v.fat, v.fibre, v.sugar, v.sodium, v.serving_grams, v.serving_label
from (select id from auth.users order by created_at asc limit 1) u
cross join (values
  ('Chicken breast, cooked',  'basics:chicken-breast',  165::numeric, 31::numeric,   0::numeric,   3.6::numeric,  0::numeric,    0::numeric,   74::numeric,  null::numeric, null::text),
  ('Egg, whole, raw',         'basics:egg',             143,          12.6,          0.72,          9.5,           0,             0.37,         142,          50,            '1 egg'),
  ('Oats, rolled, dry',       'basics:oats',            379,          13.2,          67.7,          6.5,           10.1,          0.99,         6,            null,          null),
  ('White rice, cooked',      'basics:white-rice',      130,          2.7,           28,            0.3,           0.4,           0.05,         1,            null,          null),
  ('Pasta, cooked',           'basics:pasta',           158,          5.8,           30.9,          0.9,           1.8,           0.56,         1,            null,          null),
  ('Milk, semi-skimmed',      'basics:milk-semi',       47,           3.4,           4.9,           1.6,           0,             4.8,          44,           null,          null),
  ('Greek yogurt, plain',     'basics:greek-yogurt',    73,           10,            3.9,           1.9,           0,             3.2,          34,           null,          null),
  ('Olive oil',               'basics:olive-oil',       884,          0,             0,             100,           0,             0,            2,            null,          null),
  ('Butter, salted',          'basics:butter',          717,          0.85,          0.06,          81.1,          0,             0.06,         643,          null,          null),
  ('Banana, raw',             'basics:banana',          89,           1.1,           22.8,          0.3,           2.6,           12.2,         1,            118,           '1 medium'),
  ('Apple, raw',              'basics:apple',           52,           0.26,          13.8,          0.17,          2.4,           10.4,         1,            182,           '1 medium'),
  ('Potato, raw',             'basics:potato',          77,           2,             17.5,          0.1,           2.1,           0.8,          6,            null,          null),
  ('Broccoli, raw',           'basics:broccoli',        34,           2.8,           6.6,           0.4,           2.6,           1.7,          33,           null,          null),
  ('Tomato, raw',             'basics:tomato',          18,           0.9,           3.9,           0.2,           1.2,           2.6,          5,            null,          null),
  ('Onion, raw',              'basics:onion',           40,           1.1,           9.3,           0.1,           1.7,           4.2,          4,            null,          null),
  ('Cheddar cheese',          'basics:cheddar',         403,          24.9,          1.3,           33.1,          0,             0.5,          621,          null,          null),
  ('Salmon, cooked',          'basics:salmon',          208,          22.5,          0,             13,            0,             0,            61,           null,          null),
  ('Wholemeal bread',         'basics:wholemeal-bread', 252,          12.3,          42.7,          3.5,           6,             4.4,          450,          null,          null),
  ('Peanut butter',           'basics:peanut-butter',   588,          25,            20,            50,            6,             9,            476,          null,          null),
  ('Almonds, raw',            'basics:almonds',         579,          21.2,          21.6,          49.9,          12.5,          4.4,          1,            null,          null)
) as v(name, source_ref, kcal, protein, carbs, fat, fibre, sugar, sodium, serving_grams, serving_label)
on conflict (user_id, source, source_ref) do update set
  name = excluded.name, kcal = excluded.kcal, protein = excluded.protein, carbs = excluded.carbs,
  fat = excluded.fat, fibre = excluded.fibre, sugar = excluded.sugar, sodium = excluded.sodium,
  serving_grams = excluded.serving_grams, serving_label = excluded.serving_label, updated_at = now();

-- CONFIRM the seed landed (expect 20 rows):
--   select name, source_ref, kcal, protein from public.food_items
--   where source = 'manual' and source_ref like 'basics:%' order by name;

-- ── ROLLBACK (removes ONLY the seeded basics rows; leaves all other food_items) ─────────────
--   delete from public.food_items where source = 'manual' and source_ref like 'basics:%';
