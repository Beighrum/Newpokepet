import React from 'react'
import { Button } from '@/components/ui/button'
import { Sword } from 'lucide-react'
import { Card as PokePetCard } from '@/hooks/use-cards'

interface SelectionActionsProps {
  selectedCard: PokePetCard | null
  availableCards: PokePetCard[]
  onStartBattle: (playerCard: PokePetCard, opponentCard: PokePetCard) => void
  disabled?: boolean
}

const SelectionActions: React.FC<SelectionActionsProps> = ({
  selectedCard,
  availableCards,
  onStartBattle,
  disabled = false
}) => {
  const readyCards = availableCards.filter(card => card.status === 'ready')
  
  // Validation logic
  const canStartBattle = selectedCard && readyCards.length >= 2 && !disabled
  
  const getOpponent = (playerCard: PokePetCard): PokePetCard | null => {
    const availableOpponents = readyCards.filter(card => card.id !== playerCard.id)
    if (availableOpponents.length === 0) return null
    
    // Simple random selection algorithm
    const randomIndex = Math.floor(Math.random() * availableOpponents.length)
    return availableOpponents[randomIndex]
  }

  const handleStartBattle = () => {
    if (!selectedCard) return
    
    const opponent = getOpponent(selectedCard)
    if (!opponent) return
    
    onStartBattle(selectedCard, opponent)
  }

  const getButtonText = () => {
    if (!selectedCard) return 'Select a PokePet to Battle'
    if (readyCards.length < 2) return 'Need More PokePets for Battle'
    if (disabled) return 'Starting Battle...'
    return 'Start Battle'
  }

  const getButtonVariant = () => {
    if (!canStartBattle) return 'secondary'
    return 'default'
  }

  return (
    <div className="space-y-4">
      {selectedCard && (
        <div className="bg-gradient-to-r from-red-100 to-orange-100 rounded-2xl p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-20 bg-gradient-to-br from-red-200 to-orange-200 rounded-xl flex items-center justify-center">
              <img 
                src={selectedCard.imageUrl || "https://via.placeholder.com/64x80/e5e7eb/6b7280?text=🎮"} 
                alt={selectedCard.name || 'PokePet'}
                className="w-full h-full object-contain rounded-xl"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = "https://via.placeholder.com/64x80/e5e7eb/6b7280?text=🎮"
                }}
              />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">{selectedCard.name}</h4>
              <p className="text-sm text-gray-600 capitalize">
                {selectedCard.stage} • {selectedCard.element} Type
              </p>
              <div className="flex gap-2 mt-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  selectedCard.rarity === 'legendary'
                    ? 'bg-purple-500 text-white'
                    : selectedCard.rarity === 'epic'
                    ? 'bg-orange-500 text-white'
                    : selectedCard.rarity === 'rare'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-500 text-white'
                }`}>
                  {selectedCard.rarity}
                </span>
                <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                  {selectedCard.xp} XP
                </span>
              </div>
            </div>
          </div>

          {/* Stats Display */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">❤️ HP: {selectedCard.stats?.hp || 100}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">⚔️ ATK: {selectedCard.stats?.attack || 50}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">🛡️ DEF: {selectedCard.stats?.defense || 50}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">⚡ SPD: {selectedCard.stats?.speed || 50}</span>
            </div>
          </div>
        </div>
      )}

      <Button 
        className={`w-full ${
          canStartBattle 
            ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700' 
            : ''
        }`}
        variant={getButtonVariant()}
        disabled={!canStartBattle}
        onClick={handleStartBattle}
      >
        <Sword className="w-4 h-4 mr-2" />
        {getButtonText()}
      </Button>

      {/* Validation Messages */}
      {readyCards.length < 2 && (
        <p className="text-sm text-gray-500 text-center">
          You need at least 2 ready PokePets to start a battle. Create more PokePets to unlock battles!
        </p>
      )}
      
      {readyCards.length >= 2 && !selectedCard && (
        <p className="text-sm text-gray-500 text-center">
          Choose your fighter from the PokePets above to begin the battle.
        </p>
      )}
    </div>
  )
}

export default SelectionActions