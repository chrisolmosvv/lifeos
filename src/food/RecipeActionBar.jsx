// RecipeActionBar (V2 P6) — the fixed bottom action bar, TYPE-AWARE via recipeKind (derived, passed
// in): a RECIPE shows Cook · Log · Edit; a MEAL hides Cook and leads Log (it's assembled, not cooked);
// a DRAFT shows only Edit (nothing to cook or log yet). Log's staging panel is the bridge (P8) — this
// only PLACES the endpoint (onLog), it does not redesign the staging.
export default function RecipeActionBar({ kind, onCook, onLog, onEdit }) {
  return (
    <div className="rp-actionbar">
      {kind === "recipe" && <button type="button" className="rp-act rp-act-cook" onClick={onCook}>Cook</button>}
      {kind !== "draft" && <button type="button" className="rp-act rp-act-log" onClick={onLog}>Log this meal</button>}
      <button type="button" className="rp-act rp-act-edit" onClick={onEdit}>Edit</button>
    </div>
  );
}
