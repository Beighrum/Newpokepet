import React from 'react'

const GalleryPageBasic = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          Your PokePet Gallery
        </h1>
        <div className="text-center text-white">
          <p className="text-xl mb-8">Your generated PokePet cards will appear here!</p>
          <div className="bg-black/20 rounded-lg p-8 max-w-2xl mx-auto">
            <p className="text-lg">No cards yet...</p>
            <p className="mt-4">Upload your first pet photo to get started!</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GalleryPageBasic