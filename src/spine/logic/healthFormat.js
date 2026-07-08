// LifeOS — Health Hub: display formatting (PURE, presentation-only).
//
// The calc layer (src/health/…) and the gym calc return raw numbers; these turn
// them into the strings the hub cards show. Presentation only — no data logic,
// no Amsterdam-day bucketing (that's gymDates). Mirrors gymFormat.js in spirit.

import { amsYMD, amsTodayYMD, shiftYMD } from "./gymDates.js";

// "Friday 26 June" — the quiet hub dateline (NO year, NO wordmark). Amsterdam.
export function dateLine(now = Date.now()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now instanceof Date ? now : new Date(now));
}

// Minutes → "7h 26m" (or "26m" under an hour). null/NaN/≤0 → "—".
export function hm(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "—";
  const t = Math.round(minutes);
  const h = Math.floor(t / 60);
  const m = t % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// A timestamp/ISO/Date → how old it is in plain words, by Amsterdam CALENDAR day:
// same day → "today", 1 → "yesterday", n → "n days ago". null for missing.
export function ageLabel(value, now = Date.now()) {
  if (value == null) return null;
  const ymd = amsYMD(value);
  if (!ymd) return null;
  const today = amsTodayYMD(now);
  if (ymd === today) return "today";
  for (let i = 1; i <= 60; i++) {
    if (shiftYMD(today, -i) === ymd) return i === 1 ? "yesterday" : `${i} days ago`;
  }
  return ymd; // older than 60 days — just show the date
}

// A timestamp/ISO/Date → "23:14" (Amsterdam clock time). "—" for missing.
export function clockTime(value) {
  if (value == null) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

// Minutes-after-midnight → "23:14" (for S5's clock outputs: bedtime spread,
// circular-mean bedtime/wake, by_time goal targets). "—" for non-finite.
export function clockFromMin(min) {
  if (!Number.isFinite(min)) return "—";
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

// A kg figure → "86.1 kg" (1 dp). null/NaN → "—".
export function kg(v) {
  return Number.isFinite(v) ? `${v.toFixed(1)} kg` : "—";
}

// A whole-number figure with thousands separators ("12,345"). null/NaN → "—".
export function whole(v) {
  return Number.isFinite(v) ? Math.round(v).toLocaleString("en-GB") : "—";
}

// A timestamp → "26 Jun, 07:31" (Amsterdam) for the "as of" freshness line. The
// hub passes the most recent UNDERLYING reading timestamp here (not the calc time).
export function asOf(value) {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}
