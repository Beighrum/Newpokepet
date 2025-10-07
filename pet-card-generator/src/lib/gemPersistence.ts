// Gem persistence utilities for managing user gem currency

/**
 * User gem data interface
 */
export interface UserGemData {
  userId: string
  totalGems: number
  gemsEarned: number
  gemsSpent: number
  lastUpdated: Date
}

/**
 * Get user's current gem count from storage
 * In a real application, this would fetch from a database or API
 * For now, we'll use localStorage as a placeholder
 * @param userId - User identifier
 * @returns Current gem count
 */
export const getUserGems = async (userId: string = 'default'): Promise<number> => {
  try {
    // In a real application, this would be an API call
    // For now, we'll use localStorage
    const storedData = localStorage.getItem(`user_gems_${userId}`)
    
    if (storedData) {
      const gemData: UserGemData = JSON.parse(storedData)
      return gemData.totalGems
    }
    
    // Default starting gems for new users
    return 50
    
  } catch (error) {
    console.error('Failed to get user gems:', error)
    return 50 // Default fallback
  }
}

/**
 * Update user's gem count after earning gems
 * @param userId - User identifier
 * @param gemsEarned - Gems earned from battle
 * @param gemsStolen - Gems stolen from opponent (PvP)
 * @returns Updated total gem count
 */
export const addUserGems = async (
  userId: string = 'default',
  gemsEarned: number,
  gemsStolen: number = 0
): Promise<number> => {
  try {
    const currentGems = await getUserGems(userId)
    const totalNewGems = gemsEarned + gemsStolen
    const newTotal = currentGems + totalNewGems
    
    const gemData: UserGemData = {
      userId,
      totalGems: newTotal,
      gemsEarned: totalNewGems,
      gemsSpent: 0,
      lastUpdated: new Date()
    }
    
    // In a real application, this would be an API call
    // For now, we'll use localStorage
    localStorage.setItem(`user_gems_${userId}`, JSON.stringify(gemData))
    
    console.log('Gems updated:', {
      userId,
      previousTotal: currentGems,
      gemsEarned,
      gemsStolen,
      newTotal
    })
    
    // TODO: Replace with actual API call
    // await fetch(`/api/users/${userId}/gems`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ gemsEarned, gemsStolen })
    // })
    
    return newTotal
    
  } catch (error) {
    console.error('Failed to add user gems:', error)
    throw new Error('Failed to update gem count')
  }
}

/**
 * Deduct gems from user's account (for purchases)
 * @param userId - User identifier
 * @param gemsToSpend - Amount of gems to deduct
 * @returns Updated total gem count
 */
export const spendUserGems = async (
  userId: string = 'default',
  gemsToSpend: number
): Promise<number> => {
  try {
    const currentGems = await getUserGems(userId)
    
    if (currentGems < gemsToSpend) {
      throw new Error('Insufficient gems')
    }
    
    const newTotal = currentGems - gemsToSpend
    
    const gemData: UserGemData = {
      userId,
      totalGems: newTotal,
      gemsEarned: 0,
      gemsSpent: gemsToSpend,
      lastUpdated: new Date()
    }
    
    localStorage.setItem(`user_gems_${userId}`, JSON.stringify(gemData))
    
    console.log('Gems spent:', {
      userId,
      previousTotal: currentGems,
      gemsSpent: gemsToSpend,
      newTotal
    })
    
    return newTotal
    
  } catch (error) {
    console.error('Failed to spend user gems:', error)
    throw error
  }
}

/**
 * Get user's gem transaction history
 * @param userId - User identifier
 * @returns Gem data with transaction history
 */
export const getUserGemData = async (userId: string = 'default'): Promise<UserGemData | null> => {
  try {
    const storedData = localStorage.getItem(`user_gems_${userId}`)
    
    if (storedData) {
      return JSON.parse(storedData)
    }
    
    return null
    
  } catch (error) {
    console.error('Failed to get user gem data:', error)
    return null
  }
}

/**
 * Initialize user gem data for new users
 * @param userId - User identifier
 * @param startingGems - Initial gem amount
 * @returns Initial gem data
 */
export const initializeUserGems = async (
  userId: string = 'default',
  startingGems: number = 50
): Promise<UserGemData> => {
  const gemData: UserGemData = {
    userId,
    totalGems: startingGems,
    gemsEarned: 0,
    gemsSpent: 0,
    lastUpdated: new Date()
  }
  
  localStorage.setItem(`user_gems_${userId}`, JSON.stringify(gemData))
  
  console.log('User gems initialized:', gemData)
  
  return gemData
}

/**
 * Handle PvP gem theft - deduct gems from loser, add to winner
 * @param winnerId - Winner's user ID
 * @param loserId - Loser's user ID
 * @param gemsStolen - Amount of gems stolen
 * @returns Object with updated gem counts for both users
 */
export const handlePvPGemTheft = async (
  winnerId: string,
  loserId: string,
  gemsStolen: number
): Promise<{
  winnerNewTotal: number
  loserNewTotal: number
}> => {
  try {
    // Deduct gems from loser
    const loserCurrentGems = await getUserGems(loserId)
    const actualStolen = Math.min(gemsStolen, loserCurrentGems)
    const loserNewTotal = Math.max(0, loserCurrentGems - actualStolen)
    
    // Update loser's gems
    const loserGemData: UserGemData = {
      userId: loserId,
      totalGems: loserNewTotal,
      gemsEarned: 0,
      gemsSpent: actualStolen,
      lastUpdated: new Date()
    }
    localStorage.setItem(`user_gems_${loserId}`, JSON.stringify(loserGemData))
    
    // Add gems to winner
    const winnerNewTotal = await addUserGems(winnerId, 0, actualStolen)
    
    console.log('PvP gem theft processed:', {
      winnerId,
      loserId,
      gemsStolen: actualStolen,
      winnerNewTotal,
      loserNewTotal
    })
    
    return {
      winnerNewTotal,
      loserNewTotal
    }
    
  } catch (error) {
    console.error('Failed to handle PvP gem theft:', error)
    throw new Error('Failed to process gem theft')
  }
}

/**
 * Validate gem transaction amounts
 * @param amount - Gem amount to validate
 * @returns Validated amount (non-negative integer)
 */
export const validateGemAmount = (amount: number): number => {
  if (amount < 0) return 0
  if (!Number.isInteger(amount)) return Math.floor(amount)
  return amount
}