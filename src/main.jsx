import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './spine/theme/theme.css'   // design tokens, applied app-wide
import './mobile/mobile.css'       // m-prefixed rules, harmless to desktop (classes never appear in its DOM)
import './mobile/mobileToday.css'  // Today grid + blocks + now-line (static — dynamic-chunk CSS preload broken in Vite 5 ternary imports)
import './mobile/mobileSheet.css'  // task sheet + task rows + status cycle
import './mobile/mobileHealth.css' // Health screens (static — CSS-load rule)
import './mobile/mobileHealthGym.css' // Gym face + session report
import './mobile/mobileFood.css'     // Food screens (static — CSS-load rule)
import './mobile/mobileCook.css'     // Cook companion

// Viewport-gated front door: read once at boot, load exactly one tree.
// Portrait iPhone (390–430px) always gets mobile; desktop always gets desktop.
// Decision 2: locked at load — no resize listener swaps trees.
const isMobile = window.matchMedia('(max-width: 860px)').matches;

(isMobile ? import('./mobile/App.jsx') : import('./desktop/App.jsx'))
  .then(({ default: App }) => {
    createRoot(document.getElementById('root'))
      .render(<StrictMode><App /></StrictMode>);
  })
  .catch((err) => {
    console.error('Tree load failed:', err);
    const r = document.getElementById('root');
    if (r) r.textContent = 'Load error: ' + (err && err.message ? err.message : err);
  });
