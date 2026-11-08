import type { Cache } from "@/cache/cache.interface.js";

/** Źródło kursu EUR → PLN. `null`, gdy kursu nie da się ustalić. */
export interface ExchangeRateProvider {
  getEurPlnRate(): Promise<number | null>;
}

/** Stały kurs, np. w testach albo przy pracy offline (`EUR_PLN_RATE`). */
export class FixedExchangeRateProvider implements ExchangeRateProvider {
  constructor(private readonly rate: number) {}

  async getEurPlnRate(): Promise<number> {
    return this.rate;
  }
}

const NBP_EUR_URL = "https://api.nbp.pl/api/exchangerates/rates/A/EUR/?format=json";
const RATE_KEY = "exchange-rate:EUR:PLN";
const LAST_RATE_KEY = "exchange-rate:EUR:PLN:last";
const RATE_TTL_SECONDS = 6 * 60 * 60;
const LAST_RATE_TTL_SECONDS = 30 * 24 * 60 * 60;

type NbpResponse = { rates?: { mid?: unknown }[] };

/**
 * Średni kurs NBP (tabela A). Kurs trzymamy w cache przez 6 godzin; jeśli NBP nie odpowiada, używamy ostatniego
 * znanego kursu (do 30 dni), a w ostateczności `fallbackRate`.
 */
export class NbpExchangeRateProvider implements ExchangeRateProvider {
  constructor(
    private readonly cache: Cache<number>,
    private readonly fallbackRate: number | null = null,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async getEurPlnRate(): Promise<number | null> {
    const cached = await this.cache.get(RATE_KEY);

    if (cached !== null) {
      return cached;
    }

    try {
      const response = await this.fetchFn(NBP_EUR_URL, {
        signal: AbortSignal.timeout(3000),
      });

      if (!response.ok) {
        throw new Error(`NBP responded with ${response.status}`);
      }

      const body = (await response.json()) as NbpResponse;
      const rate = body.rates?.[0]?.mid;

      if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
        throw new Error("NBP response has no valid rate");
      }

      await this.cache.set(RATE_KEY, rate, RATE_TTL_SECONDS);
      await this.cache.set(LAST_RATE_KEY, rate, LAST_RATE_TTL_SECONDS);

      return rate;
    } catch (error) {
      console.error("Failed to fetch EUR/PLN rate from NBP:", error);

      return (await this.cache.get(LAST_RATE_KEY)) ?? this.fallbackRate;
    }
  }
}

/**
 * Cena w groszach, zaokrąglona w górę do pełnych złotych (1500 eurocentów × 4,2735 → 6500 gr = 65 zł).
 * Najpierw zaokrąglamy do pełnych groszy, żeby błąd liczb zmiennoprzecinkowych nie podniósł ceny o złotówkę.
 */
export const convertEurToPln = (priceEur: number, rate: number): number =>
  Math.ceil(Math.round(priceEur * rate) / 100) * 100;
