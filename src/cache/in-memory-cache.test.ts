import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import {InMemoryCache} from "./in-memory-cache.js";

describe("InMemoryCache", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should return null for missing key", async () => {
    const cache = new InMemoryCache<string>();

    expect(await cache.get("foo")).toBeNull();
  });

  it("should store and return value", async () => {
    const cache = new InMemoryCache<string>();

    await cache.set("foo", "bar", 60);

    expect(await cache.get("foo")).toBe("bar");
  });

  it("should return null after TTL expires", async () => {
    const cache = new InMemoryCache<string>();

    await cache.set("foo", "bar", 1);

    jest.advanceTimersByTime(1000);

    expect(await cache.get("foo")).toBeNull();
  });

  it("should delete value", async () => {
    const cache = new InMemoryCache<string>();

    await cache.set("foo", "bar", 60);
    await cache.delete("foo");

    expect(await cache.get("foo")).toBeNull();
  });

  it("should clear all values", async () => {
    const cache = new InMemoryCache<string>();

    await cache.set("foo", "bar", 60);
    await cache.set("baz", "qux", 60);

    await cache.clear();

    expect(await cache.get("foo")).toBeNull();
    expect(await cache.get("baz")).toBeNull();
  });
});