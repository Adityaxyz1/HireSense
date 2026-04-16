import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

import { ThemeProvider } from './contexts/ThemeContext.jsx'
import { MouseProvider } from './contexts/MouseContext.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <MouseProvider>
          <App />
        </MouseProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
