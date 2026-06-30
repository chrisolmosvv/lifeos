// LifeOS — Body (V2 P2, "Scale Ticket"): the 3-group metric TABLE. Columns
// METRIC · LATEST · MOVEMENT · 90-DAY TRACE · TARGET/BAND. Three groups (Composition /
// Energy / Vitals), each an uppercase eyebrow + a 2px top rule + a per-group freshness
// note (the honest two-source flag: Composition "now", Vitals "7-day", Energy "to
// yesterday"). Pure presentation — the page builds the rows. STAGE 1 = scaffold: cells
// can be placeholders; the band/treatment cells fill in stages 2–4. Rows flex to fill
// the fold (the .health-fit zero-scroll model).
//   groups = [{ name, freshness, rows: [{ label, latest, movement, trace, target, greyed }] }]
export default function BodyTable({ groups }) {
  return (
    <div className="body-table">
      <div className="bt-head">
        <span>Metric</span>
        <span>Latest</span>
        <span>Movement</span>
        <span>90-day trace</span>
        <span>Target / band</span>
      </div>

      {groups.map((g) => (
        <div className="bt-group" key={g.name}>
          <div className="bt-eyebrow">
            <span className="bt-eyebrow-name">{g.name}</span>
            {g.freshness && <span className="bt-eyebrow-fresh">{g.freshness}</span>}
          </div>
          {g.rows.map((r) => (
            <div className={`bt-row${r.greyed ? " bt-row--greyed" : ""}`} key={r.label}>
              <span className="bt-metric">{r.label}</span>
              <span className="bt-latest">{r.latest ?? "—"}</span>
              <span className="bt-move">{r.movement ?? "—"}</span>
              <span className="bt-trace">{r.trace ?? <span className="bt-trace-ph" aria-hidden="true" />}</span>
              <span className="bt-target">{r.target ?? "—"}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
