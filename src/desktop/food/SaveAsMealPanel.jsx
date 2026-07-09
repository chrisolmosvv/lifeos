import { useState } from "react";
import { NUTRIENTS } from "./foodCalc";
import { fmtNum } from "../../spine/logic/foodFormat";
import "./foodGoals.css";

// SaveAsMealPanel (V2 P5, Feature A) — the left-rail builder shown while multi-selecting today's FOOD
// entries. Sums the ticked entries' snapshots for a preview, takes a name + a ★, and saves. The SAVE
// is a stepless recipe (createRecipe, done by the caller) — it does NOT log and does NOT touch
// logSnapshot. Shows the picked count; disabled until named + at least one item ticked.
//
// Props: entries (the selected food entries), onSave(name, favourite), onCancel.
export default function SaveAsMealPanel({ entries, onSave, onCancel }) {
  const [name, setName] = useState("");
  const [fav, setFav] = useState(false);

  const total = {};
  for (const k of NUTRIENTS) total[k] = 0;
  for (const e of entries) for (const k of NUTRIENTS) { const v = e[k]; if (typeof v === "number" && Number.isFinite(v)) total[k] += v; }

  const ok = name.trim() !== "" && entries.length > 0;

  return (
    <div className="sam">
      <div className="sam-head">
        <span className="sam-title">Save as a meal</span>
        <span className="sam-count">{entries.length} item{entries.length === 1 ? "" : "s"}</span>
      </div>
      <input className="sam-name" type="text" placeholder="Meal name" value={name} onChange={(e) => setName(e.target.value)} />
      <p className="sam-macros">
        {fmtNum("kcal", total.kcal)} kcal · P{fmtNum("protein", total.protein)} C{fmtNum("carbs", total.carbs)} F{fmtNum("fat", total.fat)}
      </p>
      <label className="sam-fav">
        <input type="checkbox" checked={fav} onChange={(e) => setFav(e.target.checked)} /> ★ favourite
      </label>
      <div className="sam-actions">
        <button type="button" className="fgoal-btn" onClick={onCancel}>Cancel</button>
        <button type="button" className="fgoal-btn fgoal-save" disabled={!ok} onClick={() => onSave(name.trim(), fav)}>Save meal</button>
      </div>
    </div>
  );
}
