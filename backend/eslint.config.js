import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules/**", "drizzle/**"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: { globals: globals.node },
    // Legacy unused imports/args are reported as warnings; real defects stay errors.
    rules: { "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_|^next$", caughtErrors: "none" }] },
  },
);
