// DoneCookCard (session-surfacing C) — a calm hairline card shown on the recipe page when this recipe
// has a cook_session with status='done' + dismissed=false (P7 wrote the 'done' status). "Log it" opens
// the staging sheet; "Dismiss" sets dismissed=true (the existing column) and never comes back on its
// own. Read + a dismiss write only — no new write path.
export default function DoneCookCard({ onLog, onDismiss }) {
  return (
    <div className="dcc">
      <span className="dcc-text">You finished cooking this.</span>
      <div className="dcc-actions">
        <button type="button" className="dcc-log" onClick={onLog}>Log it</button>
        <button type="button" className="dcc-dismiss" onClick={onDismiss}>Dismiss</button>
      </div>
    </div>
  );
}
