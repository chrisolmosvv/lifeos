import { Fragment } from 'react'
import { colorHex } from '../palette'
import { progressOf } from '../../spine/logic/subtasks'
import { subtreeCount, inboxCount, ownTasks, orderTasks, childrenOf } from '../allTasksModel'
import TodayTaskRow from './TodayTaskRow'

// PlanningGroup — one collapsible category group in category mode (P4), recursive
// for nested sub-categories. Header = caret + colour dot + name + whole-sub-tree
// active count (reuses allTasksModel verbatim, so counts/coverage match All Tasks).
// Expanded body = the category's OWN tasks (ordered like All Tasks, subtasks nested
// + expandable) then its child groups, then a per-group "+ add". Inbox is a group
// with catId null and no children. Many groups open at once (not drill-in). Sealed
// kit block; the parent owns state + writes.
//
// Props: node ({ id: catId | '__inbox__', name, color }), cats, tasks, byParent, catsById,
//        dispCat, inboxColor, busy, showDone, open (Set), onToggle(key),
//        onOpenTask(task), onSetStatus(id, status), onAdd(catId), depth.
export default function PlanningGroup({
  node,
  cats,
  tasks,
  byParent,
  catsById,
  dispCat,
  inboxColor,
  busy,
  showDone,
  open,
  onToggle,
  onOpenTask,
  onSetStatus,
  onAdd,
  depth,
}) {
  const isInboxNode = node.id === '__inbox__'
  const catId = isInboxNode ? null : node.id
  const count = isInboxNode ? inboxCount(tasks) : subtreeCount(cats, tasks, node.id)
  const isOpen = open.has(node.id)
  const dotHex = colorHex(isInboxNode ? inboxColor : node.color)

  const rows = isOpen ? orderTasks(ownTasks(tasks, catId), showDone) : []
  const childCats = isOpen && !isInboxNode ? childrenOf(cats, catId) : []

  return (
    <div className={'pl-group' + (depth ? ' is-nested' : '')}>
      <button className="pl-group-head" onClick={() => onToggle(node.id)}>
        <span className="pl-group-caret">{isOpen ? '▾' : '▸'}</span>
        <span
          className={'pl-group-dot' + (dotHex ? '' : ' is-empty')}
          style={dotHex ? { background: dotHex } : undefined}
        />
        <span className="pl-group-name">{node.name}</span>
        <span className="pl-group-count tnum">{count}</span>
      </button>

      {isOpen && (
        <div className="pl-group-body">
          {rows.map((t) => {
            const subs = (byParent.get(t.id) || []).filter((s) => showDone || s.status !== 'done')
            const prog = progressOf(t.id, byParent)
            return (
              <Fragment key={t.id}>
                <TodayTaskRow
                  task={t}
                  cat={dispCat(t)}
                  catsById={catsById}
                  inboxColor={inboxColor}
                  busy={busy}
                  badge={t.due_date ? undefined : { text: 'undated' }}
                  progress={prog}
                  expanded={open.has(t.id)}
                  onToggleExpand={prog ? () => onToggle(t.id) : undefined}
                  onSetStatus={(status) => onSetStatus(t.id, status)}
                  onOpen={() => onOpenTask(t)}
                />
                {open.has(t.id) &&
                  subs.map((s) => (
                    <TodayTaskRow
                      key={s.id}
                      task={s}
                      cat={dispCat(s)}
                      catsById={catsById}
                      inboxColor={inboxColor}
                      isSub
                      subLabel={t.title}
                      busy={busy}
                      onSetStatus={(status) => onSetStatus(s.id, status)}
                      onOpen={() => onOpenTask(s)}
                    />
                  ))}
              </Fragment>
            )
          })}

          {childCats.map((c) => (
            <PlanningGroup
              key={c.id}
              node={{ id: c.id, name: c.name, color: c.color }}
              cats={cats}
              tasks={tasks}
              byParent={byParent}
              catsById={catsById}
              dispCat={dispCat}
              inboxColor={inboxColor}
              busy={busy}
              showDone={showDone}
              open={open}
              onToggle={onToggle}
              onOpenTask={onOpenTask}
              onSetStatus={onSetStatus}
              onAdd={onAdd}
              depth={depth + 1}
            />
          ))}

          <button className="pl-group-add" onClick={() => onAdd(catId)}>+ add a task</button>
        </div>
      )}
    </div>
  )
}
