-- LifeOS — categories guards (Phase 2, Piece 3a): rename / nesting / delete.
-- Run this AFTER db/01_categories.sql, once, in the Supabase SQL editor.
-- Every rule here is enforced in the DATABASE, so it holds even if the app is
-- bypassed. These ADD rules; they do not widen access — RLS stays owner-only.

-- The Inbox is the row that is top-level (no parent) and named 'Inbox'. We also
-- forbid renaming/nesting it below, so that anchor can never drift.

-- 1) No two categories with the same name under the same parent (per owner,
--    case-insensitive). A NULL parent is folded to one "top level" bucket via a
--    sentinel id, so top-level duplicates are caught too. Different parents may
--    reuse a name ("Class A" under Q2 and under Q3 is fine).
--    NOTE: if this errors, you already have a duplicate — remove it and re-run.
create unique index if not exists categories_unique_name_per_parent
  on public.categories (
    user_id,
    coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(name)
  );

-- 2) Rules checked before a row is inserted or changed.
create or replace function public.categories_before_write()
returns trigger
language plpgsql
as $$
declare
  ancestor uuid;
begin
  -- Inbox is the fallback bucket: it can't be renamed away from 'Inbox' and
  -- can't be pushed under another category.
  if tg_op = 'UPDATE' and old.parent_id is null and old.name = 'Inbox' then
    if new.name <> 'Inbox' then
      raise exception 'The Inbox cannot be renamed.';
    end if;
    if new.parent_id is not null then
      raise exception 'The Inbox stays at the top level.';
    end if;
  end if;

  -- Nesting rules (only when a parent is set).
  if new.parent_id is not null then
    if new.parent_id = new.id then
      raise exception 'A category cannot be its own parent.';
    end if;

    -- Parent must exist and belong to the same owner (no cross-owner nesting).
    perform 1 from public.categories
      where id = new.parent_id and user_id = new.user_id;
    if not found then
      raise exception 'Parent category not found for this owner.';
    end if;

    -- No cycles: walk up the ancestors; a row must not be its own ancestor.
    ancestor := new.parent_id;
    while ancestor is not null loop
      if ancestor = new.id then
        raise exception 'That would nest a category inside itself.';
      end if;
      select parent_id into ancestor from public.categories where id = ancestor;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists categories_before_write on public.categories;
create trigger categories_before_write
  before insert or update on public.categories
  for each row execute function public.categories_before_write();

-- 3) Rules checked before a row is deleted.
create or replace function public.categories_before_delete()
returns trigger
language plpgsql
as $$
begin
  -- The Inbox can never be deleted (DB-level, not just hidden in the UI).
  if old.parent_id is null and old.name = 'Inbox' then
    raise exception 'The Inbox cannot be deleted.';
  end if;

  -- Move any sub-categories UP to the deleted row's parent. When the deleted
  -- row was top-level, old.parent_id is NULL, so its children become top-level.
  -- Nothing is lost and the rest of the hierarchy stays intact.
  update public.categories
    set parent_id = old.parent_id
    where parent_id = old.id;

  return old;
end;
$$;

drop trigger if exists categories_before_delete on public.categories;
create trigger categories_before_delete
  before delete on public.categories
  for each row execute function public.categories_before_delete();
