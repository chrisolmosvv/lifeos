import { useMemo, useState } from "react";
import { boxScore } from "../../spine/logic/gymCalc";
import { consistencyGrid } from "../../spine/logic/gymConsistency";
import { routineBalance, routineView } from "../../spine/logic/gymRoutineBalance";
import { heatmapGrade, muscleBaseline } from "./hubCalc";
import { prettyMuscle } from "../../spine/logic/gymFormat";
import { whole } from "../../spine/logic/healthFormat";
import "./hubGym.css";

// HubGymSection — the Hub's full-width TOP HALF. LEFT = a compact consistency line over
// a big BINARY calendar heatmap (trained = terracotta, rest = cream, today outlined).
// RIGHT = a Push:Pull:Legs split bar + muscle-vs-baseline bars, with a single Sets/Volume
// toggle on the PPL header that switches BOTH together (the heatmap is unaffected). Every
// number is compute-on-read from the SAME calc the Gym detail page uses. `built` =
// buildWorkouts output; the whole section taps through to that detail page.

const DOW = ["M", "T", "W", "T", "F", "S", "S"];

// Segment big-number: sets → count; volume → compact kg ("18.2k").
const segNum = (v, metric) =>
  metric === "volume" ? (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))) : String(v);

export default function HubGymSection({ built, now, onOpen }) {
  const [metric, setMetric] = useState("sets"); // drives the PPL split + muscle bars

  const m = useMemo(() => {
    const box = boxScore(built, 30, now);
    const cg = consistencyGrid(built, { weeks: 13, now });
    const heat = heatmapGrade(built, { now });
    const ppl = routineView(routineBalance(built, { days: 30, now }), metric);
    const mb = muscleBaseline(built, { days: 30, now, metric });
    return { box, cg, heat, ppl, mb };
  }, [built, now, metric]);

  const pplColor = { push: "var(--ppl-push)", pull: "var(--ppl-pull)", legs: "var(--ppl-legs)" };
  const legendVal = (v) => (metric === "volume" ? `${whole(v)} kg` : `${v} set${v === 1 ? "" : "s"}`);

  return (
    <button type="button" className="hgym" onClick={onOpen}>
      <div className="hgym-col hgym-left">
        <div className="hgym-topline">
          <span className="hgym-topnum">{m.box.sessions}</span>
          <span className="hgym-topcap">
            sessions · last 30 days · avg {m.cg.average.toFixed(1)}/week · {m.cg.streak}-week streak
          </span>
        </div>

        <div className="hgym-heat">
          <div className="hgym-heat-dow">
            {DOW.map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="hgym-heat-grid" aria-label="Training days, last 5 weeks">
            {m.heat.days.map((d) => (
              <span
                key={d.ymd}
                className={`hgym-cell ${d.trained ? "is-trained" : ""} ${d.isToday ? "is-today" : ""} ${d.isFuture ? "is-future" : ""}`}
                title={`${d.ymd}${d.trained ? " · trained" : d.isFuture ? "" : " · rest"}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="hgym-col hgym-right">
        <div className="hgym-head">
          <span className="hgym-label">Push · Pull · Legs balance</span>
          <span className="hgym-toggle" role="group" aria-label="Balance metric">
            {["sets", "volume"].map((k) => (
              <span
                key={k}
                className={`hgym-toggle-opt ${metric === k ? "is-on" : ""}`}
                onClick={(e) => { e.stopPropagation(); setMetric(k); }}
              >
                {k === "sets" ? "Sets" : "Volume"}
              </span>
            ))}
          </span>
        </div>

        {m.ppl.hasPPL ? (
          <>
            <div className="hgym-split" aria-label="Push Pull Legs split">
              {m.ppl.ratio.map((r) => (
                r.pct > 0 ? (
                  <span key={r.id} className="hgym-seg" style={{ width: `${r.pct}%`, background: pplColor[r.id] }}>
                    <span className="hgym-seg-num">{segNum(r.value, metric)}</span>
                  </span>
                ) : null
              ))}
            </div>
            <div className="hgym-legend">
              {m.ppl.ratio.map((r) => (
                <span className="hgym-legend-item" key={r.id}>
                  <span className="hgym-dot" style={{ background: pplColor[r.id] }} />
                  {r.label} {legendVal(r.value)}
                </span>
              ))}
            </div>

            <div className="hgym-muscles">
              {m.mb.bars.map((b) => (
                <div className="hgym-mrow" key={b.name}>
                  <span className="hgym-mname">{prettyMuscle(b.name)}</span>
                  <span className="hgym-mtrack">
                    <span
                      className="hgym-mfill"
                      style={{ width: `${m.mb.maxMult ? (b.mult / m.mb.maxMult) * 100 : 0}%`, background: pplColor[b.ppl] }}
                    />
                  </span>
                  <span className="hgym-mmult">{b.mult.toFixed(1)}×</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="hgym-empty">No sessions in the last 30 days.</div>
        )}
      </div>

      <span className="hub-detail-cue" aria-hidden="true">detail ›</span>
    </button>
  );
}
