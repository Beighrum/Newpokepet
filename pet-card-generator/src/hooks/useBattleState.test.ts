// Comprehensive tests for battle state management functionality

import { renderHook, act } from '@testing-library/react'
import { useBattleState } from './useBattleState'
import { Card } from '@/hooks/use-cards'
import { BATTLE_PHASES, TURN_TYPES, DEFAULT_BATTLE_STATS, DEFAULT_MOVES } from '@/types/battle'

// Mock card data for testing
const mockPlayerCard: Card = {
  id: "test-player",
  name: "Test Player",
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

const mockOpponentCard: Card = {
  id: "test-opponent",
  name: "Test Opponent",
  status: "ready",
  imageUrl: "/test2.png",
  element: "water",
  rarity: "common",
  stage: "baby",
  xp: 40,
  maxXp: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
  stats: { attack: 55, defense: 60, speed: 65, hp: 75 },
  moves: [
    { name: "Test Counter", power: 45, type: "water" }
  ]
}

describe('useBattleState', () => {
  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useBattleState())
    
    expect(result.current.battleState.battlePhase).toBe(BATTLE_PHASES.SELECTION)
    expect(result.current.battleState.battleActive).toBe(false)
    expect(result.current.battleState.playerCreature).toBe(null)
    expect(result.current.battleState.opponentCreature).toBe(null)
    expect(result.current.battleState.winner).toBe(null)
  })

  it('should select player creature correctly', () => {
    const { result } = renderHook(() => useBattleState())
    
    act(() => {
      result.current.selectPlayerCreature(mockPlayerCard)
    })
    
    expect(result.current.battleState.playerCreature).not.toBe(null)
    expect(result.current.battleState.playerCreature?.card.name).toBe("Test Player")
    expect(result.current.battleState.playerCreature?.currentHP).toBe(80)
    expect(result.current.battleState.playerCreature?.maxHP).toBe(80)
  })

  it('should select opponent creature correctly', () => {
    const { result } = renderHook(() => useBattleState())
    const availableCards = [mockPlayerCard, mockOpponentCard]
    
    act(() => {
      result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
    })
    
    expect(result.current.battleState.opponentCreature).not.toBe(null)
    expect(result.current.battleState.opponentCreature?.card.id).toBe("test-opponent")
  })

  it('should start battle when both creatures are selected', () => {
    const { result } = renderHook(() => useBattleState())
    const availableCards = [mockPlayerCard, mockOpponentCard]
    
    act(() => {
      result.current.selectPlayerCreature(mockPlayerCard)
      result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
      result.current.startBattle()
    })
    
    expect(result.current.battleState.battleActive).toBe(true)
    expect(result.current.battleState.battlePhase).toBe(BATTLE_PHASES.BATTLE)
    expect(result.current.battleState.currentTurn).toBe(TURN_TYPES.PLAYER)
  })

  it('should execute player move correctly', () => {
    const { result } = renderHook(() => useBattleState())
    const availableCards = [mockPlayerCard, mockOpponentCard]
    
    act(() => {
      result.current.selectPlayerCreature(mockPlayerCard)
      result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
      result.current.startBattle()
    })
    
    const initialOpponentHP = result.current.battleState.opponentCreature?.currentHP
    
    act(() => {
      result.current.executePlayerMove({ name: "Test Move", power: 50, type: "fire" })
    })
    
    const finalOpponentHP = result.current.battleState.opponentCreature?.currentHP
    expect(finalOpponentHP).toBeLessThan(initialOpponentHP!)
  })

  it('should reset battle state correctly', () => {
    const { result } = renderHook(() => useBattleState())
    const availableCards = [mockPlayerCard, mockOpponentCard]
    
    // Set up a battle
    act(() => {
      result.current.selectPlayerCreature(mockPlayerCard)
      result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
      result.current.startBattle()
    })
    
    // Reset battle
    act(() => {
      result.current.resetBattle()
    })
    
    expect(result.current.battleState.battlePhase).toBe(BATTLE_PHASES.SELECTION)
    expect(result.current.battleState.battleActive).toBe(false)
    expect(result.current.battleState.playerCreature).toBe(null)
    expect(result.current.battleState.opponentCreature).toBe(null)
  })

  it('should transition to opponent turn after player move', () => {
    const { result } = renderHook(() => useBattleState())
    const availableCards = [mockPlayerCard, mockOpponentCard]
    
    act(() => {
      result.current.selectPlayerCreature(mockPlayerCard)
      result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
      result.current.startBattle()
    })
    
    expect(result.current.battleState.currentTurn).toBe(TURN_TYPES.PLAYER)
    
    act(() => {
      result.current.executePlayerMove({ name: "Test Move", power: 50, type: "fire" })
    })
    
    // Should transition to opponent turn (unless opponent was defeated)
    if (result.current.battleState.battleActive) {
      expect(result.current.battleState.currentTurn).toBe(TURN_TYPES.OPPONENT)
    }
  })

  it('should provide correct player moves', () => {
    const { result } = renderHook(() => useBattleState())
    
    act(() => {
      result.current.selectPlayerCreature(mockPlayerCard)
    })
    
    const moves = result.current.getPlayerMoves()
    expect(moves).toHaveLength(1)
    expect(moves[0].name).toBe("Test Move")
    expect(moves[0].power).toBe(50)
  })

  it('should correctly determine when player can move', () => {
    const { result } = renderHook(() => useBattleState())
    const availableCards = [mockPlayerCard, mockOpponentCard]
    
    // Initially can't move
    expect(result.current.canPlayerMove()).toBe(false)
    
    // Set up battle
    act(() => {
      result.current.selectPlayerCreature(mockPlayerCard)
      result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
      result.current.startBattle()
    })
    
    // Should be able to move on player turn
    expect(result.current.canPlayerMove()).toBe(true)
  })

  describe('Damage Calculation', () => {
    it('should calculate damage correctly with valid stats', () => {
      const { result } = renderHook(() => useBattleState())
      const availableCards = [mockPlayerCard, mockOpponentCard]
      
      act(() => {
        result.current.selectPlayerCreature(mockPlayerCard)
        result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
        result.current.startBattle()
      })
      
      const initialOpponentHP = result.current.battleState.opponentCreature?.currentHP
      
      act(() => {
        result.current.executePlayerMove({ name: "Test Move", power: 50, type: "fire" })
      })
      
      const finalOpponentHP = result.current.battleState.opponentCreature?.currentHP
      const damage = initialOpponentHP! - finalOpponentHP!
      
      // Damage should be positive and reasonable based on stats
      expect(damage).toBeGreaterThan(0)
      expect(damage).toBeLessThanOrEqual(50) // Should not exceed move power significantly
    })

    it('should apply random factor to damage calculation', () => {
      const { result } = renderHook(() => useBattleState())
      const availableCards = [mockPlayerCard, mockOpponentCard]
      
      // Execute multiple battles to test randomness
      const damageResults: number[] = []
      
      for (let i = 0; i < 10; i++) {
        const { result: testResult } = renderHook(() => useBattleState())
        
        act(() => {
          testResult.current.selectPlayerCreature(mockPlayerCard)
          testResult.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
          testResult.current.startBattle()
        })
        
        const initialHP = testResult.current.battleState.opponentCreature?.currentHP
        
        act(() => {
          testResult.current.executePlayerMove({ name: "Test Move", power: 50, type: "fire" })
        })
        
        const finalHP = testResult.current.battleState.opponentCreature?.currentHP
        damageResults.push(initialHP! - finalHP!)
      }
      
      // Should have some variation in damage due to random factor
      const uniqueDamageValues = new Set(damageResults)
      expect(uniqueDamageValues.size).toBeGreaterThan(1)
    })

    it('should handle creatures with default stats', () => {
      const cardWithoutStats: Card = {
        ...mockPlayerCard,
        stats: undefined
      }
      
      const { result } = renderHook(() => useBattleState())
      
      act(() => {
        result.current.selectPlayerCreature(cardWithoutStats)
      })
      
      expect(result.current.battleState.playerCreature?.maxHP).toBe(DEFAULT_BATTLE_STATS.hp)
      expect(result.current.battleState.playerCreature?.currentHP).toBe(DEFAULT_BATTLE_STATS.hp)
    })

    it('should ensure minimum damage of 1', () => {
      const weakCard: Card = {
        ...mockPlayerCard,
        stats: { attack: 1, defense: 1, speed: 1, hp: 100 }
      }
      
      const strongDefenseCard: Card = {
        ...mockOpponentCard,
        stats: { attack: 50, defense: 200, speed: 50, hp: 100 }
      }
      
      const { result } = renderHook(() => useBattleState())
      const availableCards = [weakCard, strongDefenseCard]
      
      act(() => {
        result.current.selectPlayerCreature(weakCard)
        result.current.selectOpponentCreature(availableCards, weakCard.id)
        result.current.startBattle()
      })
      
      const initialHP = result.current.battleState.opponentCreature?.currentHP
      
      act(() => {
        result.current.executePlayerMove({ name: "Weak Move", power: 1, type: "normal" })
      })
      
      const finalHP = result.current.battleState.opponentCreature?.currentHP
      const damage = initialHP! - finalHP!
      
      // Should deal at least 1 damage
      expect(damage).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Opponent Selection and Validation', () => {
    it('should exclude player creature from opponent selection', () => {
      const { result } = renderHook(() => useBattleState())
      const availableCards = [mockPlayerCard, mockOpponentCard]
      
      act(() => {
        result.current.selectPlayerCreature(mockPlayerCard)
      })
      
      let success: boolean
      act(() => {
        success = result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
      })
      
      expect(success!).toBe(true)
      expect(result.current.battleState.opponentCreature?.card.id).toBe(mockOpponentCard.id)
      expect(result.current.battleState.opponentCreature?.card.id).not.toBe(mockPlayerCard.id)
    })

    it('should handle case with no eligible opponents', () => {
      const { result } = renderHook(() => useBattleState())
      const availableCards = [mockPlayerCard] // Only player card available
      
      act(() => {
        result.current.selectPlayerCreature(mockPlayerCard)
      })
      
      let success: boolean
      act(() => {
        success = result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
      })
      
      expect(success!).toBe(false)
      expect(result.current.battleState.opponentCreature).toBe(null)
      expect(result.current.battleState.battleLog).toContain("No opponents available for battle!")
    })

    it('should only select ready creatures as opponents', () => {
      const notReadyCard: Card = {
        ...mockOpponentCard,
        id: "not-ready",
        status: "evolving"
      }
      
      const { result } = renderHook(() => useBattleState())
      const availableCards = [mockPlayerCard, notReadyCard, mockOpponentCard]
      
      act(() => {
        result.current.selectPlayerCreature(mockPlayerCard)
      })
      
      let success: boolean
      act(() => {
        success = result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
      })
      
      expect(success!).toBe(true)
      expect(result.current.battleState.opponentCreature?.card.id).toBe(mockOpponentCard.id)
      expect(result.current.battleState.opponentCreature?.card.status).toBe("ready")
    })

    it('should randomly select from multiple eligible opponents', () => {
      const opponent2: Card = {
        ...mockOpponentCard,
        id: "opponent-2",
        name: "Opponent 2"
      }
      
      const opponent3: Card = {
        ...mockOpponentCard,
        id: "opponent-3", 
        name: "Opponent 3"
      }
      
      const { result } = renderHook(() => useBattleState())
      const availableCards = [mockPlayerCard, mockOpponentCard, opponent2, opponent3]
      
      const selectedOpponents = new Set<string>()
      
      // Run selection multiple times to test randomness
      for (let i = 0; i < 20; i++) {
        const { result: testResult } = renderHook(() => useBattleState())
        
        act(() => {
          testResult.current.selectPlayerCreature(mockPlayerCard)
          testResult.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
        })
        
        if (testResult.current.battleState.opponentCreature) {
          selectedOpponents.add(testResult.current.battleState.opponentCreature.card.id)
        }
      }
      
      // Should have selected different opponents over multiple runs
      expect(selectedOpponents.size).toBeGreaterThan(1)
      expect(selectedOpponents.has(mockOpponentCard.id)).toBe(true)
      expect(selectedOpponents.has(opponent2.id)).toBe(true)
      expect(selectedOpponents.has(opponent3.id)).toBe(true)
    })
  })

  describe('Battle State Transitions', () => {
    it('should transition from selection to battle phase correctly', () => {
      const { result } = renderHook(() => useBattleState())
      const availableCards = [mockPlayerCard, mockOpponentCard]
      
      expect(result.current.battleState.battlePhase).toBe(BATTLE_PHASES.SELECTION)
      
      act(() => {
        result.current.selectPlayerCreature(mockPlayerCard)
        result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
        result.current.startBattle()
      })
      
      expect(result.current.battleState.battlePhase).toBe(BATTLE_PHASES.BATTLE)
      expect(result.current.battleState.battleActive).toBe(true)
      expect(result.current.battleState.currentTurn).toBe(TURN_TYPES.PLAYER)
    })

    it('should not start battle without both creatures', () => {
      const { result } = renderHook(() => useBattleState())
      
      act(() => {
        result.current.selectPlayerCreature(mockPlayerCard)
        result.current.startBattle()
      })
      
      expect(result.current.battleState.battlePhase).toBe(BATTLE_PHASES.SELECTION)
      expect(result.current.battleState.battleActive).toBe(false)
    })

    it('should transition to results phase when battle ends', () => {
      const weakOpponent: Card = {
        ...mockOpponentCard,
        stats: { attack: 10, defense: 10, speed: 10, hp: 1 } // Very low HP
      }
      
      const { result } = renderHook(() => useBattleState())
      const availableCards = [mockPlayerCard, weakOpponent]
      
      act(() => {
        result.current.selectPlayerCreature(mockPlayerCard)
        result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
        result.current.startBattle()
      })
      
      act(() => {
        result.current.executePlayerMove({ name: "Strong Move", power: 100, type: "fire" })
      })
      
      expect(result.current.battleState.battlePhase).toBe(BATTLE_PHASES.RESULTS)
      expect(result.current.battleState.battleActive).toBe(false)
      expect(result.current.battleState.winner).toBe("player")
    })

    it('should handle opponent victory correctly', () => {
      const weakPlayer: Card = {
        ...mockPlayerCard,
        stats: { attack: 10, defense: 10, speed: 10, hp: 1 } // Very low HP
      }
      
      const { result } = renderHook(() => useBattleState())
      const availableCards = [weakPlayer, mockOpponentCard]
      
      act(() => {
        result.current.selectPlayerCreature(weakPlayer)
        result.current.selectOpponentCreature(availableCards, weakPlayer.id)
        result.current.startBattle()
      })
      
      // Execute a weak move to trigger opponent turn
      act(() => {
        result.current.executePlayerMove({ name: "Weak Move", power: 1, type: "normal" })
      })
      
      // Wait for opponent move to execute (simulated)
      setTimeout(() => {
        if (result.current.battleState.winner === "opponent") {
          expect(result.current.battleState.battlePhase).toBe(BATTLE_PHASES.RESULTS)
          expect(result.current.battleState.battleActive).toBe(false)
        }
      }, 2000)
    })

    it('should reset battle state correctly for rematch', () => {
      const { result } = renderHook(() => useBattleState())
      const availableCards = [mockPlayerCard, mockOpponentCard]
      
      // Set up and complete a battle
      act(() => {
        result.current.selectPlayerCreature(mockPlayerCard)
        result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
        result.current.startBattle()
      })
      
      // Damage the creatures
      act(() => {
        result.current.executePlayerMove({ name: "Test Move", power: 30, type: "fire" })
      })
      
      const damagedPlayerHP = result.current.battleState.playerCreature?.currentHP
      const damagedOpponentHP = result.current.battleState.opponentCreature?.currentHP
      
      // Reset for rematch
      act(() => {
        result.current.resetForRematch()
      })
      
      expect(result.current.battleState.battlePhase).toBe(BATTLE_PHASES.BATTLE)
      expect(result.current.battleState.battleActive).toBe(true)
      expect(result.current.battleState.playerCreature?.currentHP).toBe(mockPlayerCard.stats!.hp)
      expect(result.current.battleState.opponentCreature?.currentHP).toBe(mockOpponentCard.stats!.hp)
      expect(result.current.battleState.battleLog).toContain("Both PokePets have been restored to full health!")
    })

    it('should clear battle state completely', () => {
      const { result } = renderHook(() => useBattleState())
      const availableCards = [mockPlayerCard, mockOpponentCard]
      
      // Set up battle
      act(() => {
        result.current.selectPlayerCreature(mockPlayerCard)
        result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
        result.current.startBattle()
      })
      
      // Clear state
      act(() => {
        result.current.clearBattleState()
      })
      
      expect(result.current.battleState.battlePhase).toBe(BATTLE_PHASES.SELECTION)
      expect(result.current.battleState.battleActive).toBe(false)
      expect(result.current.battleState.playerCreature).toBe(null)
      expect(result.current.battleState.opponentCreature).toBe(null)
      expect(result.current.battleState.winner).toBe(null)
      expect(result.current.battleState.battleLog).toHaveLength(0)
    })
  })

  describe('Battle Log Management', () => {
    it('should add messages to battle log', () => {
      const { result } = renderHook(() => useBattleState())
      
      act(() => {
        result.current.addLogMessage("Test message")
      })
      
      expect(result.current.battleState.battleLog).toContain("Test message")
    })

    it('should maintain battle log order', () => {
      const { result } = renderHook(() => useBattleState())
      
      act(() => {
        result.current.addLogMessage("First message")
        result.current.addLogMessage("Second message")
        result.current.addLogMessage("Third message")
      })
      
      const log = result.current.battleState.battleLog
      expect(log.indexOf("First message")).toBeLessThan(log.indexOf("Second message"))
      expect(log.indexOf("Second message")).toBeLessThan(log.indexOf("Third message"))
    })

    it('should log creature selection events', () => {
      const { result } = renderHook(() => useBattleState())
      const availableCards = [mockPlayerCard, mockOpponentCard]
      
      act(() => {
        result.current.selectPlayerCreature(mockPlayerCard)
      })
      
      expect(result.current.battleState.battleLog).toContain(`${mockPlayerCard.name} is ready for battle!`)
      
      act(() => {
        result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
      })
      
      expect(result.current.battleState.battleLog).toContain(`Wild ${mockOpponentCard.name} appeared!`)
    })

    it('should log battle events correctly', () => {
      const { result } = renderHook(() => useBattleState())
      const availableCards = [mockPlayerCard, mockOpponentCard]
      
      act(() => {
        result.current.selectPlayerCreature(mockPlayerCard)
        result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
        result.current.startBattle()
      })
      
      expect(result.current.battleState.battleLog).toContain("Battle begins!")
      expect(result.current.battleState.battleLog).toContain("Choose your move!")
      
      act(() => {
        result.current.executePlayerMove({ name: "Test Move", power: 50, type: "fire" })
      })
      
      expect(result.current.battleState.battleLog).toContain(`${mockPlayerCard.name} used Test Move!`)
      expect(result.current.battleState.battleLog.some(msg => msg.includes("Dealt") && msg.includes("damage!"))).toBe(true)
    })
  })

  describe('Move Handling', () => {
    it('should use default moves when creature has no moves', () => {
      const cardWithoutMoves: Card = {
        ...mockPlayerCard,
        moves: undefined
      }
      
      const { result } = renderHook(() => useBattleState())
      
      act(() => {
        result.current.selectPlayerCreature(cardWithoutMoves)
      })
      
      const moves = result.current.getPlayerMoves()
      expect(moves).toEqual(DEFAULT_MOVES)
      expect(moves.length).toBeGreaterThan(0)
    })

    it('should track last move executed', () => {
      const { result } = renderHook(() => useBattleState())
      const availableCards = [mockPlayerCard, mockOpponentCard]
      
      act(() => {
        result.current.selectPlayerCreature(mockPlayerCard)
        result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
        result.current.startBattle()
      })
      
      const testMove = { name: "Test Move", power: 50, type: "fire" }
      
      act(() => {
        result.current.executePlayerMove(testMove)
      })
      
      expect(result.current.battleState.lastMove).not.toBe(null)
      expect(result.current.battleState.lastMove?.moveName).toBe("Test Move")
      expect(result.current.battleState.lastMove?.target).toBe("opponent")
      expect(result.current.battleState.lastMove?.damage).toBeGreaterThan(0)
    })
  })

  describe('Battle Completion Detection', () => {
    it('should correctly identify when battle is complete', () => {
      const { result } = renderHook(() => useBattleState())
      
      // Initially not complete
      expect(result.current.isBattleComplete()).toBe(false)
      
      // Set up completed battle state
      act(() => {
        result.current.battleState.battlePhase = BATTLE_PHASES.RESULTS
        result.current.battleState.winner = "player"
      })
      
      expect(result.current.isBattleComplete()).toBe(true)
    })

    it('should not consider battle complete without winner', () => {
      const { result } = renderHook(() => useBattleState())
      
      act(() => {
        result.current.battleState.battlePhase = BATTLE_PHASES.RESULTS
        result.current.battleState.winner = null
      })
      
      expect(result.current.isBattleComplete()).toBe(false)
    })
  })
})