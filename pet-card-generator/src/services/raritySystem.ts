export type RarityLevel = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'secret_rare';

export interface RarityConfig {
  level: RarityLevel;
  weight: number;
  displayName: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  glowColor: string;
  description: string;
  emoji: string;
  minStats?: number;
  maxStats?: number;
}

export interface RarityDistribution {
  common: number;
  uncommon: number;
  rare: number;
  epic: number;
  legendary: number;
  secret_rare: number;
}

// Default rarity distribution (percentages)
export const DEFAULT_RARITY_DISTRIBUTION: RarityDistribution = {
  common: 40,      // 40%
  uncommon: 25,    // 25%
  rare: 20,        // 20%
  epic: 10,        // 10%
  legendary: 4,    // 4%
  secret_rare: 1   // 1%
};

// Rarity configuration with visual styling
export const RARITY_CONFIG: Record<RarityLevel, RarityConfig> = {
  common: {
    level: 'common',
    weight: 40,
    displayName: 'Common',
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    borderColor: '#9CA3AF',
    glowColor: '#6B7280',
    description: 'A standard pet card',
    emoji: '⚪',
    minStats: 1,
    maxStats: 3
  },
  uncommon: {
    level: 'uncommon',
    weight: 25,
    displayName: 'Uncommon',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
    glowColor: '#059669',
    description: 'A slightly special pet card',
    emoji: '🟢',
    minStats: 2,
    maxStats: 4
  },
  rare: {
    level: 'rare',
    weight: 20,
    displayName: 'Rare',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    glowColor: '#2563EB',
    description: 'A rare and valuable pet card',
    emoji: '🔵',
    minStats: 3,
    maxStats: 5
  },
  epic: {
    level: 'epic',
    weight: 10,
    displayName: 'Epic',
    color: '#7C3AED',
    backgroundColor: '#F3E8FF',
    borderColor: '#8B5CF6',
    glowColor: '#7C3AED',
    description: 'An epic pet card with amazing abilities',
    emoji: '🟣',
    minStats: 4,
    maxStats: 6
  },
  legendary: {
    level: 'legendary',
    weight: 4,
    displayName: 'Legendary',
    color: '#F59E0B',
    backgroundColor: '#FFFBEB',
    borderColor: '#FBBF24',
    glowColor: '#F59E0B',
    description: 'A legendary pet card of immense power',
    emoji: '🟡',
    minStats: 5,
    maxStats: 7
  },
  secret_rare: {
    level: 'secret_rare',
    weight: 1,
    displayName: 'Secret Rare',
    color: '#EC4899',
    backgroundColor: '#FDF2F8',
    borderColor: '#F472B6',
    glowColor: '#EC4899',
    description: 'An ultra-rare secret pet card',
    emoji: '🌟',
    minStats: 6,
    maxStats: 8
  }
};

/**
 * Rarity System Service
 */
export class RaritySystemService {
  private distribution: RarityDistribution;
  private rarityLevels: RarityLevel[];
  private cumulativeWeights: number[];

  constructor(customDistribution?: Partial<RarityDistribution>) {
    this.distribution = { ...DEFAULT_RARITY_DISTRIBUTION, ...customDistribution };
    this.rarityLevels = Object.keys(this.distribution) as RarityLevel[];
    this.cumulativeWeights = this.calculateCumulativeWeights();
  }

  /**
   * Calculate cumulative weights for weighted random selection
   */
  private calculateCumulativeWeights(): number[] {
    const weights: number[] = [];
    let cumulative = 0;

    for (const level of this.rarityLevels) {
      cumulative += this.distribution[level];
      weights.push(cumulative);
    }

    return weights;
  }

  /**
   * Generate a random rarity based on distribution weights
   */
  generateRarity(seed?: string): RarityLevel {
    const random = seed ? this.seededRandom(seed) : Math.random();
    const roll = random * 100; // Convert to percentage

    for (let i = 0; i < this.cumulativeWeights.length; i++) {
      if (roll <= this.cumulativeWeights[i]) {
        return this.rarityLevels[i];
      }
    }

    // Fallback to common if something goes wrong
    return 'common';
  }

  /**
   * Generate multiple rarities for testing distribution
   */
  generateMultipleRarities(count: number, seed?: string): RarityLevel[] {
    const results: RarityLevel[] = [];
    
    for (let i = 0; i < count; i++) {
      const currentSeed = seed ? `${seed}-${i}` : undefined;
      results.push(this.generateRarity(currentSeed));
    }

    return results;
  }

  /**
   * Analyze rarity distribution from a sample
   */
  analyzeDistribution(rarities: RarityLevel[]): {
    counts: Record<RarityLevel, number>;
    percentages: Record<RarityLevel, number>;
    total: number;
  } {
    const counts: Record<RarityLevel, number> = {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
      secret_rare: 0
    };

    // Count occurrences
    rarities.forEach(rarity => {
      counts[rarity]++;
    });

    // Calculate percentages
    const total = rarities.length;
    const percentages: Record<RarityLevel, number> = {} as Record<RarityLevel, number>;
    
    for (const level of this.rarityLevels) {
      percentages[level] = total > 0 ? (counts[level] / total) * 100 : 0;
    }

    return { counts, percentages, total };
  }

  /**
   * Get rarity configuration
   */
  getRarityConfig(rarity: RarityLevel): RarityConfig {
    return RARITY_CONFIG[rarity];
  }

  /**
   * Get all rarity configurations
   */
  getAllRarityConfigs(): Record<RarityLevel, RarityConfig> {
    return RARITY_CONFIG;
  }

  /**
   * Check if a rarity is considered rare (epic or above)
   */
  isRareOrAbove(rarity: RarityLevel): boolean {
    const rareRarities: RarityLevel[] = ['epic', 'legendary', 'secret_rare'];
    return rareRarities.includes(rarity);
  }

  /**
   * Get rarity tier (0 = common, 5 = secret_rare)
   */
  getRarityTier(rarity: RarityLevel): number {
    const tiers: Record<RarityLevel, number> = {
      common: 0,
      uncommon: 1,
      rare: 2,
      epic: 3,
      legendary: 4,
      secret_rare: 5
    };
    return tiers[rarity];
  }

  /**
   * Compare two rarities (returns positive if first is rarer)
   */
  compareRarity(rarity1: RarityLevel, rarity2: RarityLevel): number {
    return this.getRarityTier(rarity1) - this.getRarityTier(rarity2);
  }

  /**
   * Generate stats based on rarity
   */
  generateStats(rarity: RarityLevel): {
    attack: number;
    defense: number;
    speed: number;
    health: number;
  } {
    const config = this.getRarityConfig(rarity);
    const min = config.minStats || 1;
    const max = config.maxStats || 3;

    return {
      attack: this.randomBetween(min, max),
      defense: this.randomBetween(min, max),
      speed: this.randomBetween(min, max),
      health: this.randomBetween(min, max)
    };
  }

  /**
   * Get expected distribution percentages
   */
  getExpectedDistribution(): RarityDistribution {
    return { ...this.distribution };
  }

  /**
   * Seeded random number generator for consistent results
   */
  private seededRandom(seed: string): number {
    // Create a hash from the seed using a simple but effective algorithm
    let hash = 0;
    if (seed.length === 0) return 0;
    
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Make hash positive
    hash = Math.abs(hash);
    
    // Use a simple but effective PRNG (Mulberry32)
    let t = hash + 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    const result = ((t ^ t >>> 14) >>> 0) / 4294967296;
    
    return result;
  }

  /**
   * Generate random number between min and max (inclusive)
   */
  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Calculate rarity boost multiplier for rewards
   */
  getRarityMultiplier(rarity: RarityLevel): number {
    const multipliers: Record<RarityLevel, number> = {
      common: 1.0,
      uncommon: 1.2,
      rare: 1.5,
      epic: 2.0,
      legendary: 3.0,
      secret_rare: 5.0
    };
    return multipliers[rarity];
  }

  /**
   * Get rarity from tier number
   */
  getRarityFromTier(tier: number): RarityLevel {
    const rarities: RarityLevel[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'secret_rare'];
    return rarities[Math.max(0, Math.min(tier, rarities.length - 1))];
  }
}

// Export singleton instance
export const raritySystem = new RaritySystemService();

// Additional utility functions for components
export type RarityType = RarityLevel;

/**
 * Get rarity display configuration (alias for getRarityConfig)
 */
export function getRarityDisplay(rarity: RarityLevel): RarityConfig {
  return RARITY_CONFIG[rarity];
}

/**
 * Simulate rarity distribution for testing/display purposes
 */
export function simulateRarityDistribution(sampleSize: number): Record<RarityLevel, number> {
  const service = new RaritySystemService();
  const rarities = service.generateMultipleRarities(sampleSize);
  const analysis = service.analyzeDistribution(rarities);
  return analysis.percentages;
}

/**
 * Alias for RARITY_CONFIG for backward compatibility
 */
export const RARITY_CONFIGS = RARITY_CONFIG;