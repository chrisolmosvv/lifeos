import { useEffect, useRef, useState } from "react";

// useWakeLock — keep the screen awake while `active` (cooking mode). Uses the Screen Wake Lock
// API, RE-acquires on tab refocus (the lock drops when hidden), and RELEASES on unmount / when
// active goes false. Graceful fallback: unsupported → status "unsupported" (the UI shows a "keep
// your screen on" note instead of the "screen staying on" indicator).
// → "on" | "off" | "unsupported".
export function useWakeLock(active) {
  const [status, setStatus] = useState("off");
  const lockRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    if (!("wakeLock" in navigator)) {
      setStatus("unsupported");
      return;
    }
    let cancelled = false;

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) { lock.release?.(); return; }
        lockRef.current = lock;
        setStatus("on");
        lock.addEventListener?.("release", () => setStatus("off"));
      } catch {
        setStatus("off");
      }
    };
    acquire();

    const onVis = () => {
      if (document.visibilityState === "visible" && !cancelled) acquire();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      try { lockRef.current?.release(); } catch { /* already gone */ }
      lockRef.current = null;
      setStatus("off");
    };
  }, [active]);

  return status;
}
