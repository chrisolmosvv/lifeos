// LifeOS — Food → import review MASTHEAD (4a, mock U). Source URL, editable title + cuisine, and
// the two servings numbers: "recipe makes" (source's servings, read-only) and "I usually cook"
// (default_servings, adjustable). No prose — the fields speak.

export default function ImportMasthead({ sourceUrl, title, onTitle, cuisine, onCuisine, srcServings, serv, onDec, onInc, onBack, edit = false, onSrcDec, onSrcInc }) {
  return (
    <div className="iv-hd">
      <div>
        <button type="button" className="iv-eyebrow" onClick={onBack}>‹ The Cookbook · {edit ? "editing a recipe" : "reviewing an import"}</button>
        {sourceUrl && <div className="iv-src">imported from {sourceUrl.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}</div>}
        <input className="iv-title" value={title} onChange={(e) => onTitle(e.target.value)} placeholder="Untitled recipe" />
      </div>
      <div className="iv-hr">
        <div className="iv-mx"><input className="iv-cui" value={cuisine || ""} onChange={(e) => onCuisine(e.target.value)} placeholder="—" /><div className="k">cuisine</div></div>
        <div className="iv-mx">
          {onSrcInc ? (
            <div className="iv-stp"><button type="button" onClick={onSrcDec} aria-label="Makes fewer">−</button><b>{srcServings}</b><button type="button" onClick={onSrcInc} aria-label="Makes more">+</button></div>
          ) : (<div className="v">{srcServings ?? "—"}</div>)}
          <div className="k">recipe makes</div>
        </div>
        <div className="iv-mx">
          <div className="iv-stp"><button type="button" onClick={onDec} aria-label="Fewer">−</button><b>{serv}</b><button type="button" onClick={onInc} aria-label="More">+</button></div>
          <div className="k">I usually cook</div>
        </div>
      </div>
    </div>
  );
}
