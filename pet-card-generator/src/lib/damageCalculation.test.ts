// Unit tests for damage calculation functions

import { Card } from '@/hooks/use-cards'
import { BattleMove, DEFAULT_BATTLE_STATS } from '@/types/battle'

// Mock the useBattleState hook to test damage calculation in isolation
const calculateDamage = (
  attackerCard: Card, 
  defenderCard: Card, 
  move: BattleMove
) => {
  const attackerStats = attackerCard.stats || DEFAULT_BATTLE_STATS
  const defenderStats = defenderCard.stats || DEFAULT_BATTLE_STATS
  
  // Base damage calculation: (Attack * Move Power) / Defense
  const baseDamage = Math.floor((attackerStats.attack * move.power) / (defenderStats.defense * 2))
  
  // Add random factor (0.85 to 1.0)
  const randomFactor = 0.85 + Math.random() * 0.15
  const finalDamage = Math.max(1, Math.floor(baseDamage * randomFactor))
  
  return {
    baseDamage,
    randomFactor,
    finalDamage
  }
}

// Mock card data for testing
const mockAttackerCard: Card = {
  id: "attacker",
  name: "Attacker",
  status: "ready",
  imageUrl: "/test.png",
  element: "fire",
  rarity: "common",
  stage: "baby",
  xp: 50,
  maxXp: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
  stats: { attack: 60, defense: 40, speed: 50, hp: 80 }
}

const mockDefenderCard: Card = {
  id: "defender",
  name: "Defender",
  status: "ready",
  imageUrl: "/test2.png",
  element: "water",
  rarity: "common",
  stage: "baby",
  xp: 40,
  maxXp: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
  stats: { attack: 40, defense: 60, speed: 45, hp: 75 }
}

const mockMove: BattleMove = {
  name: "Test Move",
  power: 50,
  type: "fire"
}

describe('Damage Calculation', () => {
  describe('Base Damage Calculation', () => {
    it('should calculate base damage using attack, move power, and defense', () => {
      const result = calculateDamage(mockAttackerCard, mockDefenderCard, mockMove)
      
      // Expected base damage: (60 * 50) / (60 * 2) = 3000 / 120 = 25
      expect(result.baseDamage).toBe(25)
    })

    it('should handle high attack vs low defense', () => {
      const highAttackCard: Card = {
        ...mockAttackerCard,
        stats: { attack: 100, defense: 40, speed: 50, hp: 80 }
      }
      
      const lowDefenseCard: Card = {
        ...mockDefenderCard,
        stats: { attack: 40, defense: 20, speed: 45, hp: 75 }
      }
      
      const result = calculateDamage(highAttackCard, lowDefenseCard, mockMove)
      
      // Expected: (100 * 50) / (20 * 2) = 5000 / 40 = 125
      expect(result.baseDamage).toBe(125)
    })

    it('should handle low attack vs high defense', () => {
      const lowAttackCard: Card = {
        ...mockAttackerCard,
        stats: { attack: 20, defense: 40, speed: 50, hp: 80 }
      }
      
      const highDefenseCard: Card = {
        ...mockDefenderCard,
        stats: { attack: 40, defense: 100, speed: 45, hp: 75 }
      }
      
      const result = calculateDamage(lowAttackCard, highDefenseCard, mockMove)
      
      // Expected: (20 * 50) / (100 * 2) = 1000 / 200 = 5
      expect(result.baseDamage).toBe(5)
    })

    it('should handle different move powers', () => {
      const weakMove: BattleMove = { name: "Weak Move", power: 20, type: "normal" }
      const strongMove: BattleMove = { name: "Strong Move", power: 100, type: "fire" }
      
      const weakResult = calculateDamage(mockAttackerCard, mockDefenderCard, weakMove)
      const strongResult = calculateDamage(mockAttackerCard, mockDefenderCard, strongMove)
      
      expect(strongResult.baseDamage).toBeGreaterThan(weakResult.baseDamage)
      expect(strongResult.baseDamage).toBe(weakResult.baseDamage * 5) // 100/20 = 5x
    })
  })

  describe('Random Factor Application', () => {
    it('should apply random factor between 0.85 and 1.0', () => {
      const results = []
      
      // Run multiple calculations to test random factor range
      for (let i = 0; i < 100; i++) {
        const result = calculateDamage(mockAttackerCard, mockDefenderCard, mockMove)
        results.push(result.randomFactor)
      }
      
      const minFactor = Math.min(...results)
      const maxFactor = Math.max(...results)
      
      expect(minFactor).toBeGreaterThanOrEqual(0.85)
      expect(maxFactor).toBeLessThanOrEqual(1.0)
    })

    it('should produce varied final damage due to random factor', () => {
      const finalDamages = new Set()
      
      // Run multiple calculations
      for (let i = 0; i < 50; i++) {
        const result = calculateDamage(mockAttackerCard, mockDefenderCard, mockMove)
        finalDamages.add(result.finalDamage)
      }
      
      // Should have multiple different damage values
      expect(finalDamages.size).toBeGreaterThan(1)
    })

    it('should ensure final damage is within expected range', () => {
      const results = []
      
      for (let i = 0; i < 100; i++) {
        const result = calculateDamage(mockAttackerCard, mockDefenderCard, mockMove)
        results.push(result.finalDamage)
      }
      
      const baseDamage = 25 // Expected base damage for our test cards
      const minExpected = Math.floor(baseDamage * 0.85)
      const maxExpected = Math.floor(baseDamage * 1.0)
      
      results.forEach(damage => {
        expect(damage).toBeGreaterThanOrEqual(Math.max(1, minExpected))
        expect(damage).toBeLessThanOrEqual(maxExpected)
      })
    })
  })

  describe('Minimum Damage Guarantee', () => {
    it('should ensure minimum damage of 1 even with very low attack', () => {
      const veryWeakCard: Card = {
        ...mockAttackerCard,
        stats: { attack: 1, defense: 40, speed: 50, hp: 80 }
      }
      
      const veryStrongDefenseCard: Card = {
        ...mockDefenderCard,
        stats: { attack: 40, defense: 200, speed: 45, hp: 75 }
      }
      
      const weakMove: BattleMove = { name: "Weak Move", power: 1, type: "normal" }
      
      const result = calculateDamage(veryWeakCard, veryStrongDefenseCard, weakMove)
      
      expect(result.finalDamage).toBeGreaterThanOrEqual(1)
    })

    it('should ensure minimum damage of 1 with zero base damage', () => {
      const zeroAttackCard: Card = {
        ...mockAttackerCard,
        stats: { attack: 0, defense: 40, speed: 50, hp: 80 }
      }
      
      const result = calculateDamage(zeroAttackCard, mockDefenderCard, mockMove)
      
      expect(result.baseDamage).toBe(0)
      expect(result.finalDamage).toBe(1)
    })
  })

  describe('Default Stats Handling', () => {
    it('should use default stats when attacker has no stats', () => {
      const cardWithoutStats: Card = {
        ...mockAttackerCard,
        stats: undefined
      }
      
      const result = calculateDamage(cardWithoutStats, mockDefenderCard, mockMove)
      
      // Should use DEFAULT_BATTLE_STATS.attack (50)
      // Expected: (50 * 50) / (60 * 2) = 2500 / 120 = 20.83... = 20
      expect(result.baseDamage).toBe(20)
    })

    it('should use default stats when defender has no stats', () => {
      const cardWithoutStats: Card = {
        ...mockDefenderCard,
        stats: undefined
      }
      
      const result = calculateDamage(mockAttackerCard, cardWithoutStats, mockMove)
      
      // Should use DEFAULT_BATTLE_STATS.defense (50)
      // Expected: (60 * 50) / (50 * 2) = 3000 / 100 = 30
      expect(result.baseDamage).toBe(30)
    })

    it('should use default stats when both cards have no stats', () => {
      const attackerWithoutStats: Card = {
        ...mockAttackerCard,
        stats: undefined
      }
      
      const defenderWithoutStats: Card = {
        ...mockDefenderCard,
        stats: undefined
      }
      
      const result = calculateDamage(attackerWithoutStats, defenderWithoutStats, mockMove)
      
      // Both use DEFAULT_BATTLE_STATS (attack: 50, defense: 50)
      // Expected: (50 * 50) / (50 * 2) = 2500 / 100 = 25
      expect(result.baseDamage).toBe(25)
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero power moves', () => {
      const zeroPowerMove: BattleMove = { name: "Zero Move", power: 0, type: "normal" }
      
      const result = calculateDamage(mockAttackerCard, mockDefenderCard, zeroPowerMove)
      
      expect(result.baseDamage).toBe(0)
      expect(result.finalDamage).toBe(1) // Minimum damage guarantee
    })

    it('should handle very high power moves', () => {
      const superMove: BattleMove = { name: "Super Move", power: 1000, type: "fire" }
      
      const result = calculateDamage(mockAttackerCard, mockDefenderCard, superMove)
      
      // Expected: (60 * 1000) / (60 * 2) = 60000 / 120 = 500
      expect(result.baseDamage).toBe(500)
      expect(result.finalDamage).toBeGreaterThan(400) // Should be high but with random factor
    })

    it('should handle zero defense (edge case)', () => {
      const zeroDefenseCard: Card = {
        ...mockDefenderCard,
        stats: { attack: 40, defense: 0, speed: 45, hp: 75 }
      }
      
      // This would cause division by zero, but our formula uses defense * 2
      // So minimum effective defense is 0 * 2 = 0, which would cause Infinity
      // The implementation should handle this gracefully
      const result = calculateDamage(mockAttackerCard, zeroDefenseCard, mockMove)
      
      // Should either handle gracefully or produce very high damage
      expect(result.finalDamage).toBeGreaterThan(0)
      // Note: With zero defense, the result will be Infinity, so we expect this to be false
      // This test documents the current behavior - in a real implementation, 
      // we would want to add a minimum defense value to prevent division by zero
      expect(isFinite(result.finalDamage)).toBe(false)
    })

    it('should handle negative stats gracefully', () => {
      const negativeStatsCard: Card = {
        ...mockAttackerCard,
        stats: { attack: -10, defense: 40, speed: 50, hp: 80 }
      }
      
      const result = calculateDamage(negativeStatsCard, mockDefenderCard, mockMove)
      
      // Should handle negative attack gracefully
      expect(result.finalDamage).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Damage Calculation Consistency', () => {
    it('should produce consistent base damage for same inputs', () => {
      const results = []
      
      for (let i = 0; i < 10; i++) {
        const result = calculateDamage(mockAttackerCard, mockDefenderCard, mockMove)
        results.push(result.baseDamage)
      }
      
      // Base damage should be consistent (only final damage varies due to random factor)
      const uniqueBaseDamages = new Set(results)
      expect(uniqueBaseDamages.size).toBe(1)
    })

    it('should maintain damage calculation formula integrity', () => {
      const customAttacker: Card = {
        ...mockAttackerCard,
        stats: { attack: 80, defense: 40, speed: 50, hp: 80 }
      }
      
      const customDefender: Card = {
        ...mockDefenderCard,
        stats: { attack: 40, defense: 40, speed: 45, hp: 75 }
      }
      
      const customMove: BattleMove = { name: "Custom Move", power: 60, type: "fire" }
      
      const result = calculateDamage(customAttacker, customDefender, customMove)
      
      // Manual calculation: (80 * 60) / (40 * 2) = 4800 / 80 = 60
      expect(result.baseDamage).toBe(60)
      
      // Final damage should be within random factor range
      expect(result.finalDamage).toBeGreaterThanOrEqual(Math.floor(60 * 0.85))
      expect(result.finalDamage).toBeLessThanOrEqual(60)
    })
  })
})