import { supabase } from './supabaseClient'
import Categories from './Categories'
import './settings.css'

// The Settings page: a calm account band (who you're signed in as + Log out)
// over the existing Categories manager, moved here unchanged. Categories is no
// longer a top-level destination — it lives under Settings now.
export default function Settings({ email }) {
  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="settings">
      <div className="settings-account">
        <div className="settings-acct-inner">
          <div>
            <span className="settings-label">Signed in as</span>
            <span className="settings-email">{email}</span>
          </div>
          <button className="settings-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>

      <div className="settings-cats">
        <Categories />
      </div>
    </div>
  )
}
