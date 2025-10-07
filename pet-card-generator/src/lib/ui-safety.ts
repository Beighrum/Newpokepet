export const truncatePrompt = (prompt: string, maxLength = 800): string => {
  if (prompt.length <= maxLength) return prompt
  return prompt.slice(0, maxLength) + "..."
}

export const shouldShowQR = (shareString: string): boolean => {
  return shareString.length <= 1000
}

export const createShareCode = (card: any): string => {
  const compactCard = {
    name: card.name,
    element: card.element,
    rarity: card.rarity,
    stage: card.stage,
    level: card.level,
    stats: card.stats,
    personality: card.personality.slice(0, 3), // Limit personalities
    // Exclude imageUrl, prompt (too large), and other blob data
  }

  return JSON.stringify(compactCard)
}

export const getElementFallback = (element: string): string => {
  const validElements = ["Water", "Fire", "Ground", "Leaf", "Frost", "Bolt", "Spirit", "Fighting", "Stone", "Wave"]

  return validElements.includes(element) ? element : "Spirit"
}

export const getFallbackMoves = (element: string): string[] => {
  const fallbackMoves = {
    Water: ["Splash", "Bubble Beam", "Hydro Pump"],
    Fire: ["Ember", "Flame Burst", "Fire Blast"],
    Ground: ["Mud Shot", "Earthquake", "Earth Power"],
    Leaf: ["Vine Whip", "Leaf Storm", "Solar Beam"],
    Frost: ["Ice Shard", "Blizzard", "Freeze Ray"],
    Bolt: ["Thunder Shock", "Lightning Bolt", "Thunder"],
    Spirit: ["Confusion", "Psychic", "Mind Blast"],
    Fighting: ["Punch", "Karate Chop", "Focus Blast"],
    Stone: ["Rock Throw", "Stone Edge", "Rock Slide"],
    Wave: ["Water Pulse", "Tidal Wave", "Surf"],
  }

  return fallbackMoves[element as keyof typeof fallbackMoves] || fallbackMoves.Spirit
}
