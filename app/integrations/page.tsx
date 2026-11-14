import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Disclaimer, SectionTitle } from "@/components/primitives";
import { CopyCodeBlock } from "@/components/tools/ProcessingRegisterGenerator";
import { EDITOR } from "@/lib/disclaimer";

export const metadata: Metadata = {
  title: "Intégrations : API, serveur MCP, action GitHub, badge, flux RSS",
  description:
    "Branchez Konsent sur vos outils : API REST décrite en OpenAPI, serveur MCP pour les agents, action GitHub qui bloque un déploiement sur un écart critique, badge de score et flux RSS de la veille réglementaire.",
  alternates: { canonical: "/integrations" },
};

const SITE = EDITOR.productSite;

const CURL = `curl -s "${SITE}/api/scan?url=exemple.fr"

# Avec une clé d'API (quota et journal rattachés à votre organisation) :
curl -s "${SITE}/api/scan?url=exemple.fr" \\
  -H "Authorization: Bearer $KONSENT_API_KEY"`;

const MCP_CONFIG = `{
  "mcpServers": {
    "konsent": {
      "command": "node",
      "args": ["/chemin/absolu/vers/konsent/mcp/dist/index.js"],
      "env": {
        "KONSENT_API_URL": "${SITE}"
      }
    }
  }
}`;

const BADGE = `<a href="${SITE}/scan?url=exemple.fr">
  <img src="${SITE}/api/badge?url=exemple.fr" alt="Score Konsent de exemple.fr">
</a>`;

interface Integration {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  points: readonly string[];
  link: { href: string; label: string };
  code?: { caption: string; text: string };
}

const INTEGRATIONS: readonly Integration[] = [
  {
    id: "api",
    eyebrow: "API REST",
    title: "Une API publique, décrite en OpenAPI",
    body: "Analyse d'une adresse, badge, en-têtes de sécurité, référentiel de règles, base des destinataires, veille, comparaison à une référence, brouillons documentaires. La description OpenAPI est générée depuis le registre des routes : elle ne peut pas décrire une route disparue.",
    points: [
      "Sans clé, les routes publiques restent ouvertes, dans la limite d'un débit par adresse IP.",
      "Avec une clé, transmise uniquement dans l'en-tête Authorization: Bearer, jamais dans l'URL : quota, portée et journal propres à votre organisation.",
      "Chaque réponse porte l'avertissement : un constat automatisé n'est pas une consultation juridique.",
    ],
    link: { href: "/api/openapi.json", label: "Description OpenAPI (/api/openapi.json)" },
    code: { caption: "Terminal — analyser une adresse", text: CURL },
  },
  {
    id: "mcp",
    eyebrow: "Serveur MCP",
    title: "L'audit appelable par un agent",
    body: "Le serveur MCP expose l'analyse aux assistants compatibles (Claude Desktop, Claude Code et tout hôte MCP) : une agence pilote son portefeuille, un DPO prépare un contrôle, un développeur vérifie une préproduction avant mise en ligne.",
    points: [
      "Outils : analyse d'une adresse, écarts par gravité, destinataires et transferts hors EEE, portefeuille de domaines, régression par rapport à une référence, explication d'une règle, génération de documents, registre des traitements…",
      "Ressources : référentiel de règles, veille réglementaire, base des destinataires, couverture multi-juridiction, catalogue documentaire.",
      "L'avertissement n'est pas désactivable, et la liste des règles non évaluées est toujours renvoyée.",
    ],
    link: { href: "/api/openapi.json", label: "Routes appelées par le serveur (OpenAPI)" },
    code: { caption: "Configuration MCP — à adapter au chemin d'installation", text: MCP_CONFIG },
  },
  {
    id: "github",
    eyebrow: "Action GitHub",
    title: "Bloquer un déploiement sur un écart critique",
    body: "Le protocole complet en trois phases (avant consentement, après refus, après acceptation) dans un navigateur réel, exécuté dans votre chaîne d'intégration continue. Vos préproductions ne sont jamais exposées à un tiers.",
    points: [
      "Seuil réglable : critical, major ou never.",
      "Sorties exploitables : score, note, nombre d'écarts critiques, rapport JSON complet.",
      "Résumé lisible dans l'onglet de l'exécution.",
    ],
    link: { href: "/integrations/github", label: "Documentation de l'action GitHub" },
  },
  {
    id: "badge",
    eyebrow: "Badge",
    title: "Le score sur votre site ou votre README",
    body: "Une image SVG recalculée au plus une fois par jour, qui renvoie vers le rapport complet. Si l'analyse échoue, le badge affiche « indisponible » plutôt qu'un score inventé.",
    points: ["Deux styles : flat et pill.", "Toujours servi en 200 : une erreur ne casse pas la balise <img>."],
    link: { href: "/badge", label: "Composer votre badge" },
    code: { caption: "HTML — badge cliquable", text: BADGE },
  },
  {
    id: "rss",
    eyebrow: "Flux RSS",
    title: "La veille réglementaire dans votre lecteur",
    body: "Ce qui est en vigueur, ce qui n'est qu'un projet, et ce que cela change pour les règles du référentiel : chaque entrée de la veille, avec sa source, dans votre lecteur de flux ou votre outil d'automatisation.",
    points: ["Format RSS 2.0, également disponible en JSON Feed."],
    link: { href: "/veille/rss.xml", label: "Flux RSS (/veille/rss.xml)" },
  },
];

export default function IntegrationsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <Breadcrumbs items={[{ href: "/integrations", label: "Intégrations" }]} />
      <p className="tech text-[10px] text-accent">Intégrations</p>
      <h1 className="display mt-2 text-4xl text-ink-2">Branchez Konsent sur vos outils</h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">
        Une API, un serveur MCP, une action GitHub, un badge et un flux RSS. Les mêmes règles et le
        même avertissement partout : un résultat d&apos;analyse technique, indicatif, jamais une
        qualification juridique.
      </p>

      <nav aria-label="Intégrations disponibles" className="mt-8">
        <ul className="flex flex-wrap gap-2">
          {INTEGRATIONS.map((i) => (
            <li key={i.id}>
              <a
                href={`#${i.id}`}
                className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink-2 hover:border-flame hover:text-flame"
              >
                {i.eyebrow}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-10 space-y-6">
        {INTEGRATIONS.map((i) => (
          <section
            key={i.id}
            id={i.id}
            aria-labelledby={`${i.id}-titre`}
            className="card-lift scroll-mt-24 rounded-3xl border border-line bg-surface p-6 sm:p-8"
          >
            <p className="tech text-[10px] text-flame">{i.eyebrow}</p>
            <h2 id={`${i.id}-titre`} className="display mt-2 text-2xl text-ink-2">
              {i.title}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">{i.body}</p>
            <ul className="mt-4 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-ink-2">
              {i.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            {i.code ? <CopyCodeBlock caption={i.code.caption} code={i.code.text} /> : null}
            <p className="mt-5">
              <Link href={i.link.href} className="font-medium text-flame underline underline-offset-4">
                {i.link.label}
              </Link>
            </p>
          </section>
        ))}
      </div>

      <section className="mt-14">
        <SectionTitle eyebrow="Bon usage" title="Ce que ces intégrations garantissent, et ce qu'elles ne garantissent pas" />
        <div className="max-w-3xl space-y-4 text-[15px] leading-relaxed text-muted">
          <p>
            Elles reproduisent l&apos;analyse du site, avec sa couverture : les règles non évaluées
            sont listées et ne doivent jamais être présentées comme satisfaites. Un score de 100 ne
            vaut pas certificat de conformité.
          </p>
          <p>
            Une question sur un usage précis, un volume ou une clé d&apos;API ?{" "}
            <Link href="/contact" className="font-medium text-flame underline underline-offset-4">
              Écrivez-nous
            </Link>
            .
          </p>
        </div>
      </section>

      <div className="mt-14">
        <Disclaimer variant="short" />
      </div>
    </div>
  );
}
