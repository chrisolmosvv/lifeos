import { useMemo, useState } from "react";
import { boxScore } from "../../spine/logic/gymCalc";
import { consistencyGrid } from "../../spine/logic/gymConsistency";
import { routineBalance, routineView } from "../../spine/logic/gymRoutineBalance";
import { heatmapGrade, muscleBaseline } from "./hubCalc";
import { prettyMuscle } from "../../spine/logic/gymFormat";
import "./hubGym.css";

// HubGymSection — the Hub's full-width TOP HALF. LEFT = consistency (30-day sessions +
// a graded calendar heatmap with a Sets/Volume toggle). RIGHT = a Push:Pull:Legs split
// bar (by session title, SETS) + the top muscles vs a balanced baseline (×). Every
// number is compute-on-read from the SAME calc the Gym detail page uses (no drift), and
// the whole section taps through to that detail page. `built` = buildWorkouts output.

const DOW = ["M", "T", "W", "T", "F", "S", "S"];

export default function HubGymSection({ built, now, onOpen }) {
  const [metric, setMetric] = useState("sets"); // heatmap grading metric

  const m = useMemo(() => {
    const box = boxScore(built, 30, now);
    const cg = consistencyGrid(built, { weeks: 13, now });
    const heat = heatmapGrade(built, { now });
    const ppl = routineView(routineBalance(built, { days: 30, now }), "sets");
    const mb = muscleBaseline(built, { days: 30, now });
    return { box, cg, heat, ppl, mb };
  }, [built, now]);

  const gradeKey = metric === "volume" ? "gradeVolume" : "gradeSets";
  const pplColor = { push: "var(--ppl-push)", pull: "var(--ppl-pull)", legs: "var(--ppl-legs)" };

  return (
    <button type="button" className="hgym" onClick={onOpen}>
      <div className="hgym-col hgym-left">
        <div className="hgym-head">
          <span className="hgym-label">Consistency</span>
          <span className="hgym-toggle" role="group" aria-label="Heatmap metric">
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

        <div className="hgym-hero">
          <span className="hgym-hero-num">{m.box.sessions}</span>
          <span className="hgym-hero-cap">
            session{m.box.sessions === 1 ? "" : "s"} · last 30 days
          </span>
        </div>
        <div className="hgym-sub">
          avg {m.cg.average.toFixed(1)}/week · {m.cg.streak}-week streak
        </div>

        <div className="hgym-heat">
          <div className="hgym-heat-dow">
            {DOW.map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="hgym-heat-grid" aria-label="Training intensity, last 5 weeks">
            {m.heat.days.map((d) => (
              <span
                key={d.ymd}
                className={`hgym-cell g${d[gradeKey]} ${d.isToday ? "is-today" : ""} ${d.isFuture ? "is-future" : ""}`}
                title={`${d.ymd} · ${d.sets} sets`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="hgym-col hgym-right">
        <span className="hgym-label">Push · Pull · Legs balance</span>

        {m.ppl.hasPPL ? (
          <>
            <div className="hgym-split" aria-label="Push Pull Legs set split">
              {m.ppl.ratio.map((r) => (
                r.pct > 0 ? (
                  <span
                    key={r.id}
                    className="hgym-seg"
                    style={{ width: `${r.pct}%`, background: pplColor[r.id] }}
                  >
                    <span className="hgym-seg-num">{r.value}</span>
                  </span>
                ) : null
              ))}
            </div>
            <div className="hgym-legend">
              {m.ppl.ratio.map((r) => (
                <span className="hgym-legend-item" key={r.id}>
                  <span className="hgym-dot" style={{ background: pplColor[r.id] }} />
                  {r.label} {r.value} set{r.value === 1 ? "" : "s"}
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
                      style={{
                        width: `${m.mb.maxMult ? (b.mult / m.mb.maxMult) * 100 : 0}%`,
                        background: pplColor[b.ppl],
                      }}
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
