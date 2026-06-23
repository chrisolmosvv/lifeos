import { useState } from 'react'
import { supabase } from './supabaseClient'
import Masthead from './kit/Masthead'
import './login.css'

// The reset page (Phase 7, AUTH-1). The "Forgot password?" email links back to the
// app with a recovery session; App detects PASSWORD_RECOVERY and shows this, where
// a new password is set via the existing Supabase updateUser. On success the
// recovery session becomes a normal session and the app opens. (password_min_length
// is 6 in this project.)
export default function ResetPassword({ onDone }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (pw.length < 6) return setError('Use at least 6 characters.')
    if (pw !== pw2) return setError('The two passwords don’t match.')
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) setError(error.message || 'Could not set the password.')
    else onDone() // the recovery session is now a normal session → the app opens
  }

  return (
    <form className="login" onSubmit={submit}>
      <Masthead />
      <p className="login-topline">Set a new password</p>

      <label className="login-field">
        New password
        <input
          type="password"
          required
          autoComplete="new-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="••••••••"
        />
      </label>
      <label className="login-field">
        Confirm password
        <input
          type="password"
          required
          autoComplete="new-password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          placeholder="••••••••"
        />
      </label>

      <button type="submit" className="login-btn" disabled={busy}>
        {busy ? 'Saving…' : 'Set password & sign in'}
      </button>

      {error && <p className="login-error">{error}</p>}
    </form>
  )
}
