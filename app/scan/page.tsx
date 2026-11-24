import { Suspense } from "react";
import type { Metadata } from "next";
import { AuditDocument } from "@/components/document/AuditDocument";
import { buildDocumentModel } from "@/components/document/model";
import { ReportView } from "@/components/report/ReportView";
import { ErrorPanel, ScanSkeleton, runScanOrPanel } from "@/components/report/ScanStates";
import { dbConfigured } from "@/lib/db";
import { parseReadingLevel, type ReadingLevel } from "@/lib/report/levels";
import "./rapport/rapport.css";

export const dynamic = "force-dynamic";
export const maxDuration = 150;

export const metadata: Metadata = {
  title: "Rapport d'audit",
  robots: { index: false, follow: false },
};

async function ScanReport({ target, level }: { target: string; level: ReadingLevel }) {
  const outcome = await runScanOrPanel(target);
  if (!outcome.ok) return outcome.panel;

  const { result, degraded } = outcome.verdict;
  return (
    <>
      <div className="kzd-online">
        <ReportView
          result={result}
          degraded={degraded}
          target={target}
          level={level}
          shareEnabled={dbConfigured()}
        />
      </div>
      {/* Document PDF de CE résultat, visible à l'impression seulement. */}
      <div className="kzd kzd-embed">
        <AuditDocument model={buildDocumentModel(result, degraded ?? null)} />
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
