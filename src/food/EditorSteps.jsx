// EditorSteps — the steps column of RecipeEditor (extracted for line budget).
// Pure render: receives the step array + handlers, owns no step state.
// Commit 2 adds the remap; Commit 3 adds the confirm surface.

export default function EditorSteps({ steps, onEditText, onMove, onRemove, onAdd }) {
  return (
    <div className="red-col">
      <h3 className="red-h">Steps</h3>
      <ol className="red-steps">
        {steps.map((s, i) => (
          <li key={s._key ?? i} className="red-step">
            <textarea rows={2} value={typeof s.text === "string" ? s.text : ""} placeholder={`Step ${i + 1}`}
              onChange={(e) => onEditText(i, e.target.value)} />
            <div className="red-step-ctl">
              <button type="button" onClick={() => onMove(i, -1)} aria-label="Move up">↑</button>
              <button type="button" onClick={() => onMove(i, 1)} aria-label="Move down">↓</button>
              <button type="button" onClick={() => onRemove(i)} aria-label="Remove">×</button>
            </div>
          </li>
        ))}
      </ol>
      <button type="button" className="red-add" onClick={onAdd}>+ step</button>
    </div>
  );
}
