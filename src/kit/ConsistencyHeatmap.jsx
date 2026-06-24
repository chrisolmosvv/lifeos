import './formGuide.css'

// ConsistencyHeatmap — front-page zone 3. A calm, broadsheet take on the
// GitHub-contribution grid: a cell per Amsterdam-calendar day for ~12 rolling
// weeks, shaded in quiet terracotta tints when trained (deeper = more sets that
// day), faint when a rest day. Sealed gym-kit block: it ONLY displays the calc
// layer's heatmap data (gymHeatmap) + the streak — no fetching, no maths.
//
// Per the G7 decision the zone LEADS with sessions-per-week (the headline); the
// daily streak sits beside it as a small secondary figure, never the hero.
export default function ConsistencyHeatmap({ data, streak }) {
  if (!data || data.totalSessions === 0) {
    return <p className="fg-band-empty">No training logged in this window yet.</p>
  }

  const avg = (Math.round(data.avgPerWeek * 10) / 10).toFixed(1)

  return (
    <div className="fg-hm">
      <div className="fg-hm-head">
        <span className="fg-hm-num">{avg}</span>
        <span className="fg-hm-unit">sessions / week</span>
        <span className="fg-hm-streak">
          {streak > 0 ? `· ${streak}-day streak` : '· no active streak'}
        </span>
      </div>

      <div className="fg-hm-grid">
        {data.columns.map((col, ci) => (
          <div className="fg-hm-col" key={ci}>
            {col.cells.map((cell, ri) => (
              <div
                key={ri}
                className={`fg-hm-cell fg-hm-cell--t${cell.tier}`}
                title={`${cell.ymd}${cell.trained ? ` · ${cell.sets} sets` : ' · rest'}`}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="fg-hm-foot">
        <span className="fg-hm-range">{data.rangeLabel}</span>
        <span className="fg-hm-legend">
          less
          <i className="fg-hm-cell fg-hm-cell--t0" />
          <i className="fg-hm-cell fg-hm-cell--t1" />
          <i className="fg-hm-cell fg-hm-cell--t2" />
          <i className="fg-hm-cell fg-hm-cell--t3" />
          more
        </span>
      </div>
    </div>
  )
}
