// Battle state management hook using React useState

import { useState, useCallback, useEffect, useRef } from "react"
import { Card } from "@/hooks/use-cards"
import { 
  BattleCreature, 
  BattleMove, 
  DamageCalculation,
  DEFAULT_BATTLE_STATS,
  DEFAULT_MOVES,
  BATTLE_PHASES,
  TURN_TYPES,
  EnhancedBattleState,
  PostBattleRewards,
  StatIncreases
} from "@/types/battle"
import { 
  calculateExperience, 
  checkLevelUp, 
  calculateStatIncreases,
  determineBattleDifficulty,
  getLevelFromExperience,
  getExperienceInCurrentLevel
} from "@/lib/experienceCalculation"
import {
  calculateTotalGemRewards,
  determineBattleDifficultyForGems
} from "@/lib/gemCalculation"
import { updateAndSavePetProgression } from "@/lib/petDataPersistence"
import { addUserGems } from "@/lib/gemPersistence"

const INITIAL_BATTLE_STATE: EnhancedBattleState = {
  playerCreature: null,
  opponentCreature: null,
  battleLog: [],
  currentTurn: TURN_TYPES.PLAYER,
  battleActive: false,
  battlePhase: BATTLE_PHASES.SELECTION,
  winner: null,
  isOpponentThinking: false,
  lastMove: null,
  postBattleRewards: null,
  celebrationActive: false
}

export const useBattleState = () => {
  const [battleState, setBattleState] = useState<EnhancedBattleState>(INITIAL_BATTLE_STATE)
  const activeTimersRef = useRef<Set<NodeJS.Timeout>>(new Set())
  const battleActionsEnabledRef = useRef<boolean>(true)

  // Clean up battle actions and timers
  const cleanupBattleActions = useCallback(() => {
    // Clear all active timers
    activeTimersRef.current.forEach(timer => {
      clearTimeout(timer)
    })
    activeTimersRef.current.clear()
    
    // Disable battle actions (only when truly ending battle)
    battleActionsEnabledRef.current = false
  }, [])

  // Enhanced timer management for opponent moves
  const createManagedTimeout = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      activeTimersRef.current.delete(timer)
      callback()
    }, delay)
    
    activeTimersRef.current.add(timer)
    return timer
  }, [])

  // Auto-execute opponent moves when it's their turn
  useEffect(() => {
    if (battleState.currentTurn === TURN_TYPES.OPPONENT && 
        battleState.battleActive && 
        battleState.battlePhase === BATTLE_PHASES.BATTLE &&
        !battleState.isOpponentThinking) {
      executeOpponentMove()
    }
  }, [battleState.currentTurn, battleState.battleActive, battleState.battlePhase, battleState.isOpponentThinking])

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      // Clean up all timers when component unmounts
      activeTimersRef.current.forEach(timer => {
        clearTimeout(timer)
      })
      activeTimersRef.current.clear()
    }
  }, [])

  // Helper function to create a battle creature from a card
  const createBattleCreature = useCallback((card: Card): BattleCreature => {
    const stats = card.stats || DEFAULT_BATTLE_STATS
    const maxHP = stats.hp || DEFAULT_BATTLE_STATS.hp
    
    return {
      card,
      currentHP: maxHP,
      maxHP
    }
  }, [])

  // Select player creature
  const selectPlayerCreature = useCallback((card: Card) => {
    const battleCreature = createBattleCreature(card)
    setBattleState(prev => ({
      ...prev,
      playerCreature: battleCreature,
      battleLog: [...prev.battleLog, `${card.name} is ready for battle!`]
    }))
  }, [createBattleCreature])

  // Select opponent creature (random selection from available cards)
  const selectOpponentCreature = useCallback((availableCards: Card[], excludeCardId: string) => {
    const eligibleCards = availableCards.filter(card => 
      card.id !== excludeCardId && card.status === "ready"
    )
    
    if (eligibleCards.length === 0) {
      setBattleState(prev => ({
        ...prev,
        battleLog: [...prev.battleLog, "No opponents available for battle!"]
      }))
      return false
    }

    const randomIndex = Math.floor(Math.random() * eligibleCards.length)
    const opponentCard = eligibleCards[randomIndex]
    const battleCreature = createBattleCreature(opponentCard)
    
    setBattleState(prev => ({
      ...prev,
      opponentCreature: battleCreature,
      battleLog: [...prev.battleLog, `Wild ${opponentCard.name} appeared!`]
    }))
    
    return true
  }, [createBattleCreature])

  // Start battle
  const startBattle = useCallback(() => {
    setBattleState(prev => {
      if (!prev.playerCreature || !prev.opponentCreature) {
        return prev
      }

      return {
        ...prev,
        battleActive: true,
        battlePhase: BATTLE_PHASES.BATTLE,
        currentTurn: TURN_TYPES.PLAYER,
        battleLog: [...prev.battleLog, "Battle begins!", "Choose your move!"]
      }
    })
    
    return true
  }, [])

  // Calculate damage
  const calculateDamage = useCallback((
    attackerCard: Card, 
    defenderCard: Card, 
    move: BattleMove
  ): DamageCalculation => {
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
  }, [])

  // Execute player move
  const executePlayerMove = useCallback((move: BattleMove) => {
    setBattleState(prev => {
      if (!prev.playerCreature || !prev.opponentCreature || 
          prev.currentTurn !== TURN_TYPES.PLAYER || !prev.battleActive) {
        return prev
      }

      const damage = calculateDamage(
        prev.playerCreature.card,
        prev.opponentCreature.card,
        move
      )

      const newOpponentHP = Math.max(0, prev.opponentCreature.currentHP - damage.finalDamage)
      const isOpponentDefeated = newOpponentHP === 0

      const newState = {
        ...prev,
        opponentCreature: {
          ...prev.opponentCreature,
          currentHP: newOpponentHP
        },
        battleLog: [
          ...prev.battleLog,
          `${prev.playerCreature.card.name} used ${move.name}!`,
          `Dealt ${damage.finalDamage} damage!`
        ],
        currentTurn: isOpponentDefeated ? TURN_TYPES.PLAYER : TURN_TYPES.OPPONENT,
        battleActive: !isOpponentDefeated,
        battlePhase: isOpponentDefeated ? BATTLE_PHASES.RESULTS : BATTLE_PHASES.BATTLE,
        winner: isOpponentDefeated ? ("player" as const) : null,
        lastMove: {
          moveName: move.name,
          damage: damage.finalDamage,
          target: 'opponent' as const
        }
      }

      if (isOpponentDefeated) {
        newState.battleLog = [
          ...newState.battleLog,
          `${prev.opponentCreature.card.name} fainted!`,
          "You won the battle!"
        ]
        
        // Calculate post-battle rewards with simplified, reliable system
        const opponentLevel = Math.max(1, Math.floor((prev.opponentCreature.card.xp || 0) / 100) + 1)
        
        // Simple but reliable reward calculation
        const baseExperience = 25 + (opponentLevel * 5) // 30-75 XP based on opponent level
        const baseGems = 3 + Math.floor(opponentLevel / 2) // 3-8 gems based on opponent level
        
        // Add some randomness for variety
        const experienceBonus = Math.floor(Math.random() * 15) // 0-14 bonus XP
        const gemBonus = Math.floor(Math.random() * 3) // 0-2 bonus gems
        
        const totalExperience = baseExperience + experienceBonus
        const totalGems = baseGems + gemBonus
        
        // Simple level up check (every 100 XP = 1 level)
        const currentXP = prev.playerCreature.card.xp || 0
        const newXP = currentXP + totalExperience
        const currentLevel = Math.floor(currentXP / 100) + 1
        const newLevel = Math.floor(newXP / 100) + 1
        const leveledUp = newLevel > currentLevel
        
        newState.postBattleRewards = {
          experienceGained: totalExperience,
          gemsEarned: totalGems,
          gemsStolen: 0,
          levelUp: leveledUp,
          statIncreases: leveledUp ? {
            hp: Math.floor(Math.random() * 5) + 3,
            attack: Math.floor(Math.random() * 4) + 2,
            defense: Math.floor(Math.random() * 4) + 2,
            previousLevel: currentLevel,
            newLevel: newLevel
          } : null
        }
        
        // Add reward messages to battle log
        newState.battleLog = [
          ...newState.battleLog,
          `Gained ${totalExperience} experience points!`,
          `Earned ${totalGems} gems!`
        ]
        
        if (leveledUp) {
          newState.battleLog = [
            ...newState.battleLog,
            `🎉 ${prev.playerCreature.card.name} leveled up to level ${newLevel}!`
          ]
        }
        
        // Update pet data immediately in battle state
        if (newState.postBattleRewards && newState.postBattleRewards.experienceGained > 0) {
          // Update the pet card with new XP and stats
          const updatedCard = { ...prev.playerCreature.card }
          updatedCard.xp = (updatedCard.xp || 0) + newState.postBattleRewards.experienceGained
          
          // Update stats if leveled up
          if (newState.postBattleRewards.statIncreases && updatedCard.stats) {
            updatedCard.stats = {
              ...updatedCard.stats,
              attack: updatedCard.stats.attack + newState.postBattleRewards.statIncreases.attack,
              defense: updatedCard.stats.defense + newState.postBattleRewards.statIncreases.defense,
              hp: updatedCard.stats.hp + newState.postBattleRewards.statIncreases.hp
            }
          }
          
          // Update the battle creature with new card data
          newState.playerCreature = {
            ...prev.playerCreature,
            card: updatedCard
          }
        }
        
        // Update pet progression and gems asynchronously with error handling
        if (newState.postBattleRewards && (newState.postBattleRewards.experienceGained > 0 || newState.postBattleRewards.gemsEarned > 0 || newState.postBattleRewards.gemsStolen > 0)) {
          setTimeout(async () => {
            try {
              // Update pet progression (for persistence)
              if (newState.postBattleRewards!.experienceGained > 0) {
                await updatePetProgression(prev.playerCreature!, newState.postBattleRewards!.experienceGained, newState.postBattleRewards!.statIncreases)
              }
              
              // Update user gems
              if (newState.postBattleRewards!.gemsEarned > 0 || newState.postBattleRewards!.gemsStolen > 0) {
                await updateUserGems(newState.postBattleRewards!.gemsEarned, newState.postBattleRewards!.gemsStolen)
              }
            } catch (error) {
              console.error('Error updating post-battle data:', error)
              const isNetworkError = error instanceof Error && (
                error.message.includes('network') || 
                error.message.includes('fetch') ||
                error.message.includes('timeout') ||
                error.name === 'NetworkError'
              )
              
              // Add appropriate error message to battle log
              setBattleState(currentState => ({
                ...currentState,
                battleLog: [...currentState.battleLog, 
                  isNetworkError 
                    ? "Network error: Rewards may be delayed. Check your connection."
                    : "Warning: Failed to save some reward data. Please check your progress."
                ]
              }))
            }
          }, 1000) // Delay to let battle results render first
        }
        
        // Note: Cleanup will be handled by reset functions when needed
        
        // Trigger victory celebration for player wins
        setTimeout(() => {
          setBattleState(currentState => ({
            ...currentState,
            celebrationActive: true
          }))
          
          // Auto-stop celebration after 4 seconds
          const celebrationTimer = setTimeout(() => {
            setBattleState(currentState => ({
              ...currentState,
              celebrationActive: false
            }))
          }, 4000)
          
          activeTimersRef.current.add(celebrationTimer)
        }, 500) // Small delay to let battle results render first
      }

      return newState
    })
  }, [calculateDamage])

  // Execute opponent move (AI)
  const executeOpponentMove = useCallback(() => {
    setBattleState(prev => {
      if (!prev.playerCreature || !prev.opponentCreature || 
          prev.currentTurn !== TURN_TYPES.OPPONENT || !prev.battleActive) {
        return prev
      }

      // Set thinking state
      const newState = { ...prev, isOpponentThinking: true }
      
      // Simulate AI thinking delay with managed timeout
      createManagedTimeout(() => {
        setBattleState(currentState => {
          if (!currentState.playerCreature || !currentState.opponentCreature) {
            return currentState
          }

          const opponentMoves = currentState.opponentCreature.card.moves || DEFAULT_MOVES
          const randomMoveIndex = Math.floor(Math.random() * opponentMoves.length)
          const selectedMove = opponentMoves[randomMoveIndex]

          const damage = calculateDamage(
            currentState.opponentCreature.card,
            currentState.playerCreature.card,
            selectedMove
          )

          const newPlayerHP = Math.max(0, currentState.playerCreature.currentHP - damage.finalDamage)
          const isPlayerDefeated = newPlayerHP === 0

          const updatedState = {
            ...currentState,
            playerCreature: {
              ...currentState.playerCreature,
              currentHP: newPlayerHP
            },
            battleLog: [
              ...currentState.battleLog,
              `${currentState.opponentCreature.card.name} used ${selectedMove.name}!`,
              `Dealt ${damage.finalDamage} damage!`
            ],
            currentTurn: isPlayerDefeated ? TURN_TYPES.OPPONENT : TURN_TYPES.PLAYER,
            battleActive: !isPlayerDefeated,
            battlePhase: isPlayerDefeated ? BATTLE_PHASES.RESULTS : BATTLE_PHASES.BATTLE,
            winner: isPlayerDefeated ? ("opponent" as const) : null,
            isOpponentThinking: false,
            lastMove: {
              moveName: selectedMove.name,
              damage: damage.finalDamage,
              target: 'player' as const
            }
          }

          if (isPlayerDefeated) {
            updatedState.battleLog = [
              ...updatedState.battleLog, 
              `${currentState.playerCreature.card.name} fainted!`, 
              "You lost the battle!"
            ]
            // Note: Cleanup will be handled by reset functions when needed
          } else {
            updatedState.battleLog = [...updatedState.battleLog, "Choose your next move!"]
          }

          return updatedState
        })
      }, 1500) // 1.5 second delay for AI thinking

      return newState
    })
  }, [calculateDamage])

  // Reset battle to initial state with proper cleanup
  const resetBattle = useCallback(() => {
    // Clean up all timers and actions first
    cleanupBattleActions()
    
    setBattleState(prev => {
      // Add a final log message about resetting
      const resetMessage = prev.battlePhase === BATTLE_PHASES.RESULTS 
        ? "Battle completed! Returning to creature selection..." 
        : "Battle reset! Returning to creature selection..."
      
      return {
        ...INITIAL_BATTLE_STATE,
        battleLog: [resetMessage]
      }
    })
    
    // Re-enable battle actions and clear state after delay
    const resetTimer = setTimeout(() => {
      battleActionsEnabledRef.current = true
      setBattleState(INITIAL_BATTLE_STATE)
    }, 1000)
    
    activeTimersRef.current.add(resetTimer)
  }, [cleanupBattleActions])

  // Reset battle but keep creatures for rematch
  const resetForRematch = useCallback(() => {
    // Clear any existing timers but don't disable actions for rematch
    activeTimersRef.current.forEach(timer => {
      clearTimeout(timer)
    })
    activeTimersRef.current.clear()
    
    setBattleState(prev => {
      if (!prev.playerCreature || !prev.opponentCreature) {
        return INITIAL_BATTLE_STATE
      }

      // Restore full HP to both creatures
      const restoredPlayerCreature = {
        ...prev.playerCreature,
        currentHP: prev.playerCreature.maxHP
      }
      
      const restoredOpponentCreature = {
        ...prev.opponentCreature,
        currentHP: prev.opponentCreature.maxHP
      }

      return {
        ...INITIAL_BATTLE_STATE,
        playerCreature: restoredPlayerCreature,
        opponentCreature: restoredOpponentCreature,
        battleLog: [
          `${restoredPlayerCreature.card.name} is ready for battle!`,
          `Wild ${restoredOpponentCreature.card.name} appeared!`,
          "Both PokePets have been restored to full health!",
          "Ready for a rematch!"
        ],
        battlePhase: BATTLE_PHASES.BATTLE,
        battleActive: true,
        currentTurn: TURN_TYPES.PLAYER
      }
    })
    
    // Ensure battle actions remain enabled for immediate play
    battleActionsEnabledRef.current = true
  }, [])

  // Check if battle is complete
  const isBattleComplete = useCallback((): boolean => {
    return battleState.battlePhase === BATTLE_PHASES.RESULTS && battleState.winner !== null
  }, [battleState.battlePhase, battleState.winner])

  // Immediately clear all battle state (for clean resets)
  const clearBattleState = useCallback(() => {
    // Clean up all timers and actions
    cleanupBattleActions()
    setBattleState(INITIAL_BATTLE_STATE)
    // Re-enable actions immediately for clean reset
    battleActionsEnabledRef.current = true
  }, [cleanupBattleActions])

  // Add message to battle log
  const addLogMessage = useCallback((message: string) => {
    setBattleState(prev => ({
      ...prev,
      battleLog: [...prev.battleLog, message]
    }))
  }, [])

  // Get available moves for current player creature
  const getPlayerMoves = useCallback((): BattleMove[] => {
    if (!battleState.playerCreature) return []
    return battleState.playerCreature.card.moves || DEFAULT_MOVES
  }, [battleState.playerCreature])

  // Check if player can make a move
  const canPlayerMove = useCallback((): boolean => {
    return battleState.battleActive && 
           battleState.currentTurn === TURN_TYPES.PLAYER && 
           !battleState.isOpponentThinking &&
           battleState.battlePhase === BATTLE_PHASES.BATTLE &&
           battleActionsEnabledRef.current
  }, [battleState])

  // Set post-battle rewards
  const setPostBattleRewards = useCallback((rewards: PostBattleRewards) => {
    setBattleState(prev => ({
      ...prev,
      postBattleRewards: rewards
    }))
  }, [])

  // Start victory celebration
  const startVictoryCelebration = useCallback(() => {
    setBattleState(prev => ({
      ...prev,
      celebrationActive: true
    }))
    
    // Auto-stop celebration after 5 seconds
    const celebrationTimer = setTimeout(() => {
      setBattleState(prev => ({
        ...prev,
        celebrationActive: false
      }))
    }, 5000)
    
    activeTimersRef.current.add(celebrationTimer)
  }, [])

  // Calculate post-battle rewards including experience, leveling, and gems with error handling
  const calculatePostBattleRewards = useCallback((
    winner: "player" | "opponent",
    playerLevel: number = 1,
    playerExperience: number = 0,
    isPvP: boolean = false,
    opponentGems: number = 0
  ): PostBattleRewards => {
    const fallbackRewards: PostBattleRewards = {
      experienceGained: 0,
      gemsEarned: 0,
      gemsStolen: 0,
      levelUp: false,
      statIncreases: null
    }

    try {
      if (winner !== "player" || !battleState.playerCreature || !battleState.opponentCreature) {
        return fallbackRewards
      }

      // Validate input parameters
      if (typeof playerLevel !== 'number' || playerLevel < 1) {
        console.warn('Invalid player level, using default')
        playerLevel = 1
      }
      if (typeof playerExperience !== 'number' || playerExperience < 0) {
        console.warn('Invalid player experience, using default')
        playerExperience = 0
      }
    } catch (error) {
      console.error('Error validating reward calculation parameters:', error)
      return fallbackRewards
    }

    try {
      // Determine battle difficulty for experience
      const experienceDifficulty = determineBattleDifficulty(battleState.playerCreature, battleState.opponentCreature)
      
      // Calculate experience gained
      const opponentLevel = getLevelFromExperience(battleState.opponentCreature.card.xp || 0)
      const experienceCalc = calculateExperience(opponentLevel, experienceDifficulty, true)
      
      // Check for level up
      const levelProgression = checkLevelUp(playerLevel, playerExperience, experienceCalc.totalExperience)
      
      // Calculate stat increases if leveled up
      let statIncreases: StatIncreases | null = null
      if (levelProgression.leveledUp) {
        const baseStats = battleState.playerCreature.card.stats || DEFAULT_BATTLE_STATS
        statIncreases = calculateStatIncreases(
          playerLevel,
          levelProgression.currentLevel,
          baseStats
        )
      }

      // Determine battle difficulty for gems (may be different from experience difficulty)
      const gemDifficulty = determineBattleDifficultyForGems(battleState.playerCreature, battleState.opponentCreature)
      
      // Calculate gem rewards
      const gemRewards = calculateTotalGemRewards(
        true, // isPlayerVictory
        isPvP,
        playerLevel,
        gemDifficulty,
        opponentGems,
        opponentLevel
      )

      return {
        experienceGained: experienceCalc.totalExperience,
        gemsEarned: gemRewards.victoryGems,
        gemsStolen: gemRewards.stolenGems,
        levelUp: levelProgression.leveledUp,
        statIncreases
      }
    } catch (error) {
      console.error('Error calculating post-battle rewards:', error)
      // Return fallback rewards with some basic values
      return {
        experienceGained: Math.max(5, Math.floor(playerLevel * 2)), // Fallback experience based on level
        gemsEarned: Math.max(1, Math.floor(playerLevel / 2)), // Fallback gems based on level
        gemsStolen: 0,
        levelUp: false,
        statIncreases: null
      }
    }
  }, [battleState.playerCreature, battleState.opponentCreature])

  // Trigger level up and return stat increases
  const triggerLevelUp = useCallback((
    creature: BattleCreature, 
    experienceGained: number
  ): StatIncreases | null => {
    const currentLevel = getLevelFromExperience(creature.card.xp || 0)
    const currentExperience = getExperienceInCurrentLevel(creature.card.xp || 0, currentLevel)
    
    const levelProgression = checkLevelUp(currentLevel, currentExperience, experienceGained)
    
    if (levelProgression.leveledUp) {
      const baseStats = creature.card.stats || DEFAULT_BATTLE_STATS
      return calculateStatIncreases(currentLevel, levelProgression.currentLevel, baseStats)
    }
    
    return null
  }, [])

  // Update pet data with progression and persist changes
  const updatePetProgression = useCallback(async (
    creature: BattleCreature,
    experienceGained: number,
    statIncreases: StatIncreases | null
  ): Promise<void> => {
    try {
      const updatedCard = await updateAndSavePetProgression(
        creature.card,
        experienceGained,
        statIncreases
      )
      
      // Update the battle state with the new card data
      setBattleState(prev => ({
        ...prev,
        playerCreature: prev.playerCreature ? {
          ...prev.playerCreature,
          card: updatedCard
        } : null
      }))
      
      addLogMessage(`${creature.card.name} gained ${experienceGained} experience!`)
      
      if (statIncreases) {
        addLogMessage(`${creature.card.name} leveled up! Stats increased!`)
      }
      
    } catch (error) {
      console.error('Failed to update pet progression:', error)
      addLogMessage('Failed to save progression data.')
    }
  }, [addLogMessage])

  // Update user gems after battle completion
  const updateUserGems = useCallback(async (
    gemsEarned: number,
    gemsStolen: number,
    userId: string = 'default'
  ): Promise<void> => {
    try {
      if (gemsEarned > 0 || gemsStolen > 0) {
        const newTotal = await addUserGems(userId, gemsEarned, gemsStolen)
        
        if (gemsEarned > 0) {
          addLogMessage(`Earned ${gemsEarned} gems from victory!`)
        }
        
        if (gemsStolen > 0) {
          addLogMessage(`Stole ${gemsStolen} gems from opponent!`)
        }
        
        addLogMessage(`Total gems: ${newTotal}`)
      }
      
    } catch (error) {
      console.error('Failed to update user gems:', error)
      addLogMessage('Failed to save gem rewards.')
    }
  }, [addLogMessage])

  return {
    battleState,
    selectPlayerCreature,
    selectOpponentCreature,
    startBattle,
    executePlayerMove,
    executeOpponentMove,
    resetBattle,
    resetForRematch,
    clearBattleState,
    addLogMessage,
    getPlayerMoves,
    canPlayerMove,
    isBattleComplete,
    cleanupBattleActions,
    setPostBattleRewards,
    startVictoryCelebration,
    calculatePostBattleRewards,
    triggerLevelUp,
    updatePetProgression,
    updateUserGems
  }
}