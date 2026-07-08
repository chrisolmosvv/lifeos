import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Platform-blind auth hook (spine): owns session state + Supabase auth
// listener. Returns plain data only — no JSX. Both desktop and mobile
// trees consume this to gate their own UI.
export function useAuth() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

  useEffect(() => {
    // Check if we're already logged in (e.g. returning after a magic link).
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    // Keep the screen in sync as you log in or out. A "Forgot password?" email
    // signs you in with a temporary RECOVERY session — intercept it so the
    // consuming tree can show a set-new-password page before the app.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true)
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { session, loading, isPasswordRecovery, clearRecovery: () => setIsPasswordRecovery(false) }
}
