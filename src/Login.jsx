import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email) return
    setStatus('sending')
    setErrorMsg('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      // Come back to whatever address the app is running on (localhost in dev,
      // the live site in production) — no hard-coded URL needed.
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
    } else {
      setStatus('sent')
    }
  }

  if (status === 'sent') {
    return (
      <div style={card}>
        <h1 style={title}>LifeOS</h1>
        <p style={{ lineHeight: 1.5 }}>
          Check your email — we sent a login link to
          <br />
          <strong>{email}</strong>.
        </p>
        <p style={{ fontSize: '0.85rem', color: '#666' }}>
          Tap the link on this device to come back logged in.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={card}>
      <h1 style={title}>LifeOS</h1>
      <label style={{ fontSize: '0.9rem', color: '#444', textAlign: 'left' }}>
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={input}
        />
      </label>
      <button type="submit" disabled={status === 'sending'} style={button}>
        {status === 'sending' ? 'Sending…' : 'Send me a login link'}
      </button>
      {status === 'error' && (
        <p style={{ color: '#c0392b', fontSize: '0.85rem' }}>{errorMsg}</p>
      )}
    </form>
  )
}

const card = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  width: '100%',
  maxWidth: '320px',
  padding: '0 1.5rem',
  textAlign: 'center',
}
const title = { fontSize: '2rem', fontWeight: 'bold', margin: 0 }
const input = {
  width: '100%',
  marginTop: '0.4rem',
  padding: '0.6rem 0.75rem',
  fontSize: '1rem',
  border: '1px solid #ccc',
  borderRadius: '8px',
  boxSizing: 'border-box',
}
const button = {
  padding: '0.7rem 1rem',
  fontSize: '1rem',
  fontWeight: 600,
  color: '#fff',
  background: '#111',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
}
