import { useMemo } from "react";
import SleepRibbon from "./SleepRibbon";
import { parseSegments, proportionBand } from "../../spine/logic/hypnogram";
import { sleepNightPct, restorative } from "./hubCalc";
import { rangeBedWakeAverages } from "../../spine/logic/healthRhythm";
import { amsClockMinutes, shiftYMD } from "../../spine/logic/gymDates";
import { hm, clockTime } from "../../spine/logic/healthFormat";
import "./hubSleep.css";

// HubSleepSection — the Hub's bottom-LEFT quarter. A flowing ribbon hypnogram of last
// night, a stage legend (min + % OF NIGHT), and a 3-cell stat row (asleep ±30-day avg ·
// bed→wake ±avg · restorative). Last night = the night whose wake date is TODAY; if
// there's no such row we show "no data" and never fall back to an older night (the
// locked empty-state rule). Deltas use 30-day averages. `sv` = sleepView; `rows` = raw.

const STAGE_ORDER = [
  { key: "deep", label: "Deep" },
  { key: "core", label: "Core" },
  { key: "rem", label: "REM" },
  { key: "awake", label: "Awake" },
];

// Signed clock delta a−b in minutes, noon-anchored + wrapped to [-720,720] so evening/
// small-hours times subtract without a midnight jump.
function clockDelta(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const anc = (m) => ((m + 720) % 1440 + 1440) % 1440;
  let d = anc(a) - anc(b);
  if (d > 720) d -= 1440;
  if (d < -720) d += 1440;
  return d;
}
const signMin = (d, early, late) =>
  d == null || Math.abs(Math.round(d)) < 1 ? "on time" : `${Math.abs(Math.round(d))}m ${d < 0 ? early : late}`;

export default function HubSleepSection({ sv, rows, now, onOpen }) {
  const view = useMemo(() => {
    const today = sv?.today;
    const ln = sv?.lastNight;
    if (!ln || ln.nightDate !== today) return { empty: true };

    const nightRow = (rows || []).find((r) => r?.night_date === ln.nightDate) || null;
    const blocks = parseSegments(nightRow?.segments);
    const band = blocks.length === 0 ? proportionBand(ln.stages) : null;

    const pct = sleepNightPct(ln.stages);
    const rest = restorative(ln.stages, ln.asleepMinutes);

    const avg30 = sv?.rolling?.[30]?.avg ?? null;
    const asleepDelta = Number.isFinite(ln.asleepMinutes) && Number.isFinite(avg30) ? ln.asleepMinutes - avg30 : null;

    const bw = rangeBedWakeAverages(rows, shiftYMD(today, -29), today);
    const bedClock = amsClockMinutes(ln.inBedAt);
    const wakeClock = amsClockMinutes(ln.wokeAt);

    return {
      empty: false,
      ln,
      blocks,
      band,
      pct,
      rest,
      asleepDelta,
      bedDelta: clockDelta(bedClock, bw.bedAvgMin),
      wakeDelta: clockDelta(wakeClock, bw.wakeAvgMin),
    };
  }, [sv, rows, now]);

  if (view.empty) {
    return (
      <button type="button" className="hslp" onClick={onOpen}>
        <div className="hslp-head"><span className="hub-sec-label">Sleep · last night</span></div>
        <div className="hslp-none">No sleep recorded for last night.</div>
        <span className="hub-detail-cue" aria-hidden="true">detail ›</span>
      </button>
    );
  }

  const { ln, pct, rest, asleepDelta } = view;
  const deltaWord = asleepDelta == null ? null
    : Math.abs(Math.round(asleepDelta)) < 1 ? "on 30-day avg"
    : `${asleepDelta > 0 ? "+" : "−"}${Math.abs(Math.round(asleepDelta))}m vs avg`;

  return (
    <button type="button" className="hslp" onClick={onOpen}>
      <div className="hslp-head">
        <span className="hub-sec-label">Sleep · last night</span>
        <span className="hslp-dur">{hm(ln.asleepMinutes)}</span>
      </div>

      <SleepRibbon blocks={view.blocks} band={view.band} inBedAt={ln.inBedAt} wokeAt={ln.wokeAt} />

      <div className="hslp-legend">
        {STAGE_ORDER.map(({ key, label }) => (
          <span className="hslp-leg-item" key={key}>
            <span className={`hslp-leg-dot hslp-${key}`} />
            {label} {pct[key].min}m · {pct[key].pct ?? 0}%
          </span>
        ))}
      </div>

      <div className="hslp-stats">
        <div className="hslp-stat">
          <span className="hslp-stat-val">{hm(ln.asleepMinutes)}</span>
          <span className="hslp-stat-lab">asleep</span>
          {deltaWord && <span className={`hslp-stat-delta ${asleepDelta > 0 ? "up" : asleepDelta < 0 ? "down" : ""}`}>{deltaWord}</span>}
        </div>
        <div className="hslp-stat">
          <span className="hslp-stat-val">{clockTime(ln.inBedAt)} → {clockTime(ln.wokeAt)}</span>
          <span className="hslp-stat-lab">bed → wake</span>
          <span className="hslp-stat-delta">{signMin(view.bedDelta, "early", "late")} · {signMin(view.wakeDelta, "early", "late")}</span>
        </div>
        <div className="hslp-stat">
          <span className="hslp-stat-val">{rest.pct != null ? `${rest.pct}%` : "—"}</span>
          <span className="hslp-stat-lab">restorative</span>
          <span className="hslp-stat-delta">deep + REM</span>
        </div>
      </div>

      <span className="hub-detail-cue" aria-hidden="true">detail ›</span>
    </button>
  );
}
