import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import type {Linter} from "eslint";

const config: Linter.Config[] = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    languageOptions: {
      globals: globals.node,
    },
  },
];

export default config;