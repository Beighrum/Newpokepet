/**
 * Server-side sanitization caching service for Firebase Functions
 * Implements distributed caching with Redis-like functionality using in-memory cache
 */

const admin = require('firebase-admin');

// Cache entry interface
class CacheEntry {
  constructor(result, contentType, optionsHash) {
    this.result = result;
    this.timestamp = new Date();
    this.accessCount = 1;
    this.lastAccessed = new Date();
    this.contentType = contentType;
    this.optionsHash = optionsHash;
  }
}

// Cache configuration
const DEFAULT_CONFIG = {
  maxSize: 2000, // Larger for server-side
  ttlMs: 10 * 60 * 1000, // 10 minutes for server-side
  cleanupIntervalMs: 2 * 60 * 1000, // 2 minutes cleanup interval
  enableMetrics: true,
  enableDistributedInvalidation: true
};

class ServerSanitizationCache {
  constructor(config = {}) {
    this.cache = new Map();
    this.config = { ...DEFAULT_CONFIG, ...config };
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
    this.configVersion = 1;
    this.cleanupTimer = null;
    this.db = admin.firestore();
    
    this.startCleanupTimer();
    this.setupDistributedInvalidation();
  }

  /**
   * Generate cache key from content and options
   */
  generateCacheKey(content, options = {}, contentType = 'defaultPolicy') {
    const optionsHash = this.hashOptions(options);
    const contentHash = this.hashContent(content);
    return `${contentType}:${contentHash}:${optionsHash}:v${this.configVersion}`;
  }

  /**
   * Hash content for cache key generation
   */
  hashContent(content) {
    let hash = 0;
    if (!content || content.length === 0) return hash.toString();
    
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
  hashOptions(options) {
    if (!options || Object.keys(options).length === 0) return 'default';
    
    const optionsString = JSON.stringify(options, Object.keys(options).sort());
    return this.hashContent(optionsString);
  }

  /**
   * Get cached sanitization result
   */
  get(content, options = {}, contentType = 'defaultPolicy') {
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
  set(content, result, options = {}, contentType = 'defaultPolicy') {
    const key = this.generateCacheKey(content, options, contentType);
    const optionsHash = this.hashOptions(options);

    // Check if we need to evict entries due to size limit
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    const entry = new CacheEntry(result, contentType, optionsHash);
    this.cache.set(key, entry);

    if (this.config.enableMetrics) {
      this.updateCacheSize();
      this.updateMemoryUsage();
    }
  }

  /**
   * Evict least recently used entries
   */
  evictLeastRecentlyUsed() {
    if (this.cache.size === 0) return;

    let oldestKey = null;
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
  clear(reason = 'manual') {
    const sizeBefore = this.cache.size;
    this.cache.clear();
    
    if (this.config.enableMetrics) {
      this.metrics.evictions += sizeBefore;
      this.updateCacheSize();
      this.updateMemoryUsage();
    }

    console.log(`Server cache cleared due to: ${reason}, evicted ${sizeBefore} entries`);
    
    // Notify other instances if distributed invalidation is enabled
    if (this.config.enableDistributedInvalidation) {
      this.notifyDistributedInvalidation('clear', { reason });
    }
  }

  /**
   * Invalidate cache entries by content type
   */
  invalidateByContentType(contentType, reason = 'manual') {
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

    console.log(`Invalidated ${evictedCount} server cache entries for content type ${contentType} due to: ${reason}`);
    
    // Notify other instances
    if (this.config.enableDistributedInvalidation) {
      this.notifyDistributedInvalidation('invalidateByContentType', { contentType, reason });
    }
  }

  /**
   * Invalidate cache when configuration changes
   */
  invalidateOnConfigChange() {
    this.configVersion++;
    this.clear('config_change');
  }

  /**
   * Setup distributed cache invalidation using Firestore
   */
  setupDistributedInvalidation() {
    if (!this.config.enableDistributedInvalidation) return;

    // Listen for cache invalidation events
    this.db.collection('cacheInvalidation')
      .where('timestamp', '>', new Date(Date.now() - 60000)) // Last minute
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            this.handleDistributedInvalidation(data);
          }
        });
      });
  }

  /**
   * Handle distributed cache invalidation
   */
  handleDistributedInvalidation(data) {
    const { action, params, instanceId } = data;
    
    // Don't process our own invalidation events
    if (instanceId === this.getInstanceId()) return;

    switch (action) {
      case 'clear':
        this.cache.clear();
        console.log('Cache cleared due to distributed invalidation');
        break;
      case 'invalidateByContentType':
        this.invalidateByContentType(params.contentType, 'distributed_invalidation');
        break;
      case 'configChange':
        this.configVersion++;
        this.cache.clear();
        console.log('Cache cleared due to distributed config change');
        break;
    }
  }

  /**
   * Notify other instances of cache invalidation
   */
  async notifyDistributedInvalidation(action, params) {
    try {
      await this.db.collection('cacheInvalidation').add({
        action,
        params,
        instanceId: this.getInstanceId(),
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to notify distributed invalidation:', error);
    }
  }

  /**
   * Get instance ID for distributed invalidation
   */
  getInstanceId() {
    if (!this.instanceId) {
      this.instanceId = `server-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    return this.instanceId;
  }

  /**
   * Start cleanup timer for expired entries
   */
  startCleanupTimer() {
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
  cleanupExpiredEntries() {
    const now = Date.now();
    let evictedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp.getTime();
      if (age > this.config.ttlMs) {
        this.cache.delete(key);
        evictedCount++;
      }
    }

    if (evictedCount > 0) {
      if (this.config.enableMetrics) {
        this.metrics.evictions += evictedCount;
        this.updateCacheSize();
        this.updateMemoryUsage();
      }
      console.log(`Cleaned up ${evictedCount} expired cache entries`);
    }
  }

  /**
   * Update hit rate metric
   */
  updateHitRate() {
    if (this.metrics.totalRequests > 0) {
      this.metrics.hitRate = this.metrics.hits / this.metrics.totalRequests;
    }
  }

  /**
   * Update cache size metric
   */
  updateCacheSize() {
    this.metrics.cacheSize = this.cache.size;
  }

  /**
   * Update memory usage estimate
   */
  updateMemoryUsage() {
    let totalSize = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      // Rough estimate of memory usage
      totalSize += key.length * 2; // String characters are 2 bytes
      totalSize += entry.result.originalContent.length * 2;
      totalSize += entry.result.sanitizedContent.length * 2;
      totalSize += JSON.stringify(entry.result.securityViolations).length * 2;
      totalSize += 300; // Overhead for object structure
    }
    
    this.metrics.memoryUsage = totalSize;
  }

  /**
   * Get cache metrics
   */
  getMetrics() {
    this.updateCacheSize();
    this.updateMemoryUsage();
    return { ...this.metrics };
  }

  /**
   * Get cache statistics
   */
  getStatistics() {
    const contentTypeCounts = new Map();
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
      averageEntryAge,
      instanceId: this.getInstanceId()
    };
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig) {
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

    console.log('Server cache configuration updated:', newConfig);
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }

  /**
   * Get cache entries for debugging
   */
  getDebugInfo() {
    const now = Date.now();
    const entries = [];

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
const serverSanitizationCache = new ServerSanitizationCache();
module.exports = serverSanitizationCache;