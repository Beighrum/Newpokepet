// Experience and leveling calculation functions for pet progression

import { BattleCreature, ExperienceCalculation, LevelProgression, StatIncreases } from "@/types/battle"

// Base experience values and multipliers
const BASE_EXPERIENCE = 50
const DIFFICULTY_MULTIPLIERS = {
  easy: 1.0,
  normal: 1.2,
  hard: 1.5,
  expert: 2.0
}

const VICTORY_BONUS = 25

// Experience required for each level (exponential growth)
const getExperienceForLevel = (level: number): number => {
  return Math.floor(100 * Math.pow(1.5, level - 1))
}

// Calculate total experience required to reach a specific level
const getTotalExperienceForLevel = (level: number): number => {
  let total = 0
  for (let i = 1; i < level; i++) {
    total += getExperienceForLevel(i)
  }
  return total
}

/**
 * Calculate experience gained from a battle
 * @param opponentLevel - Level of the defeated opponent
 * @param difficulty - Battle difficulty modifier
 * @param isVictory - Whether the battle was won
 * @returns ExperienceCalculation object with breakdown
 */
export const calculateExperience = (
  opponentLevel: number = 1,
  difficulty: keyof typeof DIFFICULTY_MULTIPLIERS = 'normal',
  isVictory: boolean = true
): ExperienceCalculation => {
  const baseExperience = BASE_EXPERIENCE + (opponentLevel * 10)
  const difficultyMultiplier = DIFFICULTY_MULTIPLIERS[difficulty] || 1.0
  const victoryBonus = isVictory ? VICTORY_BONUS : 0
  
  const totalExperience = Math.floor((baseExperience * difficultyMultiplier) + victoryBonus)
  
  return {
    baseExperience,
    difficultyMultiplier,
    victoryBonus,
    totalExperience
  }
}

/**
 * Check if a pet levels up and return progression details
 * @param currentLevel - Pet's current level
 * @param currentExperience - Pet's current experience points
 * @param experienceGained - Experience points gained from battle
 * @returns LevelProgression object with level-up information
 */
export const checkLevelUp = (
  currentLevel: number,
  currentExperience: number,
  experienceGained: number
): LevelProgression => {
  const newExperience = currentExperience + experienceGained
  let newLevel = currentLevel
  let remainingExperience = newExperience
  
  // Check for level ups (can level up multiple times in one battle)
  while (newLevel < 100) { // Cap at level 100
    const experienceNeeded = getExperienceForLevel(newLevel)
    if (remainingExperience >= experienceNeeded) {
      remainingExperience -= experienceNeeded
      newLevel++
    } else {
      break
    }
  }
  
  const experienceToNextLevel = newLevel < 100 ? 
    getExperienceForLevel(newLevel) - remainingExperience : 0
  
  return {
    currentLevel: newLevel,
    currentExperience: remainingExperience,
    experienceToNextLevel,
    experienceGained,
    leveledUp: newLevel > currentLevel
  }
}

/**
 * Calculate stat increases when a pet levels up
 * @param previousLevel - Pet's level before leveling up
 * @param newLevel - Pet's level after leveling up
 * @param baseStats - Pet's base stats (from card)
 * @returns StatIncreases object with stat bonuses
 */
export const calculateStatIncreases = (
  previousLevel: number,
  newLevel: number,
  baseStats: { attack: number; defense: number; hp: number }
): StatIncreases => {
  const levelsGained = newLevel - previousLevel
  
  if (levelsGained <= 0) {
    return {
      attack: 0,
      defense: 0,
      hp: 0,
      previousLevel,
      newLevel
    }
  }
  
  // Stat increases are based on base stats and levels gained
  // Each level up gives 5-15% of base stat as increase
  const attackIncrease = Math.floor((baseStats.attack * 0.1 * levelsGained) + (Math.random() * baseStats.attack * 0.05 * levelsGained))
  const defenseIncrease = Math.floor((baseStats.defense * 0.1 * levelsGained) + (Math.random() * baseStats.defense * 0.05 * levelsGained))
  const hpIncrease = Math.floor((baseStats.hp * 0.15 * levelsGained) + (Math.random() * baseStats.hp * 0.1 * levelsGained))
  
  return {
    attack: Math.max(1, attackIncrease), // Minimum 1 point increase
    defense: Math.max(1, defenseIncrease),
    hp: Math.max(2, hpIncrease), // HP gets slightly more increase
    previousLevel,
    newLevel
  }
}

/**
 * Get the current level of a pet based on total experience
 * @param totalExperience - Total experience points accumulated
 * @returns Current level (1-100)
 */
export const getLevelFromExperience = (totalExperience: number): number => {
  let level = 1
  let experienceUsed = 0
  
  while (level < 100) {
    const experienceNeeded = getExperienceForLevel(level)
    if (experienceUsed + experienceNeeded <= totalExperience) {
      experienceUsed += experienceNeeded
      level++
    } else {
      break
    }
  }
  
  return level
}

/**
 * Get experience progress within current level
 * @param totalExperience - Total experience points accumulated
 * @param currentLevel - Current level
 * @returns Experience points within the current level
 */
export const getExperienceInCurrentLevel = (totalExperience: number, currentLevel: number): number => {
  const totalExperienceForPreviousLevel = getTotalExperienceForLevel(currentLevel)
  return totalExperience - totalExperienceForPreviousLevel
}

/**
 * Determine battle difficulty based on opponent stats compared to player
 * @param playerCreature - Player's battle creature
 * @param opponentCreature - Opponent's battle creature
 * @returns Difficulty level for experience calculation
 */
export const determineBattleDifficulty = (
  playerCreature: BattleCreature,
  opponentCreature: BattleCreature
): keyof typeof DIFFICULTY_MULTIPLIERS => {
  const playerStats = playerCreature.card.stats || { attack: 50, defense: 50, hp: 100 }
  const opponentStats = opponentCreature.card.stats || { attack: 50, defense: 50, hp: 100 }
  
  // Calculate power levels (simple sum of stats)
  const playerPower = playerStats.attack + playerStats.defense + playerStats.hp
  const opponentPower = opponentStats.attack + opponentStats.defense + opponentStats.hp
  
  const powerRatio = opponentPower / playerPower
  
  if (powerRatio >= 1.5) return 'expert'
  if (powerRatio >= 1.2) return 'hard'
  if (powerRatio >= 0.8) return 'normal'
  return 'easy'
}