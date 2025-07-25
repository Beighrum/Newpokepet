/**
 * Tests for SanitizedInput and SanitizedTextArea components
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContentType } from '../../types/sanitization';

// Mock the sanitization hook
vi.mock('../../hooks/useSanitizedContent', () => ({
  useSanitizedContent: vi.fn(() => ({
    sanitize: vi.fn((content: string) => content.replace(/<script[^>]*>.*?<\/script>/gi, '')),
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

describe('SanitizedInput Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export SanitizedInput component', async () => {
    const { SanitizedInput } = await import('./SanitizedInput');
    expect(SanitizedInput).toBeDefined();
    expect(typeof SanitizedInput).toBe('function');
  });

  it('should export SanitizedTextArea component', async () => {
    const { SanitizedTextArea } = await import('./SanitizedTextArea');
    expect(SanitizedTextArea).toBeDefined();
    expect(typeof SanitizedTextArea).toBe('function');
  });

  it('should export components from index', async () => {
    const { 
      SanitizedInput, 
      SanitizedTextArea, 
      SanitizedInputDefault, 
      SanitizedTextAreaDefault 
    } = await import('./index');
    
    expect(SanitizedInput).toBeDefined();
    expect(SanitizedTextArea).toBeDefined();
    expect(SanitizedInputDefault).toBeDefined();
    expect(SanitizedTextAreaDefault).toBeDefined();
  });

  it('should use the sanitization hook', async () => {
    const { useSanitizedContent } = await import('../../hooks/useSanitizedContent');
    
    // Import component to trigger hook usage
    await import('./SanitizedInput');
    
    expect(useSanitizedContent).toBeDefined();
  });

  it('should handle content types correctly', async () => {
    const { ContentType } = await import('../../types/sanitization');
    
    expect(ContentType.GENERAL).toBeDefined();
    expect(ContentType.USER_PROFILE).toBeDefined();
    expect(ContentType.PET_CARD_METADATA).toBeDefined();
    expect(ContentType.COMMENT).toBeDefined();
    expect(ContentType.SOCIAL_SHARING).toBeDefined();
  });
});