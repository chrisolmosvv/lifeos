// LifeOS — Food → cook timers (F7): the step-duration PARSER (pure). Reads a duration out of a
// step's text so cooking mode can offer a one-tap timer. Handles "10 min", "1 hour", "90 seconds",
// "1.5 hours", bare "5m"/"30s"/"2h", and RANGES ("8–10 minutes", "8 to 10 min") — for a range we
// take the LOWER end (check sooner; add a manual timer for the extra). The FIRST duration in the
// step wins; a step with no duration → null (no auto-timer; the free manual timer still covers it).

const UNIT = {
  h: 3600, hr: 3600, hrs: 3600, hour: 3600, hours: 3600,
  m: 60, min: 60, mins: 60, minute: 60, minutes: 60,
  s: 1, sec: 1, secs: 1, second: 1, seconds: 1,
};

// → seconds (number) or null. A range's lower bound; the first match if several.
export function parseDuration(text) {
  if (!text) return null;
  const re = /(\d+(?:\.\d+)?)(?:\s*(?:[-–—]|to)\s*\d+(?:\.\d+)?)?\s*(hours?|hrs?|h|minutes?|mins?|min|m|seconds?|secs?|sec|s)\b/i;
  const m = text.match(re);
  if (!m) return null;
  const mult = UNIT[m[2].toLowerCase()];
  if (!mult) return null;
  const secs = Math.round(parseFloat(m[1]) * mult);
  return secs > 0 ? secs : null;
}

// seconds → "M:SS" (or "H:MM:SS" past an hour).
export function fmtClock(total) {
  const s = Math.max(0, Math.round(total));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${mm}:${pad(ss)}`;
}
