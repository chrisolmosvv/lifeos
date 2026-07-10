// LifeOS — Finance CSV parsers (Piece 5). Two bank-specific parsers + a fixture
// generator for end-to-end testing before real sample data arrives.
//
// COMMON OUTPUT SHAPE (both parsers will produce this):
//   { entry_date: 'YYYY-MM-DD', amount: number (signed), description: string }
//
// The parsers are STUBS — they throw until Piece 5b when the owner supplies real
// de-identified sample exports from each bank.

export function parseINGCsv(/* rawText */) {
  throw new Error('ING parser not yet implemented — waiting on real sample export data (Piece 5b).')
}

export function parseRevolutCsv(/* rawText */) {
  throw new Error('Revolut parser not yet implemented — waiting on real sample export data (Piece 5b).')
}

// Fixture data for end-to-end testing of the preview → edit → dedup → commit
// flow. Returns ~8 rows in the common output shape. Designed so that if you
// manually log a transaction with description "Albert Heijn" on the test account
// before importing, the category auto-guess will hit on fixture row #1.
// TODO Piece 5b: remove once real parsers are wired.
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
