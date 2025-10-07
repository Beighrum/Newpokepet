// Unit tests for gem reward and theft calculation system

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calculateGemReward,
  calculateGemTheft,
  generateAIGemReward,
  validateGemReward,
  calculateTotalGemRewards,
  determineBattleDifficultyForGems,
  getTrainerLevelMultiplier
} from './gemCalculation'
import { BattleCreature } from '@/types/battle'
import { Card } from '@/hooks/use-cards'

// Mock card data for testing
const mockCard: Card = {
  id: "test-card",
  name: "Test Pet",
  status: "ready",
  imageUrl: "/test.png",
  element: "fire",
  rarity: "common",
  stage: "baby",
  xp: 50,
  maxXp: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
  stats: { attack: 60, defense: 50, speed: 70, hp: 80 },
  moves: [
    { name: "Test Move", power: 50, type: "fire" }
  ]
}

describe('Gem Calculation System', () => {
  beforeEach(() => {
    // Reset any mocks before each test
    vi.clearAllMocks()
    // Mock Math.random for consistent AI gem reward testing
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })

  describe('calculateGemReward', () => {
    it('should calculate base gem reward correctly', () => {
      const result = calculateGemReward(1, 'normal', 1)
      
      expect(result.baseReward).toBe(12) // Math.floor((10 + (1 * 2)) * 1.0)
      expect(result.levelMultiplier).toBe(1.0) // Level 1 multiplier
      expect(result.totalEarned).toBe(12) // Math.floor(12 * 1.0)
      expect(result.source).toBe('victory')
    })

    it('should apply trainer level multipliers correctly', () => {
      const level1 = calculateGemReward(1, 'normal', 1)
      const level5 = calculateGemReward(5, 'normal', 1)
      const level10 = calculateGemReward(10, 'normal', 1)
      
      expect(level1.levelMultiplier).toBe(1.0)
      expect(level5.levelMultiplier).toBe(1.4)
      expect(level10.levelMultiplier).toBe(2.0)
      
      expect(level10.totalEarned).toBeGreaterThan(level5.totalEarned)
      expect(level5.totalEarned).toBeGreaterThan(level1.totalEarned)
    })

    it('should apply difficulty multipliers correctly', () => {
      const easy = calculateGemReward(1, 'easy', 1)
      const normal = calculateGemReward(1, 'normal', 1)
      const hard = calculateGemReward(1, 'hard', 1)
      const expert = calculateGemReward(1, 'expert', 1)
      
      expect(easy.baseReward).toBe(9) // Math.floor(12 * 0.8)
      expect(normal.baseReward).toBe(12) // Math.floor(12 * 1.0)
      expect(hard.baseReward).toBe(15) // Math.floor(12 * 1.3)
      expect(expert.baseReward).toBe(19) // Math.floor(12 * 1.6)
      
      expect(expert.totalEarned).toBeGreaterThan(hard.totalEarned)
      expect(hard.totalEarned).toBeGreaterThan(normal.totalEarned)
      expect(normal.totalEarned).toBeGreaterThan(easy.totalEarned)
    })

    it('should scale with opponent level', () => {
      const level1 = calculateGemReward(1, 'normal', 1)
      const level5 = calculateGemReward(1, 'normal', 5)
      const level10 = calculateGemReward(1, 'normal', 10)
      
      expect(level5.baseReward).toBeGreaterThan(level1.baseReward)
      expect(level10.baseReward).toBeGreaterThan(level5.baseReward)
      expect(level10.totalEarned).toBeGreaterThan(level1.totalEarned)
    })

    it('should cap trainer level multiplier at level 10', () => {
      const level10 = calculateGemReward(10, 'normal', 1)
      const level15 = calculateGemReward(15, 'normal', 1)
      const level100 = calculateGemReward(100, 'normal', 1)
      
      expect(level10.levelMultiplier).toBe(2.0)
      expect(level15.levelMultiplier).toBe(2.0)
      expect(level100.levelMultiplier).toBe(2.0)
      
      expect(level15.totalEarned).toBe(level10.totalEarned)
      expect(level100.totalEarned).toBe(level10.totalEarned)
    })

    it('should handle invalid difficulty gracefully', () => {
      const result = calculateGemReward(1, 'invalid' as any, 1)
      
      expect(result.baseReward).toBe(12) // Should use 1.0 multiplier as fallback
      expect(result.totalEarned).toBeGreaterThan(0)
      expect(result.source).toBe('victory')
    })

    it('should handle zero opponent level', () => {
      const result = calculateGemReward(1, 'normal', 0)
      
      expect(result.baseReward).toBe(10) // BASE_GEM_REWARD only
      expect(result.totalEarned).toBe(10)
    })

    it('should handle high opponent levels', () => {
      const result = calculateGemReward(1, 'normal', 50)
      
      expect(result.baseReward).toBe(110) // 10 + (50 * 2)
      expect(result.totalEarned).toBe(110)
    })

    it('should combine all multipliers correctly', () => {
      const result = calculateGemReward(5, 'expert', 10)
      
      const expectedBase = Math.floor((10 + (10 * 2)) * 1.6) // 48
      const expectedTotal = Math.floor(expectedBase * 1.4) // 67
      
      expect(result.baseReward).toBe(expectedBase)
      expect(result.totalEarned).toBe(expectedTotal)
      expect(result.levelMultiplier).toBe(1.4)
    })
  })

  describe('calculateGemTheft', () => {
    it('should calculate basic gem theft correctly', () => {
      const result = calculateGemTheft(100, 1, 'normal')
      
      expect(result.opponentGems).toBe(100)
      expect(result.theftPercentage).toBe(0.15)
      expect(result.maxTheftAmount).toBe(100)
      expect(result.actualStolen).toBe(15) // Math.floor(100 * 0.15)
      expect(result.levelMultiplier).toBe(1.0)
    })

    it('should apply trainer level bonus to theft', () => {
      const level1 = calculateGemTheft(100, 1, 'normal')
      const level5 = calculateGemTheft(100, 5, 'normal')
      const level10 = calculateGemTheft(100, 10, 'normal')
      
      expect(level1.levelMultiplier).toBe(1.0)
      expect(level5.levelMultiplier).toBe(1.08) // 1.0 + ((5-1) * 0.02)
      expect(level10.levelMultiplier).toBe(1.18) // 1.0 + ((10-1) * 0.02)
      
      expect(level10.actualStolen).toBeGreaterThan(level5.actualStolen)
      expect(level5.actualStolen).toBeGreaterThan(level1.actualStolen)
    })

    it('should apply difficulty multipliers to theft', () => {
      const easy = calculateGemTheft(100, 1, 'easy')
      const normal = calculateGemTheft(100, 1, 'normal')
      const hard = calculateGemTheft(100, 1, 'hard')
      const expert = calculateGemTheft(100, 1, 'expert')
      
      expect(expert.actualStolen).toBeGreaterThan(hard.actualStolen)
      expect(hard.actualStolen).toBeGreaterThan(normal.actualStolen)
      expect(normal.actualStolen).toBeGreaterThan(easy.actualStolen)
    })

    it('should cap theft at maximum amount', () => {
      const result = calculateGemTheft(1000, 10, 'expert')
      
      expect(result.actualStolen).toBeLessThanOrEqual(100) // MAX_GEM_THEFT_AMOUNT
      expect(result.actualStolen).toBe(100) // Should hit the cap
    })

    it('should cap theft at opponent gems available', () => {
      const result = calculateGemTheft(50, 10, 'expert')
      
      expect(result.actualStolen).toBeLessThanOrEqual(50)
      // The actual calculation: Math.floor(50 * 0.15) = 7, with level multiplier 1.18 = 8, with expert 1.6 = 12
      // But it's capped by min(max(5, 12), min(100, 50)) = min(12, 50) = 12
      expect(result.actualStolen).toBe(12)
    })

    it('should enforce minimum theft amount', () => {
      const result = calculateGemTheft(10, 1, 'easy')
      
      expect(result.actualStolen).toBeGreaterThanOrEqual(5) // MIN_GEM_THEFT_AMOUNT
    })

    it('should return zero theft for zero opponent gems', () => {
      const result = calculateGemTheft(0, 5, 'normal')
      
      expect(result.actualStolen).toBe(0)
      expect(result.opponentGems).toBe(0)
      expect(result.levelMultiplier).toBe(1.0)
    })

    it('should return zero theft for negative opponent gems', () => {
      const result = calculateGemTheft(-50, 5, 'normal')
      
      expect(result.actualStolen).toBe(0)
      expect(result.opponentGems).toBe(0)
    })

    it('should handle very small opponent gem amounts', () => {
      const result = calculateGemTheft(1, 1, 'normal')
      
      // With 1 gem, theft calculation gives 0, but it's capped by min(max(5, 0), min(100, 1)) = min(5, 1) = 1
      expect(result.actualStolen).toBe(1) // Should be capped by available gems
    })

    it('should handle fractional calculations correctly', () => {
      const result = calculateGemTheft(33, 3, 'normal')
      
      // 33 * 0.15 = 4.95, with level multiplier 1.04 = 5.148, floored = 5
      expect(result.actualStolen).toBeGreaterThanOrEqual(5)
      expect(result.actualStolen).toBeLessThanOrEqual(33)
    })

    it('should combine all multipliers correctly', () => {
      const result = calculateGemTheft(200, 8, 'hard')
      
      const baseTheft = Math.floor(200 * 0.15) // 30
      const levelMultiplier = 1.0 + ((8 - 1) * 0.02) // 1.14
      const levelAdjusted = Math.floor(baseTheft * levelMultiplier) // 34
      const difficultyAdjusted = Math.floor(levelAdjusted * 1.3) // 44
      
      expect(result.actualStolen).toBe(difficultyAdjusted)
      expect(result.levelMultiplier).toBeCloseTo(1.14, 2) // Handle floating point precision
    })
  })

  describe('generateAIGemReward', () => {
    beforeEach(() => {
      // Reset Math.random mock for each test
      vi.restoreAllMocks()
    })

    it('should generate rewards within difficulty ranges', () => {
      // Test multiple times to ensure range consistency
      for (let i = 0; i < 10; i++) {
        const easy = generateAIGemReward('easy')
        const normal = generateAIGemReward('normal')
        const hard = generateAIGemReward('hard')
        const expert = generateAIGemReward('expert')
        
        expect(easy).toBeGreaterThanOrEqual(5)
        expect(easy).toBeLessThanOrEqual(15)
        
        expect(normal).toBeGreaterThanOrEqual(10)
        expect(normal).toBeLessThanOrEqual(25)
        
        expect(hard).toBeGreaterThanOrEqual(20)
        expect(hard).toBeLessThanOrEqual(40)
        
        expect(expert).toBeGreaterThanOrEqual(35)
        expect(expert).toBeLessThanOrEqual(60)
      }
    })

    it('should return consistent results with mocked random', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      
      const easy = generateAIGemReward('easy')
      const normal = generateAIGemReward('normal')
      const hard = generateAIGemReward('hard')
      const expert = generateAIGemReward('expert')
      
      // Math.floor(Math.random() * (max - min + 1)) + min
      // Easy: Math.floor(0.5 * (15-5+1)) + 5 = Math.floor(0.5 * 11) + 5 = 5 + 5 = 10
      expect(easy).toBe(10)
      // Normal: Math.floor(0.5 * (25-10+1)) + 10 = Math.floor(0.5 * 16) + 10 = 8 + 10 = 18
      expect(normal).toBe(18)
      // Hard: Math.floor(0.5 * (40-20+1)) + 20 = Math.floor(0.5 * 21) + 20 = 10 + 20 = 30
      expect(hard).toBe(30)
      // Expert: Math.floor(0.5 * (60-35+1)) + 35 = Math.floor(0.5 * 26) + 35 = 13 + 35 = 48
      expect(expert).toBe(48)
    })

    it('should handle invalid difficulty gracefully', () => {
      const result = generateAIGemReward('invalid' as any)
      
      expect(result).toBeGreaterThanOrEqual(10) // Should default to normal
      expect(result).toBeLessThanOrEqual(25)
    })
  })

  describe('validateGemReward', () => {
    it('should return valid amounts unchanged', () => {
      expect(validateGemReward(50)).toBe(50)
      expect(validateGemReward(100)).toBe(100)
      expect(validateGemReward(150)).toBe(150)
    })

    it('should cap amounts at maximum', () => {
      expect(validateGemReward(300)).toBe(200) // Default max is 200
      expect(validateGemReward(1000)).toBe(200)
      expect(validateGemReward(500, 100)).toBe(100) // Custom max
    })

    it('should floor negative amounts to zero', () => {
      expect(validateGemReward(-10)).toBe(0)
      expect(validateGemReward(-100)).toBe(0)
    })

    it('should floor fractional amounts', () => {
      expect(validateGemReward(50.7)).toBe(50)
      expect(validateGemReward(99.9)).toBe(99)
    })

    it('should handle zero correctly', () => {
      expect(validateGemReward(0)).toBe(0)
    })

    it('should handle edge cases', () => {
      expect(validateGemReward(Number.MAX_SAFE_INTEGER)).toBe(200)
      expect(validateGemReward(Number.MIN_SAFE_INTEGER)).toBe(0)
      expect(validateGemReward(NaN)).toBe(0) // Math.floor(NaN) is NaN, but we need to handle this
      expect(validateGemReward(Infinity)).toBe(200)
      expect(validateGemReward(-Infinity)).toBe(0)
    })
  })

  describe('calculateTotalGemRewards', () => {
    it('should return zero rewards for defeats', () => {
      const result = calculateTotalGemRewards(false, false, 5, 'normal', 0, 1)
      
      expect(result.victoryGems).toBe(0)
      expect(result.stolenGems).toBe(0)
      expect(result.totalGems).toBe(0)
      expect(result.breakdown.baseReward).toBe(0)
      expect(result.breakdown.levelMultiplier).toBe(1.0)
    })

    it('should calculate AI battle rewards correctly', () => {
      const result = calculateTotalGemRewards(true, false, 5, 'hard', 0, 3)
      
      expect(result.victoryGems).toBeGreaterThan(0)
      expect(result.stolenGems).toBe(0)
      expect(result.totalGems).toBe(result.victoryGems)
      expect(result.breakdown.baseReward).toBeGreaterThan(0)
      expect(result.breakdown.levelMultiplier).toBe(1.4) // Level 5 multiplier
      expect(result.breakdown.theftDetails).toBeUndefined()
    })

    it('should calculate PvP battle rewards correctly', () => {
      const result = calculateTotalGemRewards(true, true, 3, 'normal', 100, 1)
      
      expect(result.victoryGems).toBe(0)
      expect(result.stolenGems).toBeGreaterThan(0)
      expect(result.totalGems).toBe(result.stolenGems)
      expect(result.breakdown.baseReward).toBe(0)
      expect(result.breakdown.theftDetails).toBeDefined()
      expect(result.breakdown.theftDetails!.opponentGems).toBe(100)
    })

    it('should validate total gem amounts', () => {
      // Test with very high values that should be capped
      const result = calculateTotalGemRewards(true, false, 10, 'expert', 0, 100)
      
      expect(result.totalGems).toBeLessThanOrEqual(200) // Should be validated
    })

    it('should handle zero opponent gems in PvP', () => {
      const result = calculateTotalGemRewards(true, true, 5, 'normal', 0, 1)
      
      expect(result.stolenGems).toBe(0)
      expect(result.totalGems).toBe(0)
      expect(result.breakdown.theftDetails!.actualStolen).toBe(0)
    })

    it('should handle edge cases gracefully', () => {
      const result = calculateTotalGemRewards(true, false, 0, 'normal', -50, -1)
      
      expect(result.victoryGems).toBeGreaterThanOrEqual(0)
      expect(result.totalGems).toBeGreaterThanOrEqual(0)
    })
  })

  describe('determineBattleDifficultyForGems', () => {
    const playerCreature: BattleCreature = {
      card: {
        ...mockCard,
        stats: { attack: 50, defense: 50, speed: 50, hp: 100 }
      },
      currentHP: 100,
      maxHP: 100
    }

    it('should return easy for weak opponents', () => {
      const weakOpponent: BattleCreature = {
        card: {
          ...mockCard,
          stats: { attack: 20, defense: 20, speed: 20, hp: 40 }
        },
        currentHP: 40,
        maxHP: 40
      }
      
      const difficulty = determineBattleDifficultyForGems(playerCreature, weakOpponent)
      expect(difficulty).toBe('easy')
    })

    it('should return normal for balanced opponents', () => {
      const balancedOpponent: BattleCreature = {
        card: {
          ...mockCard,
          stats: { attack: 45, defense: 45, speed: 45, hp: 90 }
        },
        currentHP: 90,
        maxHP: 90
      }
      
      const difficulty = determineBattleDifficultyForGems(playerCreature, balancedOpponent)
      expect(difficulty).toBe('normal')
    })

    it('should return hard for strong opponents', () => {
      const strongOpponent: BattleCreature = {
        card: {
          ...mockCard,
          stats: { attack: 70, defense: 70, speed: 70, hp: 140 }
        },
        currentHP: 140,
        maxHP: 140
      }
      
      const difficulty = determineBattleDifficultyForGems(playerCreature, strongOpponent)
      expect(difficulty).toBe('hard')
    })

    it('should return expert for very strong opponents', () => {
      const veryStrongOpponent: BattleCreature = {
        card: {
          ...mockCard,
          stats: { attack: 100, defense: 100, speed: 100, hp: 200 }
        },
        currentHP: 200,
        maxHP: 200
      }
      
      const difficulty = determineBattleDifficultyForGems(playerCreature, veryStrongOpponent)
      expect(difficulty).toBe('expert')
    })

    it('should handle missing stats gracefully', () => {
      const noStatsOpponent: BattleCreature = {
        card: {
          ...mockCard,
          stats: undefined
        },
        currentHP: 100,
        maxHP: 100
      }
      
      const difficulty = determineBattleDifficultyForGems(playerCreature, noStatsOpponent)
      expect(['easy', 'normal', 'hard', 'expert']).toContain(difficulty)
    })

    it('should use weighted stat calculations', () => {
      // Test that attack is weighted more heavily than other stats
      const highAttackOpponent: BattleCreature = {
        card: {
          ...mockCard,
          stats: { attack: 100, defense: 30, speed: 30, hp: 60 }
        },
        currentHP: 60,
        maxHP: 60
      }
      
      const highDefenseOpponent: BattleCreature = {
        card: {
          ...mockCard,
          stats: { attack: 30, defense: 100, speed: 30, hp: 60 }
        },
        currentHP: 60,
        maxHP: 60
      }
      
      const attackDifficulty = determineBattleDifficultyForGems(playerCreature, highAttackOpponent)
      const defenseDifficulty = determineBattleDifficultyForGems(playerCreature, highDefenseOpponent)
      
      // High attack should result in higher difficulty due to 1.2 weight
      const difficultyOrder = ['easy', 'normal', 'hard', 'expert']
      const attackIndex = difficultyOrder.indexOf(attackDifficulty)
      const defenseIndex = difficultyOrder.indexOf(defenseDifficulty)
      
      expect(attackIndex).toBeGreaterThanOrEqual(defenseIndex)
    })
  })

  describe('getTrainerLevelMultiplier', () => {
    it('should return correct multipliers for levels 1-10', () => {
      expect(getTrainerLevelMultiplier(1)).toBe(1.0)
      expect(getTrainerLevelMultiplier(2)).toBe(1.1)
      expect(getTrainerLevelMultiplier(5)).toBe(1.4)
      expect(getTrainerLevelMultiplier(10)).toBe(2.0)
    })

    it('should cap at level 10 multiplier for higher levels', () => {
      expect(getTrainerLevelMultiplier(15)).toBe(2.0)
      expect(getTrainerLevelMultiplier(50)).toBe(2.0)
      expect(getTrainerLevelMultiplier(100)).toBe(2.0)
    })

    it('should handle edge cases', () => {
      expect(getTrainerLevelMultiplier(0)).toBe(2.0) // Falls back to max
      expect(getTrainerLevelMultiplier(-5)).toBe(2.0) // Falls back to max
    })
  })

  describe('AI vs PvP Reward Differences', () => {
    it('should use different calculation methods for AI vs PvP', () => {
      const aiReward = calculateTotalGemRewards(true, false, 5, 'normal', 100, 3)
      const pvpReward = calculateTotalGemRewards(true, true, 5, 'normal', 100, 3)
      
      // AI should give victory gems, PvP should give stolen gems
      expect(aiReward.victoryGems).toBeGreaterThan(0)
      expect(aiReward.stolenGems).toBe(0)
      
      expect(pvpReward.victoryGems).toBe(0)
      expect(pvpReward.stolenGems).toBeGreaterThan(0)
    })

    it('should have different scaling factors for AI vs PvP', () => {
      // AI rewards scale with opponent level and difficulty
      const aiEasy = calculateTotalGemRewards(true, false, 5, 'easy', 0, 1)
      const aiHard = calculateTotalGemRewards(true, false, 5, 'hard', 0, 1)
      
      // PvP rewards scale with opponent gems and difficulty
      const pvpLowGems = calculateTotalGemRewards(true, true, 5, 'normal', 50, 1)
      const pvpHighGems = calculateTotalGemRewards(true, true, 5, 'normal', 200, 1)
      
      expect(aiHard.totalGems).toBeGreaterThan(aiEasy.totalGems)
      expect(pvpHighGems.totalGems).toBeGreaterThan(pvpLowGems.totalGems)
    })

    it('should respect different caps for AI vs PvP', () => {
      // AI rewards are capped by validation
      const aiReward = calculateTotalGemRewards(true, false, 10, 'expert', 0, 100)
      
      // PvP rewards are capped by theft limits
      const pvpReward = calculateTotalGemRewards(true, true, 10, 'expert', 1000, 1)
      
      expect(aiReward.totalGems).toBeLessThanOrEqual(200) // Validation cap
      expect(pvpReward.totalGems).toBeLessThanOrEqual(100) // Theft cap
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle extremely high trainer levels', () => {
      const result = calculateGemReward(999, 'normal', 1)
      
      expect(result.levelMultiplier).toBe(2.0) // Should cap at level 10 multiplier
      expect(result.totalEarned).toBeGreaterThan(0)
    })

    it('should handle negative trainer levels', () => {
      const result = calculateGemReward(-5, 'normal', 1)
      
      expect(result.levelMultiplier).toBe(2.0) // Should fall back to max multiplier
      expect(result.totalEarned).toBeGreaterThan(0)
    })

    it('should handle fractional values correctly', () => {
      const result = calculateGemTheft(33.7, 2.5, 'normal')
      
      expect(result.actualStolen).toBeGreaterThan(0)
      expect(Number.isInteger(result.actualStolen)).toBe(true)
    })

    it('should maintain consistency across multiple calculations', () => {
      const result1 = calculateGemReward(5, 'hard', 3)
      const result2 = calculateGemReward(5, 'hard', 3)
      
      expect(result1.totalEarned).toBe(result2.totalEarned)
      expect(result1.levelMultiplier).toBe(result2.levelMultiplier)
    })

    it('should handle invalid battle creature data', () => {
      const invalidCreature: BattleCreature = {
        card: {
          ...mockCard,
          stats: null as any
        },
        currentHP: 0,
        maxHP: 0
      }
      
      const validCreature: BattleCreature = {
        card: {
          ...mockCard,
          stats: { attack: 50, defense: 50, speed: 50, hp: 100 }
        },
        currentHP: 100,
        maxHP: 100
      }
      
      const difficulty = determineBattleDifficultyForGems(validCreature, invalidCreature)
      expect(['easy', 'normal', 'hard', 'expert']).toContain(difficulty)
    })

    it('should handle zero power calculations', () => {
      const zeroStatsCreature: BattleCreature = {
        card: {
          ...mockCard,
          stats: { attack: 0, defense: 0, speed: 0, hp: 0 }
        },
        currentHP: 0,
        maxHP: 0
      }
      
      const normalCreature: BattleCreature = {
        card: {
          ...mockCard,
          stats: { attack: 50, defense: 50, speed: 50, hp: 100 }
        },
        currentHP: 100,
        maxHP: 100
      }
      
      const difficulty = determineBattleDifficultyForGems(normalCreature, zeroStatsCreature)
      expect(difficulty).toBe('easy')
    })
  })

  describe('Integration Tests', () => {
    it('should work correctly in a complete battle scenario', () => {
      const playerCreature: BattleCreature = {
        card: {
          ...mockCard,
          stats: { attack: 60, defense: 50, speed: 70, hp: 80 }
        },
        currentHP: 80,
        maxHP: 80
      }
      
      const opponentCreature: BattleCreature = {
        card: {
          ...mockCard,
          stats: { attack: 70, defense: 60, speed: 65, hp: 90 }
        },
        currentHP: 90,
        maxHP: 90
      }
      
      // Determine difficulty
      const difficulty = determineBattleDifficultyForGems(playerCreature, opponentCreature)
      
      // Calculate AI battle rewards
      const aiRewards = calculateTotalGemRewards(true, false, 5, difficulty, 0, 3)
      
      // Calculate PvP battle rewards
      const pvpRewards = calculateTotalGemRewards(true, true, 5, difficulty, 150, 3)
      
      expect(['easy', 'normal', 'hard', 'expert']).toContain(difficulty)
      expect(aiRewards.totalGems).toBeGreaterThan(0)
      expect(pvpRewards.totalGems).toBeGreaterThan(0)
      expect(aiRewards.victoryGems).toBeGreaterThan(0)
      expect(pvpRewards.stolenGems).toBeGreaterThan(0)
    })

    it('should maintain gem economy balance', () => {
      // Test that gem rewards are reasonable and not exploitable
      const maxAIReward = calculateTotalGemRewards(true, false, 10, 'expert', 0, 100)
      const maxPvPReward = calculateTotalGemRewards(true, true, 10, 'expert', 1000, 100)
      
      // Rewards should be capped at reasonable amounts
      expect(maxAIReward.totalGems).toBeLessThanOrEqual(200)
      expect(maxPvPReward.totalGems).toBeLessThanOrEqual(100)
      
      // Higher difficulty should give more rewards
      const easyReward = calculateTotalGemRewards(true, false, 1, 'easy', 0, 1)
      const expertReward = calculateTotalGemRewards(true, false, 1, 'expert', 0, 1)
      
      expect(expertReward.totalGems).toBeGreaterThan(easyReward.totalGems)
    })

    it('should handle rapid successive calculations', () => {
      // Simulate multiple battles in quick succession
      const results = []
      
      for (let i = 0; i < 10; i++) {
        const result = calculateTotalGemRewards(
          true,
          i % 2 === 0, // Alternate between AI and PvP
          Math.floor(i / 2) + 1, // Increasing trainer level
          'normal',
          100,
          i + 1
        )
        results.push(result)
      }
      
      // All results should be valid
      results.forEach(result => {
        expect(result.totalGems).toBeGreaterThanOrEqual(0)
        expect(result.totalGems).toBeLessThanOrEqual(200)
        expect(Number.isInteger(result.totalGems)).toBe(true)
      })
    })
  })
})