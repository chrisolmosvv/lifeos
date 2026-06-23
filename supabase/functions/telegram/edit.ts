// LifeOS — Telegram bot, M3: change an existing item by text, ALWAYS riding the M2 undo.
//
// Four ops: complete (3a), reschedule (3b), rename (3c), delete (3d). Every op:
//   1. finds the target (find.ts) — acts only when EXACTLY one matches; asks when several;
//      says so when none. Never edits the wrong thing.
//   2. records the item's PRIOR STATE to marty_actions BEFORE changing anything, so undo
//      can revert/restore exactly. complete/reschedule/rename = an 'edit' action (undo
//      PATCHes the before-values back); delete = a 'delete' action that ARCHIVES the row
//      (undo clears archived_at — restores it exactly, nothing destroyed).
//   3. applies the change surgically, by row id + owner filter.
// No new schema — these are the 'edit'/'delete' action types M2's table was built to hold.

import { dbConfigured, insert, OWNER_USER_ID, update } from "./db.ts";
import { humanDate, localHM, localToUtc, localYMD, rollPastBareDateForward, todayYMD } from "../_shared/datetime.ts";
import type { Classified } from "./intent.ts";
import { type Candidate, loadCandidates, matchCandidates } from "./find.ts";

const READ_FAILED = "I couldn't reach your items just now — nothing was changed. Try again?";
const HOUR_MS = 3_600_000;

function word(table: string): string {
  return table === "events" ? "event" : "task";
}

// One row to change: its prior values (for undo) and the new values to write.
interface Change {
  table: "tasks" | "events";
  id: string;
  title: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

// Log prior state FIRST, then apply — so we never change anything without a logged way
// back. (If the log write fails we change nothing; if an apply fails, the log is at worst
// a harmless no-op on undo.)
async function commit(kind: "edit" | "delete", changes: Change[], confirm: string): Promise<string> {
  const items = changes.map((c) => ({ table: c.table, id: c.id, title: c.title, before: c.before }));
  const label = changes.length === 1 ? changes[0].title : `${changes.length} items`;
  const logged = await insert("marty_actions", { user_id: OWNER_USER_ID, kind, label, items });
  if (!logged) return "I couldn't set up an undo for that, so I left it unchanged. Try again?";

  for (const c of changes) {
    const ok = await update(`${c.table}?id=eq.${c.id}&user_id=eq.${OWNER_USER_ID}&select=id`, c.after);
    if (ok === null) return "I hit a snag applying that — text \"undo\", then try again.";
  }
  return confirm;
}

// Turn a candidate list into either the single match, or a reply (ask / not-found).
function pick(matches: Candidate[], desc: string): Candidate | string {
  if (matches.length === 0) return `I couldn't find "${desc}". (Nothing changed.)`;
  if (matches.length > 1) {
    const names = matches.slice(0, 5).map((c) => `'${c.title}'${c.date ? ` (${humanDate(c.date)}${c.time ? ` ${c.time}` : ""})` : ""}`);
    return `I found more than one match for "${desc}": ${names.join(", ")}. Which one? (Nothing changed.)`;
  }
  return matches[0];
}

// 3a — COMPLETE (tasks only). The DB trigger clears/sets completed_at from status, so
// recording status alone is enough for an exact undo.
async function opComplete(all: Candidate[], c: Classified, desc: string): Promise<string> {
  const r = pick(matchCandidates(all, { title: c.target_title, time: c.target_time, date: c.target_date, tasksOnly: true }), desc);
  if (typeof r === "string") return r;
  if (r.status === "done") return `'${r.title}' is already done. (Nothing changed.)`;
  const change: Change = { table: "tasks", id: r.id, title: r.title, before: { status: r.status }, after: { status: "done" } };
  return await commit("edit", [change], `Marked '${r.title}' done. (Text "undo" to reopen it.)`);
}

// 3c — RENAME (task or event).
async function opRename(all: Candidate[], c: Classified, desc: string): Promise<string> {
  const newTitle = c.new_title.trim();
  if (!newTitle) return "What should I rename it to? (Nothing changed.)";
  const r = pick(matchCandidates(all, { title: c.target_title, time: c.target_time, date: c.target_date }), desc);
  if (typeof r === "string") return r;
  const change: Change = { table: r.table, id: r.id, title: r.title, before: { title: r.title }, after: { title: newTitle } };
  return await commit("edit", [change], `Renamed '${r.title}' to '${newTitle}'. (Text "undo" to change it back.)`);
}

// 3b — RESCHEDULE (event, scheduled task, or due-only task). Missing day keeps the item's
// day; missing time keeps its time. Duration is preserved.
async function opReschedule(all: Candidate[], c: Classified, desc: string): Promise<string> {
  const r = pick(matchCandidates(all, { title: c.target_title, time: c.target_time, date: c.target_date }), desc);
  if (typeof r === "string") return r;

  let newDate = c.new_date.trim();
  const newTime = c.new_time.trim();
  if (newDate && c.new_date_bare) newDate = rollPastBareDateForward(newDate);
  if (!newDate && !newTime) return `Move '${r.title}' to when? Give me a day or a time. (Nothing changed.)`;

  // EVENT — shift start, keep duration.
  if (r.table === "events") {
    const start = String(r.row.start_at), end = String(r.row.end_at);
    const date = newDate || localYMD(start), time = newTime || localHM(start);
    const ns = localToUtc(date, time);
    const ne = new Date(ns.getTime() + (new Date(end).getTime() - new Date(start).getTime()));
    const change: Change = { table: "events", id: r.id, title: r.title, before: { start_at: start, end_at: end }, after: { start_at: ns.toISOString(), end_at: ne.toISOString() } };
    return await commit("edit", [change], `Moved '${r.title}' to ${humanDate(date)} ${time}. (Text "undo" to put it back.)`);
  }

  // TASK that's time-blocked on the calendar — move the block, keep duration.
  if (r.row.scheduled_start) {
    const start = String(r.row.scheduled_start);
    const end = r.row.scheduled_end ? String(r.row.scheduled_end) : "";
    const date = newDate || localYMD(start), time = newTime || localHM(start);
    const ns = localToUtc(date, time);
    const ne = new Date(ns.getTime() + (end ? new Date(end).getTime() - new Date(start).getTime() : HOUR_MS));
    const change: Change = {
      table: "tasks", id: r.id, title: r.title,
      before: { scheduled_start: start, scheduled_end: r.row.scheduled_end ?? null },
      after: { scheduled_start: ns.toISOString(), scheduled_end: ne.toISOString() },
    };
    return await commit("edit", [change], `Moved '${r.title}' to ${humanDate(date)} ${time}. (Text "undo" to put it back.)`);
  }

  // TASK with only a due date (no clock time) — move the due date, keep the bucket honest.
  if (!newDate) return `'${r.title}' is a to-do without a set time — tell me which day to move it to. (Nothing changed.)`;
  const bucket = newDate === todayYMD() ? "Today" : "This Week";
  const change: Change = {
    table: "tasks", id: r.id, title: r.title,
    before: { due_date: r.row.due_date ?? null, time_bucket: r.row.time_bucket ?? "Today" },
    after: { due_date: newDate, time_bucket: bucket },
  };
  return await commit("edit", [change], `Moved '${r.title}' to be due ${humanDate(newDate)}. (Text "undo" to put it back.)`);
}

// 3d — DELETE = archive (set archived_at), so undo restores it exactly. For a task we
// archive its active subtasks too (same action), matching the app's cascade.
async function opDelete(all: Candidate[], c: Classified, desc: string): Promise<string> {
  const r = pick(matchCandidates(all, { title: c.target_title, time: c.target_time, date: c.target_date }), desc);
  if (typeof r === "string") return r;

  const nowIso = new Date().toISOString();
  const archive = (cand: Candidate): Change => ({
    table: cand.table, id: cand.id, title: cand.title,
    before: { archived_at: cand.row.archived_at ?? null, archive_batch_id: cand.row.archive_batch_id ?? null },
    after: { archived_at: nowIso, archive_batch_id: null },
  });

  const changes = [archive(r)];
  if (r.table === "tasks") {
    for (const s of all) {
      if (s.table === "tasks" && String(s.row.parent_task_id ?? "") === r.id) changes.push(archive(s));
    }
  }
  const extra = changes.length - 1;
  const note = extra ? ` (and its ${extra} subtask${extra === 1 ? "" : "s"})` : "";
  return await commit("delete", changes, `Deleted the ${word(r.table)} '${r.title}'${note}. (Text "undo" to bring it back.)`);
}

// Dispatch a classified EDIT to the right op. (Caller guarantees c.kind === "edit".)
export async function handleEdit(c: Classified): Promise<string> {
  if (!dbConfigured) return "I can't change things right now — give it a moment and try again.";
  const all = await loadCandidates();
  if (all === null) return READ_FAILED;

  const desc = c.target_title.trim() || (c.target_time ? `the ${c.target_time}` : "that item");
  switch (c.op) {
    case "complete": return await opComplete(all, c, desc);
    case "reschedule": return await opReschedule(all, c, desc);
    case "rename": return await opRename(all, c, desc);
    case "delete": return await opDelete(all, c, desc);
    default:
      return "I wasn't sure what change you meant. Try \"move X to Friday\", \"rename X to Y\", \"done X\", or \"delete X\".";
  }
}
