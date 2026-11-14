import type { NextConfig } from "next";

/**
 * Konsent applique à lui-même ce qu'il audite (§14.1 du PRD) :
 * aucun traceur tiers, en-têtes de sécurité stricts, aucune ressource externe.
 * Objectif affiché : 100/100 sur son propre scanner, sans bandeau cookies.
 */
const isDev = process.env.NODE_ENV === "development";

/**
 * `script-src` en développement uniquement.
 *
 * Le rechargement à chaud de Next évalue du code sous forme de chaîne. La CSP
 * de production le refuse — à juste titre — et l'hydratation échoue donc en
 * local : aucun composant client n'y est testable, en silence. Le défaut est
 * coûteux parce qu'il ne se voit pas ; le formulaire s'affiche, il ne réagit
 * simplement jamais.
 *
 * `unsafe-eval` est donc concédé au seul serveur de développement. En
 * production, la directive reste inchangée — et c'est vérifié par
 * `scripts/check-csp.mjs`, pour qu'une concession de confort ne parte jamais
 * en ligne.
 */
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // RFC 9116 : security.txt est attendu sous /.well-known/, dossier que
  // l'App Router ne sert pas. La route vit en /securite.txt.
  async rewrites() {
    return [{ source: "/.well-known/security.txt", destination: "/securite.txt" }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
