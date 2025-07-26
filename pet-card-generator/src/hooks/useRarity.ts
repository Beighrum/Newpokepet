import { useState, useCallback, useMemo } from 'react';
import { 
  RaritySystemService,
  raritySystem,
  RarityLevel,
  RarityConfig,
  RARITY_CONFIG
} from '@/services/raritySystem';
import { useAuth } from './useAuth';

interface UseRarityOptions {
  autoCalculate?: boolean;
  includeActiveEvents?: boolean;
}

interface UserCard {
  id: string;
  rarity: RarityLevel;
  petName: string;
  createdAt: Date;
}

interface RarityResult {
  rarity: RarityLevel;
  config: RarityConfig;
  stats: {
    attack: number;
    defense: number;
    speed: number;
    health: number;
  };
  multiplier: number;
}

export const useRarity = (options: UseRarityOptions = {}) => {
  const { autoCalculate = false, includeActiveEvents = true } = options;
  const { user } = useAuth();
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastResult, setLastResult] = useState<RarityResult | null>(null);
  const [userCards, setUserCards] = useState<UserCard[]>([]);

  // Get active special events (simplified for now)
  const activeEvents = useMemo(() => {
    const events: string[] = [];
    const now = new Date();
    const day = now.getDay();
    
    // Weekend boost
    if (day === 0 || day === 6) {
      events.push('weekend_boost');
    }
    
    // Holiday events (simplified)
    const month = now.getMonth();
    const date = now.getDate();
    if ((month === 0 && date === 1) || (month === 11 && date === 25)) {
      events.push('holiday_special');
    }
    
    return includeActiveEvents ? events : [];
  }, [includeActiveEvents]);

  // Calculate rarity for given factors
  const calculateCardRarity = useCallback(async (factors: { imageQuality?: number; petType?: string } = {}): Promise<RarityResult> => {
    setIsCalculating(true);
    
    try {
      // Add a small delay to make the calculation feel more substantial
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Generate rarity using the service
      const rarity = raritySystem.generateRarity();
      const config = raritySystem.getRarityConfig(rarity);
      const stats = raritySystem.generateStats(rarity);
      const multiplier = raritySystem.getRarityMultiplier(rarity);
      
      const result: RarityResult = {
        rarity,
        config,
        stats,
        multiplier
      };
      
      setLastResult(result);
      return result;
    } finally {
      setIsCalculating(false);
    }
  }, [user, activeEvents, userCards]);

  // Calculate rarity with image analysis
  const calculateRarityFromImage = useCallback(async (
    imageFile: File,
    petType: string,
    additionalFactors: Partial<RarityFactors> = {}
  ): Promise<RarityResult> => {
    // Simulate image quality analysis
    const imageQuality = await analyzeImageQuality(imageFile);
    
    return calculateCardRarity({
      imageQuality,
      petType,
      ...additionalFactors
    });
  }, [calculateCardRarity]);

  // Add a card to user's collection
  const addCardToCollection = useCallback((card: Omit<UserCard, 'id'>) => {
    const newCard: UserCard = {
      ...card,
      id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    setUserCards(prev => [...prev, newCard]);
    return newCard;
  }, []);

  // Remove a card from collection
  const removeCardFromCollection = useCallback((cardId: string) => {
    setUserCards(prev => prev.filter(card => card.id !== cardId));
  }, []);

  // Get collection statistics
  const collectionStats = useMemo(() => {
    const counts: Record<RarityLevel, number> = {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
      secret_rare: 0
    };

    userCards.forEach(card => {
      counts[card.rarity]++;
    });

    const total = userCards.length;
    const rareCount = counts.epic + counts.legendary + counts.secret_rare;
    const averageRarity = total > 0 ? userCards.reduce((sum, card) => sum + raritySystem.getRarityTier(card.rarity), 0) / total : 0;

    return {
      total,
      counts,
      rareCount,
      averageRarity,
      completionPercentage: total > 0 ? (Object.keys(counts).filter(rarity => counts[rarity as RarityLevel] > 0).length / 6) * 100 : 0
    };
  }, [userCards]);

  // Get recent rarities for pity system
  const recentRarities = useMemo(() => {
    return userCards.slice(-10).map(card => card.rarity);
  }, [userCards]);

  // Check if user is due for a rare card (pity system)
  const isPityEligible = useMemo(() => {
    const recentRares = recentRarities.filter(rarity => 
      raritySystem.isRareOrAbove(rarity)
    );
    return recentRares.length === 0 && recentRarities.length >= 5;
  }, [recentRarities]);

  // Get rarity streak information
  const rarityStreak = useMemo(() => {
    if (userCards.length === 0) return { type: 'none', count: 0 };
    
    const lastRarity = userCards[userCards.length - 1].rarity;
    let count = 1;
    
    for (let i = userCards.length - 2; i >= 0; i--) {
      if (userCards[i].rarity === lastRarity) {
        count++;
      } else {
        break;
      }
    }
    
    return { type: lastRarity, count };
  }, [userCards]);

  // Get user's rarest card
  const rarestCard = useMemo(() => {
    if (userCards.length === 0) return null;
    
    return userCards.reduce((rarest, card) => {
      if (!rarest) return card;
      
      const currentTier = raritySystem.getRarityTier(card.rarity);
      const rarestTier = raritySystem.getRarityTier(rarest.rarity);
      
      return currentTier > rarestTier ? card : rarest;
    }, null as UserCard | null);
  }, [userCards]);

  // Predict next rarity chance (for fun)
  const predictNextRarity = useCallback((factors: { imageQuality?: number; petType?: string } = {}) => {
    // Run multiple simulations to get probability distribution
    const simulations = 100;
    const results: Record<RarityLevel, number> = {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
      secret_rare: 0
    };
    
    for (let i = 0; i < simulations; i++) {
      const rarity = raritySystem.generateRarity(`sim-${i}`);
      results[rarity]++;
    }
    
    // Convert to percentages
    Object.keys(results).forEach(rarity => {
      results[rarity as RarityLevel] = (results[rarity as RarityLevel] / simulations) * 100;
    });
    
    return results;
  }, [user, activeEvents, recentRarities]);

  return {
    // State
    isCalculating,
    lastResult,
    userCards,
    collectionStats,
    activeEvents,
    recentRarities,
    isPityEligible,
    rarityStreak,
    rarestCard,
    
    // Actions
    calculateCardRarity,
    calculateRarityFromImage,
    addCardToCollection,
    removeCardFromCollection,
    predictNextRarity
  };
};

// Helper function to analyze image quality
async function analyzeImageQuality(imageFile: File): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      // Simple quality analysis based on image properties
      let quality = 50; // Base quality
      
      // Resolution bonus
      const pixels = img.width * img.height;
      if (pixels > 1000000) quality += 20; // High resolution
      else if (pixels > 500000) quality += 10; // Medium resolution
      else if (pixels < 100000) quality -= 15; // Low resolution
      
      // Aspect ratio bonus (square images are preferred for cards)
      const aspectRatio = img.width / img.height;
      if (aspectRatio >= 0.8 && aspectRatio <= 1.2) {
        quality += 10; // Good aspect ratio
      } else if (aspectRatio < 0.5 || aspectRatio > 2) {
        quality -= 10; // Poor aspect ratio
      }
      
      // File size considerations
      const fileSizeMB = imageFile.size / (1024 * 1024);
      if (fileSizeMB > 5) quality += 15; // Large file, likely high quality
      else if (fileSizeMB < 0.1) quality -= 10; // Very small file
      
      // Random variation to simulate more complex analysis
      quality += (Math.random() - 0.5) * 20;
      
      // Ensure quality is within bounds
      quality = Math.max(0, Math.min(100, quality));
      
      resolve(quality);
    };
    
    img.onerror = () => {
      resolve(30); // Default low quality for failed analysis
    };
    
    img.src = URL.createObjectURL(imageFile);
  });
}

export default useRarity;