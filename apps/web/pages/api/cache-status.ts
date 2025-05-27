import type { NextApiRequest, NextApiResponse } from 'next';
import { cache } from '@/lib/redis';

type CacheStatusResponse = {
  redisConnected: boolean;
  message: string;
  statistics: {
    hitRate: string;
    totalRequests: number;
    hits: number;
    misses: number;
    sets: number;
    errors: number;
    fallbackHits: number;
    fallbackSets: number;
    fallbackCacheSize: number;
  };
  testResult?: {
    setSuccess: boolean;
    getSuccess: boolean;
    value?: string;
    dataSize?: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CacheStatusResponse>
) {
  try {
    const isConnected = cache.isRedisConnected();
    const stats = cache.getStats();
    
    // Test basic cache operations
    const testKey = 'cache-test-' + Date.now();
    const testValue = 'Redis is working! ' + new Date().toISOString();
    
    let testResult = {
      setSuccess: false,
      getSuccess: false,
      value: undefined as string | undefined,
      dataSize: undefined as string | undefined
    };
    
    try {
      // Test set operation
      await cache.set(testKey, testValue, 60); // 1 minute TTL
      testResult.setSuccess = true;
      
      // Test get operation
      const retrievedValue = await cache.get<string>(testKey);
      testResult.getSuccess = retrievedValue === testValue;
      testResult.value = retrievedValue || undefined;
      
      // Calculate data size
      if (retrievedValue) {
        const bytes = new Blob([JSON.stringify(retrievedValue)]).size;
        testResult.dataSize = bytes < 1024 ? `${bytes}B` : `${(bytes / 1024).toFixed(1)}KB`;
      }
      
      // Clean up test key
      await cache.delete(testKey);
    } catch (error) {
      console.error('Cache test error:', error);
    }
    
    // Log current stats to console
    cache.logStats();
    
    res.status(200).json({
      redisConnected: isConnected,
      message: isConnected 
        ? 'Redis cache is connected and working' 
        : 'Redis cache is not connected, using fallback cache',
      statistics: stats,
      testResult
    });
  } catch (error) {
    console.error('Cache status check error:', error);
    res.status(500).json({
      redisConnected: false,
      message: 'Error checking cache status: ' + (error instanceof Error ? error.message : 'Unknown error'),
      statistics: {
        hitRate: '0.0%',
        totalRequests: 0,
        hits: 0,
        misses: 0,
        sets: 0,
        errors: 1,
        fallbackHits: 0,
        fallbackSets: 0,
        fallbackCacheSize: 0
      }
    });
  }
} 