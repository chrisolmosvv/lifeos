const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'health', label: 'Health' },
  { id: 'capture' },
  { id: 'food', label: 'Food' },
  { id: 'more', label: 'More' },
]

export default function MobileTabBar({ activeTab, onSelect }) {
  return (
    <nav className="m-tabbar">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={
            tab.id === 'capture'
              ? 'm-tab m-tab--capture'
              : `m-tab${tab.id === activeTab ? ' m-tab--active' : ''}`
          }
          onClick={() => onSelect(tab.id)}
        >
          {tab.id === 'capture'
            ? <span className="m-capture-glyph">+</span>
            : tab.label}
        </button>
      ))}
    </nav>
  )
}
