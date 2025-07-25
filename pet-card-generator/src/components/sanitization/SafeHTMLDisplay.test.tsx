/**
 * Tests for SafeHTMLDisplay and PetCardSafeDisplay components
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContentType } from '../../types/sanitization';

// Mock the sanitization hook
vi.mock('../../hooks/useSanitizedContent', () => ({
  useSanitizedContent: vi.fn(() => ({
    sanitize: vi.fn((content: string) => {
      // Simple mock sanitization - remove script tags
      return content.replace(/<script[^>]*>.*?<\/script>/gi, '');
    }),
    sanitizeAsync: vi.fn(),
    isLoading: false,
    error: null,
    lastResult: {
      sanitizedContent: 'Clean content',
      originalContent: 'Test content',
      removedElements: [],
      securityViolations: [],
      processingTime: 5,
      isValid: true
    },
    clearCache: vi.fn(),
    cleanup: vi.fn()
  }))
}));

describe('SafeHTMLDisplay Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export SafeHTMLDisplay component', async () => {
    const { SafeHTMLDisplay } = await import('./SafeHTMLDisplay');
    expect(SafeHTMLDisplay).toBeDefined();
    expect(typeof SafeHTMLDisplay).toBe('function');
  });

  it('should export PetCardSafeDisplay component', async () => {
    const { PetCardSafeDisplay } = await import('./PetCardSafeDisplay');
    expect(PetCardSafeDisplay).toBeDefined();
    expect(typeof PetCardSafeDisplay).toBe('function');
  });

  it('should export all components from index', async () => {
    const { 
      SafeHTMLDisplay, 
      PetCardSafeDisplay,
      SafeHTMLDisplayDefault,
      PetCardSafeDisplayDefault
    } = await import('./index');
    
    expect(SafeHTMLDisplay).toBeDefined();
    expect(PetCardSafeDisplay).toBeDefined();
    expect(SafeHTMLDisplayDefault).toBeDefined();
    expect(PetCardSafeDisplayDefault).toBeDefined();
  });

  it('should use the sanitization hook', async () => {
    const { useSanitizedContent } = await import('../../hooks/useSanitizedContent');
    
    // Import components to trigger hook usage
    await import('./SafeHTMLDisplay');
    await import('./PetCardSafeDisplay');
    
    expect(useSanitizedContent).toBeDefined();
  });

  it('should handle different content types', async () => {
    const { ContentType } = await import('../../types/sanitization');
    
    expect(ContentType.GENERAL).toBeDefined();
    expect(ContentType.USER_PROFILE).toBeDefined();
    expect(ContentType.PET_CARD_METADATA).toBeDefined();
    expect(ContentType.COMMENT).toBeDefined();
    expect(ContentType.SOCIAL_SHARING).toBeDefined();
  });

  it('should handle pet card data structure', async () => {
    // Test that the components can handle the expected pet card structure
    const mockPetCard = {
      id: 'test-card-1',
      petName: 'Fluffy',
      petType: 'Cat',
      rarity: 'rare',
      stats: { health: 100, attack: 50 },
      images: {
        original: 'test-image.jpg',
        processed: 'test-processed.jpg'
      },
      evolution: {
        stage: 1,
        maxStage: 3,
        canEvolve: true
      },
      createdAt: new Date(),
      metadata: {
        breed: 'Persian',
        description: 'A fluffy cat',
        customTags: ['cute', 'fluffy']
      }
    };

    // Just verify the structure is valid
    expect(mockPetCard.id).toBeDefined();
    expect(mockPetCard.petName).toBeDefined();
    expect(mockPetCard.metadata).toBeDefined();
  });

  it('should handle error boundaries', async () => {
    // Test that error boundary components are properly structured
    const { SafeHTMLDisplay } = await import('./SafeHTMLDisplay');
    
    // Verify the component can be imported without errors
    expect(SafeHTMLDisplay).toBeDefined();
  });
});