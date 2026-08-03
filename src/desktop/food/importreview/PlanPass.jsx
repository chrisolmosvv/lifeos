// LifeOS — Food → import review PASS ③ (4c, mock U). The plan drawn out — the SAME schedule the cook
// page runs (one pair of hands), via the reused CookBand shown larger. A drag re-parents a step
// ("5 now waits for 3"); the scheduler re-solves placement (it lands as early as its constraints
// allow — the owner sets constraints, not positions). The PLAIN-WORDS fallback beneath is fully
// functional on its own. A save-gate checklist explains a blocked Save.

import CookBand from "../cookplan/CookBand";

const p2 = (n) => String(n).padStart(2, "0");
const short = (t) => (t || "").split(/\s+/).slice(0, 7).join(" ");

function Check({ ok, title, detail }) {
  return <div className={`iv-ck${ok ? " pass" : ""}`}><i /><div className="t"><b>{title}</b> — {detail}</div></div>;
}

export default function PlanPass({ steps, schedule, finish, gate, ingCount, onReparent, onSetDeps, scrollRef, contentRef, onScroll, scale }) {
  const timerByRef = {};
  return (
    <div className="iv-pass">
      <div className="iv-planband">
        <CookBand steps={steps} schedule={schedule} finish={finish} timerByRef={timerByRef} cookStartMs={null} nowMs={0} onReparent={onReparent} />
        <div className="iv-axis"><span>start</span><span>drag a block to change what it waits for</span><span>served</span></div>
      </div>

      <div className="iv-scroll" ref={scrollRef} onScroll={onScroll}>
        <div ref={contentRef} style={{ "--s": scale }}>
          {steps.map((s, i) => {
            const deps = Array.isArray(s.depends_on) ? s.depends_on : [];
            const opts = steps.map((_, j) => j).filter((j) => j !== i && !deps.includes(j));
            return (
              <div key={i} className="iv-dep">
                <span className="iv-dep-n">{p2(i + 1)}</span>
                <span className="iv-dep-tx">{short(s.text) || "(step)"}</span>
                <span className="iv-dep-w">
                  waits for{" "}
                  {deps.length === 0 ? <em>nothing</em> : deps.map((d) => (
                    <button key={d} type="button" className="iv-dep-chip" onClick={() => onSetDeps(i, deps.filter((x) => x !== d))}>{p2(d + 1)} ×</button>
                  ))}
                  {opts.length > 0 && (
                    <select className="iv-dep-add" value="" onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) onSetDeps(i, [...deps, v]); }}>
                      <option value="">+ add</option>
                      {opts.map((j) => <option key={j} value={j}>{p2(j + 1)}</option>)}
                    </select>
                  )}
                </span>
              </div>
            );
          })}
          <div className="iv-checklist">
            {/* Piece 8: the essentials a hand-written (blank) recipe can lack — shown only when missing,
                so import/edit (which always have them) never see these rows. */}
            {gate.hasTitle === false && <Check ok={false} title="Needs a title" detail="name the recipe up top" />}
            {gate.hasIngredients === false && <Check ok={false} title="Needs an ingredient" detail="add at least one" />}
            {gate.hasSteps === false && <Check ok={false} title="Needs a method" detail="add at least one step" />}
            <Check ok={gate.ingredientsResolved} title="Every ingredient resolved" detail={gate.ingredientsResolved ? `all ${ingCount} have macros` : `${gate.ingUnresolved} still to resolve`} />
            <Check ok={gate.stepsTimed} title="Every step timed" detail={gate.stepsTimed ? `all ${steps.length}` : `${gate.stepsUntimed} without a duration`} />
            <Check ok={gate.planValid} title="Plan is valid" detail={gate.planValid ? "no impossible order" : "a circular dependency — remove one link"} />
            {gate.warnFlags > 0 && <div className="iv-ck iv-warn"><i /><div className="t"><b>{gate.warnFlags} guess{gate.warnFlags === 1 ? "" : "es"} unconfirmed</b> — you can still save</div></div>}
          </div>
        </div>
      </div>
    </div>
  );
}
