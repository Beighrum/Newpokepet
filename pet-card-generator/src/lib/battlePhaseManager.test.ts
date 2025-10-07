// Unit tests for battle phase management utilities

import { BattlePhaseManager } from './battlePhaseManager'
import { BattleState, BATTLE_PHASES, TURN_TYPES } from '@/types/battle'
import { Card } from '@/hooks/use-cards'

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
  moves: [{ name: "Test Move", power: 50, type: "fire" }]
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
  moves: [{ name: "Test Counter", power: 45, type: "water" }]
}

const createMockBattleState = (overrides: Partial<BattleState> = {}): BattleState => ({
  playerCreature: null,
  opponentCreature: null,
  battleLog: [],
  currentTurn: TURN_TYPES.PLAYER,
  battleActive: false,
  battlePhase: BATTLE_PHASES.SELECTION,
  winner: null,
  isOpponentThinking: false,
  lastMove: null,
  ...overrides
})

describe('BattlePhaseManager', () => {
  describe('canTransitionToPhase', () => {
    it('should allow transition to selection phase from any state', () => {
      const state = createMockBattleState({ battlePhase: BATTLE_PHASES.BATTLE })
      
      expect(BattlePhaseManager.canTransitionToPhase(state, BATTLE_PHASES.SELECTION)).toBe(true)
    })

    it('should allow transition to battle phase when both creatures are selected', () => {
      const state = createMockBattleState({
        playerCreature: { card: mockPlayerCard, currentHP: 80, maxHP: 80 },
        opponentCreature: { card: mockOpponentCard, currentHP: 75, maxHP: 75 }
      })
      
      expect(BattlePhaseManager.canTransitionToPhase(state, BATTLE_PHASES.BATTLE)).toBe(true)
    })

    it('should not allow transition to battle phase without both creatures', () => {
      const stateWithoutOpponent = createMockBattleState({
        playerCreature: { card: mockPlayerCard, currentHP: 80, maxHP: 80 }
      })
      
      expect(BattlePhaseManager.canTransitionToPhase(stateWithoutOpponent, BATTLE_PHASES.BATTLE)).toBe(false)
      
      const stateWithoutPlayer = createMockBattleState({
        opponentCreature: { card: mockOpponentCard, currentHP: 75, maxHP: 75 }
      })
      
      expect(BattlePhaseManager.canTransitionToPhase(stateWithoutPlayer, BATTLE_PHASES.BATTLE)).toBe(false)
    })

    it('should allow transition to results phase when winner is determined', () => {
      const state = createMockBattleState({ winner: "player" })
      
      expect(BattlePhaseManager.canTransitionToPhase(state, BATTLE_PHASES.RESULTS)).toBe(true)
    })

    it('should not allow transition to results phase without winner', () => {
      const state = createMockBattleState({ winner: null })
      
      expect(BattlePhaseManager.canTransitionToPhase(state, BATTLE_PHASES.RESULTS)).toBe(false)
    })

    it('should return false for invalid phase', () => {
      const state = createMockBattleState()
      
      expect(BattlePhaseManager.canTransitionToPhase(state, "invalid-phase")).toBe(false)
    })
  })

  describe('getNextPhase', () => {
    it('should return battle phase when both creatures are selected in selection phase', () => {
      const state = createMockBattleState({
        battlePhase: BATTLE_PHASES.SELECTION,
        playerCreature: { card: mockPlayerCard, currentHP: 80, maxHP: 80 },
        opponentCreature: { card: mockOpponentCard, currentHP: 75, maxHP: 75 }
      })
      
      expect(BattlePhaseManager.getNextPhase(state)).toBe(BATTLE_PHASES.BATTLE)
    })

    it('should return selection phase when creatures are not selected', () => {
      const state = createMockBattleState({ battlePhase: BATTLE_PHASES.SELECTION })
      
      expect(BattlePhaseManager.getNextPhase(state)).toBe(BATTLE_PHASES.SELECTION)
    })

    it('should return results phase when winner is determined in battle phase', () => {
      const state = createMockBattleState({
        battlePhase: BATTLE_PHASES.BATTLE,
        winner: "player"
      })
      
      expect(BattlePhaseManager.getNextPhase(state)).toBe(BATTLE_PHASES.RESULTS)
    })

    it('should return battle phase when battle is ongoing', () => {
      const state = createMockBattleState({
        battlePhase: BATTLE_PHASES.BATTLE,
        winner: null
      })
      
      expect(BattlePhaseManager.getNextPhase(state)).toBe(BATTLE_PHASES.BATTLE)
    })

    it('should return selection phase from results phase', () => {
      const state = createMockBattleState({ battlePhase: BATTLE_PHASES.RESULTS })
      
      expect(BattlePhaseManager.getNextPhase(state)).toBe(BATTLE_PHASES.SELECTION)
    })
  })

  describe('isActionAllowed', () => {
    it('should allow selection actions in selection phase', () => {
      const state = createMockBattleState({ battlePhase: BATTLE_PHASES.SELECTION })
      
      expect(BattlePhaseManager.isActionAllowed(state, "SELECT_PLAYER_CREATURE")).toBe(true)
      expect(BattlePhaseManager.isActionAllowed(state, "SELECT_OPPONENT_CREATURE")).toBe(true)
      expect(BattlePhaseManager.isActionAllowed(state, "START_BATTLE")).toBe(true)
    })

    it('should not allow battle actions in selection phase', () => {
      const state = createMockBattleState({ battlePhase: BATTLE_PHASES.SELECTION })
      
      expect(BattlePhaseManager.isActionAllowed(state, "EXECUTE_MOVE")).toBe(false)
      expect(BattlePhaseManager.isActionAllowed(state, "END_TURN")).toBe(false)
    })

    it('should allow battle actions in battle phase', () => {
      const state = createMockBattleState({ battlePhase: BATTLE_PHASES.BATTLE })
      
      expect(BattlePhaseManager.isActionAllowed(state, "EXECUTE_MOVE")).toBe(true)
      expect(BattlePhaseManager.isActionAllowed(state, "END_TURN")).toBe(true)
      expect(BattlePhaseManager.isActionAllowed(state, "END_BATTLE")).toBe(true)
    })

    it('should not allow selection actions in battle phase', () => {
      const state = createMockBattleState({ battlePhase: BATTLE_PHASES.BATTLE })
      
      expect(BattlePhaseManager.isActionAllowed(state, "SELECT_PLAYER_CREATURE")).toBe(false)
    })

    it('should allow reset actions in results phase', () => {
      const state = createMockBattleState({ battlePhase: BATTLE_PHASES.RESULTS })
      
      expect(BattlePhaseManager.isActionAllowed(state, "RESET_BATTLE")).toBe(true)
      expect(BattlePhaseManager.isActionAllowed(state, "START_BATTLE")).toBe(true)
    })
  })

  describe('getPhaseUIState', () => {
    it('should show creature selection in selection phase', () => {
      const state = createMockBattleState({ battlePhase: BATTLE_PHASES.SELECTION })
      const uiState = BattlePhaseManager.getPhaseUIState(state)
      
      expect(uiState.showCreatureSelection).toBe(true)
      expect(uiState.showBattleArena).toBe(false)
      expect(uiState.showBattleResults).toBe(false)
    })

    it('should show battle arena in battle phase', () => {
      const state = createMockBattleState({ battlePhase: BATTLE_PHASES.BATTLE })
      const uiState = BattlePhaseManager.getPhaseUIState(state)
      
      expect(uiState.showCreatureSelection).toBe(false)
      expect(uiState.showBattleArena).toBe(true)
      expect(uiState.showBattleResults).toBe(false)
    })

    it('should show battle results in results phase', () => {
      const state = createMockBattleState({ battlePhase: BATTLE_PHASES.RESULTS })
      const uiState = BattlePhaseManager.getPhaseUIState(state)
      
      expect(uiState.showCreatureSelection).toBe(false)
      expect(uiState.showBattleArena).toBe(false)
      expect(uiState.showBattleResults).toBe(true)
    })

    it('should show move buttons on player turn in battle phase', () => {
      const state = createMockBattleState({
        battlePhase: BATTLE_PHASES.BATTLE,
        currentTurn: TURN_TYPES.PLAYER,
        isOpponentThinking: false
      })
      const uiState = BattlePhaseManager.getPhaseUIState(state)
      
      expect(uiState.showMoveButtons).toBe(true)
    })

    it('should not show move buttons when opponent is thinking', () => {
      const state = createMockBattleState({
        battlePhase: BATTLE_PHASES.BATTLE,
        currentTurn: TURN_TYPES.PLAYER,
        isOpponentThinking: true
      })
      const uiState = BattlePhaseManager.getPhaseUIState(state)
      
      expect(uiState.showMoveButtons).toBe(false)
    })

    it('should show opponent thinking indicator when appropriate', () => {
      const state = createMockBattleState({ isOpponentThinking: true })
      const uiState = BattlePhaseManager.getPhaseUIState(state)
      
      expect(uiState.showOpponentThinking).toBe(true)
    })

    it('should show start battle button when both creatures are selected', () => {
      const state = createMockBattleState({
        battlePhase: BATTLE_PHASES.SELECTION,
        playerCreature: { card: mockPlayerCard, currentHP: 80, maxHP: 80 },
        opponentCreature: { card: mockOpponentCard, currentHP: 75, maxHP: 75 }
      })
      const uiState = BattlePhaseManager.getPhaseUIState(state)
      
      expect(uiState.showStartBattleButton).toBe(true)
    })

    it('should show reset button in results phase', () => {
      const state = createMockBattleState({ battlePhase: BATTLE_PHASES.RESULTS })
      const uiState = BattlePhaseManager.getPhaseUIState(state)
      
      expect(uiState.showResetButton).toBe(true)
    })
  })

  describe('getPhaseDescription', () => {
    it('should return appropriate description for selection phase without player creature', () => {
      const state = createMockBattleState({ battlePhase: BATTLE_PHASES.SELECTION })
      
      expect(BattlePhaseManager.getPhaseDescription(state)).toBe("Select your PokePet for battle")
    })

    it('should return appropriate description for selection phase without opponent creature', () => {
      const state = createMockBattleState({
        battlePhase: BATTLE_PHASES.SELECTION,
        playerCreature: { card: mockPlayerCard, currentHP: 80, maxHP: 80 }
      })
      
      expect(BattlePhaseManager.getPhaseDescription(state)).toBe("Finding an opponent...")
    })

    it('should return ready message when both creatures are selected', () => {
      const state = createMockBattleState({
        battlePhase: BATTLE_PHASES.SELECTION,
        playerCreature: { card: mockPlayerCard, currentHP: 80, maxHP: 80 },
        opponentCreature: { card: mockOpponentCard, currentHP: 75, maxHP: 75 }
      })
      
      expect(BattlePhaseManager.getPhaseDescription(state)).toBe("Ready to battle!")
    })

    it('should return thinking message when opponent is thinking', () => {
      const state = createMockBattleState({
        battlePhase: BATTLE_PHASES.BATTLE,
        isOpponentThinking: true
      })
      
      expect(BattlePhaseManager.getPhaseDescription(state)).toBe("Opponent is thinking...")
    })

    it('should return move prompt on player turn', () => {
      const state = createMockBattleState({
        battlePhase: BATTLE_PHASES.BATTLE,
        currentTurn: TURN_TYPES.PLAYER,
        isOpponentThinking: false
      })
      
      expect(BattlePhaseManager.getPhaseDescription(state)).toBe("Choose your move!")
    })

    it('should return opponent turn message', () => {
      const state = createMockBattleState({
        battlePhase: BATTLE_PHASES.BATTLE,
        currentTurn: TURN_TYPES.OPPONENT,
        isOpponentThinking: false
      })
      
      expect(BattlePhaseManager.getPhaseDescription(state)).toBe("Opponent's turn")
    })

    it('should return victory message for player win', () => {
      const state = createMockBattleState({
        battlePhase: BATTLE_PHASES.RESULTS,
        winner: "player"
      })
      
      expect(BattlePhaseManager.getPhaseDescription(state)).toBe("Victory! You won the battle!")
    })

    it('should return defeat message for opponent win', () => {
      const state = createMockBattleState({
        battlePhase: BATTLE_PHASES.RESULTS,
        winner: "opponent"
      })
      
      expect(BattlePhaseManager.getPhaseDescription(state)).toBe("Defeat! Better luck next time!")
    })
  })

  describe('getNextTurn', () => {
    it('should return player turn by default', () => {
      const state = createMockBattleState({ battlePhase: BATTLE_PHASES.SELECTION })
      
      expect(BattlePhaseManager.getNextTurn(state)).toBe(TURN_TYPES.PLAYER)
    })

    it('should alternate turns in battle phase', () => {
      const playerTurnState = createMockBattleState({
        battlePhase: BATTLE_PHASES.BATTLE,
        battleActive: true,
        currentTurn: TURN_TYPES.PLAYER
      })
      
      expect(BattlePhaseManager.getNextTurn(playerTurnState)).toBe(TURN_TYPES.OPPONENT)
      
      const opponentTurnState = createMockBattleState({
        battlePhase: BATTLE_PHASES.BATTLE,
        battleActive: true,
        currentTurn: TURN_TYPES.OPPONENT
      })
      
      expect(BattlePhaseManager.getNextTurn(opponentTurnState)).toBe(TURN_TYPES.PLAYER)
    })

    it('should return player turn when battle is not active', () => {
      const state = createMockBattleState({
        battlePhase: BATTLE_PHASES.BATTLE,
        battleActive: false,
        currentTurn: TURN_TYPES.OPPONENT
      })
      
      expect(BattlePhaseManager.getNextTurn(state)).toBe(TURN_TYPES.PLAYER)
    })
  })

  describe('shouldEndBattle', () => {
    it('should return false when creatures are not set', () => {
      const state = createMockBattleState()
      
      expect(BattlePhaseManager.shouldEndBattle(state)).toBe(false)
    })

    it('should return true when player creature HP is 0', () => {
      const state = createMockBattleState({
        playerCreature: { card: mockPlayerCard, currentHP: 0, maxHP: 80 },
        opponentCreature: { card: mockOpponentCard, currentHP: 50, maxHP: 75 }
      })
      
      expect(BattlePhaseManager.shouldEndBattle(state)).toBe(true)
    })

    it('should return true when opponent creature HP is 0', () => {
      const state = createMockBattleState({
        playerCreature: { card: mockPlayerCard, currentHP: 50, maxHP: 80 },
        opponentCreature: { card: mockOpponentCard, currentHP: 0, maxHP: 75 }
      })
      
      expect(BattlePhaseManager.shouldEndBattle(state)).toBe(true)
    })

    it('should return false when both creatures have HP', () => {
      const state = createMockBattleState({
        playerCreature: { card: mockPlayerCard, currentHP: 50, maxHP: 80 },
        opponentCreature: { card: mockOpponentCard, currentHP: 40, maxHP: 75 }
      })
      
      expect(BattlePhaseManager.shouldEndBattle(state)).toBe(false)
    })
  })
})