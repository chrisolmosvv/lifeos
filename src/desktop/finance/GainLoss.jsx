// GainLoss — investment gain/loss since last check. Placed on TrendsScreen
// (not AccountDetail — the investment snapshot log already lives there; this
// is the analysis/comparison view). Shows the most recent diff for each
// investment account. Accounts with <2 snapshots show a quiet prompt.

function fmtAmt(v) {
  const n = Number(v)
  const s = n >= 0 ? '+' : ''
  return s + '€' + n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtVal(v) {
  return '€' + Number(v).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(ymd) {
  try { return new Date(ymd + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }
  catch { return ymd }
}

export default function GainLoss({ accounts, gainLossMap }) {
  const investAccounts = accounts.filter((a) => a.account_type === 'investment')
  if (!investAccounts.length) return null

  return (
    <div className="fin-gl">
      <p className="fin-chart-label">Investment — since last check</p>
      {investAccounts.map((a) => {
        const gl = gainLossMap?.get(a.id)
        if (!gl || !gl.latest) {
          return (
            <div key={a.id} className="fin-gl-row">
              <span className="fin-gl-name">{a.name}</span>
              <span className="fin-gl-hint">Log a second value to see change</span>
            </div>
          )
        }
        const d = gl.latest
        return (
          <div key={a.id} className="fin-gl-row">
            <span className="fin-gl-name">{a.name}</span>
            <span className="fin-gl-val tnum">{fmtVal(d.value)}</span>
            <span className={'fin-gl-diff tnum' + (d.diff >= 0 ? '' : ' is-neg')}>{fmtAmt(d.diff)}</span>
            <span className="fin-gl-since">since {fmtDate(d.fromDate)}</span>
          </div>
        )
      })}
    </div>
  )
}
