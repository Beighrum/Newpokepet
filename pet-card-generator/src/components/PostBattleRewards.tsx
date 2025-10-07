import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Gem, TrendingUp, Star, Award, Coins } from 'lucide-react'
import { PostBattleRewards as PostBattleRewardsType } from '@/types/battle'

interface PostBattleRewardsProps {
  rewards: PostBattleRewardsType
  winner: "player" | "opponent" | null
  isPvP?: boolean
  trainerLevel?: number
  className?: string
  onError?: (error: string) => void
}

const PostBattleRewards: React.FC<PostBattleRewardsProps> = ({
  rewards,
  winner,
  isPvP = false,
  trainerLevel = 1,
  className = "",
  onError
}) => {
  // Only show rewards for player victories
  if (winner !== 'player') {
    return null
  }

  // Validate rewards data with error handling
  try {
    if (!rewards || typeof rewards !== 'object') {
      throw new Error('Invalid rewards data')
    }

    if (typeof rewards.experienceGained !== 'number' || rewards.experienceGained < 0) {
      throw new Error('Invalid experience data')
    }

    if (typeof rewards.gemsEarned !== 'number' || rewards.gemsEarned < 0 ||
        typeof rewards.gemsStolen !== 'number' || rewards.gemsStolen < 0) {
      throw new Error('Invalid gem data')
    }
  } catch (error) {
    console.error('PostBattleRewards validation error:', error)
    onError?.(error instanceof Error ? error.message : 'Invalid reward data')
    return null
  }

  const hasGemRewards = rewards.gemsEarned > 0 || rewards.gemsStolen > 0
  const totalGems = rewards.gemsEarned + rewards.gemsStolen

  return (
    <Card className={`backdrop-blur-sm bg-white/90 border-0 shadow-lg rounded-2xl ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-center gap-2 text-lg text-center">
          <Award className="w-6 h-6 text-yellow-500" />
          <span className="bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
            Battle Rewards
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Experience Rewards */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <span className="font-semibold text-blue-700">Experience Gained</span>
            </div>
            <Badge className="bg-blue-500 text-white">
              +{rewards.experienceGained} XP
            </Badge>
          </div>
          
          {rewards.levelUp && (
            <div className="flex items-center gap-2 mt-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-yellow-700">
                🎉 Level Up! Check your stats!
              </span>
            </div>
          )}
        </div>

        {/* Gem Rewards */}
        {hasGemRewards && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Gem className="w-5 h-5 text-purple-500" />
                <span className="font-semibold text-purple-700">Gem Rewards</span>
              </div>
              <Badge className="bg-purple-500 text-white text-lg px-3 py-1">
                +{totalGems} 💎
              </Badge>
            </div>
            
            <div className="space-y-2">
              {/* Victory Gems (AI battles) */}
              {rewards.gemsEarned > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-green-500" />
                    <span className="text-green-700">Victory Reward</span>
                  </div>
                  <span className="font-medium text-green-700">+{rewards.gemsEarned} 💎</span>
                </div>
              )}
              
              {/* Stolen Gems (PvP battles) */}
              {rewards.gemsStolen > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-orange-500" />
                    <span className="text-orange-700">Gems Stolen</span>
                  </div>
                  <span className="font-medium text-orange-700">+{rewards.gemsStolen} 💎</span>
                </div>
              )}
              
              {/* Trainer Level Bonus Indicator */}
              {trainerLevel > 1 && (
                <div className="flex items-center justify-between text-xs pt-2 border-t border-purple-200">
                  <span className="text-purple-600">Trainer Level {trainerLevel} Bonus Applied</span>
                  <span className="text-purple-600">✨</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Battle Type Indicator */}
        <div className="text-center">
          <Badge 
            variant="outline" 
            className={`text-xs ${
              isPvP 
                ? 'border-red-300 text-red-600 bg-red-50' 
                : 'border-blue-300 text-blue-600 bg-blue-50'
            }`}
          >
            {isPvP ? '⚔️ PvP Battle' : '🤖 AI Battle'}
          </Badge>
        </div>

        {/* Reward Summary */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border border-green-200">
          <div className="text-center">
            <div className="text-sm text-green-700 mb-1">Total Rewards Earned</div>
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span className="font-bold text-blue-700">{rewards.experienceGained} XP</span>
              </div>
              {hasGemRewards && (
                <div className="flex items-center gap-1">
                  <Gem className="w-4 h-4 text-purple-500" />
                  <span className="font-bold text-purple-700">{totalGems} Gems</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Motivational Message */}
        <div className="text-center pt-2">
          <p className="text-xs text-gray-600">
            {rewards.levelUp 
              ? "🌟 Your PokePet is getting stronger!" 
              : hasGemRewards 
                ? "💎 Use your gems to upgrade your PokePet!" 
                : "🎯 Keep battling to earn more rewards!"
            }
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default PostBattleRewards