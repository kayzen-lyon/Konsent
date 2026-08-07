import Link from "next/link";
import { ScanForm } from "@/components/ScanForm";
import { Disclaimer } from "@/components/primitives";
import { RULEPACK } from "@/lib/rulepack";
import { TRACKERS } from "@/lib/trackers/db";

const PHASES = [
  {
    tag: "Phase A",
    title: "Avant consentement",
    body: "Contexte neuf, aucun cookie, aucune interaction. Tout traceur non exempté observé ici pose une question au regard de l'article 82.",
  },
  {
    tag: "Phase B",
    title: "Après refus",
    body: "On clique sur « refuser », puis on navigue. Tout traceur encore présent traduit un refus non respecté.",
  },
  {
    tag: "Phase C",
    title: "Après acceptation",
    body: "Sert d'inventaire exhaustif : c'est ce qui alimente la politique cookies, sans ressaisie.",
  },
];

const DIFFERENTIATORS = [
  {
    title: "Indépendant de toute plateforme de consentement",
    body: "Nous n'éditons ni ne revendons de bandeau cookies. Nous auditons les vôtres, quels qu'ils soient. Un éditeur de bandeau qui audite son propre produit ne peut pas vous dire la même chose.",
  },
  {
    title: "Chaque constat porte sa référence",
    body: "Article, délibération, point précis. Le référentiel complet est consultable publiquement, sans compte.",
  },
  {
    title: "Nous disons ce que nous ne savons pas",
    body: "Quand une vérification dépasse ce que le mode d'analyse permet, le rapport l'indique. Un scan qui admet ses limites vaut mieux qu'un scan qui invente.",
  },
  {
    title: "Le droit bouge, le référentiel le dit",
    body: "Chaque règle indique son statut sous le projet « Digital Omnibus », qui n'est pas adopté. Vous savez ce qui est acquis et ce qui est en discussion.",
  },
];

export default function HomePage() {
  const eeaCount = TRACKERS.filter((t) => t.adequacy === "EEA").length;

  return (
    <>
      {/* ─────────────────────────── Héros ─────────────────────────── */}
      <section className="border-b border-k-line bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-k-primary" aria-hidden="true" />
              Référentiel {RULEPACK.version} · {RULEPACK.total} règles documentées
            </p>

            <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight text-k-ink sm:text-5xl">
              Que dépose votre site{" "}
              <span className="text-k-primary">avant que vos visiteurs aient pu répondre</span> ?
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-k-muted">
              Konsent observe votre site comme le ferait un contrôleur : quels traceurs se
              déposent, quelles entreprises reçoivent les données de vos visiteurs, et dans
              quels pays elles partent. Sans interpréter à votre place.
            </p>

            <div id="scan" className="mt-8 max-w-2xl scroll-mt-24">
              <ScanForm autoFocus />
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────── Le protocole de scan ───────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-k-primary">
          Le protocole
        </p>
        <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight text-k-ink sm:text-3xl">
          Trois états, pas un seul instantané
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-k-muted">
          La plupart des scanners regardent une page une fois et s&apos;arrêtent là. Le
          manquement, lui, se révèle dans l&apos;écart entre trois moments.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {PHASES.map((p) => (
            <div key={p.tag} className="rounded-xl border border-k-line bg-white p-5">
              <p className="font-mono text-xs font-semibold text-k-primary">{p.tag}</p>
              <h3 className="mt-1.5 text-[15px] font-semibold text-k-ink">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-k-muted">{p.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-5 max-w-3xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-900">
          <span className="font-semibold">État actuel de cette instance : </span>
          l&apos;analyse en ligne exécute le mode statique — elle observe le document servi, les
          en-têtes, le DNS et vos pages légales, soit {RULEPACK.staticCount} des{" "}
          {RULEPACK.total} règles. Le protocole complet en trois phases requiert le worker
          navigateur fourni dans le dépôt. Chaque rapport indique précisément ce qui a été
          évalué et ce qui ne l&apos;a pas été.
        </p>
      </section>

      {/* ─────────────────────── Différenciateurs ─────────────────────── */}
      <section className="border-y border-k-line bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-k-primary">
            Notre position
          </p>
          <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight text-k-ink sm:text-3xl">
            Nous vendons le contrôle, pas la solution
          </h2>

          <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {DIFFERENTIATORS.map((d) => (
              <div key={d.title}>
                <h3 className="text-[15px] font-semibold text-k-ink">{d.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-k-muted">{d.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────── Chiffres produit ───────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { v: String(RULEPACK.total), l: "règles documentées", h: "avec référence normative" },
            { v: String(TRACKERS.length), l: "entités référencées", h: "décrites en français" },
            { v: String(eeaCount), l: "établies dans l'EEE", h: "sur les entités référencées" },
            { v: "0", l: "traceur sur ce site", h: "d'où l'absence de bandeau" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-k-line bg-white p-5">
              <p className="tabular text-3xl font-semibold text-k-primary">{s.v}</p>
              <p className="mt-1 text-sm font-medium text-k-ink">{s.l}</p>
              <p className="mt-0.5 text-xs text-k-muted">{s.h}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/regles"
            className="rounded-lg border border-k-line bg-white px-4 py-2 text-sm font-medium text-k-ink transition hover:border-k-primary hover:text-k-primary"
          >
            Consulter le référentiel
          </Link>
          <Link
            href="/methodologie"
            className="rounded-lg border border-k-line bg-white px-4 py-2 text-sm font-medium text-k-ink transition hover:border-k-primary hover:text-k-primary"
          >
            Comment nous calculons le score
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <Disclaimer />
      </section>
    </>
  );
}
