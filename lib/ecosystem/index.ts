import fallback from "./ecosystem.fallback.json";

/**
 * Écosystème KAYZEN : la liste des applications vient d'un seul fichier,
 * publié par kayzen-lyon.com. Il est lu côté serveur (au build, puis
 * revalidé une fois par jour), jamais dans le navigateur du visiteur : la
 * CSP de Konsent n'autorise aucune requête tierce, et c'est voulu.
 *
 * Si le fichier est indisponible ou mal formé, la copie de secours du dépôt
 * (`ecosystem.fallback.json`) prend le relais. Pour la rafraîchir :
 * `curl -s https://www.kayzen-lyon.com/ecosystem.json -o lib/ecosystem/ecosystem.fallback.json`
 */
export const ECOSYSTEM_URL = "https://www.kayzen-lyon.com/ecosystem.json";

/** Identifiant de Konsent dans l'écosystème, utilisé pour `?ref=`. */
export const CURRENT_APP_ID = "konsent";

export type AppStatus = "disponible" | "beta" | "bientot";

export interface EcosystemApp {
  id: string;
  nom: string;
  url: string;
  categorie: string;
  resume: string;
  statut: AppStatus;
  liens_utiles: string[];
}

function isApp(value: unknown): value is EcosystemApp {
  const a = value as Partial<EcosystemApp> | null;
  return (
    !!a &&
    typeof a.id === "string" &&
    typeof a.nom === "string" &&
    typeof a.url === "string" &&
    a.url.startsWith("https://") &&
    typeof a.categorie === "string" &&
    typeof a.resume === "string" &&
    (a.statut === "disponible" || a.statut === "beta" || a.statut === "bientot") &&
    Array.isArray(a.liens_utiles)
  );
}

function parse(data: unknown): EcosystemApp[] | null {
  const apps = (data as { applications?: unknown } | null)?.applications;
  if (!Array.isArray(apps) || apps.length === 0 || !apps.every(isApp)) return null;
  return apps;
}

const FALLBACK = parse(fallback) ?? [];

export async function getEcosystem(): Promise<EcosystemApp[]> {
  try {
    const res = await fetch(ECOSYSTEM_URL, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return FALLBACK;
    return parse(await res.json()) ?? FALLBACK;
  } catch {
    return FALLBACK;
  }
}

/**
 * Lien sortant vers une autre application, marqué `?ref=konsent` pour
 * suivre les passages entre applications dans Plausible. Les paramètres
 * déjà présents (ex. `?url=`) sont conservés.
 */
export function withRef(href: string): string {
  const u = new URL(href);
  u.searchParams.set("ref", CURRENT_APP_ID);
  return u.toString();
}

/** Applications regroupées par catégorie, sans Konsent lui-même. */
export function groupByCategory(apps: readonly EcosystemApp[]): [string, EcosystemApp[]][] {
  const groups = new Map<string, EcosystemApp[]>();
  for (const app of apps) {
    if (app.id === CURRENT_APP_ID) continue;
    const list = groups.get(app.categorie) ?? [];
    list.push(app);
    groups.set(app.categorie, list);
  }
  return [...groups.entries()];
}
