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
import { dbConfigured, insert, OWNER_USER_ID } from "./db.ts";

const SAVE_FAILED = "I understood it, but couldn't save it just now — nothing was saved. Mind sending it again?";

// Record a saved item in the undo log so "undo" can later remove this exact row.
// Best-effort: if logging fails the item is still saved; undo just won't see it.
async function logSave(table: "tasks" | "events", id: unknown, title: string) {
  await insert("telegram_saves", { user_id: OWNER_USER_ID, item_table: table, item_id: id, title });
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

// Save the understood item and return the confirmation text. Caller guarantees the
// item is NOT unsure (unsure items save nothing and never reach here).
export async function saveAndConfirm(u: Understood): Promise<string> {
  if (!dbConfigured) return SAVE_FAILED;
  const title = u.title.trim();

  // EVENT — needs a clock time. Default the date to today if none was stated.
  // 1-hour default duration (matches the app's tap-to-create). category null = Inbox.
  if (u.type === "event" && u.time) {
    const date = u.date || todayYMD();
    const start = localToUtc(date, u.time);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const saved = await insert("events", {
      user_id: OWNER_USER_ID,
      title,
      category_id: null,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
    });
    if (!saved) return SAVE_FAILED;
    await logSave("events", saved.id, title);
    return `Saved an EVENT: '${title}', ${humanDate(date)} ${u.time}–${plusOneHourClock(u.time)}, Inbox.\nOpen the app to see it on your calendar.`;
  }

  // TASK — incl. any event-shaped read that somehow lacked a time. A stated date
  // becomes the DUE DATE (a deadline, not a calendar block). Bucket: no date or
  // today -> 'Today'; any other date -> 'This Week'. category null = Inbox.
  const today = todayYMD();
  const hasDate = !!u.date;
  const bucket = !hasDate ? "Today" : (u.date === today ? "Today" : "This Week");
  const saved = await insert("tasks", {
    user_id: OWNER_USER_ID,
    title,
    category_id: null,
    status: "open",
    time_bucket: bucket,
    due_date: hasDate ? u.date : null,
    source: "telegram",
  });
  if (!saved) return SAVE_FAILED;
  await logSave("tasks", saved.id, title);
  const dueStr = hasDate ? `due ${humanDate(u.date)}` : "no due date";
  return `Saved a TASK: '${title}', ${dueStr}, ${bucket}, Inbox.`;
}
