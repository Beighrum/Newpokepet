import React from 'react'

const UploadPageBasic = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          Upload Your Pet Photo
        </h1>
        <div className="max-w-md mx-auto bg-white rounded-lg p-6">
          <p className="text-center text-gray-600 mb-4">
            Upload a photo of your pet to generate a PokePet card!
          </p>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <p className="text-gray-500">Drag and drop or click to upload</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UploadPageBasic