import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Upload,
  Sparkles,
  Gem,
  Crown,
  Zap,
  Droplets,
  Flame,
  Mountain,
  Leaf,
  Snowflake,
  Ghost,
  Sword,
  Shield,
  Waves,
  X,
  RefreshCw,
  Info,
} from 'lucide-react'

const pokemonTypes = [
  { id: "water", name: "Water", icon: Droplets, color: "bg-blue-500" },
  { id: "fire", name: "Fire", icon: Flame, color: "bg-red-500" },
  { id: "ground", name: "Ground", icon: Mountain, color: "bg-amber-600" },
  { id: "leaf", name: "Leaf", icon: Leaf, color: "bg-green-500" },
  { id: "frost", name: "Frost", icon: Snowflake, color: "bg-cyan-400" },
  { id: "bolt", name: "Bolt", icon: Zap, color: "bg-yellow-500" },
  { id: "spirit", name: "Spirit", icon: Ghost, color: "bg-purple-500" },
  { id: "fighting", name: "Fighting", icon: Sword, color: "bg-orange-600" },
  { id: "stone", name: "Stone", icon: Shield, color: "bg-gray-500" },
  { id: "wave", name: "Wave", icon: Waves, color: "bg-teal-500" },
]

const rarities = [
  { id: "common", name: "Common", odds: "60%", color: "bg-gray-500" },
  { id: "uncommon", name: "Uncommon", odds: "25%", color: "bg-green-500" },
  { id: "rare", name: "Rare", odds: "10%", color: "bg-blue-500" },
  { id: "epic", name: "Epic", odds: "4%", color: "bg-purple-500" },
  { id: "legendary", name: "Legendary", odds: "0.9%", color: "bg-orange-500" },
  { id: "secret", name: "Secret", odds: "0.1%", color: "bg-pink-500" },
]

const appearances = [
  { id: "cute", name: "Cute" },
  { id: "fierce", name: "Fierce" },
  { id: "mythic", name: "Mythic" },
  { id: "neon", name: "Neon" },
  { id: "crystal", name: "Crystal" },
  { id: "shadow", name: "Shadow" },
  { id: "cosmic", name: "Cosmic" },
  { id: "ancient", name: "Ancient" },
]

const personalities = [
  "Playful", "Loyal", "Curious", "Gentle", "Bold", "Mischievous",
  "Protective", "Calm", "Energetic", "Clever", "Brave", "Cheerful",
]

const UploadPageNew = () => {
  const [selectedType, setSelectedType] = useState("")
  const [selectedRarity, setSelectedRarity] = useState("")
  const [selectedAppearance, setSelectedAppearance] = useState("")
  const [selectedPersonalities, setSelectedPersonalities] = useState([])
  const [uploadedFile, setUploadedFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [uploadError, setUploadError] = useState("")

  // Cleanup effect to prevent memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  const handleFileUpload = (file) => {
    // Clear any previous errors
    setUploadError("")
    
    // Enhanced file validation
    if (!file) return
    
    // Check if file is an image
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setUploadError("Please upload an image file only (JPG, PNG, GIF, WebP)")
      return
    }
    
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      setUploadError("File size must be less than 10MB")
      return
    }
    
    // Check minimum dimensions (optional - for better quality)
    const img = new Image()
    img.onload = () => {
      if (img.width < 100 || img.height < 100) {
        setUploadError("Image should be at least 100x100 pixels for better results")
        URL.revokeObjectURL(img.src)
        return
      }
      
      // Clean up previous image URL to prevent memory leaks
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }
      
      setUploadedFile(file)
      const previewUrl = URL.createObjectURL(file)
      setImagePreview(previewUrl)
      
      // Show success feedback
      console.log("Image uploaded successfully:", file.name)
    }
    
    img.onerror = () => {
      setUploadError("Invalid image file. Please try another image.")
      URL.revokeObjectURL(img.src)
    }
    
    img.src = URL.createObjectURL(file)
  }

  const clearUploadedImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
    setUploadedFile(null)
    setImagePreview(null)
    setUploadError("")
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      handleFileUpload(file)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    // Only set dragging to false if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false)
    }
  }

  const togglePersonality = (personality) => {
    setSelectedPersonalities(prev =>
      prev.includes(personality) 
        ? prev.filter(p => p !== personality) 
        : [...prev, personality]
    )
  }

  const handleGenerate = () => {
    if (!uploadedFile) {
      alert("Please upload a pet photo first.")
      return
    }

    setIsGenerating(true)
    
    // Mock generation process
    setTimeout(() => {
      alert("PokePet generated successfully! Check your gallery.")
      setIsGenerating(false)
      clearUploadedImage()
      setSelectedType("")
      setSelectedRarity("")
      setSelectedAppearance("")
      setSelectedPersonalities([])
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Transform Your Pet
          </h1>
          <p className="text-gray-600 text-lg">Upload your pet's photo and customize their Pokepet transformation</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Design Panel */}
          <div className="lg:col-span-2">
            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  Design Your Pokepet
                </CardTitle>
                <CardDescription>Customize the type and personality of your creature</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Type Selection */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Select Type</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {pokemonTypes.map((type) => {
                      const Icon = type.icon
                      return (
                        <Button
                          key={type.id}
                          variant={selectedType === type.id ? "default" : "outline"}
                          className={`h-16 flex-col gap-1 ${selectedType === type.id ? type.color : ""}`}
                          onClick={() => setSelectedType(type.id)}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-xs">{type.name}</span>
                        </Button>
                      )
                    })}
                  </div>
                </div>

                {/* Rarity Selection */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium">Rarity</label>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs text-gray-500 hover:text-gray-700">
                          <Info className="w-3 h-3 mr-1" />
                          View Odds
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Rarity Odds Breakdown</DialogTitle>
                          <DialogDescription>
                            Probability of getting each rarity level when generating your Pokepet
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                          {rarities.map((rarity) => (
                            <div key={rarity.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                              <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded-full ${rarity.color}`}></div>
                                <span className="font-medium text-gray-700">{rarity.name}</span>
                              </div>
                              <span className="font-medium text-gray-700">{rarity.odds}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs text-blue-700">
                            💡 Selecting a rarity preference increases your chances but doesn't guarantee that rarity level.
                          </p>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="w-fit min-w-48">
                    <Select value={selectedRarity} onValueChange={setSelectedRarity}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose rarity preference" />
                      </SelectTrigger>
                      <SelectContent>
                        {rarities.map((rarity) => (
                          <SelectItem key={rarity.id} value={rarity.id}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${rarity.color}`} />
                              {rarity.name} ({rarity.odds})
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Appearance Style Selection */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Appearance Style</label>
                  <div className="w-fit min-w-48">
                    <Select value={selectedAppearance} onValueChange={setSelectedAppearance}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose appearance style (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {appearances.map((appearance) => (
                          <SelectItem key={appearance.id} value={appearance.id}>
                            {appearance.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Personality Chips */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Personality Traits (select multiple)</label>
                  <div className="flex flex-wrap gap-2">
                    {personalities.map((personality) => (
                      <Badge
                        key={personality}
                        variant={selectedPersonalities.includes(personality) ? "default" : "outline"}
                        className="cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => togglePersonality(personality)}
                      >
                        {personality}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Helper Row */}
                <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-4">
                  <p className="text-sm text-center text-gray-700">
                    💡 <strong>Pro Tip:</strong> Evolve your Pokepet with 40 XP or 3 💎
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Uploader Card */}
            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-500" />
                  Upload Pet Photo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 ${
                    isDragging 
                      ? "border-purple-500 bg-purple-50 scale-105 shadow-lg" 
                      : "border-gray-300 hover:border-purple-400 hover:bg-gray-50"
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                >
                  {uploadedFile && imagePreview ? (
                    <div className="space-y-4">
                      <div className="relative group">
                        <img
                          src={imagePreview}
                          alt="Uploaded pet"
                          className="w-32 h-32 mx-auto object-cover rounded-2xl shadow-lg border-2 border-gray-200 group-hover:border-purple-300 transition-colors duration-200"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 shadow-md hover:scale-110 transition-transform duration-200"
                          onClick={clearUploadedImage}
                          title="Remove image"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <p className="text-sm text-green-600 font-medium">Photo ready for transformation!</p>
                        </div>
                        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
                          <p><strong>File:</strong> {uploadedFile.name}</p>
                          <p><strong>Size:</strong> {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById("file-upload-replace")?.click()}
                          className="text-xs hover:bg-purple-50 hover:border-purple-300 transition-colors duration-200"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Change Photo
                        </Button>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                          className="hidden"
                          id="file-upload-replace"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center transition-all duration-200 ${
                        isDragging 
                          ? "bg-purple-100 text-purple-600 scale-110" 
                          : "bg-gray-100 text-gray-400"
                      }`}>
                        <Upload className={`w-8 h-8 transition-all duration-200 ${
                          isDragging ? "animate-bounce" : ""
                        }`} />
                      </div>
                      <div>
                        <p className={`text-sm mb-2 transition-colors duration-200 ${
                          isDragging 
                            ? "text-purple-600 font-medium" 
                            : "text-gray-600"
                        }`}>
                          {isDragging ? "Drop your pet photo here!" : "Drag and drop your pet photo here"}
                        </p>
                        <p className="text-xs text-gray-500 mb-3">
                          Supports JPG, PNG, GIF, WebP (max 10MB)
                        </p>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                          className="hidden"
                          id="file-upload"
                        />
                        <Button asChild variant="outline" className="hover:bg-purple-50 hover:border-purple-300">
                          <label htmlFor="file-upload" className="cursor-pointer">
                            Choose File
                          </label>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Error Display */}
                {uploadError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600 flex items-center gap-2">
                      <X className="w-4 h-4" />
                      {uploadError}
                    </p>
                  </div>
                )}

                <Button
                  className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Pokepet
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Store Card */}
            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gem className="w-5 h-5 text-pink-500" />
                  Pokepet Store
                </CardTitle>
                <CardDescription>Get more gems for premium features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gradient-to-r from-pink-100 to-purple-100 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">20 💎 Gems</span>
                    <Badge variant="secondary">100 coins</Badge>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600">
                    <Gem className="w-4 h-4 mr-2" />
                    Buy Gems
                  </Button>
                </div>

                <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium flex items-center gap-1">
                      <Crown className="w-4 h-4" />
                      Premium
                    </span>
                    <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500">Unlimited</Badge>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600">
                    <Crown className="w-4 h-4 mr-2" />
                    Subscribe
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UploadPageNew