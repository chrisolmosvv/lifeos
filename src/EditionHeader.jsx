import Topline from './kit/Topline'
import Masthead from './kit/Masthead'
import Folio from './kit/Folio'
import HairlineRule from './kit/HairlineRule'
import './editionHeader.css'

// The edition header — the personal-broadsheet top frame, shared by every
// logged-in screen (Today / Calendar / Settings). It is composed from the
// reusable kit blocks: a topline, the blackletter "LifeOS" masthead, a folio
// line (date · motto · live clock · edition), a hairline rule, then the nav
// strip. NOTHING here reads or writes app data — it is presentation only.
//
// (Was `Masthead.jsx` before Phase 7 T1; renamed so the kit can own the name
// "Masthead" for the nameplate wordmark itself.)
//
// The folio/topline copy below is PLACEHOLDER, not final.
// `view`/`onNavigate` drive which screen shows — nav behaviour is unchanged.

// The three top-level destinations. Settings carries a small subtitle in the
// mock ("categories, account") — an optional flourish, easy to drop.
const NAV = [
  { id: 'today', label: 'Today' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'settings', label: 'Settings', sub: 'categories, account' },
]

export default function EditionHeader({ view, onNavigate }) {
  return (
    <header className="masthead">
      <div className="mast-edition">
        <Topline>A Personal Daily</Topline>
        <Masthead />
        <Folio motto="All the day that's fit to do" edition="Vol. I · No. 142" />
      </div>
      <HairlineRule />

      <nav className="mast-nav">
        {NAV.map((item) => (
          <button
            key={item.id}
            className={item.id === view ? 'is-active' : ''}
            aria-current={item.id === view ? 'page' : undefined}
            onClick={() => onNavigate(item.id)}
          >
            <span className="mast-navlabel">{item.label}</span>
            {item.sub && <span className="mast-navsub">{item.sub}</span>}
          </button>
        ))}
      </nav>
    </header>
  )
}
