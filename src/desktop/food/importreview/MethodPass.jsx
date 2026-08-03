// LifeOS — Food → import review PASS ② (4b, mock U). A flat numbered step list (no source grouping)
// with the growing step editor, plus the THREE TOTALS bar: what the site claimed · what our steps
// sum to · how long the cook actually runs (the REAL one-pair-of-hands span). Divergence is how a
// bad extraction shows without reading every step. Fit-scale drives the list.

import StepRow from "./StepRow";

const hm = (sec) => { const m = Math.round((sec || 0) / 60); return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`; };

export default function MethodPass({ steps, showOrig, totals, scrollRef, contentRef, onScroll, scale, h, edit = false }) {
  return (
    <div className="iv-pass">
      <div className="iv-bar">
        <div className="iv-vn"><div className="v">{hm(totals.source)}</div><div className="k">site claims</div></div>
        <div className="iv-vn"><div className="v">{hm(totals.work)}</div><div className="k">of work</div></div>
        <div className="iv-vn hot"><div className="v">{hm(totals.span)}</div><div className="k">actual cook</div></div>
        <div className="iv-vn"><div className="v">{steps.length}</div><div className="k">steps</div></div>
      </div>
      <div className="iv-scroll" ref={scrollRef} onScroll={onScroll}>
        <div ref={contentRef} style={{ "--s": scale }}>
          {steps.map((step, i) => (
            <StepRow
              key={i} n={i + 1} step={step} showOrig={showOrig.has(i)} edit={edit}
              onText={(v) => h.onText(i, v)} onDur={(v) => h.onDur(i, v)} onTag={(v) => h.onTag(i, v)}
              onStation={(v) => h.onStation(i, v)} onHold={(v) => h.onHold(i, v)}
              onApprove={() => h.onApprove(i)} onToggleOrig={() => h.onToggleOrig(i)} onDelete={() => h.onDelete(i)}
            />
          ))}
          <button type="button" className="iv-addstep" onClick={h.onAdd}>+ add a step</button>
        </div>
      </div>
    </div>
  );
}
