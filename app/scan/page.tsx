import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { BaselineExport } from "@/components/BaselineInput";
import { ExposureBox } from "@/components/ExposureBox";
import { FindingsByPillar } from "@/components/Findings";
import { ScanForm } from "@/components/ScanForm";
import { ScoreGauge } from "@/components/ScoreGauge";
import { Timeline } from "@/components/Timeline";
import { JurisdictionBreakdown, VendorTable } from "@/components/Vendors";
import { Disclaimer, SectionTitle, Stat } from "@/components/primitives";
import { PrintReportButton } from "@/components/PrintReportButton";
import { PrintedLevelNotice, ReadingLevelPicker } from "@/components/ReadingLevelPicker";
import { runVerdictScan } from "@/lib/engine/orchestrate";
import { ScanError } from "@/lib/engine/scan";
import { isWorkerConfigured } from "@/lib/engine/worker-client";
import { parseReadingLevel, readingLevel, type ReadingLevel } from "@/lib/report/levels";
import { createBaseline, encodeBaseline } from "@/lib/monitoring/baseline";
import { RULEPACK, getRule } from "@/lib/rulepack";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Rapport d'audit",
  robots: { index: false, follow: false },
};

function ScanSkeleton({ target }: { target: string }) {
  return (
    <div className="mx-auto max-w-7xl px-5 py-16">
      <div className="pulse-soft space-y-4">
        <div className="h-3 w-52 rounded bg-line" />
        <div className="h-10 w-80 max-w-full rounded bg-line" />
        <div className="mt-8 h-40 w-40 rounded-full bg-line" />
        <div className="h-28 w-full rounded-xl bg-line" />
      </div>
      <p className="mt-8 font-mono text-sm text-muted">
        Analyse de <span className="font-bold text-ink-2">{target}</span> —{" "}
        {isWorkerConfigured()
          ? "trois chargements en navigateur : avant consentement, après refus, après acceptation. Comptez une quarantaine de secondes."
          : "chargement du document, résolution DNS, lecture des pages légales…"}
      </p>
    </div>
  );
}

function ErrorPanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <div className="rounded-xl border-l-2 border-warn bg-surface p-6 ring-1 ring-line shadow-md">
        <p className="tech text-[10px] text-warn">Analyse interrompue</p>
        <h1 className="display mt-2 text-2xl text-ink-2">{title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">{message}</p>
      </div>
      <div className="mt-8">
        <p className="tech mb-3 text-[10px] text-muted">Essayer une autre adresse</p>
        <ScanForm />
      </div>
    </div>
  );
}

async function ScanReport({ target, level }: { target: string; level: ReadingLevel }) {
  let verdict;
  try {
    verdict = await runVerdictScan(target);
  } catch (error) {
    if (error instanceof ScanError) {
      const titles: Record<string, string> = {
        INVALID_URL: "Cette adresse n'a pas pu être interprétée",
        UNREACHABLE: "Le site n'a pas répondu",
        BLOCKED: "Le site a refusé l'analyse",
        TIMEOUT: "L'analyse a pris trop de temps",
      };
      return (
        <ErrorPanel title={titles[error.code] ?? "L'analyse n'a pas abouti"} message={error.message} />
      );
    }
    return (
      <ErrorPanel
        title="L'analyse n'a pas abouti"
        message="Une erreur inattendue est survenue. Vous pouvez réessayer dans un instant."
      />
    );
  }

  const { result, degraded } = verdict;
  const { observation } = result;
  const headless = result.mode === "headless";
  const criticalCount = result.findings.filter((f) => f.severity === "CRITICAL").length;
  const notEvaluated = result.notEvaluatedRuleIds
    .map((id) => getRule(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));
  const evaluatedCount = RULEPACK.total - result.notEvaluatedRuleIds.length;
  const spec = readingLevel(level);

  return (
    <>
      {/* ═══════════ EN-TÊTE SOMBRE ═══════════ */}
      <section className="grid-bg-dark bg-ink">
        <div className="mx-auto max-w-7xl px-5 py-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0">
              <p className="tech text-[10px] text-flame-soft">Rapport d&apos;audit technique</p>
              <h1 className="display mt-2 break-all text-3xl text-white sm:text-4xl">
                {observation.hostname}
              </h1>
              <p className="mt-2 font-mono text-[12px] text-white/45">
                réf. {result.id} · référentiel {result.rulepackVersion} ·{" "}
                {new Date(result.scannedAt).toLocaleString("fr-FR", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}{" "}
                · {result.durationMs} ms · {observation.pagesAnalyzed} page(s)
              </p>
              {/* Le moteur qui a tourné détermine ce que le rapport a pu voir.
                  Il se lit dès l'en-tête, pas dans une note de bas de page. */}
              <p className="tech mt-3 text-[10px] text-white/60">
                {headless ? (
                  <>
                    <span className="mr-2 rounded bg-ok px-2 py-1 text-white">
                      Protocole en trois phases
                    </span>
                    avant consentement · après refus · après acceptation, navigateur réel
                  </>
                ) : (
                  <>
                    <span className="mr-2 rounded bg-warn px-2 py-1 text-white">
                      Analyse statique
                    </span>
                    document servi, en-têtes, DNS et pages légales — aucun JavaScript exécuté
                  </>
                )}
              </p>
            </div>

            {criticalCount > 0 ? (
              <span className="tech shrink-0 rounded bg-crit px-3 py-2 text-[10px] text-white">
                {criticalCount} constat{criticalCount > 1 ? "s" : ""} critique
                {criticalCount > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="tech shrink-0 rounded bg-ok px-3 py-2 text-[10px] text-white">
                Aucun constat critique
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-10">
        {/* ═══════════ NIVEAU DE LECTURE ═══════════ */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <ReadingLevelPicker target={target} current={level} />
          <PrintedLevelNotice current={level} />
          <PrintReportButton />
        </div>

        {/* ═══════════ DÉGRADATION ═══════════
            Le protocole complet était attendu et n'a pas pu s'exécuter. Le
            taire reviendrait à présenter 96 règles non regardées comme
            satisfaites. On le dit avant le score, pas après. */}
        {degraded ? (
          <div className="mb-8 overflow-hidden rounded-xl bg-surface ring-1 ring-line shadow-md">
            <div className="hazard-top h-1.5" />
            <div className="p-5">
              <p className="tech text-[10px] text-warn">Analyse dégradée</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{degraded.reason}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                Conséquence concrète : {RULEPACK.headlessCount} règles du référentiel exigent un
                navigateur et ressortent ci-dessous en « non évalué ». Elles ne sont pas comptées
                comme satisfaites, et le score n&apos;en tient pas compte.
              </p>
            </div>
          </div>
        ) : null}

        {/* ═══════════ SYNTHÈSE ═══════════ */}
        <section className="grid gap-5 lg:grid-cols-[auto_1fr]">
          <div className="rise flex items-center justify-center rounded-xl bg-surface p-6 ring-1 ring-line shadow-md">
            <ScoreGauge
              score={result.score}
              grade={result.grade}
              gradeLabel={result.gradeLabel}
            />
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat
                label="Écarts relevés"
                value={String(result.findings.length)}
                hint={`dont ${criticalCount} critique(s)`}
                tone={criticalCount > 0 ? "danger" : "neutral"}
              />
              <Stat
                label="Destinataires"
                value={String(result.vendors.length)}
                hint={`${result.outsideEea.length} hors EEE`}
                tone={result.outsideEea.length > 0 ? "danger" : "ok"}
              />
              <Stat
                label="Règles non évaluées"
                value={String(notEvaluated.length)}
                hint="navigateur requis — jamais comptées comme conformes"
                tone="warn"
              />
            </div>

            {result.cappedBy ? (
              <div className="overflow-hidden rounded-lg bg-surface ring-1 ring-line shadow-md">
                <div className="hazard-top h-1.5" />
                <div className="p-4">
                  <p className="tech text-[10px] text-crit">Score plafonné</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{result.cappedBy}</p>
                </div>
              </div>
            ) : null}

            <div className="rounded-lg bg-surface p-4 ring-1 ring-line shadow-md">
              <p className="tech text-[10px] text-muted">Mécanisme de consentement</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
                {observation.cmp.detected
                  ? `${observation.cmp.name} — détecté par ${
                      observation.cmp.method === "api_signature"
                        ? "signature d'interface (fiabilité élevée)"
                        : observation.cmp.method === "selector"
                          ? "sélecteur connu (fiabilité moyenne)"
                          : "heuristique générique (fiabilité faible)"
                    }.`
                  : "Aucun mécanisme identifié dans le document servi. Il peut être chargé dynamiquement : une vérification en navigateur est nécessaire pour conclure."}
              </p>
            </div>
          </div>
        </section>

        {/* ═══════════ PREUVE ═══════════
            La chronologie brute est de l'appareillage : elle sert à vérifier,
            pas à décider. La vue dirigeant en garde le FAIT — combien de
            services, combien hors EEE — et laisse le détail aux deux autres. */}
        <section className="mt-14">
          <SectionTitle
            eyebrow="La preuve"
            title="Ce que votre page appelle"
            description={
              spec.showRawEvidence
                ? "Ce bloc ne s'interprète pas. Il liste les services tiers référencés dans le document servi par votre serveur, dans leur ordre d'apparition."
                : "Ce bloc ne s'interprète pas : il compte les services tiers que votre page appelle."
            }
          />
          {spec.showRawEvidence ? (
            <Timeline observation={observation} />
          ) : (
            <div className="rounded-xl bg-surface p-5 ring-1 ring-line shadow-md">
              <p className="text-sm leading-relaxed text-ink-2">
                Votre page appelle <strong>{result.vendors.length} service(s) tiers</strong>
                {result.outsideEea.length > 0 ? (
                  <>
                    , dont <strong>{result.outsideEea.length} hors Union européenne</strong>
                  </>
                ) : null}
                . Le détail requête par requête figure dans les vues DPO et développeur.
              </p>
            </div>
          )}
        </section>

        {/* ═══════════ PILIERS ═══════════ */}
        <section className="mt-14">
          <SectionTitle
            eyebrow="Les constats"
            title={`${result.findings.length} écart${result.findings.length > 1 ? "s" : ""} relevé${result.findings.length > 1 ? "s" : ""}, en quatre piliers`}
            description="Chaque constat est factuel et porte sa référence normative. La qualification juridique d'une situation relève de la CNIL ou d'un juge, jamais d'un outil automatisé."
          />
          <FindingsByPillar findings={result.findings} level={level} />
        </section>

        {/* ═══════════ DESTINATAIRES ═══════════ */}
        <section className="mt-14">
          <SectionTitle
            eyebrow="Souveraineté"
            title="Qui reçoit les données de vos visiteurs"
            description="Pour chaque service : l'entreprise contractante, sa juridiction effective une fois la chaîne capitalistique remontée, et ce que cela implique."
          />
          <div className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
            <VendorTable vendors={result.vendors} />
            <JurisdictionBreakdown vendors={result.vendors} />
          </div>
        </section>

        {/* ═══════════ EXPOSITION ═══════════ */}
        <section className="mt-14">
          <SectionTitle eyebrow="Mise en perspective" title="Ce que cela représente" />
          <ExposureBox findings={result.findings} />
        </section>

        {/* ═══════════ LIMITES ═══════════ */}
        <section className="mt-14">
          <SectionTitle
            eyebrow="Limites de cette analyse"
            title={`${notEvaluated.length} règles n'ont pas pu être évaluées`}
            description="Nous préférons le dire plutôt que de les compter comme satisfaites. Elles supposent l'exécution du site dans un navigateur réel, ou la lecture d'un contenu que ce mode n'a pas obtenu."
          />
          <div className="rounded-xl bg-surface p-5 ring-1 ring-line shadow-md">
            <p className="text-sm leading-relaxed text-ink-2">
              Cette analyse a décidé {evaluatedCount} règles sur {RULEPACK.total}.{" "}
              {headless
                ? "Les règles restantes supposent une vérification manuelle, une base de données externe, ou la phase de persistance du refus dans le temps — que le protocole n'implémente pas encore."
                : "Ne sont pas couverts ici : le dépôt effectif de cookies par JavaScript, le comportement après refus, l'ergonomie réelle du bandeau, les techniques d'empreinte du terminal et le stockage alternatif."}
            </p>
            <details className="group mt-3">
              <summary className="tech cursor-pointer list-none text-[10px] text-flame hover:underline">
                <span className="group-open:hidden">Voir la liste complète ▾</span>
                <span className="hidden group-open:inline">Réduire ▴</span>
              </summary>
              <ul className="mt-3 grid gap-1 sm:grid-cols-2">
                {notEvaluated.map((r) => (
                  <li key={r.id} className="text-[12px] text-muted">
                    <Link
                      href={`/regles/${r.id.toLowerCase()}`}
                      className="font-mono hover:text-flame hover:underline"
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

        {/* ═══════════ SUITE ═══════════ */}
        <section className="mt-14 grid gap-5 md:grid-cols-2">
          <div className="rounded-xl bg-ink p-6">
            <p className="tech text-[10px] text-flame-soft">Document</p>
            <h3 className="display mt-2 text-xl text-white">
              Politique cookies, alimentée par ce scan
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              Construite à partir des services réellement observés, pas d&apos;un formulaire.
              C&apos;est ce qui empêche la politique publiée de diverger de la réalité du site.
            </p>
            <Link
              href={`/documents/politique-cookies?url=${encodeURIComponent(target)}`}
              className="tech mt-5 inline-block rounded-full bg-flame shadow-md px-5 py-2.5 text-[11px] text-white transition hover:bg-flame-dark"
            >
              Générer le brouillon
            </Link>
          </div>

          <div className="rounded-xl bg-surface p-6 ring-1 ring-line shadow-md">
            <p className="tech text-[10px] text-accent">Correction</p>
            <h3 className="display mt-2 text-xl text-ink-2">Estimer la remise en conformité</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Le devis se calcule à partir des constats ci-dessus, sans saisie commerciale : il
              ne peut pas diverger du rapport.
            </p>
            <Link
              href={`/devis?url=${encodeURIComponent(target)}`}
              className="tech mt-5 inline-block rounded-full border-2 border-flame px-5 py-2.5 text-[11px] text-flame transition hover:bg-surface-high"
            >
              Voir l&apos;estimation
            </Link>
          </div>

          <div className="rounded-xl bg-surface p-6 ring-1 ring-line shadow-md">
            <p className="tech text-[10px] text-accent">Preuve</p>
            <h3 className="display mt-2 text-xl text-ink-2">Archive signée</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Constats, observation brute, empreintes SHA-256 et signature Ed25519. Le vrai
              besoin d&apos;un DPO n&apos;est pas de savoir, c&apos;est de pouvoir prouver
              qu&apos;il a contrôlé.
            </p>
            <a
              href={`/api/evidence?url=${encodeURIComponent(target)}`}
              className="tech mt-5 inline-block rounded-full border-2 border-flame px-5 py-2.5 text-[11px] text-flame transition hover:bg-surface-high"
            >
              Télécharger l&apos;archive
            </a>
          </div>

          <div className="rounded-xl bg-surface p-6 ring-1 ring-line shadow-md">
            <p className="tech text-[10px] text-accent">Surveillance</p>
            <h3 className="display mt-2 text-xl text-ink-2">Détecter les régressions</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Conservez le jeton ci-dessous. En le représentant plus tard, vous obtiendrez
              uniquement ce qui a changé — nouveau traceur, page légale disparue, juridiction
              inédite.
            </p>
            <Link
              href="/surveillance"
              className="tech mt-5 inline-block rounded-full border-2 border-flame px-5 py-2.5 text-[11px] text-flame transition hover:bg-surface-high"
            >
              Ouvrir la surveillance
            </Link>
          </div>
        </section>

        <section className="mt-5">
          <BaselineExport token={encodeBaseline(createBaseline(result))} />
        </section>

        <section className="mt-10">
          <Disclaimer />
        </section>

        <section className="mt-8 rounded-xl bg-surface p-5 ring-1 ring-line shadow-md">
          <p className="tech text-[10px] text-muted">Analyser un autre site</p>
          <div className="mt-3">
            <ScanForm />
          </div>
        </section>
      </div>
    </>
  );
}

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; vue?: string }>;
}) {
  const { url, vue } = await searchParams;

  if (!url) {
    return (
      <ErrorPanel
        title="Aucune adresse fournie"
        message="Indiquez l'adresse du site que vous souhaitez analyser."
      />
    );
  }

  const level = parseReadingLevel(vue);

  return (
    // La clé inclut le niveau : changer de vue doit reconstruire le rapport,
    // pas réafficher le précédent avec d'autres colonnes.
    <Suspense key={`${url}:${level}`} fallback={<ScanSkeleton target={url} />}>
      <ScanReport target={url} level={level} />
    </Suspense>
  );
}
