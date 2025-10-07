import React, { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'

const ShowcasePage = () => {
  const [featuredCards, setFeaturedCards] = useState([])

  useEffect(() => {
    // Fetch featured/public cards
    // This will show the best PokePets from all users
    setFeaturedCards([])
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-teal-900 to-blue-900">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          PokePet Showcase
        </h1>
        <div className="text-center text-white">
          <p className="text-xl mb-8">Discover amazing PokePets from trainers around the world!</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredCards.length === 0 ? (
              <div className="col-span-full bg-black/20 rounded-lg p-8">
                <p className="text-lg">No featured PokePets yet...</p>
                <p className="mt-4">Be the first to create and showcase your PokePet!</p>
              </div>
            ) : (
              featuredCards.map((card, index) => (
                <div key={index} className="bg-black/20 rounded-lg p-4">
                  {/* Card display component will go here */}
                  <p>Featured PokePet #{index + 1}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShowcasePage