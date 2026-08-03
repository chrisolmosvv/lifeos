// LifeOS — Food → cook plan, one step ROW (Piece 3a, dormant). Full method text (never clipped),
// its planned duration (does NOT count down), station colour, activity tag, a quiet prep marker,
// and the ingredients this step uses with servings-scaled amounts. Nothing here is live.

import { STATION, TAG_LABEL, fmtDur, scaledAmount } from "../../../spine/logic/cookPlanView";

export default function CookPlanStep({ n, step, linked, scale }) {
  const st = STATION[step?.station] || null;
  const tag = step?.tag ? TAG_LABEL[step.tag] || step.tag : null;
  const dur = fmtDur(step?.timer_seconds);

  return (
    <li className="cp-step">
      <div className="cp-step-head">
        <span className="cp-step-num tnum">{n}</span>
        {st && (
          <span className="cp-step-station">
            <span className="cp-station-dot" style={{ background: st.color }} aria-hidden="true" />
            <span style={{ color: st.color }}>{st.label}</span>
          </span>
        )}
        {tag && <span className="cp-step-tag">{tag}</span>}
        {step?.is_prep && <span className="cp-step-prep">prep</span>}
        {dur && <span className="cp-step-dur tnum">{dur}</span>}
      </div>

      <p className="cp-step-text">{step?.text}</p>

      {linked && linked.length > 0 && (
        <ul className="cp-step-ings">
          {linked.map(({ ing, idx }) => {
            const amt = scaledAmount(ing, scale);
            return (
              <li key={idx} className="cp-step-ing">
                {amt && <span className="cp-step-ing-amt tnum">{amt.qty}{amt.unit ? ` ${amt.unit}` : ""}</span>}
                <span className="cp-step-ing-text">{ing.raw_text}</span>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
