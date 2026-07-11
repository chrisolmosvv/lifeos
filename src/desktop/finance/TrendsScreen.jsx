import { useCallback, useEffect, useState } from 'react'
import SmallCapsLabel from '../kit/SmallCapsLabel'
import HairlineRule from '../kit/HairlineRule'
import RangeSwitcher from '../kit/RangeSwitcher'
import NetWorthChart from './NetWorthChart'
import { netWorthByDay, netWorthByDayForAccount, netWorthSplitCashVsInvestment } from './financeCalc'
import { fetchAllTransactions, fetchAllSnapshots, fetchLatestSnapshotsBefore } from './financeTrendsData'
import { amsTodayYMD, shiftYMD } from '../../spine/logic/gymDates'
import './financeTrends.css'

// TrendsScreen — the analysis/chart sub-view (Piece 8a). Starts with net worth
// only; spending/income/heatmap charts added in later sub-pieces (8b-8d) as
// composable sections below the net worth section.

const RANGES = [
  { id: '6m', label: '6 months' },
  { id: '1y', label: '1 year' },
  { id: '2y', label: '2 years' },
]
const RANGE_DAYS = { '6m': 183, '1y': 365, '2y': 730 }

export default function TrendsScreen({ accounts, onBack }) {
  const [range, setRange] = useState('6m')
  const [viewMode, setViewMode] = useState('combined') // 'combined' | 'split' | account_id
  const [data, setData] = useState(null)

  const load = useCallback(async () => {
    const today = amsTodayYMD()
    const from = shiftYMD(today, -RANGE_DAYS[range])
    const to = today
    const [txns, snaps, priorSnaps] = await Promise.all([
      fetchAllTransactions(from, to),
      fetchAllSnapshots(from, to),
      fetchLatestSnapshotsBefore(from),
    ])
    // Merge prior snapshots with in-range snapshots so the step function has
    // a value to carry forward from before the range start.
    const allSnaps = [...priorSnaps, ...snaps]
    setData({ txns, snaps: allSnaps, from, to })
  }, [range])

  useEffect(() => { load() }, [load])

  // Compute chart series from the loaded raw data.
  let series = null
  let splitSeries = null
  let chartLabel = 'Net worth'

  if (data) {
    if (viewMode === 'split') {
      splitSeries = netWorthSplitCashVsInvestment(data.txns, data.snaps, accounts, data.from, data.to)
      chartLabel = 'Net worth — cash vs. investment'
    } else if (viewMode !== 'combined') {
      const acct = accounts.find((a) => a.id === viewMode)
      if (acct) {
        series = netWorthByDayForAccount(data.txns, data.snaps, acct, data.from, data.to)
        chartLabel = acct.name
      }
    } else {
      series = netWorthByDay(data.txns, data.snaps, accounts, data.from, data.to)
    }
  }

  return (
    <div className="fin-trends">
      <div className="fin-trends-head">
        <SmallCapsLabel>Trends</SmallCapsLabel>
        <button className="fin-ledger-accts-link" onClick={onBack}>← Ledger</button>
      </div>
      <HairlineRule />

      <div className="fin-trends-controls">
        <RangeSwitcher ranges={RANGES} value={range} ariaLabel="Trend range" onChange={setRange} />
        <div className="fin-trends-view">
          <select className="fin-filter" value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
            <option value="combined">Combined</option>
            <option value="split">Cash vs. investment</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      {!data ? (
        <p className="fin-loading">Loading…</p>
      ) : (
        <div className="fin-trends-section">
          <NetWorthChart series={series} splitSeries={splitSeries} label={chartLabel} />
        </div>
      )}

      {/* Future sub-pieces (8b-8d) add their chart sections here. */}
    </div>
  )
}
