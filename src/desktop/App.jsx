import { useAuth } from '../spine/data/useAuth'
import Login from './Login'
import LoggedIn from './LoggedIn'
import ResetPassword from './ResetPassword'

export default function App() {
  const { session, loading, isPasswordRecovery, clearRecovery } = useAuth()

  if (isPasswordRecovery)
    return (
      <div style={screen}>
        <ResetPassword onDone={clearRecovery} />
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
