// Unit tests for opponent selection and validation logic

import { Card } from '@/hooks/use-cards'

// Mock opponent selection function extracted from useBattleState logic
const selectOpponentCreature = (availableCards: Card[], excludeCardId: string) => {
  const eligibleCards = availableCards.filter(card => 
    card.id !== excludeCardId && card.status === "ready"
  )
  
  if (eligibleCards.length === 0) {
    return {
      success: false,
      opponent: null,
      message: "No opponents available for battle!"
    }
  }

  const randomIndex = Math.floor(Math.random() * eligibleCards.length)
  const opponentCard = eligibleCards[randomIndex]
  
  return {
    success: true,
    opponent: opponentCard,
    message: `Wild ${opponentCard.name} appeared!`
  }
}

// Mock card data for testing
const createMockCard = (id: string, name: string, status: "ready" | "evolving" | "training" = "ready"): Card => ({
  id,
  name,
  status,
  imageUrl: `/test-${id}.png`,
  element: "fire",
  rarity: "common",
  stage: "baby",
  xp: 50,
  maxXp: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
  stats: { attack: 50, defense: 50, speed: 50, hp: 80 },
  moves: [{ name: "Test Move", power: 40, type: "normal" }]
})

describe('Opponent Selection and Validation', () => {
  describe('Basic Selection Logic', () => {
    it('should select an opponent from available cards', () => {
      const playerCard = createMockCard("player-1", "Player Pet")
      const opponentCard = createMockCard("opponent-1", "Opponent Pet")
      const availableCards = [playerCard, opponentCard]
      
      const result = selectOpponentCreature(availableCards, playerCard.id)
      
      expect(result.success).toBe(true)
      expect(result.opponent).not.toBe(null)
      expect(result.opponent?.id).toBe(opponentCard.id)
      expect(result.message).toBe(`Wild ${opponentCard.name} appeared!`)
    })

    it('should exclude the player card from selection', () => {
      const playerCard = createMockCard("player-1", "Player Pet")
      const opponentCard1 = createMockCard("opponent-1", "Opponent Pet 1")
      const opponentCard2 = createMockCard("opponent-2", "Opponent Pet 2")
      const availableCards = [playerCard, opponentCard1, opponentCard2]
      
      const result = selectOpponentCreature(availableCards, playerCard.id)
      
      expect(result.success).toBe(true)
      expect(result.opponent?.id).not.toBe(playerCard.id)
      expect([opponentCard1.id, opponentCard2.id]).toContain(result.opponent?.id)
    })

    it('should only select cards with ready status', () => {
      const playerCard = createMockCard("player-1", "Player Pet")
      const readyOpponent = createMockCard("opponent-1", "Ready Opponent", "ready")
      const evolvingOpponent = createMockCard("opponent-2", "Evolving Opponent", "evolving")
      const trainingOpponent = createMockCard("opponent-3", "Training Opponent", "training")
      const availableCards = [playerCard, readyOpponent, evolvingOpponent, trainingOpponent]
      
      const result = selectOpponentCreature(availableCards, playerCard.id)
      
      expect(result.success).toBe(true)
      expect(result.opponent?.id).toBe(readyOpponent.id)
      expect(result.opponent?.status).toBe("ready")
    })
  })

  describe('Edge Cases', () => {
    it('should handle case with no eligible opponents', () => {
      const playerCard = createMockCard("player-1", "Player Pet")
      const availableCards = [playerCard] // Only player card
      
      const result = selectOpponentCreature(availableCards, playerCard.id)
      
      expect(result.success).toBe(false)
      expect(result.opponent).toBe(null)
      expect(result.message).toBe("No opponents available for battle!")
    })

    it('should handle case with only non-ready opponents', () => {
      const playerCard = createMockCard("player-1", "Player Pet")
      const evolvingOpponent = createMockCard("opponent-1", "Evolving Opponent", "evolving")
      const trainingOpponent = createMockCard("opponent-2", "Training Opponent", "training")
      const availableCards = [playerCard, evolvingOpponent, trainingOpponent]
      
      const result = selectOpponentCreature(availableCards, playerCard.id)
      
      expect(result.success).toBe(false)
      expect(result.opponent).toBe(null)
      expect(result.message).toBe("No opponents available for battle!")
    })

    it('should handle empty card array', () => {
      const availableCards: Card[] = []
      
      const result = selectOpponentCreature(availableCards, "any-id")
      
      expect(result.success).toBe(false)
      expect(result.opponent).toBe(null)
      expect(result.message).toBe("No opponents available for battle!")
    })

    it('should handle case where excluded ID does not exist', () => {
      const opponentCard1 = createMockCard("opponent-1", "Opponent Pet 1")
      const opponentCard2 = createMockCard("opponent-2", "Opponent Pet 2")
      const availableCards = [opponentCard1, opponentCard2]
      
      const result = selectOpponentCreature(availableCards, "non-existent-id")
      
      expect(result.success).toBe(true)
      expect(result.opponent).not.toBe(null)
      expect([opponentCard1.id, opponentCard2.id]).toContain(result.opponent?.id)
    })
  })

  describe('Random Selection Behavior', () => {
    it('should randomly select from multiple eligible opponents', () => {
      const playerCard = createMockCard("player-1", "Player Pet")
      const opponents = [
        createMockCard("opponent-1", "Opponent Pet 1"),
        createMockCard("opponent-2", "Opponent Pet 2"),
        createMockCard("opponent-3", "Opponent Pet 3"),
        createMockCard("opponent-4", "Opponent Pet 4")
      ]
      const availableCards = [playerCard, ...opponents]
      
      const selectedOpponents = new Set<string>()
      
      // Run selection many times to test randomness
      for (let i = 0; i < 100; i++) {
        const result = selectOpponentCreature(availableCards, playerCard.id)
        if (result.success && result.opponent) {
          selectedOpponents.add(result.opponent.id)
        }
      }
      
      // Should have selected multiple different opponents
      expect(selectedOpponents.size).toBeGreaterThan(1)
      
      // Should have selected each opponent at least once (with high probability)
      opponents.forEach(opponent => {
        expect(selectedOpponents.has(opponent.id)).toBe(true)
      })
    })

    it('should have roughly equal distribution for multiple opponents', () => {
      const playerCard = createMockCard("player-1", "Player Pet")
      const opponent1 = createMockCard("opponent-1", "Opponent Pet 1")
      const opponent2 = createMockCard("opponent-2", "Opponent Pet 2")
      const availableCards = [playerCard, opponent1, opponent2]
      
      const selectionCounts = new Map<string, number>()
      const totalSelections = 1000
      
      for (let i = 0; i < totalSelections; i++) {
        const result = selectOpponentCreature(availableCards, playerCard.id)
        if (result.success && result.opponent) {
          const count = selectionCounts.get(result.opponent.id) || 0
          selectionCounts.set(result.opponent.id, count + 1)
        }
      }
      
      // Each opponent should be selected roughly 50% of the time (within reasonable variance)
      const opponent1Count = selectionCounts.get(opponent1.id) || 0
      const opponent2Count = selectionCounts.get(opponent2.id) || 0
      
      expect(opponent1Count).toBeGreaterThan(totalSelections * 0.3) // At least 30%
      expect(opponent1Count).toBeLessThan(totalSelections * 0.7)    // At most 70%
      expect(opponent2Count).toBeGreaterThan(totalSelections * 0.3)
      expect(opponent2Count).toBeLessThan(totalSelections * 0.7)
      
      // Total should equal totalSelections
      expect(opponent1Count + opponent2Count).toBe(totalSelections)
    })

    it('should always select the only eligible opponent', () => {
      const playerCard = createMockCard("player-1", "Player Pet")
      const onlyOpponent = createMockCard("opponent-1", "Only Opponent")
      const evolvingCard = createMockCard("opponent-2", "Evolving Card", "evolving")
      const availableCards = [playerCard, onlyOpponent, evolvingCard]
      
      // Run multiple times to ensure consistency
      for (let i = 0; i < 10; i++) {
        const result = selectOpponentCreature(availableCards, playerCard.id)
        
        expect(result.success).toBe(true)
        expect(result.opponent?.id).toBe(onlyOpponent.id)
      }
    })
  })

  describe('Status Validation', () => {
    it('should filter out all non-ready statuses', () => {
      const playerCard = createMockCard("player-1", "Player Pet")
      const readyOpponent = createMockCard("ready-1", "Ready Opponent", "ready")
      const evolvingOpponent = createMockCard("evolving-1", "Evolving Opponent", "evolving")
      const trainingOpponent = createMockCard("training-1", "Training Opponent", "training")
      
      const availableCards = [playerCard, readyOpponent, evolvingOpponent, trainingOpponent]
      
      // Run multiple selections to ensure only ready opponent is selected
      for (let i = 0; i < 20; i++) {
        const result = selectOpponentCreature(availableCards, playerCard.id)
        
        expect(result.success).toBe(true)
        expect(result.opponent?.id).toBe(readyOpponent.id)
        expect(result.opponent?.status).toBe("ready")
      }
    })

    it('should handle mixed ready and non-ready opponents correctly', () => {
      const playerCard = createMockCard("player-1", "Player Pet")
      const readyOpponents = [
        createMockCard("ready-1", "Ready Opponent 1", "ready"),
        createMockCard("ready-2", "Ready Opponent 2", "ready"),
        createMockCard("ready-3", "Ready Opponent 3", "ready")
      ]
      const nonReadyOpponents = [
        createMockCard("evolving-1", "Evolving Opponent 1", "evolving"),
        createMockCard("training-1", "Training Opponent 1", "training"),
        createMockCard("evolving-2", "Evolving Opponent 2", "evolving")
      ]
      
      const availableCards = [playerCard, ...readyOpponents, ...nonReadyOpponents]
      const selectedOpponents = new Set<string>()
      
      // Run many selections
      for (let i = 0; i < 100; i++) {
        const result = selectOpponentCreature(availableCards, playerCard.id)
        
        expect(result.success).toBe(true)
        expect(result.opponent?.status).toBe("ready")
        
        if (result.opponent) {
          selectedOpponents.add(result.opponent.id)
        }
      }
      
      // Should only select from ready opponents
      readyOpponents.forEach(opponent => {
        expect(selectedOpponents.has(opponent.id)).toBe(true)
      })
      
      // Should never select non-ready opponents
      nonReadyOpponents.forEach(opponent => {
        expect(selectedOpponents.has(opponent.id)).toBe(false)
      })
    })
  })

  describe('ID Exclusion Logic', () => {
    it('should properly exclude multiple IDs if needed', () => {
      // Test the exclusion logic with different scenarios
      const cards = [
        createMockCard("card-1", "Card 1"),
        createMockCard("card-2", "Card 2"),
        createMockCard("card-3", "Card 3"),
        createMockCard("card-4", "Card 4")
      ]
      
      // Test excluding first card
      let result = selectOpponentCreature(cards, "card-1")
      expect(result.success).toBe(true)
      expect(result.opponent?.id).not.toBe("card-1")
      
      // Test excluding middle card
      result = selectOpponentCreature(cards, "card-2")
      expect(result.success).toBe(true)
      expect(result.opponent?.id).not.toBe("card-2")
      
      // Test excluding last card
      result = selectOpponentCreature(cards, "card-4")
      expect(result.success).toBe(true)
      expect(result.opponent?.id).not.toBe("card-4")
    })

    it('should handle case-sensitive ID matching', () => {
      const playerCard = createMockCard("Player-1", "Player Pet")
      const opponentCard = createMockCard("player-1", "Opponent Pet") // Different case
      const availableCards = [playerCard, opponentCard]
      
      const result = selectOpponentCreature(availableCards, "Player-1")
      
      expect(result.success).toBe(true)
      expect(result.opponent?.id).toBe("player-1") // Should select the different case ID
    })

    it('should handle special characters in IDs', () => {
      const playerCard = createMockCard("player-1@test", "Player Pet")
      const opponentCard = createMockCard("opponent-1#test", "Opponent Pet")
      const availableCards = [playerCard, opponentCard]
      
      const result = selectOpponentCreature(availableCards, "player-1@test")
      
      expect(result.success).toBe(true)
      expect(result.opponent?.id).toBe("opponent-1#test")
    })
  })

  describe('Message Generation', () => {
    it('should generate correct success message with opponent name', () => {
      const playerCard = createMockCard("player-1", "Player Pet")
      const opponentCard = createMockCard("opponent-1", "Fire Dragon")
      const availableCards = [playerCard, opponentCard]
      
      const result = selectOpponentCreature(availableCards, playerCard.id)
      
      expect(result.success).toBe(true)
      expect(result.message).toBe("Wild Fire Dragon appeared!")
    })

    it('should generate correct failure message', () => {
      const playerCard = createMockCard("player-1", "Player Pet")
      const availableCards = [playerCard]
      
      const result = selectOpponentCreature(availableCards, playerCard.id)
      
      expect(result.success).toBe(false)
      expect(result.message).toBe("No opponents available for battle!")
    })

    it('should handle special characters in opponent names', () => {
      const playerCard = createMockCard("player-1", "Player Pet")
      const opponentCard = createMockCard("opponent-1", "Fire Dragon & Ice Phoenix")
      const availableCards = [playerCard, opponentCard]
      
      const result = selectOpponentCreature(availableCards, playerCard.id)
      
      expect(result.success).toBe(true)
      expect(result.message).toBe("Wild Fire Dragon & Ice Phoenix appeared!")
    })
  })
})