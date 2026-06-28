import { useRef, useState } from "react";
import { setGoal, clearGoal } from "./healthGoalsWrite";

// useGoalWrites — the optimistic goal write/edit orchestration, shared by the Body
// page (S9 piece 2/3) and later the Sleep page (piece 3). It owns: which editor is
// open + the anchor element it points at, a failure toast, and the optimistic
// set/clear handlers that update the caller's live goal Map immediately and write in
// the background — reverting the Map + toasting on failure.
//
// The caller passes its goal Map state + setter: useGoalWrites(goalMap, setGoalMap).
//   openEditor(metric, el) — anchor to el, open the editor for that metric.
//   submitGoal(metric, {target_value,unit,direction}) — append an active row.
//   clearGoalFor(metric) — append a cleared marker.
export function useGoalWrites(goalMap, setGoalMap) {
  const anchorRef = useRef(null);
  const [editor, setEditor] = useState(null); // { metric } | null
  const [toast, setToast] = useState(null);

  const openEditor = (metric, el) => {
    anchorRef.current = el;
    setEditor({ metric }); // a single value goal (weight / body_fat)
  };
  const openSleepEditor = (el) => {
    anchorRef.current = el;
    setEditor({ sleep: true }); // the combined sleep duration + bedtime editor
  };
  const closeEditor = () => setEditor(null);
  const dismissToast = () => setToast(null);

  async function submitGoal(metric, vals) {
    const prev = goalMap;
    const next = new Map(prev);
    next.set(metric, { target_value: vals.target_value, unit: vals.unit, direction: vals.direction });
    setGoalMap(next); // optimistic — the bar appears at once
    setEditor(null);
    try {
      await setGoal({ goal_type: metric, ...vals });
    } catch {
      setGoalMap(prev); // revert the display
      setToast("Couldn’t save — try again.");
    }
  }

  async function clearGoalFor(metric) {
    const prev = goalMap;
    const next = new Map(prev);
    next.delete(metric);
    setGoalMap(next); // optimistic — the prompt returns at once
    setEditor(null);
    try {
      await clearGoal(metric);
    } catch {
      setGoalMap(prev);
      setToast("Couldn’t clear — try again.");
    }
  }

  // Set/change SEVERAL goals at once (the combined sleep editor). list = [{goal_type,
  // target_value, unit, direction}, …]. Optimistic for all, one write each; any
  // failure reverts the whole batch and toasts.
  async function submitGoals(list) {
    if (!list.length) {
      setEditor(null);
      return;
    }
    const prev = goalMap;
    const next = new Map(prev);
    for (const g of list) {
      next.set(g.goal_type, { target_value: g.target_value, unit: g.unit, direction: g.direction });
    }
    setGoalMap(next);
    setEditor(null);
    try {
      await Promise.all(list.map((g) => setGoal(g)));
    } catch {
      setGoalMap(prev);
      setToast("Couldn’t save — try again.");
    }
  }

  // Clear SEVERAL goals at once (the combined sleep editor clears duration + bedtime).
  async function clearGoals(metrics) {
    const live = metrics.filter((m) => goalMap.has(m));
    if (!live.length) {
      setEditor(null);
      return;
    }
    const prev = goalMap;
    const next = new Map(prev);
    live.forEach((m) => next.delete(m));
    setGoalMap(next);
    setEditor(null);
    try {
      await Promise.all(live.map((m) => clearGoal(m)));
    } catch {
      setGoalMap(prev);
      setToast("Couldn’t clear — try again.");
    }
  }

  return {
    anchorRef, editor, toast,
    openEditor, openSleepEditor, closeEditor, dismissToast,
    submitGoal, clearGoalFor, submitGoals, clearGoals,
  };
}
