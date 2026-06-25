// LifeOS — health-ingest: shared payload-validation helpers (used by body.ts + activity.ts).

// Coerce to a finite number, or null if it isn't a real number. A genuine 0 passes
// (e.g. steps = 0); but null/undefined/empty-string/boolean/object do NOT silently
// become 0 the way bare Number() would — a missing value is a skip, not a zero.
export function toFiniteNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const s = v.trim();
    if (s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// Parse an ISO-8601 instant ("…Z" or "…+02:00") to a Date, or null if unparseable.
export function parseInstant(v: unknown): Date | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
