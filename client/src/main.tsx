import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ThemeProvider } from './context/ThemeContext'
import { AnalysisProvider } from './context/AnalysisContext'
import { InventoryProvider } from './context/InventoryContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AnalysisProvider>
        <InventoryProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </InventoryProvider>
      </AnalysisProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
