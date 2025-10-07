// Pet data persistence utilities for level and experience updates

import { Card } from "@/hooks/use-cards"
import { StatIncreases } from "@/types/battle"

/**
 * Update pet data with new experience and level information
 * @param petCard - The pet card to update
 * @param experienceGained - Experience points gained from battle
 * @param statIncreases - Stat increases from leveling up (if any)
 * @returns Updated card with new stats and experience
 */
export const updatePetProgression = (
  petCard: Card,
  experienceGained: number,
  statIncreases: StatIncreases | null
): Card => {
  const updatedCard = { ...petCard }
  
  // Update experience
  updatedCard.xp = (updatedCard.xp || 0) + experienceGained
  
  // Update stats if pet leveled up
  if (statIncreases && updatedCard.stats) {
    updatedCard.stats = {
      attack: updatedCard.stats.attack + statIncreases.attack,
      defense: updatedCard.stats.defense + statIncreases.defense,
      hp: updatedCard.stats.hp + statIncreases.hp,
      speed: updatedCard.stats.speed // Speed doesn't increase in our system
    }
  }
  
  // Update timestamp
  updatedCard.updatedAt = new Date()
  
  return updatedCard
}

/**
 * Save pet progression to persistent storage
 * In a real application, this would save to a database or API
 * For now, this is a placeholder that logs the update
 * @param updatedCard - The updated pet card
 */
export const savePetProgression = async (updatedCard: Card): Promise<void> => {
  try {
    // In a real application, this would be an API call
    // For now, we'll just log the update
    console.log('Pet progression updated:', {
      id: updatedCard.id,
      name: updatedCard.name,
      xp: updatedCard.xp,
      stats: updatedCard.stats,
      updatedAt: updatedCard.updatedAt
    })
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // TODO: Replace with actual API call
    // await fetch(`/api/pets/${updatedCard.id}`, {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(updatedCard)
    // })
    
  } catch (error) {
    console.error('Failed to save pet progression:', error)
    throw new Error('Failed to save pet progression')
  }
}

/**
 * Update and save pet progression after battle
 * @param petCard - The pet card to update
 * @param experienceGained - Experience points gained
 * @param statIncreases - Stat increases from leveling up
 * @returns Promise that resolves to the updated card
 */
export const updateAndSavePetProgression = async (
  petCard: Card,
  experienceGained: number,
  statIncreases: StatIncreases | null
): Promise<Card> => {
  const updatedCard = updatePetProgression(petCard, experienceGained, statIncreases)
  await savePetProgression(updatedCard)
  return updatedCard
}

/**
 * Calculate the current level of a pet based on its experience
 * This is a helper function for display purposes
 * @param xp - Current experience points
 * @returns Current level (1-100)
 */
export const calculateCurrentLevel = (xp: number): number => {
  let level = 1
  let experienceUsed = 0
  
  while (level < 100) {
    const experienceNeeded = Math.floor(100 * Math.pow(1.5, level - 1))
    if (experienceUsed + experienceNeeded <= xp) {
      experienceUsed += experienceNeeded
      level++
    } else {
      break
    }
  }
  
  return level
}

/**
 * Calculate experience progress within current level
 * @param xp - Current experience points
 * @param currentLevel - Current level
 * @returns Object with current progress and experience needed for next level
 */
export const calculateLevelProgress = (xp: number, currentLevel: number): {
  currentLevelXP: number
  nextLevelXP: number
  progress: number
} => {
  let experienceUsed = 0
  
  // Calculate experience used for previous levels
  for (let i = 1; i < currentLevel; i++) {
    experienceUsed += Math.floor(100 * Math.pow(1.5, i - 1))
  }
  
  const currentLevelXP = xp - experienceUsed
  const nextLevelXP = Math.floor(100 * Math.pow(1.5, currentLevel - 1))
  const progress = Math.min(currentLevelXP / nextLevelXP, 1)
  
  return {
    currentLevelXP,
    nextLevelXP,
    progress
  }
}