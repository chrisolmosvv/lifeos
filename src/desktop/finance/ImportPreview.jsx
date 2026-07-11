import { useEffect, useState } from 'react'
import SmallCapsLabel from '../kit/SmallCapsLabel'
import HairlineRule from '../kit/HairlineRule'
import { guessCategoriesForDescriptions } from './importGuess'
import { buildCsvMatchKey, findExistingKeys, batchImportTransactions, listCategories } from './financeData'
import './financeImport.css'

// ImportPreview — the editable preview table before CSV rows commit to the DB.
// Receives pre-parsed rows + skip counts from the caller (AccountDetail reads
// the file and calls the appropriate parser before rendering this component).

export default function ImportPreview({ accountId, parsedRows, skippedState, skippedCurrency, onDone, onCancel }) {
  const [rows, setRows] = useState(null) // null = loading
  const [cats, setCats] = useState([])
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const descs = parsedRows.map((r) => r.description)
      const [guessMap, existingKeys, freshCats] = await Promise.all([
        guessCategoriesForDescriptions(accountId, descs),
        findExistingKeys(accountId, parsedRows.map((r) => buildCsvMatchKey(accountId, r))),
        listCategories(),
      ])
      if (!alive) return
      setCats(freshCats)
      const enriched = parsedRows.map((r, i) => {
        const key = buildCsvMatchKey(accountId, r)
        const alreadyImported = existingKeys.has(key)
        const guessedCat = guessMap.get((r.description || '').trim().toLowerCase()) || null
        return { _idx: i, entry_date: r.entry_date, amount: r.amount, description: r.description,
          category_id: guessedCat, included: !alreadyImported, alreadyImported, csv_match_key: key }
      })
      setRows(enriched)
    })()
    return () => { alive = false }
  }, [accountId, parsedRows])

  function toggleRow(idx) { setRows((prev) => prev.map((r) => r._idx === idx ? { ...r, included: !r.included } : r)) }
  function setCat(idx, catId) { setRows((prev) => prev.map((r) => r._idx === idx ? { ...r, category_id: catId || null } : r)) }

  async function handleImport() {
    const toImport = rows.filter((r) => r.included && !r.alreadyImported)
    if (!toImport.length) return
    setBusy(true)
    try { const res = await batchImportTransactions(accountId, toImport); setResult(res) }
    catch (e) { console.error('Import failed:', e) }
    finally { setBusy(false) }
  }

  if (result) {
    return (
      <div className="fin-import">
        <SmallCapsLabel>Import complete</SmallCapsLabel>
        <p className="fin-import-done">Imported {result.imported} transaction{result.imported !== 1 ? 's' : ''}.</p>
        <button className="fin-import-close" onClick={onDone}>Done</button>
      </div>
    )
  }

  if (!rows) {
    return (
      <div className="fin-import">
        <SmallCapsLabel>Import</SmallCapsLabel>
        <p className="fin-loading">Preparing preview…</p>
      </div>
    )
  }

  const newCount = rows.filter((r) => r.included && !r.alreadyImported).length
  const dupeCount = rows.filter((r) => r.alreadyImported).length
  const fmtAmt = (v) => {
    const n = Number(v)
    const s = n >= 0 ? '+' : ''
    return s + n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const skipParts = []
  if (skippedState > 0) skipParts.push(`${skippedState} skipped (pending/reverted)`)
  if (skippedCurrency > 0) skipParts.push(`${skippedCurrency} skipped (non-EUR)`)

  return (
    <div className="fin-import">
      <SmallCapsLabel>Import preview</SmallCapsLabel>
      <HairlineRule />
      <p className="fin-import-summary">
        {newCount} new{dupeCount > 0 ? `, ${dupeCount} already imported` : ''}
        {skipParts.length > 0 ? ` · ${skipParts.join(', ')}` : ''}
      </p>

      <table className="fin-import-table">
        <thead>
          <tr>
            <th className="fin-import-th"></th>
            <th className="fin-import-th">Date</th>
            <th className="fin-import-th fin-import-th-amt">Amount</th>
            <th className="fin-import-th">Description</th>
            <th className="fin-import-th">Category</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r._idx} className={'fin-import-row' + (r.alreadyImported ? ' is-dupe' : '') + (!r.included ? ' is-excluded' : '')}>
              <td className="fin-import-td"><input type="checkbox" checked={r.included} onChange={() => toggleRow(r._idx)} /></td>
              <td className="fin-import-td fin-import-date">{r.entry_date}</td>
              <td className={'fin-import-td fin-import-amt tnum' + (r.amount >= 0 ? ' is-pos' : ' is-neg')}>€{fmtAmt(r.amount)}</td>
              <td className="fin-import-td fin-import-desc">
                {r.description}
                {r.alreadyImported && <span className="fin-import-dupe-tag">already imported</span>}
              </td>
              <td className="fin-import-td">
                <select className="fin-import-cat" value={r.category_id || ''} onChange={(e) => setCat(r._idx, e.target.value)}>
                  <option value="">Inbox</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="fin-import-actions">
        <button className="fin-import-go" onClick={handleImport} disabled={busy || newCount === 0}>
          {busy ? 'Importing…' : `Import ${newCount} transaction${newCount !== 1 ? 's' : ''}`}
        </button>
        <button className="fin-import-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
