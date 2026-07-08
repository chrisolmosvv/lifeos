import { useEffect, useState } from 'react'
import { useAuth } from '../spine/data/useAuth'
import { supabase } from '../spine/data/supabaseClient'
import MobileMasthead from './MobileMasthead'
import MobileTabBar from './MobileTabBar'
import MobileToday from './MobileToday'
import MobileHealth from './MobileHealth'

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

  // Clear subline + folio when leaving the Today tab
  useEffect(() => {
    if (activeTab !== 'today') { setSubline(''); setFolioDate(null) }
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
            <MobileToday onSubline={setSubline} onFolioDate={setFolioDate} />
          ) : activeTab === 'health' ? (
            <MobileHealth />
          ) : (
            <>
              <hr className="m-rule" />
              <Placeholder label={TAB_DISPLAY[activeTab]} />
            </>
          )}
        </div>
      </div>
      <MobileTabBar activeTab={activeTab} onSelect={setActiveTab} />
    </div>
  )
}
