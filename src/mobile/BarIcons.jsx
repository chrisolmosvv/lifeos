// Woodcut line icons for the bottom-bar tabs. Hand-rolled inline SVGs.
// Style: 2px stroke, butt caps, miter joins, filled solids where noted.
// All colour via currentColor — inherits the tab's active/inactive state.

const S = { display: 'block' }

// Today — almanac sun: filled centre disc + 8 short rays
export function IconSun() {
  return (
    <svg width="28" height="28" viewBox="0 0 20 20" style={S} aria-hidden="true">
      <circle cx="10" cy="10" r="4" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="butt">
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="10" y1="16" x2="10" y2="19" />
        <line x1="1" y1="10" x2="4" y2="10" />
        <line x1="16" y1="10" x2="19" y2="10" />
        <line x1="3.46" y1="3.46" x2="5.59" y2="5.59" />
        <line x1="14.41" y1="14.41" x2="16.54" y2="16.54" />
        <line x1="3.46" y1="16.54" x2="5.59" y2="14.41" />
        <line x1="14.41" y1="5.59" x2="16.54" y2="3.46" />
      </g>
    </svg>
  )
}

// Health — ECG / pulse line: flat line with one up-down-up spike
export function IconPulse() {
  return (
    <svg width="28" height="28" viewBox="0 0 20 20" style={S} aria-hidden="true">
      <polyline
        points="1,10 6,10 8,4 10,16 12,4 14,10 19,10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
    </svg>
  )
}

// Food — fork: 3 tines, crossbar, neck, handle
export function IconFork() {
  return (
    <svg width="28" height="28" viewBox="0 0 20 20" style={S} aria-hidden="true">
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" fill="none">
        <line x1="6" y1="2" x2="6" y2="8" />
        <line x1="10" y1="2" x2="10" y2="8" />
        <line x1="14" y1="2" x2="14" y2="8" />
        <line x1="5" y1="8" x2="15" y2="8" />
        <line x1="10" y1="8" x2="10" y2="18" />
      </g>
    </svg>
  )
}

// More — ellipsis: three filled dots in a horizontal row
export function IconMore() {
  return (
    <svg width="28" height="28" viewBox="0 0 20 20" style={S} aria-hidden="true">
      <circle cx="4" cy="10" r="2" fill="currentColor" />
      <circle cx="10" cy="10" r="2" fill="currentColor" />
      <circle cx="16" cy="10" r="2" fill="currentColor" />
    </svg>
  )
}
