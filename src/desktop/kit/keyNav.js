import { useEffect, useRef } from 'react'

// keyNav — the SHARED keyboard step-navigation kit. Today steps days with it; the
// Calendar will step weeks/months with the same two pieces (do not re-implement the
// typing guard — import it).
//
// The whole risk with a screen-level arrow-key listener is that it steals the arrow
// keys from someone who is typing. isTypingTarget is the one guard that decides that,
// so there is exactly one definition of "the user is typing" in the app.

// True when the keystroke belongs to a text field, not to the screen. Covers the
// quick-add box, every field in the task/event form, and any contenteditable.
// <select> is included deliberately: left/right change its value.
export function isTypingTarget(event) {
  const el = event.target
  if (!el || !el.tagName) return false
  if (el.isContentEditable) return true
  const tag = el.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select'
}

// useArrowKeys — ArrowLeft/ArrowRight step the screen. Attaches ONE window listener.
//
// It stays quiet when:
//   • the user is typing (isTypingTarget),
//   • `enabled` is false — the caller passes false while a form/panel owns the screen,
//   • a modifier is held (cmd/ctrl/alt/shift), so browser + OS shortcuts still work,
//   • something upstream already handled the key (defaultPrevented).
//
// Handlers are read through a ref, so the listener attaches once and never re-binds
// mid-gesture — a held arrow key repeats cleanly.
//
// Props: { onPrev, onNext, enabled = true }.
export function useArrowKeys({ onPrev, onNext, enabled = true }) {
  const handlers = useRef({ onPrev, onNext, enabled })
  handlers.current = { onPrev, onNext, enabled }

  useEffect(() => {
    const onKey = (e) => {
      const { onPrev, onNext, enabled } = handlers.current
      if (!enabled) return
      if (e.defaultPrevented) return
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
      if (isTypingTarget(e)) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        onNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
