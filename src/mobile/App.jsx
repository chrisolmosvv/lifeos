import { useState } from 'react'
import { useAuth } from '../spine/data/useAuth'
import { supabase } from '../spine/data/supabaseClient'
import './mobile.css'

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
      <input
        className="m-login-field"
        type="email"
        required
        autoComplete="username"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="m-login-field"
        type="password"
        required
        autoComplete="current-password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className="m-login-btn" type="submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      {error && <p className="m-login-error">{error}</p>}
    </form>
  )
}

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'health', label: 'Health' },
  { id: 'capture', label: '➕' },
  { id: 'food', label: 'Food' },
  { id: 'more', label: 'More' },
]

const TAB_DISPLAY = {
  today: 'Today',
  health: 'Health',
  capture: 'Capture',
  food: 'Food',
  more: 'More',
}

export default function MobileShell() {
  const { session, loading, isPasswordRecovery } = useAuth()
  const [activeTab, setActiveTab] = useState('today')

  if (loading)
    return <div className="m-center"><p>Loading…</p></div>

  if (isPasswordRecovery)
    return <div className="m-center"><p>Password reset is available on desktop.</p></div>

  if (!session)
    return <MobileLogin />

  return (
    <div className="m-shell">
      <main className="m-content">
        <Placeholder label={TAB_DISPLAY[activeTab]} />
      </main>
      <nav className="m-tabbar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`m-tab ${tab.id === activeTab ? 'm-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
