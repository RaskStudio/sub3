import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PartyList from './components/PartyList' // Nu "Fester" siden
import PartyPage from './components/PartyPage'
import HallOfFame from './components/HallOfFame' // Nu "Forsiden"
import BottomNav from './components/BottomNav'

function App() {
  return (
    <BrowserRouter>
      <div className="pb-24">
        <Routes>
          <Route path="/" element={<HallOfFame />} />
          <Route path="/fester" element={<PartyList />} />
          <Route path="/fest/:id" element={<PartyPage />} />
        </Routes>
      </div>
      <BottomNav />
    </BrowserRouter>
  )
}

export default App