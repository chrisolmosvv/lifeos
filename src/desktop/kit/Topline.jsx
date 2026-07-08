import './kit.css'

// Topline — the thin uppercase line that sits above the nameplate (an edition
// strapline). A sealed kit block: presentation only, no data. Pass the line as
// children; the copy is the caller's placeholder until we finalise it.
export default function Topline({ children }) {
  return <div className="kit-topline">{children}</div>
}
