import { useState } from 'react'
import { useHealthData } from '../spine/data/useHealthData'
import MobileHealthSleep from './MobileHealthSleep'
import MobileHealthBody from './MobileHealthBody'
import MobileHealthGym from './MobileHealthGym'
import { hm, clockTime, asOf } from '../spine/logic/healthFormat'
import { fmtFull } from '../spine/logic/bodyFormat'
import { formatVolume, formatDuration, formatCount } from '../spine/logic/gymFormat'
import { proportionBand } from '../spine/logic/hypnogram'

// ── Sleep block ──────────────────────────────────────────────────────────────
function SleepBlock({ sleep, onTap }) {
  const last = sleep?.lastNight
  if (!last) return <EmptyBlock kicker="Sleep" message="waiting for first night" onTap={onTap} />

  const band = proportionBand(last.stages)
  return (
    <section className="mh-block" onClick={onTap}>
      <p className="mh-kicker">Sleep</p>
      <p className="mh-hero">{hm(last.asleepMinutes)}</p>
      <p className="mh-detail">{clockTime(last.inBedAt)} – {clockTime(last.wokeAt)}</p>
      {band.length > 0 && (
        <div className="mh-stage-bar">
          {band.map(s => (
            <div key={s.stage} className={`mh-stage mh-stage--${s.cls}`}
              style={{ flex: s.pct }} />
          ))}
        </div>
      )}
      {band.length > 0 && (
        <div className="mh-stage-legend">
          {band.map(s => (
            <span key={s.stage} className="mh-stage-tag">
              <span className={`mh-stage-dot mh-stage--${s.cls}`} />
              {s.label} {s.pct}%
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

// ── Body block ───────────────────────────────────────────────────────────────
function BodyRow({ label, metric, view }) {
  if (!view?.latestRaw) return (
    <div className="mh-body-row">
      <span className="mh-body-label">{label}</span>
      <span className="mh-body-value mh-muted">—</span>
    </div>
  )
  const dir = view.trend?.dir
  const arrow = dir === 'up' ? '↑' : dir === 'down' ? '↓' : dir === 'flat' ? '→' : ''
  return (
    <div className="mh-body-row">
      <span className="mh-body-label">{label}</span>
      <span className="mh-body-value">{fmtFull(metric, view.latestRaw.value)}</span>
      {arrow && <span className="mh-body-arrow">{arrow}</span>}
    </div>
  )
}

function BodyBlock({ body, onTap }) {
  const w = body?.weight
  const bf = body?.body_fat
  if (!w?.latestRaw && !bf?.latestRaw) return <EmptyBlock kicker="Body" message="waiting for first reading" onTap={onTap} />
  return (
    <section className="mh-block" onClick={onTap}>
      <p className="mh-kicker">Body</p>
      <BodyRow label="Weight" metric="weight" view={w} />
      <BodyRow label="Body fat" metric="body_fat" view={bf} />
    </section>
  )
}

// ── Gym block ────────────────────────────────────────────────────────────────
function GymStat({ num, unit, label }) {
  return (
    <div className="mh-gym-stat">
      <span className="mh-gym-num">{num}{unit && <span className="mh-gym-unit"> {unit}</span>}</span>
      <span className="mh-gym-label">{label}</span>
    </div>
  )
}

function GymBlock({ gym, hasData, onTap }) {
  if (!hasData) return <EmptyBlock kicker="Gym" message="no sessions yet" onTap={onTap} />
  const vol = formatVolume(gym.volume)
  const sess = formatCount(gym.sessions)
  const time = formatDuration(gym.timeMinutes)
  const prs = formatCount(gym.newPRs)
  return (
    <section className="mh-block" onClick={onTap}>
      <p className="mh-kicker">Gym</p>
      <div className="mh-gym-grid">
        <GymStat num={vol.num} unit={vol.unit} label="Volume" />
        <GymStat num={sess.num} unit={sess.unit} label="Sessions" />
        <GymStat num={time.num} unit={time.unit} label="Time" />
        <GymStat num={prs.num} unit={prs.unit} label="PRs" />
      </div>
    </section>
  )
}

// ── Shared ───────────────────────────────────────────────────────────────────
function EmptyBlock({ kicker, message, onTap }) {
  return (
    <section className="mh-block" onClick={onTap}>
      <p className="mh-kicker">{kicker}</p>
      <p className="mh-empty">{message}</p>
    </section>
  )
}

function HealthSkeleton() {
  return (
    <div className="m-skeleton">
      <div className="m-sk-line m-sk-line--kicker" />
      <div className="m-sk-block" />
      <div className="m-sk-line m-sk-line--kicker" />
      <div className="m-sk-block" />
      <div className="m-sk-line m-sk-line--kicker" />
      <div className="m-sk-block" />
    </div>
  )
}

// ── Overview hub ─────────────────────────────────────────────────────────────
export default function MobileHealth() {
  const data = useHealthData()
  const [view, setView] = useState('overview')

  if (data.loading) return <HealthSkeleton />
  if (data.error) return (
    <div className="mh-error">
      <p>Couldn't load health data.</p>
    </div>
  )

  if (view === 'sleep') return <MobileHealthSleep data={data} onBack={() => setView('overview')} />
  if (view === 'body') return <MobileHealthBody data={data} onBack={() => setView('overview')} />
  if (view === 'gym') return <MobileHealthGym data={data} onBack={() => setView('overview')} />

  return (
    <div className="mh-overview">
      {data.asOfTs && <p className="mh-freshness">as of {asOf(data.asOfTs)}</p>}
      <hr className="m-rule" />
      <SleepBlock sleep={data.sleep} onTap={() => setView('sleep')} />
      <hr className="m-rule" />
      <BodyBlock body={data.body} onTap={() => setView('body')} />
      <hr className="m-rule" />
      <GymBlock gym={data.gym} hasData={data.gymHasData} onTap={() => setView('gym')} />
    </div>
  )
}
