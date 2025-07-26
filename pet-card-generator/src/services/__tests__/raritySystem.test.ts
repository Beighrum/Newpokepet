import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  RaritySystemService,
  raritySystem,
  RARITY_CONFIG,
  DEFAULT_RARITY_DISTRIBUTION,
  RarityLevel,
  RarityConfig,
  RarityDistribution
} from '../raritySystem';

describe('RaritySystemService', () => {
  let service: RaritySystemService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RaritySystemService();
    // Mock Math.random for consistent testing
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  describe('generateRarity', () => {
    it('should generate a valid rarity level', () => {
      const rarity = service.generateRarity();
      const validRarities: RarityLevel[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'secret_rare'];
      expect(validRarities).toContain(rarity);
    });

    it('should generate consistent results with same seed', () => {
      const rarity1 = service.generateRarity('test-seed');
      const rarity2 = service.generateRarity('test-seed');
      expect(rarity1).toBe(rarity2);
    });

    it('should generate different results with different seeds', () => {
      // Test that seeded generation produces different results for different seeds
      const rarity1 = service.generateRarity('seed1');
      const rarity2 = service.generateRarity('seed2');
      const rarity3 = service.generateRarity('completely-different-seed');
      
      // At least one should be different (this is probabilistic but very likely)
      const allSame = rarity1 === rarity2 && rarity2 === rarity3;
      expect(allSame).toBe(false);
    });

    it('should respect distribution weights', () => {
      // Generate many rarities and check distribution
      const results: RarityLevel[] = [];
      for (let i = 0; i < 1000; i++) {
        results.push(service.generateRarity(`seed-${i}`));
      }

      const analysis = service.analyzeDistribution(results);
      
      // Common should be most frequent
      expect(analysis.percentages.common).toBeGreaterThan(analysis.percentages.uncommon);
      expect(analysis.percentages.uncommon).toBeGreaterThan(analysis.percentages.rare);
      expect(analysis.percentages.rare).toBeGreaterThan(analysis.percentages.epic);
      expect(analysis.percentages.epic).toBeGreaterThan(analysis.percentages.legendary);
      expect(analysis.percentages.legendary).toBeGreaterThan(analysis.percentages.secret_rare);
    });
  });

  describe('generateMultipleRarities', () => {
    it('should generate the correct number of rarities', () => {
      const count = 10;
      const rarities = service.generateMultipleRarities(count);
      expect(rarities).toHaveLength(count);
    });

    it('should generate consistent results with seed', () => {
      const rarities1 = service.generateMultipleRarities(5, 'test-seed');
      const rarities2 = service.generateMultipleRarities(5, 'test-seed');
      expect(rarities1).toEqual(rarities2);
    });
  });

  describe('analyzeDistribution', () => {
    it('should analyze empty distribution', () => {
      const analysis = service.analyzeDistribution([]);
      
      expect(analysis.total).toBe(0);
      expect(analysis.counts.common).toBe(0);
      expect(analysis.percentages.common).toBe(0);
    });

    it('should analyze mixed distribution', () => {
      const rarities: RarityLevel[] = [
        'common', 'common', 'uncommon', 'rare', 'epic'
      ];
      
      const analysis = service.analyzeDistribution(rarities);
      
      expect(analysis.total).toBe(5);
      expect(analysis.counts.common).toBe(2);
      expect(analysis.counts.uncommon).toBe(1);
      expect(analysis.counts.rare).toBe(1);
      expect(analysis.counts.epic).toBe(1);
      expect(analysis.percentages.common).toBe(40);
      expect(analysis.percentages.uncommon).toBe(20);
    });

    it('should calculate percentages correctly', () => {
      const rarities: RarityLevel[] = ['common', 'common', 'common', 'common'];
      const analysis = service.analyzeDistribution(rarities);
      
      expect(analysis.percentages.common).toBe(100);
      expect(analysis.percentages.uncommon).toBe(0);
    });
  });

  describe('utility methods', () => {
    it('should identify rare cards correctly', () => {
      expect(service.isRareOrAbove('common')).toBe(false);
      expect(service.isRareOrAbove('uncommon')).toBe(false);
      expect(service.isRareOrAbove('rare')).toBe(false);
      expect(service.isRareOrAbove('epic')).toBe(true);
      expect(service.isRareOrAbove('legendary')).toBe(true);
      expect(service.isRareOrAbove('secret_rare')).toBe(true);
    });

    it('should return correct rarity tiers', () => {
      expect(service.getRarityTier('common')).toBe(0);
      expect(service.getRarityTier('uncommon')).toBe(1);
      expect(service.getRarityTier('rare')).toBe(2);
      expect(service.getRarityTier('epic')).toBe(3);
      expect(service.getRarityTier('legendary')).toBe(4);
      expect(service.getRarityTier('secret_rare')).toBe(5);
    });

    it('should compare rarities correctly', () => {
      expect(service.compareRarity('legendary', 'common')).toBeGreaterThan(0);
      expect(service.compareRarity('common', 'legendary')).toBeLessThan(0);
      expect(service.compareRarity('rare', 'rare')).toBe(0);
    });

    it('should generate stats based on rarity', () => {
      const commonStats = service.generateStats('common');
      const legendaryStats = service.generateStats('legendary');
      
      expect(commonStats).toHaveProperty('attack');
      expect(commonStats).toHaveProperty('defense');
      expect(commonStats).toHaveProperty('speed');
      expect(commonStats).toHaveProperty('health');
      
      // Legendary should generally have higher stats than common
      const commonTotal = commonStats.attack + commonStats.defense + commonStats.speed + commonStats.health;
      const legendaryTotal = legendaryStats.attack + legendaryStats.defense + legendaryStats.speed + legendaryStats.health;
      
      expect(legendaryTotal).toBeGreaterThanOrEqual(commonTotal);
    });

    it('should return correct rarity multipliers', () => {
      expect(service.getRarityMultiplier('common')).toBe(1.0);
      expect(service.getRarityMultiplier('uncommon')).toBe(1.2);
      expect(service.getRarityMultiplier('rare')).toBe(1.5);
      expect(service.getRarityMultiplier('epic')).toBe(2.0);
      expect(service.getRarityMultiplier('legendary')).toBe(3.0);
      expect(service.getRarityMultiplier('secret_rare')).toBe(5.0);
    });

    it('should convert tier to rarity correctly', () => {
      expect(service.getRarityFromTier(0)).toBe('common');
      expect(service.getRarityFromTier(1)).toBe('uncommon');
      expect(service.getRarityFromTier(2)).toBe('rare');
      expect(service.getRarityFromTier(3)).toBe('epic');
      expect(service.getRarityFromTier(4)).toBe('legendary');
      expect(service.getRarityFromTier(5)).toBe('secret_rare');
      expect(service.getRarityFromTier(-1)).toBe('common'); // Bounds check
      expect(service.getRarityFromTier(10)).toBe('secret_rare'); // Bounds check
    });
  });

  describe('distribution accuracy', () => {
    it('should follow expected distribution over large sample', () => {
      // Restore Math.random for this test to get real distribution
      vi.restoreAllMocks();
      
      const sampleSize = 10000;
      const rarities = service.generateMultipleRarities(sampleSize);
      const analysis = service.analyzeDistribution(rarities);
      const expected = service.getExpectedDistribution();
      
      // Allow for some variance in random distribution
      const tolerance = 3; // 3% tolerance for random distribution
      
      expect(Math.abs(analysis.percentages.common - expected.common)).toBeLessThan(tolerance);
      expect(Math.abs(analysis.percentages.uncommon - expected.uncommon)).toBeLessThan(tolerance);
      expect(Math.abs(analysis.percentages.rare - expected.rare)).toBeLessThan(tolerance);
      expect(Math.abs(analysis.percentages.epic - expected.epic)).toBeLessThan(tolerance);
      expect(Math.abs(analysis.percentages.legendary - expected.legendary)).toBeLessThan(tolerance);
      expect(Math.abs(analysis.percentages.secret_rare - expected.secret_rare)).toBeLessThan(tolerance);
    });
  });

  describe('RARITY_CONFIG', () => {
    it('should have all required rarity types', () => {
      const expectedRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'secret_rare'];
      
      expectedRarities.forEach(rarity => {
        expect(RARITY_CONFIG).toHaveProperty(rarity);
      });
    });

    it('should have valid configuration for each rarity', () => {
      Object.values(RARITY_CONFIG).forEach((config: RarityConfig) => {
        expect(config).toHaveProperty('level');
        expect(config).toHaveProperty('weight');
        expect(config).toHaveProperty('displayName');
        expect(config).toHaveProperty('color');
        expect(config).toHaveProperty('backgroundColor');
        expect(config).toHaveProperty('borderColor');
        expect(config).toHaveProperty('glowColor');
        expect(config).toHaveProperty('description');
        expect(config).toHaveProperty('emoji');
        
        expect(config.weight).toBeGreaterThan(0);
        expect(typeof config.displayName).toBe('string');
        expect(typeof config.color).toBe('string');
        expect(typeof config.description).toBe('string');
        expect(typeof config.emoji).toBe('string');
      });
    });

    it('should have weights that sum to 100', () => {
      const totalWeight = Object.values(RARITY_CONFIG)
        .reduce((sum: number, config: RarityConfig) => sum + config.weight, 0);
      
      expect(totalWeight).toBe(100);
    });
  });

  describe('DEFAULT_RARITY_DISTRIBUTION', () => {
    it('should match the specified distribution', () => {
      expect(DEFAULT_RARITY_DISTRIBUTION.common).toBe(40);
      expect(DEFAULT_RARITY_DISTRIBUTION.uncommon).toBe(25);
      expect(DEFAULT_RARITY_DISTRIBUTION.rare).toBe(20);
      expect(DEFAULT_RARITY_DISTRIBUTION.epic).toBe(10);
      expect(DEFAULT_RARITY_DISTRIBUTION.legendary).toBe(4);
      expect(DEFAULT_RARITY_DISTRIBUTION.secret_rare).toBe(1);
    });

    it('should sum to 100', () => {
      const total = Object.values(DEFAULT_RARITY_DISTRIBUTION).reduce((sum, val) => sum + val, 0);
      expect(total).toBe(100);
    });
  });
});