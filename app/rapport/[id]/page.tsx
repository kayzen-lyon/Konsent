import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ReportView } from "@/components/report/ReportView";
import { dbConfigured } from "@/lib/db";
import { parseReadingLevel } from "@/lib/report/levels";
import { getSharedReport, isShareId, sharedReportUrl } from "@/lib/report/shared";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rapport figé",
  robots: { index: false, follow: false },
};

/**
 * Rapport figé d'un lien de partage (opt-in, 30 jours).
 *
 * Aucune analyse n'est lancée ici : on relit le résultat produit par notre
 * serveur au moment du partage. Inconnu, expiré ou base absente : 404, sans
 * distinguer les cas (un jeton ne doit pas pouvoir se sonder).
 */
export default async function SharedReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vue?: string }>;
}) {
  const { id } = await params;
  const { vue } = await searchParams;
  if (!dbConfigured() || !isShareId(id)) notFound();

  const shared = await getSharedReport(id);
  if (!shared) notFound();

  return (
    <ReportView
      result={shared.result}
      degraded={shared.degraded}
      target={shared.result.url}
      level={parseReadingLevel(vue)}
      frozen={{
        id: shared.id,
        url: sharedReportUrl(shared.id),
        createdAt: shared.createdAt,
        expiresAt: shared.expiresAt,
      }}
    />
  );
}
