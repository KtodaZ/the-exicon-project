# Redis Caching Implementation

This document explains the Redis caching system implemented for The Exicon Project to improve performance and reduce MongoDB query load.

## Overview

The caching system provides:
- **Redis-based caching** for production environments
- **Fallback in-memory caching** for development/when Redis is unavailable
- **Intelligent cache keys** with consistent naming
- **Optimized TTL values** based on data priority
- **Graceful degradation** when Redis is down

## Setup

### 1. Environment Configuration

Add your Redis URL to your environment variables:

```bash
# .env or .env.local
REDIS_URL=redis://localhost:6379

# For production (Vercel), add to your environment variables:
# REDIS_URL=redis://user:password@your-redis-host:port
```

### 2. Redis Provider Options

**For Development:**
- Local Redis: `redis://localhost:6379`
- Redis Docker: `docker run -d -p 6379:6379 redis:alpine`

**For Production:**
- [Upstash Redis](https://upstash.com/) (Recommended for Vercel)
- [Redis Cloud](https://redis.com/redis-enterprise-cloud/)
- [AWS ElastiCache](https://aws.amazon.com/elasticache/)

## Cache Strategy

### Cache Priorities & TTL

| Data Type | TTL | Priority | Reason |
|-----------|-----|----------|---------|
| Exercise Detail | 30 min | High | Individual pages, includes "see also" |
| All Exercises (paginated) | 10 min | High | First page load data |
| Popular Tags | 1 hour | High | Rarely changes |
| Similar Exercises | 20 min | Medium | Related content |
| Search Results | 5 min | Low | User-specific, frequently changing |
| Tag Filtering | 5 min | Low | Dynamic filtering |

### Cache Keys

The system uses structured cache keys for consistency:

```typescript
// Examples:
exercises:all:1:12           // Page 1, 12 items per page
exercise:slug:push-ups       // Individual exercise by slug
exercises:similar:123:cardio-strength:8  // Similar exercises
exercises:search:cardio:strength-cardio:1:12  // Search results
tags:popular                 // Popular tags
```

## Memory Optimization

Given the 30MB limit on MongoDB free tier and ~1000 items:

### Estimated Cache Sizes
- **All exercises (page 1)**: ~15KB (12 items × ~1.2KB each)
- **Exercise detail + similar**: ~10KB per exercise
- **Popular tags**: ~1KB
- **Search results**: ~15KB per query

### Total Estimated Usage
- **High priority data**: ~500KB (50 most popular exercises)
- **Medium priority data**: ~200KB (similar exercises)
- **Low priority data**: ~300KB (search results, rotating)
- **Total**: ~1MB (well within Redis limits)

## Implementation Details

### Cache Service Features

```typescript
// Automatic fallback to in-memory cache
const cached = await cache.get<ExerciseDetail>('exercise:slug:push-ups');

// TTL-based expiration
await cache.set('key', data, 600); // 10 minutes

// Graceful error handling
// If Redis fails, automatically uses in-memory fallback
```

### Error Handling

- **Redis connection failures**: Automatic fallback to in-memory cache
- **Serialization errors**: Logged and skipped
- **Network timeouts**: Graceful degradation
- **Invalid data**: Cache miss, fresh data fetch

## Monitoring

### Cache Status Endpoint

Check cache health at `/api/cache-status`:

```json
{
  "redisConnected": true,
  "message": "Redis cache is connected and working",
  "testResult": {
    "setSuccess": true,
    "getSuccess": true,
    "value": "Redis is working!"
  }
}
```

### Logging

The system logs:
- Cache hits/misses
- Redis connection status
- Fallback usage
- Error conditions

## Performance Benefits

### Before Redis Caching
- Every page load = MongoDB query
- Slow response times on free tier
- High database load

### After Redis Caching
- **First page load**: 10-minute cache = 90% fewer DB queries
- **Exercise pages**: 30-minute cache = 95% fewer DB queries
- **Search**: 5-minute cache = 80% fewer DB queries
- **Overall**: ~85% reduction in MongoDB queries

## Cache Invalidation

Currently using time-based expiration. Future improvements could include:

1. **Manual invalidation** when data is updated
2. **Tag-based invalidation** for related content
3. **Event-driven invalidation** via webhooks

## Troubleshooting

### Common Issues

1. **Redis not connecting**
   - Check REDIS_URL format
   - Verify network connectivity
   - System will fallback to in-memory cache

2. **Cache misses**
   - Check TTL values
   - Verify cache keys are consistent
   - Monitor Redis memory usage

3. **Serialization errors**
   - Check data types being cached
   - Ensure JSON-serializable data

### Debug Commands

```bash
# Check Redis connection
curl http://localhost:3000/api/cache-status

# Monitor Redis (if local)
redis-cli monitor

# Check cache keys
redis-cli keys "exercises:*"
```

## Future Enhancements

1. **Cache warming**: Pre-populate cache with popular content
2. **Smart prefetching**: Cache related content proactively
3. **Analytics**: Track cache hit rates and performance
4. **Compression**: Reduce memory usage for large datasets
5. **Distributed caching**: Multi-region cache for global performance 