import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trophy, Star, Heart, Share2 } from 'lucide-react'

const featuredCards = [
  {
    id: 1,
    name: "Cosmic Dragon",
    type: "Cosmic",
    rarity: "Secret",
    image: "/psychic-persian-pokemon.png",
    likes: 1247,
    trainer: "StarMaster",
    featured: true
  },
  {
    id: 2,
    name: "Shadow Wolf",
    type: "Dark",
    rarity: "Legendary",
    image: "/dark-wolf-pokemon.png",
    likes: 892,
    trainer: "NightHunter",
    featured: false
  },
  {
    id: 3,
    name: "Crystal Phoenix",
    type: "Ice",
    rarity: "Legendary",
    image: "/grass-kitten-pokemon.png",
    likes: 756,
    trainer: "IceQueen",
    featured: false
  }
]

const getRarityColor = (rarity) => {
  switch (rarity.toLowerCase()) {
    case 'secret': return 'bg-pink-500 text-white'
    case 'legendary': return 'bg-yellow-500 text-yellow-900'
    case 'epic': return 'bg-purple-500 text-white'
    case 'rare': return 'bg-blue-500 text-white'
    default: return 'bg-gray-500 text-white'
  }
}

const ShowcasePageNew = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            PokePet Showcase
          </h1>
          <p className="text-gray-600 text-lg">Discover amazing PokePets from trainers around the world</p>
        </div>

        {/* Featured Section */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <h2 className="text-2xl font-bold">Featured PokePets</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredCards.map((card) => (
              <Card key={card.id} className="group relative backdrop-blur-sm bg-white/80 border-0 shadow-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <div className="aspect-[3/4] relative">
                  <img
                    src={card.image}
                    alt={card.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/300x400/e5e7eb/6b7280?text=" + card.name
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  {/* Featured Badge */}
                  {card.featured && (
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                        <Star className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    </div>
                  )}

                  {/* Rarity Badge */}
                  <Badge className={`absolute top-3 right-3 ${getRarityColor(card.rarity)} rounded-full`}>
                    {card.rarity}
                  </Badge>

                  {/* Card Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <h3 className="font-bold text-lg mb-1">{card.name}</h3>
                    <p className="text-sm opacity-90 mb-2">{card.type} Type</p>
                    <p className="text-xs opacity-75 mb-3">by {card.trainer}</p>
                    
                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4 text-red-400" />
                        <span className="text-sm">{card.likes}</span>
                      </div>
                      <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                        <Share2 className="w-3 h-3 mr-1" />
                        Share
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Community Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {[
            { label: "Total PokePets", value: "12,847", icon: "🎯" },
            { label: "Active Trainers", value: "3,291", icon: "👥" },
            { label: "Battles Today", value: "1,456", icon: "⚔️" },
            { label: "Evolutions", value: "892", icon: "✨" }
          ].map((stat, index) => (
            <Card key={index} className="backdrop-blur-sm bg-white/80 border-0 shadow-xl rounded-3xl p-6 text-center">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold text-gray-800 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <Card className="backdrop-blur-sm bg-gradient-to-r from-purple-100 to-pink-100 border-0 shadow-xl rounded-3xl p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Ready to Join the Community?</h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Create your own legendary PokePets and share them with trainers worldwide. 
            Battle, evolve, and become the ultimate PokePet master!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-3xl px-8 py-3">
              Start Creating
            </Button>
            <Button variant="outline" className="rounded-3xl px-8 py-3">
              View Gallery
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default ShowcasePageNew