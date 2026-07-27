import { useMemo, useState } from "react";
import { balanceView } from "../../spine/logic/gymBalanceGroups";
import { prettyMuscle } from "../../spine/logic/gymFormat";
import GymRadar from "./GymRadar";

// LifeOS — Gym V2 (Piece 8): Body-Part Balance — a radar + an Upper/Lower/Core grouped list,
// both driven by a SETS / VOLUME tab (they always show the same metric). PAGES with the time
// switcher (the parent passes this window's muscleBalance + the prior window's, for trends).
// Non-muscular groups (cardio/full_body/other) are excluded and %s renormalised — see
// gymBalanceGroups. Neutral/descriptive throughout: no warning styling. Default = Sets (the
// established, bodyweight-fair measure; Volume is dominated by heavy compounds).

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

export default function GymBalance({ balance, balancePrior }) {
  const [metric, setMetric] = useState("sets");
  const view = useMemo(
    () => balanceView(balance?.ranked, balancePrior?.ranked, metric),
    [balance, balancePrior, metric],
  );
  const fmtVal = (v) => (metric === "volume" ? `${Math.round(v).toLocaleString("en-GB")} kg` : `${v} set${v === 1 ? "" : "s"}`);

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
        </div>
      )}
    </section>
  );
}
