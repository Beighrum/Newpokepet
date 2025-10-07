"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { startCardGeneration } from "@/lib/firebase-functions"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase"

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

const appearances = ["Cute", "Fierce", "Mythic", "Neon", "Crystal", "Shadow", "Cosmic", "Ancient"]

const personalities = [
  "Playful",
  "Loyal",
  "Curious",
  "Gentle",
  "Bold",
  "Mischievous",
  "Protective",
  "Calm",
  "Energetic",
  "Clever",
  "Brave",
  "Cheerful",
]

export default function UploadPage() {
  const [selectedType, setSelectedType] = useState("")
  const [selectedRarity, setSelectedRarity] = useState("")
  const [selectedAppearance, setSelectedAppearance] = useState("")
  const [selectedPersonalities, setSelectedPersonalities] = useState<string[]>([])
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()
  const [user] = useAuthState(auth)

  const handleFileUpload = (file: File) => {
    if (file.type.startsWith("image/")) {
      setUploadedFile(file)
      const previewUrl = URL.createObjectURL(file)
      setImagePreview(previewUrl)
      toast({
        title: "Photo uploaded!",
        description: "Your pet photo is ready for transformation.",
      })
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      })
    }
  }

  const clearUploadedImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
    setUploadedFile(null)
    setImagePreview(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  const togglePersonality = (personality: string) => {
    setSelectedPersonalities((prev) =>
      prev.includes(personality) ? prev.filter((p) => p !== personality) : [...prev, personality],
    )
  }

  const handleGenerate = async () => {
    if (!uploadedFile) {
      toast({
        title: "No photo uploaded",
        description: "Please upload a pet photo first.",
        variant: "destructive",
      })
      return
    }

    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to generate creatures.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)

    try {
      const bytes = await uploadedFile.arrayBuffer()

      const design = {
        type: selectedType,
        rarity: selectedRarity,
        appearance: selectedAppearance,
        personalities: selectedPersonalities,
      }

      const prompt = `Transform this ${uploadedFile.name} into a ${selectedAppearance || "cute"} ${selectedType || "normal"} type creature with ${selectedPersonalities.join(", ")} personality`

      const result = await startCardGeneration(bytes, uploadedFile.name, uploadedFile.type, design, prompt)

      toast({
        title: "Generation started!",
        description: `Your creature is being created (ID: ${result.cardId}). Check your gallery!`,
      })

      clearUploadedImage()
      setSelectedType("")
      setSelectedRarity("")
      setSelectedAppearance("")
      setSelectedPersonalities([])
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
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
          {/* Design Panel - Sticky on desktop */}
          <div className="lg:col-span-2">
            <Card className="sticky top-4 backdrop-blur-sm bg-white/80 border-0 shadow-xl rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  Design Your Pokepet
                </CardTitle>
                <CardDescription>Customize the type, rarity, and personality of your creature</CardDescription>
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
                  <label className="text-sm font-medium mb-3 block">
                    Rarity
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="ml-2 h-6 px-2 text-xs">
                          View Odds
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Rarity Odds</DialogTitle>
                          <DialogDescription>Chances of getting each rarity level</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2">
                          {rarities.map((rarity) => (
                            <div key={rarity.id} className="flex justify-between items-center">
                              <Badge className={rarity.color}>{rarity.name}</Badge>
                              <span className="text-sm">{rarity.odds}</span>
                            </div>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </label>
                  <Select value={selectedRarity} onValueChange={setSelectedRarity}>
                    <SelectTrigger>
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

                {/* Appearance */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Appearance Style</label>
                  <Select value={selectedAppearance} onValueChange={setSelectedAppearance}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose appearance style" />
                    </SelectTrigger>
                    <SelectContent>
                      {appearances.map((appearance) => (
                        <SelectItem key={appearance} value={appearance.toLowerCase()}>
                          {appearance}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
                    isDragging ? "border-purple-400 bg-purple-50" : "border-gray-300 hover:border-purple-400"
                  }`}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnter={() => setIsDragging(true)}
                  onDragLeave={() => setIsDragging(false)}
                >
                  {uploadedFile && imagePreview ? (
                    <div className="space-y-4">
                      <div className="relative">
                        <img
                          src={imagePreview || "/placeholder.svg"}
                          alt="Uploaded pet"
                          className="w-32 h-32 mx-auto object-cover rounded-2xl shadow-lg"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={clearUploadedImage}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">Photo ready for transformation!</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById("file-upload-replace")?.click()}
                          className="text-xs"
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
                      <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                        <Upload className="w-8 h-8 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Drag and drop your pet photo here</p>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                          className="hidden"
                          id="file-upload"
                        />
                        <Button asChild variant="outline">
                          <label htmlFor="file-upload" className="cursor-pointer">
                            Choose File
                          </label>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

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
