import type {Cache} from "@/cache/cache.interface.js";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

// Currently unused.
// Dependency injection uses RedisCache in all environments.
// Kept as a lightweight cache implementation for potential future use.
export class InMemoryCache<T> implements Cache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();

  async get(key: string): Promise<T | null> {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(
    key: string,
    value: T,
    ttlSeconds: number,
  ): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}