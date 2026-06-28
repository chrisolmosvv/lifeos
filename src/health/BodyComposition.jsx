import { fmtFull } from "./bodyFormat";
import { GoalBar, GoalWaiting, GoalPrompt } from "./GoalBar";

// BodyComposition — the fat-vs-lean bar for the Composition group, plus the goal bars
// (weight AND, since S9, body_fat). Pure presentation: it draws the numbers the calc
// layer already worked out (composition() + goalProgress()) — no maths here beyond
// turning kg into bar widths.
//
// `goals` = [{ metric, goalProg, hasGoal, promptText, onEdit }, …] — one entry per
// goal-able composition metric (weight, body_fat). Each renders the shared bar (goal
// + readings), a "waiting for data" line (goal, no readings), or the set-a-goal
// prompt (no goal). Lean is absent here on purpose — it stays trend-only (no goal).
//
// The bar NEVER forces fat+lean to equal scale weight:
//   mode 'remainder' — fat | lean | a small UNLABELLED remainder (bone/water).
//   mode 'ratio'     — fat+lean overran scale weight, so show them as a proportion
//                      of each other (no negative segment), with a quiet note.
//   mode 'none'      — missing fat or lean → can't split; say so plainly.

function Bar({ segments }) {
  return (
    <div className="body-comp-bar" role="img" aria-label="body composition">
      {segments.map((s) => (
        <span
          key={s.key}
          className={`body-comp-seg body-comp-${s.key}`}
          style={{ width: `${s.pct}%` }}
          title={s.title}
        />
      ))}
    </div>
  );
}

export default function BodyComposition({ comp, goals = [] }) {
  let bar = null;
  if (comp.mode === "none") {
    bar = <p className="body-comp-empty">Not enough readings yet to split fat and lean.</p>;
  } else if (comp.mode === "remainder") {
    const w = comp.weightKg;
    bar = (
      <Bar
        segments={[
          { key: "fat", pct: (comp.fatMassKg / w) * 100, title: `Fat ${fmtFull("lean_mass", comp.fatMassKg)}` },
          { key: "lean", pct: (comp.leanKg / w) * 100, title: `Lean ${fmtFull("lean_mass", comp.leanKg)}` },
          { key: "rest", pct: (comp.remainderKg / w) * 100, title: "Other (bone, water)" },
        ]}
      />
    );
  } else {
    // ratio: split fat vs lean against their own sum (scale weight not fully accounted)
    const sum = comp.fatMassKg + comp.leanKg;
    bar = (
      <>
        <Bar
          segments={[
            { key: "fat", pct: (comp.fatMassKg / sum) * 100, title: `Fat ${fmtFull("lean_mass", comp.fatMassKg)}` },
            { key: "lean", pct: (comp.leanKg / sum) * 100, title: `Lean ${fmtFull("lean_mass", comp.leanKg)}` },
          ]}
        />
        <p className="body-comp-note">fat + lean ≈ scale weight (shown as a ratio)</p>
      </>
    );
  }

  return (
    <div className="body-composition">
      {bar}
      {comp.mode !== "none" && (
        <div className="body-comp-legend">
          <span>
            <span className="body-comp-key body-comp-fat" /> Fat {fmtFull("lean_mass", comp.fatMassKg)}
            {Number.isFinite(comp.fatPct) ? ` (${comp.fatPct.toFixed(1)}%)` : ""}
          </span>
          <span>
            <span className="body-comp-key body-comp-lean" /> Lean {fmtFull("lean_mass", comp.leanKg)}
          </span>
        </div>
      )}

      {goals.map(({ metric, goalProg, hasGoal, promptText, onEdit }) =>
        hasGoal && goalProg ? (
          <GoalBar key={metric} metric={metric} goalProg={goalProg} onEdit={onEdit} />
        ) : hasGoal ? (
          <GoalWaiting key={metric} metric={metric} onEdit={onEdit} />
        ) : (
          <GoalPrompt key={metric} text={promptText} onEdit={onEdit} />
        ),
      )}
    </div>
  );
}
