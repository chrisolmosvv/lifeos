// LifeOS — Health → Gym: Archive grouping + totals (PURE — calc-layer shaping).
//
// Takes the recent-session ROWS (gymSessions.recentSessions — each already has a
// dateYMD in the Amsterdam day, volume, minutes, isPR) and groups them by Amsterdam
// MONTH for the Archive, with per-month subtotals and an all-time total. No
// recompute, no second date path — the month key is just the YYYY-MM of the row's
// already-Amsterdam dateYMD.

const TZ = "Europe/Amsterdam";

function monthLabel(key) {
  if (key === "unknown") return "Undated";
  const d = new Date(`${key}-01T12:00:00Z`);
  if (!Number.isFinite(d.getTime())) return key;
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, month: "long", year: "numeric" }).format(d);
}

const sum = (rows, pick) => rows.reduce((t, r) => t + (pick(r) || 0), 0);

// Rows → [{ key, label, rows, sessions, volume, minutes }], newest month first,
// "Undated" last. Each month's subtotal reconciles with its rows.
export function archiveMonths(rows) {
  const map = new Map();
  for (const r of rows || []) {
    const key = r.dateYMD ? r.dateYMD.slice(0, 7) : "unknown";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  }
  return [...map.entries()]
    .sort((a, b) => {
      if (a[0] === "unknown") return 1;
      if (b[0] === "unknown") return -1;
      return a[0] < b[0] ? 1 : -1;
    })
    .map(([key, rs]) => ({
      key,
      label: monthLabel(key),
      rows: rs,
      sessions: rs.length,
      volume: sum(rs, (r) => r.volume),
      minutes: sum(rs, (r) => r.minutes),
    }));
}

// All-time (or filtered-set) totals for the head line.
export function archiveTotals(rows) {
  return {
    sessions: (rows || []).length,
    volume: sum(rows || [], (r) => r.volume),
    minutes: sum(rows || [], (r) => r.minutes),
  };
}

// The set of workout ids whose RESOLVED exercise titles contain `query`
// (case-insensitive substring). null when the query is blank (= show all).
export function matchWorkoutIds(workouts, query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return null;
  const ids = new Set();
  for (const w of workouts || []) {
    if ((w.exercises || []).some((ex) => (ex.title || "").toLowerCase().includes(q))) ids.add(w.id);
  }
  return ids;
}
