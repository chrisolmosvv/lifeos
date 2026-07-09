// THROWAWAY — timer/alarm/wake-lock spike for iOS PWA testing.
// Remove after the experiment confirms results on the real iPhone 16e.

import { useState, useEffect, useRef } from 'react'
import { initAudioContext, startAlarm, stopAlarm } from '../spine/logic/cookAlarm'
import { useWakeLock } from '../spine/data/useWakeLock'
import { fmtClock } from '../spine/logic/cookTimers'

export default function TimerSpike() {
  const [remaining, setRemaining] = useState(null) // seconds or null
  const [alarming, setAlarming] = useState(false)
  const [wakeLockOn, setWakeLockOn] = useState(false)
  const [log, setLog] = useState([])
  const timerRef = useRef(null)
  const endRef = useRef(null)

  const wakeLockStatus = useWakeLock(wakeLockOn)
  const hasWakeLock = typeof navigator !== 'undefined' && 'wakeLock' in navigator

  function addLog(msg) { setLog(prev => [`${new Date().toLocaleTimeString()} ${msg}`, ...prev].slice(0, 20)) }

  function startTimer(secs) {
    // iOS: AudioContext must be created/resumed from a user gesture.
    // initAudioContext creates it; we also resume if suspended.
    try {
      initAudioContext()
      addLog(`AudioContext initialized (start ${secs}s timer)`)
    } catch (e) { addLog(`AudioContext error: ${e.message}`) }

    stopAlarm()
    setAlarming(false)
    clearInterval(timerRef.current)

    endRef.current = Date.now() + secs * 1000
    setRemaining(secs)
    addLog(`Timer started: ${secs}s`)

    timerRef.current = setInterval(() => {
      const left = Math.max(0, Math.round((endRef.current - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0) {
        clearInterval(timerRef.current)
        timerRef.current = null
        setAlarming(true)
        try {
          startAlarm()
          addLog('ALARM FIRED — beeping')
        } catch (e) { addLog(`Alarm error: ${e.message}`) }
      }
    }, 250) // 250ms tick for smooth countdown
  }

  function dismiss() {
    try {
      stopAlarm()
      addLog('Alarm dismissed')
    } catch (e) { addLog(`Stop error: ${e.message}`) }
    setAlarming(false)
    setRemaining(null)
  }

  useEffect(() => () => { clearInterval(timerRef.current); stopAlarm() }, [])

  const s = { padding: '16px 20px', fontFamily: 'var(--font-sans)', fontSize: '0.82rem', color: 'var(--ink)' }
  const btn = { padding: '10px 16px', fontFamily: 'var(--font-sans)', fontSize: '0.82rem', border: '1px solid var(--rule)', background: 'var(--paper)', color: 'var(--ink)', cursor: 'pointer', marginRight: 8 }
  const hero = { fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: 'var(--ink)', margin: '8px 0' }
  const muted = { color: 'var(--ink-muted)', fontSize: '0.72rem' }

  return (
    <div style={s}>
      <p style={{ fontWeight: 600, marginBottom: 12 }}>Timer / Alarm / Wake Lock Spike</p>

      {/* Timer controls */}
      <div style={{ marginBottom: 12 }}>
        <button style={btn} onClick={() => startTimer(5)}>Start 5s</button>
        <button style={btn} onClick={() => startTimer(15)}>Start 15s</button>
        <button style={btn} onClick={() => startTimer(60)}>Start 60s</button>
      </div>

      {/* Countdown */}
      {remaining != null && <p style={hero}>{fmtClock(remaining)}</p>}

      {/* Alarm dismiss */}
      {alarming && (
        <button style={{ ...btn, background: 'var(--ink)', color: 'var(--paper)', fontWeight: 600 }} onClick={dismiss}>
          Dismiss alarm
        </button>
      )}

      <hr style={{ border: 'none', borderTop: '1px solid var(--rule)', margin: '16px 0' }} />

      {/* Wake lock */}
      <div style={{ marginBottom: 12 }}>
        <button style={btn} onClick={() => setWakeLockOn(v => !v)}>
          {wakeLockOn ? 'Release wake lock' : 'Keep screen awake'}
        </button>
      </div>
      <p style={muted}>
        Wake Lock API: {hasWakeLock ? 'supported' : 'NOT supported'}<br />
        Wake Lock status: {wakeLockStatus}
      </p>

      <hr style={{ border: 'none', borderTop: '1px solid var(--rule)', margin: '16px 0' }} />

      {/* Status log */}
      <p style={{ fontWeight: 600, marginBottom: 4 }}>Status log</p>
      <div style={{ ...muted, maxHeight: 200, overflow: 'auto' }}>
        {log.length === 0 ? <p>No events yet.</p> : log.map((l, i) => <p key={i} style={{ margin: '2px 0' }}>{l}</p>)}
      </div>
    </div>
  )
}
