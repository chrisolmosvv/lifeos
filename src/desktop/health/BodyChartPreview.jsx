import { useEffect, useMemo, useState } from "react";
import { amsTodayYMD, shiftYMD, humanDayLong } from "../../spine/logic/gymDates";
import { fetchBody, fetchGoals } from "../../spine/data/healthLoad";
import { resolveGoals } from "../../spine/logic/healthGoals";
import { smoothedSeries, GOAL_ZONE_TOLERANCE_KG } from "../../spine/logic/bodyComposition";
import { fmtFull } from "../../spine/logic/bodyFormat";
import BodyCompositionChart from "../kit/BodyCompositionChart";
import RangeSwitcher from "../kit/RangeSwitcher";

// ⚠️ THROWAWAY — Body V3 Piece 3 verify harness. Mounted behind #body-chart-preview in
// LoggedIn.jsx so the owner can see the composition chart on the 13" BEFORE Piece 4 wires
// it into the real Body page. It fakes the Piece-4 hero numbers (weight + body fat above
// the chart, following the scrub) purely to prove the interaction. DELETE this file + the
// two hook lines in LoggedIn.jsx when Piece 4 lands.

const START = "2026-01-01";
const RANGES = [
  { id: "7", label: "Week" },
  { id: "30", label: "Month" },
  { id: "90", label: "90 days" },
  { id: "all", label: "All" },
];

export default function BodyChartPreview() {
  const [state, setState] = useState({ loading: true });
  const [range, setRange] = useState("30");
  const [scrub, setScrub] = useState(null);

  useEffect(() => {
    const now = Date.now();
    const today = amsTodayYMD(now);
    (async () => {
      const [goals, weightRows, bodyFatRows] = await Promise.all([
        fetchGoals(), fetchBody("weight", START, today), fetchBody("body_fat", START, today),
      ]);
      const goalMap = resolveGoals(goals);
      setState({ loading: false, today, weightRows, bodyFatRows, weightGoal: goalMap.get("weight") ?? null });
    })().catch((e) => setState({ loading: false, error: e.message || String(e) }));
  }, []);

  const { today, weightRows, bodyFatRows, weightGoal } = state;
  const windowStart = useMemo(() => {
    if (!today) return null;
    if (range === "all") return START;
    return shiftYMD(today, -(Number(range) - 1));
  }, [range, today]);

  // Default hero = today's latest weigh-in + its 7-day smoothed value.
  const todayHero = useMemo(() => {
    if (!weightRows) return null;
    const ws = smoothedSeries(weightRows, { smooth: 7 });
    const fs = smoothedSeries(bodyFatRows, { smooth: 7, withBand: false });
    const w = ws[ws.length - 1] || null;
    const f = fs[fs.length - 1] || null;
    return { w, f };
  }, [weightRows, bodyFatRows]);

  if (state.loading) return <div style={wrap}>Loading Body chart preview…</div>;
  if (state.error) return <div style={{ ...wrap, color: "#a33" }}>Error: {state.error}</div>;

  // The heroes: scrubbed day if hovering, else today.
  const wVal = scrub ? scrub.weightRaw : todayHero?.w?.raw ?? null;
  const wAvg = scrub ? scrub.weightSmoothed : todayHero?.w?.smoothed ?? null;
  const fVal = scrub ? (scrub.bodyFatRaw ?? scrub.bodyFatSmoothed) : todayHero?.f?.smoothed ?? null;
  const caption = scrub ? humanDayLong(scrub.ymd) : "7-day avg";

  return (
    <div style={wrap}>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-muted)" }}>
        Body V3 · Piece 3 preview (throwaway) · ± goal-zone tolerance {GOAL_ZONE_TOLERANCE_KG} kg
      </p>

      <div style={{ display: "flex", justifyContent: "flex-end", margin: "4px 0 12px" }}>
        <RangeSwitcher ranges={RANGES} value={range} ariaLabel="Preview range" onChange={setRange} />
      </div>

      {/* Faux Piece-4 heroes — Fraunces numbers, follow the scrub */}
      <div style={{ display: "flex", gap: 40, marginBottom: 8 }}>
        <div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 40, lineHeight: 1 }}>
            {Number.isFinite(wVal) ? fmtFull("weight", wVal) : "—"}
          </div>
          <div style={hint}>weight · {Number.isFinite(wAvg) ? `${caption} ${fmtFull("weight", wAvg)}` : caption}</div>
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 40, lineHeight: 1, color: "var(--accent)" }}>
            {Number.isFinite(fVal) ? fmtFull("body_fat", fVal) : "—"}
          </div>
          <div style={hint}>body fat · {caption}</div>
        </div>
      </div>

      <BodyCompositionChart
        weightRows={weightRows} bodyFatRows={bodyFatRows}
        windowStart={windowStart} windowEnd={today}
        weightGoal={weightGoal} today={today} onScrub={setScrub}
      />
      <p style={hint}>Hover the chart to scrub · leave it to return to today. Weight goal:{" "}
        {weightGoal?.target_value != null ? `${fmtFull("weight", weightGoal.target_value)}` : "none set"}</p>
    </div>
  );
}

const wrap = { padding: 24, maxWidth: 760, margin: "0 auto", fontFamily: "var(--font-sans)", color: "var(--ink)" };
const hint = { fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--ink-muted)", marginTop: 4 };
