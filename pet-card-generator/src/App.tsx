import React, { useEffect } from 'react'
import './App.css'
import { initializeSentry } from './config/sentry'
import { securityEventIntegration } from './services/securityEventIntegration'
import SecurityErrorBoundary from './components/SecurityErrorBoundary'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import LandingPage from './pages/LandingPage'
import UploadPage from './pages/UploadPage'
import EvolutionPage from './pages/EvolutionPage'
import ProfilePage from './pages/ProfilePage'
// Initialize Firebase
import './config/firebase'

function App() {
  useEffect(() => {
    // Initialize Sentry with enhanced security monitoring
    initializeSentry();
    
    // Initialize security event integration
    securityEventIntegration.initialize();
    
    // Set up periodic security trend monitoring (every 5 minutes)
    const trendMonitoringInterval = setInterval(() => {
      securityEventIntegration.monitorSecurityTrends();
    }, 5 * 60 * 1000);

    // Set up periodic dashboard metrics generation (every 10 minutes)
    const metricsInterval = setInterval(() => {
      securityEventIntegration.generateDashboardMetrics();
    }, 10 * 60 * 1000);

    return () => {
      clearInterval(trendMonitoringInterval);
      clearInterval(metricsInterval);
    };
  }, []);

  return (
    <SecurityErrorBoundary>
      <Router>
        <div className="App min-h-screen bg-gray-50">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/evolution" element={<EvolutionPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </SecurityErrorBoundary>
  )
}

export default App