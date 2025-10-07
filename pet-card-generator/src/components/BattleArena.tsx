import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Heart, Shield, Sword, Zap, Clock, Target } from 'lucide-react'
import { BattleCreature } from '@/types/battle'
import DamageIndicator from './DamageIndicator'

interface BattleArenaProps {
  playerCreature: BattleCreature | null
  opponentCreature: BattleCreature | null
  currentTurn: "player" | "opponent"
  isOpponentThinking: boolean
  lastMove?: {
    moveName: string
    damage: number
    target: 'player' | 'opponent'
  } | null
  battlePhase: "selection" | "battle" | "results"
  winner: "player" | "opponent" | null
}

const CreatureDisplay: React.FC<{
  creature: BattleCreature
  isPlayer: boolean
  isActive: boolean
  isThinking?: boolean
  lastDamage?: number
  showDamage?: boolean
  onDamageAnimationComplete?: () => void
  battlePhase: "selection" | "battle" | "results"
  isWinner?: boolean
}> = ({ 
  creature, 
  isPlayer, 
  isActive, 
  isThinking = false, 
  lastDamage = 0,
  showDamage = false,
  onDamageAnimationComplete,
  battlePhase,
  isWinner = false
}) => {
  const hpPercentage = (creature.currentHP / creature.maxHP) * 100
  const stats = creature.card.stats || { attack: 50, defense: 50, speed: 50, hp: 100 }
  
  // Determine HP bar color based on percentage
  const getHPColor = (percentage: number) => {
    if (percentage > 60) return 'bg-green-500'
    if (percentage > 30) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className={`relative ${isPlayer ? 'order-1' : 'order-2'}`}>
      {/* Turn indicator */}
      {isActive && battlePhase === 'battle' && (
        <div className={`absolute -top-2 ${isPlayer ? 'left-4' : 'right-4'} z-10`}>
          <Badge className={`text-white animate-pulse ${
            isThinking ? 'bg-orange-500' : 'bg-blue-500'
          }`}>
            <div className="flex items-center gap-1">
              {isThinking ? (
                <>
                  <Clock className="w-3 h-3" />
                  Thinking...
                </>
              ) : (
                <>
                  <Target className="w-3 h-3" />
                  Your Turn
                </>
              )}
            </div>
          </Badge>
        </div>
      )}

      {/* Winner indicator */}
      {battlePhase === 'results' && isWinner && (
        <div className={`absolute -top-2 ${isPlayer ? 'left-4' : 'right-4'} z-10`}>
          <Badge className="bg-yellow-500 text-white animate-bounce">
            🏆 Winner!
          </Badge>
        </div>
      )}

      {/* Damage indicator */}
      {showDamage && lastDamage > 0 && (
        <DamageIndicator
          damage={lastDamage}
          isVisible={showDamage}
          onAnimationComplete={onDamageAnimationComplete || (() => {})}
          position={isPlayer ? 'left' : 'right'}
        />
      )}
      
      <Card className={`backdrop-blur-sm bg-white/80 border-0 shadow-xl rounded-3xl transition-all duration-300 ${
        battlePhase === 'results' && isWinner 
          ? 'shadow-2xl shadow-yellow-200/50 ring-2 ring-yellow-400/50' 
          : isActive 
            ? 'shadow-2xl ring-2 ring-blue-400/50' 
            : 'shadow-lg'
      } ${showDamage ? 'animate-pulse' : ''}`}>
        <CardContent className="p-6">
          {/* Creature Info Header */}
          <div className={`flex items-center justify-between mb-4 ${
            isPlayer ? 'flex-row' : 'flex-row-reverse'
          }`}>
            <div className={`text-center ${isPlayer ? 'text-left' : 'text-right'}`}>
              <h3 
                id={isPlayer ? 'player-creature-title' : 'opponent-creature-title'}
                className="text-lg sm:text-xl font-bold text-gray-800"
              >
                {creature.card.name}
              </h3>
              <p className="text-sm text-gray-600 capitalize">
                {creature.card.element || 'Normal'} Type
              </p>
            </div>
            
            {/* Stage badge */}
            <Badge variant="outline" className="bg-white/80 capitalize">
              {creature.card.stage || 'Baby'}
            </Badge>
          </div>

          {/* Creature Image */}
          <div className="flex justify-center mb-4">
            <div className={`relative w-32 h-32 rounded-full overflow-hidden border-4 transition-all duration-300 ${
              battlePhase === 'results' && isWinner
                ? 'border-yellow-400 shadow-xl shadow-yellow-200/50'
                : isActive 
                  ? 'border-blue-400 shadow-xl shadow-blue-200/50' 
                  : 'border-gray-300'
            } ${showDamage ? 'animate-shake' : ''}`}>
              <img
                src={creature.card.imageUrl || '/placeholder.jpg'}
                alt={creature.card.name}
                className="w-full h-full object-cover"
              />
              {/* Thinking overlay */}
              {isThinking && (
                <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>

          {/* HP Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4 text-red-500" aria-hidden="true" />
                <span className="text-sm font-medium">HP</span>
              </div>
              <span className="text-sm font-mono">
                {creature.currentHP}/{creature.maxHP}
              </span>
            </div>
            
            <div className="relative">
              <Progress 
                value={hpPercentage} 
                className="h-3 bg-gray-200"
                aria-label={`${creature.card.name} health: ${creature.currentHP} out of ${creature.maxHP} HP`}
                role="progressbar"
                aria-valuenow={creature.currentHP}
                aria-valuemin={0}
                aria-valuemax={creature.maxHP}
              />
              <div 
                className={`absolute top-0 left-0 h-3 rounded-full transition-all duration-500 ${getHPColor(hpPercentage)}`}
                style={{ width: `${hpPercentage}%` }}
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Stats Display */}
          <div className="grid grid-cols-3 gap-2 text-xs" role="group" aria-label={`${creature.card.name} battle statistics`}>
            <div className="flex items-center gap-1 bg-red-50 p-2 rounded" aria-label={`Attack: ${stats.attack}`}>
              <Sword className="w-3 h-3 text-red-500" aria-hidden="true" />
              <span className="font-medium">{stats.attack}</span>
            </div>
            <div className="flex items-center gap-1 bg-blue-50 p-2 rounded" aria-label={`Defense: ${stats.defense}`}>
              <Shield className="w-3 h-3 text-blue-500" aria-hidden="true" />
              <span className="font-medium">{stats.defense}</span>
            </div>
            <div className="flex items-center gap-1 bg-yellow-50 p-2 rounded" aria-label={`Speed: ${stats.speed}`}>
              <Zap className="w-3 h-3 text-yellow-500" aria-hidden="true" />
              <span className="font-medium">{stats.speed}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const BattleArena: React.FC<BattleArenaProps> = ({
  playerCreature,
  opponentCreature,
  currentTurn,
  isOpponentThinking,
  lastMove,
  battlePhase,
  winner
}) => {
  const [showPlayerDamage, setShowPlayerDamage] = useState(false)
  const [showOpponentDamage, setShowOpponentDamage] = useState(false)
  const [playerDamage, setPlayerDamage] = useState(0)
  const [opponentDamage, setOpponentDamage] = useState(0)

  // Handle damage display when lastMove changes
  useEffect(() => {
    if (lastMove && lastMove.damage > 0) {
      if (lastMove.target === 'player') {
        setPlayerDamage(lastMove.damage)
        setShowPlayerDamage(true)
      } else if (lastMove.target === 'opponent') {
        setOpponentDamage(lastMove.damage)
        setShowOpponentDamage(true)
      }
    }
  }, [lastMove])

  // Add shake animation styles
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
        20%, 40%, 60%, 80% { transform: translateX(2px); }
      }
      .animate-shake {
        animation: shake 0.5s ease-in-out;
      }
    `
    document.head.appendChild(style)
    
    return () => {
      document.head.removeChild(style)
    }
  }, [])
  if (!playerCreature || !opponentCreature) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 border-4 border-gray-300 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Preparing battle arena...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Battle Arena Header */}
      <div className="text-center">
        <h2 id="battle-arena-title" className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Battle Arena</h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          <span className={`text-base sm:text-lg font-medium ${
            battlePhase === 'results' && winner === 'player' 
              ? 'text-green-600' 
              : 'text-blue-600'
          }`}>
            {playerCreature.card.name}
          </span>
          <span className="text-xl sm:text-2xl" aria-hidden="true">⚔️</span>
          <span className={`text-base sm:text-lg font-medium ${
            battlePhase === 'results' && winner === 'opponent' 
              ? 'text-green-600' 
              : 'text-red-600'
          }`}>
            {opponentCreature.card.name}
          </span>
        </div>
        
        {/* Battle status indicator */}
        {battlePhase === 'battle' && (
          <div className="mt-2">
            <Badge 
              variant="outline" 
              className="bg-blue-50 text-blue-600 border-blue-200"
              role="status"
              aria-live="polite"
            >
              {currentTurn === 'player' ? 'Your Turn' : 'Opponent\'s Turn'}
            </Badge>
          </div>
        )}
        
        {/* Battle result */}
        {battlePhase === 'results' && winner && (
          <div className="mt-2">
            <Badge 
              className={`text-white text-base sm:text-lg px-4 py-2 ${
                winner === 'player' ? 'bg-green-500' : 'bg-red-500'
              }`}
              role="status"
              aria-live="assertive"
              aria-label={winner === 'player' ? 'Victory! You won the battle!' : 'Defeat! You lost the battle!'}
            >
              {winner === 'player' ? '🏆 Victory!' : '💀 Defeat!'}
            </Badge>
          </div>
        )}
      </div>

      {/* Creatures Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div role="region" aria-labelledby="player-creature-title">
          <CreatureDisplay
            creature={playerCreature}
            isPlayer={true}
            isActive={currentTurn === 'player'}
            lastDamage={playerDamage}
            showDamage={showPlayerDamage}
            onDamageAnimationComplete={() => setShowPlayerDamage(false)}
            battlePhase={battlePhase}
            isWinner={winner === 'player'}
          />
        </div>
        <div role="region" aria-labelledby="opponent-creature-title">
          <CreatureDisplay
            creature={opponentCreature}
            isPlayer={false}
            isActive={currentTurn === 'opponent'}
            isThinking={isOpponentThinking}
            lastDamage={opponentDamage}
            showDamage={showOpponentDamage}
            onDamageAnimationComplete={() => setShowOpponentDamage(false)}
            battlePhase={battlePhase}
            isWinner={winner === 'opponent'}
          />
        </div>
      </div>
    </div>
  )
}

export default BattleArena