// LifeOS — Food → import review PASS ① (4a, mock U). The ingredient DIFF: source line → what we'll
// store (buy-form) → matched food → grams → kcal → P → C → F, with a per-serving bar above and a
// sticky per-serving totals row. Flagged rows carry a margin bar (never through the text) + a why
// line, cleared to green once resolved. Clicking a row opens the Finder. Fit-scale drives the grid.

const r = (v) => Math.round(v || 0);

function savedLabel(row) {
  const q = row.amount;
  if (q == null) return <span className="saved">{row.name}</span>;
  const unit = row.unit && row.unit !== "item" ? ` ${row.unit}` : "";
  return <span className="saved"><b>{q}{unit}</b> {row.name}</span>;
}

// `edit` (Piece 6): editing a saved recipe — there is no source to diff against, so show the stored
// values directly (raw_text stays as quiet provenance) with no arrow and no import flags.
// `onAdd` (Piece 8): add an ingredient from nothing — opens the Finder on a fresh blank row.
export default function IngredientsPass({ model, resolved, scrollRef, contentRef, onScroll, scale, onRow, onAdd, edit = false }) {
  const ps = model.perServing;
  return (
    <div className="iv-pass">
      <div className="iv-bar">
        <div className="iv-vn hot"><div className="v">{r(ps.kcal)}</div><div className="k">kcal a serving</div></div>
        <div className="iv-vn"><div className="v">{r(ps.protein)}g</div><div className="k">protein</div></div>
        <div className="iv-vn"><div className="v">{r(ps.carbs)}g</div><div className="k">carbs</div></div>
        <div className="iv-vn"><div className="v">{r(ps.fat)}g</div><div className="k">fat</div></div>
        <div className="iv-vn"><div className="v">{model.count}</div><div className="k">ingredients</div></div>
      </div>
      <div className="iv-scroll" ref={scrollRef} onScroll={onScroll}>
        <div ref={contentRef} style={{ "--s": scale }}>
          <div className="iv-grid iv-ihd">
            <span>{edit ? "In the recipe" : "The source said"}</span><span></span><span>{edit ? "Stored as" : "We'll store"}</span><span>Matched to</span>
            <span>Grams</span><span>Kcal</span><span>P</span><span>C</span><span>F</span>
          </div>
          {model.rows.map((row) => {
            const flag = !edit && row.flagged && !resolved.has(row.i);
            const done = !edit && row.flagged && resolved.has(row.i);
            return (
              <div key={row.i} className={`iv-grid iv-ir${flag ? " flag" : ""}${done ? " done" : ""}`} onClick={(e) => onRow(row.i, e)}>
                <span className="orig">{row.orig}</span>
                <span className="ar">{edit ? "" : "→"}</span>
                <span>{savedLabel(row)}</span>
                <span className="match">{row.match}</span>
                <span className="n">{row.grams != null ? row.grams : "—"}</span>
                <span className="kc">{row.kcal}</span>
                <span className="n iv-mp">{row.protein}</span>
                <span className="n iv-mc">{row.carbs}</span>
                <span className="n iv-mf">{row.fat}</span>
                {flag && row.why && <div className="iv-why">{row.why}</div>}
              </div>
            );
          })}
          <div className="iv-grid iv-tot">
            <span className="lb">Per serving</span><span></span><span></span><span></span>
            <span className="n">—</span><span className="kc">{r(ps.kcal)}</span>
            <span className="n iv-mp">{r(ps.protein)}</span><span className="n iv-mc">{r(ps.carbs)}</span><span className="n iv-mf">{r(ps.fat)}</span>
          </div>
          {onAdd && <button type="button" className="iv-addstep" onClick={onAdd}>+ add an ingredient</button>}
        </div>
      </div>
    </div>
  );
}
