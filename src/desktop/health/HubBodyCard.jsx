import HubCard from "../kit/HubCard";
import { ageLabel } from "../../spine/logic/healthFormat";

// A trend mark: arrow + delta, shown ONLY when both 7-day windows have data
// (calc returns dir=null otherwise → we render nothing). Non-flat = terracotta (a
// real movement); flat stays ink. delta = the raw gap between the two 7-day means.
function Trend({ trend, unit }) {
  if (!trend || trend.dir == null) return null;
  if (trend.dir === "flat") return <span className="hub-trend hub-trend--flat">→ steady</span>;
  const arrow = trend.dir === "down" ? "↓" : "↑";
  return (
    <span className="hub-trend hub-trend--move">
      {arrow} {Math.abs(trend.diff).toFixed(1)}{unit}
    </span>
  );
}

const num1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : "—");

// Body card. Headline = latest weight + body-fat % side by side (the actual latest
// readings, so a stale weigh-in still shows with its age). Age label is weight-
// centric ("today" / "2 days ago"). Weight + body-fat each carry a trend mark. A
// mini row of three secondary stats — lean mass, resting HR, respiratory rate
// (body-fat is in the headline, so it's NOT repeated here).
export default function HubBodyCard({ body, now, onClick }) {
  const w = body.weight;
  const bf = body.body_fat;
  const age = ageLabel(w?.latestRaw?.at, now);

  const headline = (
    <span className="hub-pair">
      <span className="hub-pair-val">{num1(w?.latestRaw?.value)}<span className="hub-unit">kg</span></span>
      <span className="hub-pair-val">{num1(bf?.latestRaw?.value)}<span className="hub-unit">%</span></span>
    </span>
  );

  const mini = [
    { label: "lean", v: body.lean_mass?.latestRaw?.value, unit: " kg", round: 1 },
    { label: "rest HR", v: body.resting_heart_rate?.latestRaw?.value, unit: "", round: 0 },
    { label: "resp", v: body.respiratory_rate?.latestRaw?.value, unit: "", round: 1 },
  ];

  return (
    <HubCard label={age || "no reading"} headline={headline} onClick={onClick}>
      <div className="hub-trends">
        <Trend trend={w?.trend} unit=" kg" />
        <Trend trend={bf?.trend} unit="%" />
      </div>
      <div className="hub-mini">
        {mini.map((m) => (
          <div className="hub-mini-cell" key={m.label}>
            <div className="hub-mini-num">
              {Number.isFinite(m.v) ? m.v.toFixed(m.round) : "—"}{Number.isFinite(m.v) ? m.unit : ""}
            </div>
            <div className="hub-mini-label">{m.label}</div>
          </div>
        ))}
      </div>
    </HubCard>
  );
}
