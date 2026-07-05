// LifeOS — Food → conservative auto-clean for food names from external databases.
// DELIBERATELY TIMID: fixes whitespace, ensures first-letter capitalisation, and title-cases
// ALL-CAPS names. Everything else is left as-is — the owner can override via display_name.

export function cleanFoodName(raw) {
  if (!raw || typeof raw !== "string") return raw || "";
  let s = raw.trim().replace(/\s{2,}/g, " ");
  if (!s) return s;
  // ALL CAPS (>3 chars with at least one letter) → title-case each word
  if (s.length > 3 && s === s.toUpperCase() && /[A-Z]/.test(s)) {
    s = s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  // Ensure first character is uppercase
  if (s[0] >= "a" && s[0] <= "z") s = s[0].toUpperCase() + s.slice(1);
  return s;
}
