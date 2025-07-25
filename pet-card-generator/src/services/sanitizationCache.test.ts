/**
 * Tests for sanitization caching service
 */

import { sanitizationCache } from './sanitizationCache';
import { ContentType, SanitizedResult } from '../types/sanitization';

import { vi } from 'vitest';

// Mock performance.now for consistent testing
const mockPerformanceNow = vi.fn();
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true
});

describe('SanitizationCache', () => {
  beforeEach(() => {
    sanitizationCache.clear();
    // Reset metrics manually since clear() doesn't reset them
    (sanitizationCache as any).metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0,
      averageProcessingTime: 0,
      cacheSize: 0,
      hitRate: 0,
      memoryUsage: 0
    };
    mockPerformanceNow.mockReturnValue(1000);
    vi.clearAllMocks();
  });

  afterEach(() => {
    sanitizationCache.destroy();
  });

  describe('Basic caching functionality', () => {
    it('should cache and retrieve sanitization results', () => {
      const content = '<p>Hello world</p>';
      const result: SanitizedResult = {
        sanitizedContent: '<p>Hello world</p>',
        originalContent: content,
        removedElements: [],
        securityViolations: [],
        processingTime: 10,
        isValid: true
      };

      // Should return null for cache miss
      expect(sanitizationCache.get(content)).toBeNull();

      // Cache the result
      sanitizationCache.set(content, result);

      // Should return cached result
      const cachedResult = sanitizationCache.get(content);
      expect(cachedResult).toEqual(result);
    });

    it('should generate different cache keys for different content types', () => {
      const content = '<p>Hello world</p>';
      const result: SanitizedResult = {
        sanitizedContent: '<p>Hello world</p>',
        originalContent: content,
        removedElements: [],
        securityViolations: [],
        processingTime: 10,
        isValid: true
      };

      // Cache for different content types
      sanitizationCache.set(content, result, undefined, ContentType.USER_PROFILE);
      sanitizationCache.set(content, result, undefined, ContentType.PET_CARD_METADATA);

      // Should be able to retrieve both
      expect(sanitizationCache.get(content, undefined, ContentType.USER_PROFILE)).toEqual(result);
      expect(sanitizationCache.get(content, undefined, ContentType.PET_CARD_METADATA)).toEqual(result);
    });

    it('should generate different cache keys for different options', () => {
      const content = '<p>Hello world</p>';
      const result: SanitizedResult = {
        sanitizedContent: '<p>Hello world</p>',
        originalContent: content,
        removedElements: [],
        securityViolations: [],
        processingTime: 10,
        isValid: true
      };

      const options1 = { allowedTags: ['p'] };
      const options2 = { allowedTags: ['div'] };

      // Cache with different options
      sanitizationCache.set(content, result, options1);
      sanitizationCache.set(content, result, options2);

      // Should be able to retrieve both
      expect(sanitizationCache.get(content, options1)).toEqual(result);
      expect(sanitizationCache.get(content, options2)).toEqual(result);
    });
  });

  describe('Cache expiration', () => {
    it('should expire entries after TTL', () => {
      vi.useFakeTimers();
      
      const cache = new (sanitizationCache.constructor as any)({ ttlMs: 1000 });
      const content = '<p>Hello world</p>';
      const result: SanitizedResult = {
        sanitizedContent: '<p>Hello world</p>',
        originalContent: content,
        removedElements: [],
        securityViolations: [],
        processingTime: 10,
        isValid: true
      };

      // Cache the result
      cache.set(content, result);
      expect(cache.get(content)).toEqual(result);

      // Advance time beyond TTL
      vi.advanceTimersByTime(2000);

      // Should return null after expiration
      expect(cache.get(content)).toBeNull();

      cache.destroy();
      vi.useRealTimers();
    });
  });

  describe('Cache size limits', () => {
    it('should evict least recently used entries when size limit is reached', () => {
      vi.useFakeTimers();
      const cache = new (sanitizationCache.constructor as any)({ maxSize: 2 });
      
      const result: SanitizedResult = {
        sanitizedContent: 'sanitized',
        originalContent: 'original',
        removedElements: [],
        securityViolations: [],
        processingTime: 10,
        isValid: true
      };

      // Fill cache to capacity
      cache.set('content1', result);
      vi.advanceTimersByTime(10);
      cache.set('content2', result);

      // Both should be cached
      expect(cache.get('content1')).toEqual(result);
      expect(cache.get('content2')).toEqual(result);

      // Access content1 to make it more recently used
      vi.advanceTimersByTime(10);
      cache.get('content1');

      // Add third item, should evict content2 (least recently used)
      vi.advanceTimersByTime(10);
      cache.set('content3', result);

      expect(cache.get('content1')).toEqual(result); // Still cached
      expect(cache.get('content2')).toBeNull(); // Evicted
      expect(cache.get('content3')).toEqual(result); // Newly cached

      cache.destroy();
      vi.useRealTimers();
    });
  });

  describe('Cache invalidation', () => {
    it('should clear entire cache', () => {
      const content1 = '<p>Hello</p>';
      const content2 = '<div>World</div>';
      const result: SanitizedResult = {
        sanitizedContent: 'sanitized',
        originalContent: 'original',
        removedElements: [],
        securityViolations: [],
        processingTime: 10,
        isValid: true
      };

      sanitizationCache.set(content1, result);
      sanitizationCache.set(content2, result);

      expect(sanitizationCache.get(content1)).toEqual(result);
      expect(sanitizationCache.get(content2)).toEqual(result);

      sanitizationCache.clear();

      expect(sanitizationCache.get(content1)).toBeNull();
      expect(sanitizationCache.get(content2)).toBeNull();
    });

    it('should invalidate cache by content type', () => {
      const content = '<p>Hello world</p>';
      const result: SanitizedResult = {
        sanitizedContent: '<p>Hello world</p>',
        originalContent: content,
        removedElements: [],
        securityViolations: [],
        processingTime: 10,
        isValid: true
      };

      // Cache for different content types
      sanitizationCache.set(content, result, undefined, ContentType.USER_PROFILE);
      sanitizationCache.set(content, result, undefined, ContentType.PET_CARD_METADATA);

      // Invalidate only user profile content
      sanitizationCache.invalidateByContentType(ContentType.USER_PROFILE);

      expect(sanitizationCache.get(content, undefined, ContentType.USER_PROFILE)).toBeNull();
      expect(sanitizationCache.get(content, undefined, ContentType.PET_CARD_METADATA)).toEqual(result);
    });

    it('should invalidate cache on configuration change', () => {
      const content = '<p>Hello world</p>';
      const result: SanitizedResult = {
        sanitizedContent: '<p>Hello world</p>',
        originalContent: content,
        removedElements: [],
        securityViolations: [],
        processingTime: 10,
        isValid: true
      };

      sanitizationCache.set(content, result);
      expect(sanitizationCache.get(content)).toEqual(result);

      sanitizationCache.invalidateOnConfigChange();
      expect(sanitizationCache.get(content)).toBeNull();
    });
  });

  describe('Cache metrics', () => {
    it('should track cache hits and misses', () => {
      const content = '<p>Hello world</p>';
      const result: SanitizedResult = {
        sanitizedContent: '<p>Hello world</p>',
        originalContent: content,
        removedElements: [],
        securityViolations: [],
        processingTime: 10,
        isValid: true
      };

      // Initial metrics
      let metrics = sanitizationCache.getMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
      expect(metrics.totalRequests).toBe(0);

      // Cache miss
      sanitizationCache.get(content);
      metrics = sanitizationCache.getMetrics();
      expect(metrics.misses).toBe(1);
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.hitRate).toBe(0);

      // Cache set and hit
      sanitizationCache.set(content, result);
      sanitizationCache.get(content);
      metrics = sanitizationCache.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(1);
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.hitRate).toBe(0.5);
    });

    it('should track cache size and memory usage', () => {
      const result: SanitizedResult = {
        sanitizedContent: 'sanitized',
        originalContent: 'original',
        removedElements: [],
        securityViolations: [],
        processingTime: 10,
        isValid: true
      };

      let metrics = sanitizationCache.getMetrics();
      expect(metrics.cacheSize).toBe(0);
      expect(metrics.memoryUsage).toBe(0);

      sanitizationCache.set('content1', result);
      metrics = sanitizationCache.getMetrics();
      expect(metrics.cacheSize).toBe(1);
      expect(metrics.memoryUsage).toBeGreaterThan(0);

      sanitizationCache.set('content2', result);
      metrics = sanitizationCache.getMetrics();
      expect(metrics.cacheSize).toBe(2);
    });
  });

  describe('Cache statistics', () => {
    it('should provide comprehensive cache statistics', () => {
      const result: SanitizedResult = {
        sanitizedContent: 'sanitized',
        originalContent: 'original',
        removedElements: [],
        securityViolations: [],
        processingTime: 10,
        isValid: true
      };

      sanitizationCache.set('content1', result, undefined, ContentType.USER_PROFILE);
      sanitizationCache.set('content2', result, undefined, ContentType.PET_CARD_METADATA);
      sanitizationCache.set('content3', result, undefined, ContentType.USER_PROFILE);

      const stats = sanitizationCache.getStatistics();
      
      expect(stats.metrics).toBeDefined();
      expect(stats.config).toBeDefined();
      expect(stats.topContentTypes).toHaveLength(2);
      expect(stats.topContentTypes[0].type).toBe(ContentType.USER_PROFILE);
      expect(stats.topContentTypes[0].count).toBe(2);
      expect(stats.averageEntryAge).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cache configuration', () => {
    it('should update cache configuration', () => {
      const cache = new (sanitizationCache.constructor as any)({ maxSize: 10 });
      
      expect(cache.getStatistics().config.maxSize).toBe(10);
      
      cache.updateConfig({ maxSize: 5 });
      expect(cache.getStatistics().config.maxSize).toBe(5);
      
      cache.destroy();
    });
  });

  describe('Debug information', () => {
    it('should provide debug information', () => {
      const result: SanitizedResult = {
        sanitizedContent: 'sanitized',
        originalContent: 'original content',
        removedElements: [],
        securityViolations: [
          {
            type: 'script_tag',
            originalContent: '<script>alert("xss")</script>',
            sanitizedContent: '',
            timestamp: new Date(),
            severity: 'critical',
            description: 'Removed script tag'
          }
        ],
        processingTime: 10,
        isValid: false
      };

      sanitizationCache.set('test content', result, undefined, ContentType.USER_PROFILE);
      
      const debugInfo = sanitizationCache.getDebugInfo();
      expect(debugInfo).toHaveLength(1);
      expect(debugInfo[0].contentType).toBe(ContentType.USER_PROFILE);
      expect(debugInfo[0].contentLength).toBe('original content'.length);
      expect(debugInfo[0].violationsCount).toBe(1);
      expect(debugInfo[0].accessCount).toBe(1);
    });
  });
});
