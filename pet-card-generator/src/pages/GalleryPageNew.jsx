import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sparkles, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CreatureDialog } from '@/components/creature-dialog'
import { transformCardToCreature, validateCardData, transformCardToCreatureAdvanced } from '@/lib/gallery-data-transform'

const sampleCards = [
  {
    id: 1,
    name: "Golden Thunder",
    type: "Lightning",
    rarity: "Legendary",
    image: "/golden-retriever-pokemon-lightning.png",
    level: 15,
    xp: 850
  },
  {
    id: 2,
    name: "Fire Corgi",
    type: "Fire",
    rarity: "Epic",
    image: "/fire-corgi-pokemon.png",
    level: 12,
    xp: 620
  },
  {
    id: 3,
    name: "Water Lab",
    type: "Water",
    rarity: "Rare",
    image: "/labrador-pokemon-water.png",
    level: 8,
    xp: 340
  }
]

const getRarityColor = (rarity) => {
  switch (rarity.toLowerCase()) {
    case 'legendary': return 'bg-yellow-500 text-yellow-900'
    case 'epic': return 'bg-purple-500 text-white'
    case 'rare': return 'bg-blue-500 text-white'
    case 'uncommon': return 'bg-green-500 text-white'
    default: return 'bg-gray-500 text-white'
  }
}

const GalleryPageNew = () => {
  const navigate = useNavigate()
  
  // Modal state management
  const [selectedCreature, setSelectedCreature] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Click handler for card containers with validation and error handling
  const handleCardClick = (card) => {
    try {
      // Validate card data before transformation
      if (!validateCardData(card)) {
        console.error('Invalid card data, cannot open modal:', card)
        return
      }

      // Use advanced transformation with validation
      const creature = transformCardToCreatureAdvanced(card)
      
      // Additional validation to ensure transformation was successful
      if (!creature) {
        console.error('Failed to transform card to creature:', card)
        return
      }

      // Validate required creature properties before opening modal
      if (!creature.name || !creature.element || !creature.imageUrl) {
        console.error('Transformed creature missing required properties:', creature)
        return
      }

      setSelectedCreature(creature)
      setIsModalOpen(true)
    } catch (error) {
      console.error('Error handling card click:', error)
      // Graceful fallback - don't open modal if there's an error
    }
  }

  // Modal close handler with proper state cleanup and error handling
  const handleModalClose = () => {
    try {
      setIsModalOpen(false)
      setSelectedCreature(null)
    } catch (error) {
      console.error('Error closing modal:', error)
      // Force state reset even if there's an error
      setIsModalOpen(false)
      setSelectedCreature(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Your PokePet Gallery
          </h1>
          <p className="text-gray-600 text-lg">Manage and view all your collected creatures</p>
        </div>

        {sampleCards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sampleCards.map((card) => (
              <Card 
                key={card.id} 
                className={`group relative backdrop-blur-sm bg-white/80 border-0 shadow-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer`}
                onClick={() => {
                  // Only allow click if card has required data
                  if (card.name && card.type && card.level) {
                    handleCardClick(card)
                  }
                }}
                onKeyDown={(e) => {
                  // Support Enter key to open modal
                  if (e.key === 'Enter' && card.name && card.type && card.level) {
                    handleCardClick(card)
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`View details for ${card.name || 'Unknown Pet'}, Level ${card.level || 1} ${card.type || 'Unknown'} type pet`}
                aria-describedby={`card-${card.id}-description`}
              >
                <div className="aspect-[3/4] relative">
                  <img
                    src={card.image || "/placeholder.svg"}
                    alt={card.name || "Unknown Pet"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/300x400/e5e7eb/6b7280?text=" + encodeURIComponent(card.name || "Unknown")
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  {/* Rarity Badge */}
                  <Badge className={`absolute top-3 right-3 ${getRarityColor(card.rarity)} rounded-full`}>
                    {card.rarity}
                  </Badge>

                  {/* Card Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <h3 className="font-bold text-lg mb-1">{card.name || "Unknown Pet"}</h3>
                    <p className="text-sm opacity-90 mb-2">{card.type || "Unknown"} Type</p>
                    
                    {/* Level and XP */}
                    <div className="flex items-center justify-between text-xs">
                      <span>Level {card.level || 1}</span>
                      <span>{card.xp || 0} XP</span>
                    </div>
                    
                    {/* XP Progress Bar */}
                    <div className="w-full bg-black/30 rounded-full h-1.5 mt-2" role="progressbar" aria-label="Experience progress" aria-valuenow={((card.xp || 0) % 100)} aria-valuemin="0" aria-valuemax="100">
                      <div 
                        className="bg-gradient-to-r from-yellow-400 to-orange-500 h-1.5 rounded-full"
                        style={{ width: `${((card.xp || 0) % 100)}%` }}
                      />
                    </div>
                    
                    {/* Hidden description for screen readers */}
                    <div id={`card-${card.id}-description`} className="sr-only">
                      {card.rarity} rarity pet with {card.xp || 0} experience points. Click to view detailed statistics.
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {/* Add New Card */}
            <Card 
              className="group relative backdrop-blur-sm bg-white/40 border-2 border-dashed border-purple-300 rounded-3xl overflow-hidden hover:border-purple-500 transition-all duration-300 hover:-translate-y-2 cursor-pointer"
              onClick={() => navigate('/upload')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  navigate('/upload')
                }
              }}
              tabIndex={0}
              role="button"
              aria-label="Create new PokePet by uploading a pet photo"
            >
              <div className="aspect-[3/4] flex flex-col items-center justify-center text-purple-500 group-hover:text-purple-600">
                <Plus className="w-16 h-16 mb-4" />
                <p className="font-semibold text-lg">Create New</p>
                <p className="text-sm opacity-75">Upload a pet photo</p>
              </div>
            </Card>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <Sparkles className="w-16 h-16 mx-auto text-purple-400 mb-6" />
              <h3 className="text-2xl font-bold text-gray-800 mb-4">No PokePets Yet</h3>
              <p className="text-gray-600 mb-8">
                Start your collection by uploading your first pet photo and transforming them into a magical creature!
              </p>
              <Button
                onClick={() => navigate('/upload')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-3xl px-8 py-3"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Your First PokePet
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Creature Stats Modal with validation */}
      {selectedCreature && (
        <CreatureDialog
          creature={selectedCreature}
          open={isModalOpen}
          onOpenChange={handleModalClose}
        />
      )}
    </div>
  )
}

export default GalleryPageNew