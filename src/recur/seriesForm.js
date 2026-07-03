import {
  createSeriesAndMaterialise, applyOccurrenceEdit, undoSeriesSplit,
  deleteOccurrenceScope, undoSeriesDelete,
} from './series'

// LifeOS — the series form-host handlers (T10). One factory the three ItemForm
// hosts (WeekView, Today, Planning) call to get their onSaveSeries / onSaveSeriesEdit
// / onDeleteSeries — so each host stays lean and the create/edit/delete flow is
// wired ONE way, not copied three times. `ctx` supplies the host's state:
//   form      — the open form ({ kind, item }); read at call time
//   setForm   — close the form
//   reload    — re-read the host's data
//   setToast  — show an undo toast ({ text, onUndo })
export function seriesFormHandlers({ form, setForm, reload, setToast }) {
  return {
    // Create a repeat → materialise occurrences, then close + reload.
    onSaveSeries: async (recipe) => {
      const msg = await createSeriesAndMaterialise(recipe)
      if (!msg) { setForm(null); await reload() }
      return msg
    },
    // Edit an occurrence by scope; "this and following" → one undo toast for the split.
    onSaveSeriesEdit: async (scope, fields) => {
      const r = await applyOccurrenceEdit(scope, form.kind, form.item, fields)
      if (r.error) return r.error
      setForm(null)
      await reload()
      if (r.undo) setToast({ text: 'Repeat split', onUndo: async () => { setToast(null); await undoSeriesSplit(r.undo); await reload() } })
      return null
    },
    // Delete an occurrence by scope → one undoable archive batch.
    onDeleteSeries: async (scope) => {
      const r = await deleteOccurrenceScope(scope, form.kind, form.item)
      if (r.error) return r.error
      setForm(null)
      await reload()
      setToast({ text: 'Deleted', onUndo: async () => { setToast(null); await undoSeriesDelete(r.undo); await reload() } })
      return null
    },
  }
}
