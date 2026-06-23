import './kit.css'

// HairlineRule — the thin rule we organise with instead of boxes. A sealed kit
// block: presentation only. `faint` draws the even-lighter line (e.g. an inner
// divider) using the theme's faint-rule colour.
export default function HairlineRule({ faint = false }) {
  return <div className={faint ? 'kit-rule kit-rule--faint' : 'kit-rule'} />
}
