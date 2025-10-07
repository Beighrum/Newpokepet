import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Sparkles, PawPrint, Crown, QrCode } from 'lucide-react'

const features = [
  {
    icon: Crown,
    title: "Rarity System",
    description: "Each pet gets a unique rarity percentage based on their distinctive features and characteristics.",
    badge: "Ultra Rare",
    gradient: "from-yellow-400 to-orange-500",
  },
  {
    icon: Sparkles,
    title: "Evolution Paths",
    description: "Watch your pet creature grow and evolve into more powerful forms with special abilities.",
    badge: "Level Up",
    gradient: "from-purple-400 to-pink-500",
  },
  {
    icon: QrCode,
    title: "Share & Battle",
    description: "Generate QR codes to share your creatures and battle with friends in epic matchups.",
    badge: "Multiplayer",
    gradient: "from-blue-400 to-cyan-500",
  },
]

const LandingPageNew = () => {
  const navigate = useNavigate()

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Hero Section */}
      <section className="relative px-4 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div className="text-center lg:text-left">
              <Badge
                variant="secondary"
                className="mb-6 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-200 rounded-full px-4 py-2"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Transform Your Pet Today
              </Badge>

              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent leading-tight mb-6">
                Turn Your Pet Into a Collectible Pokepet
              </h1>

              <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto lg:mx-0">
                Upload a photo of your beloved pet and watch as AI transforms them into a unique, collectible creature
                with special abilities, rarity levels, and evolutionary paths.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button
                  size="lg"
                  onClick={() => navigate('/upload')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-3xl px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  <PawPrint className="w-5 h-5 mr-2" />
                  Upload a Photo
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/gallery')}
                  className="rounded-3xl px-8 py-6 text-lg font-semibold border-2 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-300 hover:-translate-y-1 bg-transparent"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  View Gallery
                </Button>
              </div>
            </div>

            {/* Mascot/Illustration Area */}
            <div className="relative">
              <div className="relative bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 rounded-3xl p-8 backdrop-blur-sm border border-white/20 shadow-2xl">
                <div className="aspect-[3/4] bg-gradient-to-br from-purple-200 to-pink-200 rounded-3xl flex items-center justify-center relative overflow-hidden">
                  <img
                    src="/golden-retriever-pokemon-lightning.png"
                    alt="Shihflar - A cute Shih Tzu Pokemon card showing the transformation magic"
                    className="w-full h-full object-contain rounded-3xl"
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/300x400/e5e7eb/6b7280?text=PokePet+Card"
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent rounded-3xl" />
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-yellow-400 text-yellow-900 border-yellow-500 rounded-full">⭐ Legendary</Badge>
                  </div>
                </div>

                {/* Floating elements */}
                <div className="absolute -top-2 -left-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-bounce" />
                <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full animate-bounce delay-300" />
                <div className="absolute top-1/2 -left-4 w-4 h-4 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full animate-bounce delay-700" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Magical Features</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover the enchanting world of pet transformation with our cutting-edge AI technology
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Card
                  key={index}
                  className="group relative p-8 rounded-3xl border-0 bg-white/60 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer"
                >
                  <div className="relative">
                    <div
                      className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </div>

                    <Badge
                      variant="secondary"
                      className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-200 rounded-full"
                    >
                      {feature.badge}
                    </Badge>

                    <h3 className="text-xl font-semibold mb-4 group-hover:text-purple-600 transition-colors">
                      {feature.title}
                    </h3>

                    <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                  </div>

                  {/* Subtle glow effect */}
                  <div
                    className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
                  />
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-700 transition-colors">
              About
            </a>
            <a href="#" className="hover:text-gray-700 transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-gray-700 transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-gray-700 transition-colors">
              Support
            </a>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            © 2024 Pokepet. Turn your beloved pets into legendary collectibles.
          </p>
        </div>
      </footer>
    </main>
  )
}

export default LandingPageNew