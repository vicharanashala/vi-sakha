import Redis from "ioredis";
import { loadPlatformConfig } from "@visakha/config";
import { createLogger } from "@visakha/shared-utils";
import type { 
  MemoryStore, 
  ShortTermMemoryEntry, 
  MemoryQuery, 
  MemoryScope 
} from "@visakha/shared-types";

const log = createLogger("redis-session-store");

/**
 * Redis Session Store
 * 
 * Implements Short-Term Memory Tier using Redis.
 * Stores active conversation state with TTL.
 */
export class RedisSessionStore implements MemoryStore<ShortTermMemoryEntry> {
  private redis: Redis;
  private config = loadPlatformConfig();

  constructor() {
    const { database } = this.config;
    this.redis = new Redis({
      host: database.redisHost,
      port: database.redisPort,
      password: database.redisPassword,
      keyPrefix: "visakha:session:",
    });

    this.redis.on("error", (err) => log.error("Redis connection error", { error: err.message }));
  }

  /**
   * Save an active session entry.
   */
  async save(entry: ShortTermMemoryEntry): Promise<void> {
    const key = this.buildKey(entry.scope);
    const ttl = entry.ttlSeconds || this.config.memory.shortTermTtlSeconds;
    
    log.debug("Saving session memory", { key, ttl });
    
    await this.redis.set(
      key, 
      JSON.stringify(entry), 
      "EX", 
      ttl
    );
  }

  /**
   * Retrieve session memory.
   * Short-term memory is usually retrieved by sessionId.
   */
  async retrieve(query: MemoryQuery): Promise<ShortTermMemoryEntry[]> {
    const key = this.buildKey(query.scope);
    log.debug("Retrieving session memory", { key });

    const data = await this.redis.get(key);
    if (!data) return [];

    try {
      return [JSON.parse(data) as ShortTermMemoryEntry];
    } catch (error) {
      log.error("Failed to parse session memory", { key, error: (error as Error).message });
      return [];
    }
  }

  /**
   * Delete session memory.
   */
  async delete(id: string): Promise<void> {
    // In Redis store, id is usually the key or part of it
    await this.redis.del(id);
  }

  /**
   * Clear session memory for a scope.
   */
  async clear(scope: MemoryScope): Promise<void> {
    const key = this.buildKey(scope);
    await this.redis.del(key);
  }

  /**
   * Build Redis key from scope.
   */
  private buildKey(scope: MemoryScope): string {
    if (scope.sessionId) return `sid:${scope.sessionId}`;
    if (scope.conversationId) return `cid:${scope.conversationId}`;
    if (scope.userId) return `uid:${scope.userId}`;
    return "global";
  }

  /**
   * Helper to append a message to the session sliding window.
   */
  async appendMessage(scope: MemoryScope, message: { role: 'user' | 'assistant', content: string }): Promise<void> {
    const entries = await this.retrieve({ scope, limit: 1 });
    let entry: ShortTermMemoryEntry;

    if (entries.length === 0) {
      entry = {
        id: Math.random().toString(36).substring(7),
        type: 'short_term',
        content: '',
        scope,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
        ttlSeconds: this.config.memory.shortTermTtlSeconds,
        messages: [],
        activeContext: ''
      };
    } else {
      entry = entries[0];
    }

    entry.messages.push({ ...message, timestamp: new Date() });
    
    // Slide window
    if (entry.messages.length > this.config.memory.maxShortTermMessages) {
      entry.messages = entry.messages.slice(-this.config.memory.maxShortTermMessages);
    }

    entry.updatedAt = new Date();
    await this.save(entry);
  }
}
