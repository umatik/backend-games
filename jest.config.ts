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
  globalSetup: "<rootDir>/src/database/test-global-setup.ts",
  setupFilesAfterEnv: ["<rootDir>/src/database/test-setup.ts"],
};

export default config;
