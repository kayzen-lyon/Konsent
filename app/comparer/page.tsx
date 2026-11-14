import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { CompareForm } from "@/components/CompareForm";
import { ScoreGauge } from "@/components/ScoreGauge";
import { Pill, SectionTitle, SeverityBadge } from "@/components/primitives";
import { compareScans, hostKey } from "@/lib/compare";
import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { runVerdictScan, type VerdictScan } from "@/lib/engine/orchestrate";
import { ScanError } from "@/lib/engine/scan";
import { FAMILY_LABELS, PILLARS } from "@/lib/rulepack";
import type { Finding } from "@/lib/rulepack/types";
import type { TrackerEntity } from "@/lib/trackers/types";
import { JsonLd } from "@/components/JsonLd";
import { toolJsonLd } from "@/lib/seo/jsonld";
import { getTool } from "@/lib/tools/catalog";

// Résultats jamais mis en cache : chaque comparaison relance deux analyses.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Comparer deux sites",
  description:
    "Comparez l'audit RGPD et cookies de deux sites côte à côte : score, écarts communs et propres à chacun, destinataires des données et juridictions.",
  robots: { index: true, follow: true },
};

/* ═══════════════════════ Petits éléments de présentation ═══════════════════════ */

const ADEQUACY_SHORT: Record<TrackerEntity["adequacy"], string> = {
  EEA: "EEE",
  ADEQUATE: "Adéquation",
  DPF_CONDITIONAL: "DPF conditionnel",
  NONE: "Sans adéquation",
  EXTENDED_ACCESS: "Accès étatique étendu",
};

function adequacyTone(a: TrackerEntity["adequacy"]) {
  if (a === "EEA") return "ok" as const;
  if (a === "ADEQUATE") return "flame" as const;
  if (a === "DPF_CONDITIONAL") return "warn" as const;
  return "danger" as const;
}

function reportHref(target: string) {
  return `/scan?url=${encodeURIComponent(target)}`;
}

function ReportLink({ target, host }: { target: string; host: string }) {
  return (
    <Link
      href={reportHref(target)}
      className="tech mt-4 inline-block rounded-full border-2 border-flame px-5 py-2.5 text-[11px] text-flame transition hover:bg-surface-high"
    >
      Voir le rapport complet<span className="sr-only"> de {host}</span>
    </Link>
  );
}

function scanErrorTitle(error: unknown): { title: string; message: string } {
  if (error instanceof ScanError) {
    const titles: Record<string, string> = {
      INVALID_URL: "Cette adresse n'a pas pu être interprétée",
      UNREACHABLE: "Le site n'a pas répondu",
      BLOCKED: "Le site a refusé l'analyse",
      TIMEOUT: "L'analyse a pris trop de temps",
    };
    return { title: titles[error.code] ?? "L'analyse n'a pas abouti", message: error.message };
  }
  return {
    title: "L'analyse n'a pas abouti",
    message: "Une erreur inattendue est survenue. Vous pouvez réessayer dans un instant.",
  };
}

function Notice({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border-l-2 border-warn bg-surface p-6 ring-1 ring-line shadow-md">
      <p className="tech text-[10px] text-warn">{eyebrow}</p>
      <h2 className="display mt-2 text-xl text-ink-2">{title}</h2>
      {children ? <div className="mt-3 text-[15px] leading-relaxed text-muted">{children}</div> : null}
    </div>
  );
}

function FindingList({ findings, empty }: { findings: readonly Finding[]; empty: string }) {
  if (findings.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-2">
      {findings.map((f) => (
        <li key={f.ruleId} className="flex flex-wrap items-start gap-2 text-sm text-ink-2">
          <SeverityBadge severity={f.severity} />
          <span className="min-w-0 flex-1">
            {f.title}{" "}
            <Link
              href={`/regles/${f.ruleId.toLowerCase()}`}
              className="font-mono text-[12px] text-muted hover:text-flame hover:underline"
            >
              {f.ruleId}
            </Link>
          </span>
        </li>
      ))}
    </ul>
  );
}

function VendorList({ vendors, shared }: { vendors: readonly TrackerEntity[]; shared: ReadonlySet<string> }) {
  if (vendors.length === 0) {
    return <p className="text-sm text-muted">Aucun destinataire tiers identifié.</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {vendors.map((v) => (
        <li key={v.slug} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
          <span className="min-w-0">
            <Link href={`/traceurs/${v.slug}`} className="font-medium text-ink-2 hover:text-flame hover:underline">
              {v.name}
            </Link>
            {shared.has(v.slug) ? (
              <span className="ml-2 text-[11px] text-muted">(commun aux deux sites)</span>
            ) : null}
            <span className="block text-[12px] text-muted">{v.entity}</span>
          </span>
          <span className="flex items-center gap-2 text-sm text-ink-2">
            <abbr title="Juridiction effective" className="font-mono no-underline">
              {v.effectiveJurisdiction}
            </abbr>
            <Pill tone={adequacyTone(v.adequacy)}>{ADEQUACY_SHORT[v.adequacy]}</Pill>
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ═══════════════════════════ Colonne d'un site ═══════════════════════════ */

function SideSummary({
  label,
  target,
  verdict,
  badge,
}: {
  label: string;
  target: string;
  verdict: VerdictScan;
  badge?: React.ReactNode;
}) {
  const { result, degraded } = verdict;
  const critical = result.findings.filter((f) => f.severity === "CRITICAL").length;
  return (
    <section
      aria-labelledby={`side-${label}`}
      className="flex flex-col items-center rounded-3xl bg-surface p-6 text-center ring-1 ring-line shadow-md"
    >
      <p className="tech text-[10px] text-accent">Site {label}</p>
      <h2 id={`side-${label}`} className="display mt-1 break-all text-2xl text-ink-2">
        {result.hostname}
      </h2>
      {badge}
      <div className="mt-5">
        <ScoreGauge score={result.score} grade={result.grade} gradeLabel={result.gradeLabel} />
      </div>
      <dl className="mt-5 grid w-full grid-cols-3 gap-2 text-left">
        {[
          ["Écarts", result.findings.length, `${critical} critique(s)`],
          ["Destinataires", result.vendors.length, "services tiers"],
          ["Hors EEE", result.outsideEea.length, "destinataires"],
        ].map(([k, v, hint]) => (
          <div key={String(k)} className="rounded-lg bg-surface-low p-3">
            <dt className="tech text-[9px] text-muted">{k}</dt>
            <dd className="tabular display mt-1 text-2xl text-ink-2">{v}</dd>
            <dd className="text-[11px] text-muted">{hint}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[12px] text-muted">
        {result.mode === "headless" ? "Protocole en trois phases" : "Analyse statique"}
        {degraded ? " — analyse dégradée" : ""}
      </p>
      <ReportLink target={target} host={result.hostname} />
    </section>
  );
}

function SideError({ label, target, error }: { label: string; target: string; error: unknown }) {
  const { title, message } = scanErrorTitle(error);
  return (
    <section
      aria-labelledby={`side-${label}`}
      className="rounded-3xl border-l-2 border-warn bg-surface p-6 ring-1 ring-line shadow-md"
    >
      <p className="tech text-[10px] text-warn">Site {label} · analyse interrompue</p>
      <h2 id={`side-${label}`} className="display mt-2 break-all text-xl text-ink-2">
        {target}
      </h2>
      <p className="mt-2 font-bold text-ink-2">{title}</p>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">{message}</p>
    </section>
  );
}

/* ═══════════════════════════ Rapport comparé ═══════════════════════════ */

async function CompareReport({ a, b }: { a: string; b: string }) {
  // Les deux analyses partent en même temps : la comparaison dure le temps
  // de la plus lente, pas la somme des deux.
  const [ra, rb] = await Promise.allSettled([runVerdictScan(a), runVerdictScan(b)]);

  if (ra.status === "rejected" || rb.status === "rejected") {
    return (
      <div className="space-y-6">
        <div role="alert">
          <Notice
            eyebrow="Comparaison incomplète"
            title={
              ra.status === "rejected" && rb.status === "rejected"
                ? "Aucune des deux analyses n'a abouti"
                : "L'une des deux analyses n'a pas abouti"
            }
          >
            La comparaison suppose deux rapports. Le résultat disponible est affiché ci-dessous ;
            vous pouvez corriger l&apos;adresse en échec et relancer.
          </Notice>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {ra.status === "fulfilled" ? (
            <SideSummary label="A" target={a} verdict={ra.value} />
          ) : (
            <SideError label="A" target={a} error={ra.reason} />
          )}
          {rb.status === "fulfilled" ? (
            <SideSummary label="B" target={b} verdict={rb.value} />
          ) : (
            <SideError label="B" target={b} error={rb.reason} />
          )}
        </div>
      </div>
    );
  }

  const A = ra.value.result;
  const B = rb.value.result;

  if (hostKey(A.hostname) === hostKey(B.hostname)) {
    return (
      <Notice eyebrow="Même site" title="Les deux adresses mènent au même site">
        <p>
          Après redirection, <strong className="text-ink-2">{A.hostname}</strong> et{" "}
          <strong className="text-ink-2">{B.hostname}</strong> désignent le même domaine. Une
          comparaison n&apos;aurait pas de sens : consultez plutôt{" "}
          <Link href={reportHref(a)} className="text-flame underline">
            le rapport complet
          </Link>
          .
        </p>
      </Notice>
    );
  }

  const cmp = compareScans(A, B);
  const shared = new Set(cmp.vendors.common.map((v) => v.slug));
  const winnerBadge = (side: "A" | "B") =>
    cmp.winner === side ? (
      <p className="mt-2">
        <Pill tone="ok">Meilleur score</Pill>
      </p>
    ) : null;
  const pillarTitle = (id: string) => PILLARS.find((p) => p.id === id);

  return (
    <div className="space-y-14">
      {/* ═══════════ SYNTHÈSE ═══════════ */}
      <section aria-labelledby="verdict-title">
        <h2 id="verdict-title" className="sr-only">
          Synthèse
        </h2>
        <div className="grid gap-5 md:grid-cols-2">
          <SideSummary label="A" target={a} verdict={ra.value} badge={winnerBadge("A")} />
          <SideSummary label="B" target={b} verdict={rb.value} badge={winnerBadge("B")} />
        </div>
        <div className="mt-5 rounded-3xl bg-ink p-6">
          <p className="tech text-[10px] text-flame-soft">Résultat</p>
          <p className="display mt-2 text-xl text-white">
            {cmp.winner === "TIE"
              ? `Égalité : ${A.score} sur 100 de part et d'autre.`
              : `${cmp.winner === "A" ? A.hostname : B.hostname} devance ${
                  cmp.winner === "A" ? B.hostname : A.hostname
                } de ${Math.abs(cmp.scoreDelta)} point${Math.abs(cmp.scoreDelta) > 1 ? "s" : ""}.`}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            {cmp.common.length} écart(s) commun(s), {cmp.onlyA.length} propre(s) à {A.hostname},{" "}
            {cmp.onlyB.length} propre(s) à {B.hostname}. Un meilleur score signifie moins
            d&apos;écarts observés, pas une conformité établie.
          </p>
          {cmp.modeMismatch || ra.value.degraded || rb.value.degraded ? (
            <p className="mt-3 text-[13px] leading-relaxed text-flame-soft">
              {cmp.modeMismatch
                ? "Attention : les deux sites n'ont pas été analysés avec le même moteur, les scores ne portent pas sur le même nombre de règles."
                : "Analyse statique : les règles exigeant un navigateur ne sont évaluées pour aucun des deux sites."}
            </p>
          ) : null}
        </div>
      </section>

      {/* ═══════════ TABLEAU PAR PILIER ═══════════ */}
      <section>
        <SectionTitle
          eyebrow="Côte à côte"
          title="Écarts par pilier et par famille"
          description="Nombre de constats relevés sur chaque site. Les familles sans aucun écart des deux côtés sont omises."
        />
        <div className="overflow-x-auto rounded-3xl bg-surface ring-1 ring-line shadow-md">
          <table className="w-full min-w-[480px] text-left text-sm">
            <caption className="sr-only">
              Nombre d&apos;écarts relevés par pilier et par famille, pour {A.hostname} et{" "}
              {B.hostname}
            </caption>
            <thead className="bg-ink text-white">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Pilier / famille
                </th>
                <th scope="col" className="break-all px-5 py-3 text-right font-semibold">
                  {A.hostname}
                </th>
                <th scope="col" className="break-all px-5 py-3 text-right font-semibold">
                  {B.hostname}
                </th>
              </tr>
            </thead>
            {cmp.pillars.map((row) => {
              const p = pillarTitle(row.pillar);
              return (
                <tbody key={row.pillar} className="border-t border-line">
                  <tr className="bg-surface-low">
                    <th scope="row" className="px-5 py-3 font-semibold text-ink-2">
                      Pilier {p?.index} · {p?.title}
                    </th>
                    <td className="tabular px-5 py-3 text-right font-semibold text-ink-2">{row.a}</td>
                    <td className="tabular px-5 py-3 text-right font-semibold text-ink-2">{row.b}</td>
                  </tr>
                  {row.families.map((f) => (
                    <tr key={f.family} className="border-t border-line">
                      <th scope="row" className="py-2 pl-10 pr-5 font-normal text-muted">
                        {FAMILY_LABELS[f.family]}
                      </th>
                      <td className="tabular px-5 py-2 text-right text-ink-2">{f.a}</td>
                      <td className="tabular px-5 py-2 text-right text-ink-2">{f.b}</td>
                    </tr>
                  ))}
                </tbody>
              );
            })}
          </table>
        </div>
      </section>

      {/* ═══════════ ÉCARTS ═══════════ */}
      <section>
        <SectionTitle
          eyebrow="Les constats"
          title="Ce qui distingue les deux sites"
          description="Chaque constat est factuel et porte sa référence. La qualification juridique relève de la CNIL ou d'un juge."
        />
        <div className="grid gap-5 lg:grid-cols-3">
          {[
            { title: `Propres à ${A.hostname}`, list: cmp.onlyA, empty: "Aucun écart propre à ce site." },
            { title: `Propres à ${B.hostname}`, list: cmp.onlyB, empty: "Aucun écart propre à ce site." },
            { title: "Communs aux deux", list: cmp.common.map((c) => c.a), empty: "Aucun écart commun." },
          ].map((col) => (
            <div key={col.title} className="rounded-3xl bg-surface p-5 ring-1 ring-line shadow-md">
              <h3 className="display mb-4 break-all text-lg text-ink-2">
                {col.title} <span className="tabular text-muted">({col.list.length})</span>
              </h3>
              <FindingList findings={col.list} empty={col.empty} />
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ DESTINATAIRES ═══════════ */}
      <section>
        <SectionTitle
          eyebrow="Souveraineté"
          title="Qui reçoit les données des visiteurs"
          description="Destinataires identifiés sur chaque site, avec leur juridiction effective une fois la chaîne capitalistique remontée."
        />
        <div className="grid gap-5 md:grid-cols-2">
          {[
            { host: A.hostname, vendors: A.vendors, outside: cmp.outsideEea.a.length },
            { host: B.hostname, vendors: B.vendors, outside: cmp.outsideEea.b.length },
          ].map((side) => (
            <div key={side.host} className="rounded-3xl bg-surface p-5 ring-1 ring-line shadow-md">
              <h3 className="display break-all text-lg text-ink-2">{side.host}</h3>
              <p className="mb-3 mt-1 text-[13px] text-muted">
                {side.vendors.length} destinataire(s), dont{" "}
                <span className={side.outside > 0 ? "font-semibold text-crit" : "font-semibold text-ok"}>
                  {side.outside} hors EEE
                </span>
              </p>
              <VendorList vendors={side.vendors} shared={shared} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CompareSkeleton({ a, b }: { a: string; b: string }) {
  return (
    <div role="status" aria-busy="true">
      <div className="pulse-soft grid gap-5 md:grid-cols-2" aria-hidden="true">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col items-center gap-4 rounded-3xl bg-surface p-6 ring-1 ring-line">
            <div className="h-6 w-48 max-w-full rounded bg-line" />
            <div className="h-40 w-40 rounded-full bg-line" />
            <div className="h-16 w-full rounded-xl bg-line" />
          </div>
        ))}
      </div>
      <p className="mt-6 font-mono text-sm text-muted">
        Analyse en parallèle de <span className="font-bold text-ink-2">{a}</span> et de{" "}
        <span className="font-bold text-ink-2">{b}</span>…
      </p>
    </div>
  );
}

/* ═══════════════════════════════ Page ═══════════════════════════════ */

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string | string[]; b?: string | string[] }>;
}) {
  const params = await searchParams;
  const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
  const a = first(params.a);
  const b = first(params.b);
  const single = (a && !b) || (!a && b) ? a || b : "";
  const sameHost = Boolean(a && b) && hostKey(a) !== null && hostKey(a) === hostKey(b);

  return (
    <>
      <JsonLd data={toolJsonLd(getTool("comparer")!)} />
      <section className="grid-bg-dark bg-ink">
        <div className="mx-auto max-w-7xl px-5 py-10">
          <p className="tech text-[10px] text-flame-soft">Comparaison</p>
          <h1 className="display mt-2 text-3xl text-white sm:text-4xl">Comparer deux sites</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/70">
            Deux adresses, deux audits côte à côte : score, écarts communs et propres à chacun,
            destinataires des données et leur juridiction.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-10">
        <div className="rounded-3xl bg-surface p-6 ring-1 ring-line shadow-md">
          <CompareForm defaultA={a} defaultB={b} />
        </div>

        <div className="mt-10">
          {single ? (
            <Notice eyebrow="Une seule adresse" title="Indiquez un second site pour comparer">
              <p>
                Une seule adresse a été fournie. Complétez le formulaire ci-dessus, ou consultez
                directement{" "}
                <Link href={reportHref(single)} className="text-flame underline">
                  le rapport complet de {single}
                </Link>
                .
              </p>
            </Notice>
          ) : sameHost ? (
            <Notice eyebrow="Même site" title="Les deux adresses désignent le même domaine">
              <p>
                Indiquez deux sites différents, ou consultez{" "}
                <Link href={reportHref(a)} className="text-flame underline">
                  le rapport complet de {a}
                </Link>
                .
              </p>
            </Notice>
          ) : a && b ? (
            <Suspense key={`${a}|${b}`} fallback={<CompareSkeleton a={a} b={b} />}>
              <CompareReport a={a} b={b} />
            </Suspense>
          ) : null}
        </div>

        <p className="mt-12 text-xs leading-relaxed text-muted">
          <span className="font-semibold text-ink-2">Avertissement. </span>
          {DISCLAIMER_SHORT}
        </p>
      </div>
    </>
  );
}
