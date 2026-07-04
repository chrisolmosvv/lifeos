// BroadsheetMasthead — the recipe title + dateline. Fraunces headline, Inter small-caps facts,
// hairline beneath. Provenance link + back affordance above.
import HairlineRule from "../kit/HairlineRule";
import "./broadsheet.css";

export default function BroadsheetMasthead({ recipe, timeToTable, onBack }) {
  const source = recipe.source_url ? (() => { try { return new URL(recipe.source_url).hostname; } catch { return "a link"; } })() : null;
  const serves = recipe.servings ? `Serves ${recipe.servings}` : null;
  const time = timeToTable ? `${timeToTable} min to table` : null;
  const dateline = [serves, time].filter(Boolean).join(" · ");

  return (
    <div className="bs-mast">
      <div className="bs-mast-top">
        <button type="button" className="bs-back" onClick={onBack}>‹ Cookbook</button>
        {source && <span className="bs-provenance">imported from {source}</span>}
      </div>
      <h1 className="bs-title">{recipe.title}</h1>
      {dateline && <p className="bs-dateline">{dateline}</p>}
      <HairlineRule />
    </div>
  );
}
