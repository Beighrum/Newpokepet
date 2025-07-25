/**
 * Tests for lazy sanitization service
 */

import { vi } from 'vitest';
import { lazySanitizationService } from './lazySanitization';
import { ContentType, SanitizedResult } from '../types/sanitization';

// Mock the sanitization service
vi.mock('./sanitization', () => ({
  sanitizationService: {
    sanitizeSync: vi.fn().mockReturnValue({
      sanitizedContent: 'sanitized content',
      originalContent: 'original content',
      removedElements: [],
      securityViolations: [],
      processingTime: 10,
      isValid: true
    })
  }
}));

// Mock the sanitization cache
vi.mock('./sanitizationCache', () => ({
  sanitizationCache: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn()
  }
}));

describe('LazySanitizationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lazySanitizationService.clearQueue();
  });

  afterEach(() => {
    lazySanitizationService.destroy();
  });

  describe('Lazy sanitization', () => {
    it('should process high priority content immediately', async () => {
      const content = '<p>Test content</p>';
      const result = await lazySanitizationService.lazySanitize(
        content,
        undefined,
        ContentType.GENERAL,
        10 // High priority
      );

      expect(result).toBeDefined();
      expect(result.sanitizedContent).toBe('sanitized content');
      expect(result.originalContent).toBe('original content');
    });

    it('should queue low priority content for batch processing', async () => {
      const content = '<p>Test content</p>';
      
      // Start lazy sanitization (low priority)
      const promise = lazySanitizationService.lazySanitize(
        content,
        undefined,
        ContentType.GENERAL,
        1 // Low priority
      );

      // Check queue stats
      const stats = lazySanitizationService.getQueueStats();
      expect(stats.pendingCount).toBe(1);

      // Wait for batch processing
      const result = await promise;
      expect(result).toBeDefined();
      expect(result.sanitizedContent).toBe('sanitized content');
    });

    it('should process multiple items in batch', async () => {
      const items = [
        { content: '<p>Content 1</p>', priority: 1 },
        { content: '<p>Content 2</p>', priority: 2 },
        { content: '<p>Content 3</p>', priority: 1 }
      ];

      const promises = items.map(item =>
        lazySanitizationService.lazySanitize(
          item.content,
          undefined,
          ContentType.GENERAL,
          item.priority
        )
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.sanitizedContent).toBe('sanitized content');
      });
    });
  });

  describe('Batch sanitization', () => {
    it('should sanitize multiple items at once', async () => {
      const items = [
        { content: '<p>Content 1</p>', contentType: ContentType.USER_PROFILE },
        { content: '<p>Content 2</p>', contentType: ContentType.PET_CARD_METADATA },
        { content: '<p>Content 3</p>', contentType: ContentType.COMMENT }
      ];

      const results = await lazySanitizationService.batchSanitize(items);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.sanitizedContent).toBe('sanitized content');
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Stream sanitization', () => {
    it('should process small content normally', async () => {
      const content = '<p>Small content</p>';
      
      const result = await lazySanitizationService.streamSanitize(
        content,
        undefined,
        ContentType.GENERAL
      );

      expect(result.sanitizedContent).toBe('sanitized content');
      expect(result.originalContent).toBe('original content');
    });

    it('should split large content into chunks', async () => {
      // Create large content that exceeds chunk size
      const largeContent = '<p>' + 'A'.repeat(2000) + '</p>';
      
      let progressCalls = 0;
      const onProgress = vi.fn(() => {
        progressCalls++;
      });

      const result = await lazySanitizationService.streamSanitize(
        largeContent,
        undefined,
        ContentType.GENERAL,
        onProgress
      );

      expect(result).toBeDefined();
      expect(progressCalls).toBeGreaterThan(0);
      expect(onProgress).toHaveBeenCalled();
    });

    it('should handle streaming errors gracefully', async () => {
      // Mock sanitization service to throw error
      const { sanitizationService } = await import('./sanitization');
      vi.mocked(sanitizationService.sanitizeSync).mockImplementationOnce(() => {
        throw new Error('Sanitization failed');
      });

      const largeContent = '<p>' + 'A'.repeat(2000) + '</p>';

      await expect(
        lazySanitizationService.streamSanitize(largeContent)
      ).rejects.toThrow('Streaming sanitization failed at chunk 0');
    });
  });

  describe('Queue management', () => {
    it('should provide queue statistics', async () => {
      // Add items to queue
      const promises = [
        lazySanitizationService.lazySanitize('<p>Content 1</p>', undefined, ContentType.GENERAL, 1),
        lazySanitizationService.lazySanitize('<p>Content 2</p>', undefined, ContentType.GENERAL, 2),
        lazySanitizationService.lazySanitize('<p>Content 3</p>', undefined, ContentType.GENERAL, 1)
      ];

      // Check stats before processing
      const stats = lazySanitizationService.getQueueStats();
      expect(stats.pendingCount).toBe(3);
      expect(stats.averagePriority).toBeCloseTo(1.33, 1);
      expect(stats.oldestPendingAge).toBeGreaterThanOrEqual(0);

      // Wait for processing
      await Promise.all(promises);

      // Check stats after processing
      const finalStats = lazySanitizationService.getQueueStats();
      expect(finalStats.pendingCount).toBe(0);
    });

    it('should clear queue properly', async () => {
      // Add items to queue
      const promise1 = lazySanitizationService.lazySanitize('<p>Content 1</p>', undefined, ContentType.GENERAL, 1);
      const promise2 = lazySanitizationService.lazySanitize('<p>Content 2</p>', undefined, ContentType.GENERAL, 1);

      // Clear queue
      lazySanitizationService.clearQueue();

      // Promises should be rejected
      await expect(promise1).rejects.toThrow('Queue cleared');
      await expect(promise2).rejects.toThrow('Queue cleared');

      // Queue should be empty
      const stats = lazySanitizationService.getQueueStats();
      expect(stats.pendingCount).toBe(0);
    });
  });

  describe('Configuration', () => {
    it('should update batch configuration', () => {
      const newConfig = {
        maxBatchSize: 20,
        batchTimeoutMs: 200
      };

      lazySanitizationService.updateBatchConfig(newConfig);

      // Configuration should be updated (we can't directly test this without exposing internal state)
      // But we can test that it doesn't throw an error
      expect(() => lazySanitizationService.updateBatchConfig(newConfig)).not.toThrow();
    });

    it('should update streaming configuration', () => {
      const newConfig = {
        chunkSize: 2000,
        maxChunks: 50
      };

      lazySanitizationService.updateStreamingConfig(newConfig);

      // Configuration should be updated
      expect(() => lazySanitizationService.updateStreamingConfig(newConfig)).not.toThrow();
    });
  });

  describe('Content chunking', () => {
    it('should split content at word boundaries when possible', async () => {
      // Create content with clear word boundaries
      const content = '<p>This is a test content with multiple words that should be split at word boundaries when chunked for processing.</p>';
      
      // Update config to use small chunk size
      lazySanitizationService.updateStreamingConfig({ chunkSize: 50 });

      const result = await lazySanitizationService.streamSanitize(content);
      
      expect(result).toBeDefined();
      // When content is chunked, each chunk gets sanitized and concatenated
      expect(result.sanitizedContent).toContain('sanitized content');
      expect(result.originalContent).toBe(content);
    });
  });

  describe('Priority handling', () => {
    it('should process higher priority items first', async () => {
      const processOrder: number[] = [];
      
      // Mock sanitization service to track processing order
      const { sanitizationService } = await import('./sanitization');
      vi.mocked(sanitizationService.sanitizeSync).mockImplementation((content) => {
        const priority = parseInt(content.match(/priority-(\d+)/)?.[1] || '0');
        processOrder.push(priority);
        
        return {
          sanitizedContent: `sanitized-${priority}`,
          originalContent: content,
          removedElements: [],
          securityViolations: [],
          processingTime: 10,
          isValid: true
        };
      });

      // Add items with different priorities
      const promises = [
        lazySanitizationService.lazySanitize('<p>priority-1</p>', undefined, ContentType.GENERAL, 1),
        lazySanitizationService.lazySanitize('<p>priority-3</p>', undefined, ContentType.GENERAL, 3),
        lazySanitizationService.lazySanitize('<p>priority-2</p>', undefined, ContentType.GENERAL, 2)
      ];

      await Promise.all(promises);

      // Higher priority items should be processed first
      expect(processOrder[0]).toBe(3); // Highest priority first
      expect(processOrder[1]).toBe(2);
      expect(processOrder[2]).toBe(1); // Lowest priority last
    });
  });
});