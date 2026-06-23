-- LifeOS — category depth cap (Phase 7, T3): keep the category tree at most
-- 3 levels deep. ADDITIVE ONLY: a new trigger function + trigger. It does NOT
-- touch existing columns, rows, or the Phase-2 guard triggers
-- (categories_before_write / categories_before_delete), which still own cycle,
-- Inbox and cross-owner protection. parent_id, sort_order and color already
-- exist from Phase 2 (db/01_categories.sql), so they are NOT re-added here.
--
-- Depth rule: a top-level category (parent_id NULL) is depth 1; each child is
-- one deeper. We reject any insert/update whose resulting depth would exceed 3
-- by walking up the ancestor chain (the same pattern the cycle guard uses).
--
-- NOTE (deferred): this validates the WRITTEN row's own depth. Moving an
-- existing sub-tree under a new parent (re-parenting UX — not built yet) could
-- still push descendants past depth 3; that subtree validation belongs with the
-- re-parenting Settings piece. Inserting via the picker — the only path that
-- exists today — is fully covered.

create or replace function public.categories_enforce_depth()
returns trigger
language plpgsql
as $$
declare
  ancestor  uuid;
  ancestors int := 0;
begin
  -- Top-level rows are always depth 1 — nothing to check.
  if new.parent_id is not null then
    ancestor := new.parent_id;
    -- Count ancestors up to the root. Bounded (< 10) so a stray cycle — already
    -- blocked by categories_before_write — can never loop forever here.
    while ancestor is not null and ancestors < 10 loop
      ancestors := ancestors + 1;
      select parent_id into ancestor from public.categories where id = ancestor;
    end loop;
    -- Depth of this row = itself (1) + number of ancestors.
    if ancestors + 1 > 3 then
      raise exception 'Categories can be at most 3 levels deep.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists categories_enforce_depth on public.categories;
create trigger categories_enforce_depth
  before insert or update on public.categories
  for each row execute function public.categories_enforce_depth();
