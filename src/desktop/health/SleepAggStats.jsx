// LifeOS — Sleep aggregate (V2 P1 sub-2): the full-width TOP STATS ROW for the Week /
// Month / 90-day views. Broadsheet number+label cells separated by vertical hairlines,
// no boxes. The first cell is the HERO (avg duration, big Fraunces). Cells are passed in
// already-formatted; a null/absent cell is simply omitted (e.g. baseline on 90-day, so
// the row reflows to 5). Pure presentation.
//   cells = [{ label, value, hero?, accent? }]
export default function SleepAggStats({ cells }) {
  return (
    <div className="agg-stats">
      {cells.filter(Boolean).map((c, i) => (
        <div className={`agg-stat${c.hero ? " agg-stat--hero" : ""}`} key={i}>
          <span className="sleep-label">{c.label}</span>
          <b className={c.accent ? "agg-stat-val agg-stat-val--accent" : "agg-stat-val"}>{c.value}</b>
        </div>
      ))}
    </div>
  );
}
