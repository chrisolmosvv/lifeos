import { useState, useEffect, useRef } from 'react'
import { useCookEvents } from '../spine/data/useCookEvents'
import { useWakeLock } from '../spine/data/useWakeLock'
import { useCookLog } from '../spine/data/useCookLog'
import { initAudioContext, startAlarm, stopAlarm } from '../spine/logic/cookAlarm'
import { parseDuration, fmtClock } from '../spine/logic/cookTimers'
import { fmtNum } from '../spine/logic/foodFormat'
import { NUTRIENTS, MEAL_SLOTS, slotForHour } from '../spine/logic/foodCalc'
import { amsTodayYMD, amsClockMinutes } from '../spine/logic/gymDates'

export default function MobileCook({ recipeData, onBack }) {
  const { recipe, ingredients, steps, macros } = recipeData
  const cook = useCookEvents(recipe.id)
  const wakeSt = useWakeLock(cook.ready && cook.hasSession && !cook.state.finished)
  const { toast, dismiss, logSnapshot } = useCookLog()
  const [alarms, setAlarms] = useState(new Set())
  const [logOpen, setLogOpen] = useState(false)
  const [logServ, setLogServ] = useState(recipe.servings || 1)
  const [logSlot, setLogSlot] = useState(() => slotForHour(Math.floor((amsClockMinutes(Date.now()) ?? 720) / 60)))
  const prevDone = useRef(new Set())

  // Init audio context (must be from user gesture — called before this mounts via [Start cooking] tap)
  useEffect(() => { initAudioContext() }, [])

  // Detect new timer-done alarms
  useEffect(() => {
    if (!cook.state) return
    const nowDone = new Set(cook.state.timers.filter(t => t.done).map(t => t.targetRef))
    const fresh = [...nowDone].filter(r => !prevDone.current.has(r))
    if (fresh.length > 0) {
      startAlarm()
      setAlarms(prev => { const n = new Set(prev); fresh.forEach(r => n.add(r)); return n })
    }
    prevDone.current = nowDone
  }, [cook.state?.timers])

  // Cleanup alarm on unmount
  useEffect(() => () => stopAlarm(), [])

  function dismissAlarm(ref) {
    cook.stopTimer(parseInt(ref))
    setAlarms(prev => { const n = new Set(prev); n.delete(ref); if (n.size === 0) stopAlarm(); return n })
  }

  // Hero: first active, else first not-done
  const st = cook.state || {}
  const heroIdx = steps.findIndex((_, i) => st.stepStates?.[String(i)] === 'active')
  const firstUndone = steps.findIndex((_, i) => st.stepStates?.[String(i)] !== 'done')
  const activeIdx = heroIdx >= 0 ? heroIdx : (firstUndone >= 0 ? firstUndone : -1)
  const heroStep = activeIdx >= 0 ? steps[activeIdx] : null
  const heroDur = heroStep ? parseDuration(heroStep.text) : null
  const heroTimer = (st.timers || []).find(t => t.targetRef === String(activeIdx))

  function advance() {
    if (activeIdx < 0) return
    cook.markStep(activeIdx, 'done')
  }
  function startHeroTimer() {
    if (heroDur && activeIdx >= 0) cook.startTimer(activeIdx, heroDur)
  }
  function finishCook() { cook.finish() }

  // Log this meal
  function doLog() {
    const ps = macros.perServing
    const row = { entry_date: amsTodayYMD(), meal_slot: logSlot, recipe_id: recipe.id, amount: logServ, unit: 'serving', entry_source: 'recipe_cook' }
    for (const k of NUTRIENTS) row[k] = (ps[k] || 0) * logServ
    logSnapshot(row)
    setLogOpen(false)
  }

  if (!cook.ready) return (
    <div className="mc-wrap">
      <button className="mh-back" onClick={onBack} type="button">‹ Recipe</button>
      <div className="m-skeleton"><div className="m-sk-block" /><div className="m-sk-line" /></div>
    </div>
  )

  const allDone = steps.length > 0 && steps.every((_, i) => st.stepStates?.[String(i)] === 'done')

  return (
    <div className="mc-wrap">
      <button className="mh-back" onClick={onBack} type="button">‹ Recipe</button>

      {/* Alarm overlay */}
      {alarms.size > 0 && (
        <div className="mc-alarm">
          {[...alarms].map(ref => {
            const idx = parseInt(ref)
            const s = steps[idx]
            return (
              <div key={ref} className="mc-alarm-item">
                <p className="mc-alarm-text">Timer done — {s?.text?.slice(0, 50) || `Step ${idx + 1}`}</p>
                <button className="mc-alarm-btn" onClick={() => dismissAlarm(ref)} type="button">Dismiss</button>
              </div>
            )
          })}
        </div>
      )}

      {/* Hero */}
      {heroStep && !allDone ? (
        <div className="mc-hero">
          <p className="mc-hero-kicker">Step {activeIdx + 1} of {steps.length}</p>
          <p className="mc-hero-text">{heroStep.text}</p>
          {heroTimer ? (
            <p className={`mc-hero-timer${heroTimer.done ? ' mc-hero-timer--done' : ''}`}>{fmtClock(heroTimer.remaining)}</p>
          ) : heroDur ? (
            <button className="mc-action mc-action--muted" onClick={startHeroTimer} type="button">Start {fmtClock(heroDur)} timer</button>
          ) : null}
          <div className="mc-hero-actions">
            <button className="mc-action" onClick={advance} type="button">Done</button>
          </div>
        </div>
      ) : allDone || st.finished ? (
        <div className="mc-done">
          <p className="mc-done-text">Cooking complete.</p>
          {!logOpen ? (
            <button className="mc-action" onClick={() => setLogOpen(true)} type="button">Log this meal</button>
          ) : (
            <div className="mc-log-sheet">
              <div className="mc-log-row">
                <span>Servings</span>
                <div className="mc-log-stepper">
                  <button onClick={() => setLogServ(s => Math.max(1, s - 1))} type="button">−</button>
                  <span>{logServ}</span>
                  <button onClick={() => setLogServ(s => s + 1)} type="button">+</button>
                </div>
              </div>
              <div className="mc-log-row">
                <span>Meal</span>
                <div className="mc-log-slots">
                  {MEAL_SLOTS.map(s => (
                    <button key={s} className={`mc-log-slot${logSlot === s ? ' mc-log-slot--on' : ''}`}
                      onClick={() => setLogSlot(s)} type="button">{s[0].toUpperCase()}</button>
                  ))}
                </div>
              </div>
              <p className="mc-log-preview">{Math.round((macros.perServing.kcal || 0) * logServ)} kcal · P {fmtNum('protein', (macros.perServing.protein || 0) * logServ)}g</p>
              <button className="mc-action" onClick={doLog} type="button">Confirm</button>
            </div>
          )}
          {!st.finished && <button className="mc-action mc-action--muted" onClick={finishCook} type="button">End session</button>}
        </div>
      ) : null}

      <hr className="m-rule" style={{ margin: '0 20px' }} />

      {/* Rail — all steps */}
      <div className="mc-rail">
        <p className="mh-kicker" style={{ padding: '0 20px' }}>Steps</p>
        {steps.map((s, i) => {
          const status = st.stepStates?.[String(i)] || 'waiting'
          const timer = (st.timers || []).find(t => t.targetRef === String(i))
          const isHero = i === activeIdx
          return (
            <div key={i} className={`mc-rail-step${isHero ? ' mc-rail-step--active' : ''}${status === 'done' ? ' mc-rail-step--done' : ''}`}
              onClick={() => { if (status !== 'done') cook.markStep(i, 'active') }}>
              <span className="mc-rail-num">{i + 1}</span>
              <span className="mc-rail-text">{s.text?.slice(0, 60)}{(s.text?.length || 0) > 60 ? '…' : ''}</span>
              {timer && !timer.done && <span className="mc-rail-timer">{fmtClock(timer.remaining)}</span>}
              {timer?.done && <span className="mc-rail-alarm">⏰</span>}
              {status === 'done' && <span className="mc-rail-check">✓</span>}
            </div>
          )
        })}
      </div>

      {toast && (
        <div className="mc-toast">
          <span>{toast.text}</span>
          {toast.undo && <button onClick={toast.undo} type="button">Undo</button>}
          <button onClick={dismiss} type="button">✕</button>
        </div>
      )}
    </div>
  )
}
