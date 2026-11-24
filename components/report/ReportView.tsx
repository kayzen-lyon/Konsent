import Link from "next/link";
import { BaselineExport } from "@/components/BaselineInput";
import { ExposureBox } from "@/components/ExposureBox";
import { FindingsByPillar } from "@/components/Findings";
import { ScanForm } from "@/components/ScanForm";
import { CompareWithPrevious } from "@/components/report/CompareWithPrevious";
import { JurisdictionChart } from "@/components/report/JurisdictionChart";
import { ReportQr } from "@/components/report/ReportQr";
import { ShareReportButton } from "@/components/report/ShareReportButton";
import { ScoreGauge } from "@/components/ScoreGauge";
import { NotRated } from "@/components/report/NotRated";
import { PhaseTimeline, Timeline } from "@/components/Timeline";
import { PhaseScreenshots } from "./PhaseScreenshots";
import { ExecutiveSummary } from "@/components/report/ExecutiveSummary";
import { GoFurther } from "@/components/report/GoFurther";
import { PillarScores } from "@/components/report/PillarScores";
import { PrintReportLink } from "@/components/report/PrintReportLink";
import { VendorTable } from "@/components/Vendors";
import { Disclaimer, SectionTitle, Stat } from "@/components/primitives";
import { ReportActions } from "@/components/ReportActions";
import { PrintReportButton } from "@/components/PrintReportButton";
import { PrintDocumentButton } from "@/components/document/PrintDocumentButton";
import { PrintedLevelNotice, ReadingLevelPicker } from "@/components/ReadingLevelPicker";
import type { VerdictScan } from "@/lib/engine/orchestrate";
import type { ScanResult } from "@/lib/engine/types";
import { readingLevel, type ReadingLevel } from "@/lib/report/levels";
import { publicReportUrl } from "@/lib/report/links";
import { createBaseline, encodeBaseline } from "@/lib/monitoring/baseline";
import { verifiedByFamily } from "@/lib/report/coverage";
import { RULEPACK, getRule } from "@/lib/rulepack";
import { siteOrigin } from "@/lib/security/origin";

/**
 * Rendu d'un rapport d'audit, partagé par le rapport en direct (`/scan`) et
 * le rapport figé d'un lien de partage (`/rapport/[id]`).
 *
 * En mode figé, tout ce qui relancerait une analyse en se présentant comme
 * ce rapport (actions, partage, comparaison locale) est retiré, et un
 * bandeau rappelle que le document décrit un instant passé.
 */

export interface FrozenReport {
  id: string;
  /** Adresse publique du lien de partage (sans le niveau de lecture). */
  url: string;
  createdAt: string;
  expiresAt: string;
}

const LONG_DATE: Intl.DateTimeFormatOptions = {
  dateStyle: "long",
  timeZone: "Europe/Paris",
};

function FrozenBanner({ frozen, target }: { frozen: FrozenReport; target: string }) {
  return (
    <div
      role="note"
      className="mb-8 overflow-hidden rounded-3xl bg-surface ring-1 ring-line shadow-md"
    >
      <div className="h-1 bg-flame" />
      <div className="flex flex-wrap items-center justify-between gap-4 p-5">
        <p className="max-w-3xl text-sm leading-relaxed text-ink-2">
          <strong>
            Rapport figé du{" "}
            <time dateTime={frozen.createdAt}>
              {new Date(frozen.createdAt).toLocaleDateString("fr-FR", LONG_DATE)}
            </time>
            , expire le{" "}
            <time dateTime={frozen.expiresAt}>
              {new Date(frozen.expiresAt).toLocaleDateString("fr-FR", LONG_DATE)}
            </time>
            .
          </strong>{" "}
          Ce n&apos;est pas l&apos;état actuel du site : il a pu changer depuis.
        </p>
        <a
          href={`/scan?url=${encodeURIComponent(target)}`}
          className="font-display btn-primary inline-flex min-h-10 items-center rounded-full bg-flame px-4 text-[13px] font-bold text-on-primary print:hidden"
        >
          Relancer une analyse
        </a>
      </div>
    </div>
  );
}

export function ReportView({
  result,
  degraded,
  target,
  level,
  frozen,
  shareEnabled = false,
}: {
  result: ScanResult;
  degraded?: VerdictScan["degraded"] | null;
  target: string;
  level: ReadingLevel;
  frozen?: FrozenReport;
  /** Affiche le bouton « Créer un lien de partage » (base configurée). */
  shareEnabled?: boolean;
}) {
  const { observation } = result;
  const headless = result.mode === "headless";
  const criticalCount = result.findings.filter((f) => f.severity === "CRITICAL").length;
  const notEvaluated = result.notEvaluatedRuleIds
    .map((id) => getRule(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));
  const evaluatedCount = RULEPACK.total - result.notEvaluatedRuleIds.length;
  const verdictLine = degraded
    ? "rapport partiel, à relancer"
    : criticalCount > 0
      ? `${criticalCount} écart${criticalCount > 1 ? "s" : ""} critique${criticalCount > 1 ? "s" : ""} à corriger`
      : result.findings.length > 0
        ? `${result.findings.length} point${result.findings.length > 1 ? "s" : ""} à améliorer`
        : "aucun écart relevé";
  const spec = readingLevel(level);
  const scannedAt = new Date(result.scannedAt);
  const onlineUrl = frozen
    ? `${frozen.url}?vue=${encodeURIComponent(level)}`
    : `${siteOrigin()}/scan?url=${encodeURIComponent(target)}&vue=${encodeURIComponent(level)}`;

  return (
    <>
      {/* ═══════════ EN-TÊTE ═══════════
          Héros clair à la manière des pages Kayzen : surtitre terracotta,
          titre bicolore (le site, puis le verdict), pastilles de statut et
          score posé dans une carte surélevée. */}
      <section className="relative overflow-hidden border-b border-line bg-paper">
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <nav aria-label="Fil d'Ariane" className="text-[13px] text-muted print:hidden">
              <ol className="flex flex-wrap items-center gap-1.5">
                <li>
                  <Link href="/" className="hover:text-flame">
                    Accueil
                  </Link>
                </li>
                <li aria-hidden="true">›</li>
                <li>
                  <Link href="/" className="hover:text-flame">
                    Audit RGPD
                  </Link>
                </li>
                <li aria-hidden="true">›</li>
                <li aria-current="page" className="truncate text-ink-2">
                  {observation.hostname}
                </li>
              </ol>
            </nav>
            <p className="tech mt-6 text-[12px] text-flame">Rapport d&apos;audit RGPD</p>
            <h1 className="display mt-3 break-words text-4xl leading-[1.08] text-accent sm:text-5xl">
              {observation.hostname}
              <span className="mt-1 block text-flame">{verdictLine}</span>
            </h1>
            {/* L'horodatage est une donnée de preuve : un rapport décrit un
                instant, pas un état permanent du site. */}
            <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-muted">
              Analyse du{" "}
              <time dateTime={result.scannedAt} className="font-semibold text-ink-2">
                {scannedAt.toLocaleString("fr-FR", {
                  dateStyle: "full",
                  timeStyle: "short",
                  timeZone: "Europe/Paris",
                })}
              </time>
              {headless
                ? ", dans un vrai navigateur : avant tout choix, après refus, après acceptation."
                : ", sans navigateur : document servi, en-têtes, DNS et pages légales."}
            </p>
            {/* Le moteur qui a tourné détermine ce que le rapport a pu voir.
                Il se lit dès l'en-tête, pas dans une note de bas de page. */}
            <ul className="mt-6 flex flex-wrap gap-2">
              <li
                className={`font-display inline-flex min-h-9 items-center gap-2 rounded-full px-4 text-[13px] font-bold ${
                  headless ? "bg-ok-bg text-ok" : "bg-warn-bg text-warn"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${headless ? "bg-ok" : "bg-warn"}`}
                />
                {headless ? "Analyse complète en trois phases" : "Analyse partielle, sans navigateur"}
              </li>
              <li
                className={`font-display inline-flex min-h-9 items-center rounded-full px-4 text-[13px] font-bold ${
                  criticalCount > 0
                    ? "bg-crit-bg text-crit-text"
                    : "bg-surface-low text-ink-2 ring-1 ring-line"
                }`}
              >
                {criticalCount > 0
                  ? `${criticalCount} constat${criticalCount > 1 ? "s" : ""} critique${criticalCount > 1 ? "s" : ""}`
                  : "Aucun constat critique"}
              </li>
              <li className="font-display inline-flex min-h-9 items-center rounded-full bg-surface-low px-4 text-[13px] font-bold text-ink-2 ring-1 ring-line">
                {degraded && result.vendors.length === 0
                  ? "Destinataires non observés"
                  : `${result.vendors.length} destinataire${result.vendors.length > 1 ? "s" : ""} tiers`}
              </li>
            </ul>
            <p className="mt-5 font-mono text-[12px] text-muted">
              réf. {result.id} · référentiel {result.rulepackVersion} ·{" "}
              {observation.pagesAnalyzed} page(s)
            </p>
          </div>

          <div className="flex items-center justify-center gap-6 rounded-3xl bg-surface p-8 ring-1 ring-line shadow-lg">
            <div className="flex flex-col items-center">
              {degraded ? (
                <NotRated />
              ) : (
                <ScoreGauge
                  score={result.score}
                  grade={result.grade}
                  gradeLabel={result.gradeLabel}
                  animate
                />
              )}
              {headless ? null : (
                <p className="mt-3 max-w-[14rem] text-center text-[12px] leading-snug text-muted">
                  {evaluatedCount} points vérifiés sur {RULEPACK.total}.
                </p>
              )}
            </div>
            <ReportQr url={onlineUrl} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-10">
        {frozen ? <FrozenBanner frozen={frozen} target={target} /> : null}

        {/* ═══════════ NIVEAU DE LECTURE ═══════════ */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <ReadingLevelPicker
            target={target}
            current={level}
            hrefFor={frozen ? (id) => `/rapport/${frozen.id}?vue=${id}` : undefined}
          />
          <PrintedLevelNotice current={level} />
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {/* Lien plein (pas de navigation client) : la page est rendue à
                chaque requête (`force-dynamic`), un rechargement relance donc
                réellement l'analyse, sans paramètre anti-cache. */}
            <a
              href={`/scan?url=${encodeURIComponent(target)}&vue=${level}`}
              className="font-display btn-primary inline-flex min-h-10 items-center rounded-full bg-flame px-4 text-[13px] font-bold text-on-primary"
            >
              Relancer l&apos;analyse
            </a>
            {frozen ? (
              <PrintReportButton />
            ) : (
              <PrintDocumentButton />
            )}
          </div>
        </div>
        {/* Les actions du rapport relancent une analyse : sur un rapport figé,
            elles décriraient l'état actuel sous l'apparence du rapport partagé. */}
        {frozen ? null : (
          <div className="mb-6 space-y-4">
            <ReportActions target={target} hostname={observation.hostname} />
            {shareEnabled ? <ShareReportButton target={target} /> : null}
          </div>
        )}

        {/* Sommaire du rapport : ancres vers chaque partie. */}
        <nav
          aria-label="Sommaire du rapport"
          className="sticky top-16 z-30 -mx-5 mb-8 overflow-x-auto border-y border-line bg-paper/90 px-5 py-2 backdrop-blur-sm lg:top-20 print:hidden"
        >
          <ul className="flex gap-1 whitespace-nowrap">
            {[
              ["#synthese", "Synthèse"],
              ["#preuve", "Preuve"],
              ["#constats", `Constats (${result.findings.length})`],
              ["#destinataires", "Destinataires"],
              ["#perspective", "Exposition"],
              ["#verifies", `Vérifiés (${evaluatedCount})`],
              ["#limites", "Limites"],
            ].map(([href, label]) => (
              <li key={href}>
                <a
                  href={href}
                  className="font-display inline-flex min-h-10 items-center rounded-full px-3 text-[13px] font-semibold text-muted transition-colors hover:bg-surface-high hover:text-ink-2"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* ═══════════ DÉGRADATION ═══════════
            Le protocole complet était attendu et n'a pas pu s'exécuter. Le
            taire reviendrait à présenter 96 règles non regardées comme
            satisfaites. On le dit avant le score, pas après. */}
        {degraded ? (
          <div className="mb-8 overflow-hidden rounded-3xl bg-surface ring-1 ring-line shadow-md">
            <div className="h-1 bg-flame" />
            <div className="p-5">
              <p className="tech text-[10px] text-warn">Rapport partiel</p>
              <p className="font-display mt-2 text-[17px] font-bold text-ink-2">
                L&apos;analyse complète n&apos;a pas pu aller au bout cette fois-ci.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{degraded.reason}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                Ce que cela change : seules les vérifications possibles sans ouvrir le site dans un
                navigateur ont été faites. Les {RULEPACK.headlessCount} autres (traceurs déposés,
                respect du refus, bandeau…) n&apos;ont pas été regardées : elles ne sont ni
                conformes ni non conformes, et aucun score n&apos;est donc affiché. Vous pouvez relancer
                l&apos;analyse.
              </p>
              {frozen ? null : (
                <a
                  href={`/scan?url=${encodeURIComponent(target)}&vue=${level}`}
                  className="font-display btn-primary mt-4 inline-flex min-h-10 items-center rounded-full bg-flame px-4 text-[13px] font-bold text-on-primary print:hidden"
                >
                  Relancer l&apos;analyse complète
                </a>
              )}
            </div>
          </div>
        ) : null}

        <ExecutiveSummary result={result} partial={Boolean(degraded)} />

        {/* ═══════════ SYNTHÈSE ═══════════ */}
        <section id="synthese" className="scroll-mt-28">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                label="Points vérifiés"
                value={String(evaluatedCount)}
                hint={`sur ${RULEPACK.total}, liste complète plus bas`}
                tone="neutral"
              />
              <Stat
                label="Points non vérifiés"
                value={String(notEvaluated.length)}
                hint="ni conformes ni non conformes, hors du score"
                tone="warn"
              />
            </div>

            {degraded ? null : <PillarScores findings={result.findings} />}

            {result.cappedBy ? (
              <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-line shadow-md">
                <div className="h-1 bg-flame" />
                <div className="p-4">
                  <p className="tech text-[10px] text-crit">Score plafonné</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{result.cappedBy}</p>
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl bg-surface p-5 ring-1 ring-line shadow-md">
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
        <section id="preuve" className="mt-20 scroll-mt-28">
          <SectionTitle
            eyebrow="La preuve"
            title="Ce que votre page appelle"
            description={
              spec.showRawEvidence
                ? "Ce bloc ne s'interprète pas. Il liste les services tiers référencés dans le document servi par votre serveur, dans leur ordre d'apparition."
                : "Ce bloc ne s'interprète pas : il compte les services tiers que votre page appelle."
            }
          />
          <PhaseTimeline observation={observation} />
          {result.screenshots ? <PhaseScreenshots screenshots={result.screenshots} /> : null}
          {spec.showRawEvidence ? (
            <Timeline observation={observation} />
          ) : (
            <div className="rounded-3xl bg-surface p-6 ring-1 ring-line shadow-md">
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
        <section id="constats" className="mt-20 scroll-mt-28">
          <SectionTitle
            eyebrow="Les constats"
            title={`${result.findings.length} écart${result.findings.length > 1 ? "s" : ""} relevé${result.findings.length > 1 ? "s" : ""}, en quatre piliers`}
            description="Chaque constat est factuel et porte sa référence normative. La qualification juridique d'une situation relève de la CNIL ou d'un juge, jamais d'un outil automatisé."
          />
          <FindingsByPillar
            findings={result.findings}
            level={level}
            report={{ url: result.url, id: result.id, rulepackVersion: result.rulepackVersion }}
          />
        </section>

        {/* ═══════════ DESTINATAIRES ═══════════ */}
        <section id="destinataires" className="mt-20 scroll-mt-28">
          <SectionTitle
            eyebrow="Souveraineté"
            title="Qui reçoit les données de vos visiteurs"
            description="Pour chaque service : l'entreprise contractante, sa juridiction effective une fois la chaîne capitalistique remontée, et ce que cela implique."
          />
          <div className="space-y-5">
            <JurisdictionChart vendors={result.vendors} />
            <VendorTable vendors={result.vendors} />
          </div>
        </section>

        {/* ═══════════ EXPOSITION ═══════════ */}
        <section id="perspective" className="mt-20 scroll-mt-28">
          <SectionTitle eyebrow="Mise en perspective" title="Ce que cela représente" />
          <ExposureBox findings={result.findings} />
        </section>

        {/* ═══════════ POINTS VÉRIFIÉS ═══════════ */}
        <section id="verifies" className="mt-20 scroll-mt-28">
          <SectionTitle
            eyebrow="Couverture de cette analyse"
            title={`${evaluatedCount} points vérifiés`}
            description={
              headless
                ? "Chaque point contrôlé et son résultat. « Non constaté » signifie que l’écart décrit n’a pas été détecté, pas que le point est certifié."
                : "Points contrôlés sans navigateur. « Non détecté » vaut pour le document servi seulement : rien n’a été observé à l’exécution."
            }
          />
          <div className="grid gap-5 md:grid-cols-2">
            {verifiedByFamily(result).map((g) => (
              <div key={g.family} className="rounded-3xl bg-surface p-6 ring-1 ring-line shadow-md">
                <h3 className="display text-lg text-ink-2">
                  {g.family} ({g.items.length})
                </h3>
                <ul className="mt-3 space-y-2">
                  {g.items.map(({ rule, raised }) => (
                    <li key={rule.id} className="text-[13px] leading-snug text-muted">
                      <strong className={raised ? "text-flame" : "text-ok"}>
                        {raised ? "Constaté" : headless ? "Non constaté" : "Non détecté"}
                      </strong>{" "}
                      ·{" "}
                      <Link href={`/regles/${rule.id.toLowerCase()}`} className="underline">
                        {rule.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════ LIMITES ═══════════ */}
        <section id="limites" className="mt-20 scroll-mt-28">
          <SectionTitle
            eyebrow="Limites de cette analyse"
            title={`${notEvaluated.length} points n'ont pas été vérifiés`}
            description="Ce n'est pas un défaut de votre site. Selon les cas, notre moteur ne sait pas encore contrôler ce point, l'analyse n'a pas obtenu de quoi conclure, ou il faut une vérification humaine. Nous les listons plutôt que de les compter comme conformes."
          />
          <div className="rounded-3xl bg-surface p-6 ring-1 ring-line shadow-md">
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
        <section className="mt-20 grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl bg-navy-deep p-7">
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

          <div className="rounded-3xl bg-surface p-7 ring-1 ring-line shadow-md">
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

          <div className="rounded-3xl bg-surface p-7 ring-1 ring-line shadow-md">
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

          <div className="rounded-3xl bg-surface p-7 ring-1 ring-line shadow-md">
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

        {frozen ? null : (
        <section id="avant-apres" className="mt-5 scroll-mt-28 print:hidden">
          <CompareWithPrevious
            current={{
              hostname: result.hostname,
              score: result.score,
              grade: result.grade,
              scannedAt: result.scannedAt,
              findings: result.findings.map((f) => ({
                ruleId: f.ruleId,
                title: f.title,
                severity: f.severity,
              })),
              vendors: result.vendors.map((v) => ({
                slug: v.slug,
                name: v.name,
                effectiveJurisdiction: v.effectiveJurisdiction,
              })),
            }}
          />
        </section>
        )}

        <PrintReportLink url={frozen ? onlineUrl : publicReportUrl(target, level)} />

        <GoFurther hostname={result.hostname} />

        <section className="mt-10">
          <Disclaimer />
        </section>

        <section className="mt-8 rounded-3xl bg-surface p-6 ring-1 ring-line shadow-md">
          <p className="tech text-[10px] text-muted">Analyser un autre site</p>
          <div className="mt-3">
            <ScanForm />
          </div>
        </section>
      </div>
    </>
  );
}
