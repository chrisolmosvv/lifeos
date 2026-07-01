import { useState } from "react";
import { logEntry, removeEntry } from "./foodWrite";

// useCookLog → logSnapshot (V2 P3): the ONE shared write primitive for every snapshot log — the
// cook→log bridge (P3) and, at P5, log-a-saved-meal / re-log / the Feature-B estimate. It COMPOSES
// the F6 primitives (logEntry / removeEntry) into a SINGLE-INSERT write with an optimistic/undo
// toast. NO fork, NO branches: the caller builds the whole food_log_entries `row` — its 7-macro
// snapshot ALREADY FROZEN at build time (the sacred snapshot-not-live contract) — and this primitive
// just inserts it. It NEVER reads a live recipe, so editing a recipe later cannot touch logged history.
//
// last_cooked_at is now COMPUTE-ON-READ (lastCookedFor), so there is NO stamp and NO follow-up write:
// the V1 all-or-nothing entry-then-stamp ordering and the undo-restore-prior-stamp logic are GONE.
// Undo is simply "remove the entry".
//
// logSnapshot(row, { onRevert }):
//   row        — the fully-formed food_log_entries row (frozen snapshot + entry_source + recipe_id? +
//                is_estimated? + amount + unit + food_item_id null). Nothing here recomputes it.
//   onRevert() — restore the caller's optimistic UI on failure OR undo (e.g. drop the just-added
//                entry from a local list so a computed "last cooked" reverts).
export function useCookLog() {
  const [toast, setToast] = useState(null); // { text, undo? } | null
  const dismiss = () => setToast(null);

  async function logSnapshot(row, { onRevert } = {}) {
    let saved;
    try {
      saved = await logEntry(row);
    } catch {
      onRevert?.(); // the entry never wrote — restore the optimistic UI
      setToast({ text: "Couldn’t log — try again." });
      return;
    }
    setToast({ text: "Logged", undo: () => undo(saved.id, onRevert) });
  }

  async function undo(entryId, onRevert) {
    setToast(null);
    onRevert?.(); // revert the caller's optimistic echo (remove the appended entry)
    try {
      await removeEntry(entryId);
    } catch {
      /* reload reveals the truth */
    }
  }

  return { toast, dismiss, logSnapshot };
}
