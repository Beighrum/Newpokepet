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


const BattlePageNew = () => {
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
    isBattleComplete,
    startVictoryCelebration
  } = useBattleState()
  
  const [selectedCard, setSelectedCard] = useState(null)

  const handleCardSelect = (card) => {
    setSelectedCard(card)
    selectPlayerCreature(card)
  }

  const handleStartBattle = (playerCard, opponentCard) => {
    // Select opponent and start battle
    selectOpponentCreature([opponentCard], playerCard.id)
    startBattle()
  }

  const handleMoveSelect = (move) => {
    executePlayerMove(move)
  }

  const handleNewBattle = () => {
    // Clear battle state and return to creature selection
    clearBattleState()
    setSelectedCard(null)
  }

  const handlePlayAgain = () => {
    // Reset for rematch with same creatures
    resetForRematch()
  }

  const handleNextBattle = () => {
    // Keep current player creature, find new opponent
    if (selectedCard) {
      // Find a new random opponent (excluding current player creature)
      const availableOpponents = cards.filter(card => 
        card.id !== selectedCard.id && card.status === "ready"
      )
      
      if (availableOpponents.length > 0) {
        const randomOpponent = availableOpponents[Math.floor(Math.random() * availableOpponents.length)]
        handleStartBattle(selectedCard, randomOpponent)
      } else {
        // No opponents available, go to creature selection
        handleNewBattle()
      }
    } else {
      // No player creature selected, go to creature selection
      handleNewBattle()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your PokePets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-4">
      <div className="max-w-7xl mx-auto">
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

            {/* Battle Actions - Full width during active battle */}
            {battleState.battlePhase === 'battle' && (
              <div className="mb-6 lg:mb-8" role="region" aria-labelledby="battle-actions-title">
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
            )}

            {/* Post-Battle Layout: Side-by-side Battle Log and Results */}
            {isBattleComplete() ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* Battle Log - Left side */}
                <div role="region" aria-labelledby="battle-log-title">
                  <BattleLog
                    battleLog={battleState.battleLog}
                    winner={battleState.winner}
                    battleActive={battleState.battleActive}
                  />
                </div>
                
                {/* Battle Results - Right side */}
                <div role="region" aria-labelledby="battle-results-title" aria-live="assertive">
                  <BattleResults
                    winner={battleState.winner}
                    playerCreature={battleState.playerCreature}
                    opponentCreature={battleState.opponentCreature}
                    onNewBattle={handleNewBattle}
                    onPlayAgain={handlePlayAgain}
                    onNextBattle={handleNextBattle}
                    battleLog={battleState.battleLog}
                    celebrationActive={battleState.celebrationActive}
                    onStartCelebration={startVictoryCelebration}
                    postBattleRewards={battleState.postBattleRewards}
                  />
                </div>
              </div>
            ) : (
              /* During Battle: Show only Battle Log */
              <div role="region" aria-labelledby="battle-log-title">
                <BattleLog
                  battleLog={battleState.battleLog}
                  winner={battleState.winner}
                  battleActive={battleState.battleActive}
                />
              </div>
            )}
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
  )
}

export default BattlePageNew