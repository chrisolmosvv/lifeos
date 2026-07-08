// LifeOS — Health → Sleep & Body (S5): the thin data loader.
//
// FETCH ONLY — no maths. It reads the owner's raw health rows from Supabase
// (sleep_nights / body_metrics / activity_hourly / health_goals) and hands plain
// rows to the pure calc layer (healthStats / healthSleep / healthBody /
// healthActivity). Keeping fetch and maths apart means the calc stays a pure,
// testable unit and this file stays a dumb pipe — exactly like gymLoad.js.
//
// RLS already scopes every table to the owner (auth.uid() = user_id), so these
// are plain selects — no user filter needed in the query. We read through the
// app's normal authenticated client; never the service role.
//
// RANGE GETTERS: every getter takes an inclusive Amsterdam-day window
// [start, end] as "YYYY-MM-DD" strings (the same day strings gymDates produces).
// 7/30/90-day figures are just presets of an arbitrary range, so a future custom
// date-range picker (S6+) reuses these untouched.

import { supabase } from "../../spine/data/supabaseClient.js";

// Supabase caps a select at 1000 rows; a wide range (or many readings/day) can
// exceed that, so page by range — same guard gymLoad uses. `apply` lets a caller
// add filters (.eq/.gte/.lte) to the query before it runs.
async function fetchAll(table, columns, apply = (q) => q) {
  const PAGE = 1000;
  let from = 0;
  const out = [];
  for (;;) {
    const { data, error } = await apply(
      supabase.from(table).select(columns).range(from, from + PAGE - 1),
    );
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data || []));
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

// Sleep nights whose wake-up date (night_date) falls in [start, end], inclusive.
// Ordered oldest-first so the calc layer reads a clean series. `segments` is the
// raw per-night hypnogram (jsonb array of {stage,start,end}; null on older rows) —
// the calc layer ignores it; the Sleep page parses it for the hypnogram (S6).
export function fetchSleep(start, end) {
  return fetchAll(
    "sleep_nights",
    "night_date,in_bed_at,woke_at,asleep_minutes,rem_minutes,core_minutes,deep_minutes,awake_minutes,awakenings,score,source,segments",
    (q) => q.gte("night_date", start).lte("night_date", end).order("night_date", { ascending: true }),
  );
}

// All readings of one body metric_type (e.g. "weight") whose metric_date falls in
// [start, end], inclusive. Multiple readings per day are normal and ALL returned —
// collapsing same-day readings to a daily average is the calc layer's job.
export function fetchBody(metric, start, end) {
  return fetchAll(
    "body_metrics",
    "metric_type,metric_date,value,unit,reading_at,source",
    (q) =>
      q
        .eq("metric_type", metric)
        .gte("metric_date", start)
        .lte("metric_date", end)
        .order("reading_at", { ascending: true }),
  );
}

// All hourly rows of one activity metric_type (steps / active_energy / heart_rate)
// whose day falls in [start, end], inclusive. The calc layer sums steps/energy and
// averages heart_rate per day; this just hands over the raw hours.
export function fetchActivity(metric, start, end) {
  return fetchAll(
    "activity_hourly",
    "metric_type,day,hour,value,unit,source",
    (q) =>
      q
        .eq("metric_type", metric)
        .gte("day", start)
        .lte("day", end)
        .order("day", { ascending: true })
        .order("hour", { ascending: true }),
  );
}

// Every goal row (active and historical). The calc layer picks the newest active
// row per goal_type as the live goal, so we fetch all and let it decide — newest
// first by set_at so that resolution is a simple "first active wins".
export function fetchGoals() {
  return fetchAll(
    "health_goals",
    "goal_type,target_value,unit,direction,set_at,active",
    (q) => q.order("set_at", { ascending: false }),
  );
}
