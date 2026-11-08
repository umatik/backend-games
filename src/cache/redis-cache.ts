import type { RedisClientType } from "redis";
import { randomUUID } from "node:crypto";
import type { Cache } from "@/cache/cache.interface.js";

/** Poza wzorcem `products:*`, żeby `clear()` nie usuwało generacji, którą właśnie ustawiło. */
const GENERATION_KEY = "cache-generation:products";
const INITIAL_GENERATION = "0";

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

  async generation(): Promise<string> {
    if (!this.client.isReady) {
      return INITIAL_GENERATION;
    }

    try {
      return (await this.client.get(GENERATION_KEY)) ?? INITIAL_GENERATION;
    } catch (error) {
      console.error("Redis GET failed for the cache generation:", error);
      return INITIAL_GENERATION;
    }
  }

  async clear(): Promise<void> {
    if (!this.client.isReady) {
      return;
    }

    try {
      // Najpierw nowa generacja: od tej chwili nikt nie czyta starych wpisów, nawet tych zapisanych z opóźnieniem.
      await this.client.set(GENERATION_KEY, randomUUID());

      // Potem sprzątanie starych wpisów (i tak wygasłyby po swoim TTL).
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
