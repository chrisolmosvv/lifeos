import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './spine/theme/theme.css' // base fonts + paper/ink, applied app-wide

// Viewport-gated front door: read once at boot, load exactly one tree.
// Portrait iPhone (390–430px) always gets mobile; desktop always gets desktop.
// Decision 2: locked at load — no resize listener swaps trees.
const isMobile = window.matchMedia('(max-width: 860px)').matches;

(isMobile ? import('./mobile/App.jsx') : import('./desktop/App.jsx'))
  .then(({ default: App }) => {
    createRoot(document.getElementById('root'))
      .render(<StrictMode><App /></StrictMode>);
  });
