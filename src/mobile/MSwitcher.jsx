// Built-ahead section switcher — currently unused. Renders nothing when given
// 0–1 items, so tabs without sub-views simply don't show it. The first
// multi-view mobile module will wire this up.

export default function MSwitcher({ items = [], active, onSelect }) {
  if (items.length <= 1) return null

  return (
    <div className="m-switcher" role="tablist">
      {items.map((item) => (
        <button
          key={item.id}
          role="tab"
          aria-selected={item.id === active}
          className={`m-sw-tab${item.id === active ? ' m-sw-tab--active' : ''}`}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
