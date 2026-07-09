import { useState, useEffect } from 'react'
import MobileFoodLog from './MobileFoodLog'
import TimerSpike from './TimerSpike'
import { amsTodayYMD, shiftYMD } from '../spine/logic/gymDates'

export default function MobileFood({ onSubline, onFolioDate }) {
  const [mode, setMode] = useState('log')
  const [viewedYMD, setViewedYMD] = useState(() => amsTodayYMD())
  const today = amsTodayYMD()
  const isToday = viewedYMD === today

  useEffect(() => {
    onFolioDate(new Date(viewedYMD + 'T12:00:00Z'))
  }, [viewedYMD]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { onSubline(''); onFolioDate(null) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function pageDay(dir) { setViewedYMD(ymd => shiftYMD(ymd, dir)) }

  return (
    <>
      <div className="mf-switcher">
        <button className={`mf-sw${mode === 'log' ? ' mf-sw--on' : ''}`} onClick={() => setMode('log')} type="button">Log</button>
        <button className={`mf-sw${mode === 'cookbook' ? ' mf-sw--on' : ''}`} onClick={() => setMode('cookbook')} type="button">Cookbook</button>
      </div>
      <hr className="m-rule" />
      {mode === 'log' ? (
        <MobileFoodLog viewedYMD={viewedYMD} isToday={isToday} onSwipe={pageDay} onSubline={onSubline} />
      ) : (
        <TimerSpike />
      )}
      {!isToday && (
        <button className="mf-today-chip" onClick={() => setViewedYMD(today)} type="button">Today</button>
      )}
    </>
  )
}
