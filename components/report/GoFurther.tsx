import { CURRENT_APP_ID, getEcosystem, withRef, type EcosystemApp } from "@/lib/ecosystem";

/**
 * « Pour aller plus loin » : à la fin d'un rapport, les autres audits
 * KAYZEN utiles pour le même site (parcours « audit complet »).
 *
 * Seules les applications listées dans `liens_utiles` de Konsent ET dotées
 * d'une raison ci-dessous sont proposées : pas de carte générique.
 *
 * Lien profond `?url=` uniquement là où l'application cible le lit
 * réellement (vérifié dans son code) ; ailleurs, lien vers l'accueil.
 * L'adresse transmise est celle du site audité, jamais une donnée du
 * visiteur, et seulement si celui-ci clique.
 */
const REASONS: Record<string, string> = {
  nexus:
    "Un site conforme doit aussi être trouvé : Nexus SEO audite le référencement technique et la visibilité dans les réponses des moteurs IA.",
  synaptik:
    "Les assistants IA lisent-ils ce site ? Synaptik sonde les robots IA, les données structurées et les coordonnées publiées.",
  konforme:
    "Le RGPD n'est pas la seule obligation d'un site : Konforme contrôle l'accessibilité selon le RGAA et les WCAG.",
};

const DEEP_LINKS: Record<string, (app: EcosystemApp, site: string) => string> = {
  // nexus : app/audit-gratuit/page.tsx lit `?url=` et lance l'audit.
  nexus: (app, site) => `${new URL("/audit-gratuit", app.url)}?url=${encodeURIComponent(site)}`,
};

export async function GoFurther({ hostname }: { hostname: string }) {
  const apps = await getEcosystem();
  const self = apps.find((a) => a.id === CURRENT_APP_ID);
  const site = `https://${hostname}`;
  const cards = (self?.liens_utiles ?? [])
    .map((id) => apps.find((a) => a.id === id))
    .filter((a): a is EcosystemApp => !!a && a.statut !== "bientot" && a.id in REASONS)
    .slice(0, 3);
  if (cards.length === 0) return null;

  return (
    <nav aria-labelledby="aller-plus-loin" className="mt-10 print:hidden">
      <h2 id="aller-plus-loin" className="display text-xl text-ink-2">
        Pour aller plus loin
      </h2>
      <p className="mt-2 text-sm text-muted">
        D&apos;autres audits gratuits de l&apos;écosystème KAYZEN pour {hostname}.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {cards.map((app) => {
          const href = withRef(DEEP_LINKS[app.id]?.(app, site) ?? app.url);
          return (
            <li key={app.id}>
              <a
                href={href}
                target="_blank"
                rel="noopener"
                className="card-lift group flex h-full flex-col rounded-3xl border border-line bg-surface p-5 shadow-md"
              >
                <span className="tech text-[9px] text-muted">
                  {app.categorie}
                  {app.statut === "beta" ? " · bêta" : ""}
                </span>
                <span className="mt-1.5 text-[15px] font-bold leading-snug text-ink-2 group-hover:text-flame">
                  {app.nom}
                  <span className="sr-only"> (nouvel onglet)</span>
                </span>
                <span className="mt-2 text-sm leading-relaxed text-muted">{REASONS[app.id]}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
