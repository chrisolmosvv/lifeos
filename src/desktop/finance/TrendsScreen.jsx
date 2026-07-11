import { useCallback, useEffect, useState } from 'react'
import SmallCapsLabel from '../kit/SmallCapsLabel'
import HairlineRule from '../kit/HairlineRule'
import RangeSwitcher from '../kit/RangeSwitcher'
import NetWorthChart from './NetWorthChart'
import SpendByCategoryChart from './SpendByCategoryChart'
import IncomeExpenseChart from './IncomeExpenseChart'
import TopCategories from './TopCategories'
import DeltaList from './DeltaList'
import { netWorthByDay, netWorthByDayForAccount, netWorthSplitCashVsInvestment } from './financeCalc'
import { spendByCategoryByMonth, incomeVsExpenseByMonth, topCategories, monthOverMonthDeltas } from './financeCalcSpend'
import { fetchAllTransactions, fetchAllSnapshots, fetchLatestSnapshotsBefore } from './financeTrendsData'
import { listCategories } from './financeData'
import { amsTodayYMD, shiftYMD } from '../../spine/logic/gymDates'
import './financeTrends.css'
import './financeTrendsCharts.css'

// TrendsScreen — the analysis/chart sub-view. Net worth (8a) + spending,
// income/expense, and top categories (8b). All share the same range switcher.

const RANGES = [
  { id: '6m', label: '6 months' },
  { id: '1y', label: '1 year' },
  { id: '2y', label: '2 years' },
]
const RANGE_DAYS = { '6m': 183, '1y': 365, '2y': 730 }

export default function TrendsScreen({ accounts, onBack }) {
  const [range, setRange] = useState('6m')
  const [viewMode, setViewMode] = useState('combined')
  const [data, setData] = useState(null)

  const load = useCallback(async () => {
    const today = amsTodayYMD()
    const from = shiftYMD(today, -RANGE_DAYS[range])
    const to = today
    const [txns, snaps, priorSnaps, cats] = await Promise.all([
      fetchAllTransactions(from, to),
      fetchAllSnapshots(from, to),
      fetchLatestSnapshotsBefore(from),
      listCategories(),
    ])
    const allSnaps = [...priorSnaps, ...snaps]
    setData({ txns, snaps: allSnaps, cats, from, to })
  }, [range])

  useEffect(() => { load() }, [load])

  // ── Net worth series ────────────────────────────────────────────────────
  let nwSeries = null, nwSplit = null, nwLabel = 'Net worth'
  if (data) {
    if (viewMode === 'split') {
      nwSplit = netWorthSplitCashVsInvestment(data.txns, data.snaps, accounts, data.from, data.to)
      nwLabel = 'Net worth — cash vs. investment'
    } else if (viewMode !== 'combined') {
      const acct = accounts.find((a) => a.id === viewMode)
      if (acct) { nwSeries = netWorthByDayForAccount(data.txns, data.snaps, acct, data.from, data.to); nwLabel = acct.name }
    } else {
      nwSeries = netWorthByDay(data.txns, data.snaps, accounts, data.from, data.to)
    }
  }

  // ── Spending / income / top categories / deltas ─────────────────────────
  const spendData = data ? spendByCategoryByMonth(data.txns, data.cats, data.from, data.to) : null
  const ieData = data ? incomeVsExpenseByMonth(data.txns, data.from, data.to) : null
  const topData = data ? topCategories(data.txns, data.cats, data.from, data.to) : null
  const currentMonth = amsTodayYMD().slice(0, 7)
  const deltaData = data ? monthOverMonthDeltas(data.txns, data.cats, currentMonth) : null
  const currentMonthLabel = (() => {
    try { return new Date(currentMonth + '-15T12:00:00').toLocaleDateString('en-GB', { month: 'long' }) }
    catch { return currentMonth }
  })()

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
        <>
          <div className="fin-trends-section">
            <NetWorthChart series={nwSeries} splitSeries={nwSplit} label={nwLabel} />
          </div>
          <HairlineRule faint />
          <div className="fin-trends-section">
            <SpendByCategoryChart data={spendData} />
          </div>
          <HairlineRule faint />
          <div className="fin-trends-row">
            <div className="fin-trends-half">
              <IncomeExpenseChart data={ieData} />
            </div>
            <div className="fin-trends-half">
              <TopCategories data={topData} />
            </div>
          </div>
          <HairlineRule faint />
          <div className="fin-trends-section">
            <DeltaList data={deltaData} currentMonthLabel={currentMonthLabel} />
          </div>
        </>
      )}
    </div>
  )
}
