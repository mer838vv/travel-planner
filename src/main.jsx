import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// HashRouter, не BrowserRouter: приложение раздаётся статикой (GitHub Pages),
// где нет сервера, умеющего отдать index.html на произвольный путь — с
// BrowserRouter перезагрузка страницы поездки вернула бы 404.
import { HashRouter } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import './leafletIconFix'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
