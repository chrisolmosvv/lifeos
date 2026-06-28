import { useState } from "react";

// ManualForm — enter a food by hand (F6). Name + kcal + P/C/F REQUIRED; fibre/sugar/sodium
// OPTIONAL. A per-100g / per-serving toggle: per-serving entries are NORMALISED to per-100g
// (per100g = value × 100 / servingGrams) and the serving size is stored so its chips work. On
// save the caller inserts the food into food_items and moves to the amount step. No DB here —
// this just builds the normalised food candidate.

const NUM = [
  { key: "kcal", label: "Calories", req: true },
  { key: "protein", label: "Protein (g)", req: true },
  { key: "carbs", label: "Carbs (g)", req: true },
  { key: "fat", label: "Fat (g)", req: true },
  { key: "fibre", label: "Fibre (g)" },
  { key: "sugar", label: "Sugar (g)" },
  { key: "sodium", label: "Sodium (mg)" },
];

const numOrNull = (s) => {
  if (s == null || String(s).trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export default function ManualForm({ onSave, onBack }) {
  const [name, setName] = useState("");
  const [basis, setBasis] = useState("per100g"); // 'per100g' | 'perServing'
  const [servingG, setServingG] = useState("");
  const [vals, setVals] = useState({});

  const req = ["kcal", "protein", "carbs", "fat"];
  const reqOk = name.trim() !== "" && req.every((k) => numOrNull(vals[k]) != null);
  const servingNum = numOrNull(servingG);
  const servingOk = basis === "per100g" || (servingNum != null && servingNum > 0);
  const valid = reqOk && servingOk;

  const save = () => {
    const factor = basis === "perServing" ? 100 / servingNum : 1; // per-serving → per-100g
    const per100g = {};
    for (const f of NUM) {
      const v = numOrNull(vals[f.key]);
      per100g[f.key] = v == null ? null : v * factor;
    }
    onSave({
      name: name.trim(),
      source: "manual",
      source_ref: null,
      brand: null,
      serving: { grams: basis === "perServing" ? servingNum : null, label: null },
      per100g,
    });
  };

  return (
    <div className="manf">
      <label className="manf-field manf-name">
        <span>Name *</span>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>

      <div className="manf-basis">
        <button type="button" className={basis === "per100g" ? "manf-seg is-on" : "manf-seg"} onClick={() => setBasis("per100g")}>per 100 g</button>
        <button type="button" className={basis === "perServing" ? "manf-seg is-on" : "manf-seg"} onClick={() => setBasis("perServing")}>per serving</button>
      </div>
      {basis === "perServing" && (
        <label className="manf-field">
          <span>Serving size *</span>
          <input type="number" inputMode="decimal" min="0" value={servingG} onChange={(e) => setServingG(e.target.value)} /> g
        </label>
      )}

      <div className="manf-grid">
        {NUM.map((f) => (
          <label key={f.key} className="manf-field">
            <span>{f.label}{f.req ? " *" : ""}</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              value={vals[f.key] ?? ""}
              placeholder={f.req ? "required" : "optional"}
              onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
            />
          </label>
        ))}
      </div>

      <div className="amt-actions">
        <button type="button" className="amt-back" onClick={onBack}>‹ Back</button>
        <button type="button" className="amt-log" disabled={!valid} onClick={save}>Save &amp; choose amount</button>
      </div>
    </div>
  );
}
