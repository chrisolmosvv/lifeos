import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { activeOnly } from './activeOnly'

// Today's data layer (Phase 7 / T10 P5): the viewed day's tasks + events + cats and
// the write primitives, lifted OUT of Today.jsx so the screen stays about render +
// interaction. Events now fetch by OVERLAP (start < dayEnd AND end > dayStart) and
// select all_day + series_id — so all-day / multi-day items (incl. all-day repeats)
// that cover the day render correctly, matching the Week. Tasks are all active tasks
// (Today filters them client-side); only the events read is day-scoped. Owner-only
// RLS applies to every query; writes touch existing columns.

export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
export const localDateStr = (d) => {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
export const friendly = (error) => error.message || 'Something went wrong.'
const friendlyEvent = (error) =>
  error.code === '23514' ? 'That event ends before it starts — check the times.' : error.message || 'Something went wrong.'

export function useTodayData(viewed, onAfterFetch) {
  const [tasks, setTasks] = useState(null)
  const [cats, setCats] = useState([])
  const [events, setEvents] = useState([]) // the viewed day's events (timed + all-day)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function fetchAndSet() {
    const dayStart = startOfDay(viewed)
    const dayEnd = addDays(dayStart, 1)
    const [taskRes, catRes, evRes] = await Promise.all([
      activeOnly(
        supabase
          .from('tasks')
          .select(
            'id, title, notes, status, completed_at, category_id, priority, time_bucket, due_date, parent_task_id, scheduled_start, scheduled_end, created_at, series_id, series_detached',
          )
          .order('created_at', { ascending: true }),
      ),
      activeOnly(
        supabase
          .from('categories')
          .select('id, name, parent_id, color, sort_order, created_at')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true }),
      ),
      // OVERLAP the viewed day (not start-in-day), + all_day so an all-day / multi-day
      // event covering today renders; + series_id for the repeat marker.
      activeOnly(
        supabase
          .from('events')
          .select('id, title, notes, start_at, end_at, location, category_id, all_day, series_id, series_detached')
          .lt('start_at', dayEnd.toISOString())
          .gt('end_at', dayStart.toISOString())
          .order('start_at', { ascending: true }),
      ),
    ])
    if (taskRes.error) { setError(friendly(taskRes.error)); setTasks([]); return }
    setError('')
    setTasks(taskRes.data)
    setCats(catRes.data || [])
    setEvents(evRes.data || [])
  }

  // Fetch, then quietly top up "forever" series through the day's end and refetch
  // only if that added rows (closes the Piece-4 gap for Today). Best-effort.
  async function load() {
    await fetchAndSet()
    if (onAfterFetch && await onAfterFetch(localDateStr(addDays(startOfDay(viewed), 1)))) await fetchAndSet()
  }

  useEffect(() => {
    load()
  }, [viewed]) // eslint-disable-line react-hooks/exhaustive-deps

  async function writeTask(query) {
    setBusy(true)
    const { error } = await query
    setBusy(false)
    if (error) return friendly(error)
    await load()
    return null
  }
  async function writeEvent(query) {
    setBusy(true)
    const { error } = await query
    setBusy(false)
    if (error) return friendlyEvent(error)
    await load()
    return null
  }

  return { tasks, events, cats, busy, setBusy, error, setError, load, writeTask, writeEvent }
}
