/**
 * Sanitization caching service for performance optimization
 * Implements in-memory caching with cache invalidation and performance monitoring
 */

import { SanitizedResult, SanitizeOptions, ContentType } from '../types/sanitization';

// Cache entry interface
interface CacheEntry {
  result: SanitizedResult;
  timestamp: Date;
  accessCount: number;
  lastAccessed: Date;
  contentType: ContentType;
  optionsHash: string;
}

// Cache configuration
interface CacheConfig {
  maxSize: number;
  ttlMs: number; // Time to live in milliseconds
  cleanupIntervalMs: number;
  enableMetrics: boolean;
}

// Cache metrics
interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  totalRequests: number;
  averageProcessingTime: number;
  cacheSize: number;
  hitRate: number;
  memoryUsage: number;
}

// Cache invalidation reasons
type InvalidationReason = 'ttl_expired' | 'size_limit' | 'manual' | 'config_change';

class SanitizationCache {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private metrics: CacheMetrics;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private configVersion = 1;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 1000,
      ttlMs: 5 * 60 * 1000, // 5 minutes default
      cleanupIntervalMs: 60 * 1000, // 1 minute cleanup interval
      enableMetrics: true,
      ...config
    };

    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0,
      averageProcessingTime: 0,
      cacheSize: 0,
      hitRate: 0,
      memoryUsage: 0
    };

    this.startCleanupTimer();
  }

  /**
   * Generate cache key from content and options
   */
  private generateCacheKey(content: string, options?: SanitizeOptions, contentType?: ContentType): string {
    const optionsHash = this.hashOptions(options);
    const contentHash = this.hashContent(content);
    const typeKey = contentType || ContentType.GENERAL;
    return `${typeKey}:${contentHash}:${optionsHash}:v${this.configVersion}`;
  }

  /**
   * Hash content for cache key generation
   */
  private hashContent(content: string): string {
    let hash = 0;
    if (content.length === 0) return hash.toString();
    
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Hash options for cache key generation
   */
  private hashOptions(options?: SanitizeOptions): string {
    if (!options) return 'default';
    
    const optionsString = JSON.stringify(options, Object.keys(options).sort());
    return this.hashContent(optionsString);
  }

  /**
   * Get cached sanitization result
   */
  get(content: string, options?: SanitizeOptions, contentType?: ContentType): SanitizedResult | null {
    if (this.config.enableMetrics) {
      this.metrics.totalRequests++;
    }

    const key = this.generateCacheKey(content, options, contentType);
    const entry = this.cache.get(key);

    if (!entry) {
      if (this.config.enableMetrics) {
        this.metrics.misses++;
        this.updateHitRate();
      }
      return null;
    }

    // Check if entry has expired
    const now = new Date();
    const age = now.getTime() - entry.timestamp.getTime();
    
    if (age > this.config.ttlMs) {
      this.cache.delete(key);
      if (this.config.enableMetrics) {
        this.metrics.misses++;
        this.metrics.evictions++;
        this.updateHitRate();
        this.updateCacheSize();
      }
      return null;
    }

    // Update access information
    entry.accessCount++;
    entry.lastAccessed = now;

    if (this.config.enableMetrics) {
      this.metrics.hits++;
      this.updateHitRate();
    }

    return entry.result;
  }

  /**
   * Set cached sanitization result
   */
  set(
    content: string, 
    result: SanitizedResult, 
    options?: SanitizeOptions, 
    contentType?: ContentType
  ): void {
    const key = this.generateCacheKey(content, options, contentType);
    const now = new Date();

    // Check if we need to evict entries due to size limit
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry = {
      result,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now,
      contentType: contentType || ContentType.GENERAL,
      optionsHash: this.hashOptions(options)
    };

    this.cache.set(key, entry);

    if (this.config.enableMetrics) {
      this.updateCacheSize();
      this.updateMemoryUsage();
    }
  }

  /**
   * Evict least recently used entries
   */
  private evictLeastRecentlyUsed(): void {
    if (this.cache.size === 0) return;

    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed.getTime() < oldestTime) {
        oldestTime = entry.lastAccessed.getTime();
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      if (this.config.enableMetrics) {
        this.metrics.evictions++;
      }
    }
  }

  /**
   * Clear entire cache
   */
  clear(reason: InvalidationReason = 'manual'): void {
    const sizeBefore = this.cache.size;
    this.cache.clear();
    
    if (this.config.enableMetrics) {
      this.metrics.evictions += sizeBefore;
      this.updateCacheSize();
      this.updateMemoryUsage();
    }

    console.log(`Cache cleared due to: ${reason}, evicted ${sizeBefore} entries`);
  }

  /**
   * Invalidate cache entries by content type
   */
  invalidateByContentType(contentType: ContentType, reason: InvalidationReason = 'manual'): void {
    let evictedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.contentType === contentType) {
        this.cache.delete(key);
        evictedCount++;
      }
    }

    if (this.config.enableMetrics) {
      this.metrics.evictions += evictedCount;
      this.updateCacheSize();
      this.updateMemoryUsage();
    }

    console.log(`Invalidated ${evictedCount} cache entries for content type ${contentType} due to: ${reason}`);
  }

  /**
   * Invalidate cache when configuration changes
   */
  invalidateOnConfigChange(): void {
    this.configVersion++;
    this.clear('config_change');
  }

  /**
   * Start cleanup timer for expired entries
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.config.cleanupIntervalMs);
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let evictedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp.getTime();
      if (age > this.config.ttlMs) {
        this.cache.delete(key);
        evictedCount++;
      }
    }

    if (evictedCount > 0 && this.config.enableMetrics) {
      this.metrics.evictions += evictedCount;
      this.updateCacheSize();
      this.updateMemoryUsage();
    }
  }

  /**
   * Update hit rate metric
   */
  private updateHitRate(): void {
    if (this.metrics.totalRequests > 0) {
      this.metrics.hitRate = this.metrics.hits / this.metrics.totalRequests;
    }
  }

  /**
   * Update cache size metric
   */
  private updateCacheSize(): void {
    this.metrics.cacheSize = this.cache.size;
  }

  /**
   * Update memory usage estimate
   */
  private updateMemoryUsage(): void {
    let totalSize = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      // Rough estimate of memory usage
      totalSize += key.length * 2; // String characters are 2 bytes
      totalSize += entry.result.originalContent.length * 2;
      totalSize += entry.result.sanitizedContent.length * 2;
      totalSize += JSON.stringify(entry.result.securityViolations).length * 2;
      totalSize += 200; // Overhead for object structure
    }
    
    this.metrics.memoryUsage = totalSize;
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    this.updateCacheSize();
    this.updateMemoryUsage();
    return { ...this.metrics };
  }

  /**
   * Get cache statistics
   */
  getStatistics(): {
    metrics: CacheMetrics;
    config: CacheConfig;
    topContentTypes: Array<{ type: ContentType; count: number }>;
    averageEntryAge: number;
  } {
    const contentTypeCounts = new Map<ContentType, number>();
    let totalAge = 0;
    const now = Date.now();

    for (const entry of this.cache.values()) {
      const count = contentTypeCounts.get(entry.contentType) || 0;
      contentTypeCounts.set(entry.contentType, count + 1);
      totalAge += now - entry.timestamp.getTime();
    }

    const topContentTypes = Array.from(contentTypeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const averageEntryAge = this.cache.size > 0 ? totalAge / this.cache.size : 0;

    return {
      metrics: this.getMetrics(),
      config: { ...this.config },
      topContentTypes,
      averageEntryAge
    };
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    // If max size decreased, evict entries
    if (newConfig.maxSize && newConfig.maxSize < oldConfig.maxSize) {
      while (this.cache.size > this.config.maxSize) {
        this.evictLeastRecentlyUsed();
      }
    }

    // If TTL decreased, clean up expired entries
    if (newConfig.ttlMs && newConfig.ttlMs < oldConfig.ttlMs) {
      this.cleanupExpiredEntries();
    }

    // Restart cleanup timer if interval changed
    if (newConfig.cleanupIntervalMs && newConfig.cleanupIntervalMs !== oldConfig.cleanupIntervalMs) {
      this.startCleanupTimer();
    }

    console.log('Cache configuration updated:', newConfig);
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }

  /**
   * Get cache entries for debugging
   */
  getDebugInfo(): Array<{
    key: string;
    contentType: ContentType;
    age: number;
    accessCount: number;
    contentLength: number;
    violationsCount: number;
  }> {
    const now = Date.now();
    const entries: Array<any> = [];

    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        key: key.substring(0, 50) + '...', // Truncate for readability
        contentType: entry.contentType,
        age: now - entry.timestamp.getTime(),
        accessCount: entry.accessCount,
        contentLength: entry.result.originalContent.length,
        violationsCount: entry.result.securityViolations.length
      });
    }

    return entries.sort((a, b) => b.accessCount - a.accessCount);
  }
}

// Export singleton instance
export const sanitizationCache = new SanitizationCache();
export default sanitizationCache;