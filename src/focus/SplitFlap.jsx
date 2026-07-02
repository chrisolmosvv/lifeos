import { useEffect, useRef, useState } from "react";

// SplitFlap — the in-focus hero numerals (Mock 1A). Renders the display seconds as
// MM:SS (or H:MM:SS past an hour) in flap "cells": a top/bottom half split by a
// hairline, each digit flipping when it changes (reduced-motion → instant). Pure
// presentation — the value + tone come from the timer engine. `register` tints the
// whole flap: 'focus' (ink) · 'break' (muted) · 'overtime' (terracotta).
export default function SplitFlap({ seconds, register = "focus" }) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  const groups = h > 0 ? [pad(h), pad(m), pad(sec)] : [pad(m), pad(sec)];

  return (
    <div className={"flap flap--" + register} role="timer" aria-label={`${h ? h + "h " : ""}${m}m ${sec}s`}>
      {groups.map((g, gi) => (
        <span key={gi} className="flap-group">
          {gi > 0 && <span className="flap-colon">:</span>}
          {g.split("").map((d, di) => (
            <Cell key={gi + "-" + di} digit={d} />
          ))}
        </span>
      ))}
    </div>
  );
}

// One digit cell that flips when its value changes.
function Cell({ digit }) {
  const [flip, setFlip] = useState(false);
  const prev = useRef(digit);
  useEffect(() => {
    if (prev.current !== digit) {
      prev.current = digit;
      setFlip(true);
      const id = setTimeout(() => setFlip(false), 320);
      return () => clearTimeout(id);
    }
  }, [digit]);
  return (
    <span className={"flap-cell" + (flip ? " is-flip" : "")}>
      <span className="flap-digit">{digit}</span>
      <span className="flap-seam" aria-hidden="true" />
    </span>
  );
}
