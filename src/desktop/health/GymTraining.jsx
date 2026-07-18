import { formatVolume } from "../../spine/logic/gymFormat";

// LifeOS — Gym V2 (Piece 1): the Training Progress zone. The EXISTING combined view lifted
// from the old over-time quadrant, AS-IS — the box-score band (sessions + volume) and the
// rolling-7 volume trend line — just repositioned into the new shell. It PAGES with the time
// switcher (the parent computes box + series for the viewed window). The routine tabs (Push/
// Pull/Legs) + the per-lift delta table are Piece 3. The "more ›" / "records ›" links keep the
// session archive + per-lift records reachable. Pure presentation.

// A compact volume trend line (stretched to the zone; no axis — the numbers are above).
function VolLine({ pts }) {
  const vals = pts.map((p) => p.value);
  const max = Math.max(1, ...vals);
  const n = pts.length;
  const W = 300, H = 40;
  const x = (i) => (n <= 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v) => H - (v / max) * (H - 3) - 1.5;
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  return (
    <svg className="gym-volline" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="volume trend">
      <polyline points={line} />
    </svg>
  );
}

export default function GymTraining({ box, series, onMore, onRecords }) {
  const vol = formatVolume(box?.volume);
  return (
    <section className="gym-zone gym-training">
      <span className="gym-kicker">Training progress</span>
      <div className="gym-over-stats">
        <span><b>{box?.sessions ?? 0}</b> sessions</span>
        <span><b>{vol.num}</b> kg</span>
      </div>
      {series?.rolling?.length ? <VolLine pts={series.rolling} /> : null}
      <div className="gym-more-row">
        <button type="button" className="gym-more" onClick={onMore}>more ›</button>
        <button type="button" className="gym-more" onClick={onRecords}>records ›</button>
      </div>
    </section>
  );
}
