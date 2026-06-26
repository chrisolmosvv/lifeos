// LifeOS — Health Hub: a minimal "coming soon" stub destination.
//
// Reachable + back-navigable placeholder for the Sleep and Body faces; S6/S7 will
// replace each with the real front page. Title + a calm "coming soon" line + a
// back link to the hub. Intentionally bare.

export default function HealthStub({ title, onBack }) {
  return (
    <div className="hub-stub">
      <button type="button" className="hub-back" onClick={onBack}>
        ← Health
      </button>
      <h1 className="hub-stub-title">{title}</h1>
      <p className="hub-stub-soon">Coming soon.</p>
    </div>
  );
}
