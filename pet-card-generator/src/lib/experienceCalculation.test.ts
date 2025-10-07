// Unit tests for experience and leveling system

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calculateExperience,
  checkLevelUp,
  calculateStatIncreases,
  getLevelFromExperience,
  getExperienceInCurrentLevel,
  determineBattleDifficulty
} from './experienceCalculation'
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



describe('Experience Calculation System', () => {
  beforeEach(() => {
    // Reset any mocks before each test
    vi.clearAllMocks()
    // Mock Math.random for consistent stat increase testing
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })

  describe('calculateExperience', () => {
    it('should calculate base experience correctly', () => {
      const result = calculateExperience(1, 'normal', true)
      
      expect(result.baseExperience).toBe(60) // BASE_EXPERIENCE (50) + (opponentLevel * 10)
      expect(result.difficultyMultiplier).toBe(1.2) // normal difficulty
      expect(result.victoryBonus).toBe(25) // VICTORY_BONUS
      expect(result.totalExperience).toBe(97) // Math.floor((60 * 1.2) + 25)
    })

    it('should apply difficulty multipliers correctly', () => {
      const easy = calculateExperience(1, 'easy', true)
      const normal = calculateExperience(1, 'normal', true)
      const hard = calculateExperience(1, 'hard', true)
      const expert = calculateExperience(1, 'expert', true)
      
      expect(easy.difficultyMultiplier).toBe(1.0)
      expect(normal.difficultyMultiplier).toBe(1.2)
      expect(hard.difficultyMultiplier).toBe(1.5)
      expect(expert.difficultyMultiplier).toBe(2.0)
      
      // Expert should give more experience than easy
      expect(expert.totalExperience).toBeGreaterThan(easy.totalExperience)
    })

    it('should scale with opponent level', () => {
      const level1 = calculateExperience(1, 'normal', true)
      const level5 = calculateExperience(5, 'normal', true)
      const level10 = calculateExperience(10, 'normal', true)
      
      expect(level5.baseExperience).toBeGreaterThan(level1.baseExperience)
      expect(level10.baseExperience).toBeGreaterThan(level5.baseExperience)
      expect(level10.totalExperience).toBeGreaterThan(level1.totalExperience)
    })

    it('should not give victory bonus for defeats', () => {
      const victory = calculateExperience(1, 'normal', true)
      const defeat = calculateExperience(1, 'normal', false)
      
      expect(victory.victoryBonus).toBe(25)
      expect(defeat.victoryBonus).toBe(0)
      expect(victory.totalExperience).toBeGreaterThan(defeat.totalExperience)
    })

    it('should handle invalid difficulty gracefully', () => {
      const result = calculateExperience(1, 'invalid' as any, true)
      
      expect(result.difficultyMultiplier).toBe(1.0) // fallback to 1.0
      expect(result.totalExperience).toBeGreaterThan(0)
    })

    it('should handle zero opponent level', () => {
      const result = calculateExperience(0, 'normal', true)
      
      expect(result.baseExperience).toBe(50) // BASE_EXPERIENCE only
      expect(result.totalExperience).toBeGreaterThan(0)
    })

    it('should handle high opponent levels', () => {
      const result = calculateExperience(50, 'expert', true)
      
      expect(result.baseExperience).toBe(550) // 50 + (50 * 10)
      expect(result.totalExperience).toBeGreaterThan(1000)
    })
  })

  describe('checkLevelUp', () => {
    it('should detect single level up correctly', () => {
      const result = checkLevelUp(1, 50, 100) // Should level up from 1 to 2
      
      expect(result.leveledUp).toBe(true)
      expect(result.currentLevel).toBe(2)
      expect(result.experienceGained).toBe(100)
    })

    it('should detect multiple level ups', () => {
      const result = checkLevelUp(1, 0, 500) // Should level up multiple times
      
      expect(result.leveledUp).toBe(true)
      expect(result.currentLevel).toBeGreaterThan(2)
      expect(result.experienceGained).toBe(500)
    })

    it('should not level up with insufficient experience', () => {
      const result = checkLevelUp(1, 50, 30) // Not enough to level up
      
      expect(result.leveledUp).toBe(false)
      expect(result.currentLevel).toBe(1)
      expect(result.currentExperience).toBe(80) // 50 + 30
    })

    it('should handle maximum level correctly', () => {
      const result = checkLevelUp(100, 0, 1000) // Already at max level
      
      expect(result.leveledUp).toBe(false)
      expect(result.currentLevel).toBe(100)
      expect(result.experienceToNextLevel).toBe(0)
    })

    it('should calculate remaining experience correctly', () => {
      const result = checkLevelUp(1, 0, 50) // Partial progress to level 2
      
      expect(result.currentLevel).toBe(1)
      expect(result.currentExperience).toBe(50)
      expect(result.experienceToNextLevel).toBe(50) // 100 - 50 remaining
    })

    it('should handle zero experience gained', () => {
      const result = checkLevelUp(5, 100, 0)
      
      expect(result.leveledUp).toBe(false)
      expect(result.currentLevel).toBe(5)
      expect(result.currentExperience).toBe(100)
      expect(result.experienceGained).toBe(0)
    })

    it('should handle negative experience gracefully', () => {
      const result = checkLevelUp(5, 100, -50)
      
      expect(result.leveledUp).toBe(false)
      expect(result.currentLevel).toBe(5)
      expect(result.currentExperience).toBe(50) // 100 + (-50)
    })

    it('should calculate experience requirements exponentially', () => {
      // Level 1 to 2 should require less than level 5 to 6
      const level1to2 = checkLevelUp(1, 0, 100)
      const level5to6 = checkLevelUp(5, 0, 1000)
      
      expect(level1to2.leveledUp).toBe(true)
      expect(level5to6.currentLevel).toBeGreaterThan(5) // Should level up with 1000 exp
    })
  })

  describe('calculateStatIncreases', () => {
    const baseStats = { attack: 60, defense: 50, hp: 80 }

    it('should calculate stat increases for single level up', () => {
      const result = calculateStatIncreases(1, 2, baseStats)
      
      expect(result.previousLevel).toBe(1)
      expect(result.newLevel).toBe(2)
      expect(result.attack).toBeGreaterThan(0)
      expect(result.defense).toBeGreaterThan(0)
      expect(result.hp).toBeGreaterThan(0)
    })

    it('should scale stat increases with multiple levels', () => {
      const singleLevel = calculateStatIncreases(1, 2, baseStats)
      const multipleLevel = calculateStatIncreases(1, 5, baseStats)
      
      expect(multipleLevel.attack).toBeGreaterThan(singleLevel.attack)
      expect(multipleLevel.defense).toBeGreaterThan(singleLevel.defense)
      expect(multipleLevel.hp).toBeGreaterThan(singleLevel.hp)
    })

    it('should return zero increases for no level gain', () => {
      const result = calculateStatIncreases(5, 5, baseStats)
      
      expect(result.attack).toBe(0)
      expect(result.defense).toBe(0)
      expect(result.hp).toBe(0)
      expect(result.previousLevel).toBe(5)
      expect(result.newLevel).toBe(5)
    })

    it('should return zero increases for level decrease', () => {
      const result = calculateStatIncreases(5, 3, baseStats)
      
      expect(result.attack).toBe(0)
      expect(result.defense).toBe(0)
      expect(result.hp).toBe(0)
    })

    it('should ensure minimum stat increases', () => {
      const lowStats = { attack: 1, defense: 1, hp: 1 }
      const result = calculateStatIncreases(1, 2, lowStats)
      
      expect(result.attack).toBeGreaterThanOrEqual(1)
      expect(result.defense).toBeGreaterThanOrEqual(1)
      expect(result.hp).toBeGreaterThanOrEqual(2) // HP gets minimum 2
    })

    it('should scale with base stats', () => {
      const lowStats = { attack: 20, defense: 20, hp: 30 }
      const highStats = { attack: 100, defense: 100, hp: 150 }
      
      const lowResult = calculateStatIncreases(1, 2, lowStats)
      const highResult = calculateStatIncreases(1, 2, highStats)
      
      expect(highResult.attack).toBeGreaterThan(lowResult.attack)
      expect(highResult.defense).toBeGreaterThan(lowResult.defense)
      expect(highResult.hp).toBeGreaterThan(lowResult.hp)
    })

    it('should handle zero base stats', () => {
      const zeroStats = { attack: 0, defense: 0, hp: 0 }
      const result = calculateStatIncreases(1, 2, zeroStats)
      
      // Should still get minimum increases
      expect(result.attack).toBeGreaterThanOrEqual(1)
      expect(result.defense).toBeGreaterThanOrEqual(1)
      expect(result.hp).toBeGreaterThanOrEqual(2)
    })
  })

  describe('getLevelFromExperience', () => {
    it('should return level 1 for zero experience', () => {
      const level = getLevelFromExperience(0)
      expect(level).toBe(1)
    })

    it('should return level 1 for insufficient experience', () => {
      const level = getLevelFromExperience(50)
      expect(level).toBe(1)
    })

    it('should return level 2 for sufficient experience', () => {
      const level = getLevelFromExperience(100)
      expect(level).toBe(2)
    })

    it('should handle high experience values', () => {
      const level = getLevelFromExperience(10000)
      expect(level).toBeGreaterThanOrEqual(10)
      expect(level).toBeLessThanOrEqual(100)
    })

    it('should cap at level 100', () => {
      const level = getLevelFromExperience(999999)
      expect(level).toBeLessThanOrEqual(100)
    })

    it('should be consistent with checkLevelUp', () => {
      const totalExp = 500
      const levelFromExp = getLevelFromExperience(totalExp)
      const levelFromCheck = checkLevelUp(1, 0, totalExp)
      
      expect(levelFromExp).toBe(levelFromCheck.currentLevel)
    })
  })

  describe('getExperienceInCurrentLevel', () => {
    it('should return correct experience within level', () => {
      const expInLevel = getExperienceInCurrentLevel(150, 2)
      expect(expInLevel).toBe(50) // 150 - 100 (total exp for level 1)
    })

    it('should return zero for exact level boundary', () => {
      const expInLevel = getExperienceInCurrentLevel(100, 2)
      expect(expInLevel).toBe(0)
    })

    it('should handle level 1 correctly', () => {
      const expInLevel = getExperienceInCurrentLevel(50, 1)
      expect(expInLevel).toBe(50)
    })

    it('should handle high levels', () => {
      const totalExp = 1000
      const level = getLevelFromExperience(totalExp)
      const expInLevel = getExperienceInCurrentLevel(totalExp, level)
      
      expect(expInLevel).toBeGreaterThanOrEqual(0)
    })
  })

  describe('determineBattleDifficulty', () => {
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
      
      const difficulty = determineBattleDifficulty(playerCreature, weakOpponent)
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
      
      const difficulty = determineBattleDifficulty(playerCreature, balancedOpponent)
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
      
      const difficulty = determineBattleDifficulty(playerCreature, strongOpponent)
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
      
      const difficulty = determineBattleDifficulty(playerCreature, veryStrongOpponent)
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
      
      const difficulty = determineBattleDifficulty(playerCreature, noStatsOpponent)
      expect(['easy', 'normal', 'hard', 'expert']).toContain(difficulty)
    })

    it('should handle zero stats', () => {
      const zeroStatsOpponent: BattleCreature = {
        card: {
          ...mockCard,
          stats: { attack: 0, defense: 0, speed: 0, hp: 0 }
        },
        currentHP: 0,
        maxHP: 0
      }
      
      const difficulty = determineBattleDifficulty(playerCreature, zeroStatsOpponent)
      expect(difficulty).toBe('easy')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle extremely high experience values', () => {
      const result = checkLevelUp(1, 0, Number.MAX_SAFE_INTEGER)
      
      expect(result.currentLevel).toBeLessThanOrEqual(100)
      expect(result.leveledUp).toBe(true)
    })

    it('should handle negative levels gracefully', () => {
      const result = calculateStatIncreases(-1, 1, { attack: 50, defense: 50, hp: 100 })
      
      expect(result.attack).toBeGreaterThan(0)
      expect(result.defense).toBeGreaterThan(0)
      expect(result.hp).toBeGreaterThan(0)
    })

    it('should handle fractional experience values', () => {
      const result = checkLevelUp(1, 50.5, 49.7)
      
      expect(result.currentExperience).toBeCloseTo(0.2, 1) // Should have leveled up and have remainder
      expect(result.leveledUp).toBe(true)
      expect(result.currentLevel).toBe(2)
    })

    it('should maintain consistency across multiple calculations', () => {
      const exp1 = calculateExperience(5, 'normal', true)
      const exp2 = calculateExperience(5, 'normal', true)
      
      expect(exp1.totalExperience).toBe(exp2.totalExperience)
    })

    it('should handle maximum level stat increases', () => {
      const result = calculateStatIncreases(99, 100, { attack: 100, defense: 100, hp: 200 })
      
      expect(result.attack).toBeGreaterThan(0)
      expect(result.defense).toBeGreaterThan(0)
      expect(result.hp).toBeGreaterThan(0)
    })

    it('should handle experience calculation with maximum values', () => {
      const result = calculateExperience(100, 'expert', true)
      
      expect(result.totalExperience).toBeGreaterThan(0)
      expect(result.baseExperience).toBe(1050) // 50 + (100 * 10)
    })

    it('should handle level progression near maximum', () => {
      // Level 99 to 100 requires an enormous amount of experience
      // Test that it doesn't break with large numbers but may not reach 100
      const result = checkLevelUp(99, 0, 100000)
      
      expect(result.currentLevel).toBeGreaterThanOrEqual(99)
      expect(result.currentLevel).toBeLessThanOrEqual(100)
      expect(result.experienceGained).toBe(100000)
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
      const difficulty = determineBattleDifficulty(playerCreature, opponentCreature)
      
      // Calculate experience
      const expCalc = calculateExperience(5, difficulty, true)
      
      // Check for level up
      const levelUp = checkLevelUp(3, 150, expCalc.totalExperience)
      
      // Calculate stat increases if leveled up
      let statIncreases = null
      if (levelUp.leveledUp) {
        statIncreases = calculateStatIncreases(
          3,
          levelUp.currentLevel,
          playerCreature.card.stats!
        )
      }
      
      expect(['easy', 'normal', 'hard', 'expert']).toContain(difficulty)
      expect(expCalc.totalExperience).toBeGreaterThan(0)
      expect(levelUp.experienceGained).toBe(expCalc.totalExperience)
      
      if (statIncreases) {
        expect(statIncreases.attack).toBeGreaterThan(0)
        expect(statIncreases.defense).toBeGreaterThan(0)
        expect(statIncreases.hp).toBeGreaterThan(0)
      }
    })

    it('should maintain data consistency across multiple operations', () => {
      let currentLevel = 1
      let currentExp = 0
      
      // Simulate multiple battles
      for (let i = 0; i < 5; i++) {
        const expGained = calculateExperience(i + 1, 'normal', true)
        const levelCheck = checkLevelUp(currentLevel, currentExp, expGained.totalExperience)
        
        currentLevel = levelCheck.currentLevel
        currentExp = levelCheck.currentExperience
        
        // Verify consistency
        const levelFromExp = getLevelFromExperience(
          getTotalExperienceFromLevelAndCurrent(currentLevel, currentExp)
        )
        expect(levelFromExp).toBe(currentLevel)
      }
    })
  })
})

// Helper function for integration tests
function getTotalExperienceFromLevelAndCurrent(level: number, currentExp: number): number {
  let total = currentExp
  for (let i = 1; i < level; i++) {
    total += Math.floor(100 * Math.pow(1.5, i - 1))
  }
  return total
}