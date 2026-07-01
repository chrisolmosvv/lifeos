import { useEffect, useMemo, useRef, useState } from "react";
import { searchFoods } from "../foodLoad";
import ManualForm from "../ManualForm";
import { zoneResults } from "./finderConfig";
import FinderResults from "./FinderResults";
import FinderAmount from "./FinderAmount";
import "../foodModal.css";
import "./finder.css";

// Finder — the CONVERGED finder (V2 P2): one search/pick/amount component, context-switched by
// `finderConfig` (logger vs recipe). Reads P1's FLAT results + additive envelope {top3, dbSuppressed,
// note} — never reshapes or mutates a record. Picks flow to the shared amount step, then out via
// onResolve(food, { amount, unit, grams, slot }) — the consumer builds its own object (log entry /
// ingredient). Manual entry reuses ManualForm behind a hatch (logger). preset/title/swap ride the
// same interface as the old AddFoodModal, so the consumer barely changes.
//
// Props: finderConfig, defaultSlot, presetFood, title, onResolve(food, detail), onClose.
const DEBOUNCE_MS = 350;

export default function Finder({ finderConfig: cfg, defaultSlot, presetFood, title, onResolve, onClose }) {
  const [view, setView] = useState("search"); // 'search' | 'manual'
  const [query, setQuery] = useState("");
  const [resp, setResp] = useState({ results: [], top3: null, dbSuppressed: false, note: null });
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState(presetFood || null);
  const [dbRevealed, setDbRevealed] = useState(false);
  const [moreShown, setMoreShown] = useState(false);
  const [active, setActive] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    if (picked || view !== "search") return;
    clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 2) { setResp({ results: [], top3: null, dbSuppressed: false, note: null }); setSearching(false); return; }
    setSearching(true);
    timer.current = setTimeout(async () => {
      try {
        const r = await searchFoods(q);
        setResp({ results: r.results || [], top3: r.top3 ?? null, dbSuppressed: !!r.dbSuppressed, note: r.note ?? null });
      } catch {
        setResp({ results: [], top3: null, dbSuppressed: false, note: null });
      } finally {
        setSearching(false);
        setDbRevealed(false); setMoreShown(false); setActive(0);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer.current);
  }, [query, picked, view]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const zones = useMemo(() => zoneResults(resp.results, resp.top3), [resp.results, resp.top3]);
  const showDb = !resp.dbSuppressed || dbRevealed;
  const visible = useMemo(() => {
    const db = showDb ? [...zones.dbTop, ...(moreShown ? zones.dbMore : [])] : [];
    return [...zones.basics, ...db];
  }, [zones, showDb, moreShown]);

  const onSearchKey = (e) => {
    if (e.key === "Enter") { e.preventDefault(); const f = visible[active] || visible[0]; if (f) setPicked(f); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, Math.max(0, visible.length - 1))); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
  };

  const confirm = (detail) => onResolve(picked, { amount: detail.value, unit: detail.unit, grams: detail.grams, slot: detail.slot });

  if (picked) {
    return (
      <Shell title={picked.name || title || "Amount"} onClose={onClose}>
        <FinderAmount food={picked} config={cfg} defaultSlot={defaultSlot} onBack={presetFood ? onClose : () => setPicked(null)} onConfirm={confirm} />
      </Shell>
    );
  }

  if (view === "manual") {
    return (
      <Shell title="Enter manually" onClose={onClose}>
        <ManualForm onBack={() => setView("search")} onSave={(food) => setPicked(food)} />
      </Shell>
    );
  }

  const q = query.trim();
  return (
    <Shell title={title || cfg.title} onClose={onClose}>
      <input className="afm-search" type="text" placeholder="Search foods…" value={query} autoFocus
        onChange={(e) => setQuery(e.target.value)} onKeyDown={onSearchKey} />
      {searching && <p className="afm-hint">Searching…</p>}
      {!searching && q.length >= 2 && resp.results.length === 0 && (
        <div className="fdr-empty">
          <p>No matches for “{q}”.</p>
          {cfg.allowManual && <button type="button" className="afm-manual" onClick={() => setView("manual")}>+ enter manually</button>}
        </div>
      )}
      {resp.results.length > 0 && (
        <FinderResults zones={zones} dbSuppressed={resp.dbSuppressed} dbRevealed={dbRevealed} onRevealDb={() => setDbRevealed(true)}
          moreShown={moreShown} onShowMore={() => setMoreShown(true)} note={resp.note} activeFood={visible[active]} onPick={setPicked} />
      )}
      {cfg.allowManual && resp.results.length > 0 && (
        <button type="button" className="afm-manual" onClick={() => setView("manual")}>+ enter manually</button>
      )}
    </Shell>
  );
}

function Shell({ title, onClose, children }) {
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
