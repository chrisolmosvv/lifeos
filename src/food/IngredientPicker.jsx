import { useEffect, useRef, useState } from "react";
import { searchFoods } from "./foodLoad";
import { ensureFoodItem } from "./recipeWrite";
import { resolvePortion, unitOptionsFor, portionLabel } from "./portions";
import "./foodModal.css";

// IngredientPicker — add a recipe ingredient (F7). Reuses the F6 food search + cache-on-log, but
// the amount step is PORTIONS-aware: a unit selector (g / cup / tbsp / tsp / item) → resolvePortion
// → grams stored as the ingredient's amount, with raw_text keeping the label. An off-list unit →
// a grams prompt; none given → the ingredient is marked no-macros. A free-text path adds an
// unmatched ingredient (no macros). onAdd(ingredient, foodCandidate|null).

const DEBOUNCE_MS = 350;

export default function IngredientPicker({ onAdd, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState(null);
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState("g");
  const [gramsPrompt, setGramsPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (picked) return;
    clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    timer.current = setTimeout(async () => {
      try { const res = await searchFoods(q); setResults(res.results || []); } catch { setResults([]); } finally { setSearching(false); }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer.current);
  }, [query, picked]);

  const resolvedGrams = picked ? resolvePortion(picked.name, amount, unit) : null;
  const needsGrams = picked && resolvedGrams == null;

  const add = async () => {
    setBusy(true);
    let grams = resolvedGrams;
    if (grams == null) { const g = Number(gramsPrompt); grams = Number.isFinite(g) && g > 0 ? g : null; }
    try {
      const item = await ensureFoodItem(picked);
      const food = { ...picked, food_item_id: item.id };
      const ing = grams != null
        ? { food_item_id: item.id, raw_text: portionLabel(amount, unit), amount: grams, unit: "g", no_macros: false }
        : { food_item_id: item.id, raw_text: portionLabel(amount, unit), amount: null, unit: null, no_macros: true };
      onAdd(ing, food);
    } catch { setBusy(false); }
  };

  const addFreeText = () => onAdd({ food_item_id: null, raw_text: query.trim() || "ingredient", amount: null, unit: null, no_macros: true }, null);

  return (
    <div className="afm-backdrop" onMouseDown={onClose}>
      <div className="afm" role="dialog" aria-modal="true" aria-label="Add ingredient" onMouseDown={(e) => e.stopPropagation()}>
        <div className="afm-head">
          <span className="afm-title">{picked ? picked.name : "Add ingredient"}</span>
          <button type="button" className="afm-close" aria-label="Close" onClick={onClose}>×</button>
        </div>

        {!picked ? (
          <>
            <input className="afm-search" type="text" placeholder="Search foods…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
            <div className="afm-results">
              {searching && <p className="afm-hint">Searching…</p>}
              {results.map((f, i) => (
                <button key={`${f.source}:${f.source_ref ?? "x"}:${i}`} type="button" className="afm-row" onClick={() => { setPicked(f); setUnit(unitOptionsFor(f.name)[0]); }}>
                  <span className="afm-name">{f.name}{f.brand ? <span className="afm-brand"> · {f.brand}</span> : null}</span>
                  <span className="afm-kcal">{f.per100g?.kcal != null ? `${Math.round(f.per100g.kcal)} kcal/100g` : "—"}</span>
                </button>
              ))}
            </div>
            {query.trim().length >= 2 && (
              <button type="button" className="afm-manual" onClick={addFreeText}>Add “{query.trim()}” as text (no macros)</button>
            )}
          </>
        ) : (
          <div className="amt">
            <div className="amt-chips">
              {unitOptionsFor(picked.name).map((u) => (
                <button key={u} type="button" className={u === unit ? "amt-chip is-on" : "amt-chip"} onClick={() => setUnit(u)}>{u}</button>
              ))}
            </div>
            <label className="amt-field">
              <input type="number" inputMode="decimal" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <span>{unit}</span>
            </label>
            {needsGrams && (
              <label className="amt-field">
                <input type="number" inputMode="decimal" min="0" placeholder="grams" value={gramsPrompt} onChange={(e) => setGramsPrompt(e.target.value)} />
                <span>g (this unit isn’t in the table — enter grams, or leave blank to skip macros)</span>
              </label>
            )}
            <p className="amt-preview">
              {resolvedGrams != null ? `${Math.round(resolvedGrams)} g` : gramsPrompt ? `${Math.round(Number(gramsPrompt))} g` : "no macros (unestimated)"}
            </p>
            <div className="amt-actions">
              <button type="button" className="amt-back" onClick={() => setPicked(null)}>‹ Back</button>
              <button type="button" className="amt-log" disabled={busy} onClick={add}>Add ingredient</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
