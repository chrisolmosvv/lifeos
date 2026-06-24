// LifeOS — the morning brief, M8: the NUMBERED action list.
//
// Turns the gathered day into a numbered, ordered, DEDUPED list of actionable items so the
// owner can reply fast ("done 1", "move 2 to Friday"). Order mirrors the brief: schedule
// first, then the Today list, then what needs attention (due today → overdue), then the one
// "been waiting" nudge. Returns BOTH the display lines AND the number→item map that gets
// stored (so a reply maps a number back to the EXACT item — see telegram/briefmap.ts).

import { humanDate } from "../_shared/datetime.ts";
import type { DayData, NamedItem } from "./day.ts";

export interface BriefMapItem { n: number; table: "tasks" | "events"; id: string; title: string }

export function buildActions(d: DayData, forgotten: NamedItem | null): { lines: string[]; map: BriefMapItem[] } {
  const seen = new Set<string>();
  const map: BriefMapItem[] = [];
  const lines: string[] = [];

  const add = (table: "tasks" | "events", id: string, title: string, tag: string) => {
    if (!id || seen.has(id)) return; // each item gets exactly ONE number
    seen.add(id);
    const n = map.length + 1;
    map.push({ n, table, id, title });
    lines.push(`${n}. ${title} — ${tag}`);
  };

  for (const t of d.timed) add(t.isTask ? "tasks" : "events", t.id, t.title, `${t.clock}${t.isTask ? " (task)" : ""}`);
  for (const t of d.todayTasks) add("tasks", t.id, t.title, "today");
  for (const t of d.dueToday) add("tasks", t.id, t.title, "due today");
  for (const o of d.overdue) add("tasks", o.id, o.title, `overdue — was due ${humanDate(o.dueYMD)}`);
  if (forgotten) add("tasks", forgotten.id, forgotten.title, "been waiting");

  return { lines, map };
}
