import { useState, useEffect } from 'react'
import MobileFoodLog from './MobileFoodLog'
import MobileFoodRange from './MobileFoodRange'
import { amsTodayYMD, shiftYMD } from '../spine/logic/gymDates'

const RANGE_LABEL = { day: 'Day', week: 'Week', month: 'Month' }
const RANGE_STEP = { day: 1, week: 7, month: 30 }

export default function MobileFood({ onSubline, onFolioDate }) {
  const [mode, setMode] = useState('log')
  const [range, setRange] = useState('day')
  const [viewedYMD, setViewedYMD] = useState(() => amsTodayYMD())
  const today = amsTodayYMD()
  const isToday = viewedYMD === today

  useEffect(() => {
    onFolioDate(new Date(viewedYMD + 'T12:00:00Z'))
  }, [viewedYMD]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { onSubline(''); onFolioDate(null) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function page(dir) { setViewedYMD(ymd => shiftYMD(ymd, dir * RANGE_STEP[range])) }
  function goNow() { setViewedYMD(today) }

  const chipLabel = range === 'day' ? 'Today' : range === 'week' ? 'This week' : 'This month'

  return (
    <>
      <div className="mf-switcher">
        <button className={`mf-sw${mode === 'log' ? ' mf-sw--on' : ''}`} onClick={() => setMode('log')} type="button">Log</button>
        <button className={`mf-sw${mode === 'cookbook' ? ' mf-sw--on' : ''}`} onClick={() => setMode('cookbook')} type="button">Cookbook</button>
      </div>

      {mode === 'log' && (
        <div className="mf-range-toggle">
          {['day', 'week', 'month'].map(r => (
            <button key={r} className={`mf-rt${range === r ? ' mf-rt--on' : ''}`} onClick={() => setRange(r)} type="button">{RANGE_LABEL[r]}</button>
          ))}
        </div>
      )}

      <hr className="m-rule" />

      {mode === 'log' ? (
        range === 'day' ? (
          <MobileFoodLog viewedYMD={viewedYMD} isToday={isToday} onSwipe={page} onSubline={onSubline} />
        ) : (
          <MobileFoodRange endYMD={viewedYMD} rangeDays={RANGE_STEP[range]} onSwipe={page} onSubline={onSubline} />
        )
      ) : (
        <div className="m-placeholder">
          <p className="m-placeholder-label">Cookbook</p>
          <p className="m-placeholder-hint">coming soon</p>
        </div>
      )}

      {!isToday && (
        <button className="mf-today-chip" onClick={goNow} type="button">{chipLabel}</button>
      )}
    </>
  )
}
