import { Movement, Trace, JourneyBar, Band } from "./BodyCells";
import BodyChart from "./BodyChart";
import { fmtFull } from "./bodyFormat";
import { shiftYMD } from "../gym/gymDates";
import { DEADBAND } from "./healthStats";
import { goalProgress, baselineBand, fixedBand, windowDelta } from "./healthBodyRange";
import { activityDaysHit } from "./healthActivity";

// LifeOS — Body (V2 P2): builds the Latest view's 3-group table config (Composition /
// Energy / Vitals) with per-cell treatments. Extracted from BodyPage to keep it under the
// size guard. Two-source: Composition/Vitals from body_metrics (healthBody), Energy from
// activity_hourly daily totals (healthActivity). Pure: takes the computed view-models +
// raw rows + goalMap + the openEditor handler, returns the groups array BodyTable renders.
export function buildLatestGroups({ body, activity, rowsByMetric, activityRows, goalMap, today, openEditor }) {
  // ── body_metrics cells (Composition + Vitals) ──
  const fmt = (m) => (Number.isFinite(body?.[m]?.latestRaw?.value) ? fmtFull(m, body[m].latestRaw.value) : "—");
  const move = (m) => <Movement metric={m} trend={body?.[m]?.trend} />;
  const trace = (m) => <Trace metric={m} series={body?.[m]?.rolling?.[90]?.values || []} />;
  const journey = (m, promptText) => (
    <JourneyBar
      metric={m}
      goalProg={goalProgress(rowsByMetric[m], goalMap.get(m) ?? null, { end: today })}
      onEdit={(el) => openEditor(m, el)}
      promptText={promptText}
    />
  );
  const avg7 = (m) => body?.[m]?.rolling?.[7]?.avg ?? null;
  const vAvg = (m) => (Number.isFinite(avg7(m)) ? fmtFull(m, avg7(m)) : "—");
  const personalBand = (m) => {
    const bb = baselineBand(rowsByMetric[m], { end: today });
    const a = avg7(m);
    if (!bb.hasEnoughData || !Number.isFinite(a)) {
      return <span className="bt-target-none">band at 14 · {bb.n}/14</span>;
    }
    return <Band metric={m} band={{ lo: bb.lo, hi: bb.hi, value: a, personal: true }} />;
  };

  // ── activity_hourly cells (Energy) — daily totals, completed-days only ──
  const eFmt = (m) => (Number.isFinite(activity?.[m]?.latestCompleted?.value) ? fmtFull(m, activity[m].latestCompleted.value) : "—");
  const eMove = (m) => <Movement metric={m} trend={activity?.[m]?.trend} />;
  const eTrace = (m) => <Trace metric={m} series={activity?.[m]?.rolling?.[90]?.values || []} />;
  const moveGoal = (m) => {
    const goal = goalMap.get(m);
    if (!goal || goal.target_value == null) {
      return (
        <button type="button" className="bt-target-btn bt-target-prompt" onClick={(e) => openEditor(m, e.currentTarget)}>
          set a move goal
        </button>
      );
    }
    const end = activity?.[m]?.completedThrough ?? today;
    // A move-goal is always "hit at least" — direction is up regardless of how the goal
    // row was stored (the GoalEditor infers direction from value, wrong for move-goals;
    // correct goal-set wiring is a flagged follow-up).
    const dh = activityDaysHit(activityRows[m], { target: goal.target_value, direction: "up", end, days: 7 });
    return <span className="bt-target-dayshit">{dh ? `${dh.hit}/${dh.total} days hit` : "—"}</span>;
  };

  const restingHasData = (activityRows?.resting_energy?.length || 0) > 0;
  const restingRow = restingHasData
    ? { label: "Resting energy", latest: eFmt("resting_energy"), movement: eMove("resting_energy"), trace: eTrace("resting_energy"), target: <span className="bt-target-none">trend only</span> }
    : { label: "Resting energy", greyed: true, latest: "—", movement: "—", trace: "—", target: <span className="bt-target-none">waiting for first sync</span> };

  return [
    {
      name: "Composition",
      freshness: "now",
      rows: [
        { label: "Weight", latest: fmt("weight"), movement: move("weight"), trace: trace("weight"), target: journey("weight", "set a goal weight") },
        { label: "Body fat", latest: fmt("body_fat"), movement: move("body_fat"), trace: trace("body_fat"), target: journey("body_fat", "set a body-fat goal") },
        { label: "Lean mass", latest: fmt("lean_mass"), movement: move("lean_mass"), trace: trace("lean_mass"), target: <span className="bt-target-none">trend only</span> },
        { label: "BMI", latest: fmt("bmi"), movement: move("bmi"), trace: trace("bmi"), target: <Band metric="bmi" band={fixedBand("bmi", body?.bmi?.latestDaily?.value)} /> },
      ],
    },
    {
      name: "Energy",
      freshness: "to yesterday",
      rows: [
        { label: "Active energy", latest: eFmt("active_energy"), movement: eMove("active_energy"), trace: eTrace("active_energy"), target: moveGoal("active_energy") },
        restingRow,
      ],
    },
    {
      name: "Vitals",
      freshness: "7-day",
      rows: [
        { label: "Resting HR", latest: vAvg("resting_heart_rate"), movement: move("resting_heart_rate"), trace: trace("resting_heart_rate"), target: personalBand("resting_heart_rate") },
        { label: "Respiratory", latest: vAvg("respiratory_rate"), movement: move("respiratory_rate"), trace: trace("respiratory_rate"), target: personalBand("respiratory_rate") },
        { label: "Blood oxygen", latest: vAvg("blood_oxygen"), movement: move("blood_oxygen"), trace: trace("blood_oxygen"), target: <Band metric="blood_oxygen" band={fixedBand("blood_oxygen", avg7("blood_oxygen"))} /> },
      ],
    },
  ];
}

// The range (Week/Month/90) groups — SAME 3-group table, but LATEST → the range average,
// MOVEMENT → windowDelta, and the trace → a full range line chart with the band/goal
// overlaid (the soft shaded-region band — fixed-clinical for BMI/SpO2, personal p10–p90
// for RHR/resp; weight keeps its goal line). active_energy → its daily-totals series + the
// X/N days-hit over the window. Mirrors buildLatestGroups; consumes existing getters only.
export function buildRangeGroups({ body, activity, rowsByMetric, activityRows, goalMap, today, openEditor }, days) {
  const end = today;
  const windowStart = shiftYMD(end, -(days - 1));
  const rAvg = (m) => body?.[m]?.rolling?.[days]?.avg ?? null;
  const rFmt = (m) => (Number.isFinite(rAvg(m)) ? fmtFull(m, rAvg(m)) : "—");
  const rMove = (m) => <Movement metric={m} trend={windowDelta(rowsByMetric[m], days, { end, deadband: DEADBAND[m] })} />;
  const chartBand = (m) => {
    if (m === "bmi" || m === "blood_oxygen") {
      const fb = fixedBand(m, rAvg(m));
      return fb ? { lo: fb.lo, hi: fb.hi, hasEnoughData: true } : null;
    }
    if (m === "resting_heart_rate" || m === "respiratory_rate") return baselineBand(rowsByMetric[m], { end });
    return null;
  };
  const bChart = (m, goalValue = null) => (
    <BodyChart series={body?.[m]?.rolling?.[days]?.values || []} variant="full" compact metric={m} windowStart={windowStart} windowEnd={end} goalValue={goalValue} band={chartBand(m)} />
  );
  const journey = (m, promptText) => (
    <JourneyBar metric={m} goalProg={goalProgress(rowsByMetric[m], goalMap.get(m) ?? null, { end })} onEdit={(el) => openEditor(m, el)} promptText={promptText} />
  );
  const bandVerdict = (m) => {
    if (m === "bmi" || m === "blood_oxygen") return <Band metric={m} band={fixedBand(m, rAvg(m))} />;
    const bb = baselineBand(rowsByMetric[m], { end });
    const a = rAvg(m);
    if (!bb.hasEnoughData || !Number.isFinite(a)) return <span className="bt-target-none">band at 14 · {bb.n}/14</span>;
    return <Band metric={m} band={{ lo: bb.lo, hi: bb.hi, value: a, personal: true }} />;
  };

  // Energy (activity daily totals; window ends yesterday — partial today excluded).
  const eAvg = (m) => activity?.[m]?.rolling?.[days]?.avg ?? null;
  const eFmt = (m) => (Number.isFinite(eAvg(m)) ? fmtFull(m, eAvg(m)) : "—");
  const eEnd = (m) => activity?.[m]?.completedThrough ?? shiftYMD(end, -1);
  // NOTE: active_energy MOVEMENT uses the 7-day weekOverWeek (activity has no range-windowed
  // delta getter — a windowed activity delta would be new calc, deliberately not added).
  const eMove = (m) => <Movement metric={m} trend={activity?.[m]?.trend} />;
  const eChart = (m) => {
    const e = eEnd(m);
    return <BodyChart series={activity?.[m]?.rolling?.[days]?.values || []} variant="full" compact metric={m} windowStart={shiftYMD(e, -(days - 1))} windowEnd={e} />;
  };
  const moveGoal = (m) => {
    const goal = goalMap.get(m);
    if (!goal || goal.target_value == null) {
      return <button type="button" className="bt-target-btn bt-target-prompt" onClick={(e) => openEditor(m, e.currentTarget)}>set a move goal</button>;
    }
    const dh = activityDaysHit(activityRows[m], { target: goal.target_value, direction: "up", end: eEnd(m), days });
    return <span className="bt-target-dayshit">{dh ? `${dh.hit}/${dh.total} days hit` : "—"}</span>;
  };

  const restingHasData = (activityRows?.resting_energy?.length || 0) > 0;
  const restingRow = restingHasData
    ? { label: "Resting energy", latest: eFmt("resting_energy"), movement: eMove("resting_energy"), trace: eChart("resting_energy"), target: <span className="bt-target-none">trend only</span> }
    : { label: "Resting energy", greyed: true, latest: "—", movement: "—", trace: "—", target: <span className="bt-target-none">waiting for first sync</span> };

  return [
    {
      name: "Composition",
      freshness: `${days}-day avg`,
      rows: [
        { label: "Weight", latest: rFmt("weight"), movement: rMove("weight"), trace: bChart("weight", goalMap.get("weight")?.target_value ?? null), target: journey("weight", "set a goal weight") },
        { label: "Body fat", latest: rFmt("body_fat"), movement: rMove("body_fat"), trace: bChart("body_fat"), target: journey("body_fat", "set a body-fat goal") },
        { label: "Lean mass", latest: rFmt("lean_mass"), movement: rMove("lean_mass"), trace: bChart("lean_mass"), target: <span className="bt-target-none">trend only</span> },
        { label: "BMI", latest: rFmt("bmi"), movement: rMove("bmi"), trace: bChart("bmi"), target: bandVerdict("bmi") },
      ],
    },
    {
      name: "Energy",
      freshness: `${days}-day`,
      rows: [
        { label: "Active energy", latest: eFmt("active_energy"), movement: eMove("active_energy"), trace: eChart("active_energy"), target: moveGoal("active_energy") },
        restingRow,
      ],
    },
    {
      name: "Vitals",
      freshness: `${days}-day avg`,
      rows: [
        { label: "Resting HR", latest: rFmt("resting_heart_rate"), movement: rMove("resting_heart_rate"), trace: bChart("resting_heart_rate"), target: bandVerdict("resting_heart_rate") },
        { label: "Respiratory", latest: rFmt("respiratory_rate"), movement: rMove("respiratory_rate"), trace: bChart("respiratory_rate"), target: bandVerdict("respiratory_rate") },
        { label: "Blood oxygen", latest: rFmt("blood_oxygen"), movement: rMove("blood_oxygen"), trace: bChart("blood_oxygen"), target: bandVerdict("blood_oxygen") },
      ],
    },
  ];
}
