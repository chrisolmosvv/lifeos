// The ➕ tab — quick-capture: open the Finder, log for today, return.
import { useState } from 'react'
import MobileFinder from './MobileFinder'
import { loggerFinderConfig } from '../spine/logic/finderConfig'
import { entryMacros, NUTRIENTS, slotForHour } from '../spine/logic/foodCalc'
import { cacheFoodOnLog } from '../spine/data/foodWrite'
import { logEntry } from '../spine/data/foodWrite'
import { amsTodayYMD, amsClockMinutes } from '../spine/logic/gymDates'

export default function MobileCapture({ onDone }) {
  const [error, setError] = useState(null)
  const defaultSlot = slotForHour(Math.floor((amsClockMinutes(Date.now()) ?? 720) / 60))

  async function handleConfirm(food, { amount, unit, slot }) {
    try {
      const cached = await cacheFoodOnLog(food)
      const macros = entryMacros(food, amount, unit)
      const row = { entry_date: amsTodayYMD(), meal_slot: slot, food_item_id: cached?.id || food.food_item_id || null, amount, unit, entry_source: 'food_search' }
      for (const k of NUTRIENTS) row[k] = macros[k]
      await logEntry(row)
      onDone()
    } catch {
      setError("Couldn't log — try again.")
    }
  }

  return (
    <>
      <MobileFinder config={loggerFinderConfig} defaultSlot={defaultSlot} onConfirm={handleConfirm} onClose={onDone} />
      {error && <p className="mf-error" style={{ position: 'fixed', bottom: 80, left: 20, right: 20, background: 'var(--paper)', padding: 8 }}>{error}</p>}
    </>
  )
}
