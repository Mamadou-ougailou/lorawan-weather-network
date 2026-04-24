import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { StationsProvider } from './StationsContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StationsProvider>
      <App />
    </StationsProvider>
  </StrictMode>,
)
