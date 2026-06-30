// LifeOS — Sleep aggregate (V2 P1 sub-2): the RIGHT LEDGER column for the Week / Month
// / 90-day views. Stacked rows, hairline-separated: GOAL · RHYTHM · CONSISTENCY · AWAKE-
// NINGS. A null row is omitted (CONSISTENCY shows on WEEK only — bedtimeConsistency is a
// 7-night metric, so it's honest only there). Pure presentation; values pre-formatted.
//   rows = [{ label, big, sub, accent? }]
export default function SleepAggLedger({ rows }) {
  return (
    <aside className="agg-ledger">
      {rows.filter(Boolean).map((r, i) => (
        <div className="agg-ledger-row" key={i}>
          <span className="sleep-label">{r.label}</span>
          <b className={r.accent ? "agg-ledger-big agg-ledger-big--accent" : "agg-ledger-big"}>{r.big}</b>
          {r.sub && <span className="agg-ledger-sub">{r.sub}</span>}
        </div>
      ))}
    </aside>
  );
}
