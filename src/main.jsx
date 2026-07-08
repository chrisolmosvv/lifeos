import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './desktop/theme.css' // base fonts + paper/ink, applied app-wide
import App from './desktop/App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
