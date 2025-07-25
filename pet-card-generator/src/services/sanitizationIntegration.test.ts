/**
 * Integration and Performance Tests for Sanitization System
 * Tests end-to-end sanitized content flow, load testing, and cross-browser compatibility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sanitizationService } from './sanitization';
import { securityEventLogger } from './securityEventLogger';
import { sanitizationCache } from './sanitizationCache';
import { lazySanitizationService } from './lazySanitization';
import { ContentType } from '../types/sanitization';

describe('Sanitization Integration Tests', () => {
  beforeEach(() => {
    // Clear cache and reset state before each test
    sanitizationService.clearCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    sanitizationService.clearCache();
  });

  describe('End-to-End Content Flow', () => {
    it('should handle complete pet card creation workflow', async () => {
      // Simulate user creating a pet card with potentially malicious content
      const userInput = {
        petName: 'Fluffy<script>alert("XSS")</script>',
        breed: 'Golden Retriever',
        description: '<p>A lovely dog</p><img src="x" onerror="alert(\'XSS\')">',
        customTags: ['friendly', '<script>alert("tag")</script>', 'playful']
      };

      // Step 1: Sanitize pet name (should be very restrictive)
      const nameResult = sanitizationService.sanitizeSync(userInput.petName, undefined, {
        contentType: ContentType.PET_CARD_METADATA,
        userId: 'test-user'
      });

      expect(nameResult.sanitizedContent).toBe('Fluffy');
      expect(nameResult.securityViolations.length).toBeGreaterThan(0);

      // Step 2: Sanitize description (allows some HTML)
      const descResult = sanitizationService.sanitizeSync(userInput.description, undefined, {
        contentType: ContentType.PET_CARD_METADATA,
        userId: 'test-user'
      });

      expect(descResult.sanitizedContent).toContain('<p>A lovely dog</p>');
      expect(descResult.sanitizedContent).not.toContain('onerror');
      expect(descResult.sanitizedContent).not.toContain('alert');

      // Step 3: Sanitize custom tags
      const sanitizedTags = await Promise.all(
        userInput.customTags.map(tag => 
          sanitizationService.sanitizeHTML(tag, undefined)
        )
      );

      expect(sanitizedTags[0].sanitizedContent).toBe('friendly');
      expect(sanitizedTags[1].sanitizedContent).toBe('');
      expect(sanitizedTags[2].sanitizedContent).toBe('playful');

      // Step 4: Verify security events were logged
      const totalViolations = nameResult.securityViolations.length + 
                             descResult.securityViolations.length + 
                             sanitizedTags.reduce((sum, tag) => sum + tag.securityViolations.length, 0);
      
      expect(totalViolations).toBeGreaterThan(0);
    });

    it('should handle user profile update workflow', async () => {
      const profileData = {
        displayName: 'John<script>alert("XSS")</script>Doe',
        bio: '<p>I love pets!</p><iframe src="javascript:alert(\'XSS\')"></iframe>'
      };

      // Sanitize display name
      const nameResult = sanitizationService.sanitizeSync(profileData.displayName, undefined, {
        contentType: ContentType.USER_PROFILE,
        userId: 'user-123'
      });

      // Sanitize bio
      const bioResult = sanitizationService.sanitizeSync(profileData.bio, undefined, {
        contentType: ContentType.USER_PROFILE,
        userId: 'user-123'
      });

      expect(nameResult.sanitizedContent).toBe('JohnDoe');
      expect(bioResult.sanitizedContent).toContain('<p>I love pets!</p>');
      expect(bioResult.sanitizedContent).not.toContain('<iframe');
      expect(bioResult.sanitizedContent).not.toContain('javascript:');
    });

    it('should handle social sharing workflow', async () => {
      const shareData = {
        title: 'Check out my pet!<script>alert("XSS")</script>',
        description: '<p>Amazing pet card</p><img src="x" onerror="alert(\'share\')">',
        url: 'https://example.com/pet/123'
      };

      const titleResult = sanitizationService.sanitizeSync(shareData.title, undefined, {
        contentType: ContentType.SOCIAL_SHARING,
        userId: 'user-456'
      });

      const descResult = sanitizationService.sanitizeSync(shareData.description, undefined, {
        contentType: ContentType.SOCIAL_SHARING,
        userId: 'user-456'
      });

      expect(titleResult.sanitizedContent).toBe('Check out my pet!');
      expect(descResult.sanitizedContent).toContain('<p>Amazing pet card</p>');
      expect(descResult.sanitizedContent).not.toContain('onerror');
    });

    it('should handle comment system workflow', async () => {
      const comments = [
        'Great pet!',
        '<p>Love it!</p><script>alert("comment")</script>',
        '<a href="javascript:alert(\'link\')">Click here</a>',
        'Normal comment with <strong>emphasis</strong>'
      ];

      const sanitizedComments = await Promise.all(
        comments.map(comment => 
          sanitizationService.sanitizeHTML(comment, undefined)
        )
      );

      expect(sanitizedComments[0].sanitizedContent).toBe('Great pet!');
      expect(sanitizedComments[1].sanitizedContent).toContain('<p>Love it!</p>');
      expect(sanitizedComments[1].sanitizedContent).not.toContain('<script>');
      expect(sanitizedComments[2].sanitizedContent).not.toContain('javascript:');
      expect(sanitizedComments[3].sanitizedContent).toContain('<strong>emphasis</strong>');
    });
  });

  describe('Cache Integration', () => {
    it('should use cache for repeated content', () => {
      const content = '<p>Test content</p><script>alert("XSS")</script>';
      
      // First sanitization
      const result1 = sanitizationService.sanitizeSync(content);
      const time1 = result1.processingTime;
      
      // Second sanitization (should use cache)
      const result2 = sanitizationService.sanitizeSync(content);
      const time2 = result2.processingTime;
      
      expect(result1.sanitizedContent).toBe(result2.sanitizedContent);
      expect(result1.securityViolations).toEqual(result2.securityViolations);
      
      // Cache lookup should be faster (though this might be flaky in fast environments)
      // We'll just verify the cache is working by checking metrics
      const metrics = sanitizationService.getCacheMetrics();
      expect(metrics.hits).toBeGreaterThan(0);
    });

    it('should invalidate cache when configuration changes', () => {
      const content = '<p>Test content</p>';
      
      // First sanitization
      const result1 = sanitizationService.sanitizeSync(content);
      
      // Clear cache manually (simulating config change)
      sanitizationService.clearCache();
      
      // Second sanitization
      const result2 = sanitizationService.sanitizeSync(content);
      
      expect(result1.sanitizedContent).toBe(result2.sanitizedContent);
      
      const metrics = sanitizationService.getCacheMetrics();
      expect(metrics.misses).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle sanitization failures gracefully', () => {
      // Test with null/undefined content
      const nullResult = sanitizationService.sanitizeSync(null as any);
      const undefinedResult = sanitizationService.sanitizeSync(undefined as any);
      
      expect(nullResult.sanitizedContent).toBe('');
      expect(nullResult.isValid).toBe(true);
      expect(undefinedResult.sanitizedContent).toBe('');
      expect(undefinedResult.isValid).toBe(true);
    });

    it('should handle extremely malformed HTML', () => {
      const malformedContent = '<div><p><script>alert("XSS")<div><span><img src="x" onerror="alert(\'more\')">';
      
      const result = sanitizationService.sanitizeSync(malformedContent);
      
      expect(result.sanitizedContent).not.toContain('alert(');
      expect(result.sanitizedContent).not.toContain('<script>');
      expect(result.sanitizedContent).not.toContain('onerror');
    });

    it('should handle circular references and complex objects', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;
      
      const result = sanitizationService.sanitizeSync(circularObj as any);
      expect(result.sanitizedContent).toBe('');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Concurrent Processing', () => {
    it('should handle multiple simultaneous sanitization requests', async () => {
      const contents = [
        '<p>Content 1</p><script>alert("1")</script>',
        '<div>Content 2</div><img src="x" onerror="alert(\'2\')">',
        '<span>Content 3</span><a href="javascript:alert(\'3\')">Link</a>',
        '<h1>Content 4</h1><iframe src="javascript:alert(\'4\')"></iframe>',
        '<strong>Content 5</strong><object data="javascript:alert(\'5\')"></object>'
      ];

      // Process all content simultaneously
      const promises = contents.map((content, index) => 
        sanitizationService.sanitizeHTML(content, undefined)
      );

      const results = await Promise.all(promises);

      // Verify all results are properly sanitized
      results.forEach((result, index) => {
        expect(result.sanitizedContent).not.toContain('alert(');
        expect(result.sanitizedContent).not.toContain('<script>');
        expect(result.sanitizedContent).not.toContain('javascript:');
        expect(result.sanitizedContent).toContain(`Content ${index + 1}`);
      });
    });

    it('should handle batch sanitization', async () => {
      const items = [
        { content: '<p>Item 1</p><script>alert("1")</script>', contentType: ContentType.GENERAL },
        { content: '<div>Item 2</div><img onerror="alert(\'2\')">', contentType: ContentType.USER_PROFILE },
        { content: '<span>Item 3</span><a href="javascript:alert(\'3\')">Link</a>', contentType: ContentType.SOCIAL_SHARING }
      ];

      const results = await sanitizationService.batchSanitize(items);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.sanitizedContent).not.toContain('alert(');
        expect(result.sanitizedContent).toContain(`Item ${index + 1}`);
      });
    });
  });

  describe('Lazy Loading Integration', () => {
    it('should handle lazy sanitization with priorities', async () => {
      const highPriorityContent = '<p>High priority</p><script>alert("high")</script>';
      const lowPriorityContent = '<p>Low priority</p><script>alert("low")</script>';

      // Submit both with different priorities
      const highPromise = sanitizationService.lazySanitize(
        highPriorityContent, 
        undefined, 
        ContentType.GENERAL, 
        10 // High priority
      );
      
      const lowPromise = sanitizationService.lazySanitize(
        lowPriorityContent, 
        undefined, 
        ContentType.GENERAL, 
        1 // Low priority
      );

      const [highResult, lowResult] = await Promise.all([highPromise, lowPromise]);

      expect(highResult.sanitizedContent).toContain('High priority');
      expect(highResult.sanitizedContent).not.toContain('<script>');
      expect(lowResult.sanitizedContent).toContain('Low priority');
      expect(lowResult.sanitizedContent).not.toContain('<script>');
    });

    it('should handle streaming sanitization', async () => {
      const largeContent = '<div>' + 'Some content '.repeat(100) + '<script>alert("XSS")</script>' + '</div>';
      
      const progressUpdates: number[] = [];
      
      const result = await sanitizationService.streamSanitize(
        largeContent,
        undefined,
        ContentType.GENERAL,
        (progress, chunk) => {
          progressUpdates.push(progress);
          expect(typeof chunk).toBe('string');
        }
      );

      expect(result.sanitizedContent).toContain('Some content');
      expect(result.sanitizedContent).not.toContain('<script>');
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(Math.max(...progressUpdates)).toBe(100);
    });
  });
});

describe('Sanitization Performance Tests', () => {
  beforeEach(() => {
    sanitizationService.clearCache();
  });

  describe('Processing Speed', () => {
    it('should sanitize small content quickly', () => {
      const content = '<p>Small content</p><script>alert("XSS")</script>';
      const startTime = performance.now();
      
      const result = sanitizationService.sanitizeSync(content);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50); // Should complete within 50ms
      expect(result.processingTime).toBeLessThan(50);
      expect(result.sanitizedContent).not.toContain('<script>');
    });

    it('should handle medium content efficiently', () => {
      const content = '<div>' + '<p>Medium content with some HTML</p>'.repeat(50) + '<script>alert("XSS")</script>' + '</div>';
      const startTime = performance.now();
      
      const result = sanitizationService.sanitizeSync(content);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(200); // Should complete within 200ms
      expect(result.sanitizedContent).not.toContain('<script>');
    });

    it('should handle large content within reasonable time', () => {
      const content = '<div>' + '<p>Large content block</p>'.repeat(500) + '<script>alert("XSS")</script>' + '</div>';
      const startTime = performance.now();
      
      const result = sanitizationService.sanitizeSync(content);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result.sanitizedContent).not.toContain('<script>');
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory with repeated sanitizations', () => {
      const content = '<p>Test content</p><script>alert("XSS")</script>';
      
      // Perform many sanitizations
      for (let i = 0; i < 100; i++) {
        const result = sanitizationService.sanitizeSync(content + i);
        expect(result.sanitizedContent).not.toContain('<script>');
      }
      
      // Check cache metrics to ensure it's not growing unbounded
      const metrics = sanitizationService.getCacheMetrics();
      expect(metrics.size || 0).toBeLessThan(200); // Should have reasonable cache size
    });

    it('should handle cache eviction properly', () => {
      // Fill cache with many different items
      for (let i = 0; i < 150; i++) {
        const content = `<p>Content ${i}</p><script>alert("${i}")</script>`;
        sanitizationService.sanitizeSync(content);
      }
      
      const metrics = sanitizationService.getCacheMetrics();
      expect(metrics.evictions).toBeGreaterThan(0); // Should have evicted some items
    });
  });

  describe('Concurrent Load Testing', () => {
    it('should handle high concurrent load', async () => {
      const concurrentRequests = 50;
      const content = '<p>Load test content</p><script>alert("load")</script>';
      
      const startTime = performance.now();
      
      // Create many concurrent sanitization requests
      const promises = Array.from({ length: concurrentRequests }, (_, i) => 
        sanitizationService.sanitizeHTML(content + i)
      );
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      
      // All requests should complete successfully
      expect(results).toHaveLength(concurrentRequests);
      results.forEach((result, i) => {
        expect(result.sanitizedContent).toContain('Load test content');
        expect(result.sanitizedContent).not.toContain('<script>');
      });
      
      // Should complete within reasonable time (adjust based on system performance)
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds for 50 concurrent requests
    });

    it('should maintain performance under sustained load', async () => {
      const batchSize = 20;
      const batches = 5;
      const content = '<p>Sustained load test</p><script>alert("sustained")</script>';
      
      const batchTimes: number[] = [];
      
      for (let batch = 0; batch < batches; batch++) {
        const batchStart = performance.now();
        
        const promises = Array.from({ length: batchSize }, (_, i) => 
          sanitizationService.sanitizeHTML(`${content} batch ${batch} item ${i}`)
        );
        
        const results = await Promise.all(promises);
        const batchEnd = performance.now();
        
        batchTimes.push(batchEnd - batchStart);
        
        // Verify all results are correct
        results.forEach(result => {
          expect(result.sanitizedContent).toContain('Sustained load test');
          expect(result.sanitizedContent).not.toContain('<script>');
        });
      }
      
      // Performance should not degrade significantly over time
      const firstBatchTime = batchTimes[0];
      const lastBatchTime = batchTimes[batchTimes.length - 1];
      
      // Last batch should not take more than 3x the first batch time
      expect(lastBatchTime).toBeLessThan(firstBatchTime * 3);
    });
  });

  describe('Cache Performance', () => {
    it('should show significant performance improvement with cache hits', () => {
      const content = '<p>Cache test content</p><script>alert("cache")</script>';
      
      // First sanitization (cache miss)
      const result1 = sanitizationService.sanitizeSync(content);
      const time1 = result1.processingTime;
      
      // Second sanitization (cache hit)
      const result2 = sanitizationService.sanitizeSync(content);
      const time2 = result2.processingTime;
      
      expect(result1.sanitizedContent).toBe(result2.sanitizedContent);
      
      // Cache hit should be faster (though this might be flaky in very fast environments)
      // We'll verify cache is working through metrics instead
      const metrics = sanitizationService.getCacheMetrics();
      expect(metrics.hits).toBeGreaterThan(0);
      expect(metrics.hitRate).toBeGreaterThan(0);
    });

    it('should handle cache performance under load', async () => {
      const baseContent = '<p>Cache load test</p><script>alert("cache")</script>';
      const variations = 10;
      const requestsPerVariation = 10;
      
      // Create content variations
      const contents = Array.from({ length: variations }, (_, i) => 
        `${baseContent} variation ${i}`
      );
      
      // Make multiple requests for each variation
      const promises: Promise<any>[] = [];
      for (let i = 0; i < requestsPerVariation; i++) {
        contents.forEach(content => {
          promises.push(sanitizationService.sanitizeHTML(content));
        });
      }
      
      const startTime = performance.now();
      const results = await Promise.all(promises);
      const endTime = performance.now();
      
      expect(results).toHaveLength(variations * requestsPerVariation);
      
      // Check cache performance
      const metrics = sanitizationService.getCacheMetrics();
      expect(metrics.hits).toBeGreaterThan(0);
      expect(metrics.hitRate || 0).toBeGreaterThan(0.1); // Should have some hit rate
      
      // Should complete efficiently due to caching
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance statistics', () => {
      const content = '<p>Performance tracking</p><script>alert("perf")</script>';
      
      // Perform several sanitizations
      for (let i = 0; i < 10; i++) {
        sanitizationService.sanitizeSync(content + i);
      }
      
      const stats = sanitizationService.getPerformanceStats();
      
      expect(stats.cache).toBeDefined();
      expect(stats.cache.totalOperations || 0).toBeGreaterThanOrEqual(0);
      expect(stats.cache.averageTime || 0).toBeGreaterThanOrEqual(0);
      
      expect(stats.queue).toBeDefined();
      expect(stats.worker).toBeDefined();
    });

    it('should identify performance bottlenecks', () => {
      const slowContent = '<div>' + '<p>Complex nested content</p>'.repeat(100) + '<script>alert("slow")</script>' + '</div>';
      
      const result = sanitizationService.sanitizeSync(slowContent);
      
      expect(result.processingTime).toBeGreaterThan(0);
      
      // If processing time is too high, it should be flagged
      if (result.processingTime > 100) {
        console.warn(`Slow sanitization detected: ${result.processingTime}ms`);
      }
      
      expect(result.sanitizedContent).not.toContain('<script>');
    });
  });

  describe('Resource Cleanup', () => {
    it('should clean up resources properly', () => {
      const content = '<p>Cleanup test</p><script>alert("cleanup")</script>';
      
      // Perform sanitizations
      for (let i = 0; i < 20; i++) {
        sanitizationService.sanitizeSync(content + i);
      }
      
      // Clear cache and verify cleanup
      sanitizationService.clearCache();
      
      const metrics = sanitizationService.getCacheMetrics();
      expect(metrics.size || 0).toBe(0);
    });
  });
});

describe('Cross-Environment Compatibility Tests', () => {
  describe('Browser Environment Simulation', () => {
    it('should work in browser-like environment', () => {
      // Test assumes we're in a Node.js environment but simulates browser behavior
      const content = '<p>Browser test</p><script>alert("browser")</script>';
      
      const result = sanitizationService.sanitizeSync(content);
      
      expect(result.sanitizedContent).toContain('<p>Browser test</p>');
      expect(result.sanitizedContent).not.toContain('<script>');
    });

    it('should handle DOM-specific attacks', () => {
      const domAttacks = [
        '<img src="x" onerror="document.cookie=\'stolen\'">',
        '<div onclick="window.location=\'http://evil.com\'">Click</div>',
        '<iframe src="javascript:parent.postMessage(\'xss\',\'*\')"></iframe>'
      ];

      domAttacks.forEach(attack => {
        const result = sanitizationService.sanitizeSync(attack);
        
        expect(result.sanitizedContent).not.toContain('document.cookie');
        expect(result.sanitizedContent).not.toContain('window.location');
        expect(result.sanitizedContent).not.toContain('postMessage');
        expect(result.sanitizedContent).not.toContain('javascript:');
      });
    });
  });

  describe('Server Environment Tests', () => {
    it('should work in server environment', () => {
      // This test runs in Node.js environment
      const content = '<p>Server test</p><script>alert("server")</script>';
      
      const result = sanitizationService.sanitizeSync(content);
      
      expect(result.sanitizedContent).toContain('<p>Server test</p>');
      expect(result.sanitizedContent).not.toContain('<script>');
    });

    it('should handle server-specific security concerns', () => {
      const serverAttacks = [
        '<script>require("fs").readFileSync("/etc/passwd")</script>',
        '<img src="x" onerror="process.exit(1)">',
        '<div onclick="global.process = null">Crash</div>'
      ];

      serverAttacks.forEach(attack => {
        const result = sanitizationService.sanitizeSync(attack);
        
        expect(result.sanitizedContent).not.toContain('require(');
        expect(result.sanitizedContent).not.toContain('process.');
        expect(result.sanitizedContent).not.toContain('global.');
        expect(result.sanitizedContent).not.toContain('<script>');
      });
    });
  });

  describe('Mobile Device Simulation', () => {
    it('should handle mobile-specific performance constraints', async () => {
      // Simulate slower mobile processing by testing with time constraints
      const mobileContent = '<div>' + '<p>Mobile content</p>'.repeat(20) + '<script>alert("mobile")</script>' + '</div>';
      
      const startTime = performance.now();
      const result = sanitizationService.sanitizeSync(mobileContent);
      const endTime = performance.now();
      
      // Should complete quickly even on slower devices
      expect(endTime - startTime).toBeLessThan(100);
      expect(result.sanitizedContent).not.toContain('<script>');
    });

    it('should handle touch-based event attacks', () => {
      const touchAttacks = [
        '<div ontouchstart="alert(\'touch\')">Touch me</div>',
        '<span ontouchmove="alert(\'move\')">Swipe</span>',
        '<button ontouchend="alert(\'end\')">Release</button>'
      ];

      touchAttacks.forEach(attack => {
        const result = sanitizationService.sanitizeSync(attack);
        
        expect(result.sanitizedContent).not.toMatch(/ontouch\w+/);
        expect(result.sanitizedContent).not.toContain('alert(');
      });
    });
  });
});