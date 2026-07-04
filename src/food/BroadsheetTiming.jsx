// BroadsheetTiming — right column PLACEHOLDER (Piece 3). A static vertical list of steps with
// their durations and tags. Stands in for the lane visualisation (Piece 4). Calm, minimal, looks
// intentional — not a broken lane chart.
import "./broadsheet.css";

const fmtDur = (secs) => {
  if (secs == null || secs <= 0) return "—";
  if (secs >= 3600) return `${Math.floor(secs / 3600)}h ${Math.round((secs % 3600) / 60)}m`;
  return `${Math.round(secs / 60)}m`;
};

const TAG_SHORT = { hands_on: "on", hands_free: "free", active_heat: "heat" };

export default function BroadsheetTiming({ steps }) {
  const total = (steps || []).reduce((sum, s) => sum + (s.timer_seconds || 0), 0);

  return (
    <div className="bs-col bs-col-timing">
      <div className="bs-col-head">
        <span className="bs-col-title">Timing</span>
        {total > 0 && <span className="bs-timing-total tnum">{fmtDur(total)}</span>}
      </div>

      <ul className="bs-timing-list">
        {(steps || []).map((s, i) => (
          <li key={i} className="bs-timing-row">
            <span className="bs-timing-n">{i + 1}</span>
            <span className="bs-timing-dur tnum">{fmtDur(s.timer_seconds)}</span>
            {s.tag && <span className="bs-timing-tag">{TAG_SHORT[s.tag] || ""}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
