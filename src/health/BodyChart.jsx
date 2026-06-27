// BodyChart — a calm, hand-rolled inline-SVG chart for the Body page (no chart
// dependency), mirroring the gym TrendChart in spirit. It ONLY draws the calc
// layer's daily-average series — no fetching, no maths.
//
// PIECE 2 builds the `spark` variant: a small, axis-less 90-day sparkline for a
// tile. It scales to the series' OWN min/max (a body sparkline is about shape, not
// absolute zero), breaks the line on gaps, and dots the latest point. One lonely
// reading draws a single dot (honest — "however thin"). The `full` variant (axes +
// goal line / normal-range band) lands in piece 3.

const SPARK = { w: 160, h: 40, pad: 5 };

export default function BodyChart({ series, variant = "spark" }) {
  const pts = (series || []).filter((p) => Number.isFinite(p?.value));
  if (pts.length === 0) return null;

  const { w, h, pad } = SPARK;
  const vals = pts.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1; // flat series → a centred line, no divide-by-zero
  const ih = h - pad * 2;
  const n = pts.length;
  const x = (i) => (n <= 1 ? w / 2 : (i / (n - 1)) * w);
  const y = (v) => pad + ih - ((v - min) / span) * ih;

  // Build the polyline; a single point has no line (just the dot below).
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const lastX = x(n - 1);
  const lastY = y(pts[n - 1].value);

  return (
    <svg
      className={`body-spark body-spark--${variant}`}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="90-day trend"
    >
      {n > 1 && <polyline className="body-spark-line" points={line} />}
      <circle className="body-spark-dot" cx={lastX} cy={lastY} r={2.6} />
    </svg>
  );
}
