// LifeOS — shared date/time logic for edge functions.
//
// All date/time reasoning is in the owner's local timezone (Europe/Amsterdam) —
// the SAME timezone and the SAME "today" definition the telegram capture function
// uses, so "today" means exactly the same thing in the brief as in capture.
//
// (The telegram function still carries its own copy of these helpers for now;
// the brief uses this shared module. Pointing telegram at this file too is a safe
// later cleanup — left untouched here to keep the working capture flow byte-for-
// byte unchanged.)

export const TZ = "Europe/Amsterdam";

// Today's calendar date as YYYY-MM-DD in the owner's timezone.
export function todayYMD(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

// The plain calendar date `days` after `ymd` (YYYY-MM-DD), as a date string.
// Noon-UTC avoids any timezone date-shift while doing the day arithmetic.
export function addDaysYMD(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

// "2026-06-25" -> "Thu 25 Jun" (in Europe/Amsterdam). Noon-UTC avoids any
// timezone date-shift when formatting a bare calendar date.
export function humanDate(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  if (isNaN(d.getTime())) return ymd;
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).format(d);
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
export function localToUtc(date: string, time: string): Date {
  const naive = new Date(`${date}T${time}:00Z`).getTime();
  const off1 = tzOffsetMinutes(new Date(naive));
  let utc = naive - off1 * 60000;
  const off2 = tzOffsetMinutes(new Date(utc));
  if (off2 !== off1) utc = naive - off2 * 60000;
  return new Date(utc);
}

// The current hour (0-23) in the owner's timezone. The scheduled brief fires at both
// 05:00 and 06:00 UTC and proceeds only when this is 7 — so exactly one run lands in
// the 7am Amsterdam hour year-round, with no manual daylight-saving switching.
export function localHour(): number {
  const h = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(new Date());
  const n = parseInt(h, 10);
  return n === 24 ? 0 : n;
}

// Whole days from one calendar date to another (toYmd - fromYmd). Noon-UTC on both
// sides cancels any DST hour so the difference is a clean day count.
export function daysBetweenYMD(fromYmd: string, toYmd: string): number {
  const a = new Date(`${fromYmd}T12:00:00Z`).getTime();
  const b = new Date(`${toYmd}T12:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

// A UTC instant -> a short local clock label, e.g. "2:00pm" (Europe/Amsterdam).
export function clockLabel(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true }).formatToParts(d);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  const ap = (parts.find((p) => p.type === "dayPeriod")?.value ?? "").toLowerCase();
  return `${hour}:${minute}${ap}`;
}

// A UTC instant -> the local calendar date (YYYY-MM-DD) in the owner's timezone.
export function localYMD(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

// A UTC instant -> the local clock time as HH:MM 24-hour in the owner's timezone.
export function localHM(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const hm = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  return hm === "24:00" ? "00:00" : hm;
}

// The same calendar date `n` years later (YYYY-MM-DD). Noon-UTC avoids any DST shift;
// Feb 29 in a non-leap target year rolls to Mar 1 (a rare, acceptable edge).
export function addYearsYMD(ymd: string, n: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + n);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

// Belt-and-suspenders guard for a BARE month-day (no year stated): if it landed before
// today, roll it forward a year (repeat for safety) so a bare date never means the past.
// Only call this for dates the model flagged as bare — never for relative refs like
// "yesterday", which are legitimately in the past.
export function rollPastBareDateForward(ymd: string): string {
  let d = ymd;
  const today = todayYMD(); // YYYY-MM-DD strings compare chronologically
  let guard = 0;
  while (d && d < today && guard < 5) {
    d = addYearsYMD(d, 1);
    guard++;
  }
  return d;
}
