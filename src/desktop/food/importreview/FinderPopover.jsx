// LifeOS — Food → import review FINDER (4a, mock U). The SINGLE resolution surface: the source line
// (read-only), the editable stored name, amount + a unit switcher that converts grams live, the
// full macros, one search box (the EXISTING food-search) with results, and three exits — Confirm ·
// No macros · Remove. Reuses searchFoods + resolvePortion; builds no second search.

import { useEffect, useMemo, useState } from "react";
import { searchFoods } from "../../../spine/data/foodLoad";
import { recipeMacros } from "../../../spine/logic/recipeCalc";
import { resolvePortion, unitOptionsFor } from "../../../spine/logic/portions";

const r = (v) => Math.round(v || 0);

export default function FinderPopover({ ing, itemsById, anchor, onPatch, onResolve, onNoMacros, onRemove, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    let alive = true;
    const t = setTimeout(() => {
      searchFoods(query.trim()).then((res) => { if (alive) setResults((res.results || []).slice(0, 12)); }).catch(() => {});
    }, 220);
    return () => { alive = false; clearTimeout(t); };
  }, [query]);

  const units = useMemo(() => {
    const u = unitOptionsFor(ing.parsedName || ing.name || "");
    ["g", "ml", "tbsp", "tsp"].forEach((x) => { if (!u.includes(x)) u.push(x); });
    if (ing.unit && !u.includes(ing.unit)) u.unshift(ing.unit);
    return u;
  }, [ing.parsedName, ing.name, ing.unit]);

  const macros = recipeMacros([ing], 1, itemsById).total;
  const kcal100 = (c) => r(c?.kcal ?? c?.per100g?.kcal ?? 0);

  const setUnit = (u) => onPatch({ unit: u, grams: resolvePortion(ing.parsedName || ing.name, ing.amount, u) ?? ing.grams });
  const setAmount = (v) => { const a = parseFloat(v); if (!isNaN(a)) onPatch({ amount: a, grams: resolvePortion(ing.parsedName || ing.name, a, ing.unit) ?? Math.round((ing.grams || 0)) }); };
  const pick = (c) => {
    // Store the RAW candidate (per100g nested) — it computes macros now AND caches to food_items at
    // save via ensureFoodItem (which reads source/source_ref/per100g). No food_item_id is set, so a
    // not-yet-cached candidate is cached on the way out rather than trusted as already-stored.
    const key = c.food_item_id || c.id || `sel:${c.source || "x"}:${c.source_ref || c.name}`;
    itemsById[key] = { ...c };
    onPatch({ food_item_id: key, no_macros: false, parsedName: ing.parsedName || c.name });
  };

  const style = { left: Math.min((anchor?.left || 0) + 40, window.innerWidth - 374), top: Math.min((anchor?.top || 0) + 8, window.innerHeight - 420) };

  return (
    <>
      <div className="iv-scrim" onClick={onClose} />
      <div className="iv-pop" style={style}>
        <div className="iv-po">the source said: “{ing.raw_text}”</div>
        <label>save it as</label>
        <input className="iv-nameIn" value={ing.parsedName || ""} onChange={(e) => onPatch({ parsedName: e.target.value })} />
        <label>amount</label>
        <div className="iv-amt">
          <input value={ing.amount ?? ""} onChange={(e) => setAmount(e.target.value)} />
          <div className="iv-us">{units.map((u) => <button key={u} type="button" className={u === ing.unit ? "on" : ""} onClick={() => setUnit(u)}>{u}</button>)}</div>
        </div>
        <div className="iv-macline">
          <span>= <b>{r(ing.grams)} g</b></span><span><b>{r(macros.kcal)}</b> kcal</span>
          <span className="iv-mp"><b>{r(macros.protein)}g</b> P</span><span className="iv-mc"><b>{r(macros.carbs)}g</b> C</span><span className="iv-mf"><b>{r(macros.fat)}g</b> F</span>
        </div>
        <label>matched food</label>
        <input className="iv-search" placeholder="search foods…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
        <div className="iv-res">
          {results.map((c, k) => (
            <button key={c.id || k} type="button" className="iv-rr" onClick={() => pick(c)}>
              <span className="rn">{c.name}</span><span className="rk">{kcal100(c)} kcal/100g</span>
            </button>
          ))}
        </div>
        <div className="iv-pacts">
          <button type="button" className="pri" onClick={onResolve}>Confirm</button>
          <button type="button" onClick={onNoMacros}>No macros</button>
          <button type="button" onClick={onRemove}>Remove</button>
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </>
  );
}
