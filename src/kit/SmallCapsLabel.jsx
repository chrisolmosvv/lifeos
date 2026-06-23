import './kit.css'

// SmallCapsLabel (kicker) — the quiet uppercase label that titles a section
// (e.g. "TASKS TODAY"). A sealed kit block: presentation only, no data. Built
// now as part of the header kit; reused by the modules in later T-pieces.
export default function SmallCapsLabel({ children }) {
  return <span className="kit-kicker">{children}</span>
}
