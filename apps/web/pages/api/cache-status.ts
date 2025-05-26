import type { NextApiRequest, NextApiResponse } from 'next';
import { cache } from '@/lib/redis';

type CacheStatusResponse = {
  redisConnected: boolean;
  message: string;
  testResult?: {
    setSuccess: boolean;
    getSuccess: boolean;
    value?: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CacheStatusResponse>
) {
  try {
    const isConnected = cache.isRedisConnected();
    
    // Test basic cache operations
    const testKey = 'cache-test-' + Date.now();
    const testValue = 'Redis is working!';
    
    let testResult = {
      setSuccess: false,
      getSuccess: false,
      value: undefined as string | undefined
    };
    
    try {
      // Test set operation
      await cache.set(testKey, testValue, 60); // 1 minute TTL
      testResult.setSuccess = true;
      
      // Test get operation
      const retrievedValue = await cache.get<string>(testKey);
      testResult.getSuccess = retrievedValue === testValue;
      testResult.value = retrievedValue || undefined;
      
      // Clean up test key
      await cache.delete(testKey);
    } catch (error) {
      console.error('Cache test error:', error);
    }
    
    res.status(200).json({
      redisConnected: isConnected,
      message: isConnected 
        ? 'Redis cache is connected and working' 
        : 'Redis cache is not connected, using fallback cache',
      testResult
    });
  } catch (error) {
    console.error('Cache status check error:', error);
    res.status(500).json({
      redisConnected: false,
      message: 'Error checking cache status: ' + (error instanceof Error ? error.message : 'Unknown error')
    });
  }
} 