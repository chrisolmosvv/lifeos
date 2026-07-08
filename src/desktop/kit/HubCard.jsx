// LifeOS — Health Hub: the generic CARD SHELL (presentation only).
//
// Every hub card (Sleep / Body / Gym) is the SAME shell — a calm, whole-card tap
// target with a quiet relative-time label, a serif headline slot, and free-form
// children below. Sleep/Body/Gym look identical (design law): only the click
// destination differs. Terracotta appears only on hover (a tap affordance) and on
// trend marks the cards pass into `children`; static text stays ink.

export default function HubCard({ label, headline, onClick, children }) {
  return (
    <button type="button" className="hub-card" onClick={onClick}>
      {label ? <div className="hub-card-label">{label}</div> : null}
      {headline ? <div className="hub-card-headline">{headline}</div> : null}
      {children}
    </button>
  );
}
