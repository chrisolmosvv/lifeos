// BroadsheetIngredients — left column: flat/grouped toggle + ingredient list. Hairline-separated
// lines, no boxes, no checkboxes (ticking is Piece 5). Grouped mode uses step_position.
import "./broadsheet.css";

export default function BroadsheetIngredients({ ingredients, steps, groupMode, onToggleGroup, isTicked, onToggleTick }) {
  const flat = groupMode !== "grouped";

  // Group ingredients by step_position (null → "other")
  const grouped = () => {
    const byStep = {};
    const other = [];
    for (const ing of ingredients) {
      if (ing.step_position != null && ing.step_position >= 0) {
        const key = ing.step_position;
        if (!byStep[key]) byStep[key] = [];
        byStep[key].push(ing);
      } else {
        other.push(ing);
      }
    }
    // Sort step keys numerically
    const keys = Object.keys(byStep).map(Number).sort((a, b) => a - b);
    return { keys, byStep, other };
  };

  const ingLine = (ing, i) => {
    const label = ing.raw_text || "ingredient";
    const ticked = isTicked ? isTicked(i) : false;
    return (
      <li key={i} className={ticked ? "bs-ing-line is-ticked" : "bs-ing-line"}>
        <button type="button" className="bs-ing-btn" onClick={() => onToggleTick?.(i)}>
          <span className="bs-ing-text">{label}</span>
        </button>
      </li>
    );
  };

  const stepLabel = (pos) => {
    const s = steps?.[pos];
    const snippet = s?.text ? s.text.slice(0, 40) + (s.text.length > 40 ? "…" : "") : "";
    return `Step ${pos + 1}${snippet ? ` · ${snippet}` : ""}`;
  };

  const { keys, byStep, other } = flat ? {} : grouped();

  return (
    <div className="bs-col bs-col-ing">
      <div className="bs-col-head">
        <span className="bs-col-title">Ingredients</span>
        <button type="button" className="bs-toggle" onClick={onToggleGroup}>
          {flat ? "by step" : "flat"}
        </button>
      </div>

      {flat ? (
        <ul className="bs-ing-list">
          {ingredients.map((ing, i) => ingLine(ing, i))}
        </ul>
      ) : (
        <div className="bs-ing-groups">
          {keys.map((pos) => (
            <div key={pos} className="bs-ing-group">
              <p className="bs-ing-group-head">{stepLabel(pos)}</p>
              <ul className="bs-ing-list">{byStep[pos].map((ing, i) => ingLine(ing, `${pos}-${i}`))}</ul>
            </div>
          ))}
          {other.length > 0 && (
            <div className="bs-ing-group">
              <p className="bs-ing-group-head">Other ingredients</p>
              <ul className="bs-ing-list">{other.map((ing, i) => ingLine(ing, `o-${i}`))}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
