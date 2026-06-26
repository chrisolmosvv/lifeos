import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import './healthStatus.css'

// LifeOS — Health → Track S, S4 Part B: the read-only "Health sync — last received"
// block in Settings. It mirrors HevyStatus: per metric it shows how long ago we last
// RECEIVED data, so the owner can see at a glance the push pipeline is alive. Read-only,
// no controls, no schema change, no secrets — owner-RLS already scopes every row.

// "Last received" = newest created_at per metric. created_at is when our Edge Function
// WROTE the row — the truest, uniform "we got something" signal across all three tables.
//
// NOTE: this ago() mirrors HevyStatus's local helper; kept local here so this addition
// stays isolated from the working Gym line. A later pass can dedupe both into one shared
// helper without touching either screen's behaviour.
function ago(iso) {
  const then = Date.parse(iso)
  if (!Number.isFinite(then)) return null
  const mins = Math.floor((Date.now() - then) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const keyOf = (it) => `${it.table}:${it.metric ?? ''}`

// The three push groups, each a calm header over one line per metric.
const GROUPS = [
  { title: 'Sleep', items: [
    { label: 'Sleep', table: 'sleep_nights', metric: null },
  ] },
  { title: 'Body', items: [
    { label: 'Weight', table: 'body_metrics', metric: 'weight' },
    { label: 'Body fat', table: 'body_metrics', metric: 'body_fat' },
    { label: 'Lean mass', table: 'body_metrics', metric: 'lean_mass' },
    { label: 'Resting HR', table: 'body_metrics', metric: 'resting_heart_rate' },
    { label: 'Breathing', table: 'body_metrics', metric: 'respiratory_rate' },
  ] },
  { title: 'Activity', items: [
    { label: 'Steps', table: 'activity_hourly', metric: 'steps' },
    { label: 'Active energy', table: 'activity_hourly', metric: 'active_energy' },
    { label: 'Heart rate', table: 'activity_hourly', metric: 'heart_rate' },
  ] },
]

// Newest created_at for one metric. Never throws — a single failure degrades to {error}
// so it can't blank the other lines.
async function latest(item) {
  let q = supabase
    .from(item.table)
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1)
  if (item.metric) q = q.eq('metric_type', item.metric)
  const { data, error } = await q.maybeSingle()
  if (error) return { kind: 'error' }
  const ts = data?.created_at ?? null
  return ts ? { kind: 'ok', when: ago(ts) } : { kind: 'never' }
}

export default function HealthStatus() {
  const [map, setMap] = useState(null) // null = still loading

  useEffect(() => {
    let alive = true
    ;(async () => {
      const items = GROUPS.flatMap((g) => g.items)
      const results = await Promise.all(
        items.map(async (it) => {
          try { return [keyOf(it), await latest(it)] }
          catch { return [keyOf(it), { kind: 'error' }] }
        })
      )
      if (!alive) return
      setMap(Object.fromEntries(results))
    })()
    return () => { alive = false }
  }, [])

  function cell(it) {
    if (!map) return <span className="hs-dim">checking…</span>
    const r = map[keyOf(it)]
    if (!r || r.kind === 'error') return <span className="hs-dim">unavailable</span>
    if (r.kind === 'never') return <span className="hs-dim">— no data yet</span>
    return <span className="hs-ago">{r.when}</span>
  }

  return (
    <div className="health-status">
      <div className="health-status-inner">
        <span className="health-status-title">Health sync</span>
        {GROUPS.map((g) => (
          <div key={g.title} className="hs-group">
            <div className="hs-group-name">{g.title}</div>
            {g.items.map((it) => (
              <div key={keyOf(it)} className="hs-row">
                <span className="hs-label">{it.label}</span>
                <span className="hs-val">{cell(it)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
