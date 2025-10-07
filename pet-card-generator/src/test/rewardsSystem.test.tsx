import { describe, it, expect } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { useBattleState } from '@/hooks/useBattleState'
import { Card } from '@/hooks/use-cards'

// Mock card data for testing
const mockPlayerCard: Card = {
  id: 'player-1',
  name: 'Test Player Pet',
  imageUrl: '/test-player.jpg',
  status: 'ready',
  xp: 0,
  stats: {
    attack: 50,
    defense: 50,
    speed: 50,
    hp: 100
  },
  moves: [
    { name: 'Test Attack', power: 50, type: 'normal' }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockOpponentCard: Card = {
  id: 'opponent-1',
  name: 'Test Opponent Pet',
  imageUrl: '/test-opponent.jpg',
  status: 'ready',
  xp: 50,
  stats: {
    attack: 40,
    defense: 40,
    speed: 40,
    hp: 80
  },
  moves: [
    { name: 'Opponent Attack', power: 40, type: 'normal' }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
}

describe('Battle Rewards System', () => {
  it('should generate meaningful rewards when player wins', () => {
    const { result } = renderHook(() => useBattleState())
    
    // Set up battle with a weak opponent (1 HP) to guarantee player victory
    const weakOpponent: Card = {
      ...mockOpponentCard,
      stats: {
        ...mockOpponentCard.stats!,
        hp: 1 // Very low HP to ensure quick victory
      }
    }
    
    act(() => {
      result.current.selectPlayerCreature(mockPlayerCard)
      result.current.selectOpponentCreature([weakOpponent], mockPlayerCard.id)
      result.current.startBattle()
    })
    
    // Execute one player move to win the battle
    act(() => {
      const moves = result.current.getPlayerMoves()
      result.current.executePlayerMove(moves[0])
    })
    
    // Check that player won and rewards were generated
    expect(result.current.battleState.winner).toBe('player')
    expect(result.current.battleState.postBattleRewards).toBeTruthy()
    
    const rewards = result.current.battleState.postBattleRewards!
    
    // Verify rewards are meaningful (not zero)
    expect(rewards.experienceGained).toBeGreaterThan(0)
    expect(rewards.gemsEarned).toBeGreaterThan(0)
    
    // Verify rewards are within expected ranges
    expect(rewards.experienceGained).toBeGreaterThanOrEqual(25) // Base 25 + opponent level 1 * 5 = 30 minimum
    expect(rewards.experienceGained).toBeLessThanOrEqual(90) // Max with bonuses
    
    expect(rewards.gemsEarned).toBeGreaterThanOrEqual(3) // Base 3 gems minimum
    expect(rewards.gemsEarned).toBeLessThanOrEqual(15) // Max with bonuses
    
    // Check that pet XP was updated
    expect(result.current.battleState.playerCreature?.card.xp).toBeGreaterThan(0)
    expect(result.current.battleState.playerCreature?.card.xp).toBe(rewards.experienceGained)
  })
  
  it('should handle level up correctly', () => {
    // Create a pet close to leveling up (95 XP, needs 5 more for level 2)
    const nearLevelUpCard: Card = {
      ...mockPlayerCard,
      xp: 95
    }
    
    const weakOpponent: Card = {
      ...mockOpponentCard,
      stats: {
        ...mockOpponentCard.stats!,
        hp: 1 // Very low HP to ensure quick victory
      }
    }
    
    const { result } = renderHook(() => useBattleState())
    
    act(() => {
      result.current.selectPlayerCreature(nearLevelUpCard)
      result.current.selectOpponentCreature([weakOpponent], nearLevelUpCard.id)
      result.current.startBattle()
    })
    
    // Execute one player move to win the battle
    act(() => {
      const moves = result.current.getPlayerMoves()
      result.current.executePlayerMove(moves[0])
    })
    
    const rewards = result.current.battleState.postBattleRewards!
    
    // Should level up since we started with 95 XP and gained at least 25
    expect(rewards.levelUp).toBe(true)
    expect(rewards.statIncreases).toBeTruthy()
    
    if (rewards.statIncreases) {
      expect(rewards.statIncreases.previousLevel).toBe(1)
      expect(rewards.statIncreases.newLevel).toBe(2)
      expect(rewards.statIncreases.hp).toBeGreaterThan(0)
      expect(rewards.statIncreases.attack).toBeGreaterThan(0)
      expect(rewards.statIncreases.defense).toBeGreaterThan(0)
    }
    
    // Check that pet stats were updated
    const updatedCard = result.current.battleState.playerCreature?.card
    expect(updatedCard?.stats?.hp).toBeGreaterThan(nearLevelUpCard.stats!.hp)
    expect(updatedCard?.stats?.attack).toBeGreaterThan(nearLevelUpCard.stats!.attack)
    expect(updatedCard?.stats?.defense).toBeGreaterThan(nearLevelUpCard.stats!.defense)
  })
  
  it('should add reward messages to battle log', () => {
    const { result } = renderHook(() => useBattleState())
    
    const weakOpponent: Card = {
      ...mockOpponentCard,
      stats: {
        ...mockOpponentCard.stats!,
        hp: 1 // Very low HP to ensure quick victory
      }
    }
    
    act(() => {
      result.current.selectPlayerCreature(mockPlayerCard)
      result.current.selectOpponentCreature([weakOpponent], mockPlayerCard.id)
      result.current.startBattle()
    })
    
    // Execute one player move to win the battle
    act(() => {
      const moves = result.current.getPlayerMoves()
      result.current.executePlayerMove(moves[0])
    })
    
    const battleLog = result.current.battleState.battleLog
    
    // Check that reward messages were added to battle log
    expect(battleLog.some(msg => msg.includes('Gained') && msg.includes('experience points'))).toBe(true)
    expect(battleLog.some(msg => msg.includes('Earned') && msg.includes('gems'))).toBe(true)
  })
})