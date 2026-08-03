// LifeOS — Food → DELETE a recipe, the confirm (Piece 7). A quiet broadsheet page-takeover (scrim +
// hairline panel, no box/shadow/rounded), NOT a browser confirm(). Two states:
//   • blocked — a cook is running for this recipe; deleting would destroy the live session, so we
//     refuse and point at finishing/abandoning first. One way out.
//   • confirm — names the recipe and says plainly what survives (the nutrition log is untouched),
//     so the delete is confident, not nervous. Terracotta lands ONLY on the destructive action.

export default function DeleteConfirm({ title, blocked, deleting, onCancel, onConfirm }) {
  const name = title || "this recipe";
  return (
    <div className="iv-del-scrim" role="dialog" aria-modal="true">
      <div className="iv-del-panel">
        {blocked ? (
          <>
            <p className="iv-del-msg">“{name}” is cooking right now.</p>
            <p className="iv-del-note">You can’t delete a recipe mid-cook. Finish or abandon the cook first, then delete it.</p>
            <div className="iv-del-foot">
              <button type="button" className="iv-del-keep" onClick={onCancel}>Keep it</button>
            </div>
          </>
        ) : (
          <>
            <p className="iv-del-msg">Delete “{name}”?</p>
            <p className="iv-del-note">
              This removes the recipe, its steps, its ingredients and its cook history — for good.
              Your nutrition log is untouched: every logged meal and every day, week and month total
              stays exactly as it is. Only the link back to this recipe is cleared.
            </p>
            <div className="iv-del-foot">
              <button type="button" className="iv-del-keep" onClick={onCancel} disabled={deleting}>Keep it</button>
              <button type="button" className="iv-del-go" onClick={onConfirm} disabled={deleting}>{deleting ? "Deleting…" : "Delete recipe"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
