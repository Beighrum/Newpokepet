import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const UploadPageSimple = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = () => {
    alert('Card generation would happen here! This is a demo.');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Navigation Header */}
      <header style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button 
              onClick={() => navigate('/')}
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#1f2937',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'color 0.2s'
              }}
            >
              🐾 Pet Cards
            </button>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              Welcome, Guest
            </div>
          </div>
        </div>
      </header>

      <div style={{ padding: '32px 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
              Generate Pet Trading Card
            </h1>
            <p style={{ fontSize: '18px', color: '#6b7280' }}>
              Transform your pet photos into unique collectible trading cards
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', maxWidth: '1000px', margin: '0 auto' }}>
            {/* Upload Section */}
            <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📤 Upload Pet Photo
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '16px' }}>
                Select or drag and drop a photo of your pet to get started
              </p>

              <div style={{ 
                border: '2px dashed #d1d5db', 
                borderRadius: '8px', 
                padding: '32px', 
                textAlign: 'center',
                position: 'relative',
                transition: 'border-color 0.2s'
              }}>
                {previewUrl ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      style={{ maxWidth: '100%', maxHeight: '256px', margin: '0 auto', borderRadius: '8px' }}
                    />
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      style={{
                        color: '#dc2626',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Remove Image
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ fontSize: '64px' }}>📷</div>
                    <div>
                      <p style={{ fontSize: '18px', fontWeight: '500', color: '#1f2937', margin: '0 0 4px 0' }}>
                        Drop your pet photo here
                      </p>
                      <p style={{ color: '#6b7280', margin: 0 }}>or click to browse</p>
                    </div>
                  </div>
                )}
                
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer'
                  }}
                />
              </div>

              {selectedFile && (
                <div style={{ marginTop: '16px', padding: '12px', background: '#f0fdf4', borderRadius: '8px' }}>
                  <p style={{ fontSize: '14px', color: '#166534', margin: 0 }}>
                    ✅ {selectedFile.name} selected
                  </p>
                </div>
              )}
            </div>

            {/* Pet Details Section */}
            <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🐾 Pet Details
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                    Pet Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your pet's name"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                    Pet Type
                  </label>
                  <select style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    background: 'white'
                  }}>
                    <option value="">Select pet type</option>
                    <option value="dog">Dog</option>
                    <option value="cat">Cat</option>
                    <option value="bird">Bird</option>
                    <option value="rabbit">Rabbit</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                    Description (Optional)
                  </label>
                  <textarea
                    placeholder="Tell us about your pet's personality..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={!selectedFile}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: '600',
                    border: 'none',
                    cursor: selectedFile ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                    background: selectedFile ? '#2563eb' : '#d1d5db',
                    color: selectedFile ? 'white' : '#6b7280'
                  }}
                >
                  {selectedFile ? '✨ Generate Pet Card' : 'Please select an image first'}
                </button>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div style={{ 
            marginTop: '32px', 
            background: '#eff6ff', 
            borderRadius: '8px', 
            padding: '24px',
            maxWidth: '1000px',
            margin: '32px auto 0'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1e40af', marginBottom: '8px' }}>
              How it works:
            </h3>
            <ol style={{ paddingLeft: '20px', color: '#1e40af', lineHeight: '1.6' }}>
              <li>Upload a clear photo of your pet</li>
              <li>Fill in your pet's details</li>
              <li>Click generate to create your unique trading card</li>
              <li>Download and share your pet card with friends!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPageSimple;