import { useState } from "react";
import { humanDayShort, weekdayNarrow } from "../../spine/logic/gymDates";
import { formatDuration, hoursMins } from "./focusFormat.js";

// FocusChart (overview redesign, piece 3) — the day-by-day focus chart inside the
// overview: one stacked bar per day, category-coloured, for the rolling 7-day week.
// Detail added this piece, all hairline-faint / small-muted:
//   • faint 2-hour gridlines behind the bars; ceiling = the tallest day in the window
//     rounded UP to the next 2h (bars never clip; the scale adapts as the window moves).
//   • FIXED stack order: each bar's segments are sorted by a stable category order at
//     DRAW time (not by size — rangeBars is untouched), with a 1px paper hairline between.
//   • each bar's day total always shown above it in H:MM (not hover-gated).
//   • hovering a bar reveals that day's per-category name + duration (the names are the
//     colour key — no separate legend).
// The window (which days) is chosen by the range controls (piece 4); this component
// just draws whatever `data` window it's handed. Month/90d pack many bars, so the
// per-bar totals + day-letters are suppressed when dense (the gridlines + hover carry it).
//
// Props: data (rangeBars output for the window), today (ymd), colorFor(id), nameFor(id),
//   catRank(id), filterCat, onPickCategory.
const STEP = 7200; // 2 hours in seconds — the gridline + ceiling step

const EMPTY = { week: "No focus this week yet", month: "No focus this month yet", ninety: "No focus in this range yet" };

export default function FocusChart({ data, today, range, colorFor, nameFor, catRank, filterCat, onPickCategory, filterDay }) {
  const [hoverYmd, setHoverYmd] = useState(null);
  const dense = data.days.length > 10; // many bars (Month/90d) → drop per-bar labels
  const empty = data.total === 0; // no focus in the whole window → a quiet invite over the gridlines
  // Reflect a week-strip day selection by dimming the other bars — only if that day is
  // actually in the current window (else nothing to highlight; leave the chart alone).
  const dayInWindow = filterDay != null && data.days.some((d) => d.ymd === filterDay);

  const maxTotal = Math.max(0, ...data.days.map((d) => d.total));
  const ceiling = Math.max(STEP, Math.ceil(maxTotal / STEP) * STEP);
  const lines = [];
  for (let v = STEP; v <= ceiling; v += STEP) lines.push(v);

  // Draw-time stable order so a category holds the same slot in every bar + the hover list.
  const ordered = (segs) => [...segs].sort((a, b) => catRank(a.categoryId) - catRank(b.categoryId));
  const hoverDay = hoverYmd ? data.days.find((d) => d.ymd === hoverYmd) : null;

  return (
    <div className="focus-chart">
      <div className="focus-chart-plot">
        <div className="focus-chart-grid" aria-hidden="true">
          {lines.map((v) => (
            <div key={v} className="focus-chart-gridline" style={{ bottom: `${(v / ceiling) * 100}%` }}>
              <span>{formatDuration(v)}</span>
            </div>
          ))}
        </div>

        {empty && <div className="focus-chart-empty">{EMPTY[range] || EMPTY.week}</div>}

        <div className={"focus-chart-cols" + (dense ? " is-dense" : "")}>
          {data.days.map((d, i) => (
            <div key={d.ymd} className={"focus-chart-col" + (d.ymd === today ? " is-today" : "") + (dayInWindow && d.ymd !== filterDay ? " is-daydim" : "")}
              onMouseEnter={() => setHoverYmd(d.ymd)} onMouseLeave={() => setHoverYmd((y) => (y === d.ymd ? null : y))}>
              <span className="focus-chart-total tnum">{!dense && d.total > 0 ? hoursMins(d.total) : ""}</span>
              <div className="focus-chart-barwrap">
                <div className="focus-chart-bar" style={{ height: `${(d.total / ceiling) * 100}%`, animationDelay: `${Math.min(i * 30, 400)}ms` }}>
                  {ordered(d.segments).map((s) => (
                    <span key={String(s.categoryId)}
                      className={"focus-chart-seg" + (filterCat != null && s.categoryId !== filterCat ? " is-dim" : "")}
                      style={{ height: `${(s.focusSeconds / d.total) * 100}%`, background: colorFor(s.categoryId) }}
                      onClick={s.categoryId ? () => onPickCategory(s.categoryId) : undefined} />
                  ))}
                </div>
              </div>
              <span className="focus-chart-lbl">{dense ? "" : weekdayNarrow(d.ymd)}</span>
            </div>
          ))}
        </div>

        {hoverDay && hoverDay.total > 0 && (
          <div className="focus-chart-hover" aria-hidden="true">
            <div className="focus-chart-hover-day">{humanDayShort(hoverDay.ymd)}</div>
            {ordered(hoverDay.segments).map((s) => (
              <div key={String(s.categoryId)} className="focus-chart-hover-row">
                <span className="focus-dot" style={{ background: colorFor(s.categoryId) }} />
                <span className="focus-chart-hover-name">{nameFor(s.categoryId)}</span>
                <span className="focus-chart-hover-dur tnum">{hoursMins(s.focusSeconds)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
