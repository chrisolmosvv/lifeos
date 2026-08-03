// LifeOS — Food → cook plan BAND (Piece 3a, dormant). A horizontal strip showing the whole cook
// to scale: one row per station, each step a block positioned by cookSchedule's existing output.
// Uses the schedule as given — NO scheduling logic here, and nothing live.

import { STATION, bandRows } from "../../../spine/logic/cookPlanView";

export default function CookBand({ steps, schedule, finish }) {
  const rows = bandRows(steps, schedule, finish);
  if (rows.length === 0) return null; // no durations → nothing to draw to scale

  return (
    <div className="cp-band" aria-hidden="true">
      {rows.map((row) => {
        const st = row.station ? STATION[row.station] : null;
        return (
          <div key={row.station || "_none"} className="cp-band-row">
            <span className="cp-band-label" style={st ? { color: st.color } : undefined}>
              {st ? st.label : "—"}
            </span>
            <div className="cp-band-track">
              {row.blocks.map((b) => (
                <div
                  key={b.index}
                  className="cp-band-block"
                  style={{ left: `${b.left}%`, width: `${b.width}%`, background: st ? st.color : "#8A857E" }}
                  title={`${b.index + 1}. ${(b.step.text || "").split(/\s+/).slice(0, 6).join(" ")}`}
                >
                  <span className="cp-band-num tnum">{b.index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
