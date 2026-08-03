// LifeOS — Food → cook plan FIT-TO-HOLE (3d). Auto-scales the step board's type so it fills the
// available height: grows for short recipes, shrinks for long ones. Manual A−/A+ override; Fit
// returns to auto. Crucially it re-fits ONLY on structural change (recipe / servings / window /
// manual), NEVER on the 1-second timer tick — and it saves/restores the board's scrollTop so a
// long recipe stays put while timers run.

import { useCallback, useLayoutEffect, useRef, useState } from "react";

const MIN = 0.65, MAX = 1.8, STEP = 0.1;
const clamp = (v) => Math.max(MIN, Math.min(MAX, v));

// scrollRef = the fixed-height scroll box (the hole); contentRef = the content inside it.
// `signature` is a value that changes only on structural change (NOT the tick) to re-fit.
export function useFitToHole(scrollRef, contentRef, signature) {
  const [manual, setManual] = useState(null); // null = auto
  const [auto, setAuto] = useState(1);
  const [winTick, setWinTick] = useState(0);
  const scrollTopRef = useRef(0);

  // Track the board's own scroll so re-renders (every tick) can restore it.
  const onScroll = useCallback((e) => { scrollTopRef.current = e.currentTarget.scrollTop; }, []);

  useLayoutEffect(() => {
    const onResize = () => setWinTick((t) => t + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Compute the auto scale from the content's natural height vs the hole. Single ratio pass with a
  // clamp — wrapping makes it approximate, which is exactly what A−/A+ are for.
  useLayoutEffect(() => {
    if (manual != null) return;
    const box = scrollRef.current, content = contentRef.current;
    if (!box || !content) return;
    const avail = box.clientHeight;
    const naturalAtOne = content.offsetHeight / auto; // undo the current scale → height at scale 1
    if (avail > 0 && naturalAtOne > 0) {
      const next = clamp(avail / naturalAtOne);
      if (Math.abs(next - auto) > 0.02) setAuto(next);
    }
  }, [signature, winTick, manual, auto, scrollRef, contentRef]);

  // Restore scrollTop after every render (the tick re-renders the tree; the browser keeps scrollTop
  // on a stable node, but this is the belt-and-braces the spec demands).
  useLayoutEffect(() => {
    const box = scrollRef.current;
    if (box && box.scrollTop !== scrollTopRef.current) box.scrollTop = scrollTopRef.current;
  });

  const scale = manual ?? auto;
  return {
    scale,
    pct: Math.round(scale * 100),
    isManual: manual != null,
    onScroll,
    dec: () => setManual((m) => clamp((m ?? auto) - STEP)),
    inc: () => setManual((m) => clamp((m ?? auto) + STEP)),
    fit: () => setManual(null),
  };
}
