import FormGuideHead from './kit/FormGuideHead'
import './kit/formGuide.css'

// Health — the broadsheet "Health" section. Its front page IS the Gym "Form
// Guide" (Health = Gym until a second Health sub-section exists). G7 Commit B:
// the correctly-dressed EMPTY frame only — the data zones (box score, trends,
// consistency, body-part balance, records) land in G9–G11. The compute-on-read
// maths already exists (src/gym/gymCalc.js, fed by src/gym/gymLoad.js) and gets
// wired in when the first zone arrives.
export default function Health() {
  return (
    <div className="fg-page">
      <FormGuideHead />
      <div className="fg-placeholder">
        <p className="fg-placeholder-lead">The Form Guide — coming together.</p>
        <p className="fg-placeholder-sub">
          Your box score, training trends, consistency, body-part balance and
          records will be set on this page.
        </p>
      </div>
    </div>
  )
}
