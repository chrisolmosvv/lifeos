import { humanDayShort } from "../gym/gymDates.js";
import { formatDuration } from "./focusFormat.js";
import { rangeBars } from "./focusTrend.js";

// FocusChart (overview redesign, piece 1 skeleton) — the day-by-day focus chart now
// lives INSIDE the Focus overview (it used to be a separate range screen). This piece
// just drops the EXISTING stacked bars in for the rolling 7-day week: one bar per day,
// segmented by category colour, a day letter beneath each. The richer detail (2-hour
// gridlines + labels, always-on totals, fixed stack order, hover names) and the range-
// controls line (window arrows · Week·Month·90d · expand) arrive in later pieces. It
// fills its slot in the right column and never scrolls. Pure over rangeBars().
//
// Props: rawRows, today (ymd), now (ms), colorFor(id), filterCat, onPickCategory.
export default function FocusChart({ rawRows, today, now, colorFor, filterCat, onPickCategory }) {
  const data = rangeBars(rawRows, { range: "week", now });
  const peak = Math.max(1, ...data.days.map((d) => d.total));

  return (
    <div className="focus-chart">
      <div className="focus-chart-plot" role="img" aria-label="This week's focus by day">
        {data.days.map((d) => (
          <div key={d.ymd} className="focus-chart-col" title={`${humanDayShort(d.ymd)} · ${formatDuration(d.total)}`}>
            <div className="focus-chart-bar" style={{ height: `${(d.total / peak) * 100}%` }}>
              {d.segments.map((s) => (
                <span key={String(s.categoryId)}
                  className={"focus-chart-seg" + (filterCat != null && s.categoryId !== filterCat ? " is-dim" : "")}
                  style={{ height: `${(s.focusSeconds / d.total) * 100}%`, background: colorFor(s.categoryId) }}
                  onClick={s.categoryId ? () => onPickCategory(s.categoryId) : undefined} />
              ))}
            </div>
            <span className="focus-chart-lbl">{humanDayShort(d.ymd).split(" ")[0].charAt(0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
