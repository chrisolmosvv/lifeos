// LifeOS — build a recurrence recipe from the form's fields (T10, Piece 2C).
// PURE: form values in → { recipe } or { error } out (no data access, no React),
// so the recipe-shaping lives in one small place and ItemForm.save stays lean.
// `k` is the kind ('event'|'task'); `v` is the relevant ItemForm state.

const hhmm = (dtLocal) => dtLocal.slice(11, 16)            // "YYYY-MM-DDTHH:MM" → "HH:MM"
const dateOf = (dtLocal) => dtLocal.slice(0, 10)           // → "YYYY-MM-DD"
const minutesBetween = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 60000))

export function buildRecipe(k, v) {
  const recipe = {
    target_kind: k,
    freq: v.freq,
    weekdays: v.freq === 'weekly' ? (v.weekdays.length ? v.weekdays : null) : null,
    end_kind: v.endKind,
    end_count: v.endKind === 'count' ? Math.max(1, parseInt(v.endCount, 10) || 1) : null,
    end_until: v.endKind === 'until' ? v.endUntil || null : null,
    timezone: 'Europe/Amsterdam',
    title: v.title,
    notes: v.notes.trim() || null,
    category_id: v.categoryId || null,
  }
  if (v.endKind === 'until' && !recipe.end_until) return { error: 'Pick the date the repeat ends.' }

  if (k === 'event') {
    if (v.allDay) {
      if (!v.startDate) return { error: 'Pick a date.' }
      recipe.start_date = v.startDate
      recipe.all_day = true
      recipe.wall_time = null
      recipe.location = v.location.trim() || null
    } else {
      if (!v.startAt || !v.endAt) return { error: 'An event needs a start and end.' }
      recipe.start_date = dateOf(v.startAt)
      recipe.all_day = false
      recipe.wall_time = hhmm(v.startAt)
      recipe.duration_minutes = minutesBetween(v.startAt, v.endAt)
      recipe.location = v.location.trim() || null
    }
  } else {
    if (!v.due) return { error: 'Pick a due date to repeat this task.' }
    recipe.start_date = v.due
    recipe.time_bucket = v.bucket
    if (v.schStart) {
      recipe.wall_time = hhmm(v.schStart)
      recipe.duration_minutes = v.schEnd ? minutesBetween(v.schStart, v.schEnd) : 60
    }
  }
  return { recipe }
}
