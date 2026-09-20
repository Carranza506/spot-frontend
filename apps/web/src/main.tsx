import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { themeToCssVariables } from '@spot/shared'
import './index.css'
import App from './App.tsx'

for (const [key, value] of Object.entries(themeToCssVariables())) {
  document.documentElement.style.setProperty(key, value)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
