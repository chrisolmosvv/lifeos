import SmallCapsLabel from './SmallCapsLabel'
import { mastDate } from '../personalEdition'
import './formGuide.css'

// FormGuideHead — the broadsheet SECTION masthead for Health's front page,
// "The Form Guide". A sealed gym-kit block: presentation only, no data. Dressed
// like the rest of the paper — a quiet topline kicker, the serif nameplate, then
// a dateline sandwiched between two hairline rules. The nameplate uses the serif
// display face (Fraunces); there are NO big hero numbers yet (that Fraunces
// exception is for the data zones in G9+). Reused by every later Form Guide view.
export default function FormGuideHead({ now = new Date() }) {
  return (
    <header className="fg-head">
      <div className="fg-topline">LifeOS · The Health Section</div>
      <h1 className="fg-nameplate">The Form Guide</h1>
      <hr className="fg-rule" />
      <div className="fg-dateline">
        <SmallCapsLabel>The sporting life of one athlete</SmallCapsLabel>
        <span className="fg-dateline-date">{mastDate(now)}</span>
      </div>
      <hr className="fg-rule" />
    </header>
  )
}
