// LifeOS — Food → recipe import matching (F8): the CONSERVATIVE clear-hit rule. A parsed
// ingredient name auto-links to a food-search result ONLY when the result is the same food — the
// parsed words LEAD the result in order, ending at a COMMA or the end of the name. The comma is
// the qualifier boundary: USDA descriptive names read "Garlic, raw" / "Chicken, breast, meat only"
// (food, then comma-qualifiers), so those match; brand/compound names read "Garlic Baguettes" /
// "Garlic bread" / "Peanut butter" (a different food joined by a SPACE), so those are rejected.
// Multi-word foods still match ("chicken breast" → "Chicken, breast, meat only" — the separators
// between the parsed words may be comma or space). Under-matches by design; a wrong match silently
// corrupts macros, a missing one is fixable. Pure (no fetch).

// Parsed name → its words (lowercase, punctuation dropped). Parsed names are clean core foods.
function tokens(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
}
// Result name → lowercased, whitespace-collapsed, but COMMAS KEPT (they're the boundary signal).
function cleanResult(s) {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}
const escape = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A clear hit: the parsed words lead the result (comma/space between them), then a comma or end.
export function isClearHit(parsedName, resultName) {
  const t = tokens(parsedName);
  if (!t.length) return false;
  const re = new RegExp("^" + t.map(escape).join("[,\\s]+") + "(?=,|$)");
  return re.test(cleanResult(resultName));
}

// The first clear hit among the top results (food-search orders saved → OFF → USDA by relevance).
// → the matched result, or null (leave it flagged text).
export function pickClearHit(parsedName, results) {
  for (const f of (results || []).slice(0, 5)) {
    if (isClearHit(parsedName, f?.name)) return f;
  }
  return null;
}
