import { useState } from 'react'
import { isInbox } from '../../spine/logic/categoryTree'
import { childrenOf } from '../allTasksModel'
import PlanningGroup from './PlanningGroup'
import './planningCategory.css'

// PlanningCategory — category mode of the Planning view (P4): the backlog grouped by
// category as COLLAPSIBLE GROUPS (not All Tasks' drill-in). Inbox first, then each
// top-level category, recursively nested. It reuses allTasksModel verbatim (via
// PlanningGroup), so the tasks, counts and order match All Tasks exactly — this mode
// is the replacement-in-waiting that lets P6 retire All Tasks. A screen-level
// show-done toggle (done hidden by default; counts always exclude done). Sealed kit
// block; the parent owns the data + writes (status pill, tap-to-edit, "+ add").
//
// Props: tasks, cats, catsById, dispCat, inboxColor, byParent, busy, onUpdate(id, fields),
//        onOpenTask(task), onAdd(catId).
export default function PlanningCategory({ tasks, cats, catsById, dispCat, inboxColor, byParent, busy, onUpdate, onOpenTask, onAdd }) {
  const [showDone, setShowDone] = useState(false)
  const [open, setOpen] = useState(new Set()) // open group + expanded-parent ids (uuids; '__inbox__')
  const toggle = (key) =>
    setOpen((s) => {
      const n = new Set(s)
      n.has(key) ? n.delete(key) : n.add(key)
      return n
    })

  const topCats = childrenOf(cats, null).filter((c) => !isInbox(c))
  const shared = {
    cats,
    tasks,
    byParent,
    catsById,
    dispCat,
    inboxColor,
    busy,
    showDone,
    open,
    onToggle: toggle,
    onOpenTask,
    onSetStatus: (id, status) => onUpdate(id, { status }),
    onAdd,
    depth: 0,
  }

  return (
    <div className="pl-cat">
      <label className="pl-showdone">
        <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
        Show done
      </label>
      <div className="pl-groups">
        <PlanningGroup node={{ id: '__inbox__', name: 'Inbox', color: null }} {...shared} />
        {topCats.map((c) => (
          <PlanningGroup key={c.id} node={{ id: c.id, name: c.name, color: c.color }} {...shared} />
        ))}
      </div>
    </div>
  )
}
