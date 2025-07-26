interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  size?: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size in bytes
  maxEntries?: number; // Maximum number of entries
}

interface CacheStats {
  hits: number;
  misses: number;
  entries: number;
  size: number;
  hitRate: number;
  oldestEntry: number;
  newestEntry: number;
}

class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private stats = {
    hits: 0,
    misses: 0
  };
  private defaultTTL = 30 * 60 * 1000; // 30 minutes
  private maxSize = 50 * 1024 * 1024; // 50MB
  private maxEntries = 1000;
  private cleanupInterval: NodeJS.Timeout;

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || this.defaultTTL;
    this.maxSize = options.maxSize || this.maxSize;
    this.maxEntries = options.maxEntries || this.maxEntries;

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Cleanup every 5 minutes
  }

  // Set cache entry
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);
    const size = this.estimateSize(data);

    // Check if we need to make space
    this.ensureCapacity(size);

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt,
      accessCount: 0,
      lastAccessed: now,
      size
    };

    this.cache.set(key, entry);
  }

  // Get cache entry
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;

    return entry.data as T;
  }

  // Check if key exists and is not expired
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  // Delete cache entry
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  // Get or set with factory function
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    const data = await factory();
    this.set(key, data, ttl);
    return data;
  }

  // Cache with tags for group invalidation
  setWithTags<T>(key: string, data: T, tags: string[], ttl?: number): void {
    this.set(key, data, ttl);
    
    // Store tag associations
    tags.forEach(tag => {
      const tagKey = `__tag:${tag}`;
      const taggedKeys = this.get<string[]>(tagKey) || [];
      if (!taggedKeys.includes(key)) {
        taggedKeys.push(key);
        this.set(tagKey, taggedKeys, ttl);
      }
    });
  }

  // Invalidate by tags
  invalidateByTags(tags: string[]): void {
    tags.forEach(tag => {
      const tagKey = `__tag:${tag}`;
      const taggedKeys = this.get<string[]>(tagKey) || [];
      
      taggedKeys.forEach(key => {
        this.delete(key);
      });
      
      this.delete(tagKey);
    });
  }

  // Get cache statistics
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, entry) => sum + (entry.size || 0), 0);
    const timestamps = entries.map(entry => entry.timestamp);
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      entries: this.cache.size,
      size: totalSize,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0
    };
  }

  // Get all keys
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Get entries by pattern
  getByPattern(pattern: RegExp): Array<{ key: string; data: any }> {
    const results: Array<{ key: string; data: any }> = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (pattern.test(key) && Date.now() <= entry.expiresAt) {
        results.push({ key, data: entry.data });
      }
    }
    
    return results;
  }

  // Cleanup expired entries
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
    });

    console.log(`Cache cleanup: removed ${keysToDelete.length} expired entries`);
  }

  // Ensure cache doesn't exceed capacity
  private ensureCapacity(newEntrySize: number): void {
    // Check entry count limit
    if (this.cache.size >= this.maxEntries) {
      this.evictLeastRecentlyUsed(1);
    }

    // Check size limit
    const currentSize = this.getCurrentSize();
    if (currentSize + newEntrySize > this.maxSize) {
      const targetSize = this.maxSize - newEntrySize;
      this.evictToSize(targetSize);
    }
  }

  // Evict least recently used entries
  private evictLeastRecentlyUsed(count: number): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  // Evict entries until size is under target
  private evictToSize(targetSize: number): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    let currentSize = this.getCurrentSize();
    
    for (const [key] of entries) {
      if (currentSize <= targetSize) break;
      
      const entry = this.cache.get(key);
      if (entry) {
        currentSize -= entry.size || 0;
        this.cache.delete(key);
      }
    }
  }

  // Get current cache size
  private getCurrentSize(): number {
    let size = 0;
    for (const entry of this.cache.values()) {
      size += entry.size || 0;
    }
    return size;
  }

  // Estimate object size in bytes
  private estimateSize(obj: any): number {
    const str = JSON.stringify(obj);
    return new Blob([str]).size;
  }

  // Destroy cache service
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Specialized cache instances
export const imageCache = new CacheService({
  ttl: 60 * 60 * 1000, // 1 hour
  maxSize: 100 * 1024 * 1024, // 100MB
  maxEntries: 500
});

export const apiCache = new CacheService({
  ttl: 15 * 60 * 1000, // 15 minutes
  maxSize: 10 * 1024 * 1024, // 10MB
  maxEntries: 200
});

export const userDataCache = new CacheService({
  ttl: 30 * 60 * 1000, // 30 minutes
  maxSize: 5 * 1024 * 1024, // 5MB
  maxEntries: 100
});

export { CacheService };
export default CacheService;