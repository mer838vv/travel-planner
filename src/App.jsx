import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Backdrop from './components/Backdrop'
import './App.css'

const TripList = lazy(() => import('./pages/TripList'))
const TripDetail = lazy(() => import('./pages/TripDetail'))

export default function App() {
  return (
    <>
      <Backdrop />
      <Suspense fallback={<div className="page"><p className="loading-card">Открываю поездки…</p></div>}>
        <Routes>
          <Route path="/" element={<TripList />} />
          <Route path="/trip/:id" element={<TripDetail />} />
        </Routes>
      </Suspense>
    </>
  )
}
