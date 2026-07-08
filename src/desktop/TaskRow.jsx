import { useState } from 'react'
import CategoryTag from './CategoryTag'
import TaskEditForm from './TaskEditForm'
import { dueStatus, formatDue } from './dueDate'
import './tasks.css'

// One task line: a tick to mark it done, the title + its quiet meta (priority
// kicker, category dot+tag, due date, subtask count), the drag grip, and — on
// tap — the shared task editor plus (for a parent) "+ Add subtask" and Delete.
// A subtask renders indented; one level only (enforced in the DB too).
export default function TaskRow({
  task,
  cats,
  inboxColor,
  pickable,
  expanded,
  busy,
  depth = 0,
  isSubtask = false,
  subtasks = [],
  onToggleExpand,
  onToggleDone,
  onUpdate,
  onAddSubtask,
  onDelete,
  scheduleBind,
}) {
  const [addingSub, setAddingSub] = useState(false)
  const [subValue, setSubValue] = useState('')

  const done = task.status === 'done'
  const subDone = subtasks.filter((s) => s.status === 'done').length
  const subTotal = subtasks.length

  async function submitSub(e) {
    e.preventDefault()
    const v = subValue.trim()
    if (!v || busy) return
    const ok = await onAddSubtask(task.id, v)
    if (ok) setSubValue('')
  }

  // Display category: its category, or Inbox when uncategorised (category_id is
  // null — the one and only way a task means "Inbox").
  const cat = task.category_id
    ? cats.find((c) => c.id === task.category_id)
    : null
  const tag = cat
    ? { name: cat.name, color: cat.color }
    : { name: 'Inbox', color: inboxColor }

  return (
    <li className={'tasks-item' + (isSubtask ? ' is-subtask' : '')}>
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
            {task.due_date && (
              <span
                className={
                  'tasks-due' +
                  (!done && dueStatus(task.due_date) === 'overdue'
                    ? ' is-overdue'
                    : '')
                }
              >
                {formatDue(task.due_date)}
              </span>
            )}
            {subTotal > 0 && (
              <span className="tasks-subcount tnum">
                {subDone} of {subTotal} done
              </span>
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
        <div className="tasks-expanded">
          <TaskEditForm
            task={task}
            pickable={pickable}
            inboxColor={inboxColor}
            busy={busy}
            onUpdate={onUpdate}
          />
          <div className="tasks-rowactions">
            {/* One level only: a subtask is not offered "+ Add subtask". */}
            {!isSubtask &&
              (addingSub ? (
                <form className="tb-addform" onSubmit={submitSub}>
                  <input
                    className="tasks-input"
                    autoFocus
                    value={subValue}
                    onChange={(e) => setSubValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Escape' && setAddingSub(false)}
                    placeholder="New subtask"
                    aria-label="New subtask"
                  />
                  <button className="tb-addbtn" type="submit" disabled={busy}>
                    Add
                  </button>
                </form>
              ) : (
                <button
                  className="tb-addlink"
                  onClick={() => setAddingSub(true)}
                >
                  + Add subtask
                </button>
              ))}
            <button
              className="tasks-delete"
              onClick={() => onDelete(task.id)}
              disabled={busy}
            >
              Delete task
            </button>
          </div>
        </div>
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
