import { Redis } from 'ioredis';
import { config } from './env';
import { logger } from '../utils/logger';

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null, // Required for BullMQ
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  logger.info('✅ Redis connected');
});

redis.on('error', (err) => {
  logger.error('❌ Redis connection error:', err);
});

// Pub/Sub clients for Socket.IO (separate connections)
export const redisPub = new Redis(config.redisUrl);
export const redisSub = new Redis(config.redisUrl);