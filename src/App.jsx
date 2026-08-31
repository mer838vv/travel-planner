import { Routes, Route } from 'react-router-dom'
import TripList from './pages/TripList'
import TripDetail from './pages/TripDetail'
import './App.css'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<TripList />} />
      <Route path="/trip/:id" element={<TripDetail />} />
    </Routes>
  )
}
