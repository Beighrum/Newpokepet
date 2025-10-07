import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sword, Shield, Zap } from 'lucide-react'
import { useCards } from '@/hooks/use-cards'
import { useBattleState } from '@/hooks/useBattleState'
import CreatureSelection from '@/components/CreatureSelection'
import SelectionActions from '@/components/SelectionActions'
import BattleArena from '@/components/BattleArena'
import BattleActions from '@/components/BattleActions'
import BattleLog from '@/components/BattleLog'
import BattleResults from '@/components/BattleResults'
import BattleErrorBoundary from '@/components/BattleErrorBoundary'
import Navbar from '../components/Navbar'

const BattlePage = () => {
  const { cards, loading } = useCards()
  const { 
    battleState, 
    selectPlayerCreature, 
    selectOpponentCreature, 
    startBattle,
    executePlayerMove,
    getPlayerMoves,
    canPlayerMove,
    resetBattle,
    resetForRematch,
    clearBattleState,
    isBattleComplete
  } = useBattleState()
  
  const [selectedCard, setSelectedCard] = useState(null)

  const handleCardSelect = (card) => {
    try {
      if (!card || !card.id) {
        console.error('Invalid card selected')
        return
      }

      // Validate card has minimum required data
      if (!card.name) {
        console.error('Card missing required name field')
        return
      }

      setSelectedCard(card)
      selectPlayerCreature(card)
    } catch (error) {
      console.error('Error selecting card:', error)
      setSelectedCard(null)
    }
  }

  const handleStartBattle = (playerCard, opponentCard) => {
    try {
      // Validate cards have required data
      if (!playerCard || !opponentCard) {
        console.error('Invalid cards provided for battle')
        return
      }

      // Ensure cards have basic battle data
      const validatedPlayerCard = {
        ...playerCard,
        stats: playerCard.stats || { hp: 100, attack: 50, defense: 50, speed: 50 },
        moves: playerCard.moves || [
          { name: 'Tackle', power: 40, type: 'normal' },
          { name: 'Quick Attack', power: 30, type: 'normal' }
        ]
      }

      const validatedOpponentCard = {
        ...opponentCard,
        stats: opponentCard.stats || { hp: 100, attack: 50, defense: 50, speed: 50 },
        moves: opponentCard.moves || [
          { name: 'Tackle', power: 40, type: 'normal' },
          { name: 'Quick Attack', power: 30, type: 'normal' }
        ]
      }

      // Select opponent and start battle
      selectOpponentCreature([validatedOpponentCard], validatedPlayerCard.id)
      startBattle()
    } catch (error) {
      console.error('Error starting battle:', error)
      // Could add user-facing error message here
    }
  }

  const handleMoveSelect = (move) => {
    try {
      if (!move || !move.name) {
        console.error('Invalid move selected')
        return
      }

      // Ensure move has required properties
      const validatedMove = {
        name: move.name,
        power: move.power || 40,
        type: move.type || 'normal'
      }

      executePlayerMove(validatedMove)
    } catch (error) {
      console.error('Error executing move:', error)
      // Could add user-facing error message here
    }
  }

  const handleNewBattle = () => {
    try {
      // Clear battle state and return to creature selection
      clearBattleState()
      setSelectedCard(null)
    } catch (error) {
      console.error('Error starting new battle:', error)
      // Force reset to initial state
      setSelectedCard(null)
    }
  }

  const handlePlayAgain = () => {
    try {
      // Reset for rematch with same creatures
      resetForRematch()
    } catch (error) {
      console.error('Error resetting for rematch:', error)
      // Fallback to new battle
      handleNewBattle()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your PokePets...</p>
        </div>
      </div>
    )
  }

  // Error state for when cards fail to load or other critical errors
  if (!cards && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 bg-clip-text text-transparent mb-4">
              Battle Arena
            </h1>
            <Card className="max-w-md mx-auto backdrop-blur-sm bg-white/80 border-0 shadow-xl rounded-3xl">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sword className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Unable to Load Battle System</h3>
                <p className="text-gray-600 mb-4">
                  There was an issue loading your PokePets. Please try refreshing the page or check your connection.
                </p>
                <Button 
                  onClick={() => window.location.reload()} 
                  className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <BattleErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 bg-clip-text text-transparent mb-4">
            Battle Arena
          </h1>
          <p className="text-gray-600 text-lg">Challenge other trainers and test your PokePets in epic battles</p>
        </div>

        {/* Conditional content based on battle phase */}
        {battleState.battlePhase === 'selection' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Battle Setup */}
            <Card 
              className="backdrop-blur-sm bg-white/80 border-0 shadow-xl rounded-3xl"
              role="region"
              aria-labelledby="battle-setup-title"
            >
              <CardHeader>
                <CardTitle id="battle-setup-title" className="flex items-center gap-2">
                  <Sword className="w-5 h-5 text-red-500" aria-hidden="true" />
                  Battle Setup
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CreatureSelection
                  cards={cards}
                  selectedCard={selectedCard}
                  onCardSelect={handleCardSelect}
                />
                <div className="mt-6">
                  <SelectionActions
                    selectedCard={selectedCard}
                    availableCards={cards}
                    onStartBattle={handleStartBattle}
                    disabled={battleState.battleActive}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Battle History */}
            <Card 
              className="backdrop-blur-sm bg-white/80 border-0 shadow-xl rounded-3xl"
              role="region"
              aria-labelledby="battle-history-title"
            >
              <CardHeader>
                <CardTitle id="battle-history-title">Recent Battles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4" role="list" aria-label="Recent battle results">
                  {[
                    { opponent: "Thunder Cat", result: "Victory", xp: "+15 XP" },
                    { opponent: "Ice Wolf", result: "Defeat", xp: "+5 XP" },
                    { opponent: "Earth Bear", result: "Victory", xp: "+12 XP" }
                  ].map((battle, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                      role="listitem"
                      aria-label={`Battle against ${battle.opponent}: ${battle.result}, earned ${battle.xp}`}
                    >
                      <div>
                        <p className="font-medium">vs {battle.opponent}</p>
                        <p className="text-sm text-gray-600">{battle.xp}</p>
                      </div>
                      <Badge 
                        className={battle.result === 'Victory' ? 'bg-green-500' : 'bg-red-500'}
                        aria-label={`Result: ${battle.result}`}
                      >
                        {battle.result}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Battle Arena - shown during battle and results phases */}
        {(battleState.battlePhase === 'battle' || battleState.battlePhase === 'results') && (
          <div className="space-y-6 lg:space-y-8">
            {/* Battle Arena */}
            <Card 
              className="backdrop-blur-sm bg-white/80 border-0 shadow-xl rounded-3xl"
              role="region"
              aria-labelledby="battle-arena-title"
              aria-live="polite"
              aria-atomic="true"
            >
              <CardContent className="p-4 sm:p-6">
                <BattleArena
                  playerCreature={battleState.playerCreature}
                  opponentCreature={battleState.opponentCreature}
                  currentTurn={battleState.currentTurn}
                  isOpponentThinking={battleState.isOpponentThinking}
                  lastMove={battleState.lastMove}
                  battlePhase={battleState.battlePhase}
                  winner={battleState.winner}
                />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Battle Actions */}
              <div role="region" aria-labelledby="battle-actions-title">
                <BattleActions
                  moves={getPlayerMoves()}
                  canPlayerMove={canPlayerMove()}
                  onMoveSelect={handleMoveSelect}
                  currentTurn={battleState.currentTurn}
                  isOpponentThinking={battleState.isOpponentThinking}
                  onResetBattle={handleNewBattle}
                  battleActive={battleState.battleActive}
                />
              </div>

              {/* Battle Log and Results */}
              <div className="space-y-4" role="region" aria-labelledby="battle-log-title">
                <BattleLog
                  battleLog={battleState.battleLog}
                  winner={battleState.winner}
                  battleActive={battleState.battleActive}
                />
                
                {/* Enhanced Battle Results */}
                {isBattleComplete() && (
                  <div role="region" aria-labelledby="battle-results-title" aria-live="assertive">
                    <BattleResults
                      winner={battleState.winner}
                      playerCreature={battleState.playerCreature}
                      opponentCreature={battleState.opponentCreature}
                      onNewBattle={handleNewBattle}
                      onPlayAgain={handlePlayAgain}
                      battleLog={battleState.battleLog}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Battle Tips */}
        <Card 
          className="mt-6 lg:mt-8 backdrop-blur-sm bg-white/80 border-0 shadow-xl rounded-3xl"
          role="region"
          aria-labelledby="battle-tips-title"
        >
          <CardHeader>
            <CardTitle id="battle-tips-title">Battle Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
              <div className="text-center p-4" role="article" aria-labelledby="tip-1-title">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3" aria-hidden="true">
                  <Sword className="w-6 h-6 text-red-500" />
                </div>
                <h4 id="tip-1-title" className="font-semibold mb-2">Type Advantage</h4>
                <p className="text-sm text-gray-600">Fire beats Grass, Water beats Fire, Grass beats Water</p>
              </div>
              <div className="text-center p-4" role="article" aria-labelledby="tip-2-title">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3" aria-hidden="true">
                  <Shield className="w-6 h-6 text-blue-500" />
                </div>
                <h4 id="tip-2-title" className="font-semibold mb-2">Level Matters</h4>
                <p className="text-sm text-gray-600">Higher level PokePets have better stats and abilities</p>
              </div>
              <div className="text-center p-4" role="article" aria-labelledby="tip-3-title">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3" aria-hidden="true">
                  <Zap className="w-6 h-6 text-yellow-500" />
                </div>
                <h4 id="tip-3-title" className="font-semibold mb-2">Strategy</h4>
                <p className="text-sm text-gray-600">Use special abilities at the right moment to win</p>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </BattleErrorBoundary>
  )
}

export default BattlePage