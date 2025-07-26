import { describe, it, expect } from 'vitest';
import {
  Card,
  User,
  validateCard,
  validateUser,
  calculateTotalPower,
  createDefaultUser,
  createCardFromGeneration,
  isCard,
  isUser
} from '../Card';
import { RarityLevel } from '@/services/raritySystem';

describe('Card Model', () => {
  const mockCardStats = {
    attack: 75,
    defense: 60,
    speed: 80,
    health: 70,
    totalPower: 285
  };

  const mockCardImage = {
    originalUrl: 'https://example.com/original.jpg',
    processedUrl: 'https://example.com/processed.jpg',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    width: 512,
    height: 512,
    format: 'jpeg'
  };

  const mockCardMetadata = {
    generationTime: Date.now(),
    processingTime: 5000,
    imageFileSize: 150000,
    animationFileSize: 500000,
    totalFileSize: 650000,
    aiModel: 'stable-diffusion',
    aiPrompt: 'realistic dog portrait',
    style: 'realistic',
    version: '1.0.0'
  };

  const mockCard: Card = {
    id: 'card_123',
    userId: 'user_456',
    petName: 'Buddy',
    petType: 'dog',
    description: 'A friendly golden retriever',
    rarity: 'rare',
    stats: mockCardStats,
    image: mockCardImage,
    metadata: mockCardMetadata,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isFavorite: false,
    tags: ['cute', 'golden'],
    shareCount: 5,
    downloadCount: 2,
    status: 'completed'
  };

  describe('validateCard', () => {
    it('should validate a complete card successfully', () => {
      const errors = validateCard(mockCard);
      expect(errors).toHaveLength(0);
    });

    it('should require pet name', () => {
      const invalidCard = { ...mockCard, petName: '' };
      const errors = validateCard(invalidCard);
      expect(errors).toContain('Pet name is required');
    });

    it('should require pet type', () => {
      const invalidCard = { ...mockCard, petType: '' };
      const errors = validateCard(invalidCard);
      expect(errors).toContain('Pet type is required');
    });

    it('should require rarity', () => {
      const invalidCard = { ...mockCard, rarity: undefined as any };
      const errors = validateCard(invalidCard);
      expect(errors).toContain('Rarity is required');
    });

    it('should require original image URL', () => {
      const invalidCard = { 
        ...mockCard, 
        image: { ...mockCard.image, originalUrl: '' }
      };
      const errors = validateCard(invalidCard);
      expect(errors).toContain('Original image URL is required');
    });

    it('should require processed image URL', () => {
      const invalidCard = { 
        ...mockCard, 
        image: { ...mockCard.image, processedUrl: '' }
      };
      const errors = validateCard(invalidCard);
      expect(errors).toContain('Processed image URL is required');
    });

    it('should validate stats ranges', () => {
      const invalidCard = { 
        ...mockCard, 
        stats: { ...mockCard.stats, attack: 150, defense: -10 }
      };
      const errors = validateCard(invalidCard);
      expect(errors).toContain('Attack must be between 0 and 100');
      expect(errors).toContain('Defense must be between 0 and 100');
    });

    it('should limit number of tags', () => {
      const invalidCard = { 
        ...mockCard, 
        tags: Array(15).fill('tag')
      };
      const errors = validateCard(invalidCard);
      expect(errors).toContain('Maximum 10 tags allowed');
    });
  });

  describe('calculateTotalPower', () => {
    it('should calculate total power correctly', () => {
      const stats = {
        attack: 75,
        defense: 60,
        speed: 80,
        health: 70,
        totalPower: 0 // This will be calculated
      };
      
      const totalPower = calculateTotalPower(stats);
      expect(totalPower).toBe(285);
    });

    it('should handle zero stats', () => {
      const stats = {
        attack: 0,
        defense: 0,
        speed: 0,
        health: 0,
        totalPower: 0
      };
      
      const totalPower = calculateTotalPower(stats);
      expect(totalPower).toBe(0);
    });

    it('should handle maximum stats', () => {
      const stats = {
        attack: 100,
        defense: 100,
        speed: 100,
        health: 100,
        totalPower: 0
      };
      
      const totalPower = calculateTotalPower(stats);
      expect(totalPower).toBe(400);
    });
  });

  describe('createCardFromGeneration', () => {
    it('should create a card with correct structure', () => {
      const card = createCardFromGeneration(
        'user_123',
        'Max',
        'Golden Retriever',
        'epic',
        mockCardStats,
        mockCardImage,
        mockCardMetadata
      );

      expect(card.userId).toBe('user_123');
      expect(card.petName).toBe('Max');
      expect(card.petType).toBe('golden retriever'); // should be lowercase
      expect(card.rarity).toBe('epic');
      expect(card.stats.totalPower).toBe(285);
      expect(card.status).toBe('completed');
      expect(card.isFavorite).toBe(false);
      expect(card.tags).toEqual([]);
      expect(card.shareCount).toBe(0);
      expect(card.downloadCount).toBe(0);
    });

    it('should trim and normalize pet name and type', () => {
      const card = createCardFromGeneration(
        'user_123',
        '  Buddy  ',
        '  GERMAN SHEPHERD  ',
        'rare',
        mockCardStats,
        mockCardImage,
        mockCardMetadata
      );

      expect(card.petName).toBe('Buddy');
      expect(card.petType).toBe('german shepherd');
    });

    it('should calculate total power in stats', () => {
      const stats = {
        attack: 50,
        defense: 40,
        speed: 60,
        health: 30,
        totalPower: 0 // This should be recalculated
      };

      const card = createCardFromGeneration(
        'user_123',
        'Test',
        'cat',
        'common',
        stats,
        mockCardImage,
        mockCardMetadata
      );

      expect(card.stats.totalPower).toBe(180);
    });
  });

  describe('isCard type guard', () => {
    it('should return true for valid card', () => {
      expect(isCard(mockCard)).toBe(true);
    });

    it('should return false for invalid card', () => {
      expect(isCard({})).toBe(false);
      expect(isCard(null)).toBe(false);
      expect(isCard(undefined)).toBe(false);
      expect(isCard({ id: 'test' })).toBe(false); // Missing required fields
    });

    it('should return false for card missing required fields', () => {
      const invalidCard = { ...mockCard };
      delete (invalidCard as any).userId;
      expect(isCard(invalidCard)).toBe(false);
    });
  });
});

describe('User Model', () => {
  const mockUser: User = {
    id: 'user_123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/photo.jpg',
    username: 'testuser',
    bio: 'Pet lover and card collector',
    location: 'San Francisco, CA',
    isPremium: false,
    subscriptionTier: 'basic',
    stats: {
      totalCards: 25,
      cardsGenerated: 20,
      favoriteCards: 5,
      shareCount: 15,
      downloadCount: 8,
      rarityBreakdown: {
        common: 10,
        uncommon: 8,
        rare: 4,
        epic: 2,
        legendary: 1,
        secret_rare: 0
      },
      joinDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
      lastActive: Date.now()
    },
    preferences: {
      defaultAnimationEnabled: true,
      defaultStyle: 'realistic',
      notificationsEnabled: true,
      publicProfile: false,
      autoSaveCards: true
    },
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now()
  };

  describe('validateUser', () => {
    it('should validate a complete user successfully', () => {
      const errors = validateUser(mockUser);
      expect(errors).toHaveLength(0);
    });

    it('should require valid email', () => {
      const invalidUser = { ...mockUser, email: 'invalid-email' };
      const errors = validateUser(invalidUser);
      expect(errors).toContain('Valid email is required');
    });

    it('should validate username length', () => {
      const shortUsername = { ...mockUser, username: 'ab' };
      const longUsername = { ...mockUser, username: 'a'.repeat(35) };
      
      const shortErrors = validateUser(shortUsername);
      const longErrors = validateUser(longUsername);
      
      expect(shortErrors).toContain('Username must be between 3 and 30 characters');
      expect(longErrors).toContain('Username must be between 3 and 30 characters');
    });

    it('should validate bio length', () => {
      const invalidUser = { ...mockUser, bio: 'a'.repeat(600) };
      const errors = validateUser(invalidUser);
      expect(errors).toContain('Bio must be less than 500 characters');
    });

    it('should allow missing optional fields', () => {
      const minimalUser = {
        id: 'user_123',
        email: 'test@example.com',
        stats: mockUser.stats,
        preferences: mockUser.preferences,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isPremium: false
      };
      
      const errors = validateUser(minimalUser);
      expect(errors).toHaveLength(0);
    });
  });

  describe('createDefaultUser', () => {
    it('should create user with correct defaults', () => {
      const authUser = {
        uid: 'auth_123',
        email: 'new@example.com',
        displayName: 'New User',
        photoURL: 'https://example.com/new.jpg'
      };

      const user = createDefaultUser(authUser);

      expect(user.id).toBe('auth_123');
      expect(user.email).toBe('new@example.com');
      expect(user.displayName).toBe('New User');
      expect(user.photoURL).toBe('https://example.com/new.jpg');
      expect(user.isPremium).toBe(false);
      expect(user.stats.totalCards).toBe(0);
      expect(user.stats.cardsGenerated).toBe(0);
      expect(user.preferences.defaultAnimationEnabled).toBe(true);
      expect(user.preferences.defaultStyle).toBe('realistic');
      expect(user.preferences.publicProfile).toBe(false);
    });

    it('should handle missing optional auth fields', () => {
      const authUser = {
        uid: 'auth_456',
        email: 'minimal@example.com'
      };

      const user = createDefaultUser(authUser);

      expect(user.id).toBe('auth_456');
      expect(user.email).toBe('minimal@example.com');
      expect(user.displayName).toBeUndefined();
      expect(user.photoURL).toBeUndefined();
      expect(user.stats).toBeDefined();
      expect(user.preferences).toBeDefined();
    });

    it('should initialize rarity breakdown correctly', () => {
      const authUser = {
        uid: 'auth_789',
        email: 'rarity@example.com'
      };

      const user = createDefaultUser(authUser);
      const rarities: RarityLevel[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'secret_rare'];

      rarities.forEach(rarity => {
        expect(user.stats.rarityBreakdown[rarity]).toBe(0);
      });
    });
  });

  describe('isUser type guard', () => {
    it('should return true for valid user', () => {
      expect(isUser(mockUser)).toBe(true);
    });

    it('should return false for invalid user', () => {
      expect(isUser({})).toBe(false);
      expect(isUser(null)).toBe(false);
      expect(isUser(undefined)).toBe(false);
      expect(isUser({ id: 'test' })).toBe(false); // Missing required fields
    });

    it('should return false for user missing required fields', () => {
      const invalidUser = { ...mockUser };
      delete (invalidUser as any).stats;
      expect(isUser(invalidUser)).toBe(false);
    });
  });
});

describe('Model Integration', () => {
  it('should work together in a typical workflow', () => {
    // Create a user
    const authUser = {
      uid: 'workflow_user',
      email: 'workflow@example.com',
      displayName: 'Workflow User'
    };
    const user = createDefaultUser(authUser);
    expect(isUser(user)).toBe(true);

    // Create a card for the user
    const stats = {
      attack: 85,
      defense: 70,
      speed: 90,
      health: 75,
      totalPower: 0
    };

    const image = {
      originalUrl: 'https://example.com/original.jpg',
      processedUrl: 'https://example.com/processed.jpg',
      width: 512,
      height: 512,
      format: 'jpeg'
    };

    const metadata = {
      generationTime: Date.now(),
      totalFileSize: 500000,
      version: '1.0.0'
    };

    const card = createCardFromGeneration(
      user.id,
      'Workflow Pet',
      'cat',
      'legendary',
      stats,
      image,
      metadata
    );

    expect(isCard({ ...card, id: 'generated_id' })).toBe(true);
    expect(card.userId).toBe(user.id);
    expect(card.stats.totalPower).toBe(320);
    expect(validateCard(card)).toHaveLength(0);
  });
});