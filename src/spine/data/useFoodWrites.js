import { useState } from "react";
import { logEntry, updateEntry, removeEntry } from "./foodWrite";

// useFoodWrites — optimistic write orchestration for the food log (mirrors useGoalWrites).
// Owns a failure/undo toast and the optimistic add / edit / delete: each change shows in the
// ledger at once, the DB write runs in the background, and ON FAILURE it REVERTS + toasts —
// never silent data loss (the forced-failure test). Caller passes its entries + setter.
export function useFoodWrites(entries, setEntries) {
  const [toast, setToast] = useState(null); // { text, undo? } | null
  const dismissToast = () => setToast(null);
  const fail = (text) => setToast({ text }); // for a prerequisite failure (e.g. cache-on-log)

  // Add: optimistic insert → reconcile to the server row → an UNDO toast (a real delete).
  async function addEntry(row) {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setEntries((cur) => [...cur, { ...row, id: tempId }]);
    try {
      const saved = await logEntry(row);
      setEntries((cur) => cur.map((e) => (e.id === tempId ? saved : e)));
      setToast({ text: "Added", undo: () => undoAdd(saved.id) });
    } catch {
      setEntries((cur) => cur.filter((e) => e.id !== tempId)); // revert — no silent loss
      setToast({ text: "Couldn’t save — try again." });
    }
  }
  async function undoAdd(id) {
    setEntries((cur) => cur.filter((e) => e.id !== id));
    setToast(null);
    try {
      await removeEntry(id);
    } catch {
      /* leave it — reload reveals the truth */
    }
  }

  // Edit: optimistic patch → reconcile to the returned row (with the new updated_at) → revert
  // on failure. `patch` already carries any recomputed snapshot from the caller.
  async function editEntry(id, patch) {
    const prev = entries.find((e) => e.id === id);
    setEntries((cur) => cur.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    try {
      const saved = await updateEntry(id, patch);
      setEntries((cur) => cur.map((e) => (e.id === id ? saved : e)));
    } catch {
      setEntries((cur) => cur.map((e) => (e.id === id ? prev : e)));
      setToast({ text: "Couldn’t save — try again." });
    }
  }

  // Delete: optimistic remove → an UNDO toast that re-inserts the exact row → revert on failure.
  async function deleteEntry(entry) {
    setEntries((cur) => cur.filter((e) => e.id !== entry.id));
    try {
      await removeEntry(entry.id);
      setToast({ text: "Removed", undo: () => undoDelete(entry) });
    } catch {
      setEntries((cur) => [...cur, entry]);
      setToast({ text: "Couldn’t remove — try again." });
    }
  }
  async function undoDelete(entry) {
    setEntries((cur) => (cur.some((e) => e.id === entry.id) ? cur : [...cur, entry]));
    setToast(null);
    try {
      await logEntry(entry); // re-insert the exact row (it carries its id)
    } catch {
      /* reload reveals the truth */
    }
  }

  return { toast, dismissToast, fail, addEntry, editEntry, deleteEntry };
}
