import type { Config } from "jest";

/**
 * Testy na prawdziwych usługach: Claude, Discogs i NBP. Używają kluczy z `.env`, kosztują ułamek centa
 * i nie dotykają bazy danych. Uruchamiane ręcznie: `pnpm test:live`.
 */
const config: Config = {
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { useESM: true }],
  },
  moduleNameMapper: {
    "^@/(.*)\\.js$": "<rootDir>/src/$1",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testMatch: ["<rootDir>/live/**/*.live.test.ts"],
  maxWorkers: 1,
  testTimeout: 90_000,
};

export default config;
