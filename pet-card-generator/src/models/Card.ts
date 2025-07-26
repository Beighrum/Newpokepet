import { RarityLevel } from '@/services/raritySystem';
import { AnimationConfig } from '@/services/simpleAnimationService';

export interface CardMetadata {
  generationTime: number; // timestamp
  processingTime?: number; // time taken to generate in ms
  imageFileSize?: number; // in bytes
  animationFileSize?: number; // in bytes
  totalFileSize: number; // combined size in bytes
  aiModel?: string; // AI model used for generation
  aiPrompt?: string; // prompt used for generation
  style?: string; // generation style
  version: string; // app version when created
  deviceInfo?: {
    userAgent: string;
    platform: string;
    screenResolution: string;
  };
}

export interface CardStats {
  attack: number;
  defense: number;
  speed: number;
  health: number;
  totalPower: number; // calculated field
}

export interface CardAnimation {
  type: AnimationConfig['type'];
  enabled: boolean;
  config: AnimationConfig;
  fileUrl?: string; // Cloud Storage URL for GIF
  cssAnimation?: string; // CSS animation string
  fallbackUsed: boolean;
}

export interface CardImage {
  originalUrl: string; // Original uploaded image
  processedUrl: string; // AI-generated card image
  thumbnailUrl?: string; // Optimized thumbnail
  width: number;
  height: number;
  format: string; // 'jpeg', 'png', etc.
}

export interface Card {
  id: string;
  userId: string;
  
  // Pet Information
  petName: string;
  petType: string; // 'dog', 'cat', 'rabbit', etc.
  description?: string;
  
  // Card Properties
  rarity: RarityLevel;
  stats: CardStats;
  
  // Media
  image: CardImage;
  animation?: CardAnimation;
  
  // Metadata
  metadata: CardMetadata;
  
  // Timestamps
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
  
  // User Interaction
  isFavorite: boolean;
  tags: string[]; // user-defined tags
  shareCount: number;
  downloadCount: number;
  
  // Evolution (for premium feature)
  evolutionHistory?: {
    fromCardId?: string;
    evolutionLevel: number;
    evolutionDate: number;
  };
  
  // Status
  status: 'draft' | 'processing' | 'completed' | 'failed';
  error?: string; // if status is 'failed'
}

export interface User {
  id: string; // Firebase Auth UID
  email: string;
  displayName?: string;
  photoURL?: string;
  
  // Profile
  username?: string;
  bio?: string;
  location?: string;
  
  // Subscription
  isPremium: boolean;
  subscriptionTier?: 'basic' | 'premium' | 'pro';
  subscriptionExpiry?: number; // timestamp
  
  // Statistics
  stats: {
    totalCards: number;
    cardsGenerated: number;
    favoriteCards: number;
    shareCount: number;
    downloadCount: number;
    rarityBreakdown: Record<RarityLevel, number>;
    joinDate: number; // timestamp
    lastActive: number; // timestamp
  };
  
  // Preferences
  preferences: {
    defaultAnimationEnabled: boolean;
    defaultStyle: string;
    notificationsEnabled: boolean;
    publicProfile: boolean;
    autoSaveCards: boolean;
  };
  
  // Timestamps
  createdAt: number;
  updatedAt: number;
}

export interface Collection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  cardIds: string[];
  isPublic: boolean;
  tags: string[];
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  cardCount: number; // denormalized for performance
  
  // Statistics
  rarityBreakdown: Record<RarityLevel, number>;
  totalFileSize: number;
}

// Firestore subcollection documents
export interface CardShare {
  id: string;
  cardId: string;
  userId: string;
  platform: 'twitter' | 'facebook' | 'instagram' | 'discord' | 'direct';
  sharedAt: number;
  metadata?: {
    recipientEmail?: string;
    message?: string;
  };
}

export interface CardDownload {
  id: string;
  cardId: string;
  userId: string;
  downloadedAt: number;
  format: 'png' | 'jpg' | 'gif' | 'pdf';
  fileSize: number;
  metadata?: {
    quality: string;
    dimensions: string;
  };
}

// Type guards
export const isCard = (obj: any): obj is Card => {
  return !!(obj && 
    typeof obj.id === 'string' &&
    typeof obj.userId === 'string' &&
    typeof obj.petName === 'string' &&
    typeof obj.rarity === 'string' &&
    obj.stats &&
    obj.image &&
    obj.metadata);
};

export const isUser = (obj: any): obj is User => {
  return !!(obj &&
    typeof obj.id === 'string' &&
    typeof obj.email === 'string' &&
    obj.stats &&
    obj.preferences);
};

// Validation functions
export const validateCard = (card: Partial<Card>): string[] => {
  const errors: string[] = [];
  
  if (!card.petName || card.petName.trim().length === 0) {
    errors.push('Pet name is required');
  }
  
  if (!card.petType || card.petType.trim().length === 0) {
    errors.push('Pet type is required');
  }
  
  if (!card.rarity) {
    errors.push('Rarity is required');
  }
  
  if (!card.image?.originalUrl) {
    errors.push('Original image URL is required');
  }
  
  if (!card.image?.processedUrl) {
    errors.push('Processed image URL is required');
  }
  
  if (card.stats) {
    if (card.stats.attack < 0 || card.stats.attack > 100) {
      errors.push('Attack must be between 0 and 100');
    }
    if (card.stats.defense < 0 || card.stats.defense > 100) {
      errors.push('Defense must be between 0 and 100');
    }
    if (card.stats.speed < 0 || card.stats.speed > 100) {
      errors.push('Speed must be between 0 and 100');
    }
    if (card.stats.health < 0 || card.stats.health > 100) {
      errors.push('Health must be between 0 and 100');
    }
  }
  
  if (card.tags && card.tags.length > 10) {
    errors.push('Maximum 10 tags allowed');
  }
  
  return errors;
};

export const validateUser = (user: Partial<User>): string[] => {
  const errors: string[] = [];
  
  if (!user.email || !user.email.includes('@')) {
    errors.push('Valid email is required');
  }
  
  if (user.username && (user.username.length < 3 || user.username.length > 30)) {
    errors.push('Username must be between 3 and 30 characters');
  }
  
  if (user.bio && user.bio.length > 500) {
    errors.push('Bio must be less than 500 characters');
  }
  
  return errors;
};

// Helper functions
export const calculateTotalPower = (stats: CardStats): number => {
  return stats.attack + stats.defense + stats.speed + stats.health;
};

export const createDefaultUser = (authUser: { uid: string; email: string; displayName?: string; photoURL?: string }): User => {
  const now = Date.now();
  
  return {
    id: authUser.uid,
    email: authUser.email,
    displayName: authUser.displayName,
    photoURL: authUser.photoURL,
    isPremium: false,
    stats: {
      totalCards: 0,
      cardsGenerated: 0,
      favoriteCards: 0,
      shareCount: 0,
      downloadCount: 0,
      rarityBreakdown: {
        common: 0,
        uncommon: 0,
        rare: 0,
        epic: 0,
        legendary: 0,
        secret_rare: 0
      },
      joinDate: now,
      lastActive: now
    },
    preferences: {
      defaultAnimationEnabled: true,
      defaultStyle: 'realistic',
      notificationsEnabled: true,
      publicProfile: false,
      autoSaveCards: true
    },
    createdAt: now,
    updatedAt: now
  };
};

export const createCardFromGeneration = (
  userId: string,
  petName: string,
  petType: string,
  rarity: RarityLevel,
  stats: CardStats,
  image: CardImage,
  metadata: Partial<CardMetadata>,
  animation?: CardAnimation
): Omit<Card, 'id'> => {
  const now = Date.now();
  
  return {
    userId,
    petName: petName.trim(),
    petType: petType.toLowerCase().trim(),
    rarity,
    stats: {
      ...stats,
      totalPower: calculateTotalPower(stats)
    },
    image,
    animation,
    metadata: {
      generationTime: now,
      totalFileSize: (image.width * image.height * 4) + (metadata.animationFileSize || 0), // rough estimate
      version: '1.0.0',
      ...metadata
    },
    createdAt: now,
    updatedAt: now,
    isFavorite: false,
    tags: [],
    shareCount: 0,
    downloadCount: 0,
    status: 'completed'
  };
};

// Export types for external use
export type { CardMetadata, CardStats, CardAnimation, CardImage, Collection, CardShare, CardDownload };