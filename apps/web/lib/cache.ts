interface CacheItem<T> {
  value: T;
  expiry: number;
}

class Cache {
  private cache: Map<string, CacheItem<any>>;
  private defaultTtl: number; // Time-to-live in milliseconds

  constructor(defaultTtl: number = 5 * 60 * 1000) { // 5 minutes default
    this.cache = new Map();
    this.defaultTtl = defaultTtl;
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    // Return null if item doesn't exist or has expired
    if (!item || item.expiry < Date.now()) {
      if (item) {
        // Clean up expired item
        this.cache.delete(key);
      }
      return null;
    }
    
    return item.value as T;
  }

  set<T>(key: string, value: T, ttl: number = this.defaultTtl): void {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Utility to clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expiry < now) {
        this.cache.delete(key);
      }
    }
  }
}

// Create a singleton instance
export const cache = new Cache();

// Set up periodic cleanup
if (typeof window !== 'undefined') {
  setInterval(() => {
    cache.cleanup();
  }, 60 * 1000); // Run cleanup every minute
}