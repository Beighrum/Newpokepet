import { CacheService, imageCache, apiCache } from '../cacheService';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService({
      ttl: 1000, // 1 second for testing
      maxSize: 1024, // 1KB
      maxEntries: 5
    });
  });

  afterEach(() => {
    cacheService.destroy();
  });

  describe('basic operations', () => {
    it('should set and get cache entries', () => {
      const key = 'test-key';
      const data = { message: 'hello world' };

      cacheService.set(key, data);
      const result = cacheService.get(key);

      expect(result).toEqual(data);
    });

    it('should return null for non-existent keys', () => {
      const result = cacheService.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should check if key exists', () => {
      const key = 'test-key';
      const data = { message: 'hello world' };

      expect(cacheService.has(key)).toBe(false);
      
      cacheService.set(key, data);
      expect(cacheService.has(key)).toBe(true);
    });

    it('should delete cache entries', () => {
      const key = 'test-key';
      const data = { message: 'hello world' };

      cacheService.set(key, data);
      expect(cacheService.has(key)).toBe(true);

      const deleted = cacheService.delete(key);
      expect(deleted).toBe(true);
      expect(cacheService.has(key)).toBe(false);
    });

    it('should clear all cache entries', () => {
      cacheService.set('key1', 'data1');
      cacheService.set('key2', 'data2');
      
      expect(cacheService.has('key1')).toBe(true);
      expect(cacheService.has('key2')).toBe(true);

      cacheService.clear();
      
      expect(cacheService.has('key1')).toBe(false);
      expect(cacheService.has('key2')).toBe(false);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', async () => {
      const key = 'test-key';
      const data = { message: 'hello world' };

      cacheService.set(key, data, 100); // 100ms TTL
      expect(cacheService.get(key)).toEqual(data);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(cacheService.get(key)).toBeNull();
      expect(cacheService.has(key)).toBe(false);
    });

    it('should use default TTL when not specified', async () => {
      const key = 'test-key';
      const data = { message: 'hello world' };

      cacheService.set(key, data); // Use default TTL (1000ms)
      expect(cacheService.get(key)).toEqual(data);

      // Should still be valid before default TTL
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(cacheService.get(key)).toEqual(data);
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      const key = 'test-key';
      const cachedData = { message: 'cached' };
      const factoryData = { message: 'factory' };

      cacheService.set(key, cachedData);

      const factory = jest.fn().mockResolvedValue(factoryData);
      const result = await cacheService.getOrSet(key, factory);

      expect(result).toEqual(cachedData);
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory and cache result if not exists', async () => {
      const key = 'test-key';
      const factoryData = { message: 'factory' };

      const factory = jest.fn().mockResolvedValue(factoryData);
      const result = await cacheService.getOrSet(key, factory);

      expect(result).toEqual(factoryData);
      expect(factory).toHaveBeenCalledTimes(1);
      expect(cacheService.get(key)).toEqual(factoryData);
    });

    it('should work with synchronous factory functions', async () => {
      const key = 'test-key';
      const factoryData = { message: 'sync factory' };

      const factory = jest.fn().mockReturnValue(factoryData);
      const result = await cacheService.getOrSet(key, factory);

      expect(result).toEqual(factoryData);
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  describe('tag-based invalidation', () => {
    it('should set entries with tags', () => {
      const key = 'test-key';
      const data = { message: 'hello world' };
      const tags = ['user:123', 'posts'];

      cacheService.setWithTags(key, data, tags);
      
      expect(cacheService.get(key)).toEqual(data);
    });

    it('should invalidate entries by tags', () => {
      cacheService.setWithTags('user:123:profile', { name: 'John' }, ['user:123']);
      cacheService.setWithTags('user:123:posts', ['post1', 'post2'], ['user:123', 'posts']);
      cacheService.setWithTags('user:456:profile', { name: 'Jane' }, ['user:456']);

      expect(cacheService.get('user:123:profile')).toBeTruthy();
      expect(cacheService.get('user:123:posts')).toBeTruthy();
      expect(cacheService.get('user:456:profile')).toBeTruthy();

      cacheService.invalidateByTags(['user:123']);

      expect(cacheService.get('user:123:profile')).toBeNull();
      expect(cacheService.get('user:123:posts')).toBeNull();
      expect(cacheService.get('user:456:profile')).toBeTruthy(); // Should remain
    });
  });

  describe('statistics', () => {
    it('should track cache statistics', () => {
      const key1 = 'key1';
      const key2 = 'key2';
      const data = { message: 'test' };

      // Set some data
      cacheService.set(key1, data);
      cacheService.set(key2, data);

      // Generate hits and misses
      cacheService.get(key1); // hit
      cacheService.get(key1); // hit
      cacheService.get('non-existent'); // miss

      const stats = cacheService.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.entries).toBe(2);
      expect(stats.hitRate).toBe(2/3);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('capacity management', () => {
    it('should evict entries when max entries exceeded', () => {
      // Fill cache to capacity
      for (let i = 0; i < 5; i++) {
        cacheService.set(`key${i}`, `data${i}`);
      }

      expect(cacheService.getStats().entries).toBe(5);

      // Add one more to trigger eviction
      cacheService.set('key5', 'data5');

      expect(cacheService.getStats().entries).toBe(5);
      expect(cacheService.get('key0')).toBeNull(); // Should be evicted (LRU)
      expect(cacheService.get('key5')).toBe('data5'); // Should exist
    });

    it('should evict entries when max size exceeded', () => {
      const largeData = 'x'.repeat(500); // 500 bytes
      
      cacheService.set('key1', largeData);
      cacheService.set('key2', largeData);
      
      // This should trigger size-based eviction
      cacheService.set('key3', largeData);

      const stats = cacheService.getStats();
      expect(stats.size).toBeLessThanOrEqual(1024); // Should not exceed max size
    });
  });

  describe('pattern matching', () => {
    it('should get entries by pattern', () => {
      cacheService.set('user:123:profile', { name: 'John' });
      cacheService.set('user:123:posts', ['post1', 'post2']);
      cacheService.set('user:456:profile', { name: 'Jane' });
      cacheService.set('config:app', { theme: 'dark' });

      const userEntries = cacheService.getByPattern(/^user:123:/);
      
      expect(userEntries).toHaveLength(2);
      expect(userEntries.map(e => e.key)).toContain('user:123:profile');
      expect(userEntries.map(e => e.key)).toContain('user:123:posts');
    });
  });

  describe('keys', () => {
    it('should return all cache keys', () => {
      cacheService.set('key1', 'data1');
      cacheService.set('key2', 'data2');
      cacheService.set('key3', 'data3');

      const keys = cacheService.keys();
      
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });
  });
});

describe('Specialized cache instances', () => {
  it('should have imageCache instance', () => {
    expect(imageCache).toBeInstanceOf(CacheService);
    
    imageCache.set('test-image', 'image-data');
    expect(imageCache.get('test-image')).toBe('image-data');
  });

  it('should have apiCache instance', () => {
    expect(apiCache).toBeInstanceOf(CacheService);
    
    apiCache.set('test-api', 'api-data');
    expect(apiCache.get('test-api')).toBe('api-data');
  });

  afterEach(() => {
    imageCache.clear();
    apiCache.clear();
  });
});