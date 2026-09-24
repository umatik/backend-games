import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { RedisClientType } from "redis";
import { RedisCache } from "@/cache/redis-cache.js";

describe("RedisCache", () => {
  let redisClient: jest.Mocked<RedisClientType>;
  let cache: RedisCache<string>;

  beforeEach(() => {
    redisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      scan: jest.fn(),
      isReady: true,
    } as unknown as jest.Mocked<RedisClientType>;

    cache = new RedisCache(redisClient);
  });

  it("should return null for missing key", async () => {
    redisClient.get.mockResolvedValue(null);

    const result = await cache.get("foo");

    expect(result).toBeNull();
    expect(redisClient.get).toHaveBeenCalledWith("foo");
  });

  it("should return parsed value", async () => {
    redisClient.get.mockResolvedValue(JSON.stringify("bar"));

    const result = await cache.get("foo");

    expect(result).toBe("bar");
    expect(redisClient.get).toHaveBeenCalledWith("foo");
  });

  it("should store value with TTL", async () => {
    redisClient.set.mockResolvedValue("OK");

    await cache.set("foo", "bar", 60);

    expect(redisClient.set).toHaveBeenCalledWith("foo", JSON.stringify("bar"), {
      EX: 60,
    });
  });

  it("should delete value", async () => {
    redisClient.del.mockResolvedValue(1);

    await cache.delete("foo");

    expect(redisClient.del).toHaveBeenCalledWith("foo");
  });

  it("should clear cache", async () => {
    redisClient.scan.mockResolvedValue({
      cursor: "0",
      keys: [],
    });

    await cache.clear();

    expect(redisClient.scan).toHaveBeenCalledWith("0", {
      MATCH: "products:*",
      COUNT: 100,
    });

    expect(redisClient.del).not.toHaveBeenCalled();
  });
});
