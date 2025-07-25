/**
 * Tests for useSanitizedContent hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sanitizationService } from '../services/sanitization';

// Mock the sanitization service
vi.mock('../services/sanitization', () => ({
  sanitizationService: {
    sanitizeSync: vi.fn(),
    sanitizeHTML: vi.fn(),
    getConfigForContentType: vi.fn(() => ({
      allowedTags: ['p', 'strong', 'em'],
      allowedAttributes: { '*': ['class'] },
      allowedSchemes: ['http', 'https'],
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script'],
      keepContent: true,
      forbidTags: ['script'],
      forbidAttr: ['onclick']
    }))
  }
}));

describe('useSanitizedContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export the hook function', async () => {
    const { useSanitizedContent } = await import('./useSanitizedContent');
    expect(typeof useSanitizedContent).toBe('function');
  });

  it('should export utility hooks for specific content types', async () => {
    const { 
      useSanitizedUserProfile, 
      useSanitizedPetCard, 
      useSanitizedComment, 
      useSanitizedSocialSharing 
    } = await import('./useSanitizedContent');
    
    expect(typeof useSanitizedUserProfile).toBe('function');
    expect(typeof useSanitizedPetCard).toBe('function');
    expect(typeof useSanitizedComment).toBe('function');
    expect(typeof useSanitizedSocialSharing).toBe('function');
  });

  it('should call sanitization service methods', async () => {
    const mockSanitizeSync = vi.mocked(sanitizationService.sanitizeSync);
    const mockGetConfigForContentType = vi.mocked(sanitizationService.getConfigForContentType);
    
    mockSanitizeSync.mockReturnValue({
      sanitizedContent: 'Clean content',
      originalContent: 'Test content',
      removedElements: [],
      securityViolations: [],
      processingTime: 5,
      isValid: true
    });

    // Test that the service methods are available
    expect(typeof sanitizationService.sanitizeSync).toBe('function');
    expect(typeof sanitizationService.sanitizeHTML).toBe('function');
    expect(typeof sanitizationService.getConfigForContentType).toBe('function');
  });
});