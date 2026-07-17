import { fmtDelta } from "../../spine/logic/bodyFormat";

// LifeOS — Body: the trend-arrow cell, shared by the Vitals column (and previously the
// Scale-Ticket table, retired in Body V3). Movement = the week-over-week arrow + delta
// (terracotta on real movement, ink when steady, "—" when there isn't a full window).
// (Trace / JourneyBar / Band were retired with the table in Piece 6 — prove-dead.)

export function Movement({ metric, trend }) {
  if (!trend || trend.dir == null) return <span className="bt-move-none">—</span>;
  if (trend.dir === "flat") return <span className="bt-move-flat">→ steady</span>;
  return (
    <span className="bt-move-on">
      {trend.dir === "down" ? "↓" : "↑"} {fmtDelta(metric, trend.diff)}
    </span>
  );
}
