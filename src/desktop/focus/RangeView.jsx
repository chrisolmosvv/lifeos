import { humanDayShort } from "../../spine/logic/gymDates";
import { formatDuration, trendLine } from "./focusFormat.js";

// RangeView (spec §9/§L) — the Week/Month/90 face: full-width stacked bars per day,
// segmented by category (the mix shifting over time in one chart), filling the sheet,
// over a foot band carrying the trend + period total. Zero-scroll like the overview.
// Pure presentation over rangeBars() + weekVsTrailingAvg().
//
// Props: data (rangeBars output {days,total}), trend (weekVsTrailingAvg output),
//   colorFor(id), range ('week'|'month'|'ninety'), filterCat, onPickCategory.
const LABELS = { week: "This week", month: "This month", ninety: "Last 90 days" };

export default function RangeView({ data, trend, colorFor, range, filterCat, onPickCategory }) {
  const peak = Math.max(1, ...data.days.map((d) => d.total));
  const tl = trendLine(trend);
  const sparse = range === "week"; // day labels only fit on the 7-day view

  return (
    <div className="focus-range">
      <div className="focus-range-chart" role="img" aria-label={LABELS[range] + " focus by day"}>
        {data.days.map((d) => (
          <div key={d.ymd} className="focus-bar-col" title={`${humanDayShort(d.ymd)} · ${formatDuration(d.total)}`}>
            <div className="focus-bar" style={{ height: `${(d.total / peak) * 100}%` }}>
              {d.segments.map((s) => (
                <span key={String(s.categoryId)} className={"focus-bar-seg" + (filterCat != null && s.categoryId !== filterCat ? " is-dim" : "")}
                  style={{ height: `${(s.focusSeconds / d.total) * 100}%`, background: colorFor(s.categoryId) }}
                  onClick={s.categoryId ? () => onPickCategory(s.categoryId) : undefined} />
              ))}
            </div>
            {sparse && <span className="focus-bar-lbl">{humanDayShort(d.ymd).split(" ")[0]}</span>}
          </div>
        ))}
      </div>

      <div className="focus-range-foot">
        <span className="focus-range-total tnum">{formatDuration(data.total)} · {LABELS[range]}</span>
        <span className="focus-range-trend">
          {tl.delta ? `${tl.total} this week · ${tl.delta}` : `${tl.total} this week`}
          {tl.note && <span className="focus-range-note"> · {tl.note}</span>}
        </span>
      </div>
    </div>
  );
}
