import {describe, expect, it, jest, beforeEach, afterEach} from "@jest/globals";
import {InMemoryCache} from "./in-memory-cache.js";

describe("InMemoryCache", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should return null for missing key", () => {
    const cache = new InMemoryCache<string>();

    expect(cache.get("foo")).toBeNull();
  });

  it("should store and return value", () => {
    const cache = new InMemoryCache<string>();

    cache.set("foo", "bar", 60);

    expect(cache.get("foo")).toBe("bar");
  });

  it("should return null after TTL expires", () => {
    const cache = new InMemoryCache<string>();

    cache.set("foo", "bar", 1);

    jest.advanceTimersByTime(1000);

    expect(cache.get("foo")).toBeNull();
  });

  it("should delete value", () => {
    const cache = new InMemoryCache<string>();

    cache.set("foo", "bar", 60);
    cache.delete("foo");

    expect(cache.get("foo")).toBeNull();
  });

  it("should clear all values", () => {
    const cache = new InMemoryCache<string>();

    cache.set("foo", "bar", 60);
    cache.set("baz", "qux", 60);

    cache.clear();

    expect(cache.get("foo")).toBeNull();
    expect(cache.get("baz")).toBeNull();
  });
});