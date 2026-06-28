import { useEffect, useRef, useState } from "react";
import { searchFoods } from "./foodLoad";
import AmountStep from "./AmountStep";
import ManualForm from "./ManualForm";
import "./foodModal.css";

// AddFoodModal — the centered add-food modal (F6). A debounced live search (saved + OFF + USDA
// via the food-search Edge Function) → pick → the amount step → onLog. A manual affordance opens
// the hand-entry form. Two extra entry points: `presetFood` jumps straight to the amount step
// (quick-add), and a swap reuses the same flow (the caller's onLog updates the existing row).
//
// Props: defaultSlot, presetFood (skip search → amount), title, onLog(food,amount,unit,slot), onClose.

const DEBOUNCE_MS = 350;

export default function AddFoodModal({ defaultSlot, presetFood, title, onLog, onClose }) {
  const [view, setView] = useState("search"); // 'search' | 'manual'
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState(presetFood || null);
  const timer = useRef(null);

  useEffect(() => {
    if (picked || view !== "search") return;
    clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await searchFoods(q);
        setResults(res.results || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer.current);
  }, [query, picked, view]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (picked) {
    return (
      <ModalShell title={picked.name || title || "Amount"} onClose={onClose}>
        <AmountStep
          food={picked}
          defaultSlot={defaultSlot}
          onBack={presetFood ? onClose : () => setPicked(null)}
          onConfirm={(amount, unit, slot) => onLog(picked, amount, unit, slot)}
        />
      </ModalShell>
    );
  }

  if (view === "manual") {
    return (
      <ModalShell title="Enter manually" onClose={onClose}>
        <ManualForm onBack={() => setView("search")} onSave={(food) => setPicked(food)} />
      </ModalShell>
    );
  }

  const q = query.trim();
  return (
    <ModalShell title={title || "Add food"} onClose={onClose}>
      <input
        className="afm-search"
        type="text"
        placeholder="Search foods…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      <div className="afm-results">
        {searching && <p className="afm-hint">Searching…</p>}
        {!searching && q.length >= 2 && results.length === 0 && (
          <p className="afm-hint">No matches — try “enter manually” below.</p>
        )}
        {results.map((f, i) => (
          <button
            key={`${f.source}:${f.source_ref ?? "x"}:${i}`}
            type="button"
            className="afm-row"
            onClick={() => setPicked(f)}
          >
            <span className="afm-name">
              {f.name}
              {f.brand ? <span className="afm-brand"> · {f.brand}</span> : null}
            </span>
            <span className="afm-kcal">{f.per100g?.kcal != null ? `${Math.round(f.per100g.kcal)} kcal/100g` : "—"}</span>
          </button>
        ))}
      </div>
      <button type="button" className="afm-manual" onClick={() => setView("manual")}>+ enter manually</button>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }) {
  return (
    <div className="afm-backdrop" onMouseDown={onClose}>
      <div className="afm" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <div className="afm-head">
          <span className="afm-title">{title}</span>
          <button type="button" className="afm-close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
