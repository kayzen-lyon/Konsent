import Link from "next/link";
import CountUp from "@/components/bits/CountUp";
import FadeContent from "@/components/bits/FadeContent";
import SpotlightCard from "@/components/bits/SpotlightCard";
import { Faq } from "@/components/Faq";
import { JsonLd } from "@/components/JsonLd";
import { FineSimulator } from "@/components/FineSimulator";
import { ScanForm } from "@/components/ScanForm";
import { HeroMotion } from "@/components/HeroMotion";
import { Heart, Scale, ShieldCheck, Zap } from "@/components/site/icons";
import { RULEPACK } from "@/lib/rulepack";
import { FREE_TOOLS, toolHref } from "@/lib/tools/catalog";
import { COOKIES } from "@/lib/seo/cookies";
import {
  faqPageJsonLd,
  organizationJsonLd,
  softwareApplicationJsonLd,
  webSiteJsonLd,
} from "@/lib/seo/jsonld";
import { TRACKERS } from "@/lib/trackers/db";

const CMPS = [
  "Axeptio",
  "Didomi",
  "OneTrust",
  "Cookiebot",
  "tarteaucitron",
  "Sirdata",
  "CookieYes",
  "Usercentrics",
  "iubenda",
  "Complianz",
];

const STEPS = [
  {
    title: "Vous saisissez l'adresse",
    body: "Aucun compte, aucune adresse e-mail, aucune carte. Juste le nom de domaine à analyser.",
  },
  {
    title: "Nous observons comme un contrôleur",
    body: "Avant tout choix, après un refus, après une acceptation : ce qui se dépose, ce qui part, et vers qui.",
  },
  {
    title: "Vous recevez un plan d'action",
    body: "Chaque écart avec sa référence, sa gravité, sa correction et son coût estimé. Imprimable, partageable, comparable.",
  },
];

const AVAILABLE_TOOLS = FREE_TOOLS.filter((t) => t.available);
const FEATURED_SLUGS = [
  "generateur-bandeau",
  "comparer",
  "auto-evaluation",
  "generateur-confidentialite",
  "en-tetes-securite",
  "badge",
];
const FEATURED_TOOLS = FEATURED_SLUGS.map((slug) => AVAILABLE_TOOLS.find((t) => t.slug === slug)).filter(
  (t): t is (typeof AVAILABLE_TOOLS)[number] => Boolean(t),
);

const BLIND_SPOTS = [
  {
    title: "Traceurs furtifs",
    body: "Pixels et scripts injectés par vos prestataires, souvent à votre insu. Un bandeau ne les voit pas : il ne surveille que ce qu'on lui a déclaré.",
    icon: "M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Zm10 2.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z",
  },
  {
    title: "Dépôt avant consentement",
    body: "Le manquement le plus sanctionné en France. Il se produit dans les deux secondes précédant l'affichage du bandeau — là où personne ne regarde.",
    icon: "M12 2 3 7v6c0 5 3.8 8.9 9 10 5.2-1.1 9-5 9-10V7l-9-5Zm0 5.5v5m0 3.2v.2",
  },
  {
    title: "Transferts hors UE",
    body: "Chaque destinataire est ramené à son groupe capitalistique ultime. Un prestataire « européen » filiale d'un groupe américain est signalé comme tel.",
    icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 0c3 3 3 17 0 20M2 12h20",
  },
];

const ARSENAL = [
  {
    title: "Protocole en trois phases",
    body: "Avant consentement, après refus, après acceptation. Le manquement ne se lit pas dans un instantané : il se lit dans l'écart entre trois moments.",
  },
  {
    title: "Référentiel public et versionné",
    body: `${RULEPACK.total} règles, chacune avec son article, sa délibération et son point précis. Consultable sans compte, versionné pour rester explicable dans six mois.`,
  },
  {
    title: "Documents alimentés par le scan",
    body: "La politique cookies est construite à partir des traceurs réellement observés. C'est structurellement impossible de la désynchroniser de la réalité du site.",
  },
  {
    title: "Destinataires traduits",
    body: `${TRACKERS.length} entités décrites en français : quelle entreprise reçoit quoi, sous quel droit, et ce que cela implique concrètement pour vous.`,
  },
  {
    title: "L'incertitude est affichée",
    body: "Quand une vérification dépasse ce que le mode d'analyse permet, le rapport le dit. Aucune règle non vérifiée n'est comptée comme satisfaite.",
  },
  {
    title: "Veille intégrée au référentiel",
    body: "Chaque règle porte son statut sous le projet « Digital Omnibus », qui n'est pas adopté. Vous savez ce qui est acquis et ce qui se discute.",
  },
];

const FAQ_ITEMS = [
  {
    q: "Pourquoi mon bandeau cookies ne suffit-il pas ?",
    a: "Une plateforme de consentement recueille le consentement — elle ne vérifie pas que le reste du site le respecte. Si une balise se déclenche avant l'affichage du bandeau, ou continue après un refus, la plateforme n'en sait rien et ne vous alerte pas. C'est précisément l'écart que Konsent mesure.",
  },
  {
    q: "Est-ce un conseil juridique ?",
    a: "Non. Konsent est un outil d'analyse technique automatisée. Il produit des constats factuels et reproductibles, avec leur référence normative. La qualification juridique d'une situation relève de la CNIL ou d'un juge, et son appréciation d'un avocat. Nous ne remplaçons ni l'un ni l'autre.",
  },
  {
    q: "Pourquoi n'affichez-vous pas seulement le plafond de 20 millions ?",
    a: "Parce que ce serait trompeur. La très grande majorité des dossiers cookies passe en procédure simplifiée, dont le plafond légal est de 20 000 € par décision. Nous affichons toujours les deux chiffres ensemble, plus le coût de correction. L'écart entre les trois est déjà suffisamment parlant.",
  },
  {
    q: "Vendez-vous une plateforme de consentement ?",
    a: "Non, et c'est délibéré. Un éditeur de bandeau qui audite les bandeaux est juge et partie. Notre indépendance est notre seul actif défendable : elle nous autorise à auditer Axeptio, Didomi, OneTrust, Cookiebot ou tarteaucitron sans conflit d'intérêt.",
  },
  {
    q: "Que se passe-t-il si un constat est faux ?",
    a: "Chaque règle susceptible de produire un faux positif porte une note explicite décrivant sa limite, publiée sur sa fiche. Quand une page n'est pas exploitable — cas fréquent des sites rendus côté client — le moteur s'abstient de conclure plutôt que d'inventer un constat. Vous pouvez contester tout résultat.",
  },
  {
    q: "Puis-je comparer mon site à celui d'un concurrent ?",
    a: "Oui. Le comparateur lance les deux analyses en parallèle et les présente côte à côte : score, écarts communs, écarts propres à chacun et destinataires situés hors de l'Union européenne. Comme pour l'audit simple, rien n'est conservé, sauf si vous créez un lien de partage.",
  },
  {
    q: "Et ce qu'un scanner ne peut pas voir — registre, contrats, droits des personnes ?",
    a: "Une analyse technique ne voit que ce que le site expose. Pour le reste, l'auto-évaluation propose une trentaine de questions avec leurs références légales et un plan d'action priorisé. Vos réponses ne quittent pas votre navigateur.",
  },
  {
    q: "Konsent dépose-t-il des traceurs ?",
    a: "Aucun. Ce site ne dépose pas un seul cookie, ne charge aucune ressource externe — ni police, ni script, ni image — et n'utilise aucun outil de mesure tiers. C'est pourquoi vous n'y voyez pas de bandeau. Un outil qui reproche le chargement de Google Fonts ne peut pas en charger.",
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={[
          organizationJsonLd(),
          webSiteJsonLd(),
          softwareApplicationJsonLd(),
          faqPageJsonLd(FAQ_ITEMS),
        ]}
      />

      {/* ═══════════════════════ HÉROS ═══════════════════════
          Gabarit Nexus : surtitres en pilule, promesse avec une phrase en
          terracotta, formulaire dans le héros, réassurances, signature, et
          à droite la démonstration animée d'un audit. */}
      <section className="hero-glow border-b border-line bg-paper px-4 pb-12 pt-10 sm:px-6 md:pb-16 md:pt-16 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="rise">
            <ul className="mb-6 flex flex-wrap gap-2.5">
              <li className="font-display inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-ink-2">
                <Zap className="h-3.5 w-3.5 text-flame" />
                Gratuit, sans inscription
              </li>
              <li className="font-display inline-flex items-center gap-1.5 rounded-full bg-flame-bg px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-flame-deep">
                <Heart className="h-3.5 w-3.5" />
                Conçu à Lyon par KAYZEN
              </li>
            </ul>

            <h1 className="hero-title text-balance text-ink-2">
              Votre bandeau gère le consentement.{" "}
              <span className="text-flame">Konsent vérifie ce qui passe derrière.</span>
            </h1>

            <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted md:text-xl">
              Konsent observe votre site comme le ferait un contrôleur : ce qui se dépose avant
              que vos visiteurs aient pu répondre, qui reçoit leurs données, et sous quelle
              juridiction. Constats factuels, références à l&apos;appui.
            </p>

            <div id="scan" className="mt-8 max-w-xl scroll-mt-28">
              <ScanForm />
            </div>

            <ul className="mt-6 flex flex-wrap gap-2.5">
              {[
                { Icon: ShieldCheck, text: "Indépendant de toute CMP" },
                { Icon: Zap, text: "Aucune inscription requise" },
                { Icon: Scale, text: `${RULEPACK.total} règles publiques` },
              ].map(({ Icon, text }) => (
                <li
                  key={text}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface-low px-3 py-1.5 text-sm text-ink-2"
                >
                  <Icon className="h-3.5 w-3.5 text-flame" />
                  {text}
                </li>
              ))}
            </ul>

            <dl className="mt-8 grid max-w-xl grid-cols-2 gap-px overflow-hidden rounded-xl bg-line ring-1 ring-line sm:grid-cols-4">
              {[
                [RULEPACK.total, "règles publiques"],
                [TRACKERS.length, "destinataires décrits"],
                [COOKIES.length, "cookies documentés"],
                [3, "phases d'analyse"],
              ].map(([n, label]) => (
                <div key={label} className="bg-surface px-4 py-3">
                  <dt className="tech text-[9px] text-muted">{label}</dt>
                  <dd className="tabular display mt-1 text-2xl text-secondary">
                    <CountUp to={n as number} />
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-6 text-sm text-muted">
              Développé par{" "}
              <a
                href="https://www.kayzen-lyon.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-ink-2 underline underline-offset-2 transition-colors hover:text-flame"
              >
                KAYZEN<span className="sr-only"> (nouvel onglet)</span>
              </a>{" "}
              — agence web &amp; IA à Lyon
            </p>
          </div>

          <div className="rise order-last" style={{ animationDelay: "120ms" }}>
            <HeroMotion />
          </div>
        </div>
      </section>

      {/* ═══════════════ COMPATIBLE AVEC TOUTES LES CMP ═══════════════ */}
      <section aria-labelledby="cmp-titre" className="border-b border-line bg-surface-low">
        <div className="mx-auto max-w-7xl px-5 py-8">
          <h2 id="cmp-titre" className="tech text-center text-[11px] text-muted">
            Audite les sites équipés de toutes les plateformes de consentement
          </h2>
          <ul className="mt-5 flex flex-wrap justify-center gap-x-8 gap-y-3">
            {CMPS.map((name) => (
              <li key={name} className="font-display text-base font-bold tracking-tight text-ink-2/70">
                {name}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ═══════════════════ COMMENT ÇA MARCHE ═══════════════════ */}
      <section aria-labelledby="etapes-titre" className="mx-auto max-w-7xl px-5 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="tech text-[10px] text-accent">Comment ça marche</p>
          <h2 id="etapes-titre" className="display mt-3 text-3xl text-ink-2 sm:text-4xl">
            Trois étapes, moins d&apos;une minute
          </h2>
        </div>
        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="reveal card-lift relative rounded-3xl border border-line bg-surface p-7 shadow-md"
            >
              <span
                aria-hidden="true"
                className="font-display flex h-11 w-11 items-center justify-center rounded-full bg-flame text-lg font-extrabold text-on-primary"
              >
                {i + 1}
              </span>
              <h3 className="mt-5 text-lg font-bold text-ink-2">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ═══════════════════ OUTILS GRATUITS ═══════════════════ */}
      <section aria-labelledby="outils-titre" className="border-y border-line bg-surface-low">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="tech text-[10px] text-accent">Gratuits, sans inscription</p>
            <h2 id="outils-titre" className="display mt-3 text-3xl text-ink-2 sm:text-4xl">
              {AVAILABLE_TOOLS.length} outils pour aller plus loin
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              Chacun rend son verdict immédiatement et ne conserve rien de ce que vous lui confiez.
            </p>
          </div>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED_TOOLS.map((tool, i) => (
              <li key={tool.slug} className={i === 0 ? "sm:col-span-2 lg:col-span-1 lg:row-span-2" : ""}>
                <Link
                  href={toolHref(tool)}
                  className="reveal card-lift group flex h-full flex-col rounded-3xl border border-line bg-surface p-7 shadow-md"
                >
                  <span className="tech text-[10px] text-muted">
                    {tool.processing === "navigateur" ? "Dans votre navigateur" : "Sur nos serveurs, à Paris"}
                  </span>
                  <span className="mt-3 text-lg font-bold leading-snug text-ink-2 group-hover:text-flame">
                    {tool.title}
                  </span>
                  <span className="mt-2 text-sm italic leading-relaxed text-ink-2/80">
                    « {tool.question} »
                  </span>
                  <span className="mt-3 flex-1 text-sm leading-relaxed text-muted">{tool.description}</span>
                  <span className="font-display mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-flame">
                    Ouvrir l&apos;outil
                    <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-10 text-center">
            <Link
              href="/outils"
              className="font-display inline-flex min-h-11 items-center rounded-full border-2 border-flame px-6 text-sm font-bold text-flame transition-colors hover:bg-surface-high"
            >
              Voir les {AVAILABLE_TOOLS.length} outils gratuits
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════ CE QUE LES BANDEAUX NE VOIENT PAS ══════════════ */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <FadeContent className="mx-auto max-w-2xl text-center">
          <h2 className="display text-3xl text-ink-2 sm:text-4xl">
            Ce que les bandeaux ne voient pas
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Votre plateforme de consentement — Axeptio, Didomi, OneTrust, Cookiebot,
            tarteaucitron — gère le consentement de surface. Konsent regarde le comportement
            réel du code.
          </p>
        </FadeContent>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {BLIND_SPOTS.map((b, i) => (
            <FadeContent key={b.title} delay={i * 120}>
              <SpotlightCard
                as="article"
                className="h-full rounded-xl border-l-2 border-secondary bg-surface p-6 shadow-md ring-1 ring-line"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-accent" fill="none" aria-hidden="true">
                  <path
                    d={b.icon}
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-bold text-ink-2">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{b.body}</p>
              </SpotlightCard>
            </FadeContent>
          ))}
        </div>
      </section>

      {/* ═══════════════════ SIMULATEUR ═══════════════════ */}
      <section className="grid-bg-dark bg-ink [content-visibility:auto] [contain-intrinsic-size:auto_900px] print:[content-visibility:visible]">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="tech text-[10px] text-flame-soft">Mise en perspective</p>
              <h2 className="display mt-3 text-3xl text-white sm:text-[2.6rem]">
                Combien coûte l&apos;écart,
                <br />
                et combien coûte de le combler ?
              </h2>
              <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-white/65">
                La plupart des outils vous montrent le plafond de 20 millions et s&apos;arrêtent
                là. Nous affichons aussi ce qui est réellement prononcé en procédure simplifiée,
                et ce que coûte la correction. Les trois chiffres ensemble, toujours.
              </p>

              <div className="mt-8 space-y-3">
                {[
                  ["Le plafond légal", "Article 83(5) du RGPD — jamais affiché seul"],
                  ["La réalité observée", "Procédure simplifiée, plafond de 20 000 € par décision"],
                  ["Le coût de sortie", "Estimation de mise en conformité, à comparer aux deux"],
                ].map(([t, d], i) => (
                  <div key={t} className="flex gap-4 border-l border-white/15 pl-4">
                    <span className="tech shrink-0 text-[10px] text-flame-soft">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-white">{t}</span>
                      <span className="block text-[13px] text-white/55">{d}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <FineSimulator />
          </div>
        </div>
      </section>

      {/* ═══════════════════ ARSENAL ═══════════════════ */}
      <section className="mx-auto max-w-7xl px-5 py-20 [content-visibility:auto] [contain-intrinsic-size:auto_1100px] print:[content-visibility:visible]">
        <FadeContent className="mx-auto max-w-2xl text-center">
          <p className="tech text-[10px] text-accent">Le produit</p>
          <h2 className="display mt-3 text-3xl text-ink-2 sm:text-4xl">
            Ce qui distingue un audit d&apos;un scanner
          </h2>
        </FadeContent>

        <div className="mt-12 grid gap-px overflow-hidden rounded-xl bg-line ring-1 ring-line sm:grid-cols-2 lg:grid-cols-3">
          {ARSENAL.map((f, i) => (
            <SpotlightCard key={f.title} as="article" className="bg-surface p-7">
              <span className="tech text-[10px] text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 text-[17px] font-bold leading-snug text-ink-2">{f.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">{f.body}</p>
            </SpotlightCard>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/fonctionnalites"
            className="tech rounded-full border-2 border-flame px-5 py-2.5 text-[11px] text-flame transition hover:bg-surface-high"
          >
            Toutes les fonctionnalités
          </Link>
          <Link
            href="/comparatif"
            className="tech rounded-full border-2 border-flame px-5 py-2.5 text-[11px] text-flame transition hover:bg-surface-high"
          >
            Comparatif face aux CMP
          </Link>
        </div>
      </section>

      {/* ═══════════════ POSITION / NEUTRALITÉ ═══════════════ */}
      <section className="border-y border-line bg-surface">
        <FadeContent blur className="mx-auto max-w-4xl px-5 py-20 text-center">
          <svg
            viewBox="0 0 24 24"
            className="mx-auto h-8 w-8 text-accent"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M7.5 4.5c-2 1.6-3.2 3.8-3.5 6.6h3.6V19H4V13c0-3.7 1.2-6.5 3.5-8.5Zm9 0C14.5 6.1 13.3 8.3 13 11.1h3.6V19H13V13c0-3.7 1.2-6.5 3.5-8.5Z" />
          </svg>
          <p className="display mt-6 text-2xl leading-snug text-ink-2 sm:text-[2rem]">
            Un éditeur de bandeau qui audite les bandeaux est juge et partie. Notre
            indépendance n&apos;est pas une posture : c&apos;est la seule chose que nos
            concurrents ne peuvent pas copier.
          </p>
          <p className="tech mt-8 text-[10px] text-muted">
            Konsent n&apos;édite ni ne revend aucune plateforme de consentement
          </p>
        </FadeContent>
      </section>

      {/* ═══════════════════ TARIFS ═══════════════════ */}
      <section className="mx-auto max-w-7xl px-5 py-20 [content-visibility:auto] [contain-intrinsic-size:auto_1200px] print:[content-visibility:visible]">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="display text-3xl text-ink-2 sm:text-4xl">Tarifs</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            L&apos;audit est gratuit parce qu&apos;il coûte quelques millièmes d&apos;euro à
            produire. Ce qui se facture, c&apos;est la surveillance dans le temps et la
            correction.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {[
            {
              name: "Audit libre",
              price: "0 €",
              cadence: "",
              features: [
                "Analyse à la demande, sans inscription",
                "Rapport complet à l'écran",
                "Référentiel et base des traceurs",
                "Brouillon de politique cookies",
              ],
              cta: "Lancer un audit",
              href: "/#scan",
              featured: false,
            },
            {
              name: "Pro",
              price: "89 €",
              cadence: "/ mois",
              features: [
                "5 domaines · 250 pages par analyse",
                "Protocole complet en trois phases",
                "Analyse hebdomadaire et alertes de régression",
                "Archive de preuve horodatée",
                "24 documents générés · accès API",
              ],
              cta: "Nous écrire",
              href: "mailto:contact@kayzen-lyon.fr",
              featured: true,
            },
            {
              name: "Agence",
              price: "249 €",
              cadence: "/ mois",
              features: [
                "25 domaines · vue portefeuille",
                "Rapports à votre marque",
                "Sous-comptes clients cloisonnés",
                "Devis à votre grille tarifaire",
              ],
              cta: "Nous écrire",
              href: "mailto:contact@kayzen-lyon.fr",
              featured: false,
            },
          ].map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-xl bg-surface p-7 ${
                p.featured ? "ring-2 ring-secondary" : "ring-1 ring-line"
              }`}
            >
              {p.featured ? (
                <span className="tech absolute -top-2.5 left-7 rounded-full bg-flame shadow-md px-2.5 py-1 text-[9px] text-white">
                  Recommandé
                </span>
              ) : null}
              <h3 className="text-lg font-bold text-ink-2">{p.name}</h3>
              <p className="mt-3">
                <span className="tabular display text-4xl text-ink-2">{p.price}</span>
                <span className="text-sm text-muted">{p.cadence}</span>
              </p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-[13px] leading-snug text-ink-2">
                    <svg
                      viewBox="0 0 16 16"
                      className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="m3.5 8.5 3 3 6-7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={p.href}
                className={`tech mt-7 rounded-full px-5 py-3 text-center text-[11px] transition ${
                  p.featured
                    ? "bg-flame text-white shadow-md hover:bg-flame-dark"
                    : "border-2 border-flame text-flame hover:bg-surface-high"
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/tarifs" className="text-flame hover:underline">
            Voir la grille complète et les prestations de correction
          </Link>
        </p>
      </section>

      {/* ═══════════════════ FAQ ═══════════════════ */}
      <section className="border-t border-line bg-surface [content-visibility:auto] [contain-intrinsic-size:auto_900px] print:[content-visibility:visible]">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="display text-3xl text-ink-2 sm:text-4xl">Questions fréquentes</h2>
          </div>
          <Faq items={FAQ_ITEMS} />
        </div>
      </section>

      {/* ═══════════════════ APPEL FINAL ═══════════════════ */}
      <section className="bg-ink-2 [content-visibility:auto] [contain-intrinsic-size:auto_420px] print:[content-visibility:visible]">
        <div className="mx-auto max-w-3xl px-5 py-20 text-center">
          <h2 className="display text-3xl text-white sm:text-4xl">
            Vous saurez en moins d&apos;une minute.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/60">
            Aucune inscription, aucune adresse e-mail. Le rapport s&apos;affiche directement.
          </p>
          <div className="mx-auto mt-8 max-w-lg">
            <ScanForm tone="dark" />
          </div>
        </div>
      </section>
    </>
  );
}
