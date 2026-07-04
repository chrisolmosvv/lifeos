// BroadsheetMasthead — the recipe title + dateline + recipe-level actions. Fraunces headline,
// Inter small-caps facts, hairline beneath. Provenance link + back affordance above. Action
// buttons (Edit, Log, Cook, ★) sit right-aligned in the header row.
import { useState } from "react";
import HairlineRule from "../kit/HairlineRule";
import "./broadsheet.css";

export default function BroadsheetMasthead({ recipe, timeToTable, onBack, onEdit, onDelete, onCook, onLog, onToggleFav, isFav }) {
  const source = recipe.source_url ? (() => { try { return new URL(recipe.source_url).hostname; } catch { return "a link"; } })() : null;
  const serves = recipe.servings ? `Serves ${recipe.servings}` : null;
  const time = timeToTable ? `${timeToTable} min to table` : null;
  const dateline = [serves, time].filter(Boolean).join(" · ");
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <div className="bs-mast">
      <div className="bs-mast-top">
        <button type="button" className="bs-back" onClick={onBack}>‹ Cookbook</button>
        <div className="bs-mast-actions">
          {onToggleFav && <button type="button" className={isFav ? "bs-act bs-fav is-on" : "bs-act bs-fav"} onClick={onToggleFav}>{isFav ? "★" : "☆"}</button>}
          {onLog && <button type="button" className="bs-act" onClick={onLog}>Log</button>}
          {onCook && <button type="button" className="bs-act" onClick={onCook}>Cook</button>}
          {(onEdit || onDelete) && (
            <div className="bs-menu-wrap">
              <button type="button" className="bs-act" onClick={() => setMenuOpen((v) => !v)}>⋯</button>
              {menuOpen && (
                <div className="bs-menu">
                  {onEdit && <button type="button" onClick={() => { setMenuOpen(false); onEdit(); }}>Edit</button>}
                  {onDelete && (confirmDel
                    ? <span className="bs-confirm">Delete? <button type="button" className="bs-danger" onClick={() => { setMenuOpen(false); onDelete(); }}>Yes</button></span>
                    : <button type="button" className="bs-danger" onClick={() => setConfirmDel(true)}>Delete</button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {source && <span className="bs-provenance">imported from {source}</span>}
      <h1 className="bs-title">{recipe.title}</h1>
      {dateline && <p className="bs-dateline">{dateline}</p>}
      <HairlineRule />
    </div>
  );
}
