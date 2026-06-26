import { amsClockMinutes } from "../gym/gymDates";

// A compact band of the last 7 nights' bed + wake clock times, on a noon→noon axis
// (noon = 0) so evening→morning reads left→right without scattering across midnight.
// Bed = ink dot, wake = terracotta dot. Pure presentation of raw in_bed_at/woke_at
// (no derived metric) — a quick visual read of how spread the week's times are.
const anchor = (m) => (Number.isFinite(m) ? (m + 720) % 1440 : null); // noon → 0

export default function BedWakeBand({ rows }) {
  const nights = (rows || []).filter((r) => r?.night_date).slice(-7);
  const pts = [];
  for (const r of nights) {
    const b = anchor(amsClockMinutes(r.in_bed_at));
    const w = anchor(amsClockMinutes(r.woke_at));
    if (b != null) pts.push({ kind: "bed", pos: (b / 1440) * 100 });
    if (w != null) pts.push({ kind: "wake", pos: (w / 1440) * 100 });
  }
  if (pts.length === 0) return null;
  return (
    <div className="bw-band" aria-hidden="true">
      {pts.map((p, i) => (
        <span key={i} className={`bw-dot bw-${p.kind}`} style={{ left: `${p.pos}%` }} />
      ))}
    </div>
  );
}
