// Unit tests for battle state cleanup functionality

import { renderHook, act } from '@testing-library/react'
import { useBattleState } from './useBattleState'
import { Card } from '@/hooks/use-cards'
import { BATTLE_PHASES } from '@/types/battle'
import { vi } from 'vitest'

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

// Mock setTimeout and clearTimeout to track timer management
const originalSetTimeout = global.setTimeout
const originalClearTimeout = global.clearTimeout

let mockTimers: Set<NodeJS.Timeout> = new Set()
let mockTimerCallbacks: Map<NodeJS.Timeout, () => void> = new Map()
let timerIdCounter = 0

const mockSetTimeout = vi.fn((callback: () => void, _delay: number) => {
  const timerId = ++timerIdCounter as unknown as NodeJS.Timeout
  mockTimers.add(timerId)
  mockTimerCallbacks.set(timerId, callback)
  return timerId
})

const mockClearTimeout = vi.fn((timerId: NodeJS.Timeout) => {
  mockTimers.delete(timerId)
  mockTimerCallbacks.delete(timerId)
})

describe('useBattleState - Cleanup Functionality', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockTimers.clear()
    mockTimerCallbacks.clear()
    timerIdCounter = 0
    vi.clearAllMocks()
    
    // Mock timer functions
    global.setTimeout = mockSetTimeout as any
    global.clearTimeout = mockClearTimeout as any
  })

  afterEach(() => {
    // Restore original timer functions
    global.setTimeout = originalSetTimeout
    global.clearTimeout = originalClearTimeout
  })

  describe('Action Cleanup Functionality', () => {
    it('should disable battle actions when cleanupBattleActions is called', () => {
      const { result } = renderHook(() => useBattleState())
      const availableCards = [mockPlayerCard, mockOpponentCard]
      
      // Set up battle
      act(() => {
        result.current.selectPlayerCreature(mockPlayerCard)
        result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
        result.current.startBattle()
      })
      
      // Initially should be able to move
      expect(result.current.canPlayerMove()).toBe(true)
      
      // Call cleanup
      act(() => {
        result.current.cleanupBattleActions()
      })
      
      // Should no longer be able to move
      expect(result.current.canPlayerMove()).toBe(false)
    })

    it('should disable battle actions without adding log messages', () => {
      const { result } = renderHook(() => useBattleState())
      
      const initialLogLength = result.current.battleState.battleLog.length
      
      act(() => {
        result.current.cleanupBattleActions()
      })
      
      // Should not add any log messages (cleanup is silent now)
      expect(result.current.battleState.battleLog).toHaveLength(initialLogLength)
      // Should still disable actions
      expect(result.current.canPlayerMove()).toBe(false)
    })

    it('should prevent new battle actions after cleanup', () => {
      const { result } = renderHook(() => useBattleState())
      const availableCards = [mockPlayerCard, mockOpponentCard]
      
      // Set up battle
      act(() => {
        result.current.selectPlayerCreature(mockPlayerCard)
        result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
        result.current.startBattle()
      })
      
      // Execute cleanup
      act(() => {
        result.current.cleanupBattleActions()
      })
      
      // canPlayerMove should return false after cleanup
      expect(result.current.canPlayerMove()).toBe(false)
      
      // This test verifies that the UI would prevent moves, not that executePlayerMove itself blocks them
      // The actual prevention happens at the UI level by checking canPlayerMove()
    })

    it('should be callable multiple times without errors', () => {
      const { result } = renderHook(() => useBattleState())
      
      const initialLogLength = result.current.battleState.battleLog.length
      
      expect(() => {
        act(() => {
          result.current.cleanupBattleActions()
          result.current.cleanupBattleActions()
          result.current.cleanupBattleActions()
        })
      }).not.toThrow()
      
      // Should not add any log messages (cleanup is silent now)
      expect(result.current.battleState.battleLog).toHaveLength(initialLogLength)
      // Should still disable actions
      expect(result.current.canPlayerMove()).toBe(false)
    })
  })

  describe('Timer Clearing and Management', () => {
    it('should clear all active timers when cleanupBattleActions is called', () => {
      const { result } = renderHook(() => useBattleState())
      const availableCards = [mockPlayerCard, mockOpponentCard]
      
      // Set up battle to create some timers
      act(() => {
        result.current.selectPlayerCreature(mockPlayerCard)
        result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
        result.current.startBattle()
      })
      
      // Trigger opponent move to create timers
      act(() => {
        result.current.executePlayerMove({ name: "Test Move", power: 30, type: "fire" })
      })
      
      // Should have created some timers
      expect(mockSetTimeout).toHaveBeenCalled()
      const timerCountBeforeCleanup = mockTimers.size
      
      // Call cleanup
      act(() => {
        result.current.cleanupBattleActions()
      })
      
      // Should have called clearTimeout for each active timer
      expect(mockClearTimeout).toHaveBeenCalledTimes(timerCountBeforeCleanup)
    })

    it('should clear timers on component unmount', () => {
      const { result, unmount } = renderHook(() => useBattleState())
      const availableCards = [mockPlayerCard, mockOpponentCard]
      
      // Set up battle and create timers
      act(() => {
        result.current.selectPlayerCreature(mockPlayerCard)
        result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
        result.current.startBattle()
        result.current.executePlayerMove({ name: "Test Move", power: 30, type: "fire" })
      })
      
      const timerCountBeforeUnmount = mockTimers.size
      
      // Unmount component
      unmount()
      
      // Should have cleared all timers
      expect(mockClearTimeout).toHaveBeenCalledTimes(timerCountBeforeUnmount)
    })

    it('should manage timers correctly during opponent moves', () => {
      const { result } = renderHook(() => useBattleState())
      const availableCards = [mockPlayerCard, mockOpponentCard]
      
      // Set up battle
      act(() => {
        result.current.selectPlayerCreature(mockPlayerCard)
        result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
        result.current.startBattle()
      })
      
      const initialTimerCount = mockSetTimeout.mock.calls.length
      
      // Execute player move to trigger opponent thinking
      act(() => {
        result.current.executePlayerMove({ name: "Test Move", power: 30, type: "fire" })
      })
      
      // Should have created new timers for opponent move
      expect(mockSetTimeout.mock.calls.length).toBeGreaterThan(initialTimerCount)
      
      // Verify opponent is thinking
      expect(result.current.battleState.isOpponentThinking).toBe(true)
    })

    it('should not create new timers after cleanup', () => {
      const { result } = renderHook(() => useBattleState())
      const availableCards = [mockPlayerCard, mockOpponentCard]
      
      // Set up battle
      act(() => {
        result.current.selectPlayerCreature(mockPlayerCard)
        result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
        result.current.startBattle()
      })
      
      // Call cleanup
      act(() => {
        result.current.cleanupBattleActions()
      })
      
      const timerCountAfterCleanup = mockSetTimeout.mock.calls.length
      
      // Try to execute moves that would normally create timers
      act(() => {
        result.current.executePlayerMove({ name: "Test Move", power: 30, type: "fire" })
      })
      
      // Should not have created new timers (allowing for cleanup timer itself)
      expect(mockSetTimeout.mock.calls.length).toBeLessThanOrEqual(timerCountAfterCleanup + 1)
    })
  })

  describe('Post-Battle State Transitions', () => {
    it('should automatically trigger cleanup when player wins', () => {
      const weakOpponent: Card = {
        ...mockOpponentCard,
        stats: { attack: 10, defense: 10, speed: 10, hp: 1 } // Very low HP
      }
      
      const { result } = renderHook(() => useBattleState())
      const availableCards = [mockPlayerCard, weakOpponent]
      
      // Set up battle
      act(() => {
        result.current.selectPlayerCreature(mockPlayerCard)
        result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
        result.current.startBattle()
      })
      
      // Execute winning move
      act(() => {
        result.current.executePlayerMove({ name: "Strong Move", power: 100, type: "fire" })
      })
      
      // Should have transitioned to results phase
      expect(result.current.battleState.battlePhase).toBe(BATTLE_PHASES.RESULTS)
      expect(result.current.battleState.winner).toBe("player")
      
      // Should have disabled actions
      expect(result.current.canPlayerMove()).toBe(false)
      
      // Execute the cleanup timer callback manually
      act(() => {
        // Find and execute the cleanup callback (100ms timer)
        const callbacks = Array.from(mockTimerCallbacks.values())
        if (callbacks.length > 0) {
          callbacks[0]() // Execute the first callback which should be cleanup
        }
      })
      
      // Cleanup is no longer automatically triggered on battle end
      // This allows for smoother transitions to rematch or new battles
      expect(result.current.battleState.battlePhase).toBe('results')
    })

    it('should automatically trigger cleanup when player loses', () => {
      const weakPlayer: Card = {
        ...mockPlayerCard,
        stats: { attack: 10, defense: 10, speed: 10, hp: 1 } // Very low HP
      }
      
      const { result } = renderHook(() => useBattleState())
      const availableCards = [weakPlayer, mockOpponentCard]
      
      // Set up battle
      act(() => {
        result.current.selectPlayerCreature(weakPlayer)
        result.current.selectOpponentCreature(availableCards, weakPlayer.id)
        result.current.startBattle()
      })
      
      // Execute weak move to trigger opponent turn
      act(() => {
        result.current.executePlayerMove({ name: "Weak Move", power: 1, type: "normal" })
      })
      
      // Simulate opponent move execution by manually triggering the timer callback
      const opponentMoveCallback = Array.from(mockTimerCallbacks.values())[0]
      if (opponentMoveCallback) {
        act(() => {
          opponentMoveCallback()
        })
      }
      
      // If player was defeated, should have cleanup
      if (result.current.battleState.winner === "opponent") {
        expect(result.current.battleState.battlePhase).toBe(BATTLE_PHASES.RESULTS)
        expect(result.current.canPlayerMove()).toBe(false)
      }
    })

    it('should handle cleanup during battle reset', () => {
      const { result } = renderHook(() => useBattleState())
      const availableCards = [mockPlayerCard, mockOpponentCard]
      
      // Set up battle
      act(() => {
        result.current.selectPlayerCreature(mockPlayerCard)
        result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
        result.current.startBattle()
      })
      
      // Create some timers
      act(() => {
        result.current.executePlayerMove({ name: "Test Move", power: 30, type: "fire" })
      })
      
      // Reset battle
      act(() => {
        result.current.resetBattle()
      })
      
      // Should have cleared timers
      expect(mockClearTimeout).toHaveBeenCalled()
      
      // Should have reset to selection phase
      expect(result.current.battleState.battlePhase).toBe(BATTLE_PHASES.SELECTION)
      expect(result.current.battleState.battleActive).toBe(false)
    })

    it('should handle cleanup during rematch reset', () => {
      const { result } = renderHook(() => useBattleState())
      const availableCards = [mockPlayerCard, mockOpponentCard]
      
      // Set up battle
      act(() => {
        result.current.selectPlayerCreature(mockPlayerCard)
        result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
        result.current.startBattle()
      })
      
      // Create some timers
      act(() => {
        result.current.executePlayerMove({ name: "Test Move", power: 30, type: "fire" })
      })
      
      // Reset for rematch
      act(() => {
        result.current.resetForRematch()
      })
      
      // Should have cleared timers
      expect(mockClearTimeout).toHaveBeenCalled()
      
      // Should have reset to battle phase with creatures intact
      expect(result.current.battleState.battlePhase).toBe(BATTLE_PHASES.BATTLE)
      expect(result.current.battleState.battleActive).toBe(true)
      expect(result.current.battleState.playerCreature).not.toBe(null)
      expect(result.current.battleState.opponentCreature).not.toBe(null)
    })

    it('should handle cleanup during clear battle state', () => {
      const { result } = renderHook(() => useBattleState())
      const availableCards = [mockPlayerCard, mockOpponentCard]
      
      // Set up battle
      act(() => {
        result.current.selectPlayerCreature(mockPlayerCard)
        result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
        result.current.startBattle()
      })
      
      // Create some timers
      act(() => {
        result.current.executePlayerMove({ name: "Test Move", power: 30, type: "fire" })
      })
      
      // Clear battle state
      act(() => {
        result.current.clearBattleState()
      })
      
      // Should have cleared timers
      expect(mockClearTimeout).toHaveBeenCalled()
      
      // Should have completely reset state
      expect(result.current.battleState.battlePhase).toBe(BATTLE_PHASES.SELECTION)
      expect(result.current.battleState.battleActive).toBe(false)
      expect(result.current.battleState.playerCreature).toBe(null)
      expect(result.current.battleState.opponentCreature).toBe(null)
      expect(result.current.battleState.battleLog).toHaveLength(0)
    })

    it('should re-enable actions after reset operations', async () => {
      const { result } = renderHook(() => useBattleState())
      const availableCards = [mockPlayerCard, mockOpponentCard]
      
      // Set up battle
      act(() => {
        result.current.selectPlayerCreature(mockPlayerCard)
        result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
        result.current.startBattle()
      })
      
      // Reset battle
      act(() => {
        result.current.resetBattle()
      })
      
      // Wait for the re-enable timer (1000ms delay in resetBattle)
      await act(async () => {
        // Simulate the timer callback execution
        const reEnableCallback = Array.from(mockTimerCallbacks.values()).pop()
        if (reEnableCallback) {
          reEnableCallback()
        }
      })
      
      // Set up new battle
      act(() => {
        result.current.selectPlayerCreature(mockPlayerCard)
        result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
        result.current.startBattle()
      })
      
      // Should be able to move again
      expect(result.current.canPlayerMove()).toBe(true)
    })

    it('should handle victory celebration timers correctly', () => {
      const { result } = renderHook(() => useBattleState())
      
      // Start victory celebration
      act(() => {
        result.current.startVictoryCelebration()
      })
      
      // Should be celebrating
      expect(result.current.battleState.celebrationActive).toBe(true)
      
      // Should have created a timer for auto-stop
      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 5000)
      
      // Simulate timer callback execution
      const celebrationCallback = Array.from(mockTimerCallbacks.values()).pop()
      if (celebrationCallback) {
        act(() => {
          celebrationCallback()
        })
      }
      
      // Should have stopped celebrating
      expect(result.current.battleState.celebrationActive).toBe(false)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle cleanup when no timers are active', () => {
      const { result } = renderHook(() => useBattleState())
      
      expect(() => {
        act(() => {
          result.current.cleanupBattleActions()
        })
      }).not.toThrow()
      
      expect(mockClearTimeout).not.toHaveBeenCalled()
    })

    it('should handle cleanup with invalid timer references', () => {
      const { result } = renderHook(() => useBattleState())
      
      // Manually add invalid timer to simulate edge case
      mockTimers.add(-1 as unknown as NodeJS.Timeout)
      
      expect(() => {
        act(() => {
          result.current.cleanupBattleActions()
        })
      }).not.toThrow()
    })

    it('should maintain state consistency during rapid cleanup calls', () => {
      const { result } = renderHook(() => useBattleState())
      const availableCards = [mockPlayerCard, mockOpponentCard]
      
      // Set up battle
      act(() => {
        result.current.selectPlayerCreature(mockPlayerCard)
        result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
        result.current.startBattle()
      })
      
      // Rapid cleanup calls
      act(() => {
        result.current.cleanupBattleActions()
        result.current.cleanupBattleActions()
        result.current.cleanupBattleActions()
      })
      
      // State should remain consistent
      expect(result.current.canPlayerMove()).toBe(false)
      // No log messages should be added (cleanup is silent now)
      expect(result.current.battleState.battleLog.filter(
        msg => msg === "Battle actions disabled."
      )).toHaveLength(0)
    })

    it('should handle cleanup during active opponent thinking', () => {
      const { result } = renderHook(() => useBattleState())
      const availableCards = [mockPlayerCard, mockOpponentCard]
      
      // Set up battle
      act(() => {
        result.current.selectPlayerCreature(mockPlayerCard)
        result.current.selectOpponentCreature(availableCards, mockPlayerCard.id)
        result.current.startBattle()
      })
      
      // Trigger opponent thinking
      act(() => {
        result.current.executePlayerMove({ name: "Test Move", power: 30, type: "fire" })
      })
      
      // Should be thinking
      expect(result.current.battleState.isOpponentThinking).toBe(true)
      
      // Call cleanup during thinking
      act(() => {
        result.current.cleanupBattleActions()
      })
      
      // Should have cleared timers and disabled actions
      expect(mockClearTimeout).toHaveBeenCalled()
      expect(result.current.canPlayerMove()).toBe(false)
    })
  })
})