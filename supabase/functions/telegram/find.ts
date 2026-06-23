// LifeOS — Telegram bot, M3: find the item an edit/delete command refers to.
//
// Reads the owner's ACTIVE (archived_at IS NULL) tasks + events and matches them against
// the hints the classifier pulled out (a name fragment, and/or a clock time, and/or a
// day). READ-ONLY here — it imports only `select`. The caller decides what to do with
// 0 / 1 / many matches (act when exactly one; ask when several; say so when none).

import { OWNER_USER_ID, select } from "./db.ts";
import { localHM, localYMD } from "../_shared/datetime.ts";

export interface Candidate {
  table: "tasks" | "events";
  id: string;
  title: string;
  date: string; // the item's local day (YYYY-MM-DD), or "" if it has none
  time: string; // the item's local clock time (HH:MM), or "" if it has none
  status: string; // tasks only ('open'|'in_progress'|'done'); "" for events
  row: Record<string, unknown>; // the raw row, for prior-state + reschedule maths
}

const scope = () => `user_id=eq.${OWNER_USER_ID}&archived_at=is.null`;

// Load every active task + event as a match candidate. Returns null if a read failed.
export async function loadCandidates(): Promise<Candidate[] | null> {
  const events = await select(`events?${scope()}&select=id,title,start_at,end_at,category_id,archived_at,archive_batch_id`);
  if (events === null) return null;
  const tasks = await select(
    `tasks?${scope()}&select=id,title,status,due_date,scheduled_start,scheduled_end,time_bucket,category_id,parent_task_id,archived_at,archive_batch_id`,
  );
  if (tasks === null) return null;

  const out: Candidate[] = [];
  for (const e of events) {
    const start = String(e.start_at);
    out.push({ table: "events", id: String(e.id), title: String(e.title), date: localYMD(start), time: localHM(start), status: "", row: e });
  }
  for (const t of tasks) {
    const sched = t.scheduled_start ? String(t.scheduled_start) : "";
    const date = sched ? localYMD(sched) : (t.due_date ? String(t.due_date) : "");
    const time = sched ? localHM(sched) : "";
    out.push({ table: "tasks", id: String(t.id), title: String(t.title), date, time, status: t.status ? String(t.status) : "open", row: t });
  }
  return out;
}

// Narrow candidates by the given hints. Any hint left "" is ignored. A title hint
// prefers an exact (case-insensitive) match and only falls back to "contains" if no
// exact one — so "dentist" hits 'dentist' before 'dentist follow-up'.
export function matchCandidates(
  all: Candidate[],
  opts: { title?: string; time?: string; date?: string; tasksOnly?: boolean },
): Candidate[] {
  let list = all;
  if (opts.tasksOnly) list = list.filter((c) => c.table === "tasks");
  if (opts.time) list = list.filter((c) => c.time === opts.time);
  if (opts.date) list = list.filter((c) => c.date === opts.date);

  const title = (opts.title ?? "").trim().toLowerCase();
  if (title) {
    const exact = list.filter((c) => c.title.trim().toLowerCase() === title);
    list = exact.length ? exact : list.filter((c) => c.title.toLowerCase().includes(title));
  }
  return list;
}
