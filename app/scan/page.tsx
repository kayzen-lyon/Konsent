import Link from "next/link";
import { Suspense } from "react";
import { ExposureBox } from "@/components/ExposureBox";
import { FindingsByFamily } from "@/components/Findings";
import { ScanForm } from "@/components/ScanForm";
import { ScoreGauge } from "@/components/ScoreGauge";
import { Timeline } from "@/components/Timeline";
import { JurisdictionBreakdown, VendorTable } from "@/components/Vendors";
import { Disclaimer, SectionTitle, Stat } from "@/components/primitives";
import { ScanError, runScan } from "@/lib/engine/scan";
import { RULEPACK, getRule } from "@/lib/rulepack";
import type { Metadata } from "next";

/** Le scan sort du réseau : il ne peut pas être rendu statiquement. */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Résultat d'analyse",
  robots: { index: false, follow: false },
};

function ScanSkeleton({ target }: { target: string }) {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <div className="k-pulse space-y-4">
        <div className="h-3 w-52 rounded bg-k-line" />
        <div className="h-9 w-80 max-w-full rounded bg-k-line" />
        <div className="h-44 w-44 rounded-full bg-k-line" />
        <div className="h-24 w-full rounded-xl bg-k-line" />
      </div>
      <p className="mt-6 text-sm text-k-muted">
        Analyse de <span className="font-medium text-k-ink">{target}</span> en cours — chargement
        du document, résolution DNS, lecture des pages légales…
      </p>
    </div>
  );
}

function ErrorPanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-lg font-semibold text-amber-900">{title}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-amber-900">{message}</p>
      </div>
      <div className="mt-8">
        <p className="mb-3 text-sm font-medium text-k-ink">Essayer une autre adresse</p>
        <ScanForm />
      </div>
      <p className="mt-6 text-sm text-k-muted">
        <Link href="/" className="text-k-primary hover:underline">
          ← Retour à l&apos;accueil
        </Link>
      </p>
    </div>
  );
}

async function ScanReport({ target }: { target: string }) {
  let result;
  try {
    result = await runScan(target);
  } catch (error) {
    if (error instanceof ScanError) {
      const titles: Record<string, string> = {
        INVALID_URL: "Cette adresse n'a pas pu être interprétée",
        UNREACHABLE: "Le site n'a pas répondu",
        BLOCKED: "Le site a refusé l'analyse",
        TIMEOUT: "L'analyse a pris trop de temps",
      };
      return (
        <ErrorPanel
          title={titles[error.code] ?? "L'analyse n'a pas abouti"}
          message={error.message}
        />
      );
    }
    return (
      <ErrorPanel
        title="L'analyse n'a pas abouti"
        message="Une erreur inattendue est survenue pendant l'analyse. Vous pouvez réessayer dans un instant."
      />
    );
  }

  const { observation } = result;
  const criticalCount = result.findings.filter((f) => f.severity === "CRITICAL").length;
  const consentRequiredVendors = result.vendors.filter(
    (v) => !v.exemptEligible && v.categories.some((c) =>
      ["advertising", "social", "session_replay", "rtb", "ab_testing", "marketing_automation"].includes(c),
    ),
  );

  const notEvaluated = result.notEvaluatedRuleIds
    .map((id) => getRule(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      {/* ── En-tête du rapport ── */}
      <header className="k-rise">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-k-muted">
          Rapport d&apos;analyse technique
        </p>
        <h1 className="mt-1.5 break-all text-2xl font-semibold tracking-tight text-k-ink sm:text-3xl">
          {observation.hostname}
        </h1>
        <p className="mt-1.5 text-sm text-k-muted">
          Référentiel {result.rulepackVersion} · analysé le{" "}
          {new Date(result.scannedAt).toLocaleString("fr-FR", {
            dateStyle: "long",
            timeStyle: "short",
          })}{" "}
          · {result.durationMs} ms · {observation.pagesAnalyzed} page(s)
        </p>
      </header>

      {/* ── Score et synthèse ── */}
      <section className="mt-8 grid gap-6 lg:grid-cols-[auto_1fr] lg:items-start">
        <div className="k-rise rounded-xl border border-k-line bg-white p-6">
          <ScoreGauge
            score={result.score}
            grade={result.grade}
            gradeLabel={result.gradeLabel}
          />
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              label="Constats relevés"
              value={String(result.findings.length)}
              hint={`dont ${criticalCount} critique(s)`}
              tone={criticalCount > 0 ? "danger" : "neutral"}
            />
            <Stat
              label="Destinataires identifiés"
              value={String(result.vendors.length)}
              hint={`${result.outsideEea.length} hors EEE`}
              tone={result.outsideEea.length > 0 ? "danger" : "ok"}
            />
            <Stat
              label="Soumis à consentement"
              value={String(consentRequiredVendors.length)}
              hint="services référencés dans la page"
              tone={consentRequiredVendors.length > 0 ? "danger" : "ok"}
            />
          </div>

          {result.cappedBy ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-semibold text-red-900">Score plafonné</p>
              <p className="mt-1 text-sm leading-relaxed text-red-900">{result.cappedBy}</p>
            </div>
          ) : null}

          <div className="rounded-lg border border-k-line bg-white px-4 py-3">
            <p className="text-sm font-medium text-k-ink">
              Mécanisme de recueil du consentement
            </p>
            <p className="mt-1 text-sm leading-relaxed text-k-muted">
              {observation.cmp.detected
                ? `Identifié : ${observation.cmp.name}. Méthode de détection : ${
                    observation.cmp.method === "api_signature"
                      ? "signature d'interface (fiabilité élevée)"
                      : observation.cmp.method === "selector"
                        ? "sélecteur connu (fiabilité moyenne)"
                        : "heuristique générique (fiabilité faible)"
                  }.`
                : "Aucun mécanisme identifié dans le document servi. Le dispositif peut être chargé dynamiquement — une vérification en navigateur est nécessaire pour conclure."}
            </p>
          </div>
        </div>
      </section>

      {/* ── Preuve brute ── */}
      <section className="mt-14">
        <SectionTitle
          eyebrow="La preuve"
          title="Ce que votre page appelle"
          description="Ce bloc ne s'interprète pas : il liste les services tiers référencés dans le document servi par votre serveur, dans leur ordre d'apparition."
        />
        <Timeline observation={observation} />
      </section>

      {/* ── Destinataires ── */}
      <section className="mt-14">
        <SectionTitle
          eyebrow="Les destinataires"
          title="Qui reçoit les données de vos visiteurs"
          description="Pour chaque service identifié : l'entreprise contractante, sa juridiction effective une fois la chaîne capitalistique remontée, et ce que cela implique."
        />
        <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
          <VendorTable vendors={result.vendors} />
          <JurisdictionBreakdown vendors={result.vendors} />
        </div>
      </section>

      {/* ── Constats ── */}
      <section className="mt-14">
        <SectionTitle
          eyebrow="Les constats"
          title={`${result.findings.length} écart${result.findings.length > 1 ? "s" : ""} relevé${result.findings.length > 1 ? "s" : ""}`}
          description="Chaque constat est factuel et porte sa référence normative. La qualification juridique d'une situation relève de la CNIL ou d'un juge, jamais d'un outil automatisé."
        />
        <FindingsByFamily findings={result.findings} />
      </section>

      {/* ── Exposition ── */}
      <section className="mt-14">
        <SectionTitle
          eyebrow="Mise en perspective"
          title="Ce que cela représente financièrement"
        />
        <ExposureBox findings={result.findings} />
      </section>

      {/* ── Ce qui n'a PAS été évalué : l'aveu d'incertitude ── */}
      <section className="mt-14">
        <SectionTitle
          eyebrow="Limites de cette analyse"
          title={`${notEvaluated.length} règles n'ont pas pu être évaluées`}
          description="Nous préférons le dire plutôt que de les compter comme satisfaites. Ces règles supposent l'exécution du site dans un navigateur réel, ou la lecture d'un contenu que ce mode n'a pas pu obtenir."
        />
        <div className="rounded-xl border border-k-line bg-white p-5">
          <p className="text-sm leading-relaxed text-k-ink">
            Le mode statique évalue {RULEPACK.staticCount} règles sur {RULEPACK.total}. Ne sont
            pas couverts ici : le dépôt effectif de cookies par JavaScript, le comportement
            après refus, l&apos;ergonomie réelle du bandeau, les techniques d&apos;empreinte du
            terminal, et le stockage alternatif.
          </p>
          <details className="group mt-3">
            <summary className="cursor-pointer list-none text-[13px] font-medium text-k-primary hover:underline">
              <span className="group-open:hidden">Voir la liste complète ▾</span>
              <span className="hidden group-open:inline">Réduire ▴</span>
            </summary>
            <ul className="mt-3 grid gap-1 sm:grid-cols-2">
              {notEvaluated.map((r) => (
                <li key={r.id} className="text-[13px] text-k-muted">
                  <Link
                    href={`/regles/${r.id.toLowerCase()}`}
                    className="font-mono text-xs hover:text-k-primary hover:underline"
                  >
                    {r.id}
                  </Link>{" "}
                  — {r.title}
                </li>
              ))}
            </ul>
          </details>
        </div>
      </section>

      {/* ── Document généré depuis le scan ── */}
      <section className="mt-14">
        <SectionTitle
          eyebrow="Document"
          title="Politique cookies, alimentée par ce scan"
          description="Le brouillon est construit à partir des services réellement observés, pas d'un formulaire à remplir. C'est ce qui empêche la politique publiée de diverger de la réalité du site."
        />
        <Link
          href={`/documents/politique-cookies?url=${encodeURIComponent(target)}`}
          className="inline-flex items-center gap-2 rounded-lg bg-k-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-k-primary-dark"
        >
          Générer le brouillon
        </Link>
      </section>

      <section className="mt-14">
        <Disclaimer />
      </section>

      <section className="mt-8 rounded-xl border border-k-line bg-white p-5">
        <p className="text-sm font-medium text-k-ink">Analyser un autre site</p>
        <div className="mt-3">
          <ScanForm />
        </div>
      </section>
    </div>
  );
}

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;

  if (!url) {
    return (
      <ErrorPanel
        title="Aucune adresse fournie"
        message="Indiquez l'adresse du site que vous souhaitez analyser."
      />
    );
  }

  return (
    <Suspense fallback={<ScanSkeleton target={url} />}>
      <ScanReport target={url} />
    </Suspense>
  );
}
