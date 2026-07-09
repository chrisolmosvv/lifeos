import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../spine/data/useAuth'
import { supabase } from '../spine/data/supabaseClient'
import MobileMasthead from './MobileMasthead'
import MobileTabBar from './MobileTabBar'
import MobileToday from './MobileToday'
import MobileHealth from './MobileHealth'
import MobileFood from './MobileFood'
import MobileCapture from './MobileCapture'

function Placeholder({ label }) {
  return (
    <div className="m-placeholder">
      <p className="m-placeholder-label">{label}</p>
      <p className="m-placeholder-hint">coming soon</p>
    </div>
  )
}

function MobileLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) return
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setError(error.message || 'Something went wrong.')
  }

  return (
    <form className="m-login" onSubmit={handleSubmit}>
      <p className="m-login-title">LifeOS</p>
      <input className="m-login-field" type="email" required autoComplete="username"
        placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="m-login-field" type="password" required autoComplete="current-password"
        placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="m-login-btn" type="submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      {error && <p className="m-login-error">{error}</p>}
    </form>
  )
}

const TAB_DISPLAY = {
  health: 'Health',
  capture: 'Capture',
  food: 'Food',
  more: 'More',
}

export default function MobileShell() {
  const { session, loading, isPasswordRecovery } = useAuth()
  const [activeTab, setActiveTab] = useState('today')
  const [subline, setSubline] = useState('')
  const [folioDate, setFolioDate] = useState(null)
  const prevTabRef = useRef('today')
  const [editItem, setEditItem] = useState(null)
  const [editKind, setEditKind] = useState(null)
  const [createPrefill, setCreatePrefill] = useState(null)

  function selectTab(tab, params) {
    if (tab === 'capture') {
      prevTabRef.current = activeTab
      setEditItem(params?.editItem || null)
      setEditKind(params?.editKind || null)
      setCreatePrefill(params?.createPrefill || null)
    }
    setActiveTab(tab)
  }

  // Clear subline + folio when leaving tabs that manage their own folio
  useEffect(() => {
    if (activeTab !== 'today' && activeTab !== 'food') { setSubline(''); setFolioDate(null) }
  }, [activeTab])

  if (loading)
    return <div className="m-center"><p>Loading…</p></div>

  if (isPasswordRecovery)
    return <div className="m-center"><p>Password reset is available on desktop.</p></div>

  if (!session)
    return <MobileLogin />

  return (
    <div className="m-shell">
      <MobileMasthead subline={subline} folioDate={folioDate} />
      <div className="m-body">
        <div className="m-page" key={activeTab}>
          {activeTab === 'today' ? (
            <MobileToday onSubline={setSubline} onFolioDate={setFolioDate}
              onEdit={(item) => selectTab('capture', { editItem: item, editKind: item.start_at ? 'event' : 'task' })}
              onCreate={(prefill) => selectTab('capture', { createPrefill: prefill })} />
          ) : activeTab === 'health' ? (
            <MobileHealth />
          ) : activeTab === 'food' ? (
            <MobileFood onSubline={setSubline} onFolioDate={setFolioDate} />
          ) : activeTab === 'capture' ? (
            <MobileCapture onDone={() => { setEditItem(null); setEditKind(null); setCreatePrefill(null); setActiveTab(prevTabRef.current) }}
              editItem={editItem} editKind={editKind} createPrefill={createPrefill} />
          ) : (
            <>
              <hr className="m-rule" />
              <Placeholder label={TAB_DISPLAY[activeTab]} />
            </>
          )}
        </div>
      </div>
      <MobileTabBar activeTab={activeTab} onSelect={selectTab} />
    </div>
  )
}
