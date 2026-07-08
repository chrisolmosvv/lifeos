import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./popover.css";

// Popover — a calm anchored overlay (the new S9 UI primitive; nothing like it
// existed in the kit). On a wide screen it floats just under the anchor element,
// clamped inside the viewport (flips above if there's no room below). On a narrow
// screen (≤ NARROW) it degrades to a centered sheet rather than spilling off-edge.
// A faint backdrop catches an outside click to close; Escape closes too.
//
// Props: anchorRef (a ref to the element it points at), title, onClose, children.
const NARROW = 560;
const GAP = 8;
const EDGE = 12;

export default function Popover({ anchorRef, title, onClose, children }) {
  const popRef = useRef(null);
  const [pos, setPos] = useState(null); // {top,left} on wide; null = sheet/unplaced
  const [sheet, setSheet] = useState(false);

  useLayoutEffect(() => {
    function place() {
      if (window.innerWidth <= NARROW) {
        setSheet(true);
        setPos(null);
        return;
      }
      setSheet(false);
      const a = anchorRef?.current?.getBoundingClientRect();
      const p = popRef.current?.getBoundingClientRect();
      if (!a) return;
      const pw = p?.width || 280;
      const ph = p?.height || 200;
      let left = Math.min(a.left, window.innerWidth - pw - EDGE);
      left = Math.max(EDGE, left);
      let top = a.bottom + GAP;
      if (top + ph > window.innerHeight - EDGE && a.top - GAP - ph > EDGE) {
        top = a.top - GAP - ph; // not enough room below → flip above
      }
      setPos({ top, left });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchorRef]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="pop-backdrop" onMouseDown={onClose}>
      <div
        ref={popRef}
        className={sheet ? "pop pop--sheet" : "pop"}
        style={sheet ? undefined : { top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {title && <div className="pop-title">{title}</div>}
        {children}
      </div>
    </div>
  );
}
