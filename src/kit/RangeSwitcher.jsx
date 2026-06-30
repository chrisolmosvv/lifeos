// LifeOS — Health kit: the shared range switcher (V2). A segmented control that sits
// top-right on every Health surface (Sleep/Body/Activity), no title beside it. Pure
// presentation: the caller owns `value` + `onChange`. Active = ink-on-paper, others
// muted, hover hints terracotta (an affordance). One source of truth so all surfaces
// match. ranges = [{ id, label }].
export default function RangeSwitcher({ ranges, value, onChange, ariaLabel = "Range" }) {
  return (
    <div className="range-switch" role="tablist" aria-label={ariaLabel}>
      {ranges.map((r) => (
        <button
          key={r.id}
          type="button"
          role="tab"
          aria-selected={r.id === value}
          className={r.id === value ? "range-tab is-active" : "range-tab"}
          onClick={() => onChange(r.id)}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
