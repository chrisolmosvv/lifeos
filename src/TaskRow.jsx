import CategoryTag from './CategoryTag'
import TaskEditForm from './TaskEditForm'
import './tasks.css'

// One task line: a tick to mark it done, the title + its quiet meta (priority
// kicker, category dot+tag, finish time), the drag grip, and — on tap — the
// shared task editor (TaskEditForm). Persists to existing columns.
export default function TaskRow({
  task,
  cats,
  inboxColor,
  pickable,
  expanded,
  busy,
  onToggleExpand,
  onToggleDone,
  onUpdate,
  scheduleBind,
}) {
  const done = task.status === 'done'

  // Display category: its category, or Inbox when uncategorised (category_id is
  // null — the one and only way a task means "Inbox").
  const cat = task.category_id
    ? cats.find((c) => c.id === task.category_id)
    : null
  const tag = cat
    ? { name: cat.name, color: cat.color }
    : { name: 'Inbox', color: inboxColor }

  return (
    <li className="tasks-item">
      <div className="tasks-row">
        <button
          className={'tasks-check' + (done ? ' is-done' : '')}
          onClick={() => onToggleDone(task)}
          disabled={busy}
          aria-label={done ? 'Reopen task' : 'Mark task done'}
          title={done ? 'Reopen' : 'Mark done'}
        >
          {done ? '✓' : ''}
        </button>

        <button
          className="tasks-head"
          onClick={onToggleExpand}
          aria-expanded={expanded}
        >
          <span
            className={
              'tasks-text' +
              (done ? ' is-done' : '') +
              (!done && task.priority === 'high' ? ' is-high' : '')
            }
          >
            {task.title}
          </span>
          <span className="tasks-meta">
            {!done && task.priority === 'high' && (
              <span className="tasks-pri is-high">High</span>
            )}
            {!done && task.priority === 'med' && (
              <span className="tasks-pri is-med">Med</span>
            )}
            <CategoryTag name={tag.name} color={tag.color} />
            {done && task.completed_at && (
              <span className="tasks-doneat tnum">
                Done · {formatDoneAt(task.completed_at)}
              </span>
            )}
            {task.scheduled_start && (
              <span className="tasks-scheduled">scheduled</span>
            )}
          </span>
        </button>

        {scheduleBind && (
          <span
            className="tasks-grip"
            title="Drag onto The Day to schedule"
            aria-label="Drag to schedule"
            {...scheduleBind(task)}
          >
            ⠿
          </span>
        )}
      </div>

      {expanded && (
        <TaskEditForm
          task={task}
          pickable={pickable}
          inboxColor={inboxColor}
          busy={busy}
          onUpdate={onUpdate}
        />
      )}
    </li>
  )
}

// A quiet "finished at" stamp, e.g. "Jun 22, 14:45". Local time.
function formatDoneAt(iso) {
  const d = new Date(iso)
  const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const p = (n) => String(n).padStart(2, '0')
  return `${MO[d.getMonth()]} ${d.getDate()}, ${p(d.getHours())}:${p(d.getMinutes())}`
}
