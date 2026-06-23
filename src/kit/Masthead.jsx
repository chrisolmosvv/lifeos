import './kit.css'

// Masthead — the blackletter "LifeOS" wordmark, the way a classic paper sets
// its name. A sealed kit block: presentation only, no data. Reused wherever the
// nameplate appears. Defaults to "LifeOS"; `text` lets a later screen override.
export default function Masthead({ text = 'LifeOS' }) {
  return <div className="kit-wordmark">{text}</div>
}
