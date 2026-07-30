import { useMemo, useState } from "react";
import { balanceView } from "../../spine/logic/gymBalanceGroups";
import { routineView } from "../../spine/logic/gymRoutineBalance";
import { prettyMuscle } from "../../spine/logic/gymFormat";
import GymRadar from "./GymRadar";

// LifeOS — Gym V2 (Piece 8; Piece 19): Body-Part Balance — a radar + a breakdown list, driven by a
// SETS / VOLUME tab. Piece 19 adds a SECOND, orthogonal toggle inline in the ratio header:
//   REGION  (unchanged from Piece 8) — muscles grouped Upper / Lower / Core, %s + trend arrows;
//           anatomical, static REGION map.
//   ROUTINE (new, session-based) — a Push : Pull : Legs ratio (normalised to P+P+L; "Other" sessions
//           shown as a footnote, never folded in) + a per-side muscle breakdown with × deviation-from-
//           even multipliers. A muscle may appear under MORE THAN ONE side (e.g. shoulders under Push
//           AND Pull), each with its own set-count / × scoped to that side.
// The two toggles are independent → four coherent combinations. The radar is UNAFFECTED by Routine/
// Region — it always shows the top muscles by the active metric.

const METRICS = [
  { id: "sets", label: "Sets" },
  { id: "volume", label: "Volume" },
];

// A share change of ≥1 percentage-point reads as movement; within ±1pp is steady. Neutral ink.
function trendArrow(pp) {
  if (pp == null) return null;
  if (pp >= 1) return "↑";
  if (pp <= -1) return "↓";
  return "→";
}

export default function GymBalance({ balance, balancePrior, routineBalance }) {
  const [metric, setMetric] = useState("sets");
  const [mode, setMode] = useState("routine"); // 'routine' | 'region' — orthogonal to metric
  const view = useMemo(
    () => balanceView(balance?.ranked, balancePrior?.ranked, metric),
    [balance, balancePrior, metric],
  );
  const rview = useMemo(() => routineView(routineBalance || {}, metric), [routineBalance, metric]);
  const fmtVal = (v) => (metric === "volume" ? `${Math.round(v).toLocaleString("en-GB")} kg` : `${v} set${v === 1 ? "" : "s"}`);
  const otherNote = metric === "volume"
    ? `+ ${Math.round(rview.otherValue).toLocaleString("en-GB")} kg in uncategorised sessions`
    : `+ ${rview.otherValue} set${rview.otherValue === 1 ? "" : "s"} in uncategorised sessions`;

  // The one-line ratio header, per mode: Push:Pull:Legs (session %, P+P+L only) or Upper:Lower:Core
  // (region grand-%). Both sum to 100 within their own scope.
  const ratioParts = mode === "routine"
    ? rview.ratio.map((r) => ({ key: r.id, label: r.label, num: Math.round(r.pct) }))
    : view.groups.map((g) => ({ key: g.id, label: g.label.split(" ")[0], num: Math.round(g.total) }));

  return (
    <section className="gym-zone gym-balance-zone">
      <div className="gym-bal-head">
        <span className="gym-kicker">Body-part balance</span>
        <div className="gym-tabs gym-tabs--sm" role="tablist" aria-label="Balance metric">
          {METRICS.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={m.id === metric}
              className={m.id === metric ? "gym-tab is-active" : "gym-tab"}
              onClick={() => setMetric(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {!view.hasData ? (
        <p className="gym-ph">No training logged in this window.</p>
      ) : (
        <div className="gym-bal-body">
          <GymRadar radar={view.radar} radarMax={view.radarMax} metric={metric} />
          <div className="gym-bal-listcol">
            <div className="gym-bal-ratio">
              <span className="gym-bal-ratio-nums">
                {ratioParts.map((p, i) => (
                  <span key={p.key} className="gym-bal-ratio-part">
                    {i > 0 && <span className="gym-bal-ratio-sep">:</span>}
                    <span className="gym-bal-ratio-label">{p.label}</span>
                    <b className="gym-bal-ratio-num">{p.num}</b>
                  </span>
                ))}
              </span>
              <button
                type="button"
                className="gym-bal-modetoggle"
                onClick={() => setMode(mode === "routine" ? "region" : "routine")}
                title={`Switch to ${mode === "routine" ? "region" : "routine"} view`}
              >
                ⇄ {mode === "routine" ? "region" : "routine"}
              </button>
            </div>

            {mode === "routine" && rview.otherValue > 0 && (
              <span className="gym-bal-othernote">{otherNote}</span>
            )}

            {mode === "routine" ? (
              <div className="gym-bal-groups">
                {!rview.hasPPL ? (
                  <p className="gym-ph">No Push / Pull / Legs sessions in this window.</p>
                ) : (
                  rview.columns.map((c) => (
                    <div className="gym-bal-group" key={c.id}>
                      <span className="gym-bal-glabel">{c.label}</span>
                      {c.rows.map((r) => (
                        <div className="gym-bal-row2 gym-bal-row2--rt" key={r.muscle} title={`${prettyMuscle(r.muscle)} · ${fmtVal(r.value)}`}>
                          <span className="gym-bal-name">{prettyMuscle(r.muscle)}</span>
                          <span className="gym-bal-mult">{r.mult.toFixed(1)}×</span>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="gym-bal-groups">
                {view.groups.map((b) => (
                  <div className="gym-bal-group" key={b.id}>
                    <span className="gym-bal-glabel">{b.label}</span>
                    {b.rows.map((r) => (
                      <div className="gym-bal-row2" key={r.muscle} title={`${prettyMuscle(r.muscle)} · ${fmtVal(r.value)}`}>
                        <span className="gym-bal-name">{prettyMuscle(r.muscle)}</span>
                        {trendArrow(r.trend) && <span className="gym-bal-trend">{trendArrow(r.trend)}</span>}
                        <span className="gym-bal-pct">{Math.round(r.pct)}%</span>
                      </div>
                    ))}
                    {b.minorRow && (
                      <div className="gym-bal-row2 gym-bal-row2--minor" title={`${b.minorRow.names.map(prettyMuscle).join(", ")} · ${fmtVal(b.minorRow.value)}`}>
                        <span className="gym-bal-name">{b.minorRow.count} minor</span>
                        <span className="gym-bal-pct">{Math.round(b.minorRow.pct)}%</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
