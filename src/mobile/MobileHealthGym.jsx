import { useState, useRef } from 'react'
import MobileSessionReport from './MobileSessionReport'
import { formatVolume, formatDuration, formatCount, prettyMuscle } from '../spine/logic/gymFormat'
import { storyHeadline } from '../spine/logic/gymStory'
import { recentSessions } from '../spine/logic/gymSessions'
import { trendSeries, dailyVolumeSeries } from '../spine/logic/gymTrend'
import { muscleBalance } from '../spine/logic/gymBalance'
import { humanDayShort, weekdayNarrow } from '../spine/logic/gymDates'

export default function MobileHealthGym({ data, onBack }) {
  const [sessionId, setSessionId] = useState(null)
  const startX = useRef(null)
  const onTS = (e) => { if (e.touches[0].clientX < 30) startX.current = e.touches[0].clientX }
  const onTE = (e) => {
    if (startX.current != null) {
      if (e.changedTouches[0].clientX - startX.current > 80) onBack()
      startX.current = null
    }
  }

  if (sessionId) return <MobileSessionReport data={data} sessionId={sessionId} onBack={() => setSessionId(null)} />

  const wk = data.gymWorkouts || []
  if (wk.length === 0) return (
    <div className="mh-face" onTouchStart={onTS} onTouchEnd={onTE}>
      <button className="mh-back" onClick={onBack} type="button">‹ Gym</button>
      <p className="mh-empty" style={{ padding: '16px 20px' }}>No sessions yet.</p>
    </div>
  )

  const headline = storyHeadline(wk)
  const box = data.gym
  const vol = formatVolume(box.volume), sess = formatCount(box.sessions)
  const time = formatDuration(box.timeMinutes), prs = formatCount(box.newPRs)
  const trend = trendSeries(wk, { weeks: 8 })
  const maxWk = Math.max(...trend.volume, 1)
  const dvs = dailyVolumeSeries(wk, { days: 28 })
  const maxDay = Math.max(...dvs.raw.map(d => d.value), 1)
  const bal = muscleBalance(wk)
  const recent = recentSessions(wk).slice(0, 10)

  // Heatmap offset: align first day to correct weekday column (Mon=0)
  const firstD = new Date(`${dvs.raw[0]?.ymd}T12:00:00Z`)
  const offset = (firstD.getUTCDay() + 6) % 7

  return (
    <div className="mh-face" onTouchStart={onTS} onTouchEnd={onTE}>
      <button className="mh-back" onClick={onBack} type="button">‹ Gym</button>

      {headline && <p className="mh-gym-story">{headline}</p>}

      <div style={{ padding: '0 20px' }}>
        <div className="mh-gym-grid">
          <Stat n={vol.num} u={vol.unit} l="Volume" />
          <Stat n={sess.num} u={sess.unit} l="Sessions" />
          <Stat n={time.num} u={time.unit} l="Time" />
          <Stat n={prs.num} u={prs.unit} l="PRs" />
        </div>
      </div>

      <hr className="m-rule" style={{ margin: '12px 20px 0' }} />

      {/* Weekly volume trend */}
      <div style={{ padding: '12px 20px 0' }}>
        <p className="mh-kicker">Weekly volume</p>
        <div className="mh-trend-bars">
          {trend.volume.map((v, i) => (
            <div key={i} className="mh-trend-col">
              <div className="mh-trend-bar" style={{ height: `${(v / maxWk) * 100}%` }} />
              <span className="mh-trend-day">{trend.labels[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <hr className="m-rule" style={{ margin: '12px 20px 0' }} />

      {/* Heatmap */}
      <div style={{ padding: '12px 20px 0' }}>
        <p className="mh-kicker">Training days</p>
        <div className="mh-heat-header">
          {['M','T','W','T','F','S','S'].map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div className="mh-heat-grid">
          {Array(offset).fill(null).map((_, i) => <span key={`p${i}`} className="mh-heat-cell" />)}
          {dvs.raw.map(d => (
            <span key={d.ymd} className={`mh-heat-cell${d.value > 0 ? ' mh-heat-on' : ''}`}
              style={d.value > 0 ? { opacity: 0.12 + (d.value / maxDay) * 0.45 } : undefined} />
          ))}
        </div>
      </div>

      <hr className="m-rule" style={{ margin: '12px 20px 0' }} />

      {/* Balance */}
      {bal.ranked.length > 0 && (
        <div style={{ padding: '12px 20px 0' }}>
          <p className="mh-kicker">Body-part split</p>
          <div className="mh-balance">
            {bal.ranked.slice(0, 6).map(m => (
              <div key={m.muscle} className="mh-bal-row">
                <span className="mh-bal-name">{prettyMuscle(m.muscle)}</span>
                <span className="mh-bal-bar"><span className="mh-bal-fill" style={{ width: `${(m.sets / (bal.ranked[0]?.sets || 1)) * 100}%` }} /></span>
                <span className="mh-bal-sets">{m.sets}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <hr className="m-rule" style={{ margin: '12px 20px 0' }} />

      {/* Recent sessions */}
      <div style={{ padding: '12px 20px 0' }}>
        <p className="mh-kicker">Recent sessions</p>
        {recent.map(s => (
          <div key={s.id} className="mh-sess-row" onClick={() => setSessionId(s.id)}>
            <span className="mh-sess-date">{humanDayShort(s.dateYMD)}</span>
            <span className="mh-sess-title">{s.title || 'Session'}{s.isPR ? ' ·' : ''}</span>
            {s.isPR && <span className="mh-sess-pr">PR</span>}
            <span className="mh-sess-vol">{formatVolume(s.volume).num} kg</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Stat({ n, u, l }) {
  return (
    <div className="mh-gym-stat">
      <span className="mh-gym-num">{n}{u && <span className="mh-gym-unit"> {u}</span>}</span>
      <span className="mh-gym-label">{l}</span>
    </div>
  )
}
