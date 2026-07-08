// LifeOS — Health → Gym: display formatting (pure, presentation-only).
//
// The calc layer (gymCalc.js) returns raw numbers; these turn them into the
// strings the Form Guide shows. Units per the locked spec: weight/volume in kg
// with a thousands separator; time as minutes or h:mm. Each returns { num, unit }
// so a zone can set the big "hero" figure (num) in Fraunces and the small unit in
// Inter beside it. Never returns NaN — a missing value becomes a calm "—".

// Volume / any kg figure → { num: "12,345", unit: "kg" }. 0 is shown honestly as "0".
export function formatVolume(kg) {
  const n = Number.isFinite(kg) ? Math.round(kg) : 0;
  return { num: n.toLocaleString("en-GB"), unit: "kg" };
}

// A plain count (sessions, PRs) → { num: "3", unit: "" }.
export function formatCount(n) {
  return { num: String(Number.isFinite(n) ? n : 0), unit: "" };
}

// Minutes → { num, unit }. <=0 or missing → "—" (we can't trust a 0-minute total,
// so it reads as "no time data" rather than a false zero). <60 → "45" / "min";
// otherwise h:mm → "1:20" with no unit (self-evident).
export function formatDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return { num: "—", unit: "" };
  const total = Math.round(minutes);
  if (total < 60) return { num: String(total), unit: "min" };
  const h = Math.floor(total / 60);
  const m = String(total % 60).padStart(2, "0");
  return { num: `${h}:${m}`, unit: "" };
}

// A Hevy muscle-group key → a calm, legible label: "lower_back" → "Lower back";
// a missing muscle or the catch-all "other" → "Other". (G16: the ONE definition,
// replacing three identical copies in SessionExercise / MuscleBalance / GymRecords —
// same output for every value they pass.)
export function prettyMuscle(m) {
  if (!m || m === "other") return "Other";
  return m.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
