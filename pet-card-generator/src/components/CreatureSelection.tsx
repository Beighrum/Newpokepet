import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Heart, Sword, Shield, Zap } from 'lucide-react'
import { Card as PokePetCard } from '@/hooks/use-cards'

interface CreatureSelectionProps {
  cards: PokePetCard[]
  selectedCard: PokePetCard | null
  onCardSelect: (card: PokePetCard) => void
}

const CreatureSelection: React.FC<CreatureSelectionProps> = ({
  cards,
  selectedCard,
  onCardSelect
}) => {
  const readyCards = cards.filter(card => card.status === 'ready')

  if (readyCards.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sword className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-600 mb-2">No PokePets Ready for Battle</h3>
        <p className="text-gray-500">Create and train some PokePets first to start battling!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 id="creature-selection-title" className="text-lg font-semibold text-gray-800">Select Your Fighter</h3>
      <div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        role="radiogroup"
        aria-labelledby="creature-selection-title"
        aria-describedby="creature-selection-description"
      >
        <div id="creature-selection-description" className="sr-only">
          Choose a PokePet to use in battle. Use arrow keys to navigate between options and Enter or Space to select.
        </div>
        {readyCards.map((card) => (
          <Card
            key={card.id}
            className={`group cursor-pointer backdrop-blur-sm bg-white/80 border-0 shadow-xl rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:outline-none ${
              selectedCard?.id === card.id
                ? 'ring-2 ring-red-500 shadow-2xl shadow-red-200/50 -translate-y-2'
                : ''
            }`}
            onClick={() => onCardSelect(card)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onCardSelect(card)
              }
            }}
            tabIndex={0}
            role="radio"
            aria-checked={selectedCard?.id === card.id}
            aria-labelledby={`card-${card.id}-name`}
            aria-describedby={`card-${card.id}-details`}
          >
            <CardContent className="p-0">
              {/* Card Image Section */}
              <div className="aspect-[4/3] relative">
                <img
                  src={card.imageUrl || "https://via.placeholder.com/300x225/e5e7eb/6b7280?text=" + encodeURIComponent(card.name || 'PokePet')}
                  alt={card.name || 'PokePet'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = "https://via.placeholder.com/300x225/e5e7eb/6b7280?text=" + encodeURIComponent(card.name || 'PokePet')
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Rarity Badge */}
                <Badge className={`absolute top-3 right-3 rounded-full ${
                  card.rarity === 'legendary'
                    ? 'bg-yellow-500 text-yellow-900'
                    : card.rarity === 'epic'
                    ? 'bg-purple-500 text-white'
                    : card.rarity === 'rare'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-500 text-white'
                }`}>
                  {card.rarity}
                </Badge>

                {/* Card Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <h4 id={`card-${card.id}-name`} className="font-bold text-lg mb-1">{card.name}</h4>
                  <p id={`card-${card.id}-details`} className="text-sm opacity-90 mb-2 capitalize">
                    {card.stage} • {card.element} type
                  </p>
                </div>
              </div>

              {/* Stats Section */}
              <div className="p-4">

                {/* Stats Display */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="flex items-center gap-1 bg-red-50 p-2 rounded">
                    <Heart className="w-3 h-3 text-red-500" />
                    <span className="font-medium">{card.stats?.hp || 100}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-orange-50 p-2 rounded">
                    <Sword className="w-3 h-3 text-orange-500" />
                    <span className="font-medium">{card.stats?.attack || 50}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-blue-50 p-2 rounded">
                    <Shield className="w-3 h-3 text-blue-500" />
                    <span className="font-medium">{card.stats?.defense || 50}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-yellow-50 p-2 rounded">
                    <Zap className="w-3 h-3 text-yellow-500" />
                    <span className="font-medium">{card.stats?.speed || 50}</span>
                  </div>
                </div>

                {/* Selection Indicator */}
                {selectedCard?.id === card.id && (
                  <div className="text-center">
                    <Badge className="bg-red-500 text-white animate-pulse">✓ Selected</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default CreatureSelection