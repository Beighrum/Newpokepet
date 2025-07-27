import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPageSimple = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/upload');
  };

  const handleDemo = () => {
    alert('Demo feature coming soon! This will show you how the card generation works.');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f9ff 0%, #f3e8ff 100%)' }}>
      {/* Header */}
      <header style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
              🐾 Pet Cards
            </h2>
            <nav style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <a href="#features" style={{ color: '#6b7280', textDecoration: 'none' }}>Features</a>
              <a href="#pricing" style={{ color: '#6b7280', textDecoration: 'none' }}>Pricing</a>
              <button style={{ 
                background: '#f3f4f6', 
                border: 'none', 
                padding: '8px 16px', 
                borderRadius: '8px',
                cursor: 'pointer'
              }}>
                Sign In
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '64px 16px', textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '72px', 
          fontWeight: 'bold', 
          color: '#1f2937', 
          marginBottom: '24px',
          margin: '0 0 24px 0'
        }}>
          Pet Card Generator
        </h1>
        
        <p style={{ 
          fontSize: '20px', 
          color: '#6b7280', 
          marginBottom: '32px', 
          maxWidth: '800px', 
          margin: '0 auto 32px auto',
          lineHeight: '1.6'
        }}>
          Transform your beloved pets into stunning, collectible trading cards with AI-powered magic.
          Create, collect, and share unique cards with friends!
        </p>
        
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px', 
          alignItems: 'center',
          marginBottom: '64px'
        }}>
          <button 
            onClick={handleGetStarted}
            style={{
              background: '#2563eb',
              color: 'white',
              border: 'none',
              padding: '16px 32px',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = '#1d4ed8'}
            onMouseOut={(e) => e.target.style.background = '#2563eb'}
          >
            Get Started Free
          </button>
          
          <button 
            onClick={handleDemo}
            style={{
              background: 'transparent',
              color: '#374151',
              border: '2px solid #d1d5db',
              padding: '16px 32px',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.target.style.borderColor = '#2563eb';
              e.target.style.color = '#2563eb';
            }}
            onMouseOut={(e) => {
              e.target.style.borderColor = '#d1d5db';
              e.target.style.color = '#374151';
            }}
          >
            Try Demo
          </button>
        </div>

        {/* Features Preview */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '32px', 
          marginTop: '64px' 
        }}>
          <div style={{ 
            background: 'white', 
            padding: '24px', 
            borderRadius: '12px', 
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)' 
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎨</div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', margin: '0 0 8px 0' }}>
              AI-Powered Design
            </h3>
            <p style={{ color: '#6b7280', margin: 0 }}>
              Advanced AI creates unique, beautiful card designs for your pets
            </p>
          </div>
          
          <div style={{ 
            background: 'white', 
            padding: '24px', 
            borderRadius: '12px', 
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)' 
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', margin: '0 0 8px 0' }}>
              Instant Generation
            </h3>
            <p style={{ color: '#6b7280', margin: 0 }}>
              Get your pet cards in seconds with our fast processing
            </p>
          </div>
          
          <div style={{ 
            background: 'white', 
            padding: '24px', 
            borderRadius: '12px', 
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)' 
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏆</div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', margin: '0 0 8px 0' }}>
              Rarity System
            </h3>
            <p style={{ color: '#6b7280', margin: 0 }}>
              Discover rare and legendary variants of your pet cards
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ 
        background: '#1f2937', 
        color: 'white', 
        padding: '32px 0', 
        marginTop: '64px', 
        textAlign: 'center' 
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}>
          <p style={{ margin: 0 }}>© 2024 Pet Card Generator. Made with ❤️ for pet lovers.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPageSimple;