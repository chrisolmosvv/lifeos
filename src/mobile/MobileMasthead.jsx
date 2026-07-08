import { mastDate, personalEdition } from '../spine/logic/personalEdition'

export default function MobileMasthead() {
  const now = new Date()
  const dateStr = mastDate(now)
  const lastSpace = dateStr.lastIndexOf(' ')
  const dayMonth = dateStr.slice(0, lastSpace)
  const year = dateStr.slice(lastSpace + 1)
  const { age, day } = personalEdition(now)

  return (
    <header className="m-masthead">
      <div className="m-mast-row">
        <div className="m-ear m-ear--left">
          <span>{dayMonth}</span>
          <span>{year}</span>
        </div>
        <div className="m-nameplate">LifeOS</div>
        <div className="m-ear m-ear--right">
          <span>Year {age}</span>
          <span>Day {day}</span>
        </div>
      </div>
    </header>
  )
}
