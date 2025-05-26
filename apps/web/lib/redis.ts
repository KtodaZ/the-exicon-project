import { Redis } from 'ioredis';
import config from './config';

let redis: Redis | null = null;
let isRedisAvailable = false;

// Initialize Redis connection
function initRedis(): Redis | null {
  const redisUrl = config.get('redis.url');
  
  if (!redisUrl) {
    console.log('Redis URL not configured, caching will be disabled');
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
      console.log('Redis connected successfully');
      isRedisAvailable = true;
    });

    client.on('error', (error: Error) => {
      console.error('Redis connection error:', error);
      isRedisAvailable = false;
    });

    client.on('close', () => {
      console.log('Redis connection closed');
      isRedisAvailable = false;
    });

    return client;
  } catch (error) {
    console.error('Failed to initialize Redis:', error);
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

// Cache interface with fallback to in-memory for development
class CacheService {
  private fallbackCache = new Map<string, { value: any; expiry: number }>();

  async get<T>(key: string): Promise<T | null> {
    const client = getRedisClient();
    
    if (client && isRedisAvailable) {
      try {
        const value = await client.get(key);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        console.error('Redis get error:', error);
        isRedisAvailable = false;
      }
    }

    // Fallback to in-memory cache
    const item = this.fallbackCache.get(key);
    if (item && item.expiry > Date.now()) {
      return item.value;
    }
    
    if (item) {
      this.fallbackCache.delete(key);
    }
    
    return null;
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    const client = getRedisClient();
    
    if (client && isRedisAvailable) {
      try {
        await client.setex(key, ttlSeconds, JSON.stringify(value));
        return;
      } catch (error) {
        console.error('Redis set error:', error);
        isRedisAvailable = false;
      }
    }

    // Fallback to in-memory cache
    this.fallbackCache.set(key, {
      value,
      expiry: Date.now() + (ttlSeconds * 1000)
    });
  }

  async delete(key: string): Promise<void> {
    const client = getRedisClient();
    
    if (client && isRedisAvailable) {
      try {
        await client.del(key);
      } catch (error) {
        console.error('Redis delete error:', error);
        isRedisAvailable = false;
      }
    }

    // Also remove from fallback cache
    this.fallbackCache.delete(key);
  }

  async clear(): Promise<void> {
    const client = getRedisClient();
    
    if (client && isRedisAvailable) {
      try {
        await client.flushdb();
      } catch (error) {
        console.error('Redis clear error:', error);
        isRedisAvailable = false;
      }
    }

    // Clear fallback cache
    this.fallbackCache.clear();
  }

  // Utility method to check if Redis is available
  isRedisConnected(): boolean {
    return isRedisAvailable;
  }

  // Clean up expired entries from fallback cache
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.fallbackCache.entries()) {
      if (item.expiry < now) {
        this.fallbackCache.delete(key);
      }
    }
  }
}

// Create singleton instance
export const cache = new CacheService();

// Set up periodic cleanup for fallback cache
if (typeof window !== 'undefined') {
  setInterval(() => {
    cache.cleanup();
  }, 60 * 1000); // Run cleanup every minute
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