// LifeOS — Focus module P2: remember the last Setup choices (mode + durations) so a
// repeat is fast (spec §3). Local-only (localStorage) — a UI convenience, never data;
// safe if it's missing or unreadable (falls back to sensible defaults).

const KEY = "lifeos.focus.prefs";
const DEFAULTS = { mode: "count_up", downMinutes: 25, focusMinutes: 25, breakMinutes: 5 };

export function loadPrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { ...DEFAULTS, ...raw };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePrefs(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...DEFAULTS, ...prefs }));
  } catch {
    /* private mode / disabled storage — a lost preference is harmless */
  }
}
