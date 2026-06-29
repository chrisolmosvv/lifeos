import { useState } from "react";
import { logEntry, removeEntry } from "./foodWrite";
import { stampLastCooked } from "./recipeWrite";

// useCookLog — the F9 cook→log write. It COMPOSES the F6 primitives (logEntry / removeEntry) for the
// recipe-page context: there's no live ledger array to mutate here (the Log tab refetches and shows
// the new entry when opened), so "optimistic" lives in the caller's "last cooked" line + this toast.
// NOT a forked write path — the same DB primitives, plus the small last_cooked_at stamp.
//
// ALL-OR-NOTHING ordering: write the ENTRY first; if it fails → revert, last_cooked_at never touched.
// Then stamp last_cooked_at; if THAT fails after the entry wrote → delete the entry too. Net of any
// failure: no entry, timestamp unchanged.
//
// THE UNDO RULE: the caller captures the recipe's PRIOR last_cooked_at and passes it in; undo deletes
// the entry AND writes the prior value back (the earlier real date — or null only if this was the
// recipe's first-ever cook). onRevert(ts) puts the caller's live "last cooked" line back.
//
// logCook(row, { recipeId, prior, now, onRevert }):
//   row     — the food_log_entries row (frozen snapshot + recipe_id + entry_source='recipe_cook' +
//             amount=servings + unit='serving' + food_item_id null), already minus last_cooked_at.
//   prior   — recipe.last_cooked_at BEFORE this log (for undo/failure restore).
//   now     — the ISO instant to stamp (the same value the caller optimistically showed).
//   onRevert(ts) — restore the caller's "last cooked" display to ts.
export function useCookLog() {
  const [toast, setToast] = useState(null); // { text, undo? } | null
  const dismiss = () => setToast(null);

  async function logCook(row, { recipeId, prior, now, onRevert }) {
    let saved;
    try {
      saved = await logEntry(row);
    } catch {
      onRevert?.(prior); // the entry never wrote — last_cooked_at untouched
      setToast({ text: "Couldn’t log — try again." });
      return;
    }
    try {
      await stampLastCooked(recipeId, now);
    } catch {
      try { await removeEntry(saved.id); } catch { /* reload reveals the truth */ }
      onRevert?.(prior); // rolled the entry back — no entry, timestamp unchanged
      setToast({ text: "Couldn’t log — try again." });
      return;
    }
    setToast({ text: "Logged", undo: () => undo(saved.id, recipeId, prior, onRevert) });
  }

  async function undo(entryId, recipeId, prior, onRevert) {
    onRevert?.(prior); // restore the PRIOR last-cooked date (may be null only if it was the first cook)
    setToast(null);
    try {
      await removeEntry(entryId);
      await stampLastCooked(recipeId, prior); // write the earlier real date back, NOT null
    } catch {
      /* reload reveals the truth */
    }
  }

  return { toast, dismiss, logCook };
}
