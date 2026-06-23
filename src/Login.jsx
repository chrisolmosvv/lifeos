import { useState } from 'react'
import { supabase } from './supabaseClient'
import Masthead from './kit/Masthead'
import './login.css'

// The sign-in screen (Phase 7, AUTH-1). Email + password is the primary way in;
// "Forgot password?" sends a reset email (handled by ResetPassword on return).
// A magic-link option is KEPT reachable as the proven fallback until AUTH-2
// retires it. Single-user + closed: there is NO "create account" option. Uses the
// existing Supabase auth methods — no new auth layer.
export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [view, setView] = useState('login') // login | linkSent | resetSent
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const REDIRECT = window.location.origin

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) return
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setError(friendly(error)) // success → App's auth listener shows the app
  }

  async function handleForgot() {
    if (!email) return setError('Enter your email first, then tap “Forgot password?”.')
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: REDIRECT })
    setBusy(false)
    if (error) setError(friendly(error))
    else setView('resetSent')
  }

  async function handleMagicLink() {
    if (!email) return setError('Enter your email first to get a login link.')
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: REDIRECT },
    })
    setBusy(false)
    if (error) setError(friendly(error))
    else setView('linkSent')
  }

  if (view === 'linkSent' || view === 'resetSent') {
    return (
      <div className="login">
        <Masthead />
        <p className="login-sent">
          {view === 'linkSent'
            ? 'Check your email — we sent a login link to'
            : 'Check your email — we sent a reset link to'}
          <br />
          <strong>{email}</strong>.
        </p>
        <p className="login-hint">Open it on this device to come back in.</p>
        <button className="login-textbtn" onClick={() => setView('login')}>‹ Back to sign in</button>
      </div>
    )
  }

  return (
    <form className="login" onSubmit={handleLogin}>
      <Masthead />
      <p className="login-topline">Sign in</p>

      <label className="login-field">
        Email
        <input
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </label>

      <label className="login-field">
        Password
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </label>

      <button type="submit" className="login-btn" disabled={busy}>
        {busy ? 'Signing in…' : 'Log in'}
      </button>

      <button type="button" className="login-textbtn" onClick={handleForgot} disabled={busy}>
        Forgot password?
      </button>

      {error && <p className="login-error">{error}</p>}

      <div className="login-or">or</div>
      <button type="button" className="login-magic" onClick={handleMagicLink} disabled={busy}>
        Email me a login link instead
      </button>
    </form>
  )
}

// A plain message for the common auth errors.
function friendly(error) {
  const m = error.message || ''
  if (/invalid login credentials/i.test(m)) return 'Incorrect email or password.'
  if (/signups? not allowed|disabled/i.test(m)) return 'That email isn’t set up for this app.'
  return m || 'Something went wrong.'
}
