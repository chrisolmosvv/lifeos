import { Fragment } from 'react'
import { dayNameFull } from '../spine/logic/dateUtils'
import { parentTitle } from '../spine/logic/subtasks'
import { activeTotal } from './allTasksModel'
import ModuleHeader from './kit/ModuleHeader'
import QuickAddInput from './kit/QuickAddInput'
import TodayRow from './kit/TodayRow'
import { formatDuration } from './focus/focusFormat'

// TodayTasksPanel — Today's right-hand column: the quiet "focused today" glance line,
// the quick-add box, the two task modules ("tasks today" + "the next 7 days"), and the
// Planning box at the foot. Both modules render the SAME row (TodayRow), so they read
// as one list. (Piece 0 split: moved verbatim out of Today.jsx; no behaviour changed.)
//
// The two module <section>s carry the refs Today's drag hook uses as its off-grid
// drop-zones — dragging a block off the sheet and onto a module re-dates the task.
// Every write goes through the caller.
export default function TodayTasksPanel({
  isToday,
  viewed,
  focusToday,
  tasks,
  todayItems,
  next7,
  undated,
  standaloneIds,
  byId,
  byParent,
  catById,
  inboxColor,
  dispCat,
  catFor,
  progress,
  scheduledBadge,
  expandedToday,
  onToggleExpand,
  busy,
  error,
  onQuickAdd,
  onUpdate,
  onStartFocus,
  onOpenTask,
  onAdd,
  onOpenPlanning,
  trayBind,
  todayModRef,
  weekModRef,
}) {
  return (
    <div className="today-right">
      {isToday && focusToday > 0 && (
        <div className="today-focus-line">focused today · {formatDuration(focusToday)}</div>
      )}
      <QuickAddInput onAdd={onQuickAdd} busy={busy} />
      {tasks === null ? (
        <p className="today-loading">Loading…</p>
      ) : (
        <>
          <section className="today-mod today-mod-today" ref={todayModRef}>
            <ModuleHeader>{isToday ? 'Tasks today' : dayNameFull(viewed)}</ModuleHeader>
            <div className="today-mod-list">
              {todayItems.length === 0 ? (
                <p className="today-empty">
                  {isToday ? 'Nothing due today — a calm one.' : 'Nothing on this day.'}
                </p>
              ) : (
                todayItems.map((t) =>
                  t.parent_task_id ? (
                    // a standalone subtask row (due/scheduled today)
                    <TodayRow
                      key={t.id}
                      task={t}
                      cat={dispCat(t)}
                      catsById={catById}
                      inboxColor={inboxColor}
                      isSub
                      subLabel={parentTitle(t, byId)}
                      muted={!!scheduledBadge(t)}
                      badge={scheduledBadge(t)}
                      busy={busy}
                      onSetStatus={(status) => onUpdate(t.id, { status })}
                      onPlay={() => onStartFocus(t, dispCat(t))}
                      onOpen={() => onOpenTask(t.id)}
                      trayBind={trayBind}
                    />
                  ) : (
                    <Fragment key={t.id}>
                      <TodayRow
                        task={t}
                        cat={dispCat(t)}
                        catsById={catById}
                        inboxColor={inboxColor}
                        muted={!!scheduledBadge(t)}
                        badge={scheduledBadge(t)}
                        busy={busy}
                        progress={progress(t)}
                        expanded={expandedToday.has(t.id)}
                        onToggleExpand={progress(t) ? () => onToggleExpand(t.id) : undefined}
                        onSetStatus={(status) => onUpdate(t.id, { status })}
                        onPlay={() => onStartFocus(t, dispCat(t))}
                        onOpen={() => onOpenTask(t.id)}
                        trayBind={trayBind}
                      />
                      {expandedToday.has(t.id) &&
                        (byParent.get(t.id) || [])
                          .filter((s) => !standaloneIds.has(s.id))
                          .map((s) => (
                            <TodayRow
                              key={s.id}
                              task={s}
                              cat={dispCat(s)}
                              catsById={catById}
                              inboxColor={inboxColor}
                              isSub
                              subLabel={t.title}
                              busy={busy}
                              onSetStatus={(status) => onUpdate(s.id, { status })}
                              onPlay={() => onStartFocus(s, dispCat(s))}
                              onOpen={() => onOpenTask(s.id)}
                            />
                          ))}
                    </Fragment>
                  ),
                )
              )}
            </div>
            <button className="today-add" onClick={onAdd}>+ add a task</button>
          </section>

          <section className="today-mod today-mod-week" ref={weekModRef}>
            <ModuleHeader>The next 7 days</ModuleHeader>
            <div className="today-mod-list">
              {next7.length === 0 && undated.length === 0 ? (
                <p className="today-empty">The week ahead is open.</p>
              ) : (
                <>
                  {next7.map((t) => (
                    <TodayRow
                      key={t.id}
                      task={t}
                      cat={catFor(t)}
                      catsById={catById}
                      inboxColor={inboxColor}
                      busy={busy}
                      onSetStatus={(status) => onUpdate(t.id, { status })}
                      onPlay={() => onStartFocus(t, catFor(t))}
                      onOpen={() => onOpenTask(t.id)}
                      trayBind={trayBind}
                    />
                  ))}
                  {undated.map((t) => (
                    <TodayRow
                      key={t.id}
                      task={t}
                      cat={catFor(t)}
                      catsById={catById}
                      inboxColor={inboxColor}
                      badge={{ text: 'undated' }}
                      busy={busy}
                      onSetStatus={(status) => onUpdate(t.id, { status })}
                      onPlay={() => onStartFocus(t, catFor(t))}
                      onOpen={() => onOpenTask(t.id)}
                      trayBind={trayBind}
                    />
                  ))}
                </>
              )}
            </div>
          </section>

          <button className="today-alltasks" onClick={onOpenPlanning}>
            Planning · {activeTotal(tasks)} <span className="today-alltasks-arrow">→</span>
          </button>
        </>
      )}
      {error && <p className="today-error">{error}</p>}
    </div>
  )
}
