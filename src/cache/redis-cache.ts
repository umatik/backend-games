import type { RedisClientType } from "redis";
import type { Cache } from "./cache.interface.js";

export class RedisCache<T> implements Cache<T> {
  constructor(private readonly client: RedisClientType) {}

  async get(key: string): Promise<T | null> {
    if (!this.client.isReady) {
      return null;
    }

    try {
      const value = await this.client.get(key);

      if (value === null) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Redis GET failed for key "${key}":`, error);
      return null;
    }
  }

  async set(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!this.client.isReady) {
      return;
    }

    try {
      await this.client.set(key, JSON.stringify(value), {
        EX: ttlSeconds,
      });
    } catch (error) {
      console.error(`Redis SET failed for key "${key}":`, error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client.isReady) {
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`Redis DELETE failed for key "${key}":`, error);
    }
  }

  async clear(): Promise<void> {
    if (!this.client.isReady) {
      return;
    }

    try {
      let cursor = "0";

      do {
        const result = await this.client.scan(cursor, {
          MATCH: "products:*",
          COUNT: 100,
        });

        cursor = result.cursor;

        if (result.keys.length > 0) {
          await this.client.del(result.keys);
        }
      } while (cursor !== "0");
    } catch (error) {
      console.error("Redis CLEAR failed:", error);
    }
  }
}
