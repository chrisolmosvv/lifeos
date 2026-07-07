// EditorSteps — the steps column of RecipeEditor: step text editing + the confirm surface.
// Shows the plan: each step with its activity tag, dependency tokens, and linked ingredient tags.
// The owner can reassign ingredient→step links and lightly edit dependencies (sequential / parallel / merge).

const TAG_LABEL = { hands_on: "Hands-on", hands_free: "Hands-free", active_heat: "Active heat" };

function shortName(raw) { return (raw || "").slice(0, 22) + ((raw || "").length > 22 ? "…" : ""); }

export default function EditorSteps({ steps, ingredients, onEditText, onMove, onRemove, onAdd, onSetDeps, onSetIngStep }) {
  const allIngs = (ingredients || []).map((ing, i) => ({ ...ing, _idx: i }));
  const linkedTo = (stepKey) => allIngs.filter((ing) => ing.step_position === stepKey);
  const generalIngs = allIngs.filter((ing) => ing.step_position == null);
  const hasStructure = steps.some((s) => s.tag || (Array.isArray(s.depends_on) && s.depends_on.length));

  return (
    <div className="red-col">
      <h3 className="red-h">Steps</h3>
      <ol className="red-steps">
        {steps.map((s, i) => {
          const linked = linkedTo(s._key);
          const depKeys = Array.isArray(s.depends_on) ? s.depends_on : [];
          const depIndices = depKeys.map((k) => steps.findIndex((x) => x._key === k)).filter((x) => x >= 0);

          return (
            <li key={s._key ?? i} className="red-step red-step--plan">
              <div className="red-step-head">
                <span className="red-step-num tnum">{i + 1}</span>
                {s.tag && <span className="red-step-tag">{TAG_LABEL[s.tag] || s.tag}</span>}
                <span className="red-step-spacer" />
                <div className="red-step-ctl">
                  <button type="button" onClick={() => onMove(i, -1)} aria-label="Move up">↑</button>
                  <button type="button" onClick={() => onMove(i, 1)} aria-label="Move down">↓</button>
                  <button type="button" onClick={() => onRemove(i)} aria-label="Remove">×</button>
                </div>
              </div>

              <textarea rows={2} value={typeof s.text === "string" ? s.text : ""} placeholder={`Step ${i + 1}`}
                onChange={(e) => onEditText(i, e.target.value)} />

              {/* ── Dependency row: when does this step start? ─────────────── */}
              {hasStructure && (
                <div className="red-step-after">
                  <span className="red-after-label">starts</span>
                  {depIndices.length === 0 && <span className="red-after-val">at the start</span>}
                  {depIndices.map((di) => (
                    <span key={steps[di]._key} className="red-dep-token">
                      after {di + 1}
                      <button type="button" aria-label="Remove dependency"
                        onClick={() => onSetDeps(i, depKeys.filter((k) => k !== steps[di]._key) || null)}>×</button>
                    </span>
                  ))}
                  <select className="red-dep-add" value=""
                    onChange={(e) => {
                      const v = e.target.value; e.target.selectedIndex = 0;
                      if (!v) return;
                      if (v === "_start") { onSetDeps(i, null); return; }
                      const k = Number(v);
                      const cur = depKeys.filter((dk) => dk !== k);
                      onSetDeps(i, [...cur, k]);
                    }}>
                    <option value="">+</option>
                    <option value="_start">at the start</option>
                    {steps.map((x, j) => j < i ? (
                      <option key={x._key} value={x._key}>after {j + 1}</option>
                    ) : null)}
                  </select>
                </div>
              )}

              {/* ── Linked ingredient tags ─────────────────────────────────── */}
              {linked.length > 0 && (
                <div className="red-step-ings">
                  {linked.map((ing) => (
                    <span key={ing._idx} className="red-ing-token">
                      {shortName(ing.raw_text)}
                      <button type="button" aria-label="Unlink ingredient"
                        onClick={() => onSetIngStep(ing._idx, null)}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <button type="button" className="red-add" onClick={onAdd}>+ step</button>

      {/* ── General ingredients (not linked to any step) ──────────────── */}
      {generalIngs.length > 0 && (
        <div className="red-general">
          <span className="red-general-h">Used throughout</span>
          <div className="red-general-list">
            {generalIngs.map((ing) => (
              <span key={ing._idx} className="red-ing-token red-ing-token--general">
                {shortName(ing.raw_text)}
                <select className="red-ing-assign" value=""
                  onChange={(e) => { if (e.target.value) onSetIngStep(ing._idx, Number(e.target.value)); e.target.selectedIndex = 0; }}>
                  <option value="">→</option>
                  {steps.map((x, j) => <option key={x._key} value={x._key}>step {j + 1}</option>)}
                </select>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
