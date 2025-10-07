import React, { useState, useEffect } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '../lib/firebase'
import Navbar from '../components/Navbar'
import { PetGalleryPreview } from '../components/pet-gallery-preview'

const GalleryPage = () => {
  const [user, loading] = useAuthState(auth)
  const [cards, setCards] = useState([])

  useEffect(() => {
    if (user) {
      // Fetch user's cards from Firebase
      // This will be implemented with the backend
      setCards([])
    }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          Your PokePet Gallery
        </h1>
        <PetGalleryPreview cards={cards} showSamples={false} />
      </div>
    </div>
  )
}

export default GalleryPage