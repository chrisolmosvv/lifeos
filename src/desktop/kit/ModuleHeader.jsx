import SmallCapsLabel from './SmallCapsLabel'
import './todayKit.css'

// ModuleHeader — a quiet small-caps kicker over a hairline rule, used to title a
// Today module ("tasks today", "the next 7 days"). Sealed kit block; no data.
export default function ModuleHeader({ children }) {
  return (
    <div className="tk-modhead">
      <SmallCapsLabel>{children}</SmallCapsLabel>
      <hr className="tk-modhead-rule" />
    </div>
  )
}
