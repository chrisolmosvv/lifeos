import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabaseClient.js";
import { resolveColor } from "../colorModel";
import { colorHex, INBOX_COLOR } from "../palette";
import { amsTodayYMD } from "../gym/gymDates.js";
import { fetchSessions } from "./focusLoad.js";
import { ledgerAll } from "./focusCalc.js";
import { finalizeSession, archiveSession, unarchiveSession, markTaskDone, addManualSession } from "./focusWrite.js";
import { takePendingFocus, peekPendingFocus } from "./focusNav.js";
import { fetchGoals } from "../health/healthLoad.js";
import { resolveGoals } from "../health/healthGoals.js";
import { setGoal, clearGoal } from "../health/healthGoalsWrite.js";
import { useFocusSessionCtx } from "./focusSessionContext.jsx";
import Setup from "./Setup";
import ManualEntry from "./ManualEntry";
import InFocus from "./InFocus";
import SaveCard from "./SaveCard";
import { rangeBars, weekVsTrailingAvg } from "./focusTrend.js";
import FocusOverview from "./FocusOverview";
import RangeView from "./RangeView";
import FullLedgerPage from "./FullLedgerPage";
import FocusGoalsEditor from "./FocusGoalsEditor";
import Popover from "../kit/Popover";
import Toast from "../kit/Toast";
import "./focus.css";
import "./focusOverview.css";

// FocusPage — the Focus pillar shell (pieces 2+3). Hosts the write loop (Setup →
// In-focus → save card) AND the read Overview (dial + ledger + week strip + range).
const isInbox = (c) => c.parent_id == null && c.name === "Inbox";
const RANGE_DAYS = { week: 7, month: 30, ninety: 90 }; // window lengths (days) for the chart

export default function FocusPage() {
  const fs = useFocusSessionCtx();
  const [cats, setCats] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [goals, setGoals] = useState(new Map());
  // Pick the FIRST screen from any parked ▶ / add-past / see-all request (PEEKED, not
  // consumed) so its destination paints immediately — no overview flash. With no parked
  // request (a plain tap on Focus) we start on the overview, exactly as before. The
  // mount effect below still consumes-and-clears the request once.
  const req0 = peekPendingFocus();
  const [view, setView] = useState(
    req0 ? (req0.mode === "manual" ? "manual" : req0.mode === "full" ? "full" : "setup") : "overview",
  ); // 'overview' | 'setup' | 'manual' | 'full'
  const [filterCat, setFilterCat] = useState(null);
  const [prefill, setPrefill] = useState(req0 && req0.mode !== "full" ? req0.prefill || null : null); // task prefill for Setup / manual (from ▶)
  const [fullTaskFilter, setFullTaskFilter] = useState(req0 && req0.mode === "full" ? req0.taskId || null : null); // see-all filtered to a task
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cardError, setCardError] = useState("");
  const [toast, setToast] = useState(null);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [chartRange, setChartRange] = useState("week"); // chart window mode: week | month | ninety
  const [chartOffset, setChartOffset] = useState(0); // whole windows back from now (0 = current)
  const goalsRef = useRef(null);

  const today = amsTodayYMD();
  const now = Date.now();
  // The chart's rolling window ends here — stepped back by whole window-lengths.
  const windowNow = now - chartOffset * (RANGE_DAYS[chartRange] || 7) * 86400000;
  const byId = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);
  const colorFor = useCallback((id) => {
    if (!id) return "var(--ink-muted)";
    const c = byId.get(id);
    return c ? resolveColor(c, byId) : (colorHex(INBOX_COLOR) || "#9A9384");
  }, [byId]);
  const nameFor = useCallback((id) => {
    if (!id) return "No category";
    return byId.get(id)?.name || "No category";
  }, [byId]);
  // A STABLE per-category rank (by the category's own sort position) so the chart can
  // draw each category in the same stack slot on every day. Uncategorised sorts last.
  const catRank = useMemo(() => {
    const ordered = [...cats].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.id).localeCompare(String(b.id)));
    const m = new Map(ordered.map((c, i) => [c.id, i]));
    return (id) => (id != null && m.has(id) ? m.get(id) : Number.MAX_SAFE_INTEGER);
  }, [cats]);
  const dailySeconds = goals.get("focus_daily")?.target_value ?? null;
  const weeklySeconds = goals.get("focus_weekly")?.target_value ?? null;

  const refresh = useCallback(async () => {
    const t = Date.now();
    setRawRows(await fetchSessions(new Date(t - 100 * 86400000).toISOString(), new Date(t + 86400000).toISOString()));
  }, []);
  const refreshGoals = useCallback(async () => setGoals(resolveGoals(await fetchGoals())), []);

  useEffect(() => {
    supabase.from("categories").select("id, name, parent_id, color, sort_order").is("archived_at", null)
      .then(({ data }) => setCats(data || []));
    refresh(); refreshGoals();
  }, [refresh, refreshGoals]);

  // Consume a parked ▶ / add-past / see-all request (routed from a task form).
  useEffect(() => {
    const apply = (p) => {
      if (!p) return;
      if (p.mode === "manual") { setPrefill(p.prefill || null); setView("manual"); }
      else if (p.mode === "full") { setFullTaskFilter(p.taskId || null); setView("full"); }
      else { setPrefill(p.prefill || null); setView("setup"); }
    };
    apply(takePendingFocus());
    const h = () => apply(takePendingFocus());
    window.addEventListener("lifeos:focus-open", h);
    return () => window.removeEventListener("lifeos:focus-open", h);
  }, []);

  // Keep the overview fresh when focus data changes anywhere (e.g. a Stop→Save from
  // the header marker on another screen finalises via the global save card).
  useEffect(() => {
    const h = () => refresh();
    window.addEventListener("lifeos:focus-changed", h);
    return () => window.removeEventListener("lifeos:focus-changed", h);
  }, [refresh]);

  const subjectLabel = (s) => s?.task_title_snapshot || s?.category_snapshot?.name || "No label";

  async function onStart(fields) {
    setBusy(true); setCardError("");
    try { await fs.start(fields); setPrefill(null); setView("overview"); }
    catch (e) { setCardError(e.message || "Couldn't start."); } finally { setBusy(false); }
  }
  async function onManualSubmit(fields) {
    setBusy(true); setCardError("");
    try { await addManualSession(fields); setPrefill(null); setView("overview"); await refresh(); }
    catch (e) { setCardError(e.message || "Couldn't add — check your connection."); } finally { setBusy(false); }
  }

  async function onEditSave(form) {
    const raw = rawRows.find((r) => r.id === editing.id);
    const simple = raw && raw.mode !== "intervals" && (!raw.segments || raw.segments.length === 0);
    setBusy(true); setCardError("");
    try {
      const patch = { rating: form.rating ?? null, note: form.note?.trim() || null };
      if (simple) patch.ended_at = new Date(new Date(raw.started_at).getTime() + form.durationSeconds * 1000).toISOString();
      if (form.markDone && raw?.task_id) await markTaskDone(raw.task_id);
      await finalizeSession(editing.id, patch); setEditing(null); await refresh();
    } catch (e) { setCardError(e.message || "Couldn't save."); } finally { setBusy(false); }
  }
  async function onDelete(row) {
    setBusy(true);
    try {
      await archiveSession(row.id); await refresh();
      setToast({ text: "Session deleted", onUndo: async () => { await unarchiveSession(row.id); setToast(null); await refresh(); } });
    } finally { setBusy(false); }
  }
  async function onSaveGoals(list) { for (const g of list) await setGoal(g); setGoalsOpen(false); await refreshGoals(); }
  async function onClearGoals() { await clearGoal("focus_daily"); await clearGoal("focus_weekly"); setGoalsOpen(false); await refreshGoals(); }

  const pickCat = (id) => setFilterCat((cur) => (cur === id ? null : id));
  const editRaw = editing && rawRows.find((r) => r.id === editing.id);

  // ── Body by status/view ─────────────────────────────────────────────────────
  let body;
  if (fs.status === "loading") body = <p className="focus-empty">Loading…</p>;
  else if (fs.status === "stale")
    body = (
      <div className="focus-card focus-card--inline">
        <h3 className="focus-card-title">A session's still running</h3>
        <p className="focus-card-subject">Started {new Date(fs.staleRow.started_at).toLocaleString()} — finish it or discard it.</p>
        <div className="focus-card-actions">
          <button className="focus-btn-ghost focus-btn-danger" onClick={() => fs.resolveStale("discard")}>Discard</button>
          <button className="focus-btn-start" onClick={() => fs.resolveStale("finalise")}>Finish &amp; save</button>
        </div>
      </div>
    );
  else if (fs.status === "running" || fs.status === "paused" || (fs.status === "saving" && fs.session))
    body = <InFocus live={fs.live} subjectLabel={subjectLabel(fs.session)} paused={fs.status === "paused"} onPause={fs.pause} onResume={fs.resume} onStop={fs.stop} />;
  else if (view === "setup")
    body = <Setup prefill={prefill} cats={cats} inboxColor={cats.find(isInbox)?.color || INBOX_COLOR} busy={busy}
      onStart={onStart} onCancel={() => { setPrefill(null); setView("overview"); }} />;
  else if (view === "manual")
    body = <ManualEntry prefill={prefill} cats={cats} inboxColor={cats.find(isInbox)?.color || INBOX_COLOR} busy={busy}
      onSubmit={onManualSubmit} onCancel={() => { setPrefill(null); setView("overview"); }} />;
  else if (view === "full")
    body = <FullLedgerPage rows={ledgerAll(rawRows)} colorFor={colorFor} busy={busy} initialTaskFilter={fullTaskFilter}
      onBack={() => { setFullTaskFilter(null); setView("overview"); }} onEdit={setEditing} onDelete={onDelete} />;
  else if (view === "range")
    // "expand" → the EXISTING full-screen range view (reused as-is), on the current window.
    body = (
      <div className="focus-rangefull">
        <button className="focus-linkbtn focus-rangefull-back" onClick={() => setView("overview")}>‹ back to today</button>
        <RangeView data={rangeBars(rawRows, { range: chartRange, now: windowNow })}
          trend={weekVsTrailingAvg(rawRows, { now: windowNow })}
          colorFor={colorFor} range={chartRange} filterCat={filterCat} onPickCategory={pickCat} />
      </div>
    );
  else
    body = (
      <div className="focus-overview">
        <FocusOverview rawRows={rawRows} today={today} now={now} colorFor={colorFor}
          nameFor={nameFor} catRank={catRank}
          filterCat={filterCat} onPickCategory={pickCat} onClear={() => setFilterCat(null)}
          onSeeAll={() => setView("full")} dailySeconds={dailySeconds} weeklySeconds={weeklySeconds}
          onSetTarget={() => setGoalsOpen(true)} targetsRef={goalsRef}
          onStart={() => { setPrefill(null); setView("setup"); }}
          onAddPast={() => { setPrefill(null); setView("manual"); }}
          range={chartRange} windowNow={windowNow} canForward={chartOffset > 0}
          onRange={(r) => { setChartRange(r); setChartOffset(0); }}
          onStepBack={() => setChartOffset((o) => o + 1)}
          onStepFwd={() => setChartOffset((o) => Math.max(0, o - 1))}
          onExpand={() => setView("range")} />
      </div>
    );

  return (
    <div className="focus-page">
      {body}

      {/* The running-session save card is a GLOBAL overlay (FocusGlobalLayer) so it can
          appear over any screen; FocusPage only owns the edit-a-saved-session card. */}
      {editing && (
        <SaveCard title={editing.taskTitle || editing.categorySnapshot?.name || "No label"} taskId={editRaw?.task_id} mode="edit"
          durationEditable={editRaw && editRaw.mode !== "intervals" && (!editRaw.segments || editRaw.segments.length === 0)}
          initialDurationSeconds={editing.focusSeconds} initialRating={editing.rating} initialNote={editing.note}
          busy={busy} error={cardError} onSubmit={onEditSave} onSecondary={() => { setEditing(null); setCardError(""); }} />
      )}
      {goalsOpen && (
        <Popover anchorRef={goalsRef} title="Focus targets" onClose={() => setGoalsOpen(false)}>
          <FocusGoalsEditor dailySeconds={dailySeconds} weeklySeconds={weeklySeconds}
            onSubmit={onSaveGoals} onClearAll={onClearGoals} onClose={() => setGoalsOpen(false)} />
        </Popover>
      )}
      {toast && <Toast text={toast.text} onUndo={toast.onUndo} onDismiss={() => setToast(null)} />}
    </div>
  );
}
