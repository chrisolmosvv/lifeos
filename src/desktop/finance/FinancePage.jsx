import SmallCapsLabel from '../kit/SmallCapsLabel'
import HairlineRule from '../kit/HairlineRule'
import '../kit/formGuide.css'

// FinancePage — the Finance pillar stub (Piece 2). A calm placeholder matching
// the broadsheet house style: a section kicker + hairline + a quiet note. No
// data query, no button, no real empty-state yet — that's Piece 3 (Accounts).
export default function FinancePage() {
  return (
    <div className="finance-page">
      <SmallCapsLabel>Finance</SmallCapsLabel>
      <HairlineRule />
      <p className="fg-note">The ledger is coming together.</p>
    </div>
  )
}
