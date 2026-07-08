import { useState, useEffect } from 'react'
import { mastTime, mastDate, personalEdition } from '../spine/logic/personalEdition'

export default function MobileMasthead() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const { age, day } = personalEdition(now)

  return (
    <header className="m-masthead">
      <div className="m-nameplate">LifeOS</div>
      <div className="m-folio">
        <span>{mastDate(now)}</span>
        <span className="m-folio-sep">·</span>
        <span>Year {age}, Day {day}</span>
        <span className="m-folio-sep">·</span>
        <span className="m-folio-clock tnum">{mastTime(now)}</span>
      </div>
    </header>
  )
}
