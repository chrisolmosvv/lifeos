import { useState } from "react";
import SaveCard from "./SaveCard";
import { useFocusSessionCtx } from "./focusSessionContext.jsx";

// FocusGlobalLayer (spec §13.1/§5) — the save card as a GLOBAL overlay. Rendered once
// at app level so a Stop (from the header popover on ANY screen, or from the in-focus
// view) shows the save card over whatever's on screen. Owns only the running-session
// finalise flow; the edit-a-saved-session card stays local to the Focus pillar. On a
// failed save (e.g. Wi-Fi off) the error shows and the card stays open — the running
// row is still ended_at NULL, so nothing is lost until the write lands.
const label = (s) => s?.task_title_snapshot || s?.category_snapshot?.name || "No label";

export default function FocusGlobalLayer() {
  const fs = useFocusSessionCtx();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!fs || fs.status !== "saving" || !fs.pending) return null;

  const p = fs.pending;
  async function onSave(form) {
    setBusy(true); setErr("");
    try { await fs.save(form); }
    catch (e) { setErr(e.message || "Couldn't save — check your connection and try again."); }
    finally { setBusy(false); }
  }
  async function onDiscard() {
    setBusy(true);
    try { await fs.discard(); } finally { setBusy(false); }
  }

  return (
    <SaveCard title={label(p.session)} taskId={p.session?.task_id} mode="save"
      durationEditable={p.simple} initialDurationSeconds={p.focusSeconds}
      busy={busy} error={err} onSubmit={onSave} onSecondary={onDiscard} />
  );
}
