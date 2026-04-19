import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis | null = null;
  private readonly isEnabled: boolean;
  private readonly coalescingMap = new Map<string, Promise<any>>();

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST');
    const port = Number(this.configService.get<number | string>('REDIS_PORT', 6379));
    
    this.isEnabled = !!host;

    if (this.isEnabled) {
      try {
        this.redis = new Redis({
          host,
          port,
          password: this.configService.get<string>('REDIS_PASSWORD'),
          retryStrategy: (times) => {
            const delay = Math.min(times * 100, 3000);
            return delay;
          },
          maxRetriesPerRequest: 3,
        });

        this.redis.on('error', (err: any) => {
          this.logger.error(`Redis Error: ${err?.message || err}`);
        });

        this.redis.on('connect', () => {
          this.logger.log('Successfully connected to Redis');
        });
      } catch (error: any) {
        this.logger.error(`Failed to initialize Redis client: ${error?.message || error}`);
        this.redis = null;
      }
    } else {
      this.logger.warn('Redis is not configured (REDIS_HOST missing). Caching is disabled.');
    }
  }

  onModuleInit() {
    // Initialization handled in constructor
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;

    try {
      const data = await this.redis.get(key);
      if (!data) return null;
      
      this.logger.debug(`Cache HIT: ${key}`);
      return JSON.parse(data) as T;
    } catch (error: any) {
      this.logger.warn(`Failed to GET from Redis: ${error?.message || error}`);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    if (!this.redis) return;

    try {
      // Add ±15% jitter to TTL
      const jitter = 0.85 + Math.random() * 0.3;
      const finalTtl = Math.floor(ttlSeconds * jitter);
      
      const serialized = JSON.stringify(value);
      await this.redis.set(key, serialized, 'EX', finalTtl);
      this.logger.debug(`Cache SET: ${key} (TTL: ${finalTtl}s)`);
    } catch (error: any) {
      this.logger.warn(`Failed to SET in Redis: ${error?.message || error}`);
    }
  }

  /**
   * Delete specific key
   */
  async del(key: string): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.del(key);
      this.logger.debug(`Cache DEL: ${key}`);
    } catch (error: any) {
      this.logger.warn(`Failed to DEL from Redis: ${error?.message || error}`);
    }
  }

  /**
   * Delete keys matching a pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.redis) return;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`Cache Invalidate Pattern (${pattern}): Deleted ${keys.length} keys`);
      }
    } catch (error: any) {
      this.logger.warn(`Failed to invalidate pattern ${pattern}: ${error?.message || error}`);
    }
  }

  /**
   * Wrap a function with caching logic (Cache-Aside + Coalescing)
   */
  async wrap<T>(key: string, ttlSeconds: number, fetchFn: () => Promise<T>): Promise<T> {
    // 1. Check cache first
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    // 2. Cache miss - check if another request is already fetching this key
    if (this.coalescingMap.has(key)) {
      this.logger.debug(`Cache Coalescing: Waiting for ${key}`);
      const coalesced = this.coalescingMap.get(key);
      if (coalesced) return coalesced;
    }

    // 3. Fetch from original source
    this.logger.debug(`Cache MISS: ${key}. Fetching from source...`);
    const fetchPromise = fetchFn()
      .then(async (result) => {
        // Only cache if not null/undefined
        if (result !== undefined && result !== null) {
          await this.set(key, result, ttlSeconds);
        }
        return result;
      })
      .finally(() => {
        this.coalescingMap.delete(key);
      });

    this.coalescingMap.set(key, fetchPromise);
    return fetchPromise;
  }
}
