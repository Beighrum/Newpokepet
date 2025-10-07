import { getElementFallback, getFallbackMoves } from './ui-safety'

// Types from the existing codebase
type ElementKey =
  | "Leaf"
  | "Flame" 
  | "Wave"
  | "Bolt"
  | "Frost"
  | "Stone"
  | "Spirit"
  | "Ground"
  | "Fighting"
  | "Water"
  | "Fire"

type Rarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary" | "Secret"
type Stage = "Baby" | "Adult" | "Elder"

interface Stats {
  heart: number
  speed: number
  power: number
  focus: number
}

interface Move {
  name: string
  pp: number
  description: string
}

interface Creature {
  id: string
  ownerUid: string
  name: string
  element: ElementKey
  rarity: Rarity
  stage: Stage
  level: number
  xp: number
  stats: Stats
  personality: string[]
  prompt: string
  imageUrl: string
  createdAt: number
  updatedAt: number
  status: "queued" | "processing" | "ready" | "failed"
  parentId?: string | null
  moves?: Move[]
  evolutionHint?: string
}

interface GalleryCard {
  id: number | string
  name: string
  type: string
  rarity: string
  image: string
  level: number
  xp: number
  maxXp?: number
  stats?: Stats
  personality?: string[]
  moves?: Move[]
}

/**
 * Maps gallery card type to CreatureDialog element enum
 * Handles various type formats and provides fallbacks
 */
export const mapTypeToElement = (cardType: string): ElementKey => {
  const typeMapping: Record<string, ElementKey> = {
    // Direct mappings
    'Water': 'Water',
    'Fire': 'Fire', 
    'Lightning': 'Bolt',
    'Electric': 'Bolt',
    'Grass': 'Leaf',
    'Plant': 'Leaf',
    'Ice': 'Frost',
    'Rock': 'Stone',
    'Ground': 'Ground',
    'Fighting': 'Fighting',
    'Psychic': 'Spirit',
    'Ghost': 'Spirit',
    'Normal': 'Spirit',
    // Additional common variations
    'Thunder': 'Bolt',
    'Flame': 'Fire',
    'Leaf': 'Leaf',
    'Stone': 'Stone',
    'Wave': 'Wave',
    'Frost': 'Frost',
    'Spirit': 'Spirit'
  }

  const normalizedType = cardType.charAt(0).toUpperCase() + cardType.slice(1).toLowerCase()
  const mappedElement = typeMapping[normalizedType]
  
  if (mappedElement) {
    return mappedElement
  }

  // Fallback using existing safety utility
  return getElementFallback(cardType) as ElementKey
}

/**
 * Determines creature stage based on level
 */
export const determineStageFromLevel = (level: number): Stage => {
  if (level <= 5) return "Baby"
  if (level <= 15) return "Adult" 
  return "Elder"
}

/**
 * Generates default stats based on creature level
 * Stats scale with level but include some randomization
 */
export const generateDefaultStats = (level: number): Stats => {
  const baseStats = 20
  const levelMultiplier = level * 3
  const randomVariation = () => Math.floor(Math.random() * 10) - 5 // -5 to +5
  
  return {
    heart: Math.max(10, baseStats + levelMultiplier + randomVariation()),
    speed: Math.max(10, baseStats + levelMultiplier + randomVariation()),
    power: Math.max(10, baseStats + levelMultiplier + randomVariation()),
    focus: Math.max(10, baseStats + levelMultiplier + randomVariation())
  }
}

/**
 * Generates default personality traits based on creature characteristics
 */
export const generateDefaultPersonality = (element?: ElementKey, rarity?: Rarity): string[] => {
  const elementPersonalities: Record<ElementKey, string[]> = {
    Water: ['Calm', 'Flowing', 'Adaptive'],
    Fire: ['Passionate', 'Energetic', 'Bold'],
    Leaf: ['Peaceful', 'Growing', 'Patient'],
    Bolt: ['Quick', 'Energetic', 'Shocking'],
    Frost: ['Cool', 'Precise', 'Serene'],
    Stone: ['Sturdy', 'Reliable', 'Grounded'],
    Spirit: ['Mysterious', 'Wise', 'Ethereal'],
    Ground: ['Stable', 'Strong', 'Earthy'],
    Fighting: ['Brave', 'Determined', 'Athletic'],
    Wave: ['Rhythmic', 'Powerful', 'Fluid'],
    Flame: ['Fierce', 'Warm', 'Bright']
  }

  const rarityPersonalities: Record<Rarity, string[]> = {
    Common: ['Friendly', 'Loyal'],
    Uncommon: ['Curious', 'Clever'],
    Rare: ['Noble', 'Graceful'],
    Epic: ['Majestic', 'Powerful'],
    Legendary: ['Ancient', 'Legendary'],
    Secret: ['Enigmatic', 'Unique']
  }

  const basePersonality = element ? elementPersonalities[element] || [] : []
  const rarityTraits = rarity ? rarityPersonalities[rarity] || [] : []
  
  // Combine and limit to 3-4 traits
  const combined = [...basePersonality, ...rarityTraits]
  return combined.slice(0, Math.min(4, combined.length))
}

/**
 * Generates default moves based on creature type and level
 */
export const generateDefaultMoves = (element: ElementKey, _level?: number): Move[] => {
  const fallbackMoveNames = getFallbackMoves(element)
  
  return fallbackMoveNames.map((name, index) => ({
    name,
    pp: Math.max(5, 20 - (index * 3)), // Decreasing PP for stronger moves
    description: `A ${element.toLowerCase()} type move that ${getRandomMoveDescription(element)}`
  }))
}

/**
 * Helper function to generate move descriptions
 */
const getRandomMoveDescription = (element: ElementKey): string => {
  const descriptions: Record<ElementKey, string[]> = {
    Water: ['creates powerful water currents', 'summons tidal forces', 'channels aquatic energy'],
    Fire: ['unleashes burning flames', 'creates intense heat', 'ignites the battlefield'],
    Leaf: ['harnesses nature\'s power', 'grows protective vines', 'channels plant energy'],
    Bolt: ['strikes with lightning', 'creates electrical storms', 'charges with energy'],
    Frost: ['freezes the air', 'creates ice crystals', 'chills opponents'],
    Stone: ['hurls rocky projectiles', 'creates earth tremors', 'hardens defenses'],
    Spirit: ['manipulates psychic energy', 'creates mental illusions', 'channels ethereal power'],
    Ground: ['shakes the earth', 'creates muddy terrain', 'burrows underground'],
    Fighting: ['delivers powerful strikes', 'shows martial prowess', 'demonstrates combat skill'],
    Wave: ['creates water waves', 'surfs across terrain', 'flows with grace'],
    Flame: ['burns with intensity', 'creates fire storms', 'radiates heat']
  }

  const elementDescriptions = descriptions[element] || descriptions.Spirit
  return elementDescriptions[Math.floor(Math.random() * elementDescriptions.length)]
}

/**
 * Main transformation function: converts gallery card to creature format
 * This is the primary function that handles the complete data transformation
 */
export const transformCardToCreature = (card: GalleryCard): Creature => {
  const element = mapTypeToElement(card.type)
  const rarity = (card.rarity as Rarity) || 'Common'
  const stage = determineStageFromLevel(card.level)
  
  return {
    id: card.id.toString(),
    ownerUid: 'current-user', // Default owner
    name: card.name,
    element,
    rarity,
    stage,
    level: card.level,
    xp: card.xp,
    stats: card.stats || generateDefaultStats(card.level),
    personality: card.personality || generateDefaultPersonality(element, rarity),
    prompt: '', // Gallery cards don't have prompts
    imageUrl: card.image,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'ready' as const,
    parentId: null,
    moves: card.moves || generateDefaultMoves(element, card.level),
    evolutionHint: undefined
  }
}
/**

 * Advanced stats generation with element-based bonuses
 * Different elements have natural stat tendencies
 */
export const generateElementBasedStats = (level: number, element: ElementKey): Stats => {
  const baseStats = generateDefaultStats(level)
  
  // Element-specific stat bonuses
  const elementBonuses: Record<ElementKey, Partial<Stats>> = {
    Water: { heart: 5, focus: 3 },
    Fire: { power: 5, speed: 2 },
    Leaf: { heart: 4, focus: 4 },
    Bolt: { speed: 6, power: 2 },
    Frost: { focus: 5, heart: 2 },
    Stone: { heart: 6, power: 3 },
    Spirit: { focus: 6, speed: 1 },
    Ground: { heart: 4, power: 4 },
    Fighting: { power: 5, speed: 3 },
    Wave: { speed: 4, focus: 3 },
    Flame: { power: 4, speed: 4 }
  }

  const bonuses = elementBonuses[element] || {}
  
  return {
    heart: Math.min(100, baseStats.heart + (bonuses.heart || 0)),
    speed: Math.min(100, baseStats.speed + (bonuses.speed || 0)),
    power: Math.min(100, baseStats.power + (bonuses.power || 0)),
    focus: Math.min(100, baseStats.focus + (bonuses.focus || 0))
  }
}

/**
 * Generates rarity-based personality modifiers
 * Higher rarity creatures get more unique personality traits
 */
export const generateRarityPersonality = (rarity: Rarity, basePersonality: string[] = []): string[] => {
  const rarityTraits: Record<Rarity, string[]> = {
    Common: ['Friendly', 'Loyal', 'Cheerful'],
    Uncommon: ['Curious', 'Clever', 'Playful', 'Alert'],
    Rare: ['Noble', 'Graceful', 'Dignified', 'Refined', 'Elegant'],
    Epic: ['Majestic', 'Powerful', 'Commanding', 'Imposing', 'Regal', 'Formidable'],
    Legendary: ['Ancient', 'Legendary', 'Mythical', 'Timeless', 'Eternal', 'Transcendent'],
    Secret: ['Enigmatic', 'Unique', 'Mysterious', 'Otherworldly', 'Incomprehensible', 'Paradoxical']
  }

  const availableTraits = rarityTraits[rarity] || rarityTraits.Common
  const numTraits = Math.min(rarity === 'Legendary' || rarity === 'Secret' ? 5 : 4, availableTraits.length)
  
  // Combine base personality with rarity traits, avoiding duplicates
  const combined = [...new Set([...basePersonality, ...availableTraits])]
  return combined.slice(0, numTraits)
}

/**
 * Generates level-appropriate moves with scaling power
 * Higher level creatures get more powerful moves
 */
export const generateLevelBasedMoves = (element: ElementKey, level: number): Move[] => {
  const baseMoves = getFallbackMoves(element)
  const numMoves = Math.min(4, Math.max(2, Math.floor(level / 3) + 1))
  
  return baseMoves.slice(0, numMoves).map((name, index) => {
    const basePP = 20 - (index * 2)
    const levelBonus = Math.floor(level / 5)
    
    return {
      name,
      pp: Math.max(5, basePP + levelBonus),
      description: `A ${element.toLowerCase()} type move that ${getRandomMoveDescription(element)}. Power increases with level.`
    }
  })
}

/**
 * Calculates maximum XP for current level
 * Uses a standard RPG-style XP curve
 */
export const calculateMaxXP = (level: number): number => {
  return Math.floor(100 * Math.pow(level, 1.2))
}

/**
 * Validates and sanitizes card data before transformation
 * Ensures all required fields are present and valid
 */
export const validateCardData = (card: GalleryCard): boolean => {
  const requiredFields = ['id', 'name', 'type', 'level', 'xp']
  
  for (const field of requiredFields) {
    if (!(field in card) || card[field as keyof GalleryCard] === undefined || card[field as keyof GalleryCard] === null) {
      console.warn(`Missing required field: ${field}`)
      return false
    }
  }

  // Validate data types and ranges
  if (typeof card.level !== 'number' || card.level < 1 || card.level > 100) {
    console.warn('Invalid level value')
    return false
  }

  if (typeof card.xp !== 'number' || card.xp < 0) {
    console.warn('Invalid XP value')
    return false
  }

  return true
}

/**
 * Enhanced transformation function with validation and advanced generation
 * Uses the helper functions for more sophisticated data generation
 */
export const transformCardToCreatureAdvanced = (card: GalleryCard): Creature | null => {
  // Validate input data
  if (!validateCardData(card)) {
    console.error('Card data validation failed:', card)
    return null
  }

  const element = mapTypeToElement(card.type)
  const rarity = (card.rarity as Rarity) || 'Common'
  const stage = determineStageFromLevel(card.level)
  
  // Use advanced generation functions
  const stats = card.stats || generateElementBasedStats(card.level, element)
  const basePersonality = generateDefaultPersonality(element, rarity)
  const personality = generateRarityPersonality(rarity, basePersonality)
  const moves = card.moves || generateLevelBasedMoves(element, card.level)
  
  return {
    id: card.id.toString(),
    ownerUid: 'current-user',
    name: card.name,
    element,
    rarity,
    stage,
    level: card.level,
    xp: card.xp,
    stats,
    personality,
    prompt: '',
    imageUrl: card.image || '/placeholder.svg',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'ready' as const,
    parentId: null,
    moves,
    evolutionHint: card.level >= 15 ? `${card.name} is ready for evolution!` : undefined
  }
}