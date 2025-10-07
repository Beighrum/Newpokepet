import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Trophy, 
  Star, 
  Gem, 
  TrendingUp, 
  Award, 
  Sparkles, 
  X,
  Coins
} from 'lucide-react'
import { PostBattleRewards } from '@/types/battle'

interface BattleRewardsModalProps {
  isOpen: boolean
  onClose: () => void
  rewards: PostBattleRewards
  petName: string
  className?: string
  onShowLevelUp?: () => void
}

const BattleRewardsModal: React.FC<BattleRewardsModalProps> = ({
  isOpen,
  onClose,
  rewards,
  petName,
  className = "",
  onShowLevelUp
}) => {
  const [showAnimation, setShowAnimation] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Trigger animation after modal opens
      const timer = setTimeout(() => setShowAnimation(true), 100)
      return () => clearTimeout(timer)
    } else {
      setShowAnimation(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const hasGemRewards = rewards.gemsEarned > 0 || rewards.gemsStolen > 0
  const totalGems = rewards.gemsEarned + rewards.gemsStolen

  const handleClose = () => {
    onClose()
    // If pet leveled up, show level up modal after a short delay
    if (rewards.levelUp && onShowLevelUp) {
      setTimeout(() => {
        onShowLevelUp()
      }, 300) // Small delay for smooth transition
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className={`w-full max-w-md mx-auto bg-white shadow-2xl rounded-3xl transform transition-all duration-500 ${
        showAnimation ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      } ${className}`}>
        
        {/* Header */}
        <CardHeader className="text-center pb-4 relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="absolute right-2 top-2 h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-8 h-8 text-yellow-500 animate-bounce" />
            <Sparkles className="w-6 h-6 text-purple-500 animate-pulse" />
          </div>
          
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
            Victory Rewards!
          </CardTitle>
          
          <p className="text-gray-600 text-sm">
            {petName} earned rewards from battle!
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          
          {/* Experience Reward */}
          <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200 transform transition-all duration-700 ${
            showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 rounded-full p-2">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-blue-800 text-lg">Experience Gained</h3>
                  <p className="text-blue-600 text-sm">Your pet is getting stronger!</p>
                </div>
              </div>
              <Badge className="bg-blue-500 text-white text-xl px-4 py-2 animate-pulse">
                +{rewards.experienceGained} XP
              </Badge>
            </div>
            
            {rewards.levelUp && (
              <div className="bg-yellow-100 border border-yellow-300 rounded-xl p-3 mt-3">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-600" />
                  <span className="font-bold text-yellow-800">🎉 LEVEL UP!</span>
                </div>
                <p className="text-yellow-700 text-sm mt-1">
                  Your pet's stats have increased! Check your profile to see the improvements.
                </p>
              </div>
            )}
          </div>

          {/* Gem Rewards */}
          {hasGemRewards && (
            <div className={`bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200 transform transition-all duration-700 delay-200 ${
              showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-500 rounded-full p-2">
                    <Gem className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-purple-800 text-lg">Gems Earned</h3>
                    <p className="text-purple-600 text-sm">Use gems to upgrade your pet!</p>
                  </div>
                </div>
                <Badge className="bg-purple-500 text-white text-xl px-4 py-2 animate-pulse">
                  +{totalGems} 💎
                </Badge>
              </div>
              
              <div className="space-y-2">
                {rewards.gemsEarned > 0 && (
                  <div className="flex items-center justify-between text-sm bg-green-100 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-green-600" />
                      <span className="text-green-800 font-medium">Victory Bonus</span>
                    </div>
                    <span className="font-bold text-green-800">+{rewards.gemsEarned} 💎</span>
                  </div>
                )}
                
                {rewards.gemsStolen > 0 && (
                  <div className="flex items-center justify-between text-sm bg-orange-100 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-orange-600" />
                      <span className="text-orange-800 font-medium">Gems Stolen</span>
                    </div>
                    <span className="font-bold text-orange-800">+{rewards.gemsStolen} 💎</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className={`bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border-2 border-green-200 transform transition-all duration-700 delay-400 ${
            showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}>
            <div className="flex items-center justify-center gap-2 mb-3">
              <Award className="w-5 h-5 text-green-600" />
              <span className="font-bold text-green-800">Battle Complete!</span>
            </div>
            
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-700">{rewards.experienceGained}</div>
                <div className="text-xs text-blue-600">Experience</div>
              </div>
              
              {hasGemRewards && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-700">{totalGems}</div>
                  <div className="text-xs text-purple-600">Gems</div>
                </div>
              )}
              
              {rewards.levelUp && (
                <div className="text-center">
                  <div className="text-2xl">🌟</div>
                  <div className="text-xs text-yellow-600">Level Up!</div>
                </div>
              )}
            </div>
          </div>

          {/* Close Button */}
          <div className="pt-4">
            <Button 
              onClick={handleClose}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl"
            >
              <Trophy className="w-5 h-5 mr-2" />
              Awesome!
            </Button>
          </div>

          {/* Motivational Message */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {rewards.levelUp 
                ? "🌟 Your pet is evolving! Keep battling to unlock new abilities!" 
                : hasGemRewards 
                  ? "💎 Spend your gems wisely to make your pet even stronger!" 
                  : "🎯 Every battle makes you stronger. Keep it up!"
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default BattleRewardsModal