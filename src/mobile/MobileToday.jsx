// Mobile Today screen — day grid, day-swipe, tasks half-sheet, status-cycle.
// Phase 2: view + tap-to-cycle-status only. No create/edit (that's the ➕ form).
// Imports from spine ONLY (never desktop). CSS in mobileToday.css.

import { useEffect, useState } from 'react'
import { supabase } from '../spine/data/supabaseClient'
import { useTodayData, startOfDay, addDays } from '../spine/data/useTodayData'
import { isSameDay } from '../spine/logic/dateUtils'
import { buildToday } from '../spine/logic/todayModel'
import { indexTasks, progressOf, displayCatId, parentTitle } from '../spine/logic/subtasks'
import { isInbox } from '../spine/logic/categoryTree'
import { INBOX_COLOR } from '../spine/logic/palette'
import { resolveColor } from '../spine/logic/colorModel'
import { colorHex } from '../spine/logic/palette'
import { upNext, formatUpNext } from './upNext'
import MobileDayGrid from './MobileDayGrid'
import MobileTaskSheet from './MobileTaskSheet'

export default function MobileToday({ onSubline, onFolioDate, onEdit, onCreate }) {
  const [viewed, setViewed] = useState(() => startOfDay(new Date()))
  const [slideDir, setSlideDir] = useState(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const isToday = isSameDay(viewed, new Date())

  const { tasks, events, cats, busy, writeTask } = useTodayData(viewed)

  // Thread folio date to masthead
  useEffect(() => { onFolioDate(viewed) }, [viewed]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { onSubline(''); onFolioDate(null) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Compute subline ("Up next · …")
  useEffect(() => {
    if (!events || !tasks) return
    const item = upNext(events, tasks, new Date())
    const text = formatUpNext(item) || (isToday ? 'Nothing more today' : '')
    onSubline(text)
  }, [events, tasks, isToday]) // eslint-disable-line react-hooks/exhaustive-deps

  // Task model
  const { tasksToday, next7, undated, total } = buildToday(tasks, viewed, isToday)
  const { byId, byParent } = indexTasks(tasks)
  const catById = new Map(cats.map((c) => [c.id, c]))
  const inboxColor = cats.find((c) => isInbox(c))?.color || INBOX_COLOR

  // Subtask helpers
  const dispCat = (t) => {
    const cid = displayCatId(t, byId)
    return cid ? catById.get(cid) : null
  }
  const progressFn = (t) => progressOf(t.id, byParent)
  const parentTitleFn = (t) => parentTitle(t, byId)

  // Standalone subtasks due/scheduled on viewed day (surfaced as own rows)
  const dueOn = (t) => {
    if (!t.due_date) return false
    const [y, m, d] = t.due_date.split('-').map(Number)
    return isSameDay(new Date(y, m - 1, d), viewed)
  }
  const schOn = (t) => t.scheduled_start && isSameDay(new Date(t.scheduled_start), viewed)
  const standaloneSubs = (tasks || []).filter((t) => t.parent_task_id && (dueOn(t) || schOn(t)))
  const todayItems = [...tasksToday, ...standaloneSubs].sort((a, b) => {
    const ad = a.status === 'done' ? 1 : 0, bd = b.status === 'done' ? 1 : 0
    if (ad !== bd) return ad - bd
    const r = (p) => ({ high: 0, med: 1, low: 2 }[p] ?? 3)
    return r(a.priority) - r(b.priority) || a.title.localeCompare(b.title)
  })
  // Untimed = not on the grid (no scheduled_start OR not on viewed day)
  const untimedToday = todayItems.filter(
    (t) => !t.scheduled_start || !isSameDay(new Date(t.scheduled_start), viewed),
  )

  // Grid data
  const timedEvents = events.filter((e) => !e.all_day)
  const allDayEvents = events.filter((e) => e.all_day)
  const scheduledTasks = (tasks || []).filter(
    (t) => t.scheduled_start && isSameDay(new Date(t.scheduled_start), viewed),
  )

  // Status write
  const onSetStatus = (id, status) =>
    writeTask(supabase.from('tasks').update({ status }).eq('id', id))

  // Day navigation
  function goDay(delta) {
    setSlideDir(delta > 0 ? 'next' : 'prev')
    setViewed((v) => addDays(v, delta))
    setSheetOpen(false)
  }
  function backToToday() {
    setSlideDir('prev')
    setViewed(startOfDay(new Date()))
    setSheetOpen(false)
  }

  const untimedCount = untimedToday.length

  return (
    <div className="m-today">
      <hr className="m-rule" />

      {allDayEvents.length > 0 && (
        <div className="m-allday">
          {allDayEvents.slice(0, 2).map((ev) => {
            const cat = ev.category_id ? catById.get(ev.category_id) : null
            const hex = cat ? resolveColor(cat, catById) : colorHex(INBOX_COLOR)
            return (
              <div key={ev.id} className="m-allday-item">
                <span className="m-allday-dot" style={{ background: hex }} />
                <span className="m-allday-title">{ev.title}</span>
              </div>
            )
          })}
          {allDayEvents.length > 2 && (
            <span className="m-allday-more">+{allDayEvents.length - 2}</span>
          )}
        </div>
      )}

      <div className="m-today-grid-wrap">
        {!isToday && (
          <button className="m-back-today" onClick={backToToday} type="button">
            ← Today
          </button>
        )}
        <div
          key={viewed.getTime()}
          className={slideDir === 'next' ? 'm-grid-slide-next' : slideDir === 'prev' ? 'm-grid-slide-prev' : ''}
        >
          <MobileDayGrid
            events={timedEvents}
            scheduledTasks={scheduledTasks}
            cats={cats}
            viewed={viewed}
            isToday={isToday}
            onSwipe={goDay}
            onEditBlock={onEdit}
            onLongPressCreate={onCreate}
          />
        </div>
      </div>

      <button className="m-sheet-handle" onClick={() => setSheetOpen(true)} type="button">
        Tasks · {untimedCount} <span className="m-sheet-handle-caret">⌃</span>
      </button>

      <MobileTaskSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        todayItems={untimedToday}
        next7={next7}
        undated={undated}
        total={total}
        catById={catById}
        inboxColor={inboxColor}
        busy={busy}
        dispCat={dispCat}
        progressFn={progressFn}
        parentTitleFn={parentTitleFn}
        onSetStatus={onSetStatus}
        onEdit={onEdit}
      />
    </div>
  )
}
