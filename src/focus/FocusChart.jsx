import { useState } from "react";
import { humanDayShort } from "../gym/gymDates.js";
import { formatDuration, hoursMins } from "./focusFormat.js";
import { rangeBars } from "./focusTrend.js";

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
// The range controls (window arrows · Week·Month·90d · expand) arrive in piece 4.
//
// Props: rawRows, today (ymd), now (ms), colorFor(id), nameFor(id), catRank(id),
//   filterCat, onPickCategory.
const STEP = 7200; // 2 hours in seconds — the gridline + ceiling step

export default function FocusChart({ rawRows, today, now, colorFor, nameFor, catRank, filterCat, onPickCategory }) {
  const [hoverYmd, setHoverYmd] = useState(null);
  const data = rangeBars(rawRows, { range: "week", now });

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

        <div className="focus-chart-cols">
          {data.days.map((d) => (
            <div key={d.ymd} className={"focus-chart-col" + (d.ymd === today ? " is-today" : "")}
              onMouseEnter={() => setHoverYmd(d.ymd)} onMouseLeave={() => setHoverYmd((y) => (y === d.ymd ? null : y))}>
              <span className="focus-chart-total tnum">{d.total > 0 ? hoursMins(d.total) : ""}</span>
              <div className="focus-chart-barwrap">
                <div className="focus-chart-bar" style={{ height: `${(d.total / ceiling) * 100}%` }}>
                  {ordered(d.segments).map((s) => (
                    <span key={String(s.categoryId)}
                      className={"focus-chart-seg" + (filterCat != null && s.categoryId !== filterCat ? " is-dim" : "")}
                      style={{ height: `${(s.focusSeconds / d.total) * 100}%`, background: colorFor(s.categoryId) }}
                      onClick={s.categoryId ? () => onPickCategory(s.categoryId) : undefined} />
                  ))}
                </div>
              </div>
              <span className="focus-chart-lbl">{humanDayShort(d.ymd).split(" ")[0].charAt(0)}</span>
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
