import { Routes, Route } from 'react-router-dom'
import TripList from './pages/TripList'
import TripDetail from './pages/TripDetail'
import Backdrop from './components/Backdrop'
import './App.css'

export default function App() {
  return (
    <>
      <Backdrop />
      <Routes>
        <Route path="/" element={<TripList />} />
        <Route path="/trip/:id" element={<TripDetail />} />
      </Routes>
    </>
  )
}
