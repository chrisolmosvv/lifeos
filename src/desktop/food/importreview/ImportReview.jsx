// LifeOS — Food → IMPORT REVIEW (mock U, complete: 4a+4b+4c). Three passes — ① ingredient diff +
// Finder · ② method editor + three totals · ③ the plan (reused band + drag re-parent + plain-words
// fallback) — behind a save gate. Save composes createRecipe (new) OR updateRecipe (Piece 6 edit)
// with WHOLE objects (so the delete-all-reinsert can't null station/hold/is_prep/grams), caches
// Finder foods, and sets default_servings + reviewed_at. Reuses useFitToHole. After save → the recipe.
//
// Piece 6 — EDIT MODE. Given `editId` this reviews a SAVED recipe (fed as a draft by EditReview) and
// saves via updateRecipe, not createRecipe. `reviewed` (recipe already reviewed) drives the
// scaffolding: reviewed → scaffold OFF (no source-diff arrow, no import flags, no prep-approval — the
// fields just stay editable); an unreviewed draft keeps the full import scaffolding and is MARKED
// reviewed on save, exactly like a fresh import.

import { useCallback, useEffect, useRef, useState } from "react";
import { buildReview } from "../../../spine/logic/importReviewLogic";
import { methodTotals, deleteStep } from "../../../spine/logic/methodReviewLogic";
import { importGate } from "../../../spine/logic/importGate";
import { cookSchedule } from "../../../spine/logic/cookSchedule";
import { createRecipe, updateRecipe, deleteRecipe, ensureFoodItem } from "../../../spine/data/recipeWrite";
import { fetchActiveSession } from "../../../spine/data/cookEventStore";
import { supabase } from "../../../spine/data/supabaseClient";
import { useFitToHole } from "../cookplan/useFitToHole";
import SizeControls from "../cookplan/SizeControls";
import ImportMasthead from "./ImportMasthead";
import ImportRail from "./ImportRail";
import IngredientsPass from "./IngredientsPass";
import MethodPass from "./MethodPass";
import PlanPass from "./PlanPass";
import FinderPopover from "./FinderPopover";
import DeleteConfirm from "./DeleteConfirm";
import "./importReview.css";

export default function ImportReview({ draft, itemsById, onBack, onSaved, onDeleted, editId = null, reviewed = false, blank = false }) {
  // Three modes: IMPORT (editId null, from extraction) · EDIT (editId set, a saved recipe) · BLANK
  // (editId null, blank=true, "+ NEW" — written from scratch). scaffold = the import-only chrome
  // (source-line diff, impact flags, prep-step approval): ON only for a fresh import / unreviewed
  // draft; OFF when editing a reviewed recipe AND in blank mode (no source, nothing guessed).
  // At SAVE: editId decides create-vs-update (blank has no editId → createRecipe, never a duplicate).
  const scaffold = !reviewed && !blank;
  const [title, setTitle] = useState(draft.title || "");
  const [cuisine, setCuisine] = useState(draft.cuisine || "");
  // srcServings ("recipe makes") is fixed from the source for import/edit; editable in blank mode.
  const [srcServings, setSrcServings] = useState(draft.servings || 1);
  const [serv, setServ] = useState(draft.default_servings ?? draft.servings ?? 1);
  const [ings, setIngs] = useState(draft.ingredients || []);
  const [steps, setSteps] = useState(() => (draft.steps || []).map((s) => ({ ...s, approved: scaffold ? !s.is_prep : true })));
  const [showOrig, setShowOrig] = useState(new Set());
  const itemsRef = useRef({ ...(itemsById || {}) });
  const [pass, setPass] = useState(1);
  const [resolved, setResolved] = useState(new Set());
  const [finder, setFinder] = useState(null);
  const [saving, setSaving] = useState(false);
  const [delState, setDelState] = useState(null); // null | 'checking' | 'confirm' | 'blocked' | 'deleting'

  const scrollRef = useRef(null), contentRef = useRef(null), rootRef = useRef(null);
  const [pageH, setPageH] = useState(null);
  const measure = useCallback(() => { const el = rootRef.current; if (el) setPageH(window.innerHeight - el.getBoundingClientRect().top); }, []);
  const setRoot = useCallback((el) => { rootRef.current = el; measure(); }, [measure]);
  useEffect(() => { window.addEventListener("resize", measure); return () => window.removeEventListener("resize", measure); }, [measure]);
  const fit = useFitToHole(scrollRef, contentRef, `${pass}:${serv}:${ings.length}:${steps.length}`);

  const model = buildReview(ings, itemsRef.current, srcServings, serv);
  // Edit mode (scaffold off): nothing was guessed just now and prep steps were approved long ago —
  // so no flags to clear and nothing to approve. The SAVE GATE below still applies.
  const unresolvedFlags = scaffold ? model.rows.filter((r) => r.flagged && !resolved.has(r.i)).length : 0;
  const totals = methodTotals(steps, draft.prep_minutes, draft.cook_minutes);
  const unapproved = scaffold ? steps.filter((s) => s.is_prep && !s.approved).length : 0;
  const { schedule, finish } = cookSchedule(steps.map((s) => ({ durationSeconds: s.timer_seconds || 0, deps: s.depends_on, hold: s.hold_tolerance, tag: s.tag })));
  // The save gate = the import gate (every ingredient resolved · every step timed · plan valid) PLUS
  // the essentials a hand-written recipe can lack: a title, at least one ingredient, at least one
  // step. Import/edit always have these; blank mode needs them said, not failed silently.
  const baseGate = importGate(ings, steps, unresolvedFlags);
  const hasTitle = title.trim() !== "", hasIngredients = ings.length > 0, hasSteps = steps.length > 0;
  const gate = { ...baseGate, hasTitle, hasIngredients, hasSteps, canSave: baseGate.canSave && hasTitle && hasIngredients && hasSteps };

  const patch = (p) => setIngs((xs) => xs.map((x, j) => (j === finder.i ? { ...x, ...p } : x)));
  // Closing the Finder on a just-ADDED row that's still empty (no food picked, not marked no-macros)
  // discards it — an add you backed out of shouldn't leave an orphan unresolved row behind.
  const closeFinder = () => {
    setFinder((f) => {
      if (f?.added) { const row = ings[f.i]; if (row && !row.food_item_id && !row.no_macros) setIngs((xs) => xs.filter((_, j) => j !== f.i)); }
      return null;
    });
  };
  const resolveOne = () => { setResolved((s) => new Set(s).add(finder.i)); setFinder(null); };
  const noMacros = () => { patch({ no_macros: true }); setResolved((s) => new Set(s).add(finder.i)); setFinder(null); };
  const removeOne = () => { const i = finder.i; setIngs((xs) => xs.filter((_, j) => j !== i)); setFinder(null); };
  // Add an ingredient from nothing (all modes): append a blank row and open the Finder on it. No
  // raw_text — nothing wrote it, so the diff's left side stays honestly empty.
  const addIngredient = (e) => {
    const i = ings.length;
    setIngs((xs) => [...xs, { food_item_id: null, raw_text: null, parsedName: "", amount: null, unit: null, no_macros: false, grams: null, step_position: null }]);
    setFinder({ i, anchor: e?.currentTarget?.getBoundingClientRect() || null, added: true });
  };

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
  // Save is enabled once the plan is sound (steps timed, no cycle) + the essentials exist; unweighted
  // ingredients WARN in the sub rather than reading a bland "ready to save" (Piece 9 revised).
  const subs = { 1: unresolvedFlags ? `${unresolvedFlags} to check` : `all ${model.count} resolved`, 2: unapproved ? `${unapproved} to approve` : `${steps.length} steps`, 3: !gate.canSave ? "not ready" : gate.ingUnresolved ? `${gate.ingUnresolved} with no weight` : "ready to save" };

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
      // Piece 6: EDIT saves via updateRecipe (must not create a second recipe); NEW via createRecipe.
      // Both get WHOLE objects (approved is extra, ignored by writeChildren) so the delete-all-reinsert
      // can't null station/hold/is_prep/grams/step_position.
      let id = editId;
      if (editId) await updateRecipe(editId, recipe, savedIngs, steps);
      else id = await createRecipe(recipe, savedIngs, steps);
      // recipeRow doesn't write these two. default_servings always. reviewed_at: set now when the
      // recipe is not yet reviewed (a fresh import OR an unreviewed draft — reviewing IS the sweep);
      // leave an already-reviewed recipe's reviewed_at untouched (editing doesn't un-review it).
      const patch = reviewed ? { default_servings: serv } : { default_servings: serv, reviewed_at: new Date().toISOString() };
      await supabase.from("recipes").update(patch).eq("id", id);
      onSaved ? onSaved(id) : onBack();
    } catch { setSaving(false); }
  };

  // Delete (edit mode only). Refuse if a cook is live for this recipe — cook_session.recipe_id is a
  // NOT NULL cascade, so deleting mid-cook would destroy the running session. Check first, then confirm.
  const askDelete = async () => {
    setDelState("checking");
    try { setDelState((await fetchActiveSession(editId)) ? "blocked" : "confirm"); }
    catch { setDelState("confirm"); } // check failed → still let them confirm; the delete itself is the backstop
  };
  const doDelete = async () => {
    setDelState("deleting");
    try { await deleteRecipe(editId); (onDeleted || onBack)(); } // children CASCADE; food_log_entries.recipe_id SET NULL
    catch { setDelState("confirm"); }
  };

  const nextLabel = pass === 1 ? "Method →" : pass === 2 ? "The plan →" : "Save recipe";
  const nextDisabled = pass === 3 ? (!gate.canSave || saving) : false;

  return (
    <div className="iv" ref={setRoot} style={{ height: pageH ? `${pageH}px` : "100%" }}>
      <ImportMasthead sourceUrl={draft.source_url} title={title} onTitle={setTitle} cuisine={cuisine} onCuisine={setCuisine}
        srcServings={srcServings} serv={serv} onDec={() => setServ((s) => Math.max(1, s - 1))} onInc={() => setServ((s) => s + 1)} onBack={onBack} edit={!scaffold}
        onSrcDec={blank ? () => setSrcServings((s) => Math.max(1, s - 1)) : null} onSrcInc={blank ? () => setSrcServings((s) => s + 1) : null} />
      <ImportRail pass={pass} subs={subs} onGo={setPass} />

      {pass === 1 && <IngredientsPass model={model} resolved={resolved} edit={!scaffold} scrollRef={scrollRef} contentRef={contentRef} onScroll={fit.onScroll} scale={fit.scale}
        onRow={(i, e) => setFinder({ i, anchor: e.currentTarget.getBoundingClientRect() })} onAdd={addIngredient} />}
      {pass === 2 && <MethodPass steps={steps} showOrig={showOrig} totals={totals} edit={!scaffold} scrollRef={scrollRef} contentRef={contentRef} onScroll={fit.onScroll} scale={fit.scale} h={H} />}
      {pass === 3 && <PlanPass steps={steps} schedule={schedule} finish={finish} gate={gate} ingCount={ings.length} onReparent={reparent} onSetDeps={setDeps}
        scrollRef={scrollRef} contentRef={contentRef} onScroll={fit.onScroll} scale={fit.scale} />}

      <div className="iv-ft">
        <div className="iv-lft">
          <SizeControls pct={fit.pct} isManual={fit.isManual} onDec={fit.dec} onInc={fit.inc} onFit={fit.fit} onSet={fit.set} />
          {editId && <button type="button" className="iv-del-recipe" onClick={askDelete}>Delete recipe</button>}
        </div>
        <div className="iv-rgt">
          {pass > 1 && <button type="button" className="iv-back" onClick={() => setPass(pass - 1)}>‹ back</button>}
          {scaffold && pass < 3 && <button type="button" className={`iv-approve${(pass === 1 ? !unresolvedFlags : !unapproved) ? " off" : ""}`} onClick={approveAll}>{pass === 1 ? "Approve all" : "Approve added steps"}</button>}
          <button type="button" className="iv-next" onClick={pass === 3 ? save : () => setPass(pass + 1)} disabled={nextDisabled}>{nextLabel}</button>
        </div>
      </div>

      {finder && <FinderPopover ing={ings[finder.i]} itemsById={itemsRef.current} anchor={finder.anchor}
        onPatch={patch} onResolve={resolveOne} onNoMacros={noMacros} onRemove={removeOne} onClose={closeFinder} />}

      {(delState === "confirm" || delState === "blocked" || delState === "deleting") && (
        <DeleteConfirm title={title} blocked={delState === "blocked"} deleting={delState === "deleting"}
          onCancel={() => setDelState(null)} onConfirm={doDelete} />
      )}
    </div>
  );
}
