import { useEffect, useState } from 'react'
import { weekDays } from '../spine/logic/dateUtils'
import { FocusTotalsProvider } from './focus/focusTotalsContext'
import { FocusSessionProvider } from './focus/focusSessionContext'
import FocusGlobalLayer from './focus/FocusGlobalLayer'
import { CookSessionProvider } from './food/cookSessionContext'
import CalendarWeek from './CalendarWeek'
import DayAgenda from './DayAgenda'
import EditionHeader from './EditionHeader'
import Today from './Today'
import Settings from './Settings'
import Planning from './Planning'
import ArchiveScreen from './ArchiveScreen'
import HealthHub from './health/HealthHub'
import FoodPage from './food/FoodPage'
import FocusPage from './focus/FocusPage'
import HealthDebugV2 from './health/HealthDebugV2' // THROWAWAY (V2 P0c verify) — delete with the hook below
import './calendar.css'

// Session-surfacing A — the current pillar PERSISTS across reloads (localStorage, like the Cookbook
// grid/list toggle). SHALLOW by design: only the top-level pillar is remembered (a reload returns you
// to the right pillar, its default sub-view); the deep restore into a cook is the resume banner's job.
// A garbage/unknown stored value falls back to 'today' — never a blank screen.
const PILLARS = ['today', 'focus', 'planning', 'archive', 'calendar', 'health', 'food', 'settings']
const VIEW_KEY = 'lifeos.view'
function initialView() {
  if (typeof window === 'undefined') return 'today'
  try { const v = window.localStorage.getItem(VIEW_KEY); return PILLARS.includes(v) ? v : 'today' } catch { return 'today' }
}

// The logged-in app frame: the masthead (nameplate + Today/Calendar/Settings
// nav) over the current screen, with a quiet colophon at the foot. Three
// destinations: Today (the task view for now — the real Today layout is next),
// Calendar (the week/day shell), and Settings (account + Categories).
export default function LoggedIn({ email }) {
  const today = new Date()
  const days = weekDays(today)
  const [view, setViewState] = useState(initialView)
  const [foodStage, setFoodStage] = useState(null)
  const [foodCook, setFoodCook] = useState(null)
  const setView = (v, opts) => { setViewState(v); if (opts?.stageRecipeId) setFoodStage(opts.stageRecipeId); if (opts?.cookRecipeId) setFoodCook(opts.cookRecipeId); try { window.localStorage.setItem(VIEW_KEY, v) } catch { /* private mode / disabled → in-memory only */ } }

  // Cross-pillar "open Focus" (P4): the task form's ▶ / add-past / see-all park a
  // request (focusNav) and fire this event; we switch to the Focus pillar, which then
  // picks the request up on mount. A stray pending request is cleared so it can't leak.
  useEffect(() => {
    const open = () => setView('focus')
    window.addEventListener('lifeos:focus-open', open)
    return () => window.removeEventListener('lifeos:focus-open', open)
  }, [])

  // THROWAWAY (V2 P0c verify): open <app>/#health-debug-v2 to read the calc readout. Delete with the import above.
  if (typeof window !== 'undefined' && window.location.hash === '#health-debug-v2') return <HealthDebugV2 />

  return (
    <CookSessionProvider>
    <FocusSessionProvider>
    <FocusTotalsProvider>
    <div className="app">
      <EditionHeader view={view} onNavigate={setView} />

      {view === 'today' ? (
        <div className="cal-wrap">
          <Today onOpenPlanning={() => setView('planning')} />
        </div>
      ) : view === 'focus' ? (
        <div className="cal-wrap">
          <FocusPage />
        </div>
      ) : view === 'planning' ? (
        <div className="cal-wrap">
          <Planning onBack={() => setView('today')} />
        </div>
      ) : view === 'archive' ? (
        <div className="cal-wrap">
          <ArchiveScreen onBack={() => setView('settings')} />
        </div>
      ) : view === 'calendar' ? (
        <>
          <div className="cal-wrap desktop-only">
            <CalendarWeek />
          </div>
          <div className="cal-wrap phone-only">
            <DayAgenda today={today} />
          </div>
        </>
      ) : view === 'health' ? (
        <div className="cal-wrap">
          <HealthHub />
        </div>
      ) : view === 'food' ? (
        <div className="cal-wrap">
          <FoodPage stageRecipeId={foodStage} onConsumeStage={() => setFoodStage(null)} cookRecipeId={foodCook} onConsumeCook={() => setFoodCook(null)} />
        </div>
      ) : (
        <div className="cal-wrap">
          <Settings email={email} onOpenArchive={() => setView('archive')} />
        </div>
      )}
      <FocusGlobalLayer />
    </div>
    </FocusTotalsProvider>
    </FocusSessionProvider>
    </CookSessionProvider>
  )
}
