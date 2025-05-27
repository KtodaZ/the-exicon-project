import { Redis } from 'ioredis';
import config from './config';

let redis: Redis | null = null;
let isRedisAvailable = false;

// Cache statistics for monitoring
let cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  errors: 0,
  fallbackHits: 0,
  fallbackSets: 0
};

// Initialize Redis connection
function initRedis(): Redis | null {
  const redisUrl = config.get('redis.url');
  
  if (!redisUrl) {
    console.log('🔴 Redis URL not configured, caching will be disabled');
    return null;
  }

  try {
    const client = new Redis(redisUrl, {
      // Connection options optimized for Vercel serverless
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: true,
      // Keep connections alive for serverless
      keepAlive: 30000,
    });

    client.on('connect', () => {
      console.log('🟢 Redis connected successfully');
      isRedisAvailable = true;
    });

    client.on('error', (error: Error) => {
      console.error('🔴 Redis connection error:', error);
      isRedisAvailable = false;
      cacheStats.errors++;
    });

    client.on('close', () => {
      console.log('🟡 Redis connection closed');
      isRedisAvailable = false;
    });

    return client;
  } catch (error) {
    console.error('🔴 Failed to initialize Redis:', error);
    cacheStats.errors++;
    return null;
  }
}

// Get Redis client (lazy initialization)
function getRedisClient(): Redis | null {
  if (!redis) {
    redis = initRedis();
  }
  return redis;
}

// Helper function to format cache data size
function formatDataSize(data: any): string {
  const jsonString = JSON.stringify(data);
  const bytes = new Blob([jsonString]).size;
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// Helper function to get cache key category
function getCacheCategory(key: string): string {
  if (key.startsWith('exercises:all:')) return 'pagination';
  if (key.startsWith('exercise:slug:')) return 'detail';
  if (key.startsWith('exercises:similar:')) return 'similar';
  if (key.startsWith('exercises:search:')) return 'search';
  if (key.startsWith('tags:popular')) return 'tags';
  return 'other';
}

// Cache interface with fallback to in-memory for development
class CacheService {
  private fallbackCache = new Map<string, { value: any; expiry: number }>();

  async get<T>(key: string): Promise<T | null> {
    const client = getRedisClient();
    const category = getCacheCategory(key);
    
    if (client && isRedisAvailable) {
      try {
        const value = await client.get(key);
        if (value) {
          const parsedValue = JSON.parse(value);
          cacheStats.hits++;
          console.log(`🟢 CACHE HIT [${category}] ${key} (${formatDataSize(parsedValue)})`);
          return parsedValue;
        } else {
          cacheStats.misses++;
          console.log(`🔴 CACHE MISS [${category}] ${key}`);
          return null;
        }
      } catch (error) {
        console.error(`🔴 Redis get error for key ${key}:`, error);
        isRedisAvailable = false;
        cacheStats.errors++;
      }
    }

    // Fallback to in-memory cache
    const item = this.fallbackCache.get(key);
    if (item && item.expiry > Date.now()) {
      cacheStats.fallbackHits++;
      console.log(`🟡 FALLBACK CACHE HIT [${category}] ${key} (${formatDataSize(item.value)})`);
      return item.value;
    }
    
    if (item) {
      this.fallbackCache.delete(key);
      console.log(`🟡 FALLBACK CACHE EXPIRED [${category}] ${key}`);
    } else {
      console.log(`🔴 FALLBACK CACHE MISS [${category}] ${key}`);
    }
    
    cacheStats.misses++;
    return null;
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    const client = getRedisClient();
    const category = getCacheCategory(key);
    const dataSize = formatDataSize(value);
    
    if (client && isRedisAvailable) {
      try {
        await client.setex(key, ttlSeconds, JSON.stringify(value));
        cacheStats.sets++;
        console.log(`🟢 CACHE SET [${category}] ${key} (${dataSize}, TTL: ${ttlSeconds}s)`);
        return;
      } catch (error) {
        console.error(`🔴 Redis set error for key ${key}:`, error);
        isRedisAvailable = false;
        cacheStats.errors++;
      }
    }

    // Fallback to in-memory cache
    this.fallbackCache.set(key, {
      value,
      expiry: Date.now() + (ttlSeconds * 1000)
    });
    cacheStats.fallbackSets++;
    console.log(`🟡 FALLBACK CACHE SET [${category}] ${key} (${dataSize}, TTL: ${ttlSeconds}s)`);
  }

  async delete(key: string): Promise<void> {
    const client = getRedisClient();
    const category = getCacheCategory(key);
    
    if (client && isRedisAvailable) {
      try {
        const result = await client.del(key);
        console.log(`🗑️ CACHE DELETE [${category}] ${key} (deleted: ${result > 0})`);
      } catch (error) {
        console.error(`🔴 Redis delete error for key ${key}:`, error);
        isRedisAvailable = false;
        cacheStats.errors++;
      }
    }

    // Also remove from fallback cache
    const hadKey = this.fallbackCache.delete(key);
    if (hadKey) {
      console.log(`🗑️ FALLBACK CACHE DELETE [${category}] ${key}`);
    }
  }

  async clear(): Promise<void> {
    const client = getRedisClient();
    
    if (client && isRedisAvailable) {
      try {
        await client.flushdb();
        console.log('🗑️ REDIS CACHE CLEARED');
      } catch (error) {
        console.error('🔴 Redis clear error:', error);
        isRedisAvailable = false;
        cacheStats.errors++;
      }
    }

    // Clear fallback cache
    const fallbackSize = this.fallbackCache.size;
    this.fallbackCache.clear();
    console.log(`🗑️ FALLBACK CACHE CLEARED (${fallbackSize} keys)`);
  }

  // Utility method to check if Redis is available
  isRedisConnected(): boolean {
    return isRedisAvailable;
  }

  // Get cache statistics
  getStats() {
    const totalRequests = cacheStats.hits + cacheStats.misses;
    const hitRate = totalRequests > 0 ? ((cacheStats.hits / totalRequests) * 100).toFixed(1) : '0.0';
    
    return {
      ...cacheStats,
      hitRate: `${hitRate}%`,
      totalRequests,
      fallbackCacheSize: this.fallbackCache.size,
      redisConnected: isRedisAvailable
    };
  }

  // Reset statistics
  resetStats() {
    cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      errors: 0,
      fallbackHits: 0,
      fallbackSets: 0
    };
    console.log('📊 Cache statistics reset');
  }

  // Log current statistics
  logStats() {
    const stats = this.getStats();
    console.log('📊 CACHE STATISTICS:', {
      'Hit Rate': stats.hitRate,
      'Total Requests': stats.totalRequests,
      'Redis Hits': stats.hits,
      'Cache Misses': stats.misses,
      'Cache Sets': stats.sets,
      'Fallback Hits': stats.fallbackHits,
      'Fallback Sets': stats.fallbackSets,
      'Errors': stats.errors,
      'Fallback Cache Size': stats.fallbackCacheSize,
      'Redis Connected': stats.redisConnected
    });
  }

  // Clean up expired entries from fallback cache
  cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, item] of this.fallbackCache.entries()) {
      if (item.expiry < now) {
        this.fallbackCache.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      console.log(`🧹 FALLBACK CACHE CLEANUP: Removed ${expiredCount} expired keys`);
    }
  }
}

// Create singleton instance
export const cache = new CacheService();

// Set up periodic cleanup and stats logging for fallback cache
if (typeof window !== 'undefined') {
  setInterval(() => {
    cache.cleanup();
  }, 60 * 1000); // Run cleanup every minute
  
  // Log stats every 5 minutes in development
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      cache.logStats();
    }, 5 * 60 * 1000);
  }
}

// Cache key generators for consistent naming
export const cacheKeys = {
  allExercises: (page: number, limit: number) => `exercises:all:${page}:${limit}`,
  exerciseBySlug: (slug: string) => `exercise:slug:${slug}`,
  similarExercises: (excludeId: string, tags: string[], limit: number) => 
    `exercises:similar:${excludeId}:${tags.sort().join('-')}:${limit}`,
  searchExercises: (query: string, tags: string[], page: number, limit: number) => 
    `exercises:search:${query}:${tags.sort().join('-')}:${page}:${limit}`,
  popularTags: () => 'tags:popular',
  exercisesByTags: (tags: string[], page: number, limit: number) =>
    `exercises:tags:${tags.sort().join('-')}:${page}:${limit}`
};

// Cache TTL constants (in seconds)
export const cacheTTL = {
  // High priority - longer cache times
  allExercises: 10 * 60, // 10 minutes
  exerciseDetail: 30 * 60, // 30 minutes
  popularTags: 60 * 60, // 1 hour
  
  // Medium priority
  similarExercises: 20 * 60, // 20 minutes
  
  // Lower priority - shorter cache times
  searchResults: 5 * 60, // 5 minutes
  tagFiltering: 5 * 60, // 5 minutes
}; 