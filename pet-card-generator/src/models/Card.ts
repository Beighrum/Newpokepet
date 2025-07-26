import { RarityLevel } from '@/services/raritySystem';

export interface Card {
  // Core identification
  id: string;
  userId: string;
  
  // Pet information
  petName: string;
  petType: string;
  rarity: RarityLevel;
  
  // Image data
  image: {
    originalUrl: string;
    processedUrl: string;
    thumbnailUrl: string;
    width: number;
    height: number;
    format: string;
    fileSize: number;
  };
  
  // Battle stats
  stats: {
    attack: number;
    defense: number;
    speed: number;
    health: number;
    totalPower: number;
  };
  
  // Metadata
  tags: string[];
  isFavorite: boolean;
  shareCount: number;
  downloadCount: number;
  
  // Timestamps
  createdAt: number;
  updatedAt: number;
  
  // Optional animation data
  animation?: {
    enabled: boolean;
    type: 'bounce' | 'fade' | 'slide' | 'zoom';
    duration: number;
    animatedUrl: string;
  };
  
  // Optional evolution data
  evolution?: {
    currentStage: number;
    maxStage: number;
    history: string[]; // Array of evolution history IDs
    totalEvolutions: number;
  };
}

// Type guards
export const isCard = (obj: any): obj is Card => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.userId === 'string' &&
    typeof obj.petName === 'string' &&
    typeof obj.petType === 'string' &&
    typeof obj.rarity === 'string' &&
    typeof obj.image === 'object' &&
    typeof obj.stats === 'object' &&
    Array.isArray(obj.tags) &&
    typeof obj.isFavorite === 'boolean' &&
    typeof obj.shareCount === 'number' &&
    typeof obj.downloadCount === 'number' &&
    typeof obj.createdAt === 'number' &&
    typeof obj.updatedAt === 'number'
  );
};

// Helper functions
export const createCard = (data: Omit<Card, 'id' | 'createdAt' | 'updatedAt'>): Card => {
  const now = Date.now();
  return {
    ...data,
    id: `card_${now}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: now,
    updatedAt: now
  };
};

export const updateCard = (card: Card, updates: Partial<Card>): Card => {
  return {
    ...card,
    ...updates,
    updatedAt: Date.now()
  };
};