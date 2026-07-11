// LifeOS — Finance CSV parsers (Piece 5b). Bank-specific parsers that produce
// the common output shape: { entry_date, amount, description }.
// Each parser returns { rows, skippedState, skippedCurrency }.

export function parseINGCsv(/* rawText */) {
  throw new Error('ING parser not yet implemented — waiting on real sample export data (Piece 5c).')
}

// ── Revolut CSV parser ──────────────────────────────────────────────────────
// Columns: Type, Product, Started Date, Completed Date, Description, Amount,
//          Fee, Currency, State, Balance
// Delimiter: comma. Dates: "YYYY-MM-DD HH:MM:SS". Amount: signed decimal.
// Quoted fields are handled (Description can contain commas).

export function parseRevolutCsv(rawText) {
  const lines = rawText.trim().split('\n')
  if (lines.length < 2) return { rows: [], skippedState: 0, skippedCurrency: 0 }

  // Parse header to find column indices (defensive against reordering).
  const header = parseCsvLine(lines[0])
  const idx = {
    completedDate: header.indexOf('Completed Date'),
    description: header.indexOf('Description'),
    amount: header.indexOf('Amount'),
    currency: header.indexOf('Currency'),
    state: header.indexOf('State'),
  }
  // Validate required columns exist.
  for (const [name, i] of Object.entries(idx)) {
    if (i < 0) throw new Error(`Revolut CSV missing column: ${name}`)
  }

  const rows = []
  let skippedState = 0
  let skippedCurrency = 0

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const cols = parseCsvLine(line)

    const state = (cols[idx.state] || '').trim()
    if (state !== 'COMPLETED') { skippedState++; continue }

    const currency = (cols[idx.currency] || '').trim()
    if (currency !== 'EUR') { skippedCurrency++; continue }

    const completedRaw = (cols[idx.completedDate] || '').trim()
    const entry_date = completedRaw.slice(0, 10) // "YYYY-MM-DD HH:MM:SS" → "YYYY-MM-DD"

    const amount = parseFloat(cols[idx.amount])
    if (!Number.isFinite(amount)) continue // skip unparseable amounts silently

    const description = (cols[idx.description] || '').trim()

    rows.push({ entry_date, amount, description })
  }

  return { rows, skippedState, skippedCurrency }
}

// ── CSV line parser (handles quoted fields with commas) ──────────────────────
function parseCsvLine(line) {
  const fields = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"' // escaped quote
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        fields.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  fields.push(current)
  return fields
}

// Fixture data for end-to-end testing (kept for dev convenience).
export function getFixtureImportRows() {
  const today = new Date()
  const ymd = (daysAgo) => {
    const d = new Date(today)
    d.setDate(d.getDate() - daysAgo)
    const p = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  }
  return [
    { entry_date: ymd(1), amount: -12.85, description: 'Albert Heijn' },
    { entry_date: ymd(1), amount: -3.50, description: 'NS Reizen' },
    { entry_date: ymd(2), amount: -45.00, description: 'Vattenfall Energie' },
    { entry_date: ymd(3), amount: 2850.00, description: 'Salaris Werkgever BV' },
    { entry_date: ymd(4), amount: -8.99, description: 'Netflix' },
    { entry_date: ymd(5), amount: -22.40, description: 'Shell Tankstation' },
    { entry_date: ymd(6), amount: -67.50, description: 'Zilveren Kruis' },
    { entry_date: ymd(7), amount: -15.00, description: 'Albert Heijn' },
  ]
}
