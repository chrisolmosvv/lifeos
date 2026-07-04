// useBroadsheetCook — a thin hook composing useCookSession + the cook actions for the broadsheet
// surface. Encapsulates lazy-start: the session is created on the FIRST real action (tick or mark),
// not on browse. Reuses the existing engine — does NOT rebuild persistence.
import { useCookSession } from "./useCookSession";

export function useBroadsheetCook(recipeId) {
  const { state, ready, update } = useCookSession(recipeId);

  const board = state.board || {};
  const ticked = state.ticked || [];

  // Step state: "waiting" (default) | "active" | "done"
  const stepState = (i) => board[i] || "waiting";

  // Cycle a step: waiting → active → done → waiting
  const markStep = (i) => {
    const cur = stepState(i);
    const next = cur === "waiting" ? "active" : cur === "active" ? "done" : "waiting";
    const nb = { ...board, [i]: next };
    const struck = Object.entries(nb).filter(([, v]) => v === "done").map(([k]) => Number(k));
    update({ board: nb, struck });
  };

  // Tick/untick an ingredient
  const isTicked = (i) => ticked.includes(i);
  const toggleTick = (i) => {
    update({ ticked: isTicked(i) ? ticked.filter((x) => x !== i) : [...ticked, i] });
  };

  // Is a cook session active (any action has been taken)?
  const isActive = state.status === "active" && (ticked.length > 0 || Object.keys(board).length > 0);

  return { ready, stepState, markStep, isTicked, toggleTick, isActive };
}
