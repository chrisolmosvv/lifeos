// LifeOS — Food → cook plan FOOT (3d, mock Q). The live ledger (per-serving kcal in Fraunces + a
// protein/carb/fat colour bar with gram figures, from recipeMacros) · the station legend · the
// A− / A+ / Fit sizing controls with the current percentage · the Finish cook button. The macro
// bar + station colours are the sanctioned A14 fills; everything else stays hairline.

import { STATION, STATION_ORDER, MACRO } from "../../../spine/logic/cookPlanView";
import SizeControls from "./SizeControls";

export default function CookFoot({ perServing, unestimated, fitPct, isManual, onDec, onInc, onFit, onSet, onFinish, hasSession }) {
  const g = (k) => Math.round(perServing?.[k] || 0);
  const parts = ["protein", "carbs", "fat"];
  const totalG = parts.reduce((a, k) => a + g(k), 0) || 1;

  return (
    <div className="cpq-foot">
      <div className="cpq-ledger">
        <div className="cpq-ledger-kcal">
          <span className="cpq-kcal-num tnum">{Math.round(perServing?.kcal || 0)}</span>
          <span className="cpq-kcal-lbl">kcal / serving{unestimated > 0 ? ` · ${unestimated} unestimated` : ""}</span>
        </div>
        <div className="cpq-macro">
          <div className="cpq-macro-bar">
            {parts.map((k) => <span key={k} className="cpq-macro-seg" style={{ width: `${(g(k) / totalG) * 100}%`, background: MACRO[k].color }} />)}
          </div>
          <div className="cpq-macro-nums">
            {parts.map((k) => (
              <span key={k} className="cpq-macro-num"><span className="cpq-macro-dot" style={{ background: MACRO[k].color }} />{g(k)}g <em>{MACRO[k].label}</em></span>
            ))}
          </div>
        </div>
      </div>

      <div className="cpq-legend">
        {STATION_ORDER.map((s) => (
          <span key={s} className="cpq-legend-item"><span className="cpq-legend-dot" style={{ background: STATION[s].color }} />{STATION[s].label}</span>
        ))}
      </div>

      <div className="cpq-foot-ctl">
        <SizeControls pct={fitPct} isManual={isManual} onDec={onDec} onInc={onInc} onFit={onFit} onSet={onSet} />
        <span className="cpq-space-hint">space<em> · next step / clear an overrun</em></span>
        {hasSession && <button type="button" className="cpq-finish" onClick={onFinish}>Finish cook</button>}
      </div>
    </div>
  );
}
