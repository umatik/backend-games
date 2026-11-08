import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Cache } from "@/cache/cache.interface.js";
import { NbpExchangeRateProvider } from "@/services/exchange-rate.service.js";

const nbpResponse = (body: unknown, ok = true) =>
  ({ ok, status: ok ? 200 : 500, json: async () => body }) as Response;

describe("NbpExchangeRateProvider", () => {
  let store: Map<string, number>;
  let cache: Cache<number>;
  let fetchFn: jest.Mock<typeof fetch>;

  beforeEach(() => {
    store = new Map();
    cache = {
      get: async (key) => store.get(key) ?? null,
      set: async (key, value) => {
        store.set(key, value);
      },
      delete: async (key) => {
        store.delete(key);
      },
      clear: async () => store.clear(),
    };
    fetchFn = jest.fn<typeof fetch>();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should fetch the rate from NBP and cache it", async () => {
    fetchFn.mockResolvedValue(nbpResponse({ rates: [{ mid: 4.2735 }] }));
    const provider = new NbpExchangeRateProvider(cache, async () => null, fetchFn);

    expect(await provider.getEurPlnRate()).toBe(4.2735);
    expect(await provider.getEurPlnRate()).toBe(4.2735);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("should fall back to the last known rate when NBP fails", async () => {
    store.set("exchange-rate:EUR:PLN:last", 4.25);
    fetchFn.mockRejectedValue(new Error("network down"));
    const provider = new NbpExchangeRateProvider(cache, async () => 4.5, fetchFn);

    expect(await provider.getEurPlnRate()).toBe(4.25);
  });

  it("should use the configured fallback rate when nothing is cached", async () => {
    fetchFn.mockResolvedValue(nbpResponse({}, false));
    const provider = new NbpExchangeRateProvider(cache, async () => 4.5, fetchFn);

    expect(await provider.getEurPlnRate()).toBe(4.5);
  });

  it("should return null when NBP sends no valid rate and there is no fallback", async () => {
    fetchFn.mockResolvedValue(nbpResponse({ rates: [{ mid: "abc" }] }));
    const provider = new NbpExchangeRateProvider(cache, async () => null, fetchFn);

    expect(await provider.getEurPlnRate()).toBeNull();
  });
});
