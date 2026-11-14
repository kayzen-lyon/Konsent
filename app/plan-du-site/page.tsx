import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Plan du site",
  description: "Toutes les pages du site Konsent, regroupées par rubrique.",
};

/**
 * Plan du site — second système de navigation exigé par le critère RGAA 12.1,
 * en complément du menu principal.
 */
const SECTIONS: { title: string; links: [string, string][] }[] = [
  {
    title: "Analyser",
    links: [
      ["/", "Accueil et audit gratuit"],
      ["/fonctionnalites", "Fonctionnalités"],
      ["/surveillance", "Surveillance continue"],
      ["/agence", "Vue portefeuille pour les agences"],
      ["/tarifs", "Tarifs"],
      ["/devis", "Demander un devis de correction"],
      ["/comparatif", "Comparatif des plateformes de consentement"],
    ],
  },
  {
    title: "Outils gratuits",
    links: [
      ["/outils", "Tous les outils"],
      ["/comparer", "Comparer deux sites"],
      ["/outils/generateur-bandeau", "Générateur de bandeau cookies"],
      ["/auto-evaluation", "Auto-évaluation RGPD"],
      ["/badge", "Badge Konsent pour votre site"],
      ["/recherche", "Recherche"],
      ["/outils/decodeur-tcf", "Décodeur de chaîne TCF"],
      ["/simulateur", "Simulateur d'exposition"],
      ["/documents", "Documents et modèles"],
    ],
  },
  {
    title: "Comprendre",
    links: [
      ["/regles", "Référentiel des règles"],
      ["/traceurs", "Base des traceurs"],
      ["/cookies", "Index des cookies"],
      ["/juridictions", "Juridictions couvertes"],
      ["/guides", "Guides de correction"],
      ["/glossaire", "Glossaire"],
      ["/veille", "Veille réglementaire"],
      ["/methodologie", "Méthodologie"],
      ["/sources", "Nos sources"],
      ["/bot", "Notre robot d'analyse"],
    ],
  },
  {
    title: "Compte et contact",
    links: [
      ["/connexion", "Connexion"],
      ["/espace", "Espace client"],
      ["/contact", "Nous écrire"],
    ],
  },
  {
    title: "Informations légales",
    links: [
      ["/mentions-legales", "Mentions légales"],
      ["/cgu", "Conditions générales d'utilisation"],
      ["/cgv", "Conditions générales de vente"],
      ["/confidentialite", "Politique de confidentialité"],
      ["/confidentialite#cookies", "Cookies et stockage local"],
      ["/accessibilite", "Déclaration d'accessibilité"],
    ],
  },
];

export default function SitemapPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
      <h1 className="display text-3xl text-ink-2 sm:text-4xl">Plan du site</h1>
      <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <section key={section.title} aria-labelledby={`plan-${section.title}`}>
            <h2 id={`plan-${section.title}`} className="text-lg font-bold text-ink-2">
              {section.title}
            </h2>
            <ul className="mt-3 space-y-2 text-[15px]">
              {section.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-flame">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
