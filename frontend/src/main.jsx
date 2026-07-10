import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from "./App.jsx";
import { bootstrapTheme } from "./theme/theme";

// Apply the cached (or default) palette before first paint to avoid a flash.
bootstrapTheme();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
