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

import { dbConfigured, del, insert, OWNER_USER_ID, select, update } from "./db.ts";
import { humanDate, localHM, localToUtc, localYMD, rollPastBareDateForward, todayYMD } from "../_shared/datetime.ts";
import type { Classified } from "./intent.ts";
import { type Candidate, loadCandidates, matchCandidates } from "./find.ts";
import { logCorrection, resolveCategory } from "./categorize.ts";

const READ_FAILED = "I couldn't reach your items just now — nothing was changed. Try again?";
const HOUR_MS = 3_600_000;

function word(table: string): string {
  return table === "events" ? "event" : "task";
}

// One row to change: its prior values (for undo) and the new values to write. For a
// delete, batch_id is the archive_batches row this archive belongs to (so undo can
// remove the empty batch afterwards, exactly like the app's restore).
export interface Change {
  table: "tasks" | "events";
  id: string;
  title: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  batch_id?: string;
}

interface CommitResult { ok: boolean; reply: string }

// Log prior state FIRST, then apply — so we never change anything without a logged way
// back. (If the log write fails we change nothing; if an apply fails, the log is at worst
// a harmless no-op on undo.)
async function commit(kind: "edit" | "delete", changes: Change[], confirm: string): Promise<CommitResult> {
  const items = changes.map((c) => ({
    table: c.table, id: c.id, title: c.title, before: c.before,
    ...(c.batch_id ? { batch_id: c.batch_id } : {}),
  }));
  const label = changes.length === 1 ? changes[0].title : `${changes.length} items`;
  const logged = await insert("marty_actions", { user_id: OWNER_USER_ID, kind, label, items });
  if (!logged) return { ok: false, reply: "I couldn't set up an undo for that, so I left it unchanged. Try again?" };

  for (const c of changes) {
    const ok = await update(`${c.table}?id=eq.${c.id}&user_id=eq.${OWNER_USER_ID}&select=id`, c.after);
    if (ok === null) return { ok: false, reply: "I hit a snag applying that — text \"undo\", then try again." };
  }
  return { ok: true, reply: confirm };
}

// Convenience for the ops that don't need to compensate on failure (everything but delete).
// Exported so the M9 daytime nudge can write its calendar block through the SAME engine
// (logs before-values → undoable) instead of a parallel write.
export async function commitReply(kind: "edit" | "delete", changes: Change[], confirm: string): Promise<string> {
  return (await commit(kind, changes, confirm)).reply;
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
async function opComplete(all: Candidate[], c: Classified, desc: string, forced?: Candidate): Promise<string> {
  const r = forced ?? pick(matchCandidates(all, { title: c.target_title, time: c.target_time, date: c.target_date, tasksOnly: true }), desc);
  if (typeof r === "string") return r;
  if (r.table !== "tasks") return `'${r.title}' is an event, not a task — I can't mark it done. (Nothing changed.)`;
  if (r.status === "done") return `'${r.title}' is already done. (Nothing changed.)`;
  const change: Change = { table: "tasks", id: r.id, title: r.title, before: { status: r.status }, after: { status: "done" } };
  return await commitReply("edit", [change], `Marked '${r.title}' done. (Text "undo" to reopen it.)`);
}

// 3c — RENAME (task or event).
async function opRename(all: Candidate[], c: Classified, desc: string, forced?: Candidate): Promise<string> {
  const newTitle = c.new_title.trim();
  if (!newTitle) return "What should I rename it to? (Nothing changed.)";
  const r = forced ?? pick(matchCandidates(all, { title: c.target_title, time: c.target_time, date: c.target_date }), desc);
  if (typeof r === "string") return r;
  const change: Change = { table: r.table, id: r.id, title: r.title, before: { title: r.title }, after: { title: newTitle } };
  return await commitReply("edit", [change], `Renamed '${r.title}' to '${newTitle}'. (Text "undo" to change it back.)`);
}

// 3b — RESCHEDULE (event, scheduled task, or due-only task). Missing day keeps the item's
// day; missing time keeps its time. Duration is preserved.
async function opReschedule(all: Candidate[], c: Classified, desc: string, forced?: Candidate): Promise<string> {
  const r = forced ?? pick(matchCandidates(all, { title: c.target_title, time: c.target_time, date: c.target_date }), desc);
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
    return await commitReply("edit", [change], `Moved '${r.title}' to ${humanDate(date)} ${time}. (Text "undo" to put it back.)`);
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
    return await commitReply("edit", [change], `Moved '${r.title}' to ${humanDate(date)} ${time}. (Text "undo" to put it back.)`);
  }

  // TASK with only a due date (no clock time) — move the due date, keep the bucket honest.
  if (!newDate) return `'${r.title}' is a to-do without a set time — tell me which day to move it to. (Nothing changed.)`;
  const bucket = newDate === todayYMD() ? "Today" : "This Week";
  const change: Change = {
    table: "tasks", id: r.id, title: r.title,
    before: { due_date: r.row.due_date ?? null, time_bucket: r.row.time_bucket ?? "Today" },
    after: { due_date: newDate, time_bucket: bucket },
  };
  return await commitReply("edit", [change], `Moved '${r.title}' to be due ${humanDate(newDate)}. (Text "undo" to put it back.)`);
}

// 3d — DELETE = archive, using the SAME machinery the app uses (M3.5): create an
// archive_batches row and stamp the rows with its id, so a text-deleted item SHOWS UP in
// the app's Archive screen and can be restored there too — AND stays undoable via Marty's
// "undo" (which reverts the rows and removes the now-empty batch). For a task we archive
// its active subtasks into the same batch, matching the app's cascade. Nothing destroyed.
async function opDelete(all: Candidate[], c: Classified, desc: string, forced?: Candidate): Promise<string> {
  const r = forced ?? pick(matchCandidates(all, { title: c.target_title, time: c.target_time, date: c.target_date }), desc);
  if (typeof r === "string") return r;

  // 1) The archive batch first — same shape the app writes (label = title, source_type).
  const batch = await insert("archive_batches", { user_id: OWNER_USER_ID, label: r.title, source_type: word(r.table) });
  if (!batch) return "I couldn't set that up just now — nothing was deleted. Try again?";
  const batchId = String(batch.id);

  // 2) Stamp the row(s) with archived_at + this batch id (active → archived).
  const nowIso = new Date().toISOString();
  const archive = (cand: Candidate): Change => ({
    table: cand.table, id: cand.id, title: cand.title,
    before: { archived_at: cand.row.archived_at ?? null, archive_batch_id: cand.row.archive_batch_id ?? null },
    after: { archived_at: nowIso, archive_batch_id: batchId },
    batch_id: batchId,
  });
  const changes = [archive(r)];
  if (r.table === "tasks") {
    for (const s of all) {
      if (s.table === "tasks" && String(s.row.parent_task_id ?? "") === r.id) changes.push(archive(s));
    }
  }

  const extra = changes.length - 1;
  const note = extra ? ` (and its ${extra} subtask${extra === 1 ? "" : "s"})` : "";
  const res = await commit("delete", changes, `Deleted the ${word(r.table)} '${r.title}'${note}. (Text "undo" to bring it back.)`);
  // Compensate on failure — never leave an empty batch behind (matches the app's path).
  if (!res.ok) await del(`archive_batches?id=eq.${batchId}&user_id=eq.${OWNER_USER_ID}`);
  return res.reply;
}

// The single item the owner most recently captured (for a bare "that's X" correction):
// the most recent CREATE action's item, if there's exactly one. Otherwise ask which.
async function lastCreatedCandidate(all: Candidate[]): Promise<Candidate | string> {
  const rows = await select(
    `marty_actions?user_id=eq.${OWNER_USER_ID}&kind=eq.create&select=items&order=created_at.desc&limit=1`,
  );
  if (!rows || rows.length === 0) return "I'm not sure which item you mean — tell me its name (e.g. \"call plumber is Work\"). (Nothing changed.)";
  const items = Array.isArray(rows[0].items) ? (rows[0].items as { id: string; title?: string }[]) : [];
  if (items.length !== 1) {
    const names = items.slice(0, 5).map((it) => `'${it.title ?? ""}'`).join(", ");
    return `Which one — ${names}? Name it, e.g. "${items[0]?.title ?? "X"} is Work". (Nothing changed.)`;
  }
  const target = all.find((cand) => cand.id === String(items[0].id));
  return target ?? "That item isn't around anymore. (Nothing changed.)";
}

// 3e — CATEGORIZE / refile under a category (M6). Reuses the edit commit path (so it's
// undoable), and logs the correction so Marty can learn the owner's filing over time.
async function opCategorize(all: Candidate[], c: Classified, desc: string, forced?: Candidate): Promise<string> {
  const cat = await resolveCategory(c.new_category);
  if (!cat) return `I don't have a category called '${c.new_category.trim()}'. (Nothing changed.)`;

  const named = !!(c.target_title || c.target_time || c.target_date);
  const r = forced ?? (named
    ? pick(matchCandidates(all, { title: c.target_title, time: c.target_time, date: c.target_date }), desc)
    : await lastCreatedCandidate(all));
  if (typeof r === "string") return r;

  const before = r.row.category_id ? String(r.row.category_id) : null;
  if (before === cat.id) return `'${r.title}' is already under ${cat.name}. (Nothing changed.)`;

  const change: Change = { table: r.table, id: r.id, title: r.title, before: { category_id: before }, after: { category_id: cat.id } };
  const res = await commit("edit", [change], `Filed '${r.title}' under ${cat.name}. (Text "undo" to change it back.)`);
  // Record the correction for learning — only when the change actually went through.
  if (res.ok) await logCorrection(r.title, before, cat.id);
  return res.reply;
}

// Dispatch a classified EDIT to the right op. (Caller guarantees c.kind === "edit".)
// `forcedRef` (M8) is a brief item resolved by number → act on THAT exact row, not a match.
export async function handleEdit(c: Classified, forcedRef?: { table: string; id: string }): Promise<string> {
  if (!dbConfigured) return "I can't change things right now — give it a moment and try again.";
  const all = await loadCandidates();
  if (all === null) return READ_FAILED;

  let forced: Candidate | undefined;
  if (forcedRef) {
    forced = all.find((cand) => cand.id === forcedRef.id && cand.table === forcedRef.table);
    if (!forced) return "That item from your brief isn't around anymore. (Nothing changed.)";
  }

  const desc = forced ? `'${forced.title}'` : (c.target_title.trim() || (c.target_time ? `the ${c.target_time}` : "that item"));
  switch (c.op) {
    case "complete": return await opComplete(all, c, desc, forced);
    case "reschedule": return await opReschedule(all, c, desc, forced);
    case "rename": return await opRename(all, c, desc, forced);
    case "delete": return await opDelete(all, c, desc, forced);
    case "categorize": return await opCategorize(all, c, desc, forced);
    default:
      return "I wasn't sure what change you meant. Try \"move X to Friday\", \"rename X to Y\", \"done X\", \"delete X\", or \"that's Admin\".";
  }
}
