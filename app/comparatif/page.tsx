import type { Metadata } from "next";
import Link from "next/link";
import { Disclaimer } from "@/components/primitives";
import { RULEPACK } from "@/lib/rulepack";

export const metadata: Metadata = {
  title: "Konsent et votre plateforme de consentement",
  description:
    "Une CMP recueille le consentement. Konsent vérifie qu'il est respecté. Ce ne sont pas deux produits concurrents, mais deux fonctions distinctes — et l'une ne peut pas contrôler l'autre.",
};

const ROWS: readonly { label: string; cmp: string; konsent: string; edge: boolean }[] = [
  {
    label: "Nature du produit",
    cmp: "Recueille et enregistre le consentement",
    konsent: "Vérifie que le consentement est respecté par le reste du site",
    edge: false,
  },
  {
    label: "Position",
    cmp: "Audite ce qu'elle vend elle-même",
    konsent: "N'édite ni ne revend aucune plateforme de consentement",
    edge: true,
  },
  {
    label: "Détection avant consentement",
    cmp: "Limitée aux services déclarés dans la configuration",
    konsent: "Observation du comportement réel, y compris des services non déclarés",
    edge: true,
  },
  {
    label: "Comportement après refus",
    cmp: "Non vérifié — la plateforme suppose que son signal est suivi",
    konsent: "Phase dédiée du protocole : on refuse, puis on regarde",
    edge: true,
  },
  {
    label: "Destinataires",
    cmp: "Liste des vendors déclarés",
    konsent: "Entités réellement contactées, remontées à leur groupe capitalistique ultime",
    edge: true,
  },
  {
    label: "Référentiel d'analyse",
    cmp: "Non publié",
    konsent: `${RULEPACK.total} règles publiques et versionnées, avec référence normative`,
    edge: true,
  },
  {
    label: "Limites affichées",
    cmp: "Rarement explicitées",
    konsent: "Les règles non évaluées sont listées, jamais comptées comme conformes",
    edge: true,
  },
  {
    label: "Documents",
    cmp: "Politique cookies déduite de la configuration déclarée",
    konsent: "Politique alimentée par les traceurs réellement observés",
    edge: true,
  },
  {
    label: "Évolution du droit",
    cmp: "Communication commerciale",
    konsent: "Statut « Digital Omnibus » porté par chaque règle du référentiel",
    edge: true,
  },
  {
    label: "Recueil du consentement",
    cmp: "C'est son métier, et elle le fait bien",
    konsent: "Hors périmètre — nous n'en proposons pas",
    edge: false,
  },
  {
    label: "Personnalisation du bandeau",
    cmp: "Étendue : design, vidéo, A/B testing, SDK mobile",
    konsent: "Hors périmètre",
    edge: false,
  },
  {
    label: "Signaux publicitaires (TCF, Consent Mode)",
    cmp: "Émet les signaux",
    konsent: "Vérifie qu'ils sont cohérents avec le choix exprimé",
    edge: false,
  },
];

export default function ComparisonPage() {
  return (
    <>
      <section className="grid-bg-dark bg-ink">
        <div className="mx-auto max-w-7xl px-5 py-14">
          <p className="tech text-[10px] text-flame">Positionnement</p>
          <h1 className="display mt-3 max-w-3xl text-3xl text-white sm:text-[2.8rem]">
            Nous ne remplaçons pas votre bandeau. Nous vérifions qu&apos;il sert à quelque chose.
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-white/65">
            Axeptio, Didomi, OneTrust, Cookiebot, Usercentrics, tarteaucitron : ces outils font
            leur travail, qui est de recueillir le consentement. Aucun ne peut vous dire de
            façon crédible si le reste de votre site le respecte — parce qu&apos;aucun
            n&apos;est en position de s&apos;auditer lui-même.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-14">
        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-line">
          <div className="hidden grid-cols-[1fr_1.3fr_1.3fr] gap-6 bg-paper px-6 py-3 md:grid">
            <span className="tech text-[9px] text-muted">Dimension</span>
            <span className="tech text-[9px] text-muted">
              Plateforme de consentement (CMP)
            </span>
            <span className="tech text-[9px] text-flame">Konsent</span>
          </div>

          <div className="divide-y divide-line">
            {ROWS.map((r) => (
              <div
                key={r.label}
                className="grid gap-3 px-6 py-5 md:grid-cols-[1fr_1.3fr_1.3fr] md:gap-6"
              >
                <p className="text-[14px] font-bold text-ink-2">{r.label}</p>
                <p className="text-[13.5px] leading-relaxed text-muted">
                  <span className="tech mr-2 text-[9px] text-muted md:hidden">CMP</span>
                  {r.cmp}
                </p>
                <p
                  className={`text-[13.5px] leading-relaxed ${
                    r.edge ? "font-medium text-ink-2" : "text-muted"
                  }`}
                >
                  <span className="tech mr-2 text-[9px] text-flame md:hidden">Konsent</span>
                  {r.konsent}
                </p>
              </div>
            ))}
          </div>
        </div>

        <section className="mt-12 grid gap-5 md:grid-cols-2">
          <div className="rounded-xl bg-white p-6 ring-1 ring-line">
            <h2 className="display text-xl text-ink-2">Ce que nous ne prétendons pas</h2>
            <ul className="mt-4 space-y-2.5 text-[14px] leading-relaxed text-muted">
              <li>· Nous ne remplaçons pas une plateforme de consentement.</li>
              <li>· Nous ne garantissons pas que la CNIL partagera notre lecture.</li>
              <li>· Nous ne certifions aucune conformité.</li>
              <li>
                · Nous ne livrons pas de documents utilisables sans relecture par un
                professionnel du droit.
              </li>
            </ul>
          </div>

          <div className="rounded-xl bg-ink p-6">
            <h2 className="display text-xl text-white">Ce que nous garantissons</h2>
            <ul className="mt-4 space-y-2.5 text-[14px] leading-relaxed text-white/70">
              <li>· Chaque constat est reproductible et porte sa référence.</li>
              <li>· Aucune règle non vérifiée n&apos;est comptée comme satisfaite.</li>
              <li>· Aucun montant théorique n&apos;est affiché sans son ordre de grandeur réel.</li>
              <li>· Aucun conflit d&apos;intérêt : nous ne vendons pas ce que nous auditons.</li>
            </ul>
          </div>
        </section>

        <div className="mt-12 text-center">
          <Link
            href="/#scan"
            className="tech inline-block rounded bg-flame px-7 py-3.5 text-[11px] text-white transition hover:bg-flame-dark"
          >
            Auditer mon site gratuitement
          </Link>
        </div>

        <div className="mt-12">
          <Disclaimer variant="short" />
        </div>
      </div>
    </>
  );
}
