import Hypnogram from "../kit/Hypnogram";
import SleepStageTimeline from "../kit/SleepStageTimeline";
import SleepClockColumns from "../kit/SleepClockColumns";
import SleepClockDial from "../kit/SleepClockDial";
import { parseSegments, proportionBand } from "./hypnogram";
import { hm, clockTime, clockFromMin } from "./healthFormat";

// SleepNight — the "Last night" view (V2 "Stage timeline" layout) + the Week/Month bar
// drill-in. Three FULL-HEIGHT broadsheet columns, full-height hairline rules, chrome
// distributed into the columns (breadcrumb tops LEFT, switcher tops RIGHT, centre clean):
//   LEAD  — a fixed-length JOURNEY spine (in bed ● → duration → woke ○) + a 2×2 footer
//           of paired facts (target / goal / respiratory / awakenings).
//   SHEET — the lane-per-stage timeline (fills the height; proportion-band fallback if
//           no segments) + a bottom-pinned 2×2 stage readout (Deep/Core/REM/Awake min+%).
//   RHYTHM— two 12-hour clock DIALS (bed + wake: spread band + avg + median) + the
//           seven-night clock columns. Hidden on a past-night drill-in.
// Raw facts only; snapshot numbers byte-identical to V1 — only the layout/language moved.

const hoursLabel = (min) => `${+(min / 60).toFixed(2)}h`;

function GoalCell({ goalMinutes, bedtimeGoalMin, onEdit }) {
  const hasGoal = goalMinutes != null || bedtimeGoalMin != null;
  const text = hasGoal
    ? [goalMinutes != null ? `goal ${hoursLabel(goalMinutes)}` : null, bedtimeGoalMin != null ? `by ${clockFromMin(bedtimeGoalMin)}` : null]
        .filter(Boolean)
        .join(" · ")
    : "Set a sleep goal";
  const body = (
    <>
      <span className="sleep-label">goal</span>
      <b>{text}</b>
    </>
  );
  return onEdit ? (
    <button type="button" className="snv-pair snv-pair--btn" onClick={(e) => onEdit(e.currentTarget)}>
      {body}
    </button>
  ) : (
    <div className="snv-pair">{body}</div>
  );
}

export default function SleepNight({
  detail,
  isLastNight,
  heading,
  segments,
  goalMinutes,
  bedtimeGoalMin,
  bedtimeVsGoal,
  rhythm,
  showConsistency = true,
  weekRows,
  respValue,
  today,
  breadcrumb,
  switcher,
  onEditSleepGoal,
  onNudgeToWeek,
}) {
  if (!detail) {
    return (
      <div className="sleep-night-v2 sleep-night-v2--empty">
        {(breadcrumb || switcher) && (
          <div className="sleep-chrome">
            {breadcrumb}
            {switcher}
          </div>
        )}
        {heading && <h2 className="sleep-night-heading">{heading}</h2>}
        <div className="sleep-empty">
          <p className="sleep-empty-title">No sleep recorded {isLastNight ? "last night" : "for this night"}.</p>
          {onNudgeToWeek && (
            <button type="button" className="sleep-link" onClick={onNudgeToWeek}>
              See the week →
            </button>
          )}
        </div>
      </div>
    );
  }

  const blocks = parseSegments(segments);
  const band = blocks.length === 0 ? proportionBand(detail.stages) : null;

  const stageCells = [
    { key: "deep", label: "Deep", s: detail.stages.deep },
    { key: "core", label: "Core", s: detail.stages.core },
    { key: "rem", label: "REM", s: detail.stages.rem },
    { key: "awake", label: "Awake", s: detail.stages.awake },
  ];

  const targetText = bedtimeVsGoal
    ? `${clockFromMin(bedtimeVsGoal.target)} · ${bedtimeVsGoal.met ? "on time" : `${Math.round(Math.abs(bedtimeVsGoal.delta))} min late`}`
    : "—";

  return (
    <div className={showConsistency ? "sleep-night-v2" : "sleep-night-v2 sleep-night-v2--drill"}>
      <section className="snv-lead">
        {breadcrumb}
        {heading && <h2 className="sleep-night-heading">{heading}</h2>}
        <div className="journey">
          <div className="journey-node">
            <span className="journey-dot journey-dot--filled" />
            <div className="journey-node-txt">
              <span className="sleep-label">in bed</span>
              <b>{clockTime(detail.inBedAt)}</b>
            </div>
          </div>
          <div className="journey-spine">
            <span className="journey-dur">{hm(detail.asleepMinutes)}</span>
          </div>
          <div className="journey-node">
            <span className="journey-dot journey-dot--hollow" />
            <div className="journey-node-txt">
              <span className="sleep-label">woke</span>
              <b>{clockTime(detail.wokeAt)}</b>
            </div>
          </div>
        </div>

        <div className="snv-footer">
          <div className="snv-pair">
            <span className="sleep-label">target</span>
            <b>{targetText}</b>
          </div>
          <GoalCell goalMinutes={goalMinutes} bedtimeGoalMin={bedtimeGoalMin} onEdit={onEditSleepGoal} />
          <div className="snv-pair">
            <span className="sleep-label">respiratory</span>
            <b>{Number.isFinite(respValue) ? `${respValue.toFixed(1)} /min` : "—"}</b>
          </div>
          <div className="snv-pair">
            <span className="sleep-label">awakenings</span>
            <b>
              {Number.isFinite(detail.awakenings) ? detail.awakenings : "—"}
              {Number.isFinite(detail.stages.awake.min) ? ` · ${detail.stages.awake.min}m awake` : ""}
            </b>
          </div>
        </div>
      </section>

      <section className="snv-sheet">
        {blocks.length > 0 ? (
          <SleepStageTimeline blocks={blocks} />
        ) : (
          <Hypnogram blocks={[]} band={band} inBedAt={detail.inBedAt} wokeAt={detail.wokeAt} goalMinutes={goalMinutes} />
        )}
        <div className="snv-stagemini">
          {stageCells.map((st) => (
            <div className="snv-mini" key={st.key}>
              <span className="sleep-label">
                <span className={`hyp-dot hyp-${st.key}`} />
                {st.label}
              </span>
              <b>{Number.isFinite(st.s.min) ? `${st.s.min} min` : "—"}</b>
              <em className="snv-mini-pct">{Number.isFinite(st.s.pct) ? `${st.s.pct}%` : "—"}</em>
            </div>
          ))}
        </div>
      </section>

      {showConsistency && rhythm && (
        <aside className="snv-rhythm">
          <div className="snv-rhythm-head">{switcher}</div>
          <div className="snv-dials">
            <SleepClockDial label="Bed" min={rhythm.bedMin} max={rhythm.bedMax} avg={rhythm.bedAvgMin} median={rhythm.bedMedMin} />
            <SleepClockDial label="Wake" min={rhythm.wakeMin} max={rhythm.wakeMax} avg={rhythm.wakeAvgMin} median={rhythm.wakeMedMin} />
          </div>
          <div className="snv-dial-key">
            <span className="dk-avg">|</span> avg&nbsp;&nbsp;<span className="dk-med">○</span> median&nbsp;&nbsp;· band = spread
          </div>
          {today && <SleepClockColumns rows={weekRows} today={today} />}
        </aside>
      )}
    </div>
  );
}
