// BroadsheetSteps — centre column: ruled Fraunces numerals, step text (Inter body), quiet tag
// labels (small-caps), inline duration figures. No cards, no fills, no checkboxes.
import "./broadsheet.css";

const fmtDuration = (secs) => {
  if (secs == null || secs <= 0) return null;
  if (secs >= 3600) { const h = Math.floor(secs / 3600); const m = Math.round((secs % 3600) / 60); return m > 0 ? `${h} hr ${m} min` : `${h} hr`; }
  return `${Math.round(secs / 60)} min`;
};

const TAG_LABEL = { hands_on: "Hands-on", hands_free: "Hands-free", active_heat: "Active heat" };

export default function BroadsheetSteps({ steps }) {
  return (
    <div className="bs-col bs-col-steps">
      <div className="bs-col-head">
        <span className="bs-col-title">Method</span>
      </div>

      <ol className="bs-step-list">
        {(steps || []).map((s, i) => {
          const dur = fmtDuration(s.timer_seconds);
          const tagLabel = s.tag ? TAG_LABEL[s.tag] || null : null;
          return (
            <li key={i} className="bs-step">
              <div className="bs-step-head">
                <span className="bs-step-num">{i + 1}</span>
                {tagLabel && <span className="bs-step-tag">{tagLabel}</span>}
                {dur && <span className="bs-step-dur tnum">{dur}</span>}
              </div>
              <p className="bs-step-text">{typeof s.text === "string" ? s.text : ""}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
