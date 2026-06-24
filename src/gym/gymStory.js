// LifeOS — Health → Gym: the code-templated story headline (PURE — NO AI).
//
// The one "story" line at the top of the Form Guide. It is assembled ENTIRELY from
// the templates below, filled with numbers the calc layer already computed. There
// is NO Gemini, NO API, NO model of any kind — it is a deterministic string
// function (same data → same line), which is exactly why Gym stays free + private
// and the "health data → paid AI" rule (01-architecture) never trips: no health
// data ever leaves for an AI. Reuses gymCalc / gymTrend on the shared gymDates
// (Europe/Amsterdam) — no recompute, no second date path.
//
// TEMPLATES + PRIORITY (first match wins; there is ALWAYS a fallback):
//   0. (0 sessions this week) → "A quiet week on the platform — the Form Guide is
//      ready when you are."
//   1. PR this week          → "New {lift} best: {weight} kg."
//   2. Back after a gap ≥10d → "Back under the bar after {N} days away."
//   3. Volume up ≥ +15%      → "Training volume up {X}% on recent weeks."
//   4. ≥3 sessions this week → "{N} sessions this week — holding the rhythm."
//   5. Volume down ≤ -15%    → "A lighter week — volume down {X}%."
//   6. otherwise (1–2 sess.) → "{N} session(s) logged this week."

import { boxScore, prWeight } from "./gymCalc.js";
import { trendSeries } from "./gymTrend.js";
import { amsYMD, lastNDaysSet } from "./gymDates.js";

const liftKey = (ex) => ex.exercise_template_id || ex.title || "?";
const ms = (iso) => {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
};
const dayMs = (ymd) => Date.parse(`${ymd}T12:00:00Z`);
const NUMS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const word = (n) => (n >= 0 && n <= 10 ? NUMS[n] : String(n));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fmtKg = (w) => (w % 1 === 0 ? String(w) : w.toFixed(1));

// The most RECENT working-set PR set this week → { lift, weight } or null. PR =
// heaviest working weight per lift beating its all-time best (gymCalc.prWeight,
// warm-ups excluded) — the same rule as the box score and the recent-sessions dot.
function weekTopPR(workouts, now) {
  const win = lastNDaysSet(7, now);
  const chrono = workouts.slice().sort((a, b) => ms(a.started_at) - ms(b.started_at));
  const best = {};
  let result = null;
  for (const w of chrono) {
    const inWin = win.has(amsYMD(w.started_at));
    const t = ms(w.started_at);
    for (const ex of w.exercises || []) {
      const top = prWeight(ex.sets);
      if (top == null) continue;
      const key = liftKey(ex);
      if (best[key] == null || top > best[key]) {
        if (inWin && (!result || t > result.t || (t === result.t && top > result.weight))) {
          result = { lift: ex.title || key, weight: top, t };
        }
        best[key] = top;
      }
    }
  }
  return result ? { lift: result.lift, weight: result.weight } : null;
}

// Days between the latest training day and the one before it — but only if the
// latest is within the last 7 days (a genuine "return"). null if <2 training days.
function returnGapDays(workouts, now) {
  const days = [...new Set((workouts || []).map((w) => amsYMD(w.started_at)).filter(Boolean))].sort();
  if (days.length < 2) return null;
  const latest = days[days.length - 1];
  if (!lastNDaysSet(7, now).has(latest)) return null;
  return Math.round((dayMs(latest) - dayMs(days[days.length - 2])) / 86400000);
}

// This week's volume vs the average of the prior (non-zero) weeks, as a percent
// (positive = up). null if there's no prior baseline.
function volumeTrendPct(workouts, now) {
  const { volume } = trendSeries(workouts, { weeks: 5, now });
  const thisWk = volume[volume.length - 1];
  const prior = volume.slice(0, -1).filter((v) => v > 0);
  if (!thisWk || prior.length === 0) return null;
  const avg = prior.reduce((a, b) => a + b, 0) / prior.length;
  return avg > 0 ? (thisWk / avg - 1) * 100 : null;
}

// The headline string. `workouts` = built workouts (gymCalc.buildWorkouts output).
export function storyHeadline(workouts, now = Date.now()) {
  const list = workouts || [];
  const sessions = boxScore(list, 7, now).sessions;

  if (sessions === 0) {
    return "A quiet week on the platform — the Form Guide is ready when you are.";
  }

  const pr = weekTopPR(list, now);
  if (pr) return `New ${pr.lift} best: ${fmtKg(pr.weight)} kg.`;

  const gap = returnGapDays(list, now);
  if (gap != null && gap >= 10) return `Back under the bar after ${gap} days away.`;

  const vol = volumeTrendPct(list, now);
  if (vol != null && vol >= 15) return `Training volume up ${Math.round(vol)}% on recent weeks.`;

  if (sessions >= 3) return `${cap(word(sessions))} sessions this week — holding the rhythm.`;

  if (vol != null && vol <= -15) return `A lighter week — volume down ${Math.round(-vol)}%.`;

  return `${cap(word(sessions))} session${sessions === 1 ? "" : "s"} logged this week.`;
}
