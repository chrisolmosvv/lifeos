// LifeOS — Food → IMPORT REVIEW (mock U, 4a+4b). The three-pass shell with pass ① (ingredient diff
// + Finder) and pass ② (method: the growing step editor, terse/original, tags/stations/hold, prep
// approval, add/delete with dependency cleanup, and the three totals). Pass ③ + the save gate are
// 4c (its gate switches but shows a stub). Reuses useFitToHole; nothing is persisted yet.

import { useCallback, useEffect, useRef, useState } from "react";
import { buildReview } from "../../../spine/logic/importReviewLogic";
import { methodTotals, deleteStep } from "../../../spine/logic/methodReviewLogic";
import { useFitToHole } from "../cookplan/useFitToHole";
import ImportMasthead from "./ImportMasthead";
import ImportRail from "./ImportRail";
import IngredientsPass from "./IngredientsPass";
import MethodPass from "./MethodPass";
import FinderPopover from "./FinderPopover";
import "./importReview.css";

export default function ImportReview({ draft, itemsById, onBack }) {
  const [title, setTitle] = useState(draft.title || "");
  const [cuisine, setCuisine] = useState(draft.cuisine || "");
  const srcServings = draft.servings || 1;
  const [serv, setServ] = useState(draft.default_servings ?? draft.servings ?? 1);
  const [ings, setIngs] = useState(draft.ingredients || []);
  const [steps, setSteps] = useState(() => (draft.steps || []).map((s) => ({ ...s, approved: !s.is_prep })));
  const [showOrig, setShowOrig] = useState(new Set());
  const itemsRef = useRef({ ...(itemsById || {}) });
  const [pass, setPass] = useState(1);
  const [resolved, setResolved] = useState(new Set());
  const [finder, setFinder] = useState(null);

  const scrollRef = useRef(null), contentRef = useRef(null), rootRef = useRef(null);
  const [pageH, setPageH] = useState(null);
  const measure = useCallback(() => { const el = rootRef.current; if (el) setPageH(window.innerHeight - el.getBoundingClientRect().top); }, []);
  const setRoot = useCallback((el) => { rootRef.current = el; measure(); }, [measure]);
  useEffect(() => { window.addEventListener("resize", measure); return () => window.removeEventListener("resize", measure); }, [measure]);
  const fit = useFitToHole(scrollRef, contentRef, `${pass}:${serv}:${ings.length}:${steps.length}`);

  const model = buildReview(ings, itemsRef.current, srcServings, serv);
  const unresolved = model.rows.filter((r) => r.flagged && !resolved.has(r.i)).length;
  const totals = methodTotals(steps, draft.prep_minutes, draft.cook_minutes);
  const unapproved = steps.filter((s) => s.is_prep && !s.approved).length;

  // ── Ingredient (pass ①) handlers ──
  const patch = (p) => setIngs((xs) => xs.map((x, j) => (j === finder.i ? { ...x, ...p } : x)));
  const closeFinder = () => setFinder(null);
  const resolveOne = () => { setResolved((s) => new Set(s).add(finder.i)); closeFinder(); };
  const noMacros = () => { patch({ no_macros: true }); setResolved((s) => new Set(s).add(finder.i)); closeFinder(); };
  const removeOne = () => { const i = finder.i; setIngs((xs) => xs.filter((_, j) => j !== i)); closeFinder(); };

  // ── Step (pass ②) handlers ──
  const upd = (i, p) => setSteps((xs) => xs.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const H = {
    onText: (i, v) => upd(i, { text: v }), onDur: (i, m) => upd(i, { timer_seconds: m * 60 }),
    onTag: (i, v) => upd(i, { tag: v }), onStation: (i, v) => upd(i, { station: v }), onHold: (i, v) => upd(i, { hold_tolerance: v }),
    onApprove: (i) => upd(i, { approved: !steps[i].approved }),
    onToggleOrig: (i) => setShowOrig((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; }),
    onDelete: (i) => { setSteps((xs) => deleteStep(xs, i)); setShowOrig((s) => new Set([...s].filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)))); },
    onAdd: () => setSteps((xs) => [...xs, { text: "", original: null, timer_seconds: 300, tag: "hands_on", station: "bench", hold_tolerance: "short", is_prep: false, approved: true, depends_on: xs.length ? [xs.length - 1] : null }]),
  };

  const approveAll = () => { if (pass === 1) setResolved(new Set(ings.map((_, i) => i))); else setSteps((xs) => xs.map((s) => ({ ...s, approved: true }))); };
  const subs = { 1: unresolved ? `${unresolved} to check` : `all ${model.count} resolved`, 2: unapproved ? `${unapproved} to approve` : `${steps.length} steps`, 3: "the plan — 4c" };
  const approveOff = pass === 1 ? !unresolved : !unapproved;
  const approveLabel = pass === 1 ? "Approve all" : "Approve added steps";

  return (
    <div className="iv" ref={setRoot} style={{ height: pageH ? `${pageH}px` : "100%" }}>
      <ImportMasthead sourceUrl={draft.source_url} title={title} onTitle={setTitle} cuisine={cuisine} onCuisine={setCuisine}
        srcServings={srcServings} serv={serv} onDec={() => setServ((s) => Math.max(1, s - 1))} onInc={() => setServ((s) => s + 1)} onBack={onBack} />
      <ImportRail pass={pass} subs={subs} onGo={setPass} />

      {pass === 1 && (
        <IngredientsPass model={model} resolved={resolved} scrollRef={scrollRef} contentRef={contentRef} onScroll={fit.onScroll} scale={fit.scale}
          onRow={(i, e) => setFinder({ i, anchor: e.currentTarget.getBoundingClientRect() })} />
      )}
      {pass === 2 && (
        <MethodPass steps={steps} showOrig={showOrig} totals={totals} scrollRef={scrollRef} contentRef={contentRef} onScroll={fit.onScroll} scale={fit.scale} h={H} />
      )}
      {pass === 3 && <div className="iv-pass"><div className="iv-stub">The plan — built in Piece 4c (with the save gate).</div></div>}

      <div className="iv-ft">
        <div className="iv-zoom">
          <button type="button" onClick={fit.dec}>A−</button>
          <span className="pc">{fit.pct}%</span>
          <button type="button" onClick={fit.inc}>A+</button>
          <button type="button" onClick={fit.fit} style={{ width: "auto", padding: "0 6px" }}>Fit</button>
        </div>
        <div className="iv-rgt">
          {pass > 1 && <button type="button" className="iv-back" onClick={() => setPass(pass - 1)}>‹ back</button>}
          {pass < 3 && <button type="button" className={`iv-approve${approveOff ? " off" : ""}`} onClick={approveAll}>{approveLabel}</button>}
          <button type="button" className="iv-next" onClick={() => setPass(Math.min(3, pass + 1))} disabled={pass === 3}>
            {pass === 1 ? "Method →" : pass === 2 ? "The plan →" : "Save recipe"}
          </button>
        </div>
      </div>

      {finder && (
        <FinderPopover ing={ings[finder.i]} itemsById={itemsRef.current} anchor={finder.anchor}
          onPatch={patch} onResolve={resolveOne} onNoMacros={noMacros} onRemove={removeOne} onClose={closeFinder} />
      )}
    </div>
  );
}
