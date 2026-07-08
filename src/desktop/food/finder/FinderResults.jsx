import FinderRow from "./FinderRow";

// FinderResults — the three zones over P1's flat results:
//   • Basics/saved zone on top (renders only when it has content — the trusted staples lead).
//   • "From the databases" = the AI top-3 (P1's top3). When a confident staple led the query, P1
//     sets dbSuppressed → the whole DB zone hides behind a quiet "search the databases →" tap.
//   • "more →" reveals the rest.
// A quiet partial note (P1's `note`) shows when a source degraded. No math, no record mutation.
export default function FinderResults({
  zones, dbSuppressed, dbRevealed, onRevealDb, moreShown, onShowMore, note, activeFood, onPick,
}) {
  const { basics, dbTop, dbMore } = zones;
  const showDb = !dbSuppressed || dbRevealed;
  const row = (f) => <FinderRow key={`${f.source}:${f.source_ref ?? "x"}:${f.name}`} food={f} active={f === activeFood} onPick={onPick} />;

  return (
    <div className="fdr-results">
      {note && <p className="fdr-note">{note}</p>}

      {basics.length > 0 && (
        <section className="fdr-zone">
          <span className="fdr-zone-label">Basics</span>
          {basics.map(row)}
        </section>
      )}

      {!showDb ? (
        <button type="button" className="fdr-reveal" onClick={onRevealDb}>search the databases →</button>
      ) : (
        (dbTop.length > 0 || dbMore.length > 0) && (
          <section className="fdr-zone">
            <span className="fdr-zone-label">From the databases</span>
            {dbTop.map(row)}
            {moreShown ? dbMore.map(row) : null}
            {!moreShown && dbMore.length > 0 && (
              <button type="button" className="fdr-more" onClick={onShowMore}>more ({dbMore.length}) →</button>
            )}
          </section>
        )
      )}
    </div>
  );
}
