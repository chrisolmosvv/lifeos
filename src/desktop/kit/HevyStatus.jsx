import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import './hevyStatus.css'

// A small, READ-ONLY status line for Settings (Health → Gym, G5 Commit B). It shows
// whether Hevy is CONNECTED and how FRESH the last sync is, read from gym_sync_state
// (owner-only RLS already scopes that table to this user). Connection + freshness ONLY —
// it never shows, stores, or references the Hevy key (that lives only in a backend secret
// and is never read here), and it has no controls / no manual-sync button.

// Plain-English "time ago" from an ISO timestamp.
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

export default function HevyStatus() {
  // kind: loading | synced | never | error
  const [state, setState] = useState({ kind: 'loading' })

  useEffect(() => {
    let alive = true
    ;(async () => {
      // gym_sync_state holds at most one row per owner (PK = user_id); RLS returns only
      // this user's row, so maybeSingle is null when there has never been a sync.
      const { data, error } = await supabase
        .from('gym_sync_state')
        .select('last_synced_at')
        .maybeSingle()
      if (!alive) return
      if (error) { setState({ kind: 'error' }); return }
      const ts = data?.last_synced_at ?? null
      setState(ts ? { kind: 'synced', when: ago(ts) } : { kind: 'never' })
    })()
    return () => { alive = false }
  }, [])

  let body
  if (state.kind === 'synced') {
    body = <><span className="hevy-status-on">connected</span> · last synced {state.when}</>
  } else if (state.kind === 'never') {
    body = <span className="hevy-status-dim">not connected</span>
  } else if (state.kind === 'error') {
    body = <span className="hevy-status-dim">status unavailable</span>
  } else {
    body = <span className="hevy-status-dim">checking…</span>
  }

  return (
    <div className="hevy-status">
      <div className="hevy-status-inner">
        <span className="hevy-status-label">Hevy</span>
        <span className="hevy-status-val">{body}</span>
      </div>
    </div>
  )
}
