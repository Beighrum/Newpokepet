import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPageNew from './pages/LandingPageNew'
import UploadPageNew from './pages/UploadPageNew'
import GalleryPageNew from './pages/GalleryPageNew'
import EvolutionPageNew from './pages/EvolutionPageNew.tsx'
import BattlePageNew from './pages/BattlePageNew'
import ShowcasePageNew from './pages/ShowcasePageNew'
import ProfilePageNew from './pages/ProfilePageNew'
import NavbarNew from './components/NavbarNew'

function App() {
  return (
    <Router>
      <div className="App">
        <NavbarNew />
        <main>
          <Routes>
            <Route path="/" element={<LandingPageNew />} />
            <Route path="/upload" element={<UploadPageNew />} />
            <Route path="/gallery" element={<GalleryPageNew />} />
            <Route path="/evolution" element={<EvolutionPageNew />} />
            <Route path="/battle" element={<BattlePageNew />} />
            <Route path="/showcase" element={<ShowcasePageNew />} />
            <Route path="/profile" element={<ProfilePageNew />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App