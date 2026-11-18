import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/**", "tmp/**", "src/generated/**"] },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-unused-vars": ["error", { argsIgnorePattern: "^_|^next$|^req$|^res$", ignoreRestSiblings: true }],
    },
  },
];
