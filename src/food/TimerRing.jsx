// TimerRing (V2 P7 — extracted from CookMode) — a thin countdown ring; the dashoffset steps each
// second (a CSS transition smooths it). Reused by CookPage's timer summary.
export default function TimerRing({ remaining, total }) {
  const R = 11;
  const C = 2 * Math.PI * R;
  const frac = total > 0 ? remaining / total : 0;
  const done = remaining <= 0;
  return (
    <svg className={done ? "cm-ring is-done" : "cm-ring"} viewBox="0 0 28 28" width="28" height="28">
      <circle className="cm-ring-track" cx="14" cy="14" r={R} />
      <circle className="cm-ring-arc" cx="14" cy="14" r={R} style={{ strokeDasharray: C, strokeDashoffset: C * (1 - frac) }} />
    </svg>
  );
}
