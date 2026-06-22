-- LifeOS — subtasks guard (Phase 3, Piece 3e): one level of nesting only.
-- Run this AFTER db/03_tasks.sql, once, in the Supabase SQL editor (paste the
-- whole file and Run). It ADDS a rule to the tasks table; it does NOT widen
-- access — RLS stays owner-only. The trigger only validates writes.
--
-- The owner's decision: a task can have subtasks, but a subtask cannot have its
-- own subtasks (no three-deep nesting). A UI-only rule could be bypassed, so we
-- enforce it in the DATABASE here, the same way the categories cycle/Inbox rules
-- are enforced in db/02_categories_guards.sql.
--
-- (The parent link itself is already ON DELETE SET NULL in db/03_tasks.sql, so
-- deleting a parent PROMOTES its subtasks to top-level rather than deleting them
-- — nothing here changes that.)

create or replace function public.tasks_before_write()
returns trigger
language plpgsql
as $$
begin
  -- Only matters when a task is being given a parent (made a subtask).
  if new.parent_task_id is not null then
    if new.parent_task_id = new.id then
      raise exception 'A task cannot be its own subtask.';
    end if;

    -- The parent must exist and belong to the same owner (no cross-owner nesting).
    perform 1 from public.tasks
      where id = new.parent_task_id and user_id = new.user_id;
    if not found then
      raise exception 'Parent task not found for this owner.';
    end if;

    -- One level only: the chosen parent must not itself be a subtask.
    if (select parent_task_id from public.tasks where id = new.parent_task_id) is not null then
      raise exception 'Only one level of subtasks is allowed (a subtask cannot have subtasks).';
    end if;

    -- One level only: a task that already has subtasks cannot itself become one.
    if exists (select 1 from public.tasks where parent_task_id = new.id) then
      raise exception 'A task that has subtasks cannot itself become a subtask.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_before_write on public.tasks;
create trigger tasks_before_write
  before insert or update on public.tasks
  for each row execute function public.tasks_before_write();
