import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { ScanError, runScan } from "@/lib/engine/scan";
import { buildEvidenceBundle } from "@/lib/evidence/bundle";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * M09 — Téléchargement de l'archive de preuve.
 *
 *   GET /api/evidence?url=exemple.fr
 *
 * L'archive est construite à la volée : rien n'est conservé côté serveur,
 * conformément à ce qu'annonce la politique de confidentialité.
 */
export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get("url");

  if (!target) {
    return Response.json(
      { error: "Paramètre « url » manquant.", disclaimer: DISCLAIMER_SHORT },
      { status: 400 },
    );
  }

  try {
    const scan = await runScan(target);
    const bundle = buildEvidenceBundle(scan);

    return new Response(new Uint8Array(bundle.bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${bundle.filename}"`,
        "Content-Length": String(bundle.bytes.length),
        "X-Konsent-Archive-SHA256": bundle.archiveSha256,
        "X-Konsent-Production-Key": String(bundle.production),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ScanError) {
      const status = error.code === "INVALID_URL" ? 400 : 502;
      return Response.json(
        { error: error.message, code: error.code, disclaimer: DISCLAIMER_SHORT },
        { status },
      );
    }
    return Response.json(
      { error: "La construction de l'archive n'a pas abouti.", disclaimer: DISCLAIMER_SHORT },
      { status: 500 },
    );
  }
}
