import type { Config } from "jest";

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
  maxWorkers: 1,
  // Testy na żywych usługach (Claude, Discogs, NBP) uruchamia osobno `pnpm test:live` (jest.live.config.ts).
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/live/"],
  globalSetup: "<rootDir>/src/database/test-global-setup.ts",
  setupFilesAfterEnv: ["<rootDir>/src/database/test-setup.ts"],
};

export default config;
