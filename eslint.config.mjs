import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Apostrophes in JSX copy are fine in React 19.
      "react/no-unescaped-entities": "off",
      // React Compiler advisories: keep visible, don't fail CI. Server Components
      // legitimately read the clock after a dynamic access (Cache Components).
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      // Competition rule: no `any` anywhere.
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
