import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trophy, Skull, RotateCcw, Play, Star, Target, TrendingUp, AlertTriangle, Zap, Award } from 'lucide-react'
import { BattleCreature, PostBattleRewards as PostBattleRewardsType } from '@/types/battle'

import FireworksAnimation from './FireworksAnimation'
import LevelUpModal from './LevelUpModal'
import PostBattleRewards from './PostBattleRewards'
import PostBattleErrorBoundary from './PostBattleErrorBoundary'
import BattleRewardsModal from './BattleRewardsModal'

interface BattleResultsProps {
  winner: "player" | "opponent" | null
  playerCreature: BattleCreature | null
  opponentCreature: BattleCreature | null
  onNewBattle: () => void
  onPlayAgain?: () => void
  onNextBattle?: () => void
  battleLog: string[]
  celebrationActive?: boolean
  onStartCelebration?: () => void
  postBattleRewards?: PostBattleRewardsType | null
  isPvP?: boolean
  trainerLevel?: number
}

const BattleResults: React.FC<BattleResultsProps> = ({
  winner,
  playerCreature,
  opponentCreature,
  onNewBattle,
  onPlayAgain,
  onNextBattle,
  battleLog,
  celebrationActive = false,
  onStartCelebration,
  postBattleRewards,
  isPvP = false,
  trainerLevel = 1
}) => {

  const [fireworksActive, setFireworksActive] = useState(false)
  const [showLevelUpModal, setShowLevelUpModal] = useState(false)
  const [showRewardsModal, setShowRewardsModal] = useState(false)
  const [rewardsModalShown, setRewardsModalShown] = useState(false)
  const [levelUpModalShown, setLevelUpModalShown] = useState(false)
  const [animationError, setAnimationError] = useState<string | null>(null)
  const [rewardsError, setRewardsError] = useState<string | null>(null)
  const [networkError, setNetworkError] = useState<string | null>(null)

  // Trigger fireworks animation for player victories with error handling
  useEffect(() => {
    if (winner === 'player' && !fireworksActive) {
      try {
        // Start fireworks animation
        setFireworksActive(true)
        
        // Also trigger celebration in battle state if callback provided
        onStartCelebration?.()
        
        // Clear any previous animation errors
        setAnimationError(null)
      } catch (error) {
        console.error('Failed to start fireworks animation:', error)
        setAnimationError('Animation failed to start')
        setFireworksActive(false)
      }
    }
  }, [winner, fireworksActive, onStartCelebration])

  // Handle fireworks completion with error handling
  const handleFireworksComplete = () => {
    try {
      setFireworksActive(false)
      setAnimationError(null)
    } catch (error) {
      console.error('Error during fireworks cleanup:', error)
      setAnimationError('Animation cleanup failed')
      setFireworksActive(false)
    }
  }

  // Handle fireworks error
  const handleFireworksError = (error: string) => {
    console.error('Fireworks animation error:', error)
    setAnimationError(error)
    setFireworksActive(false)
  }

  // Reset modal flags when battle results change (new battle)
  useEffect(() => {
    setRewardsModalShown(false)
    setShowRewardsModal(false)
    setShowLevelUpModal(false)
    setLevelUpModalShown(false)
  }, [winner, playerCreature?.card.id, opponentCreature?.card.id])

  // Show rewards modal immediately when player wins (only once per battle)
  useEffect(() => {
    if (winner === 'player' && postBattleRewards && !rewardsModalShown) {
      try {
        // Show rewards modal after a short delay to let battle results render
        const timer = setTimeout(() => {
          setShowRewardsModal(true)
          setRewardsModalShown(true) // Mark as shown to prevent re-showing
          setRewardsError(null)
        }, 1000) // Show after 1 second
        
        return () => clearTimeout(timer)
      } catch (error) {
        console.error('Failed to show rewards modal:', error)
        setRewardsError('Failed to display rewards')
      }
    }
  }, [winner, postBattleRewards, rewardsModalShown])

  // Handle showing level up modal (triggered by rewards modal)
  const handleShowLevelUp = () => {
    if (!levelUpModalShown && postBattleRewards?.levelUp && postBattleRewards.statIncreases) {
      setShowLevelUpModal(true)
      setLevelUpModalShown(true)
    }
  }

  // Handle level up modal close with error handling
  const handleLevelUpModalClose = () => {
    try {
      setShowLevelUpModal(false)
      setRewardsError(null)
    } catch (error) {
      console.error('Error closing level up modal:', error)
      setRewardsError('Failed to close level up modal')
      // Force close the modal even if there's an error
      setShowLevelUpModal(false)
    }
  }

  // Handle rewards calculation errors
  const handleRewardsError = (error: string) => {
    console.error('Post-battle rewards error:', error)
    setRewardsError(error)
  }



  // Check battle log for network error messages
  useEffect(() => {
    const hasNetworkError = battleLog.some(message => 
      message.includes('Network error') || 
      message.includes('network') ||
      message.includes('connection')
    )
    
    if (hasNetworkError && !networkError) {
      setNetworkError('Network issues detected during reward processing')
    }
  }, [battleLog, networkError])

  // Clear all errors
  const clearErrors = () => {
    setAnimationError(null)
    setRewardsError(null)
    setNetworkError(null)
  }

  if (!winner || !playerCreature || !opponentCreature) {
    return null
  }

  const isPlayerWinner = winner === 'player'
  const winnerCreature = isPlayerWinner ? playerCreature : opponentCreature
  const loserCreature = isPlayerWinner ? opponentCreature : playerCreature

  // Calculate battle statistics
  const totalMoves = battleLog.filter(msg => msg.includes('used')).length
  const damageDealt = battleLog
    .filter(msg => msg.includes('Dealt') && msg.includes('damage!'))
    .reduce((total, msg) => {
      const match = msg.match(/Dealt (\d+) damage!/)
      return total + (match ? parseInt(match[1]) : 0)
    }, 0)

  return (
    <>
      {/* Error Display */}
      {(animationError || rewardsError || networkError) && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              <div className="flex-1">
                <h4 className="font-medium">Post-Battle Error</h4>
                <div className="text-sm space-y-1">
                  {animationError && <p>Animation: {animationError}</p>}
                  {rewardsError && <p>Rewards: {rewardsError}</p>}
                  {networkError && <p>Network: {networkError}</p>}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearErrors}
                className="text-red-700 border-red-300 hover:bg-red-100"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fireworks Animation - only for player victories with error fallback */}
      {winner === 'player' && !animationError && (
        <FireworksAnimation
          isActive={fireworksActive || celebrationActive}
          duration={4000}
          onComplete={handleFireworksComplete}
          onError={handleFireworksError}
        />
      )}
      
      <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl rounded-3xl">
      <CardHeader className="text-center pb-4">
        <CardTitle 
          id="battle-results-title" 
          className="flex flex-col sm:flex-row items-center justify-center gap-3 text-xl sm:text-2xl"
        >
          {isPlayerWinner ? (
            <>
              <Trophy className="w-8 h-8 text-yellow-500 animate-bounce" aria-hidden="true" />
              <span className="bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                Battle Victory!
              </span>
            </>
          ) : (
            <>
              <Skull className="w-8 h-8 text-red-500" aria-hidden="true" />
              <span className="bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
                Battle Defeat
              </span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Winner Announcement */}
        <div className={`text-center p-6 rounded-xl ${
          isPlayerWinner 
            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200' 
            : 'bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200'
        }`}>
          <div className="mb-4">
            <img
              src={winnerCreature.card.imageUrl || '/placeholder.jpg'}
              alt={winnerCreature.card.name}
              className={`w-20 h-20 rounded-full mx-auto border-4 ${
                isPlayerWinner ? 'border-green-400' : 'border-red-400'
              } shadow-lg`}
            />
          </div>
          
          <Badge className={`text-white text-lg px-6 py-2 mb-3 ${
            isPlayerWinner 
              ? 'bg-gradient-to-r from-green-500 to-green-600' 
              : 'bg-gradient-to-r from-red-500 to-red-600'
          }`}>
            {isPlayerWinner ? '🏆 Winner' : '💀 Defeated'}
          </Badge>
          
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            {winnerCreature.card.name}
          </h3>
          
          <p className={`text-sm font-medium ${
            isPlayerWinner ? 'text-green-700' : 'text-red-700'
          }`}>
            {isPlayerWinner 
              ? 'Congratulations! Your PokePet emerged victorious!' 
              : 'Your opponent proved too strong this time.'
            }
          </p>
        </div>

        {/* Battle Statistics */}
        <div 
          className={`grid grid-cols-1 gap-4 ${
            isPlayerWinner && postBattleRewards ? 'sm:grid-cols-4' : 'sm:grid-cols-3'
          }`}
          role="group"
          aria-labelledby="battle-stats-title"
        >
          <div id="battle-stats-title" className="sr-only">Battle Statistics</div>
          <div 
            className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200"
            role="article"
            aria-label={`Total moves used: ${totalMoves}`}
          >
            <Target className="w-6 h-6 text-blue-500 mx-auto mb-2" aria-hidden="true" />
            <div className="text-lg font-bold text-blue-700">{totalMoves}</div>
            <div className="text-xs text-blue-600">Total Moves</div>
          </div>
          
          <div 
            className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200"
            role="article"
            aria-label={`Total damage dealt: ${damageDealt}`}
          >
            <Star className="w-6 h-6 text-purple-500 mx-auto mb-2" aria-hidden="true" />
            <div className="text-lg font-bold text-purple-700">{damageDealt}</div>
            <div className="text-xs text-purple-600">Damage Dealt</div>
          </div>
          
          <div 
            className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200"
            role="article"
            aria-label={`HP remaining: ${Math.max(loserCreature.maxHP - loserCreature.currentHP, 0)}`}
          >
            <Trophy className="w-6 h-6 text-orange-500 mx-auto mb-2" aria-hidden="true" />
            <div className="text-lg font-bold text-orange-700">
              {Math.max(loserCreature.maxHP - loserCreature.currentHP, 0)}
            </div>
            <div className="text-xs text-orange-600">HP Remaining</div>
          </div>

          {/* Experience Gained - only show for player victories */}
          {isPlayerWinner && postBattleRewards && (
            <div 
              className="text-center p-4 bg-green-50 rounded-lg border border-green-200"
              role="article"
              aria-label={`Experience gained: ${postBattleRewards.experienceGained}`}
            >
              <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-2" aria-hidden="true" />
              <div className="text-lg font-bold text-green-700">
                +{postBattleRewards.experienceGained}
              </div>
              <div className="text-xs text-green-600">
                {postBattleRewards.levelUp ? 'XP + Level Up!' : 'Experience'}
              </div>
            </div>
          )}
        </div>

        {/* Post-Battle Rewards - only show for player victories with error handling */}
        {winner === 'player' && postBattleRewards && !rewardsError && (
          <PostBattleErrorBoundary 
            fallbackMessage="Unable to display detailed rewards, but your progress has been saved."
            onReset={() => setRewardsError(null)}
          >
            <PostBattleRewards
              rewards={postBattleRewards}
              winner={winner}
              isPvP={isPvP}
              trainerLevel={trainerLevel}
              className="mb-4"
              onError={handleRewardsError}
            />
          </PostBattleErrorBoundary>
        )}

        {/* Fallback rewards display if there's an error OR no rewards data */}
        {winner === 'player' && (rewardsError || !postBattleRewards) && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 text-green-700 mb-2">
              <Award className="w-5 h-5" />
              <span className="font-medium">Victory Rewards</span>
            </div>
            {rewardsError ? (
              <>
                <p className="text-sm text-yellow-600 mb-3">
                  Your victory has been recorded, but there was an issue displaying detailed rewards.
                </p>
                <div className="text-sm text-yellow-700">
                  <p>✅ Battle victory confirmed</p>
                  <p>⏳ Rewards may appear after page refresh</p>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-green-600 mb-3">
                  🎉 Congratulations on your victory! You've earned experience and gems.
                </p>
                <div className="text-sm text-green-700">
                  <p>✅ Battle victory confirmed</p>
                  <p>📈 Experience and gems have been added to your account</p>
                  <p>🔄 Detailed rewards will appear in future battles</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Battle Summary */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Battle Summary
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-700 mb-1">Your PokePet</div>
              <div className="text-gray-600">{playerCreature.card.name}</div>
              <div className="text-xs text-gray-500">
                HP: {playerCreature.currentHP}/{playerCreature.maxHP}
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-700 mb-1">Opponent</div>
              <div className="text-gray-600">{opponentCreature.card.name}</div>
              <div className="text-xs text-gray-500">
                HP: {opponentCreature.currentHP}/{opponentCreature.maxHP}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-4">
          {/* Primary Action - Next Battle (for multiplayer flow) */}
          {onNextBattle && (
            <Button 
              onClick={onNextBattle}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl"
            >
              <Zap className="w-5 h-5 mr-2" />
              Next Battle
            </Button>
          )}
          
          {/* Secondary Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={onNewBattle}
              variant="outline"
              className="flex-1 border-2 border-blue-300 hover:border-blue-400 text-blue-600 hover:text-blue-700 py-3 text-lg font-medium transition-all duration-200 rounded-xl"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              New Battle
            </Button>
            
            {onPlayAgain && (
              <Button 
                onClick={onPlayAgain}
                variant="outline"
                className="flex-1 border-2 border-gray-300 hover:border-gray-400 py-3 text-lg font-medium transition-all duration-200 rounded-xl"
              >
                <Play className="w-5 h-5 mr-2" />
                Battle Again
              </Button>
            )}
          </div>
        </div>



        {/* Motivational Message */}
        <div className="text-center pt-2">
          <p className="text-sm text-gray-600">
            {isPlayerWinner 
              ? "🎉 Great job! Ready for your next challenge?" 
              : "💪 Every defeat makes you stronger. Try again!"
            }
          </p>
        </div>
      </CardContent>
    </Card>

    {/* Battle Rewards Modal - Shows first for all victories */}
    {showRewardsModal && playerCreature && postBattleRewards && (
      <BattleRewardsModal
        isOpen={showRewardsModal}
        onClose={() => setShowRewardsModal(false)}
        rewards={postBattleRewards}
        petName={playerCreature.card.name}
        onShowLevelUp={handleShowLevelUp}
      />
    )}

    {/* Level Up Modal with error handling - Shows after rewards modal if leveled up */}
    {showLevelUpModal && playerCreature && postBattleRewards?.statIncreases && !rewardsError && (
      <PostBattleErrorBoundary 
        fallbackMessage="Unable to display level up details, but your pet has leveled up successfully."
        onReset={() => {
          setRewardsError(null)
          setShowLevelUpModal(false)
        }}
      >
        <LevelUpModal
          isOpen={showLevelUpModal}
          onClose={handleLevelUpModalClose}
          petData={playerCreature}
          statIncreases={postBattleRewards.statIncreases}
          experienceGained={postBattleRewards.experienceGained}
          onError={handleRewardsError}
        />
      </PostBattleErrorBoundary>
    )}
    </>
  )
}

export default BattleResults