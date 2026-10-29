import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/**", "drizzle/**"] },
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: globals.node },
    // Legacy unused imports/args are reported as warnings;
    // real defects (no-undef, case declarations, ...) stay errors.
    rules: { "no-unused-vars": ["warn", { argsIgnorePattern: "^_|^next$", caughtErrors: "none" }] },
  },
];
