import { cardEvolutionService } from '../cardEvolutionService';
import { Card } from '@/models/Card';
import { aiImageGenerationService } from '@/services/aiImageGeneration';

// Mock the AI image generation service
jest.mock('@/services/aiImageGeneration');

const mockAiImageGenerationService = aiImageGenerationService as jest.Mocked<typeof aiImageGenerationService>;

const mockCard: Card = {
  id: 'test-card-1',
  userId: 'user-1',
  petName: 'Fluffy',
  petType: 'cat',
  rarity: 'common',
  image: {
    originalUrl: 'https://example.com/original.jpg',
    processedUrl: 'https://example.com/processed.jpg',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    width: 512,
    height: 512,
    format: 'jpeg',
    fileSize: 1024000
  },
  stats: {
    attack: 50,
    defense: 40,
    speed: 60,
    health: 45,
    totalPower: 195
  },
  tags: ['cute', 'fluffy'],
  isFavorite: false,
  shareCount: 0,
  downloadCount: 0,
  createdAt: Date.now(),
  updatedAt: Date.now()
};

describe('CardEvolutionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEvolutionStages', () => {
    it('should return all evolution stages', () => {
      const stages = cardEvolutionService.getEvolutionStages();
      
      expect(stages).toHaveLength(4);
      expect(stages[0].id).toBe('base');
      expect(stages[1].id).toBe('enhanced');
      expect(stages[2].id).toBe('evolved');
      expect(stages[3].id).toBe('legendary');
    });
  });

  describe('getCurrentStage', () => {
    it('should return base stage for card without evolution data', () => {
      const stage = cardEvolutionService.getCurrentStage(mockCard);
      
      expect(stage.id).toBe('base');
      expect(stage.name).toBe('Base Form');
    });

    it('should return correct stage for evolved card', () => {
      const evolvedCard = {
        ...mockCard,
        evolution: {
          currentStage: 2,
          maxStage: 3,
          history: [],
          totalEvolutions: 2
        }
      };
      
      const stage = cardEvolutionService.getCurrentStage(evolvedCard);
      
      expect(stage.id).toBe('evolved');
      expect(stage.name).toBe('Evolved');
    });
  });

  describe('getNextStage', () => {
    it('should return enhanced stage for base card', () => {
      const nextStage = cardEvolutionService.getNextStage(mockCard);
      
      expect(nextStage).not.toBeNull();
      expect(nextStage!.id).toBe('enhanced');
      expect(nextStage!.name).toBe('Enhanced');
    });

    it('should return null for max evolved card', () => {
      const maxEvolvedCard = {
        ...mockCard,
        evolution: {
          currentStage: 3,
          maxStage: 3,
          history: [],
          totalEvolutions: 3
        }
      };
      
      const nextStage = cardEvolutionService.getNextStage(maxEvolvedCard);
      
      expect(nextStage).toBeNull();
    });
  });

  describe('canEvolve', () => {
    it('should return true for base card', () => {
      const canEvolve = cardEvolutionService.canEvolve(mockCard);
      
      expect(canEvolve).toBe(true);
    });

    it('should return false for max evolved card', () => {
      const maxEvolvedCard = {
        ...mockCard,
        evolution: {
          currentStage: 3,
          maxStage: 3,
          history: [],
          totalEvolutions: 3
        }
      };
      
      const canEvolve = cardEvolutionService.canEvolve(maxEvolvedCard);
      
      expect(canEvolve).toBe(false);
    });
  });

  describe('generateEvolutionPreview', () => {
    beforeEach(() => {
      mockAiImageGenerationService.generateImage.mockResolvedValue({
        imageUrl: 'https://example.com/evolved.jpg',
        prompt: 'test prompt',
        style: 'enhanced',
        timestamp: Date.now()
      });
    });

    it('should generate preview for valid card', async () => {
      const preview = await cardEvolutionService.generateEvolutionPreview(mockCard);
      
      expect(preview).toBeDefined();
      expect(preview.previewImage).toBe('https://example.com/evolved.jpg');
      expect(preview.predictedStats.attack).toBeGreaterThan(mockCard.stats.attack);
      expect(preview.predictedRarity).toBe('common'); // No rarity boost for enhanced stage
      expect(preview.enhancementDescription).toContain('Visual quality improvements');
    });

    it('should throw error for card that cannot evolve', async () => {
      const maxEvolvedCard = {
        ...mockCard,
        evolution: {
          currentStage: 3,
          maxStage: 3,
          history: [],
          totalEvolutions: 3
        }
      };
      
      await expect(
        cardEvolutionService.generateEvolutionPreview(maxEvolvedCard)
      ).rejects.toThrow('Card cannot evolve further');
    });

    it('should handle AI generation errors', async () => {
      mockAiImageGenerationService.generateImage.mockRejectedValue(new Error('AI service error'));
      
      await expect(
        cardEvolutionService.generateEvolutionPreview(mockCard)
      ).rejects.toThrow('Failed to generate evolution preview');
    });
  });

  describe('evolveCard', () => {
    beforeEach(() => {
      mockAiImageGenerationService.generateImage.mockResolvedValue({
        imageUrl: 'https://example.com/evolved.jpg',
        prompt: 'test prompt',
        style: 'enhanced',
        timestamp: Date.now()
      });
    });

    it('should evolve card successfully', async () => {
      const evolvedCard = await cardEvolutionService.evolveCard(mockCard, 'user-1');
      
      expect(evolvedCard.evolution).toBeDefined();
      expect(evolvedCard.evolution!.currentStage).toBe(1);
      expect(evolvedCard.evolution!.totalEvolutions).toBe(1);
      expect(evolvedCard.stats.attack).toBeGreaterThan(mockCard.stats.attack);
      expect(evolvedCard.image.processedUrl).toBe('https://example.com/evolved.jpg');
    });

    it('should upgrade rarity for stages that boost rarity', async () => {
      const enhancedCard = {
        ...mockCard,
        evolution: {
          currentStage: 1,
          maxStage: 3,
          history: [],
          totalEvolutions: 1
        }
      };
      
      const evolvedCard = await cardEvolutionService.evolveCard(enhancedCard, 'user-1');
      
      expect(evolvedCard.rarity).toBe('uncommon'); // common -> uncommon
    });

    it('should create evolution history entry', async () => {
      await cardEvolutionService.evolveCard(mockCard, 'user-1');
      
      const history = cardEvolutionService.getEvolutionHistory('user-1');
      
      expect(history).toHaveLength(1);
      expect(history[0].cardId).toBe(mockCard.id);
      expect(history[0].fromStage).toBe(0);
      expect(history[0].toStage).toBe(1);
    });

    it('should throw error for card that cannot evolve', async () => {
      const maxEvolvedCard = {
        ...mockCard,
        evolution: {
          currentStage: 3,
          maxStage: 3,
          history: [],
          totalEvolutions: 3
        }
      };
      
      await expect(
        cardEvolutionService.evolveCard(maxEvolvedCard, 'user-1')
      ).rejects.toThrow('Card cannot evolve further');
    });
  });

  describe('getEvolutionHistory', () => {
    it('should return empty array for user with no history', () => {
      const history = cardEvolutionService.getEvolutionHistory('new-user');
      
      expect(history).toEqual([]);
    });

    it('should return user evolution history', async () => {
      // Create some evolution history
      await cardEvolutionService.evolveCard(mockCard, 'user-1');
      
      const history = cardEvolutionService.getEvolutionHistory('user-1');
      
      expect(history).toHaveLength(1);
      expect(history[0].cardId).toBe(mockCard.id);
    });
  });

  describe('getCardEvolutionHistory', () => {
    it('should return history for specific card', async () => {
      await cardEvolutionService.evolveCard(mockCard, 'user-1');
      
      const cardHistory = cardEvolutionService.getCardEvolutionHistory('user-1', mockCard.id);
      
      expect(cardHistory).toHaveLength(1);
      expect(cardHistory[0].cardId).toBe(mockCard.id);
    });

    it('should return empty array for card with no history', () => {
      const cardHistory = cardEvolutionService.getCardEvolutionHistory('user-1', 'non-existent-card');
      
      expect(cardHistory).toEqual([]);
    });
  });

  describe('getEvolutionStats', () => {
    it('should return correct statistics', async () => {
      // Create some evolution history
      await cardEvolutionService.evolveCard(mockCard, 'user-1');
      
      const stats = cardEvolutionService.getEvolutionStats('user-1');
      
      expect(stats.totalEvolutions).toBe(1);
      expect(stats.cardsEvolved).toBe(1);
      expect(stats.rarityUpgrades).toBe(0); // Enhanced stage doesn't boost rarity
      expect(stats.averageStatIncrease).toBeGreaterThan(0);
      expect(stats.evolutionsByStage).toHaveProperty('Enhanced', 1);
    });

    it('should handle empty history', () => {
      const stats = cardEvolutionService.getEvolutionStats('new-user');
      
      expect(stats.totalEvolutions).toBe(0);
      expect(stats.cardsEvolved).toBe(0);
      expect(stats.rarityUpgrades).toBe(0);
      expect(stats.averageStatIncrease).toBe(0);
    });
  });

  describe('stat calculations', () => {
    it('should apply correct stat multipliers', async () => {
      const evolvedCard = await cardEvolutionService.evolveCard(mockCard, 'user-1');
      
      // Enhanced stage has 1.15x multiplier
      expect(evolvedCard.stats.attack).toBe(Math.round(mockCard.stats.attack * 1.15));
      expect(evolvedCard.stats.defense).toBe(Math.round(mockCard.stats.defense * 1.15));
      expect(evolvedCard.stats.speed).toBe(Math.round(mockCard.stats.speed * 1.15));
      expect(evolvedCard.stats.health).toBe(Math.round(mockCard.stats.health * 1.15));
    });
  });

  describe('rarity evolution', () => {
    it('should follow correct rarity progression', async () => {
      // Test common -> uncommon
      let evolvedCard = await cardEvolutionService.evolveCard({
        ...mockCard,
        evolution: { currentStage: 1, maxStage: 3, history: [], totalEvolutions: 1 }
      }, 'user-1');
      
      expect(evolvedCard.rarity).toBe('uncommon');
      
      // Test uncommon -> rare
      evolvedCard = await cardEvolutionService.evolveCard({
        ...evolvedCard,
        evolution: { currentStage: 2, maxStage: 3, history: [], totalEvolutions: 2 }
      }, 'user-1');
      
      expect(evolvedCard.rarity).toBe('rare');
    });

    it('should not exceed legendary rarity', async () => {
      const legendaryCard = {
        ...mockCard,
        rarity: 'legendary' as const,
        evolution: { currentStage: 2, maxStage: 3, history: [], totalEvolutions: 2 }
      };
      
      const evolvedCard = await cardEvolutionService.evolveCard(legendaryCard, 'user-1');
      
      expect(evolvedCard.rarity).toBe('legendary'); // Should stay legendary
    });
  });
});