import { useEffect, useState } from 'react'
import { HOUR_HEIGHT } from '../spine/logic/dateUtils'

// The thin red line showing the current time, like Apple Calendar.
// Updates itself once a minute.
export default function NowLine() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  const top = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT
  return <div className="now-line" style={{ top }} />
}
