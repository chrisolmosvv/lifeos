-- LifeOS — Cookbook Piece 11 (Track A): BASICS seed — seasonings, spices & spirits. DATA, not schema.
--
-- WHAT THIS IS (plain English): the plain, unqualified staples a home cook reaches for that were
-- MISSING from the original basics seed (db/32) — salt, black pepper, red pepper flakes, common
-- ground spices and dried herbs, and the common distilled spirits. Their absence is why the Penne
-- alla Vodka import matched "cooking salt" → "Cooked Salted Duck Eggs" and "red pepper flakes" →
-- a pickled-snap-peas product: no plain basic existed for the ranker to prefer. These are ordinary
-- food_items rows marked canonical by the SAME convention as db/32: source='manual',
-- source_ref='basics:<slug>'. The food-search function hoists 'basics:%' rows to the front and
-- (Piece 11) exact-name-first now pins them over compounds.
--
-- NOT A SCHEMA CHANGE: a DATA insert into the existing food_items table — no ALTER/CREATE/DROP, no
-- new column, no new table, no foreign key, no policy change. Owner-only RLS already governs
-- food_items; these rows are the owner's (user_id below). It CANNOT invalidate an existing row.
--
-- IDEMPOTENT: re-running UPDATES the rows in place via the on-conflict (user_id, source, source_ref)
-- — the same guard as db/32 — so it can never duplicate a basic.
--
-- ★ NUMBERS: per-100g, USDA FoodData Central-derived (same basis as db/32). Spirits use USDA's
-- "Alcoholic beverage, distilled, all (gin/rum/vodka/whiskey) 80 proof" — 231 kcal, no protein/
-- carbs/fat. Salt is pure sodium chloride: zero macros, sodium 38758 mg/100g. ACCURACY OVER
-- COVERAGE: a wrong basic silently poisons every recipe that matches it, so the CHECKER should
-- verify each per-100g figure against USDA before approval. Names are chosen so a recipe's plain
-- term matches exactly (exact-name-first strips prep words like "cooking"/"ground").
--
-- USER: single-user app → user_id is the one auth.users row. RLS is bypassed in the SQL editor
-- (service role), so the explicit user_id is what scopes these to the owner.
--
-- Run in the Supabase SQL editor (Frankfurt project cntlptuacsujbdtwvbis — NOT Ireland). Expect
-- "INSERT 0 15" (or an UPDATE count on a re-run). No PostgREST reload needed (no schema change).

insert into public.food_items
  (user_id, name, source, source_ref, kcal, protein, carbs, fat, fibre, sugar, sodium, serving_grams, serving_label)
select u.id, v.name, 'manual', v.source_ref,
       v.kcal, v.protein, v.carbs, v.fat, v.fibre, v.sugar, v.sodium, v.serving_grams, v.serving_label
from (select id from auth.users order by created_at asc limit 1) u
cross join (values
  -- ── seasonings, spices & dried herbs (USDA FDC per-100g) ──────────────────────────────────
  ('Salt',              'basics:salt',              0::numeric,   0::numeric,    0::numeric,    0::numeric,   0::numeric,    0::numeric,    38758::numeric, null::numeric, null::text),
  ('Black pepper',      'basics:black-pepper',      251,          10.4,          64,            3.3,          25.3,          0.64,          20,             null,          null),
  ('Red pepper flakes', 'basics:red-pepper-flakes', 318,          12,            56.6,          17.3,         27.2,          10.3,          30,             null,          null),
  ('Paprika',           'basics:paprika',           282,          14.1,          54,            12.9,         34.9,          10.3,          68,             null,          null),
  ('Cumin, ground',     'basics:cumin',             375,          17.8,          44.2,          22.3,         10.5,          2.25,          168,            null,          null),
  ('Cinnamon, ground',  'basics:cinnamon',          247,          4,             80.6,          1.24,         53.1,          2.17,          10,             null,          null),
  ('Garlic powder',     'basics:garlic-powder',     331,          16.6,          72.7,          0.73,         9,             2.43,          60,             null,          null),
  ('Onion powder',      'basics:onion-powder',      341,          10.4,          79.1,          1.04,         15.2,          6.63,          73,             null,          null),
  ('Oregano, dried',    'basics:oregano',           265,          9,             68.9,          4.28,         42.5,          4.09,          25,             null,          null),
  ('Thyme, dried',      'basics:thyme',             276,          9.1,           63.9,          7.43,         37,            1.71,          55,             null,          null),
  -- ── distilled spirits (USDA "distilled, 80 proof": 231 kcal, no P/C/F) ────────────────────
  ('Vodka',             'basics:vodka',             231,          0,             0,             0,            0,             0,             1,              null,          null),
  ('Gin',               'basics:gin',               231,          0,             0,             0,            0,             0,             1,              null,          null),
  ('Rum',               'basics:rum',               231,          0,             0,             0,            0,             0,             1,              null,          null),
  ('Whisky',            'basics:whisky',            231,          0,             0,             0,            0,             0,             1,              null,          null),
  ('Brandy',            'basics:brandy',            231,          0,             0,             0,            0,             0,             1,              null,          null)
) as v(name, source_ref, kcal, protein, carbs, fat, fibre, sugar, sodium, serving_grams, serving_label)
on conflict (user_id, source, source_ref) do update set
  name = excluded.name, kcal = excluded.kcal, protein = excluded.protein, carbs = excluded.carbs,
  fat = excluded.fat, fibre = excluded.fibre, sugar = excluded.sugar, sodium = excluded.sodium,
  serving_grams = excluded.serving_grams, serving_label = excluded.serving_label, updated_at = now();

-- CONFIRM the seed landed (expect 15 new rows here + the 20 from db/32 = 35 basics):
--   select name, source_ref, kcal, sodium from public.food_items
--   where source = 'manual' and source_ref like 'basics:%' order by name;

-- ── ROLLBACK (removes ONLY these 15 seasoning/spirit basics; leaves db/32's and all other rows) ──
--   delete from public.food_items where source = 'manual' and source_ref in (
--     'basics:salt','basics:black-pepper','basics:red-pepper-flakes','basics:paprika','basics:cumin',
--     'basics:cinnamon','basics:garlic-powder','basics:onion-powder','basics:oregano','basics:thyme',
--     'basics:vodka','basics:gin','basics:rum','basics:whisky','basics:brandy');
