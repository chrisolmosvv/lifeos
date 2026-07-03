import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { activeOnly } from './archive'

// The week's data layer: load this week's events + scheduled tasks + categories,
// and the writes that the week view needs (all reload after). Kept apart so
// WeekCalendar stays about interaction/render. Owner-only RLS applies to every
// query; writes only touch existing columns (no schema change).
const localDateStr = (d) => {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function useWeekData(days) {
  const [events, setEvents] = useState([])
  const [scheduled, setScheduled] = useState([])
  const [tray, setTray] = useState([])
  const [cats, setCats] = useState([])
  const [busy, setBusy] = useState(false)

  async function load() {
    const weekStart = new Date(days[0])
    const weekEnd = new Date(days[0])
    weekEnd.setDate(weekEnd.getDate() + 7)
    const inWeek = (q, col) =>
      q.gte(col, weekStart.toISOString()).lt(col, weekEnd.toISOString())

    // Archive A3: active-only — archived rows are hidden (the ONLY change here).
    const [evRes, taskRes, trayRes, catRes] = await Promise.all([
      // Events that OVERLAP the visible week (start before week-end AND end after
      // week-start), not just those that START in it — so a multi-day event that
      // began earlier still appears. End is stored end-exclusive at midnight, so
      // "end > weekStart" is the correct edge. (This also surfaces timed multi-day
      // events that began before the week.)
      activeOnly(
        supabase
          .from('events')
          .select('id, title, notes, start_at, end_at, location, category_id, all_day, series_id, series_detached')
          .lt('start_at', weekEnd.toISOString())
          .gt('end_at', weekStart.toISOString()),
      ).order('start_at', { ascending: true }),
      activeOnly(
        inWeek(
          supabase
            .from('tasks')
            .select('id, title, notes, status, category_id, priority, time_bucket, due_date, scheduled_start, scheduled_end, series_id, series_detached'),
          'scheduled_start',
        ),
      ),
      // C5: the tray — top-level tasks NOT time-blocked (scheduled_start null) that
      // are either undated or due in the VIEWED week; due-soonest, undated last.
      // Completed tasks are excluded — a done loose task leaves the tray.
      activeOnly(
        supabase
          .from('tasks')
          .select('id, title, notes, status, category_id, priority, time_bucket, due_date, scheduled_start, scheduled_end, parent_task_id, created_at, series_id, series_detached')
          .is('scheduled_start', null)
          .is('parent_task_id', null)
          .neq('status', 'done')
          .or(`due_date.is.null,and(due_date.gte.${localDateStr(weekStart)},due_date.lt.${localDateStr(weekEnd)})`)
          .order('due_date', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: true }),
      ),
      activeOnly(supabase.from('categories').select('id, name, color, parent_id, sort_order')),
    ])
    setEvents(evRes.data || [])
    setScheduled(taskRes.data || [])
    setTray(trayRes.data || [])
    setCats(catRes.data || [])
  }

  // V2-4 (gate): reload when the WEEK changes, not just on mount. WeekView is now
  // stably mounted (no per-week remount), so this effect is what re-provides the
  // per-week reload — load() closes over the current `days`, so keying on the
  // week's first day refetches the new week. (Was `[]` = mount-only, which relied
  // on the remount.)
  const weekKey = days[0].toISOString()
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey])

  // One write, reload after; returns a plain message on error (for the panel).
  async function write(query) {
    setBusy(true)
    const { error } = await query
    setBusy(false)
    if (error)
      return error.code === '23514'
        ? 'That event ends before it starts — check the times.'
        : error.message || 'Something went wrong.'
    await load()
    return null
  }

  const onSaveEvent = (id, fields) =>
    write(
      id
        ? supabase.from('events').update(fields).eq('id', id)
        : supabase.from('events').insert(fields),
    )
  // Task create/edit from the shared form (C3) — same insert/update shape as
  // events, existing columns only (no schema change).
  const onSaveTask = (id, fields) =>
    write(
      id
        ? supabase.from('tasks').update(fields).eq('id', id)
        : supabase.from('tasks').insert(fields),
    )
  const onDeleteEvent = (id) => write(supabase.from('events').delete().eq('id', id))
  const onScheduleTask = (id, startIso, endIso) =>
    write(
      supabase
        .from('tasks')
        .update({ scheduled_start: startIso, scheduled_end: endIso })
        .eq('id', id),
    )
  const onUpdateTask = (id, fields) =>
    write(supabase.from('tasks').update(fields).eq('id', id))
  // C5: "+ add" a loose task into the tray — undated + unscheduled. time_bucket is
  // EXPLICITLY 'Someday' (the column defaults to 'Today'); an undated backlog task
  // must never land in Today's bucket. No due_date / scheduled_start (loose).
  const onAddLooseTask = (title) =>
    write(supabase.from('tasks').insert({ title, time_bucket: 'Someday' }))

  return {
    events,
    scheduled,
    tray,
    cats,
    busy,
    reload: load, // C3: lets the view re-read after an archive (delete) + undo
    onSaveEvent,
    onSaveTask,
    onDeleteEvent,
    onScheduleTask,
    onUpdateTask,
    onAddLooseTask,
  }
}
