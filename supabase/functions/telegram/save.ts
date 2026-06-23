// LifeOS — Telegram bot, Piece 5d ("save it for real").
// Turns what Gemini understood (5c) into a real row in the owner's data, then
// returns a plain-English confirmation of exactly what landed and where.
//
// HOW THE ROW IS OWNED BY ME (and RLS stays intact): the write uses Supabase's
// service-role key (auto-injected into the function, server-side only, never sent
// to any client). It sets user_id = OWNER_USER_ID explicitly, so every saved row
// belongs to the owner. The tables' RLS owner-only policies are UNCHANGED — this
// code adds rows; it does not alter any policy or column.
//
// Matches the existing shapes exactly (see db/03_tasks.sql, db/04_events.sql):
// tasks(status 'open', time_bucket, due_date, category_id null = Inbox, source);
// events(start_at/end_at with end >= start). No new columns, no schema change.

import { humanDate, todayYMD, TZ, type Understood } from "./understand.ts";
import { dbConfigured, insert, OWNER_USER_ID, select, update } from "./db.ts";
import { type Guess, guessCategories } from "./categorize.ts";

const SAVE_FAILED = "I understood it, but couldn't save it just now — nothing was saved. Mind sending it again?";

// One item that landed: a pointer for the undo log + the confirmation text.
interface Saved {
  ptr: { table: "tasks" | "events"; id: unknown; title: string };
  full: string; // the standalone confirmation (used verbatim for a single-item capture)
  line: string; // a compact one-liner (used when several items are saved at once)
}

// Record ONE 'create' action covering every item just saved, so "undo" can reverse the
// whole batch and "undo <name>" can reverse one of them (M2). Returns the action's id (so
// a later follow-up item can be appended to the SAME action — M5), or null on failure.
async function logCreate(saved: Saved[]): Promise<string | null> {
  const items = saved.map((s) => ({ table: s.ptr.table, id: s.ptr.id, title: s.ptr.title }));
  const label = saved.length === 1 ? saved[0].ptr.title : `${saved.length} items`;
  const row = await insert("marty_actions", { user_id: OWNER_USER_ID, kind: "create", label, items });
  return row ? String(row.id) : null;
}

// How far ahead of UTC the timezone is (in minutes) at a given instant.
function tzOffsetMinutes(instant: Date): number {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(instant).reduce<Record<string, string>>((a, x) => (a[x.type] = x.value, a), {});
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +(p.hour === "24" ? "0" : p.hour), +p.minute, +p.second);
  return (asUTC - instant.getTime()) / 60000;
}

// A local wall-clock date+time in Europe/Amsterdam -> the correct UTC instant.
// (Assume-as-UTC, then correct by the zone offset; one refine handles DST edges.)
function localToUtc(date: string, time: string): Date {
  const naive = new Date(`${date}T${time}:00Z`).getTime();
  const off1 = tzOffsetMinutes(new Date(naive));
  let utc = naive - off1 * 60000;
  const off2 = tzOffsetMinutes(new Date(utc));
  if (off2 !== off1) utc = naive - off2 * 60000;
  return new Date(utc);
}

// "14:00" -> "15:00" (display only; wraps past midnight for the label).
function plusOneHourClock(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const hh = (h + 1) % 24;
  return `${String(hh).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Save ONE understood item under the guessed category `cat` (M6); return its pointer +
// confirmation text, or null on failure. The guessed category is SHOWN in the confirmation
// (never silent) and is easily corrected in words. Caller guarantees the item is NOT unsure.
async function saveOne(u: Understood, cat: Guess): Promise<Saved | null> {
  const title = u.title.trim();

  // EVENT — needs a clock time. Default the date to today if none was stated.
  // 1-hour default duration (matches the app's tap-to-create).
  if (u.type === "event" && u.time) {
    const date = u.date || todayYMD();
    const start = localToUtc(date, u.time);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const saved = await insert("events", {
      user_id: OWNER_USER_ID,
      title,
      category_id: cat.id,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
    });
    if (!saved) return null;
    const span = `${humanDate(date)} ${u.time}–${plusOneHourClock(u.time)}`;
    return {
      ptr: { table: "events", id: saved.id, title },
      full: `Saved an EVENT: '${title}', ${span}, ${cat.name}.\nOpen the app to see it on your calendar.`,
      line: `EVENT '${title}' — ${span}, ${cat.name}`,
    };
  }

  // TASK — incl. any event-shaped read that somehow lacked a time. A stated date
  // becomes the DUE DATE (a deadline, not a calendar block). Bucket: no date or
  // today -> 'Today'; any other date -> 'This Week'.
  const today = todayYMD();
  const hasDate = !!u.date;
  const bucket = !hasDate ? "Today" : (u.date === today ? "Today" : "This Week");
  const saved = await insert("tasks", {
    user_id: OWNER_USER_ID,
    title,
    category_id: cat.id,
    status: "open",
    time_bucket: bucket,
    due_date: hasDate ? u.date : null,
    source: "telegram",
  });
  if (!saved) return null;
  const dueStr = hasDate ? `due ${humanDate(u.date)}` : "no due date";
  return {
    ptr: { table: "tasks", id: saved.id, title },
    full: `Saved a TASK: '${title}', ${dueStr}, ${bucket}, ${cat.name}.`,
    line: `TASK '${title}' — ${dueStr}, ${bucket}, ${cat.name}`,
  };
}

// The confirmation text for a set of saved items: one reads exactly as before M2;
// several read as a list with a hint about undo.
function confirmFor(saved: Saved[]): string {
  if (saved.length === 1) return saved[0].full;
  const lines = saved.map((s) => `• ${s.line}`).join("\n");
  return `Saved ${saved.length} items:\n${lines}\n(Text "undo" to remove all ${saved.length}, or "undo <name>" for just one.)`;
}

const FALLBACK_CAT: Guess = { id: null, name: "Inbox" };

// Save each item under its guessed category (M6) and log them as ONE create action (so
// undo treats them as a unit). The categories are guessed in a single call up front.
async function saveBatch(items: Understood[]): Promise<{ saved: Saved[]; actionId: string | null }> {
  const cats = await guessCategories(items.map((i) => i.title.trim()));
  const saved: Saved[] = [];
  for (let i = 0; i < items.length; i++) {
    const s = await saveOne(items[i], cats[i] ?? FALLBACK_CAT);
    if (s) saved.push(s);
  }
  if (saved.length === 0) return { saved, actionId: null };
  const actionId = await logCreate(saved);
  return { saved, actionId };
}

// Save one OR MORE understood items as a single capture action; return the confirmation.
export async function saveItems(items: Understood[]): Promise<string> {
  if (!dbConfigured) return SAVE_FAILED;
  const { saved } = await saveBatch(items);
  return saved.length ? confirmFor(saved) : SAVE_FAILED;
}

// Like saveItems, but also returns the action id + count — so the caller can park a
// follow-up question that completes into the SAME batch action (M5).
export async function saveItemsTracked(items: Understood[]): Promise<{ reply: string; actionId: string | null; count: number }> {
  if (!dbConfigured) return { reply: SAVE_FAILED, actionId: null, count: 0 };
  const { saved, actionId } = await saveBatch(items);
  if (!saved.length) return { reply: SAVE_FAILED, actionId: null, count: 0 };
  return { reply: confirmFor(saved), actionId, count: saved.length };
}

// Save one follow-up item and APPEND it to an existing create action, so the whole batch
// (the items saved up front + this one) still undoes as ONE logical action (M5). If that
// action is gone (e.g. already undone), the item is logged as its own action instead.
export async function appendToAction(actionId: string, item: Understood): Promise<string> {
  if (!dbConfigured) return SAVE_FAILED;
  const [cat] = await guessCategories([item.title.trim()]);
  const s = await saveOne(item, cat ?? FALLBACK_CAT);
  if (!s) return SAVE_FAILED;

  const rows = await select(`marty_actions?id=eq.${actionId}&user_id=eq.${OWNER_USER_ID}&select=items&limit=1`);
  if (rows && rows.length) {
    const existing = Array.isArray(rows[0].items) ? (rows[0].items as unknown[]) : [];
    existing.push({ table: s.ptr.table, id: s.ptr.id, title: s.ptr.title });
    await update(`marty_actions?id=eq.${actionId}&user_id=eq.${OWNER_USER_ID}`, { items: existing });
  } else {
    await logCreate([s]); // the batch is gone → keep this item undoable on its own
  }
  return s.full;
}
