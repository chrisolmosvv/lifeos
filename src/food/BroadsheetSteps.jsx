// BroadsheetSteps — centre column: ruled Fraunces numerals, step text (Inter body), quiet tag
// labels (small-caps), inline duration figures. For parallel recipes, concurrent steps get a
// quiet "▸ MEANWHILE" marker. No cards, no fills, no checkboxes.
import { useMemo } from "react";
import { cookSchedule } from "./cookSchedule";
import { parseDuration } from "./cookTimers";
import { findOverlaps } from "./BroadsheetTiming";
import "./broadsheet.css";

const fmtDuration = (secs) => {
  if (secs == null || secs <= 0) return null;
  if (secs >= 3600) { const h = Math.floor(secs / 3600); const m = Math.round((secs % 3600) / 60); return m > 0 ? `${h} hr ${m} min` : `${h} hr`; }
  return `${Math.round(secs / 60)} min`;
};

const TAG_LABEL = { hands_on: "Hands-on", hands_free: "Hands-free", active_heat: "Active heat" };

export default function BroadsheetSteps({ steps, stepState, onMarkStep }) {
  // Compute which steps overlap (for the inline MEANWHILE marker)
  const concurrent = useMemo(() => {
    const input = (steps || []).map((s, i) => ({
      index: i,
      durationSeconds: s.timer_seconds ?? parseDuration(typeof s.text === "string" ? s.text : ""),
      deps: s.depends_on || undefined,
    }));
    const sched = cookSchedule(input);
    return findOverlaps(sched.schedule);
  }, [steps]);

  return (
    <div className="bs-col bs-col-steps">
      <div className="bs-col-head">
        <span className="bs-col-title">Method</span>
      </div>

      <ol className="bs-step-list">
        {(steps || []).map((s, i) => {
          const dur = fmtDuration(s.timer_seconds);
          const tagLabel = s.tag ? TAG_LABEL[s.tag] || null : null;
          const isConcurrent = concurrent.has(i);
          const sState = stepState ? stepState(i) : "waiting";
          return (
            <li key={i} className={`bs-step${sState === "active" ? " is-active" : ""}${sState === "done" ? " is-done" : ""}`}>
              <button type="button" className="bs-step-tap" onClick={() => onMarkStep?.(i)}>
                <div className="bs-step-head">
                  <span className="bs-step-num">{i + 1}</span>
                  {tagLabel && <span className="bs-step-tag">{tagLabel}</span>}
                  {dur && <span className="bs-step-dur tnum">{dur}</span>}
                  {isConcurrent && <span className="bs-step-meanwhile">▸ meanwhile</span>}
                </div>
                <p className="bs-step-text">{typeof s.text === "string" ? s.text : ""}</p>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
