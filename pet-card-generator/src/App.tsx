import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPageSimple from './pages/LandingPageSimple'
import UploadPageSimple from './pages/UploadPageSimple'

function App() {
  return (
    <Router>
      <div className="App">
        <main>
          <Routes>
            <Route path="/" element={<LandingPageSimple />} />
            <Route path="/upload" element={<UploadPageSimple />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App