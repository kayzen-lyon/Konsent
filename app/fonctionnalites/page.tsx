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
    tag: "API",
    title: "Interface programmable",
    lead: "Un audit appelable depuis vos outils.",
    body: [
      "L'API renvoie le score, les constats avec leur preuve, les destinataires et — point essentiel — la liste des règles que le mode d'analyse n'a pas pu évaluer.",
      "L'avertissement est embarqué dans chaque réponse et n'est pas désactivable : un consommateur d'API doit le recevoir en même temps que le constat.",
    ],
    bullets: [
      "GET /api/scan?url=…",
      "Champ « coverage.notEvaluated » systématique",
      "Aucune mise en cache des résultats",
    ],
    status: "Disponible",
  },
];

export default function FeaturesPage() {
  return (
    <>
      <section className="grid-bg-dark bg-ink">
        <div className="mx-auto max-w-7xl px-5 py-14">
          <p className="tech text-[10px] text-flame">Le produit</p>
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
              <div key={p.id} className="bg-white p-6">
                <span className="tech text-[10px] text-flame">Pilier {p.index}</span>
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
              className="grid gap-6 rounded-xl bg-white p-7 ring-1 ring-line lg:grid-cols-[1fr_1fr]"
            >
              <div>
                <div className="flex items-center gap-3">
                  <span className="tech rounded bg-ink px-2 py-1 text-[9px] text-white">
                    {m.tag}
                  </span>
                  <span className="tech text-[9px] text-flame">{m.status}</span>
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

      {/* ── À venir, annoncé honnêtement ── */}
      <section className="mx-auto max-w-7xl px-5 pb-14">
        <div className="rounded-xl border-l-2 border-warn bg-white p-6 ring-1 ring-line">
          <p className="tech text-[10px] text-warn">Feuille de route</p>
          <h2 className="display mt-2 text-xl text-ink-2">Ce qui n&apos;existe pas encore</h2>
          <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-muted">
            Nous préférons l&apos;annoncer plutôt que de le laisser croire. Ne sont pas encore
            livrés : l&apos;archive de preuve signée et horodatée, la surveillance planifiée avec
            détection de régression, le devis de correction automatisé, la veille réglementaire
            en tableau, le serveur MCP et la couche agence en marque blanche.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-14">
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/#scan"
            className="tech rounded bg-flame px-7 py-3.5 text-[11px] text-white transition hover:bg-flame-dark"
          >
            Auditer mon site
          </Link>
          <Link
            href="/regles"
            className="tech rounded border border-ink/20 px-7 py-3.5 text-[11px] text-ink-2 transition hover:border-flame hover:text-flame"
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
