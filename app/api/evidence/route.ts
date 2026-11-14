import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { withApiAuth } from "@/lib/api/auth";
import { runVerdictScan } from "@/lib/engine/orchestrate";
import { ScanError } from "@/lib/engine/scan";
import { buildEvidenceBundle } from "@/lib/evidence/bundle";
import { RATE_RULES, limitAnonymousByIp } from "@/lib/security/rate-limit";

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
async function handleGET(request: Request) {
  const limited = await limitAnonymousByIp(request, RATE_RULES.evidence);
  if (limited) return limited;

  const target = new URL(request.url).searchParams.get("url");

  if (!target) {
    return Response.json(
      { error: "Paramètre « url » manquant.", disclaimer: DISCLAIMER_SHORT },
      { status: 400 },
    );
  }

  try {
    // L'archive doit porter la MÊME observation que le rapport lu à l'écran.
    // Une archive statique adossée à un rapport navigateur produirait deux
    // vérités opposables sur la même URL, ce qui ruinerait sa valeur.
    const { result: scan } = await runVerdictScan(target);
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

/**
 * Contrôle, quota et journal.
 *
 * La route reste ouverte sans clé — le verdict sans compte est la promesse
 * produit n°1. Une clé présentée est vérifiée, rattachée à son organisation,
 * décomptée de son quota et journalisée.
 */
export const GET = withApiAuth("evidence:read", handleGET);
