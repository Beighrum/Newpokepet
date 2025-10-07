// Gem reward and theft calculation functions for post-battle rewards

import { BattleCreature, GemReward } from "@/types/battle"

// Base gem values and multipliers
const BASE_GEM_REWARD = 10
const TRAINER_LEVEL_MULTIPLIERS = {
  1: 1.0,
  2: 1.1,
  3: 1.2,
  4: 1.3,
  5: 1.4,
  6: 1.5,
  7: 1.6,
  8: 1.7,
  9: 1.8,
  10: 2.0
}

// Difficulty multipliers for gem rewards
const DIFFICULTY_GEM_MULTIPLIERS = {
  easy: 0.8,
  normal: 1.0,
  hard: 1.3,
  expert: 1.6
}

// PvP gem theft configuration
const GEM_THEFT_PERCENTAGE = 0.15 // 15% of opponent's gems
const MAX_GEM_THEFT_AMOUNT = 100 // Maximum gems that can be stolen per battle
const MIN_GEM_THEFT_AMOUNT = 5 // Minimum gems stolen if opponent has gems

// AI opponent gem pools based on difficulty
const AI_GEM_POOLS = {
  easy: { min: 5, max: 15 },
  normal: { min: 10, max: 25 },
  hard: { min: 20, max: 40 },
  expert: { min: 35, max: 60 }
}

/**
 * Calculate gem rewards for winning a battle against AI opponent
 * @param trainerLevel - Player's trainer level (1-10+)
 * @param difficulty - Battle difficulty level
 * @param opponentLevel - Level of defeated opponent
 * @returns GemReward object with breakdown
 */
export const calculateGemReward = (
  trainerLevel: number,
  difficulty: keyof typeof DIFFICULTY_GEM_MULTIPLIERS = 'normal',
  opponentLevel: number = 1
): GemReward => {
  // Base reward calculation
  const baseReward = BASE_GEM_REWARD + (opponentLevel * 2)
  
  // Apply difficulty multiplier
  const difficultyMultiplier = DIFFICULTY_GEM_MULTIPLIERS[difficulty] || 1.0
  const difficultyAdjustedReward = Math.floor(baseReward * difficultyMultiplier)
  
  // Apply trainer level multiplier (capped at level 10 multiplier)
  const levelMultiplier = TRAINER_LEVEL_MULTIPLIERS[Math.min(trainerLevel, 10) as keyof typeof TRAINER_LEVEL_MULTIPLIERS] || 2.0
  const totalEarned = Math.floor(difficultyAdjustedReward * levelMultiplier)
  
  return {
    baseReward: difficultyAdjustedReward,
    levelMultiplier,
    totalEarned,
    source: 'victory'
  }
}

/**
 * Calculate gems stolen from PvP opponent
 * @param opponentGems - Total gems owned by opponent
 * @param trainerLevel - Player's trainer level
 * @param difficulty - Battle difficulty level
 * @returns Object with theft calculation details
 */
export const calculateGemTheft = (
  opponentGems: number,
  trainerLevel: number,
  difficulty: keyof typeof DIFFICULTY_GEM_MULTIPLIERS = 'normal'
): {
  opponentGems: number
  theftPercentage: number
  maxTheftAmount: number
  actualStolen: number
  levelMultiplier: number
} => {
  if (opponentGems <= 0) {
    return {
      opponentGems: 0,
      theftPercentage: GEM_THEFT_PERCENTAGE,
      maxTheftAmount: MAX_GEM_THEFT_AMOUNT,
      actualStolen: 0,
      levelMultiplier: 1.0
    }
  }
  
  // Calculate base theft amount (percentage of opponent's gems)
  const baseTheftAmount = Math.floor(opponentGems * GEM_THEFT_PERCENTAGE)
  
  // Apply trainer level bonus to theft (small bonus for higher levels)
  const levelMultiplier = 1.0 + ((trainerLevel - 1) * 0.02) // 2% bonus per level above 1
  const levelAdjustedTheft = Math.floor(baseTheftAmount * levelMultiplier)
  
  // Apply difficulty multiplier
  const difficultyMultiplier = DIFFICULTY_GEM_MULTIPLIERS[difficulty] || 1.0
  const difficultyAdjustedTheft = Math.floor(levelAdjustedTheft * difficultyMultiplier)
  
  // Cap the theft amount
  const actualStolen = Math.min(
    Math.max(MIN_GEM_THEFT_AMOUNT, difficultyAdjustedTheft),
    Math.min(MAX_GEM_THEFT_AMOUNT, opponentGems)
  )
  
  return {
    opponentGems,
    theftPercentage: GEM_THEFT_PERCENTAGE,
    maxTheftAmount: MAX_GEM_THEFT_AMOUNT,
    actualStolen,
    levelMultiplier
  }
}

/**
 * Generate random gem reward for AI opponents based on difficulty
 * @param difficulty - Battle difficulty level
 * @returns Random gem amount within difficulty range
 */
export const generateAIGemReward = (
  difficulty: keyof typeof DIFFICULTY_GEM_MULTIPLIERS = 'normal'
): number => {
  const pool = AI_GEM_POOLS[difficulty] || AI_GEM_POOLS['normal']
  return Math.floor(Math.random() * (pool.max - pool.min + 1)) + pool.min
}

/**
 * Validate gem reward amounts to prevent exploitation
 * @param gemAmount - Gem amount to validate
 * @param maxAllowed - Maximum allowed gems per battle
 * @returns Validated gem amount
 */
export const validateGemReward = (
  gemAmount: number,
  maxAllowed: number = 200
): number => {
  if (isNaN(gemAmount) || gemAmount < 0) return 0
  if (gemAmount > maxAllowed) return maxAllowed
  return Math.floor(gemAmount)
}

/**
 * Calculate total gem rewards for a battle (combines victory and theft)
 * @param isPlayerVictory - Whether player won the battle
 * @param isPvP - Whether this is a PvP battle
 * @param trainerLevel - Player's trainer level
 * @param difficulty - Battle difficulty
 * @param opponentGems - Opponent's gem count (for PvP)
 * @param opponentLevel - Opponent's level
 * @returns Object with total gem calculations
 */
export const calculateTotalGemRewards = (
  isPlayerVictory: boolean,
  isPvP: boolean,
  trainerLevel: number,
  difficulty: keyof typeof DIFFICULTY_GEM_MULTIPLIERS = 'normal',
  opponentGems: number = 0,
  opponentLevel: number = 1
): {
  victoryGems: number
  stolenGems: number
  totalGems: number
  breakdown: {
    baseReward: number
    levelMultiplier: number
    theftDetails?: ReturnType<typeof calculateGemTheft>
  }
} => {
  if (!isPlayerVictory) {
    return {
      victoryGems: 0,
      stolenGems: 0,
      totalGems: 0,
      breakdown: {
        baseReward: 0,
        levelMultiplier: 1.0
      }
    }
  }
  
  let victoryGems = 0
  let stolenGems = 0
  let breakdown: any = {}
  
  if (isPvP) {
    // PvP battle: steal gems from opponent
    const theftResult = calculateGemTheft(opponentGems, trainerLevel, difficulty)
    stolenGems = validateGemReward(theftResult.actualStolen)
    breakdown = {
      baseReward: 0,
      levelMultiplier: theftResult.levelMultiplier,
      theftDetails: theftResult
    }
  } else {
    // AI battle: fixed gem reward
    const rewardResult = calculateGemReward(trainerLevel, difficulty, opponentLevel)
    victoryGems = validateGemReward(rewardResult.totalEarned)
    breakdown = {
      baseReward: rewardResult.baseReward,
      levelMultiplier: rewardResult.levelMultiplier
    }
  }
  
  const totalGems = victoryGems + stolenGems
  
  return {
    victoryGems,
    stolenGems,
    totalGems: validateGemReward(totalGems),
    breakdown
  }
}

/**
 * Determine battle difficulty for gem calculations based on creature stats
 * @param playerCreature - Player's battle creature
 * @param opponentCreature - Opponent's battle creature
 * @returns Difficulty level for gem calculation
 */
export const determineBattleDifficultyForGems = (
  playerCreature: BattleCreature,
  opponentCreature: BattleCreature
): keyof typeof DIFFICULTY_GEM_MULTIPLIERS => {
  const playerStats = playerCreature.card.stats || { attack: 50, defense: 50, hp: 100 }
  const opponentStats = opponentCreature.card.stats || { attack: 50, defense: 50, hp: 100 }
  
  // Calculate power levels (weighted sum of stats)
  const playerPower = (playerStats.attack * 1.2) + (playerStats.defense * 1.0) + (playerStats.hp * 0.8)
  const opponentPower = (opponentStats.attack * 1.2) + (opponentStats.defense * 1.0) + (opponentStats.hp * 0.8)
  
  const powerRatio = opponentPower / playerPower
  
  if (powerRatio >= 1.5) return 'expert'
  if (powerRatio >= 1.2) return 'hard'
  if (powerRatio >= 0.8) return 'normal'
  return 'easy'
}

/**
 * Get trainer level multiplier for gem calculations
 * @param trainerLevel - Player's trainer level
 * @returns Multiplier value for gem rewards
 */
export const getTrainerLevelMultiplier = (trainerLevel: number): number => {
  return TRAINER_LEVEL_MULTIPLIERS[Math.min(trainerLevel, 10) as keyof typeof TRAINER_LEVEL_MULTIPLIERS] || 2.0
}