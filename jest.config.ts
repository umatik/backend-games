import type {Config} from "jest";

const config: Config = {
  testEnvironment: "node",

  extensionsToTreatAsEsm: [".ts"],

  transform: {
    "^.+\\.tsx?$": ["ts-jest", {useESM: true}],
  },

  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },

  maxWorkers: 1,

  setupFilesAfterEnv: ["<rootDir>/src/database/test-setup.ts"],
};

export default config;