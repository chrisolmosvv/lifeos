// CookRail — the always-visible sidebar: Parked (passive steps with timers) + Not yet (upcoming).
// Soonest-first in Parked. Faint in Not yet. Renders nothing if both are empty (bare fallback).

function fmtMSS(secs) {
  if (secs == null || secs <= 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function shortLabel(text) {
  return (text || "").split(/\s+/).slice(0, 5).join(" ");
}

function ParkedItem({ item, isUrgent }) {
  return (
    <div className={`cc-parked-item${isUrgent ? " is-urgent" : ""}`}>
      <span className="cc-parked-dot">{isUrgent ? "●" : "○"}</span>
      <span className="cc-parked-label">{shortLabel(item.step.text)}</span>
      <span className="cc-parked-time tnum">{fmtMSS(item.remaining)}</span>
    </div>
  );
}

function AheadItem({ item }) {
  return (
    <div className="cc-ahead-item">
      <span className="cc-ahead-num">{item.index + 1}.</span>
      <span className="cc-ahead-label">{shortLabel(item.step.text)}</span>
    </div>
  );
}

export default function CookRail({ parked, notYet }) {
  if (parked.length === 0 && notYet.length === 0) return null;

  // The soonest parked item is the one with the smallest remaining time
  const soonestIdx = parked.length
    ? parked.reduce((best, p, i) => (p.remaining < parked[best].remaining ? i : best), 0)
    : -1;

  return (
    <aside className="cc-rail">
      {parked.length > 0 && (
        <div className="cc-rail-section">
          <div className="cc-rail-head">Parked</div>
          {parked.map((p, i) => (
            <ParkedItem key={p.index} item={p} isUrgent={i === soonestIdx} />
          ))}
        </div>
      )}

      {notYet.length > 0 && (
        <div className="cc-rail-section">
          <div className="cc-rail-head">Not yet</div>
          {notYet.map((item) => (
            <AheadItem key={item.index} item={item} />
          ))}
        </div>
      )}
    </aside>
  );
}
