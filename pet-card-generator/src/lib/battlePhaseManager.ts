// Battle phase management utilities

import { BattleState, BATTLE_PHASES, TURN_TYPES } from "@/types/battle"

export class BattlePhaseManager {
  /**
   * Determines if the battle can transition to the next phase
   */
  static canTransitionToPhase(currentState: BattleState, targetPhase: string): boolean {
    switch (targetPhase) {
      case BATTLE_PHASES.SELECTION:
        return true // Can always return to selection
      
      case BATTLE_PHASES.BATTLE:
        return currentState.playerCreature !== null && 
               currentState.opponentCreature !== null
      
      case BATTLE_PHASES.RESULTS:
        return currentState.winner !== null
      
      default:
        return false
    }
  }

  /**
   * Gets the next valid phase based on current battle state
   */
  static getNextPhase(currentState: BattleState): string {
    switch (currentState.battlePhase) {
      case BATTLE_PHASES.SELECTION:
        if (currentState.playerCreature && currentState.opponentCreature) {
          return BATTLE_PHASES.BATTLE
        }
        return BATTLE_PHASES.SELECTION
      
      case BATTLE_PHASES.BATTLE:
        if (currentState.winner) {
          return BATTLE_PHASES.RESULTS
        }
        return BATTLE_PHASES.BATTLE
      
      case BATTLE_PHASES.RESULTS:
        return BATTLE_PHASES.SELECTION // Can start new battle
      
      default:
        return BATTLE_PHASES.SELECTION
    }
  }

  /**
   * Validates if a battle action is allowed in the current phase
   */
  static isActionAllowed(currentState: BattleState, action: string): boolean {
    switch (currentState.battlePhase) {
      case BATTLE_PHASES.SELECTION:
        return ["SELECT_PLAYER_CREATURE", "SELECT_OPPONENT_CREATURE", "START_BATTLE"].includes(action)
      
      case BATTLE_PHASES.BATTLE:
        return ["EXECUTE_MOVE", "END_TURN", "END_BATTLE"].includes(action)
      
      case BATTLE_PHASES.RESULTS:
        return ["RESET_BATTLE", "START_BATTLE"].includes(action)
      
      default:
        return false
    }
  }

  /**
   * Gets the appropriate UI state for the current battle phase
   */
  static getPhaseUIState(currentState: BattleState) {
    return {
      showCreatureSelection: currentState.battlePhase === BATTLE_PHASES.SELECTION,
      showBattleArena: currentState.battlePhase === BATTLE_PHASES.BATTLE,
      showBattleResults: currentState.battlePhase === BATTLE_PHASES.RESULTS,
      showMoveButtons: currentState.battlePhase === BATTLE_PHASES.BATTLE && 
                      currentState.currentTurn === TURN_TYPES.PLAYER &&
                      !currentState.isOpponentThinking,
      showOpponentThinking: currentState.isOpponentThinking,
      showStartBattleButton: currentState.battlePhase === BATTLE_PHASES.SELECTION &&
                            currentState.playerCreature !== null &&
                            currentState.opponentCreature !== null,
      showResetButton: currentState.battlePhase === BATTLE_PHASES.RESULTS
    }
  }

  /**
   * Gets descriptive text for the current battle phase
   */
  static getPhaseDescription(currentState: BattleState): string {
    switch (currentState.battlePhase) {
      case BATTLE_PHASES.SELECTION:
        if (!currentState.playerCreature) {
          return "Select your PokePet for battle"
        }
        if (!currentState.opponentCreature) {
          return "Finding an opponent..."
        }
        return "Ready to battle!"
      
      case BATTLE_PHASES.BATTLE:
        if (currentState.isOpponentThinking) {
          return "Opponent is thinking..."
        }
        if (currentState.currentTurn === TURN_TYPES.PLAYER) {
          return "Choose your move!"
        }
        return "Opponent's turn"
      
      case BATTLE_PHASES.RESULTS:
        if (currentState.winner === "player") {
          return "Victory! You won the battle!"
        }
        if (currentState.winner === "opponent") {
          return "Defeat! Better luck next time!"
        }
        return "Battle ended"
      
      default:
        return "Battle system ready"
    }
  }

  /**
   * Determines the next turn based on current state and battle rules
   */
  static getNextTurn(currentState: BattleState): "player" | "opponent" {
    if (currentState.battlePhase !== BATTLE_PHASES.BATTLE || !currentState.battleActive) {
      return TURN_TYPES.PLAYER
    }

    // Simple turn alternation
    return currentState.currentTurn === TURN_TYPES.PLAYER ? TURN_TYPES.OPPONENT : TURN_TYPES.PLAYER
  }

  /**
   * Checks if the battle should end based on creature HP
   */
  static shouldEndBattle(currentState: BattleState): boolean {
    if (!currentState.playerCreature || !currentState.opponentCreature) {
      return false
    }

    return currentState.playerCreature.currentHP <= 0 || 
           currentState.opponentCreature.currentHP <= 0
  }
}