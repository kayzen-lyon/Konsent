// Configuration ESLint plate (ESLint 9). Les préréglages Next sont encore
// publiés au format « eslintrc » : FlatCompat les traduit.
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "mcp/**",
      "worker/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // VAGUE 3 — TEMPORAIRE. Erreurs réelles relevées à l'introduction
    // d'ESLint, rétrogradées en avertissement pour ne pas toucher au code
    // applicatif dans la même vague. À corriger, puis repasser en "error" :
    //   - app/mentions-legales/page.tsx:155 <a href="/cookies"> -> <Link>
    //     (@next/next/no-html-link-for-pages)
    //   - app/outils/decodeur-tcf/page.tsx (4 apostrophes, vers l. 26-32)
    //     droites non échappées en JSX (react/no-unescaped-entities)
    rules: {
      "@next/next/no-html-link-for-pages": "error",
      "react/no-unescaped-entities": "error",
    },
  },
];

export default config;
