import dotenv from "dotenv";

/**
 * Jedno miejsce ładowania konfiguracji: w testach wyłącznie `.env.test`, w pozostałych trybach `.env`.
 * Dzięki temu testy nie widzą prawdziwych kluczy (np. ANTHROPIC_API_KEY) wpisanych w `.env`.
 * Importowane jako pierwszy moduł w `app.ts` i w `db.ts`.
 */
const isTest = process.env.NODE_ENV === "test";

dotenv.config({
  path: isTest ? ".env.test" : ".env",
  override: isTest,
  quiet: true,
});
