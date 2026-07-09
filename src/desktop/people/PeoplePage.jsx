import SmallCapsLabel from '../kit/SmallCapsLabel'
import HairlineRule from '../kit/HairlineRule'
import './people.css'

// PeoplePage — the Rolodex stub (D2). A calm broadsheet page with a first-run
// empty state. The directory, focus panel, and data layer arrive in later pieces;
// this is just the shell that mounts when the nav's "Rolodex" is clicked.
export default function PeoplePage() {
  return (
    <div className="people-page">
      <div className="people-header">
        <SmallCapsLabel>Rolodex</SmallCapsLabel>
        <HairlineRule />
      </div>
      <div className="people-empty">
        <p className="people-empty-lead">No one in your Rolodex yet.</p>
        <p className="people-empty-hint">Add someone to start building your people file.</p>
      </div>
    </div>
  )
}
