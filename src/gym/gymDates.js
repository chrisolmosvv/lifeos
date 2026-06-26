// LifeOS — Health → Gym: the ONE date definition for every gym metric.
//
// All gym day-reasoning is in the owner's timezone (Europe/Amsterdam) — the SAME
// "what day is it" the rest of the app uses (the edge functions' _shared/datetime.ts
// uses this identical Intl definition). We REPLICATE that definition here rather
// than importing the server module: _shared/datetime.ts is Deno/server code under
// supabase/functions/, not importable into src/ (and importing it would cross the
// two-track boundary). Same rule, front-end copy.
//
// Why this exists: the box score, training-days and streak must all bucket a
// session by its Amsterdam CALENDAR DAY — not by a rolling 168-hour instant, and
// not by the machine's local clock — so "the last 7 days" means the same thing no
// matter what time of day the page is opened.

const TZ = "Europe/Amsterdam";

const _ymd = (d, tz) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

// A UTC instant / ISO string / Date / ms → its Amsterdam calendar date "YYYY-MM-DD".
// Returns null for a missing/unparseable value (never throws, never NaN).
export function amsYMD(value) {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isFinite(d.getTime()) ? _ymd(d, TZ) : null;
}

// Today's Amsterdam calendar date "YYYY-MM-DD" (defaults to now).
export function amsTodayYMD(now = Date.now()) {
  return amsYMD(now);
}

// The calendar date `delta` days from `ymd` (delta may be negative), as "YYYY-MM-DD".
// Noon-UTC arithmetic cancels any DST hour so the day count is always clean — the
// same trick _shared/datetime.ts uses.
export function shiftYMD(ymd, delta) {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return _ymd(d, "UTC");
}

// The set of the last `n` Amsterdam calendar days, ending today (today + the n-1
// prior days). n=7 → today and the 6 days before it.
export function lastNDaysSet(n, now = Date.now()) {
  const today = amsTodayYMD(now);
  const out = new Set();
  for (let i = 0; i < n; i++) out.add(shiftYMD(today, -i));
  return out;
}

// Clock time-of-day in MINUTES AFTER MIDNIGHT, Amsterdam local, for a timestamp /
// ISO string / Date. e.g. an in_bed_at of 23:30 Amsterdam → 1410. null for a
// missing/unparseable value. The day helpers above answer WHICH day a moment
// belongs to; this answers the time WITHIN that day (added for Sleep's bedtime
// reasoning — same single Amsterdam TZ definition, no new timezone helper).
export function amsClockMinutes(value) {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  let h = 0, m = 0;
  for (const p of parts) {
    if (p.type === "hour") h = Number(p.value);
    if (p.type === "minute") m = Number(p.value);
  }
  return (h % 24) * 60 + m; // hour12:false can render midnight as "24"; fold it to 0
}

// "2026-06-18" → "18 Jun" (Amsterdam). Noon-UTC avoids any date-shift. For axis labels.
export function humanDayShort(ymd) {
  const d = new Date(`${ymd}T12:00:00Z`);
  if (!Number.isFinite(d.getTime())) return ymd;
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short" }).format(d);
}

// "2026-06-18" → "Thursday 18 June 2026" (Amsterdam). For the session-report header.
export function humanDayLong(ymd) {
  const d = new Date(`${ymd}T12:00:00Z`);
  if (!Number.isFinite(d.getTime())) return ymd;
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
}
