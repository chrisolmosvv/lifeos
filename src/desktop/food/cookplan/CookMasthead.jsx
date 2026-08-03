// LifeOS — Food → cook plan MASTHEAD (3d, mock Q). One tight strip: back · title · Ingredients ·
// then a hairline-divided metric row: total planned (or elapsed once cooking) · ON THE TABLE (the
// serve time, click to set, drift readout beneath) · servings stepper.

const two = (n) => String(n).padStart(2, "0");

export default function CookMasthead({
  title, cuisine, metricLabel, metricValue,
  serveVal, onServe, serveDrift, serveState,
  servings, baseServ, onDec, onInc, onBack, onIngredients,
}) {
  return (
    <div className="cpq-mast">
      <div className="cpq-mast-top">
        <button type="button" className="cpq-back" onClick={onBack}>‹ Cookbook</button>
        <h1 className="cpq-title">{title}{cuisine ? <span className="cpq-cuisine"> · {cuisine}</span> : null}</h1>
        <button type="button" className="cpq-ings-btn" onClick={onIngredients}>Ingredients</button>
      </div>

      <div className="cpq-metrics">
        <div className="cpq-metric">
          <span className="cpq-metric-val tnum">{metricValue}</span>
          <span className="cpq-metric-lbl">{metricLabel}</span>
        </div>
        <div className="cpq-metric cpq-metric--serve">
          <label className="cpq-metric-lbl cpq-serve-lbl">On the table</label>
          <input type="time" className="cpq-serve-in tnum" value={serveVal} onChange={(e) => onServe(e.target.value)} />
          {serveDrift && <span className={`cpq-serve-drift cpq-serve-drift--${serveState}`}>{serveDrift}</span>}
        </div>
        <div className="cpq-metric cpq-metric--serv">
          <div className="cpq-serv-row">
            <button type="button" className="cpq-serv-btn" onClick={onDec} aria-label="Fewer servings">−</button>
            <span className="cpq-serv-val tnum">{servings}</span>
            <button type="button" className="cpq-serv-btn" onClick={onInc} aria-label="More servings">+</button>
          </div>
          <span className="cpq-metric-lbl">serving{servings === 1 ? "" : "s"}{servings !== baseServ ? ` · from ${baseServ}` : ""}</span>
        </div>
      </div>
    </div>
  );
}
