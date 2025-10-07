import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sword, Zap, Shield, Flame, Droplets, Leaf, RotateCcw } from 'lucide-react'
import { BattleMove } from '@/types/battle'
import BattleResetDialog from './BattleResetDialog'

interface BattleActionsProps {
  moves: BattleMove[]
  canPlayerMove: boolean
  onMoveSelect: (move: BattleMove) => void
  currentTurn: "player" | "opponent"
  isOpponentThinking: boolean
  onResetBattle?: () => void
  battleActive?: boolean
}

const MoveButton: React.FC<{
  move: BattleMove
  onSelect: () => void
  disabled: boolean
}> = ({ move, onSelect, disabled }) => {
  // Get type-specific styling and icon
  const getTypeStyle = (type: string) => {
    switch (type.toLowerCase()) {
      case 'fire':
        return {
          icon: <Flame className="w-4 h-4" />,
          bgColor: 'bg-red-500',
          hoverColor: 'hover:bg-red-600',
          borderColor: 'border-red-300',
          textColor: 'text-red-700'
        }
      case 'water':
        return {
          icon: <Droplets className="w-4 h-4" />,
          bgColor: 'bg-blue-500',
          hoverColor: 'hover:bg-blue-600',
          borderColor: 'border-blue-300',
          textColor: 'text-blue-700'
        }
      case 'grass':
        return {
          icon: <Leaf className="w-4 h-4" />,
          bgColor: 'bg-green-500',
          hoverColor: 'hover:bg-green-600',
          borderColor: 'border-green-300',
          textColor: 'text-green-700'
        }
      case 'electric':
        return {
          icon: <Zap className="w-4 h-4" />,
          bgColor: 'bg-yellow-500',
          hoverColor: 'hover:bg-yellow-600',
          borderColor: 'border-yellow-300',
          textColor: 'text-yellow-700'
        }
      default:
        return {
          icon: <Sword className="w-4 h-4" />,
          bgColor: 'bg-gray-500',
          hoverColor: 'hover:bg-gray-600',
          borderColor: 'border-gray-300',
          textColor: 'text-gray-700'
        }
    }
  }

  const typeStyle = getTypeStyle(move.type)
  
  // Determine power level for visual feedback
  const getPowerLevel = (power: number) => {
    if (power >= 80) return 'High'
    if (power >= 50) return 'Medium'
    return 'Low'
  }

  const powerLevel = getPowerLevel(move.power)

  return (
    <Button
      onClick={onSelect}
      disabled={disabled}
      className={`
        relative p-4 h-auto flex flex-col items-start gap-2 
        bg-white/90 border-2 ${typeStyle.borderColor} rounded-xl
        ${disabled ? 'opacity-50 cursor-not-allowed' : `${typeStyle.hoverColor} hover:shadow-xl hover:-translate-y-1 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
        transition-all duration-300 transform
        disabled:transform-none disabled:hover:shadow-none
      `}
      variant="outline"
      aria-label={`Use ${move.name}, ${move.type} type move with ${move.power} power`}
      aria-describedby={`move-${move.name.replace(/\s+/g, '-').toLowerCase()}-details`}
    >
      {/* Move header */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <div className={`p-1 rounded ${typeStyle.bgColor} text-white`}>
            {typeStyle.icon}
          </div>
          <span className="font-semibold text-gray-800">{move.name}</span>
        </div>
        <Badge 
          variant="outline" 
          className={`${typeStyle.textColor} ${typeStyle.borderColor} bg-white/80`}
        >
          {move.type}
        </Badge>
      </div>

      {/* Move details */}
      <div 
        id={`move-${move.name.replace(/\s+/g, '-').toLowerCase()}-details`}
        className="flex items-center justify-between w-full text-sm"
      >
        <div className="flex items-center gap-1">
          <Shield className="w-3 h-3 text-gray-500" aria-hidden="true" />
          <span className="text-gray-600">Power: {move.power}</span>
        </div>
        <Badge 
          variant="secondary" 
          className={`text-xs ${
            powerLevel === 'High' ? 'bg-red-100 text-red-700' :
            powerLevel === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-green-100 text-green-700'
          }`}
          aria-label={`Power level: ${powerLevel}`}
        >
          {powerLevel}
        </Badge>
      </div>

      {/* Hover effect overlay */}
      {!disabled && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
      )}
    </Button>
  )
}

const BattleActions: React.FC<BattleActionsProps> = ({
  moves,
  canPlayerMove,
  onMoveSelect,
  currentTurn,
  isOpponentThinking,
  onResetBattle,
  battleActive = false
}) => {
  const [showResetDialog, setShowResetDialog] = useState(false)
  // Show different content based on battle state
  const renderContent = () => {
    if (currentTurn === 'opponent') {
      return (
        <div className="text-center py-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-lg font-medium text-gray-700">
              {isOpponentThinking ? 'Opponent is thinking...' : 'Opponent\'s turn'}
            </span>
          </div>
          <p className="text-gray-500">Wait for your turn to select a move</p>
        </div>
      )
    }

    if (!canPlayerMove) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">Battle not active</p>
        </div>
      )
    }

    if (moves.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">No moves available</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="text-center mb-4">
          <p className="text-base sm:text-lg font-medium text-gray-800">Choose your move!</p>
          <p className="text-sm text-gray-600">Select an attack to use against your opponent</p>
        </div>
        
        <div 
          className="grid gap-3"
          role="group"
          aria-labelledby="move-selection-title"
          aria-describedby="move-selection-description"
        >
          <div id="move-selection-title" className="sr-only">Available battle moves</div>
          <div id="move-selection-description" className="sr-only">
            Choose a move to attack your opponent. Each move has different power and type effectiveness.
          </div>
          {moves.map((move, index) => (
            <MoveButton
              key={`${move.name}-${index}`}
              move={move}
              onSelect={() => onMoveSelect(move)}
              disabled={!canPlayerMove}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl rounded-3xl">
      <CardHeader className="pb-3">
        <CardTitle id="battle-actions-title" className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sword className="w-5 h-5 text-red-500" aria-hidden="true" />
            Battle Actions
          </div>
          {onResetBattle && battleActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResetDialog(true)}
              className="text-gray-600 hover:text-red-600 hover:border-red-300 rounded-xl"
              aria-label="Reset battle and return to creature selection"
            >
              <RotateCcw className="w-4 h-4 mr-1" aria-hidden="true" />
              Reset
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderContent()}
        
        {/* Reset Confirmation Dialog */}
        {onResetBattle && (
          <BattleResetDialog
            isOpen={showResetDialog}
            onClose={() => setShowResetDialog(false)}
            onConfirm={onResetBattle}
            battleActive={battleActive}
          />
        )}
      </CardContent>
    </Card>
  )
}

export default BattleActions