// LifeOS — Food → END-OF-COOK REVIEW (3e). Finishing a cook opens this: an itemised list of every
// change the cook proposed, grouped into TIMING and AMOUNTS, each Keep/Drop (default KEEP). Kept
// changes persist to the recipe (via updateRecipe). If nothing changed, it says so. An optional
// "log this cook" rides along. Abandoning never reaches here — that path is a silent discard.

import { useState } from "react";
import { fmtDur } from "../../../spine/logic/cookPlanView";

export default function CookReview({ changes, kcalPerServing, servings, onSave, onCancel, saving }) {
  const allKeys = [...changes.timing.map((c) => c.key), ...changes.amounts.map((c) => c.key)];
  const [kept, setKept] = useState(() => new Set(allKeys)); // default Keep
  const [alsoLog, setAlsoLog] = useState(false);
  const toggle = (k) => setKept((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const nothing = allKeys.length === 0;
  const keptCount = allKeys.filter((k) => kept.has(k)).length;

  return (
    <div className="cpq-review-scrim" role="dialog" aria-modal="true">
      <div className="cpq-review">
        <h2 className="cpq-review-h">Finish cook</h2>

        {nothing ? (
          <p className="cpq-review-empty">Nothing changed this cook — the recipe stays as it is.</p>
        ) : (
          <>
            {changes.timing.length > 0 && (
              <section className="cpq-review-grp">
                <div className="cpq-review-grp-h">Timing</div>
                {changes.timing.map((c) => (
                  <label key={c.key} className={`cpq-review-item${kept.has(c.key) ? "" : " is-dropped"}`}>
                    <input type="checkbox" checked={kept.has(c.key)} onChange={() => toggle(c.key)} />
                    <span className="cpq-review-what">Step {c.step + 1}</span>
                    <span className="cpq-review-delta tnum">{fmtDur(c.from) || "—"} → {fmtDur(c.to)}</span>
                    <span className="cpq-review-src">{c.source === "actual" ? "as cooked" : "you set"}</span>
                  </label>
                ))}
              </section>
            )}
            {changes.amounts.length > 0 && (
              <section className="cpq-review-grp">
                <div className="cpq-review-grp-h">Amounts</div>
                {changes.amounts.map((c) => (
                  <label key={c.key} className={`cpq-review-item${kept.has(c.key) ? "" : " is-dropped"}`}>
                    <input type="checkbox" checked={kept.has(c.key)} onChange={() => toggle(c.key)} />
                    <span className="cpq-review-what">{c.label}</span>
                    <span className="cpq-review-delta tnum">{c.omit ? "left out" : `${c.from} → ${c.to}`}</span>
                  </label>
                ))}
              </section>
            )}
          </>
        )}

        <label className="cpq-review-log">
          <input type="checkbox" checked={alsoLog} onChange={(e) => setAlsoLog(e.target.checked)} />
          Log this cook to today · {Math.round(kcalPerServing || 0)} kcal × {servings}
        </label>

        <div className="cpq-review-foot">
          <button type="button" className="cpq-review-cancel" onClick={onCancel} disabled={saving}>Back to cook</button>
          <button type="button" className="cpq-review-save" onClick={() => onSave(kept, alsoLog)} disabled={saving}>
            {nothing ? "Finish" : `Save ${keptCount} & finish`}
          </button>
        </div>
      </div>
    </div>
  );
}
