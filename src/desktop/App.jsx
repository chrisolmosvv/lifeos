import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './Login'
import LoggedIn from './LoggedIn'
import ResetPassword from './ResetPassword'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    // Check if we're already logged in (e.g. returning after a magic link).
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    // Keep the screen in sync as you log in or out. A "Forgot password?" email
    // signs you in with a temporary RECOVERY session — intercept it to show the
    // set-new-password page before the app.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (recovery)
    return (
      <div style={screen}>
        <ResetPassword onDone={() => setRecovery(false)} />
      </div>
    )

  // Logged in → the app fills the whole screen.
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
