import { Suspense } from "react";
import type { Metadata } from "next";
import { PrintReportButton } from "@/components/PrintReportButton";
import { AuditDocument } from "@/components/document/AuditDocument";
import { buildDocumentModel } from "@/components/document/model";
import { ErrorPanel, ScanSkeleton, runScanOrPanel } from "@/components/report/ScanStates";
import "./rapport.css";

export const dynamic = "force-dynamic";
export const maxDuration = 150;

export const metadata: Metadata = {
  title: "Rapport d'audit PDF",
  robots: { index: false, follow: false },
};

async function Rapport({ target }: { target: string }) {
  const outcome = await runScanOrPanel(target);
  if (!outcome.ok) return outcome.panel;
  const { result, degraded } = outcome.verdict;
  return (
    <div className="kzd kzd-desk">
      <div className="kzd-toolbar">
        <a href={`/scan?url=${encodeURIComponent(target)}`}>← Rapport en ligne (nouvelle analyse)</a>
        <PrintReportButton />
      </div>
      <AuditDocument model={buildDocumentModel(result, degraded ?? null)} />
    </div>
  );
}

export default async function RapportPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  if (!url) {
    return <ErrorPanel title="Aucune adresse fournie" message="Indiquez l'adresse du site à analyser." />;
  }
  return (
    <Suspense key={url} fallback={<ScanSkeleton target={url} />}>
      <Rapport target={url} />
    </Suspense>
  );
}
