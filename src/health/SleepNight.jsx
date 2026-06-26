import Hypnogram from "../kit/Hypnogram";
import BedWakeBand from "../kit/BedWakeBand";
import { parseSegments, proportionBand, regularityLabel } from "./hypnogram";
import { hm, clockTime, clockFromMin } from "./healthFormat";

// SleepNight — the Night view (also reused by the Week/Month bar drill-in in piece 3).
// Section order is built to fit desktop zero-scroll: Hero → bed/wake → stages → rest.
// Raw facts only, no verdict text. Renders the no-data and no-goal states.
//
// detail = the S5 lastNight-shaped object for the night (null = no data). segments =
// that night's raw jsonb (null → proportion-band fallback). The aggregates
// (consistency, goal) come straight from S5.
export default function SleepNight({
  detail,
  isLastNight,
  segments,
  goalMinutes,
  bedtimeVsGoal,
  consistency,
  weekRows,
  respValue,
  hasGoal,
  onNudgeToWeek,
}) {
  if (!detail) {
    return (
      <div className="sleep-night">
        <div className="sleep-empty">
          <p className="sleep-empty-title">No sleep recorded {isLastNight ? "last night" : "for this night"}.</p>
          <button type="button" className="sleep-link" onClick={onNudgeToWeek}>
            See the week →
          </button>
        </div>
      </div>
    );
  }

  const blocks = parseSegments(segments);
  const band = blocks.length === 0 ? proportionBand(detail.stages) : null;
  const reg = regularityLabel(consistency?.stdDevMin);

  const stages = [
    { key: "rem", label: "REM", s: detail.stages.rem },
    { key: "core", label: "Core", s: detail.stages.core },
    { key: "deep", label: "Deep", s: detail.stages.deep },
    { key: "awake", label: "Awake", s: detail.stages.awake },
  ];

  return (
    <div className="sleep-night">
      <section className="sleep-hero">
        <div className="sleep-duration">{hm(detail.asleepMinutes)}</div>
        <Hypnogram
          blocks={blocks}
          band={band}
          inBedAt={detail.inBedAt}
          wokeAt={detail.wokeAt}
          goalMinutes={goalMinutes}
        />
      </section>

      <section className="sleep-row">
        <div className="sleep-bedwake">
          <span className="sleep-label">in bed → woke</span>
          <span className="sleep-bedwake-times">
            {clockTime(detail.inBedAt)} → {clockTime(detail.wokeAt)}
          </span>
          {bedtimeVsGoal && (
            <span className="sleep-bedtime-goal">
              target {clockFromMin(bedtimeVsGoal.target)} ·{" "}
              {bedtimeVsGoal.met ? "on time" : `${Math.round(Math.abs(bedtimeVsGoal.delta))} min late`}
            </span>
          )}
        </div>
        <div className="sleep-consistency">
          <span className="sleep-label">bedtime consistency</span>
          {Number.isFinite(consistency?.stdDevMin) ? (
            <span>
              ±{Math.round(consistency.stdDevMin)} min{reg ? `, ${reg}` : ""}
            </span>
          ) : (
            <span className="sleep-muted">not enough nights yet</span>
          )}
          <BedWakeBand rows={weekRows} />
        </div>
      </section>

      <section className="sleep-stages">
        {stages.map((st) => (
          <div className="sleep-stage" key={st.key}>
            <span className={`hyp-dot hyp-${st.key}`} />
            <span className="sleep-stage-label">{st.label}</span>
            <span className="sleep-stage-min">{Number.isFinite(st.s.min) ? `${st.s.min} min` : "—"}</span>
            <span className="sleep-stage-pct">{Number.isFinite(st.s.pct) ? `${st.s.pct}%` : "—"}</span>
          </div>
        ))}
      </section>

      <section className="sleep-rest">
        <div className="sleep-rest-item">
          <span className="sleep-label">awakenings</span>
          <span>
            {Number.isFinite(detail.awakenings) ? detail.awakenings : "—"}
            {Number.isFinite(detail.stages.awake.min) ? ` · ${detail.stages.awake.min} min awake` : ""}
          </span>
        </div>
        <div className="sleep-rest-item">
          <span className="sleep-label">respiratory rate</span>
          <span>{Number.isFinite(respValue) ? `${respValue.toFixed(1)} /min` : "—"}</span>
        </div>
      </section>

      {!hasGoal && (
        <p className="sleep-goalprompt">
          Set a sleep goal to track progress. <span className="sleep-muted">(coming soon)</span>
        </p>
      )}
    </div>
  );
}
