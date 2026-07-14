import { useState, useRef } from 'react'
import { parseSegments, proportionBand } from '../spine/logic/hypnogram'
import { hm, clockTime } from '../spine/logic/healthFormat'
import { weekdayNarrow } from '../spine/logic/gymDates'

const AMS = { timeZone: 'Europe/Amsterdam', hour: 'numeric', hour12: false }
const hourFmt = (ms) => new Intl.DateTimeFormat('en-GB', AMS).format(ms)

export default function MobileHealthSleep({ data, onBack }) {
  const [selSeg, setSelSeg] = useState(null)
  const startX = useRef(null)

  const last = data.sleep?.lastNight
  const onTS = (e) => { if (e.touches[0].clientX < 30) startX.current = e.touches[0].clientX }
  const onTE = (e) => {
    if (startX.current != null) {
      if (e.changedTouches[0].clientX - startX.current > 80) onBack()
      startX.current = null
    }
  }

  if (!last) return (
    <div className="mh-face" onTouchStart={onTS} onTouchEnd={onTE}>
      <button className="mh-back" onClick={onBack} type="button">‹ Sleep</button>
      <p className="mh-empty" style={{ padding: '16px 20px' }}>No sleep recorded last night.</p>
    </div>
  )

  // Stage bar (time-axis from segments, fallback to proportion band)
  const nightRow = (data.sleepRows || []).find(r => r.night_date === last.nightDate)
  const blocks = parseSegments(nightRow?.segments)
  const band = blocks.length === 0 ? proportionBand(last.stages) : []
  const rangeStart = blocks[0]?.startMs ?? 0
  const rangeEnd = blocks[blocks.length - 1]?.endMs ?? 0
  const rangeSpan = rangeEnd - rangeStart || 1

  // Hour ticks
  const ticks = []
  if (blocks.length > 0) {
    const first = Math.ceil(rangeStart / 3600000) * 3600000
    for (let ms = first; ms < rangeEnd; ms += 3600000) {
      ticks.push({ ms, pct: ((ms - rangeStart) / rangeSpan) * 100 })
    }
  }

  // 7-night trend
  const nights = data.sleep.rolling?.[7]?.values || []
  const avg7 = data.sleep.rolling?.[7]?.avg
  const maxDur = Math.max(...nights.map(n => n.value || 0), 1)

  // Footer
  const vsGoal = data.sleep.durationVsGoal
  const tally = data.sleepGoalTally

  return (
    <div className="mh-face" onTouchStart={onTS} onTouchEnd={onTE}>
      <button className="mh-back" onClick={onBack} type="button">‹ Sleep</button>

      {/* Stage bar */}
      <div className="mh-hypno" onClick={() => setSelSeg(null)}>
        {blocks.length > 0 ? (
          <>
            <div className="mh-hypno-bar">
              {blocks.map((b, i) => (
                <div key={i}
                  className={`mh-hypno-seg mh-stage--${b.cls}${selSeg === i ? ' mh-hypno-seg--sel' : ''}`}
                  style={{ left: `${((b.startMs - rangeStart) / rangeSpan) * 100}%`, width: `${Math.max(((b.endMs - b.startMs) / rangeSpan) * 100, 0.3)}%` }}
                  onClick={(e) => { e.stopPropagation(); setSelSeg(selSeg === i ? null : i) }}
                />
              ))}
            </div>
            <div className="mh-hypno-ticks">
              {ticks.map((t, i) => (
                <span key={i} className="mh-hypno-tick" style={{ left: `${t.pct}%` }}>
                  {i % 2 === 0 && <span className="mh-hypno-tick-label">{hourFmt(t.ms)}</span>}
                </span>
              ))}
            </div>
          </>
        ) : band.length > 0 ? (
          <div className="mh-stage-bar" style={{ height: 20 }}>
            {band.map(s => <div key={s.stage} className={`mh-stage mh-stage--${s.cls}`} style={{ flex: s.pct }} />)}
          </div>
        ) : null}
        {selSeg != null && blocks[selSeg] && (
          <p className="mh-hypno-detail">
            {blocks[selSeg].label} · {clockTime(new Date(blocks[selSeg].startMs))}–{clockTime(new Date(blocks[selSeg].endMs))} · {Math.round(blocks[selSeg].durMin)}m
          </p>
        )}
        {/* Legend */}
        <div className="mh-stage-legend" style={{ marginTop: selSeg != null ? 4 : 8 }}>
          {(blocks.length > 0
            ? [{ cls: 'deep', label: 'Deep' }, { cls: 'rem', label: 'REM' }, { cls: 'core', label: 'Core' }, { cls: 'awake', label: 'Awake' }]
            : band
          ).map(s => (
            <span key={s.cls || s.stage} className="mh-stage-tag">
              <span className={`mh-stage-dot mh-stage--${s.cls}`} /> {s.label}
            </span>
          ))}
        </div>
      </div>

      <hr className="m-rule" style={{ margin: '0 20px' }} />

      {/* Rhythm readout */}
      <div className="mh-rhythm">
        <p className="mh-rhythm-row"><span className="mh-rhythm-mark">●</span> in bed {clockTime(last.inBedAt)}</p>
        <p className="mh-rhythm-dur">{hm(last.asleepMinutes)}</p>
        <p className="mh-rhythm-row"><span className="mh-rhythm-mark">○</span> woke {clockTime(last.wokeAt)}</p>
      </div>

      <hr className="m-rule" style={{ margin: '0 20px' }} />

      {/* Footer — target + nights hit (respiratory + awakenings cut in Piece 2) */}
      <div className="mh-footer">
        <div className="mh-footer-cell">
          <span className="mh-footer-val">{vsGoal ? hm(vsGoal.target) : '—'}</span>
          <span className="mh-footer-label">{vsGoal ? (vsGoal.met ? 'target · hit' : 'target') : 'no goal set'}</span>
        </div>
        <div className="mh-footer-cell">
          <span className="mh-footer-val">{tally ? `${tally.hit}/${tally.total}` : '—'}</span>
          <span className="mh-footer-label">{tally ? 'nights hit' : 'no goal set'}</span>
        </div>
      </div>

      {/* 7-night trend */}
      {nights.length > 0 && (
        <>
          <hr className="m-rule" style={{ margin: '0 20px' }} />
          <div className="mh-trend">
            <p className="mh-kicker">7-night avg {avg7 != null ? hm(avg7) : ''}</p>
            <div className="mh-trend-bars">
              {nights.map(n => (
                <div key={n.ymd} className="mh-trend-col">
                  <div className="mh-trend-bar" style={{ height: `${((n.value || 0) / maxDur) * 100}%` }} />
                  <span className="mh-trend-day">{weekdayNarrow(n.ymd)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
