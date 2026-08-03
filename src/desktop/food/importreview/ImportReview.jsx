// LifeOS — Food → IMPORT REVIEW (mock U, 4a). The three-pass shell + pass ① in full. A diff the
// owner approves: source line → what we'll store (buy-form) → grams (eat-form) → macros, flagged
// by impact until confirmed. Passes ②/③ and the save gate are 4b/4c — their gates switch but show
// a stub. Reuses useFitToHole (incl. its scroll-keep) and the existing food-search. Nothing here
// is persisted; it's the client draft until the save gate lands.

import { useCallback, useEffect, useRef, useState } from "react";
import { buildReview } from "../../../spine/logic/importReviewLogic";
import { useFitToHole } from "../cookplan/useFitToHole";
import ImportMasthead from "./ImportMasthead";
import ImportRail from "./ImportRail";
import IngredientsPass from "./IngredientsPass";
import FinderPopover from "./FinderPopover";
import "./importReview.css";

export default function ImportReview({ draft, itemsById, onBack }) {
  const [title, setTitle] = useState(draft.title || "");
  const [cuisine, setCuisine] = useState(draft.cuisine || "");
  const srcServings = draft.servings || 1;
  const [serv, setServ] = useState(draft.default_servings ?? draft.servings ?? 1);
  const [ings, setIngs] = useState(draft.ingredients || []);
  const itemsRef = useRef({ ...(itemsById || {}) });
  const [pass, setPass] = useState(1);
  const [resolved, setResolved] = useState(new Set());
  const [finder, setFinder] = useState(null); // { i, anchor } | null

  const scrollRef = useRef(null), contentRef = useRef(null);
  const rootRef = useRef(null);
  const [pageH, setPageH] = useState(null);
  const measure = useCallback(() => { const el = rootRef.current; if (el) setPageH(window.innerHeight - el.getBoundingClientRect().top); }, []);
  const setRoot = useCallback((el) => { rootRef.current = el; measure(); }, [measure]);
  useEffect(() => { window.addEventListener("resize", measure); return () => window.removeEventListener("resize", measure); }, [measure]);

  const fit = useFitToHole(scrollRef, contentRef, `${pass}:${serv}:${ings.length}`);
  const model = buildReview(ings, itemsRef.current, srcServings, serv);
  const unresolved = model.rows.filter((r) => r.flagged && !resolved.has(r.i)).length;

  const patch = (p) => setIngs((xs) => xs.map((x, j) => (j === finder.i ? { ...x, ...p } : x)));
  const closeFinder = () => setFinder(null);
  const resolveOne = () => { setResolved((s) => new Set(s).add(finder.i)); closeFinder(); };
  const noMacros = () => { patch({ no_macros: true }); setResolved((s) => new Set(s).add(finder.i)); closeFinder(); };
  const removeOne = () => { const i = finder.i; setIngs((xs) => xs.filter((_, j) => j !== i)); closeFinder(); };
  const approveAll = () => setResolved(new Set(ings.map((_, i) => i)));

  const subs = { 1: unresolved ? `${unresolved} to check` : `all ${model.count} resolved`, 2: "method — 4b", 3: "the plan — 4c" };

  return (
    <div className="iv" ref={setRoot} style={{ height: pageH ? `${pageH}px` : "100%" }}>
      <ImportMasthead
        sourceUrl={draft.source_url} title={title} onTitle={setTitle} cuisine={cuisine} onCuisine={setCuisine}
        srcServings={srcServings} serv={serv} onDec={() => setServ((s) => Math.max(1, s - 1))} onInc={() => setServ((s) => s + 1)} onBack={onBack}
      />
      <ImportRail pass={pass} subs={subs} onGo={setPass} />

      {pass === 1 ? (
        <IngredientsPass model={model} resolved={resolved} scrollRef={scrollRef} contentRef={contentRef} onScroll={fit.onScroll} scale={fit.scale}
          onRow={(i, e) => setFinder({ i, anchor: e.currentTarget.getBoundingClientRect() })} />
      ) : (
        <div className="iv-pass"><div className="iv-stub">{pass === 2 ? "Method & timings — built in Piece 4b." : "The plan — built in Piece 4c."}</div></div>
      )}

      <div className="iv-ft">
        <div className="iv-zoom">
          <button type="button" onClick={fit.dec}>A−</button>
          <span className="pc">{fit.pct}%</span>
          <button type="button" onClick={fit.inc}>A+</button>
          <button type="button" onClick={fit.fit} style={{ width: "auto", padding: "0 6px" }}>Fit</button>
        </div>
        <div className="iv-rgt">
          {pass > 1 && <button type="button" className="iv-back" onClick={() => setPass(pass - 1)}>‹ back</button>}
          {pass === 1 && <button type="button" className={`iv-approve${unresolved ? "" : " off"}`} onClick={approveAll}>Approve all</button>}
          <button type="button" className="iv-next" onClick={() => setPass(Math.min(3, pass + 1))} disabled={pass === 3}>
            {pass === 1 ? "Method →" : pass === 2 ? "The plan →" : "Save recipe"}
          </button>
        </div>
      </div>

      {finder && (
        <FinderPopover
          ing={ings[finder.i]} itemsById={itemsRef.current} anchor={finder.anchor}
          onPatch={patch} onResolve={resolveOne} onNoMacros={noMacros} onRemove={removeOne} onClose={closeFinder}
        />
      )}
    </div>
  );
}
