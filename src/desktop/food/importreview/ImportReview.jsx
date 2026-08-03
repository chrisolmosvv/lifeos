// LifeOS — Food → IMPORT REVIEW (mock U, complete: 4a+4b+4c). Three passes — ① ingredient diff +
// Finder · ② method editor + three totals · ③ the plan (reused band + drag re-parent + plain-words
// fallback) — behind a save gate. Save composes the EXISTING createRecipe with WHOLE objects (so the
// delete-all-reinsert can't null station/hold/is_prep/grams), caches Finder foods, and sets
// default_servings + reviewed_at. Reuses useFitToHole. After save → straight to the recipe page.

import { useCallback, useEffect, useRef, useState } from "react";
import { buildReview } from "../../../spine/logic/importReviewLogic";
import { methodTotals, deleteStep } from "../../../spine/logic/methodReviewLogic";
import { importGate } from "../../../spine/logic/importGate";
import { cookSchedule } from "../../../spine/logic/cookSchedule";
import { createRecipe, ensureFoodItem } from "../../../spine/data/recipeWrite";
import { supabase } from "../../../spine/data/supabaseClient";
import { useFitToHole } from "../cookplan/useFitToHole";
import ImportMasthead from "./ImportMasthead";
import ImportRail from "./ImportRail";
import IngredientsPass from "./IngredientsPass";
import MethodPass from "./MethodPass";
import PlanPass from "./PlanPass";
import FinderPopover from "./FinderPopover";
import "./importReview.css";

export default function ImportReview({ draft, itemsById, onBack, onSaved }) {
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
  const [saving, setSaving] = useState(false);

  const scrollRef = useRef(null), contentRef = useRef(null), rootRef = useRef(null);
  const [pageH, setPageH] = useState(null);
  const measure = useCallback(() => { const el = rootRef.current; if (el) setPageH(window.innerHeight - el.getBoundingClientRect().top); }, []);
  const setRoot = useCallback((el) => { rootRef.current = el; measure(); }, [measure]);
  useEffect(() => { window.addEventListener("resize", measure); return () => window.removeEventListener("resize", measure); }, [measure]);
  const fit = useFitToHole(scrollRef, contentRef, `${pass}:${serv}:${ings.length}:${steps.length}`);

  const model = buildReview(ings, itemsRef.current, srcServings, serv);
  const unresolvedFlags = model.rows.filter((r) => r.flagged && !resolved.has(r.i)).length;
  const totals = methodTotals(steps, draft.prep_minutes, draft.cook_minutes);
  const unapproved = steps.filter((s) => s.is_prep && !s.approved).length;
  const { schedule, finish } = cookSchedule(steps.map((s) => ({ durationSeconds: s.timer_seconds || 0, deps: s.depends_on, hold: s.hold_tolerance, tag: s.tag })));
  const gate = importGate(ings, steps, unresolvedFlags);

  const patch = (p) => setIngs((xs) => xs.map((x, j) => (j === finder.i ? { ...x, ...p } : x)));
  const closeFinder = () => setFinder(null);
  const resolveOne = () => { setResolved((s) => new Set(s).add(finder.i)); closeFinder(); };
  const noMacros = () => { patch({ no_macros: true }); setResolved((s) => new Set(s).add(finder.i)); closeFinder(); };
  const removeOne = () => { const i = finder.i; setIngs((xs) => xs.filter((_, j) => j !== i)); closeFinder(); };

  const upd = (i, p) => setSteps((xs) => xs.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const H = {
    onText: (i, v) => upd(i, { text: v }), onDur: (i, m) => upd(i, { timer_seconds: m * 60 }),
    onTag: (i, v) => upd(i, { tag: v }), onStation: (i, v) => upd(i, { station: v }), onHold: (i, v) => upd(i, { hold_tolerance: v }),
    onApprove: (i) => upd(i, { approved: !steps[i].approved }),
    onToggleOrig: (i) => setShowOrig((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; }),
    onDelete: (i) => { setSteps((xs) => deleteStep(xs, i)); setShowOrig((s) => new Set([...s].filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)))); },
    onAdd: () => setSteps((xs) => [...xs, { text: "", original: null, timer_seconds: 300, tag: "hands_on", station: "bench", hold_tolerance: "short", is_prep: false, approved: true, depends_on: xs.length ? [xs.length - 1] : null }]),
  };
  const setDeps = (i, deps) => upd(i, { depends_on: deps.length ? [...new Set(deps)] : null });
  const reparent = (i, after) => upd(i, { depends_on: after != null ? [after] : null });

  const approveAll = () => { if (pass === 1) setResolved(new Set(ings.map((_, i) => i))); else if (pass === 2) setSteps((xs) => xs.map((s) => ({ ...s, approved: true }))); };
  const subs = { 1: unresolvedFlags ? `${unresolvedFlags} to check` : `all ${model.count} resolved`, 2: unapproved ? `${unapproved} to approve` : `${steps.length} steps`, 3: gate.canSave ? "ready to save" : "not ready" };

  const save = async () => {
    if (!gate.canSave || saving) return;
    setSaving(true);
    try {
      const savedIngs = [];
      for (const ing of ings) {
        let fid = ing.food_item_id;
        if (fid != null && !ing.no_macros) { const cand = itemsRef.current[fid]; if (cand) fid = (await ensureFoodItem(cand)).id; }
        savedIngs.push({ ...ing, food_item_id: fid }); // WHOLE object — every field (grams, step_position, …)
      }
      const recipe = { title, servings: srcServings, prep_minutes: draft.prep_minutes, cook_minutes: draft.cook_minutes, source_url: draft.source_url, cuisine };
      const id = await createRecipe(recipe, savedIngs, steps); // steps are WHOLE (approved is extra, ignored by writeChildren)
      // createRecipe/recipeRow doesn't write these two — set them here (reviewing IS the sweep).
      await supabase.from("recipes").update({ default_servings: serv, reviewed_at: new Date().toISOString() }).eq("id", id);
      onSaved ? onSaved(id) : onBack();
    } catch { setSaving(false); }
  };

  const nextLabel = pass === 1 ? "Method →" : pass === 2 ? "The plan →" : "Save recipe";
  const nextDisabled = pass === 3 ? (!gate.canSave || saving) : false;

  return (
    <div className="iv" ref={setRoot} style={{ height: pageH ? `${pageH}px` : "100%" }}>
      <ImportMasthead sourceUrl={draft.source_url} title={title} onTitle={setTitle} cuisine={cuisine} onCuisine={setCuisine}
        srcServings={srcServings} serv={serv} onDec={() => setServ((s) => Math.max(1, s - 1))} onInc={() => setServ((s) => s + 1)} onBack={onBack} />
      <ImportRail pass={pass} subs={subs} onGo={setPass} />

      {pass === 1 && <IngredientsPass model={model} resolved={resolved} scrollRef={scrollRef} contentRef={contentRef} onScroll={fit.onScroll} scale={fit.scale}
        onRow={(i, e) => setFinder({ i, anchor: e.currentTarget.getBoundingClientRect() })} />}
      {pass === 2 && <MethodPass steps={steps} showOrig={showOrig} totals={totals} scrollRef={scrollRef} contentRef={contentRef} onScroll={fit.onScroll} scale={fit.scale} h={H} />}
      {pass === 3 && <PlanPass steps={steps} schedule={schedule} finish={finish} gate={gate} ingCount={ings.length} onReparent={reparent} onSetDeps={setDeps}
        scrollRef={scrollRef} contentRef={contentRef} onScroll={fit.onScroll} scale={fit.scale} />}

      <div className="iv-ft">
        <div className="iv-zoom">
          <button type="button" onClick={fit.dec}>A−</button><span className="pc">{fit.pct}%</span>
          <button type="button" onClick={fit.inc}>A+</button><button type="button" onClick={fit.fit} style={{ width: "auto", padding: "0 6px" }}>Fit</button>
        </div>
        <div className="iv-rgt">
          {pass > 1 && <button type="button" className="iv-back" onClick={() => setPass(pass - 1)}>‹ back</button>}
          {pass < 3 && <button type="button" className={`iv-approve${(pass === 1 ? !unresolvedFlags : !unapproved) ? " off" : ""}`} onClick={approveAll}>{pass === 1 ? "Approve all" : "Approve added steps"}</button>}
          <button type="button" className="iv-next" onClick={pass === 3 ? save : () => setPass(pass + 1)} disabled={nextDisabled}>{nextLabel}</button>
        </div>
      </div>

      {finder && <FinderPopover ing={ings[finder.i]} itemsById={itemsRef.current} anchor={finder.anchor}
        onPatch={patch} onResolve={resolveOne} onNoMacros={noMacros} onRemove={removeOne} onClose={closeFinder} />}
    </div>
  );
}
