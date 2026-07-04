// BroadsheetTiming (Piece 4 v2) — calm text, not a chart. Shows total time-to-table + the longest
// step (the common sequential case). For genuinely parallel recipes (overlapping time ranges), adds
// a "While X, do Y" headline above the total. Compute-on-read from cookSchedule. No chart, no lanes,
// no ruler, no blocks. cookLanes.js + cookSchedule.js stay untouched (reused for detection).
import { useMemo } from "react";
import { cookSchedule } from "./cookSchedule";
import { parseDuration } from "./cookTimers";
import "./broadsheet.css";

function fmtTime(secs) {
  if (!secs || secs <= 0) return "";
  const h = Math.floor(secs / 3600);
  const m = Math.round((secs % 3600) / 60);
  if (h > 0 && m > 0) return `${h} hr ${m} min`;
  if (h > 0) return `${h} hr`;
  return `${m} min`;
}

// Find steps whose time ranges overlap with at least one other step
function findOverlaps(schedule) {
  const concurrent = new Set();
  for (let i = 0; i < schedule.length; i++) {
    for (let j = i + 1; j < schedule.length; j++) {
      const a = schedule[i], b = schedule[j];
      if (a.startOffset < b.endOffset && b.startOffset < a.endOffset) {
        concurrent.add(a.index);
        concurrent.add(b.index);
      }
    }
  }
  return concurrent;
}

// Try to generate "While X, do Y" — only if it reads cleanly; else fallback
function whileHeadline(steps, schedule, concurrent) {
  if (concurrent.size < 2) return null;
  // Among concurrent steps, find the longest (X) and the other(s) (Y)
  const sorted = [...concurrent].map((i) => schedule.find((s) => s.index === i)).filter(Boolean).sort((a, b) => b.duration - a.duration);
  if (sorted.length < 2) return null;
  const x = sorted[0]; // longest overlapping step
  const y = sorted[1]; // second
  const xText = typeof steps[x.index]?.text === "string" ? steps[x.index].text : "";
  const yText = typeof steps[y.index]?.text === "string" ? steps[y.index].text : "";
  // Extract a short verb phrase (first ~6 words)
  const shortPhrase = (t) => t.split(/\s+/).slice(0, 6).join(" ").replace(/[.,;:]+$/, "").toLowerCase();
  const xLabel = shortPhrase(xText);
  const yLabel = shortPhrase(yText);
  // Safety: if either label is too short, fragmented, or we have 3+ overlapping steps, fall back
  if (xLabel.length < 5 || yLabel.length < 5) return `${concurrent.size} threads run in parallel`;
  if (concurrent.size > 3) return `${concurrent.size} threads run in parallel`;
  return null; // fall back to the plain line — generating clean English from fragments is risky
}

export default function BroadsheetTiming({ steps }) {
  const { schedule, finish, concurrent, longest } = useMemo(() => {
    const input = (steps || []).map((s, i) => ({
      index: i,
      durationSeconds: s.timer_seconds ?? parseDuration(typeof s.text === "string" ? s.text : ""),
      deps: s.depends_on || undefined,
    }));
    const sched = cookSchedule(input);
    const concurrent = findOverlaps(sched.schedule);
    // Find the longest step
    let longest = null;
    for (const s of sched.schedule) {
      if (!longest || s.duration > longest.duration) longest = s;
    }
    return { ...sched, concurrent, longest };
  }, [steps]);

  const isParallel = concurrent.size >= 2;
  const headline = isParallel ? (whileHeadline(steps, schedule, concurrent) || "2 threads run in parallel") : null;
  const longestLabel = longest && longest.duration > 0
    ? (typeof steps[longest.index]?.text === "string" ? steps[longest.index].text.split(/\s+/).slice(0, 5).join(" ").replace(/[.,;:]+$/, "").toLowerCase() : "")
    : "";

  return (
    <div className="bs-col bs-col-timing">
      <div className="bs-col-head">
        <span className="bs-col-title">Timing</span>
      </div>

      <div className="bs-timing-text">
        {isParallel && headline && <p className="bs-timing-headline">{headline}</p>}
        {finish > 0 && <p className="bs-timing-ready">Ready in ~{fmtTime(finish)}</p>}
        {longest && longest.duration > 0 && longestLabel && (
          <p className="bs-timing-longest">mostly a {fmtTime(longest.duration)} {longestLabel}</p>
        )}
      </div>
    </div>
  );
}

// Export concurrent detection for BroadsheetSteps inline markers
export { findOverlaps };
