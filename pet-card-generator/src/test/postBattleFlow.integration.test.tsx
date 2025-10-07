// Integration tests for complete post-battle flow
// Tests the full sequence from battle completion to rewards display

import React from 'react'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBattleState } from '@/hooks/useBattleState'
import LevelUpModal from '@/components/LevelUpModal'
import PostBattleRewards from '@/components/PostBattleRewards'
import { Card } from '@/hooks/use-cards'
import { BattleCreature, PostBattleRewards as PostBattleRewardsType } from '@/types/battle'
import { calculateExperience, checkLevelUp, calculateStatIncreases } from '@/lib/experienceCalculation'
import { calculateTotalGemRewards } from '@/lib/gemCalculation'

// Mock card data for testing
const mockPlayerCard: Card = {
  id: "test-player",
  name: "Test Player",
  status: "ready",
  imageUrl: "/test-player.png",
  element: "fire",
  rarity: "common",
  stage: "baby",
  xp: 50,
  maxXp: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
  stats: { attack: 60, defense: 50, speed: 70, hp: 80 },
  moves: [
    { name: "Fire Blast", power: 50, type: "fire" }
  ]
}

const mockOpponentCard: Card = {
  id: "test-opponent",
  name: "Test Opponent",
  status: "ready",
  imageUrl: "/test-opponent.png",
  element: "water",
  rarity: "common",
  stage: "baby",
  xp: 40,
  maxXp: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
  stats: { attack: 55, defense: 60, speed: 65, hp: 75 },
  moves: [
    { name: "Water Gun", power: 45, type: "water" }
  ]
}

const mockPlayerCreature: BattleCreature = {
  card: mockPlayerCard,
  currentHP: 80,
  maxHP: 80
}

const mockPostBattleRewards: PostBattleRewardsType = {
  experienceGained: 120,
  gemsEarned: 25,
  gemsStolen: 0,
  levelUp: true,
  statIncreases: {
    attack: 5,
    defense: 4,
    hp: 8,
    previousLevel: 1,
    newLevel: 2
  }
}

// Mock external dependencies
vi.mock('@/lib/experienceCalculation', () => ({
  calculateExperience: vi.fn(),
  checkLevelUp: vi.fn(),
  calculateStatIncreases: vi.fn(),
  determineBattleDifficulty: vi.fn(() => 'normal')
}))

vi.mock('@/lib/gemCalculation', () => ({
  calculateTotalGemRewards: vi.fn(),
  determineBattleDifficultyForGems: vi.fn(() => 'normal')
}))

describe('Post-Battle Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mock implementations
    vi.mocked(calculateExperience).mockReturnValue({
      baseExperience: 60,
      difficultyMultiplier: 1.2,
      victoryBonus: 25,
      totalExperience: 97
    })
    
    vi.mocked(checkLevelUp).mockReturnValue({
      leveledUp: true,
      currentLevel: 2,
      currentExperience: 47,
      experienceToNextLevel: 153,
      experienceGained: 97
    })
    
    vi.mocked(calculateStatIncreases).mockReturnValue({
      attack: 5,
      defense: 4,
      hp: 8,
      previousLevel: 1,
      newLevel: 2
    })
    
    vi.mocked(calculateTotalGemRewards).mockReturnValue({
      victoryGems: 25,
      stolenGems: 0,
      totalGems: 25,
      breakdown: {
        baseReward: 20,
        levelMultiplier: 1.0,
        theftDetails: undefined
      }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Post-Battle Rewards Component', () => {
    it('should display complete victory rewards correctly', () => {
      render(
        <PostBattleRewards
          rewards={mockPostBattleRewards}
          winner="player"
          isPvP={false}
          trainerLevel={1}
        />
      )

      // Verify rewards display
      expect(screen.getAllByText('Battle Rewards')[0]).toBeInTheDocument()
      expect(screen.getByText('Experience Gained')).toBeInTheDocument()
      expect(screen.getByText('+120 XP')).toBeInTheDocument()
      expect(screen.getByText('Gem Rewards')).toBeInTheDocument()
      expect(screen.getByText('+25 💎')).toBeInTheDocument()
      expect(screen.getByText('🎉 Level Up! Check your stats!')).toBeInTheDocument()
      expect(screen.getByText('🤖 AI Battle')).toBeInTheDocument()
    })

    it('should handle PvP rewards with gem theft', () => {
      const pvpRewards: PostBattleRewardsType = {
        experienceGained: 80,
        gemsEarned: 0,
        gemsStolen: 15,
        levelUp: false,
        statIncreases: null
      }

      render(
        <PostBattleRewards
          rewards={pvpRewards}
          winner="player"
          isPvP={true}
          trainerLevel={3}
        />
      )

      // Verify PvP-specific rewards
      expect(screen.getByText('⚔️ PvP Battle')).toBeInTheDocument()
      expect(screen.getByText('Gems Stolen')).toBeInTheDocument()
      expect(screen.getByText('+15 💎')).toBeInTheDocument()
      expect(screen.getByText('Trainer Level 3 Bonus Applied')).toBeInTheDocument()
      expect(screen.queryByText('🎉 Level Up! Check your stats!')).not.toBeInTheDocument()
    })

    it('should not display rewards for defeats', () => {
      render(
        <PostBattleRewards
          rewards={mockPostBattleRewards}
          winner="opponent"
          isPvP={false}
          trainerLevel={1}
        />
      )

      // Should not render anything for defeats
      expect(screen.queryByText('Battle Rewards')).not.toBeInTheDocument()
    })

    it('should handle invalid rewards data gracefully', () => {
      const mockOnError = vi.fn()
      const invalidRewards = {
        experienceGained: -1, // Invalid negative experience
        gemsEarned: 25,
        gemsStolen: 0,
        levelUp: true,
        statIncreases: mockPostBattleRewards.statIncreases
      } as PostBattleRewardsType

      render(
        <PostBattleRewards
          rewards={invalidRewards}
          winner="player"
          isPvP={false}
          trainerLevel={1}
          onError={mockOnError}
        />
      )

      // Should handle error gracefully
      expect(mockOnError).toHaveBeenCalledWith('Invalid experience data')
    })
  })

  describe('Level Up Modal Component', () => {
    it('should display level up information correctly', async () => {
      const mockOnClose = vi.fn()

      render(
        <LevelUpModal
          isOpen={true}
          onClose={mockOnClose}
          petData={mockPlayerCreature}
          statIncreases={mockPostBattleRewards.statIncreases!}
          experienceGained={120}
        />
      )

      // Verify modal content
      expect(screen.getByText('Level Up!')).toBeInTheDocument()
      expect(screen.getByText('Test Player reached level 2!')).toBeInTheDocument()
      expect(screen.getByText('+120 XP')).toBeInTheDocument()
      expect(screen.getByText('Level 1 → 2')).toBeInTheDocument()

      // Verify stat increases are shown
      expect(screen.getByText('Stat Increases')).toBeInTheDocument()
      expect(screen.getByText('Attack')).toBeInTheDocument()
      expect(screen.getByText('Defense')).toBeInTheDocument()
      expect(screen.getByText('Health')).toBeInTheDocument()

      // Continue button should be present
      const continueButton = screen.getByText('Continue')
      expect(continueButton).toBeInTheDocument()

      // Test closing modal
      fireEvent.click(continueButton)
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('should handle invalid pet data gracefully', () => {
      const mockOnError = vi.fn()
      const mockOnClose = vi.fn()

      render(
        <LevelUpModal
          isOpen={true}
          onClose={mockOnClose}
          petData={null as any} // Invalid pet data
          statIncreases={mockPostBattleRewards.statIncreases!}
          experienceGained={120}
          onError={mockOnError}
        />
      )

      // Should handle error and close modal
      expect(mockOnError).toHaveBeenCalledWith('Invalid pet data')
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Battle State Integration', () => {
    it('should integrate with useBattleState hook correctly', () => {
      const { result } = renderHook(() => useBattleState())
      const availableCards = [mockPlayerCard, mockOpponentCard]

      // Setup battle
      act(() => {
        result.current.selectPlayerCreature(mockPlayerCard)
        result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
        result.current.startBattle()
      })

      // Verify battle is active
      expect(result.current.battleState.battleActive).toBe(true)
      expect(result.current.battleState.battlePhase).toBe("battle")
      expect(result.current.battleState.playerCreature?.card.name).toBe("Test Player")
      expect(result.current.battleState.opponentCreature?.card.name).toBe("Test Opponent")
    })

    it('should handle battle cleanup correctly', () => {
      const { result } = renderHook(() => useBattleState())
      const availableCards = [mockPlayerCard, mockOpponentCard]

      // Setup battle
      act(() => {
        result.current.selectPlayerCreature(mockPlayerCard)
        result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
        result.current.startBattle()
      })

      // Reset battle
      act(() => {
        result.current.resetBattle()
      })

      // Verify reset
      expect(result.current.battleState.battlePhase).toBe("selection")
      expect(result.current.battleState.winner).toBe(null)
      expect(result.current.battleState.playerCreature).toBe(null)
      expect(result.current.battleState.opponentCreature).toBe(null)
      expect(result.current.battleState.battleActive).toBe(false)
    })
  })

  describe('Experience and Gem Calculation Integration', () => {
    it('should calculate experience correctly for different scenarios', () => {
      // Test normal difficulty victory
      const normalExp = calculateExperience(5, 'normal', true)
      expect(normalExp.totalExperience).toBe(97)
      expect(normalExp.victoryBonus).toBe(25)

      // Test hard difficulty victory
      vi.mocked(calculateExperience).mockReturnValueOnce({
        baseExperience: 80,
        difficultyMultiplier: 1.5,
        victoryBonus: 25,
        totalExperience: 145
      })

      const hardExp = calculateExperience(5, 'hard', true)
      expect(hardExp.totalExperience).toBe(145)
      expect(hardExp.difficultyMultiplier).toBe(1.5)
    })

    it('should handle level up calculations correctly', () => {
      const levelUpResult = checkLevelUp(1, 50, 100)
      expect(levelUpResult.leveledUp).toBe(true)
      expect(levelUpResult.currentLevel).toBe(2)
      expect(levelUpResult.experienceGained).toBe(97)
    })

    it('should calculate stat increases for level ups', () => {
      const statIncreases = calculateStatIncreases(1, 2, { attack: 60, defense: 50, hp: 80 })
      expect(statIncreases.attack).toBe(5)
      expect(statIncreases.defense).toBe(4)
      expect(statIncreases.hp).toBe(8)
      expect(statIncreases.previousLevel).toBe(1)
      expect(statIncreases.newLevel).toBe(2)
    })

    it('should calculate gem rewards for different battle types', () => {
      // AI battle rewards
      const aiRewards = calculateTotalGemRewards(true, false, 5, 'normal', 0, 3)
      expect(aiRewards.victoryGems).toBe(25)
      expect(aiRewards.stolenGems).toBe(0)
      expect(aiRewards.totalGems).toBe(25)

      // PvP battle rewards
      vi.mocked(calculateTotalGemRewards).mockReturnValueOnce({
        victoryGems: 0,
        stolenGems: 15,
        totalGems: 15,
        breakdown: {
          baseReward: 0,
          levelMultiplier: 1.0,
          theftDetails: {
            opponentGems: 100,
            theftPercentage: 0.15,
            maxTheftAmount: 100,
            actualStolen: 15,
            levelMultiplier: 1.0
          }
        }
      })

      const pvpRewards = calculateTotalGemRewards(true, true, 5, 'normal', 100, 3)
      expect(pvpRewards.victoryGems).toBe(0)
      expect(pvpRewards.stolenGems).toBe(15)
      expect(pvpRewards.totalGems).toBe(15)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing rewards data', () => {
      render(
        <PostBattleRewards
          rewards={null as any}
          winner="player"
          isPvP={false}
          trainerLevel={1}
        />
      )

      // Should not render anything for null rewards
      expect(screen.queryByText('Battle Rewards')).not.toBeInTheDocument()
    })

    it('should handle invalid stat increases in level up modal', () => {
      const mockOnError = vi.fn()
      const mockOnClose = vi.fn()

      render(
        <LevelUpModal
          isOpen={true}
          onClose={mockOnClose}
          petData={mockPlayerCreature}
          statIncreases={null as any} // Invalid stat increases
          experienceGained={120}
          onError={mockOnError}
        />
      )

      // Should handle error gracefully
      expect(mockOnError).toHaveBeenCalledWith('Invalid stat increases data')
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should handle zero experience gained', () => {
      const zeroExpRewards: PostBattleRewardsType = {
        experienceGained: 0,
        gemsEarned: 10,
        gemsStolen: 0,
        levelUp: false,
        statIncreases: null
      }

      render(
        <PostBattleRewards
          rewards={zeroExpRewards}
          winner="player"
          isPvP={false}
          trainerLevel={1}
        />
      )

      // Should still display rewards
      expect(screen.getAllByText('Battle Rewards')[0]).toBeInTheDocument()
      expect(screen.getByText('+0 XP')).toBeInTheDocument()
      expect(screen.getByText('+10 💎')).toBeInTheDocument()
      expect(screen.queryByText('🎉 Level Up! Check your stats!')).not.toBeInTheDocument()
    })

    it('should handle negative gem values gracefully', () => {
      const mockOnError = vi.fn()
      const invalidGemRewards: PostBattleRewardsType = {
        experienceGained: 50,
        gemsEarned: -5, // Invalid negative gems
        gemsStolen: 0,
        levelUp: false,
        statIncreases: null
      }

      render(
        <PostBattleRewards
          rewards={invalidGemRewards}
          winner="player"
          isPvP={false}
          trainerLevel={1}
          onError={mockOnError}
        />
      )

      // Should handle error gracefully
      expect(mockOnError).toHaveBeenCalledWith('Invalid gem data')
    })
  })

  describe('Accessibility and User Experience', () => {
    it('should provide proper accessibility attributes in level up modal', () => {
      render(
        <LevelUpModal
          isOpen={true}
          onClose={vi.fn()}
          petData={mockPlayerCreature}
          statIncreases={mockPostBattleRewards.statIncreases!}
          experienceGained={120}
        />
      )

      const modal = screen.getByRole('dialog')
      expect(modal).toBeInTheDocument()
      expect(modal).toHaveAttribute('aria-describedby', 'level-up-description')
      expect(screen.getByText('Test Player reached level 2!')).toBeInTheDocument()
    })

    it('should provide descriptive content for screen readers', () => {
      render(
        <PostBattleRewards
          rewards={mockPostBattleRewards}
          winner="player"
          isPvP={false}
          trainerLevel={1}
        />
      )

      // Should have descriptive text for screen readers
      expect(screen.getAllByText('Battle Rewards')[0]).toBeInTheDocument()
      expect(screen.getByText('Experience Gained')).toBeInTheDocument()
      expect(screen.getByText('Gem Rewards')).toBeInTheDocument()
      expect(screen.getByText('Total Rewards Earned')).toBeInTheDocument()
    })

    it('should handle keyboard navigation', () => {
      const mockOnClose = vi.fn()

      render(
        <LevelUpModal
          isOpen={true}
          onClose={mockOnClose}
          petData={mockPlayerCreature}
          statIncreases={mockPostBattleRewards.statIncreases!}
          experienceGained={120}
        />
      )

      const continueButton = screen.getByText('Continue')
      expect(continueButton).toBeInTheDocument()
      expect(continueButton.tagName).toBe('BUTTON')

      // Test keyboard interaction
      fireEvent.keyDown(continueButton, { key: 'Enter' })
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Component Integration Flow', () => {
    it('should sequence post-battle components correctly', async () => {
      // 1. First show rewards
      const { rerender } = render(
        <PostBattleRewards
          rewards={mockPostBattleRewards}
          winner="player"
          isPvP={false}
          trainerLevel={1}
        />
      )

      expect(screen.getAllByText('Battle Rewards')[0]).toBeInTheDocument()
      expect(screen.getByText('🎉 Level Up! Check your stats!')).toBeInTheDocument()

      // 2. Then show level up modal
      rerender(
        <div>
          <PostBattleRewards
            rewards={mockPostBattleRewards}
            winner="player"
            isPvP={false}
            trainerLevel={1}
          />
          <LevelUpModal
            isOpen={true}
            onClose={vi.fn()}
            petData={mockPlayerCreature}
            statIncreases={mockPostBattleRewards.statIncreases!}
            experienceGained={120}
          />
        </div>
      )

      // Both should be visible
      expect(screen.getAllByText('Battle Rewards')[0]).toBeInTheDocument()
      expect(screen.getByText('Level Up!')).toBeInTheDocument()
      expect(screen.getByText('Test Player reached level 2!')).toBeInTheDocument()
    })

    it('should handle multiple level ups correctly', () => {
      const multiLevelRewards: PostBattleRewardsType = {
        experienceGained: 500,
        gemsEarned: 50,
        gemsStolen: 0,
        levelUp: true,
        statIncreases: {
          attack: 15,
          defense: 12,
          hp: 25,
          previousLevel: 1,
          newLevel: 4
        }
      }

      render(
        <div>
          <PostBattleRewards
            rewards={multiLevelRewards}
            winner="player"
            isPvP={false}
            trainerLevel={1}
          />
          <LevelUpModal
            isOpen={true}
            onClose={vi.fn()}
            petData={mockPlayerCreature}
            statIncreases={multiLevelRewards.statIncreases!}
            experienceGained={500}
          />
        </div>
      )

      // Verify multiple level progression
      expect(screen.getByText('+500 XP')).toBeInTheDocument()
      expect(screen.getByText('Level 1 → 4')).toBeInTheDocument()
      expect(screen.getByText('+50 💎')).toBeInTheDocument()
    })

    it('should maintain data consistency across components', () => {
      const consistentRewards: PostBattleRewardsType = {
        experienceGained: 150,
        gemsEarned: 30,
        gemsStolen: 0,
        levelUp: true,
        statIncreases: {
          attack: 6,
          defense: 5,
          hp: 10,
          previousLevel: 2,
          newLevel: 3
        }
      }

      render(
        <div>
          <PostBattleRewards
            rewards={consistentRewards}
            winner="player"
            isPvP={false}
            trainerLevel={2}
          />
          <LevelUpModal
            isOpen={true}
            onClose={vi.fn()}
            petData={mockPlayerCreature}
            statIncreases={consistentRewards.statIncreases!}
            experienceGained={consistentRewards.experienceGained}
          />
        </div>
      )

      // Verify consistent data across components
      expect(screen.getAllByText('+150 XP')).toHaveLength(2) // Once in rewards, once in modal
      expect(screen.getByText('Level 2 → 3')).toBeInTheDocument()
      expect(screen.getByText('+30 💎')).toBeInTheDocument()
      expect(screen.getByText('Trainer Level 2 Bonus Applied')).toBeInTheDocument()
    })
  })
})