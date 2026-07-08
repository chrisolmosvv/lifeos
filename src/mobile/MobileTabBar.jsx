import { IconSun, IconPulse, IconFork, IconMore } from './BarIcons'

const TABS = [
  { id: 'today', label: 'Today', Icon: IconSun },
  { id: 'health', label: 'Health', Icon: IconPulse },
  { id: 'capture' },
  { id: 'food', label: 'Food', Icon: IconFork },
  { id: 'more', label: 'More', Icon: IconMore },
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
            : <span className="m-tab-icon"><tab.Icon /></span>}
        </button>
      ))}
    </nav>
  )
}
