import { useRef, useState } from 'react'
import './todayKit.css'

// QuickAddInput — a quiet one-line capture box (Today V2, Piece 2). Type a title,
// press Enter, and the caller drops a task straight into the backlog/Inbox. No
// form, no type toggle, no date — capture must cost less than the thought. Sealed
// kit block; presentation only: the WRITE belongs to the caller via `onAdd`.
//
// `onAdd(title)` returns a Promise that resolves truthy on a successful save. On
// success the box clears and keeps focus (dump several in a row); on failure the
// text stays so it's visible the save didn't land. Whitespace-only is a no-op
// (never calls onAdd). First placement is Today; later: Planning / All Tasks /
// Calendar — wired one screen at a time.
//
// Props: onAdd(title)=>Promise<truthy=saved>, placeholder, busy.
export default function QuickAddInput({ onAdd, placeholder = 'Add to inbox…', busy }) {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const ref = useRef(null)

  async function submit() {
    const title = value.trim()
    if (!title || saving) return // empty/whitespace → no-op; never double-fire
    setSaving(true)
    const ok = await onAdd(title)
    setSaving(false)
    if (ok) {
      setValue('') // saved → clear and keep focus for the next dump
      ref.current?.focus()
    }
    // not ok → leave the text in place so it's visible it didn't save
  }

  return (
    <input
      ref={ref}
      className="tk-quickadd"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          submit()
        }
      }}
      placeholder={placeholder}
      aria-label="Add a task to Inbox"
      disabled={busy && saving}
    />
  )
}
