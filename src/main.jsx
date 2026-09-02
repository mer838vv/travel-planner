import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// HashRouter, не BrowserRouter: приложение раздаётся статикой (GitHub Pages),
// где нет сервера, умеющего отдать index.html на произвольный путь — с
// BrowserRouter перезагрузка страницы поездки вернула бы 404.
import { HashRouter } from 'react-router-dom'
import './pwa'
import './index.css'
import App from './App.jsx'
import { ensureFlorenceWalkingDemo } from './demoTrip.js'

function renderApp() {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </StrictMode>,
  )
}

ensureFlorenceWalkingDemo()
  .catch((error) => console.error('Не удалось добавить контрольную поездку', error))
  .finally(renderApp)
