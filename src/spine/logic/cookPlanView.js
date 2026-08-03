// LifeOS — Food → cook PLAN view helpers (Piece 3a, PURE, compute-on-read). Presentation-only
// helpers for the dormant plan page: station colours, tag labels, duration formatting, servings-
// scaled ingredient amounts, the plan's display order, and the to-scale band rows. NOTHING here
// reacts to time — the plan is dormant. No schema, no writes.

// ★ Amendment A14: station COLOUR-CODING is sanctioned in the cook module (a deliberate exception
// to the no-colour-coding law). These four are the approved colours — do not "correct" them.
export const STATION = {
  bench: { label: "Bench", color: "#3B6B6B" },
  hob:   { label: "Hob",   color: "#A87B3A" },
  oven:  { label: "Oven",  color: "#A85C44" },
  rest:  { label: "Rest",  color: "#4E789C" },
};
// The order stations stack in the band (a fixed, calm order; only present stations render).
export const STATION_ORDER = ["bench", "hob", "oven", "rest"];

export const TAG_LABEL = { hands_on: "Hands-on", hands_free: "Hands-free", active_heat: "Active heat" };

// seconds → a plain planned time ("12 min", "1 h 05"). null when there's no duration.
export function fmtDur(secs) {
  const s = Number(secs);
  if (!Number.isFinite(s) || s <= 0) return null;
  const m = Math.round(s / 60);
  if (m < 1) return `${Math.round(s)}s`;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), mm = m % 60;
  return mm ? `${h} h ${String(mm).padStart(2, "0")}` : `${h} h`;
}

// A clock time from an epoch ms, in the owner's local time — "18:42". Used for deadlines + serve.
export function fmtClockTime(ms) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// A live countdown for the cook (3b). >=0 → "12:34"; NEGATIVE (overrun) → "+2:14 over" — it keeps
// counting up past zero, never freezes.
export function fmtRemaining(sec) {
  const s = Math.round(Number(sec) || 0);
  const abs = Math.abs(s);
  const disp = `${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;
  return s < 0 ? `+${disp} over` : disp;
}

// A servings-scaled amount for one ingredient. Prefer the confirmed grams (2a), else the stored
// amount+unit (which the import already resolved). null when neither exists (show the raw line only).
export function scaledAmount(ing, scale) {
  const g = Number(ing?.grams);
  if (Number.isFinite(g) && g > 0) return { qty: Math.round(g * scale), unit: "g" };
  const a = Number(ing?.amount);
  if (Number.isFinite(a) && a > 0) {
    const q = a * scale;
    return { qty: Math.round(q * 10) / 10, unit: ing.unit || "" };
  }
  return null;
}

// The band's rows: one per station that actually appears (in STATION_ORDER), plus a final
// unlabelled row for steps with no station. Each block carries its %-left and %-width from the
// schedule. Steps with zero duration are skipped (nothing to draw to scale).
export function bandRows(steps, schedule, finish) {
  if (!finish || finish <= 0) return [];
  const byStation = {};
  (steps || []).forEach((step, i) => {
    const e = schedule && schedule[i];
    if (!e || e.duration <= 0) return;
    const key = STATION[step?.station] ? step.station : "_none";
    (byStation[key] ||= []).push({
      index: i,
      step,
      left: (e.startOffset / finish) * 100,
      width: Math.max((e.duration / finish) * 100, 1.5),
    });
  });
  const rows = [];
  for (const key of STATION_ORDER) if (byStation[key]) rows.push({ station: key, blocks: byStation[key] });
  if (byStation._none) rows.push({ station: null, blocks: byStation._none });
  return rows;
}
