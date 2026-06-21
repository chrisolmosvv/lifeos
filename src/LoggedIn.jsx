import { supabase } from './supabaseClient'

export default function LoggedIn({ email }) {
  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div style={wrap}>
      <h1 style={{ fontSize: '2rem', margin: 0 }}>LifeOS</h1>
      <p>You're logged in{email ? ` as ${email}` : ''}.</p>
      <button onClick={handleLogout} style={button}>
        Log out
      </button>
    </div>
  )
}

const wrap = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  textAlign: 'center',
}
const button = {
  padding: '0.6rem 1rem',
  fontSize: '1rem',
  border: '1px solid #111',
  borderRadius: '8px',
  background: '#fff',
  cursor: 'pointer',
}
