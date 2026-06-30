// LifeOS — Health kit: the breadcrumb (V2), replacing the "← Health" back link
// uniformly across Health surfaces. crumbs = [{ label, onClick? }] left→right; every
// crumb with an onClick is a button, the LAST crumb is always the static current
// location. e.g. [{label:"Health", onClick:goHub}, {label:"Sleep"}] → "Health / Sleep".
export default function Breadcrumb({ crumbs }) {
  return (
    <nav className="crumb" aria-label="Breadcrumb">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={i} className="crumb-item">
            {!last && c.onClick ? (
              <button type="button" className="crumb-link" onClick={c.onClick}>{c.label}</button>
            ) : (
              <span className="crumb-here">{c.label}</span>
            )}
            {!last && <span className="crumb-sep">/</span>}
          </span>
        );
      })}
    </nav>
  );
}
