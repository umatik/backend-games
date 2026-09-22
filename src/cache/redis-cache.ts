import type {RedisClientType} from "redis";
import type {Cache} from "./cache.interface.js";

export class RedisCache<T> implements Cache<T> {
  constructor(
    private readonly client: RedisClientType,
  ) {
  }

  async get(key: string): Promise<T | null> {
    const value = await this.client.get(key);

    if (value === null) {
      return null;
    }

    return JSON.parse(value) as T;
  }

  async set(
    key: string,
    value: T,
    ttlSeconds: number,
  ): Promise<void> {
    await this.client.set(
      key,
      JSON.stringify(value),
      {
        EX: ttlSeconds,
      },
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async clear(): Promise<void> {
    await this.client.flushDb();
  }
}