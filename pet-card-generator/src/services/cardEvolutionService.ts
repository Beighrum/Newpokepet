import { Card } from '@/models/Card';
import { RarityLevel } from '@/services/raritySystem';
import { aiImageGenerationService } from '@/services/aiImageGeneration';

export interface EvolutionStage {
  id: string;
  name: string;
  description: string;
  requiredLevel: number;
  rarityBoost: boolean;
  statMultiplier: number;
  visualEnhancements: string[];
}

export interface EvolutionHistory {
  id: string;
  cardId: string;
  fromStage: number;
  toStage: number;
  timestamp: number;
  originalImage: string;
  evolvedImage: string;
  statsChange: {
    attack: number;
    defense: number;
    speed: number;
    health: number;
  };
  rarityChange?: {
    from: RarityLevel;
    to: RarityLevel;
  };
}

export interface EvolutionPreview {
  previewImage: string;
  predictedStats: {
    attack: number;
    defense: number;
    speed: number;
    health: number;
    totalPower: number;
  };
  predictedRarity: RarityLevel;
  enhancementDescription: string;
}

const EVOLUTION_STAGES: EvolutionStage[] = [
  {
    id: 'base',
    name: 'Base Form',
    description: 'The original form of your pet card',
    requiredLevel: 0,
    rarityBoost: false,
    statMultiplier: 1.0,
    visualEnhancements: []
  },
  {
    id: 'enhanced',
    name: 'Enhanced',
    description: 'Improved visual quality and minor stat boost',
    requiredLevel: 1,
    rarityBoost: false,
    statMultiplier: 1.15,
    visualEnhancements: ['improved_lighting', 'enhanced_colors', 'sharper_details']
  },
  {
    id: 'evolved',
    name: 'Evolved',
    description: 'Significant transformation with major improvements',
    requiredLevel: 2,
    rarityBoost: true,
    statMultiplier: 1.35,
    visualEnhancements: ['magical_effects', 'dynamic_pose', 'background_enhancement', 'aura_effects']
  },
  {
    id: 'legendary',
    name: 'Legendary Form',
    description: 'Ultimate evolution with maximum enhancements',
    requiredLevel: 3,
    rarityBoost: true,
    statMultiplier: 1.6,
    visualEnhancements: ['legendary_aura', 'particle_effects', 'divine_lighting', 'mythical_transformation']
  }
];

const RARITY_EVOLUTION_MAP: Record<RarityLevel, RarityLevel> = {
  common: 'uncommon',
  uncommon: 'rare',
  rare: 'epic',
  epic: 'legendary',
  legendary: 'legendary', // Already max
  secret_rare: 'secret_rare' // Special rarity stays same
};

class CardEvolutionService {
  private evolutionHistory: Map<string, EvolutionHistory[]> = new Map();

  // Get available evolution stages
  getEvolutionStages(): EvolutionStage[] {
    return EVOLUTION_STAGES;
  }

  // Get current evolution stage of a card
  getCurrentStage(card: Card): EvolutionStage {
    const evolutionLevel = card.evolution?.currentStage || 0;
    return EVOLUTION_STAGES[evolutionLevel] || EVOLUTION_STAGES[0];
  }

  // Get next evolution stage
  getNextStage(card: Card): EvolutionStage | null {
    const currentLevel = card.evolution?.currentStage || 0;
    const nextLevel = currentLevel + 1;
    return EVOLUTION_STAGES[nextLevel] || null;
  }

  // Check if card can evolve
  canEvolve(card: Card): boolean {
    const nextStage = this.getNextStage(card);
    return nextStage !== null;
  }

  // Generate evolution preview
  async generateEvolutionPreview(card: Card): Promise<EvolutionPreview> {
    const nextStage = this.getNextStage(card);
    if (!nextStage) {
      throw new Error('Card cannot evolve further');
    }

    try {
      // Generate preview image with enhanced prompts
      const enhancedPrompt = this.buildEvolutionPrompt(card, nextStage);
      const previewResult = await aiImageGenerationService.generateImage({
        prompt: enhancedPrompt,
        style: 'enhanced',
        aspectRatio: '1:1',
        quality: 'high'
      });

      // Calculate predicted stats
      const predictedStats = this.calculateEvolvedStats(card, nextStage);
      
      // Determine predicted rarity
      const predictedRarity = nextStage.rarityBoost ? 
        RARITY_EVOLUTION_MAP[card.rarity] : card.rarity;

      return {
        previewImage: previewResult.imageUrl,
        predictedStats,
        predictedRarity,
        enhancementDescription: this.generateEnhancementDescription(nextStage)
      };
    } catch (error) {
      console.error('Error generating evolution preview:', error);
      throw new Error('Failed to generate evolution preview');
    }
  }

  // Evolve a card
  async evolveCard(card: Card, userId: string): Promise<Card> {
    const nextStage = this.getNextStage(card);
    if (!nextStage) {
      throw new Error('Card cannot evolve further');
    }

    try {
      // Generate evolved image
      const enhancedPrompt = this.buildEvolutionPrompt(card, nextStage);
      const evolutionResult = await aiImageGenerationService.generateImage({
        prompt: enhancedPrompt,
        style: 'enhanced',
        aspectRatio: '1:1',
        quality: 'high'
      });

      // Calculate new stats
      const newStats = this.calculateEvolvedStats(card, nextStage);
      
      // Determine new rarity
      const newRarity = nextStage.rarityBoost ? 
        RARITY_EVOLUTION_MAP[card.rarity] : card.rarity;

      // Create evolution history entry
      const historyEntry: EvolutionHistory = {
        id: `evolution_${Date.now()}`,
        cardId: card.id,
        fromStage: card.evolution?.currentStage || 0,
        toStage: nextStage.requiredLevel,
        timestamp: Date.now(),
        originalImage: card.image.processedUrl,
        evolvedImage: evolutionResult.imageUrl,
        statsChange: {
          attack: newStats.attack - card.stats.attack,
          defense: newStats.defense - card.stats.defense,
          speed: newStats.speed - card.stats.speed,
          health: newStats.health - card.stats.health
        },
        ...(newRarity !== card.rarity && {
          rarityChange: {
            from: card.rarity,
            to: newRarity
          }
        })
      };

      // Store evolution history
      this.addEvolutionHistory(userId, historyEntry);

      // Create evolved card
      const evolvedCard: Card = {
        ...card,
        rarity: newRarity,
        stats: newStats,
        image: {
          ...card.image,
          processedUrl: evolutionResult.imageUrl,
          originalUrl: evolutionResult.imageUrl
        },
        evolution: {
          currentStage: nextStage.requiredLevel,
          maxStage: EVOLUTION_STAGES.length - 1,
          history: [...(card.evolution?.history || []), historyEntry.id],
          totalEvolutions: (card.evolution?.totalEvolutions || 0) + 1
        },
        updatedAt: Date.now()
      };

      return evolvedCard;
    } catch (error) {
      console.error('Error evolving card:', error);
      throw new Error('Failed to evolve card');
    }
  }

  // Build evolution prompt for AI generation
  private buildEvolutionPrompt(card: Card, stage: EvolutionStage): string {
    const basePrompt = `A ${card.petType} named ${card.petName}`;
    const enhancements = stage.visualEnhancements.join(', ');
    
    const stagePrompts = {
      enhanced: `${basePrompt} with enhanced visual quality, improved lighting, vibrant colors, and sharper details. Professional pet photography style.`,
      evolved: `${basePrompt} in an evolved form with magical transformation, dynamic pose, glowing aura effects, enhanced background, mystical atmosphere.`,
      legendary: `${basePrompt} in legendary form with divine transformation, particle effects, celestial aura, mythical powers, epic background, godlike presence.`
    };

    return stagePrompts[stage.id as keyof typeof stagePrompts] || 
           `${basePrompt} with ${enhancements}`;
  }

  // Calculate evolved stats
  private calculateEvolvedStats(card: Card, stage: EvolutionStage) {
    const multiplier = stage.statMultiplier;
    const baseStats = card.stats;
    
    return {
      attack: Math.round(baseStats.attack * multiplier),
      defense: Math.round(baseStats.defense * multiplier),
      speed: Math.round(baseStats.speed * multiplier),
      health: Math.round(baseStats.health * multiplier),
      totalPower: Math.round(baseStats.totalPower * multiplier)
    };
  }

  // Generate enhancement description
  private generateEnhancementDescription(stage: EvolutionStage): string {
    const descriptions = {
      enhanced: 'Visual quality improvements with enhanced colors and lighting',
      evolved: 'Magical transformation with mystical effects and dynamic pose',
      legendary: 'Ultimate evolution with divine powers and celestial aura'
    };

    return descriptions[stage.id as keyof typeof descriptions] || stage.description;
  }

  // Add evolution history
  private addEvolutionHistory(userId: string, history: EvolutionHistory): void {
    const userHistory = this.evolutionHistory.get(userId) || [];
    userHistory.push(history);
    this.evolutionHistory.set(userId, userHistory);
  }

  // Get evolution history for user
  getEvolutionHistory(userId: string): EvolutionHistory[] {
    return this.evolutionHistory.get(userId) || [];
  }

  // Get evolution history for specific card
  getCardEvolutionHistory(userId: string, cardId: string): EvolutionHistory[] {
    const userHistory = this.getEvolutionHistory(userId);
    return userHistory.filter(h => h.cardId === cardId);
  }

  // Get evolution statistics
  getEvolutionStats(userId: string) {
    const history = this.getEvolutionHistory(userId);
    
    return {
      totalEvolutions: history.length,
      cardsEvolved: new Set(history.map(h => h.cardId)).size,
      rarityUpgrades: history.filter(h => h.rarityChange).length,
      averageStatIncrease: this.calculateAverageStatIncrease(history),
      evolutionsByStage: this.groupEvolutionsByStage(history)
    };
  }

  // Calculate average stat increase
  private calculateAverageStatIncrease(history: EvolutionHistory[]): number {
    if (history.length === 0) return 0;
    
    const totalIncrease = history.reduce((sum, h) => {
      return sum + h.statsChange.attack + h.statsChange.defense + 
             h.statsChange.speed + h.statsChange.health;
    }, 0);
    
    return Math.round(totalIncrease / history.length);
  }

  // Group evolutions by stage
  private groupEvolutionsByStage(history: EvolutionHistory[]) {
    return history.reduce((groups, h) => {
      const stage = EVOLUTION_STAGES[h.toStage]?.name || 'Unknown';
      groups[stage] = (groups[stage] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
  }
}

// Export singleton instance
export const cardEvolutionService = new CardEvolutionService();
export default cardEvolutionService;