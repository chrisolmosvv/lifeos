import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { activeOnly } from './archive'
import { startOfWeek } from './dateUtils'
import { ensureGeneratedThrough } from './recur/topup'

// Read-only month-range data for the Month view (Phase 7, C6). A sibling of
// useWeekData (Week's hook is left untouched). Loads the 6-row grid range — the
// Monday on/before the 1st, +42 days: events OVERLAPPING the range (end_at >=
// start, start_at < end — so multi-day strips have their data), tasks scheduled
// OR due in the range, and categories. NO writes, NO tray, NO schema.
const localDateStr = (d) => {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const addDays = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function useMonthData(monthAnchor) {
  const [events, setEvents] = useState([])
  const [tasks, setTasks] = useState([])
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    const gridStart = startOfWeek(monthAnchor)
    const gridEnd = addDays(gridStart, 42)
    async function fetchAndSet() {
      const sIso = gridStart.toISOString()
      const eIso = gridEnd.toISOString()
      const sStr = localDateStr(gridStart)
      const eStr = localDateStr(gridEnd)

      const [evRes, taskRes, catRes] = await Promise.all([
        activeOnly(
          supabase
            .from('events')
            .select('id, title, start_at, end_at, category_id, all_day')
            .lt('start_at', eIso)
            .gte('end_at', sIso)
            .order('start_at', { ascending: true }),
        ),
        activeOnly(
          supabase
            .from('tasks')
            .select('id, title, status, category_id, due_date, scheduled_start, parent_task_id')
            .is('parent_task_id', null)
            .or(
              `and(scheduled_start.gte.${sIso},scheduled_start.lt.${eIso}),and(due_date.gte.${sStr},due_date.lt.${eStr})`,
            ),
        ),
        activeOnly(supabase.from('categories').select('id, name, color, parent_id')),
      ])
      if (!alive) return
      setEvents(evRes.data || [])
      setTasks(taskRes.data || [])
      setCats(catRes.data || [])
      setLoading(false)
    }
    // Fetch, then quietly top up "forever" series through the far grid edge and
    // refetch only if that added rows (so far-forward months are never empty).
    async function run() {
      await fetchAndSet()
      if (alive && (await ensureGeneratedThrough(localDateStr(gridEnd)))) await fetchAndSet()
    }
    run()
    return () => {
      alive = false
    }
  }, [monthAnchor])

  return { events, tasks, cats, loading }
}
