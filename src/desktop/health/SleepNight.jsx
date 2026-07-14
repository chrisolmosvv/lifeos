import Hypnogram from "../kit/Hypnogram";
import SleepStageTimeline from "../kit/SleepStageTimeline";
import SleepClockColumns from "../kit/SleepClockColumns";
import SleepClockDial from "../kit/SleepClockDial";
import { parseSegments, proportionBand } from "../../spine/logic/hypnogram";
import { hm, clockTime, clockFromMin } from "../../spine/logic/healthFormat";
import { NIGHT_DEADBAND } from "../../spine/logic/healthStats";

// SleepNight — the "Last night" view (V2 "Stage timeline" layout) + the Week/Month bar
// drill-in. Three FULL-HEIGHT broadsheet columns, full-height hairline rules, chrome
// distributed into the columns (breadcrumb tops LEFT, switcher tops RIGHT, centre clean):
//   LEAD  — a fixed-length JOURNEY spine (in bed ● → duration → woke ○) + a 3-row footer
//           that SPACE-BETWEENs down the rest of the column (Piece 3):
//             row 1  target · goal        row 2  vs 7-night avg · streak
//             row 3  restorative (deep + REM)
//           Respiratory + awakenings were cut in Piece 2 — respiratory lives on Body now.
//   SHEET — the lane-per-stage timeline (fills the height; proportion-band fallback if
//           no segments) + a bottom-pinned 2×2 stage readout (Deep/Core/REM/Awake min+%).
//   RHYTHM— two 12-hour clock DIALS (bed + wake: spread band + avg + median) + the
//           seven-night clock columns. Hidden on a past-night drill-in.
// Raw facts only; snapshot numbers byte-identical to V1 — only the layout/language moved.

const hoursLabel = (min) => `${+(min / 60).toFixed(2)}h`;

// A signed duration: +1h 29m / −12m. hm() already renders the magnitude.
const signedHm = (min) => `${min >= 0 ? "+" : "−"}${hm(Math.abs(Math.round(min)))}`;

// Same PATTERN as the Body hub card's trend marks — inside the band reads flat and stays
// ink; outside it earns the column's one terracotta. The Body card's own 10-minute number
// judges weekly AVERAGES, and on a single night it fired every night (see NIGHT_DEADBAND),
// so the single-night band lives beside it in healthStats: 60 min.
const DUR_BAND = NIGHT_DEADBAND.sleep_duration.abs;

// One fact: an uppercase hairline label over a tabular-figure value.
function Fact({ label, value, accent = false, className = "" }) {
  return (
    <div className={`snv-fact ${className}`}>
      <span className="snv-fact-label">{label}</span>
      <b className={`snv-fact-val tnum ${accent ? "snv-fact-val--move" : ""}`}>{value}</b>
    </div>
  );
}

function GoalCell({ goalMinutes, bedtimeGoalMin, onEdit }) {
  const hasGoal = goalMinutes != null || bedtimeGoalMin != null;
  const text = hasGoal
    ? [goalMinutes != null ? `goal ${hoursLabel(goalMinutes)}` : null, bedtimeGoalMin != null ? `by ${clockFromMin(bedtimeGoalMin)}` : null]
        .filter(Boolean)
        .join(" · ")
    : "Set a sleep goal";
  const body = (
    <>
      <span className="snv-fact-label">goal</span>
      <b className="snv-fact-val tnum">{text}</b>
    </>
  );
  return onEdit ? (
    <button type="button" className="snv-fact snv-fact--btn" onClick={(e) => onEdit(e.currentTarget)}>
      {body}
    </button>
  ) : (
    <div className="snv-fact">{body}</div>
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
  rolling7Avg, // sv.rolling[7].avg — last-night view only (it is anchored to today)
  streak, // sv.streak  — ditto
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
          <div className="health-chrome">
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

  // ── Footer facts, all COMPUTE-ON-READ from data already on the page (no new fetch).
  // vs 7-night avg: last night's duration minus the rolling 7-night average.
  const durDelta =
    Number.isFinite(detail.asleepMinutes) && Number.isFinite(rolling7Avg)
      ? detail.asleepMinutes - rolling7Avg
      : null;
  const durMoving = durDelta != null && Math.abs(durDelta) > DUR_BAND;

  // Restorative = deep + REM. No getter combines them (checked), and none is needed: both
  // minutes are already on `detail`, so this is a two-field sum — derived, never stored.
  // % is of time ASLEEP, matching how the stage readout below computes every other %.
  const deepMin = detail.stages.deep.min;
  const remMin = detail.stages.rem.min;
  const restMin = Number.isFinite(deepMin) && Number.isFinite(remMin) ? deepMin + remMin : null;
  const restPct =
    restMin != null && Number.isFinite(detail.asleepMinutes) && detail.asleepMinutes > 0
      ? Math.round((restMin / detail.asleepMinutes) * 100)
      : null;
  const restText = restMin != null ? `${restMin} min${restPct != null ? ` · ${restPct}%` : ""}` : "—";

  const streakText = Number.isFinite(streak?.streak)
    ? `${streak.streak} night${streak.streak === 1 ? "" : "s"}`
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

        {/* Three rows, space-between down whatever height the column has left. */}
        <div className="snv-footer">
          <div className="snv-footer-row">
            <Fact label="target" value={targetText} />
            <GoalCell goalMinutes={goalMinutes} bedtimeGoalMin={bedtimeGoalMin} onEdit={onEditSleepGoal} />
          </div>

          {/* Row 2 is anchored to TODAY (a rolling average and a live streak), so it is
              shown for last night only — on a past-night drill-in it would be a lie. */}
          {isLastNight && (
            <div className="snv-footer-row">
              <Fact
                label="vs 7-night avg"
                value={durDelta != null ? signedHm(durDelta) : "—"}
                accent={durMoving}
              />
              <Fact label="streak" value={streakText} />
            </div>
          )}

          <div className="snv-footer-row snv-footer-row--full">
            <Fact label="restorative (deep + REM)" value={restText} />
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
          {/* Piece 4: same 7 nights, new prop shape. `averages` and `onDrill` exist on the
              component but are deliberately NOT passed here — Last-night's look stays as the
              owner verified it, and Piece 5 is what turns them on. */}
          {today && (
            <SleepClockColumns rows={weekRows} end={today} days={7} goalMinutes={goalMinutes} />
          )}
        </aside>
      )}
    </div>
  );
}
