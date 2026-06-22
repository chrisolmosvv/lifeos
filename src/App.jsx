import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './Login'
import LoggedIn from './LoggedIn'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if we're already logged in (e.g. returning after the magic link).
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    // Keep the screen in sync as you log in or out.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Logged in → the calendar fills the whole screen.
  // Loading / logged out → a simple centered screen.
  if (session) return <LoggedIn email={session.user.email} />

  return <div style={screen}>{loading ? <p>Loading…</p> : <Login />}</div>
}

const screen = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  // fonts + paper/ink come from the global theme (theme.css)
}
