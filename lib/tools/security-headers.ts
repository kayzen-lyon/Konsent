/**
 * Évaluation des en-têtes de sécurité HTTP d'une réponse.
 *
 * Module pur, sans accès réseau : la route `/api/outils/en-tetes` récupère
 * les en-têtes (via `safeFetch`, protection SSRF) puis délègue ici. Le même
 * module peut ainsi être testé sur des en-têtes figés.
 *
 * Les notes sont volontairement simples et explicables : chaque note est
 * accompagnée de sa raison et d'une valeur corrigée à recopier. Un en-tête
 * de sécurité ne rend pas un site conforme au RGPD ; son absence n'est pas
 * en soi un manquement. Il participe en revanche à l'obligation de sécurité
 * de l'article 32 du RGPD, que la CNIL apprécie au cas par cas.
 */

export type Grade = "A" | "B" | "C" | "D" | "E" | "F";

export interface HeaderCheck {
  id: string;
  label: string;
  /** En-tête(s) examiné(s). */
  header: string;
  /** Valeur reçue, ou null si absente. */
  value: string | null;
  grade: Grade;
  /** Constat en une ou deux phrases. */
  finding: string;
  /** Ligne d'en-tête recommandée, à recopier. */
  recommended: string;
  weight: number;
}

export interface CookieCheck {
  name: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string | null;
  grade: Grade;
  issues: string[];
}

export interface HeadersReport {
  https: boolean;
  grade: Grade;
  /** Score sur 100, moyenne pondérée des notes. */
  score: number;
  checks: HeaderCheck[];
  cookies: CookieCheck[];
}

const POINTS: Record<Grade, number> = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };
const ORDER: readonly Grade[] = ["A", "B", "C", "D", "E", "F"];

function worst(grades: readonly Grade[]): Grade {
  let w: Grade = "A";
  for (const g of grades) if (ORDER.indexOf(g) > ORDER.indexOf(w)) w = g;
  return w;
}

function gradeFromScore(points: number): Grade {
  if (points >= 4.5) return "A";
  if (points >= 3.5) return "B";
  if (points >= 2.5) return "C";
  if (points >= 1.5) return "D";
  if (points >= 0.75) return "E";
  return "F";
}

/** Directives d'une politique CSP, noms en minuscules. */
export function parseCsp(value: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const part of value.split(";")) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    const name = tokens.shift()?.toLowerCase();
    if (!name || out.has(name)) continue;
    out.set(name, tokens);
  }
  return out;
}

const REC = {
  hsts: "Strict-Transport-Security: max-age=63072000; includeSubDomains; preload",
  csp: "Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{aléa}' 'strict-dynamic'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'; upgrade-insecure-requests",
  xcto: "X-Content-Type-Options: nosniff",
  frame: "Content-Security-Policy: frame-ancestors 'self'  (et, pour les anciens navigateurs, X-Frame-Options: SAMEORIGIN)",
  referrer: "Referrer-Policy: strict-origin-when-cross-origin",
  permissions:
    "Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  coop: "Cross-Origin-Opener-Policy: same-origin",
  corp: "Cross-Origin-Resource-Policy: same-origin",
  cookie: "Set-Cookie: nom=valeur; Path=/; Secure; HttpOnly; SameSite=Lax",
} as const;

function checkHsts(value: string | null, https: boolean): HeaderCheck {
  const base = {
    id: "hsts",
    label: "Connexion HTTPS imposée (HSTS)",
    header: "Strict-Transport-Security",
    value,
    recommended: REC.hsts,
    weight: 3,
  };
  if (!https) {
    return {
      ...base,
      grade: "F",
      finding:
        "La page est servie en HTTP non chiffré : les échanges, cookies compris, circulent en clair. Servez le site en HTTPS et redirigez tout le trafic HTTP.",
    };
  }
  if (!value) {
    return {
      ...base,
      grade: "F",
      finding:
        "En-tête absent : un visiteur qui saisit l'adresse sans « https:// » peut être intercepté avant la redirection.",
    };
  }
  const maxAge = Number(/max-age\s*=\s*"?(\d+)/i.exec(value)?.[1] ?? NaN);
  const sub = /includesubdomains/i.test(value);
  if (!Number.isFinite(maxAge) || maxAge <= 0) {
    return { ...base, grade: "F", finding: "Directive max-age absente ou nulle : HSTS est désactivé." };
  }
  if (maxAge < 15_768_000) {
    return {
      ...base,
      grade: "C",
      finding: `Durée trop courte (${Math.round(maxAge / 86400)} jours) : au moins six mois, idéalement un an ou plus.`,
    };
  }
  if (maxAge < 31_536_000) {
    return { ...base, grade: "B", finding: "Durée correcte mais inférieure à un an, valeur généralement recommandée." };
  }
  if (!sub) {
    return {
      ...base,
      grade: "B",
      finding: "Durée suffisante, mais les sous-domaines ne sont pas couverts (includeSubDomains absent).",
    };
  }
  return { ...base, grade: "A", finding: "HTTPS imposé pour au moins un an, sous-domaines compris." };
}

function sourceList(csp: Map<string, string[]>, directive: string): string[] | null {
  return csp.get(directive) ?? csp.get("default-src") ?? null;
}

function checkCsp(value: string | null, reportOnly: string | null): HeaderCheck {
  const base = {
    id: "csp",
    label: "Politique de sécurité du contenu (CSP)",
    header: "Content-Security-Policy",
    value: value ?? (reportOnly ? `(Report-Only) ${reportOnly}` : null),
    recommended: REC.csp,
    weight: 3,
  };
  if (!value) {
    return {
      ...base,
      grade: reportOnly ? "D" : "F",
      finding: reportOnly
        ? "Politique en mode « Report-Only » uniquement : elle signale les violations sans rien bloquer."
        : "En-tête absent : rien ne limite les scripts exécutables, ni les destinations vers lesquelles la page peut envoyer des données. C'est aussi ce qui permettrait de bloquer techniquement un traceur non déclaré.",
    };
  }
  const csp = parseCsp(value);
  const scripts = sourceList(csp, "script-src");
  const issues: string[] = [];
  let grade: Grade = "A";
  const lower = (g: Grade) => {
    grade = worst([grade, g]);
  };

  if (!scripts) {
    lower("D");
    issues.push("ni script-src ni default-src : les scripts ne sont pas restreints");
  } else {
    const hasNonceOrHash = scripts.some((s) => /^'(nonce|sha256|sha384|sha512)-/i.test(s));
    const strictDynamic = scripts.includes("'strict-dynamic'");
    if (scripts.includes("'unsafe-inline'") && !hasNonceOrHash) {
      lower("C");
      issues.push("'unsafe-inline' sans nonce ni empreinte annule l'essentiel de la protection");
    }
    if (scripts.includes("'unsafe-eval'")) {
      lower("C");
      issues.push("'unsafe-eval' autorise l'évaluation de chaînes comme du code");
    }
    if (!strictDynamic && scripts.some((s) => s === "*" || s === "https:" || s === "http:" || s === "data:")) {
      lower("D");
      issues.push("source joker (*, https:, data:) : n'importe quel script peut être chargé");
    }
  }
  const objects = sourceList(csp, "object-src");
  if (!objects || !objects.includes("'none'")) {
    lower("B");
    issues.push("object-src 'none' absent");
  }
  if (!csp.has("base-uri")) {
    lower("B");
    issues.push("base-uri absent");
  }

  return {
    ...base,
    grade,
    finding:
      issues.length === 0
        ? "Politique présente et restrictive pour les scripts."
        : `Politique présente, à resserrer : ${issues.join(" ; ")}.`,
  };
}

function checkXcto(value: string | null): HeaderCheck {
  const ok = value !== null && value.trim().toLowerCase() === "nosniff";
  return {
    id: "xcto",
    label: "Interdiction de deviner le type de contenu",
    header: "X-Content-Type-Options",
    value,
    grade: ok ? "A" : "F",
    finding: ok
      ? "Le navigateur respecte le type déclaré des fichiers."
      : value
        ? "Valeur non reconnue : seule « nosniff » a un effet."
        : "En-tête absent : un fichier téléversé pourrait être interprété comme un script.",
    recommended: REC.xcto,
    weight: 1,
  };
}

function checkFraming(xfo: string | null, csp: string | null): HeaderCheck {
  const ancestors = csp ? parseCsp(csp).get("frame-ancestors") : undefined;
  const base = {
    id: "frame",
    label: "Protection contre l'intégration en cadre",
    header: "CSP frame-ancestors / X-Frame-Options",
    value:
      [ancestors ? `frame-ancestors ${ancestors.join(" ")}` : null, xfo ? `X-Frame-Options: ${xfo}` : null]
        .filter(Boolean)
        .join(" · ") || null,
    recommended: REC.frame,
    weight: 2,
  };
  if (ancestors) {
    const open = ancestors.some((s) => s === "*" || s === "https:" || s === "http:");
    return {
      ...base,
      grade: open ? "D" : "A",
      finding: open
        ? "frame-ancestors autorise n'importe quel site à intégrer la page."
        : ancestors.includes("'none'")
          ? "Aucun site, pas même le vôtre, ne peut intégrer la page dans un cadre."
          : "Seuls les sites listés peuvent intégrer la page dans un cadre.",
    };
  }
  const v = xfo?.trim().toUpperCase() ?? "";
  if (v === "DENY" || v === "SAMEORIGIN") {
    return {
      ...base,
      grade: "B",
      finding:
        "Protection assurée par X-Frame-Options, en-tête historique. La directive CSP frame-ancestors est la forme actuelle.",
    };
  }
  if (v.startsWith("ALLOW-FROM")) {
    return {
      ...base,
      grade: "D",
      finding: "ALLOW-FROM n'est plus pris en charge par les navigateurs : la page n'est en pratique pas protégée.",
    };
  }
  return {
    ...base,
    grade: "F",
    finding:
      "Aucune protection : un site tiers peut afficher la page dans un cadre invisible et piéger les clics (clickjacking), y compris sur un bandeau de consentement.",
  };
}

function checkReferrer(value: string | null): HeaderCheck {
  const base = {
    id: "referrer",
    label: "Adresse transmise aux sites tiers",
    header: "Referrer-Policy",
    value,
    recommended: REC.referrer,
    weight: 1,
  };
  if (!value) {
    return {
      ...base,
      grade: "C",
      finding:
        "En-tête absent : les navigateurs récents appliquent par défaut strict-origin-when-cross-origin, mais rien ne le garantit pour les autres. Mieux vaut le déclarer.",
    };
  }
  // Plusieurs valeurs possibles : le navigateur retient la dernière qu'il comprend.
  const known = [
    "no-referrer",
    "same-origin",
    "strict-origin",
    "strict-origin-when-cross-origin",
    "origin",
    "origin-when-cross-origin",
    "no-referrer-when-downgrade",
    "unsafe-url",
  ];
  const policy = value
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => known.includes(s))
    .pop();
  if (!policy) return { ...base, grade: "C", finding: "Valeur non reconnue : le comportement par défaut s'applique." };
  if (policy === "unsafe-url") {
    return {
      ...base,
      grade: "F",
      finding:
        "unsafe-url transmet l'adresse complète, paramètres compris, à chaque site appelé : identifiants de session ou adresses e-mail présents dans l'URL peuvent fuiter.",
    };
  }
  if (["origin", "origin-when-cross-origin", "no-referrer-when-downgrade"].includes(policy)) {
    return {
      ...base,
      grade: "C",
      finding:
        policy === "no-referrer-when-downgrade"
          ? "L'adresse complète est transmise à tout site tiers en HTTPS."
          : "Seule l'origine est transmise, mais aussi lors d'un passage de HTTPS à HTTP.",
    };
  }
  return { ...base, grade: "A", finding: "Les sites tiers ne reçoivent au plus que l'origine, jamais le chemin." };
}

function checkPermissions(value: string | null): HeaderCheck {
  const base = {
    id: "permissions",
    label: "Fonctions sensibles du navigateur",
    header: "Permissions-Policy",
    value,
    recommended: REC.permissions,
    weight: 1,
  };
  if (!value) {
    return {
      ...base,
      grade: "D",
      finding:
        "En-tête absent : tout script tiers chargé par la page peut solliciter caméra, micro ou géolocalisation.",
    };
  }
  const sensitive = ["camera", "microphone", "geolocation", "payment", "usb"];
  const wide = sensitive.filter((f) => new RegExp(`(^|,)\\s*${f}\\s*=\\s*\\*`, "i").test(value));
  if (wide.length > 0) {
    return { ...base, grade: "C", finding: `Fonctions ouvertes à toute origine : ${wide.join(", ")}.` };
  }
  return { ...base, grade: "A", finding: "Les fonctions sensibles sont explicitement encadrées." };
}

function checkCoop(value: string | null): HeaderCheck {
  const v = value?.trim().toLowerCase() ?? "";
  const grade: Grade = v === "same-origin" ? "A" : v === "same-origin-allow-popups" ? "B" : "D";
  return {
    id: "coop",
    label: "Isolement de la fenêtre (COOP)",
    header: "Cross-Origin-Opener-Policy",
    value,
    grade,
    finding:
      grade === "A"
        ? "La page ne partage pas son contexte avec les fenêtres d'autres origines."
        : grade === "B"
          ? "Isolement partiel, compatible avec les fenêtres de paiement ou de connexion."
          : "Une fenêtre ouverte depuis un autre site garde une référence à la page.",
    recommended: REC.coop,
    weight: 1,
  };
}

function checkCorp(value: string | null): HeaderCheck {
  const v = value?.trim().toLowerCase() ?? "";
  const grade: Grade = v === "same-origin" || v === "same-site" ? "A" : v === "cross-origin" ? "C" : "D";
  return {
    id: "corp",
    label: "Chargement par d'autres sites (CORP)",
    header: "Cross-Origin-Resource-Policy",
    value,
    grade,
    finding:
      grade === "A"
        ? "La ressource ne peut être chargée que par le même site."
        : grade === "C"
          ? "Chargement explicitement autorisé depuis n'importe quel site."
          : "En-tête absent : à poser au moins sur les réponses contenant des données personnelles.",
    recommended: REC.corp,
    weight: 1,
  };
}

const SENSITIVE_COOKIE = /sess|sid|auth|token|jwt|login|connect/i;

export function parseSetCookie(line: string): Omit<CookieCheck, "grade" | "issues"> | null {
  const parts = line.split(";").map((p) => p.trim());
  const first = parts.shift();
  if (!first) return null;
  const eq = first.indexOf("=");
  const name = (eq >= 0 ? first.slice(0, eq) : first).trim();
  if (!name) return null;
  let secure = false;
  let httpOnly = false;
  let sameSite: string | null = null;
  for (const p of parts) {
    const [k, v] = p.split("=").map((s) => s.trim());
    const key = (k ?? "").toLowerCase();
    if (key === "secure") secure = true;
    else if (key === "httponly") httpOnly = true;
    else if (key === "samesite") sameSite = v ? v.charAt(0).toUpperCase() + v.slice(1).toLowerCase() : "";
  }
  return { name: name.slice(0, 120), secure, httpOnly, sameSite };
}

export function checkCookie(c: Omit<CookieCheck, "grade" | "issues">, https: boolean): CookieCheck {
  const issues: string[] = [];
  const grades: Grade[] = ["A"];
  if (c.sameSite === "None" && !c.secure) {
    grades.push("F");
    issues.push("SameSite=None sans Secure : rejeté par les navigateurs récents");
  }
  if (https && !c.secure) {
    grades.push("D");
    issues.push("attribut Secure absent : le cookie peut partir en clair sur une connexion HTTP");
  }
  if (!c.httpOnly) {
    const sensitive = SENSITIVE_COOKIE.test(c.name);
    grades.push(sensitive ? "D" : "C");
    issues.push(
      sensitive
        ? "HttpOnly absent sur un cookie qui semble porter une session : lisible par tout script de la page"
        : "HttpOnly absent : à ajouter sauf si le cookie doit être lu par JavaScript",
    );
  }
  if (!c.sameSite) {
    grades.push("C");
    issues.push("SameSite absent : le comportement dépend du navigateur");
  }
  return { ...c, grade: worst(grades), issues };
}

function checkCookies(cookies: CookieCheck[]): HeaderCheck {
  const base = {
    id: "cookies",
    label: "Attributs des cookies déposés",
    header: "Set-Cookie",
    value: cookies.length ? cookies.map((c) => c.name).join(", ") : null,
    recommended: REC.cookie,
    weight: 2,
  };
  if (cookies.length === 0) {
    return {
      ...base,
      grade: "A",
      finding:
        "La réponse ne dépose aucun cookie. Cela ne dit rien des cookies posés ensuite par des scripts : seul un audit complet les observe.",
    };
  }
  const grade = worst(cookies.map((c) => c.grade));
  const flawed = cookies.filter((c) => c.grade !== "A").length;
  return {
    ...base,
    grade,
    finding:
      flawed === 0
        ? `${cookies.length} cookie${cookies.length > 1 ? "s" : ""} déposé${cookies.length > 1 ? "s" : ""}, tous avec Secure, HttpOnly et SameSite.`
        : `${flawed} cookie${flawed > 1 ? "s" : ""} sur ${cookies.length} à corriger (détail ci-dessous).`,
  };
}

/** Évalue les en-têtes reçus. `get` lit un en-tête insensible à la casse. */
export function evaluateHeaders(
  get: (name: string) => string | null,
  setCookies: readonly string[],
  https: boolean,
): HeadersReport {
  const csp = get("content-security-policy");
  const cookies = setCookies
    .map(parseSetCookie)
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .slice(0, 50)
    .map((c) => checkCookie(c, https));

  const checks = [
    checkHsts(get("strict-transport-security"), https),
    checkCsp(csp, get("content-security-policy-report-only")),
    checkXcto(get("x-content-type-options")),
    checkFraming(get("x-frame-options"), csp),
    checkReferrer(get("referrer-policy")),
    checkPermissions(get("permissions-policy")),
    checkCoop(get("cross-origin-opener-policy")),
    checkCorp(get("cross-origin-resource-policy")),
    checkCookies(cookies),
  ];

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const points = checks.reduce((s, c) => s + POINTS[c.grade] * c.weight, 0) / totalWeight;

  return {
    https,
    grade: gradeFromScore(points),
    score: Math.round((points / 5) * 100),
    checks,
    cookies,
  };
}
