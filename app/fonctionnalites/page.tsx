import type { Metadata } from "next";
import Link from "next/link";
import { Disclaimer } from "@/components/primitives";
import { PILLARS, RULEPACK, RULES } from "@/lib/rulepack";
import { TRACKERS } from "@/lib/trackers/db";

export const metadata: Metadata = {
  title: "Fonctionnalités",
  description:
    "Protocole en trois phases, référentiel public de règles, base des destinataires, génération documentaire alimentée par le scan, API et worker navigateur.",
};

const MODULES = [
  {
    tag: "M01",
    title: "Moteur d'analyse",
    lead: "Deux moteurs, une même grille de lecture.",
    body: [
      "Le moteur statique observe le document servi, les en-têtes HTTP, les chaînes DNS et vos pages légales. Il n'exécute aucun JavaScript et le dit.",
      "Le worker navigateur exécute le protocole complet en trois phases dans un Chromium piloté, en conteneur éphémère : un contexte neuf par phase, aucun état partagé.",
    ],
    bullets: [
      "Phase A — avant consentement, aucune interaction",
      "Phase B — après refus, avec navigation interne",
      "Phase C — après acceptation, inventaire exhaustif",
      "Détection du masquage par CNAME via résolution DNS",
      "Instrumentation de l'empreinte du terminal : on compte, on ne bloque pas",
    ],
    status: "Statique en ligne · worker fourni dans le dépôt",
  },
  {
    tag: "M02",
    title: "Référentiel de règles",
    lead: `${RULEPACK.total} règles publiques, versionnées, sourcées.`,
    body: [
      "Chaque règle porte son article, sa délibération et son point précis, son poids au score, sa méthode de détection, son correctif et sa limite connue.",
      "Le référentiel est versionné : un rapport produit aujourd'hui reste explicable dans six mois, même si les règles évoluent.",
    ],
    bullets: [
      `${RULEPACK.staticCount} règles évaluables sans navigateur`,
      `${RULEPACK.headlessCount} règles nécessitant le protocole complet`,
      "Statut « Digital Omnibus » porté par chaque règle",
      "Notes de faux positif publiées, règle par règle",
      "Consultable sans compte",
    ],
    status: `Version ${RULEPACK.version}`,
  },
  {
    tag: "M03",
    title: "Base des destinataires",
    lead: `${TRACKERS.length} entités décrites pour un dirigeant, pas pour un développeur.`,
    body: [
      "Les autres outils affichent « _fbp — advertising ». Nous écrivons quelle entreprise reçoit quoi, sous quel droit, et ce que cela implique concrètement.",
      "Chaque destinataire est remonté à son groupe capitalistique ultime : un prestataire présenté comme européen mais filiale d'un groupe américain est signalé comme tel.",
    ],
    bullets: [
      "Juridiction effective et statut d'adéquation",
      "Instantané daté du statut Data Privacy Framework",
      "Alternatives européennes proposées service par service",
      "Cookies connus, avec finalité et durée",
    ],
    status: "Enrichie manuellement",
  },
  {
    tag: "M04",
    title: "Score et exposition",
    lead: "Un score qui ne flatte pas, des montants qui ne mentent pas.",
    body: [
      "Le score part de 100 et retranche le poids des règles déclenchées, pondéré par un facteur logarithmique d'occurrence. Trois plafonds durs empêchent qu'un cumul de bonnes pratiques mineures masque un manquement grave.",
      "L'exposition théorique n'est jamais affichée seule : le plafond légal apparaît toujours avec la fourchette réellement observée en procédure simplifiée et le coût de correction.",
    ],
    bullets: [
      "Rendements décroissants sur les occurrences répétées",
      "Plafond à 45 si dépôt avant consentement critique",
      "Plafond à 30 si aucun mécanisme de consentement",
      "Méthodologie publiée intégralement",
    ],
    status: "Méthodologie publique",
  },
  {
    tag: "M08",
    title: "Génération documentaire",
    lead: "La politique cookies est alimentée par le scan, pas par un formulaire.",
    body: [
      "Les traceurs listés dans le document sont ceux réellement observés. La désynchronisation entre la politique publiée et la réalité du site devient structurellement impossible.",
      "Aucun modèle de langage n'intervient : gabarits déterministes, coût nul, sortie stable et vérifiable.",
    ],
    bullets: [
      "Champs inconnus affichés en clair, jamais devinés",
      "Fondement normatif attaché à chaque clause",
      "Tableau des destinataires avec durée et juridiction",
      "Modèle à faire valider avant publication",
    ],
    status: "Politique cookies disponible",
  },
  {
    tag: "M09",
    title: "Archive de preuve",
    lead: "Le besoin d'un DPO n'est pas de savoir : c'est de pouvoir prouver qu'il a contrôlé.",
    body: [
      "Chaque audit peut produire une archive contenant les constats structurés, l'observation brute, l'inventaire des destinataires, un rapport lisible, les empreintes SHA-256 de chaque fichier et une signature Ed25519 détachée.",
      "La portée est écrite noir sur blanc dans l'archive : la signature atteste de l'origine et de l'intégrité, pas de la date au sens d'un horodatage qualifié eIDAS — lequel suppose un prestataire de services de confiance tiers.",
    ],
    bullets: [
      "Vérifiable hors ligne : sha256sum -c SHA256SUMS",
      "Signature contrôlable avec openssl et la clé publique jointe",
      "Manifeste portant la version du référentiel et le mode du moteur",
      "Construite à la volée : rien n'est conservé côté serveur",
    ],
    status: "Disponible depuis chaque rapport",
  },
  {
    tag: "M10",
    title: "Surveillance et régressions",
    lead: "Être conforme un jour ne sert à rien si personne ne regarde le lendemain.",
    body: [
      "Le moteur compare l'état actuel d'un site à une analyse de référence et ne remonte que ce qui a changé : nouvel écart, nouveau destinataire, juridiction inédite, page légale disparue lors d'une refonte.",
      "La référence est un jeton que vous conservez, protégé contre l'altération. Nous ne stockons rien : notre politique de confidentialité annonce qu'aucun résultat n'est conservé, et nous nous y tenons.",
    ],
    bullets: [
      "Message d'alerte nominatif prêt à l'envoi",
      "Comparaison refusée entre deux domaines différents",
      "Signalement d'un changement de version du référentiel",
      "Surveillance planifiée et historique sur abonnement Pro",
    ],
    status: "Disponible sur /surveillance",
  },
  {
    tag: "M11",
    title: "Devis de correction",
    lead: "Le devis se calcule depuis les constats, sans saisie commerciale.",
    body: [
      "Chaque écart facturable porte sa fourchette. Les corrections se mutualisent — corriger dix balises ne coûte pas dix fois le prix d'une seule — et un coefficient de pile technique s'applique.",
      "Conséquence : le devis ne peut pas diverger du rapport. Les constats corrigeables en autonomie sont explicitement exclus de la facturation.",
    ],
    bullets: [
      "Détection automatique de la pile (WordPress, Shopify, Webflow…)",
      "Écarts non facturables signalés comme tels",
      "Validité datée, mentions et limites explicites",
      "Estimation, pas devis contractuel — c'est écrit",
    ],
    status: "Disponible sur /devis",
  },
  {
    tag: "M12",
    title: "Veille réglementaire",
    lead: "Ce qui s'applique, ce qui se discute, et ce qui n'existe plus.",
    body: [
      "Le marché entretient la confusion entre le droit en vigueur et les projets de réforme, parce que l'incertitude fait vendre. Chaque entrée porte son statut, sa source et les règles du référentiel qu'elle impacte.",
      "Le projet « Digital Omnibus » y figure comme ce qu'il est : une proposition non adoptée, faisant l'objet d'un avis conjoint critique du CEPD.",
    ],
    bullets: [
      "Statuts distincts : en vigueur, jurisprudence, projet, retiré",
      "Rattachement de chaque texte aux règles concernées",
      "Recommandation d'action, volontairement prudente",
      "Exposée par API pour les intégrateurs",
    ],
    status: "Disponible sur /veille",
  },
  {
    tag: "M13",
    title: "Serveur MCP",
    lead: "L'audit devient appelable par un agent.",
    body: [
      "Six outils exposés : audit d'un site, filtrage des écarts, destinataires, analyse des transferts, portefeuille multi-domaines et détection de régression. Deux ressources : le référentiel et la veille.",
      "L'avertissement transite par une fonction unique et n'est pas désactivable, et la couverture est toujours renvoyée : un agent qui relaie un constat relaie sa portée et ses limites en même temps.",
    ],
    bullets: [
      "Paquet fourni dans mcp/, transport stdio",
      "Pointe sur l'instance publique ou la vôtre",
      "« Scanne les huit domaines de ce client et dis-moi lesquels ont régressé »",
    ],
    status: "Fourni dans le dépôt",
  },
  {
    tag: "M14",
    title: "Couche agence",
    lead: "Vos clients sur un seul écran, à votre marque.",
    body: [
      "La vue portefeuille analyse plusieurs domaines par vagues et les classe par exposition, en désignant celui à traiter en premier.",
      "Le nom et la couleur de l'agence se transmettent par l'adresse : l'en-tête du rapport reprend votre identité, sans compte à créer.",
    ],
    bullets: [
      "Analyse concurrente, tri par score croissant",
      "Domaine le plus exposé mis en avant, avec accès direct au devis",
      "Sous-comptes et portefeuille persistant : nécessitent une base de données",
    ],
    status: "Disponible sur /agence",
  },
  {
    tag: "API",
    title: "Interface programmable",
    lead: "Un audit appelable depuis vos outils.",
    body: [
      "L'API renvoie le score, les constats avec leur preuve, les destinataires et — point essentiel — la liste des règles que le mode d'analyse n'a pas pu évaluer.",
      "L'avertissement est embarqué dans chaque réponse et n'est pas désactivable : un consommateur d'API doit le recevoir en même temps que le constat.",
    ],
    bullets: [
      "GET /api/scan · /api/diff · /api/evidence",
      "GET /api/rulepack · /api/regwatch",
      "Champ « coverage.notEvaluated » systématique",
      "Aucune mise en cache des résultats d'analyse",
    ],
    status: "Disponible",
  },
];

export default function FeaturesPage() {
  return (
    <>
      <section className="grid-bg-dark bg-ink">
        <div className="mx-auto max-w-7xl px-5 py-14">
          <p className="tech text-[10px] text-flame-soft">Le produit</p>
          <h1 className="display mt-3 max-w-3xl text-3xl text-white sm:text-[2.8rem]">
            Ce qui sépare un audit d&apos;un scanner de cookies
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-white/65">
            Un scanner liste des cookies. Un audit établit un constat opposable, avec sa
            référence, sa preuve et ses limites. La différence tient à ce qui est publié, pas à
            ce qui est promis.
          </p>
        </div>
      </section>

      {/* ── Piliers d'analyse ── */}
      <section className="mx-auto max-w-7xl px-5 py-14">
        <h2 className="display text-2xl text-ink-2">Les quatre piliers du rapport</h2>
        <div className="mt-6 grid gap-px overflow-hidden rounded-xl bg-line ring-1 ring-line sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => {
            const count = RULES.filter((r) => p.families.includes(r.family)).length;
            return (
              <div key={p.id} className="bg-surface p-6">
                <span className="tech text-[10px] text-accent">Pilier {p.index}</span>
                <h3 className="mt-2 text-[17px] font-bold leading-snug text-ink-2">{p.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{p.description}</p>
                <p className="tech mt-4 text-[9px] text-muted">{count} règles</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Modules ── */}
      <section className="mx-auto max-w-7xl px-5 pb-14">
        <div className="space-y-5">
          {MODULES.map((m) => (
            <article
              key={m.tag}
              className="grid gap-6 rounded-xl bg-surface p-7 ring-1 ring-line shadow-md lg:grid-cols-[1fr_1fr]"
            >
              <div>
                <div className="flex items-center gap-3">
                  <span className="tech rounded bg-ink px-2 py-1 text-[9px] text-white">
                    {m.tag}
                  </span>
                  <span className="tech text-[9px] text-accent">{m.status}</span>
                </div>
                <h3 className="display mt-3 text-2xl text-ink-2">{m.title}</h3>
                <p className="mt-2 text-[15px] font-medium text-ink-2">{m.lead}</p>
                {m.body.map((p) => (
                  <p key={p} className="mt-3 text-[14px] leading-relaxed text-muted">
                    {p}
                  </p>
                ))}
              </div>

              <ul className="space-y-2 self-center rounded-lg bg-paper p-5">
                {m.bullets.map((b) => (
                  <li key={b} className="flex gap-2.5 text-[13.5px] leading-snug text-ink-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-flame" />
                    {b}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* ── Ce qui reste conditionné à une infrastructure ── */}
      <section className="mx-auto max-w-7xl px-5 pb-14">
        <div className="rounded-xl border-l-2 border-warn bg-surface p-6 ring-1 ring-line shadow-md">
          <p className="tech text-[10px] text-warn">Limites assumées</p>
          <h2 className="display mt-2 text-xl text-ink-2">
            Ce qui suppose une base de données
          </h2>
          <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-muted">
            Cette instance ne conserve aucun résultat d&apos;analyse — c&apos;est ce
            qu&apos;annonce notre politique de confidentialité, et nous nous y tenons. Trois
            fonctions en dépendent donc et ne sont pas actives ici : la surveillance{" "}
            <em>planifiée</em> (les moteurs de comparaison et d&apos;alerte, eux, fonctionnent
            et sont utilisables dès maintenant avec un jeton de référence), l&apos;historique de
            score dans le temps, et les sous-comptes clients cloisonnés de l&apos;offre Agence.
          </p>
          <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-muted">
            Les activer suppose de stocker des données pour votre compte, donc un contrat de
            sous-traitance et votre consentement explicite. C&apos;est le périmètre des
            abonnements Pro et Agence, pas celui de l&apos;audit libre.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-14">
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/#scan"
            className="tech rounded-full bg-flame shadow-md px-7 py-3.5 text-[11px] text-white transition hover:bg-flame-dark"
          >
            Auditer mon site
          </Link>
          <Link
            href="/regles"
            className="tech rounded-full border-2 border-flame px-7 py-3.5 text-[11px] text-flame transition hover:bg-surface-high"
          >
            Parcourir le référentiel
          </Link>
        </div>
        <div className="mt-12">
          <Disclaimer variant="short" />
        </div>
      </section>
    </>
  );
}
