import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/auth";
import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { ScanError, normalizeTarget } from "@/lib/engine/scan";
import { BlockedTargetError, safeFetch } from "@/lib/security/network";
import { RATE_RULES, limitAnonymousByIp } from "@/lib/security/rate-limit";
import { evaluateHeaders } from "@/lib/tools/security-headers";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

const TIMEOUT_MS = 10_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; KonsentBot/1.0; +https://konsent.kayzen-lyon.com/bot) AppleWebKit/537.36";

/**
 * Outil libre — en-têtes de sécurité d'une adresse.
 *
 *   GET /api/outils/en-tetes?url=exemple.fr
 *
 * Une seule requête GET, redirections suivies par `safeFetch` (adresses
 * publiques uniquement, contrôle à chaque saut). Le corps n'est pas lu.
 * Rien n'est conservé : ni l'adresse, ni les en-têtes, ni les valeurs des
 * cookies, qui ne sont même pas renvoyées — seuls leurs noms et attributs.
 */
async function handleGET(request: Request) {
  const limited = await limitAnonymousByIp(request, RATE_RULES.scan);
  if (limited) return limited;

  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) {
    return NextResponse.json(
      { error: "Paramètre « url » manquant.", disclaimer: DISCLAIMER_SHORT },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  let target: URL;
  try {
    target = normalizeTarget(raw);
  } catch (error) {
    const message = error instanceof ScanError ? error.message : "Cette adresse n'est pas valide.";
    return NextResponse.json(
      { error: message, code: "INVALID_URL", disclaimer: DISCLAIMER_SHORT },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const { response, finalUrl } = await safeFetch(target.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
    });
    await response.body?.cancel().catch(() => undefined);

    const headers = response.headers;
    const setCookies = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
    const https = new URL(finalUrl).protocol === "https:";
    const report = evaluateHeaders((name) => headers.get(name), setCookies, https);

    return NextResponse.json(
      {
        disclaimer: DISCLAIMER_SHORT,
        url: target.toString(),
        finalUrl,
        httpStatus: response.status,
        checkedAt: new Date().toISOString(),
        ...report,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    // Refus levé à la résolution DNS : undici l'enveloppe dans `cause`.
    const cause = error instanceof Error ? error.cause : undefined;
    if (error instanceof BlockedTargetError || cause instanceof BlockedTargetError) {
      return NextResponse.json(
        {
          error: "Seules les adresses publiques peuvent être analysées.",
          code: "BLOCKED_TARGET",
          disclaimer: DISCLAIMER_SHORT,
        },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const aborted = controller.signal.aborted;
    return NextResponse.json(
      {
        error: aborted
          ? "Le site n'a pas répondu dans les dix secondes."
          : "Le site n'a pas pu être joint.",
        code: aborted ? "TIMEOUT" : "UNREACHABLE",
        disclaimer: DISCLAIMER_SHORT,
      },
      { status: aborted ? 504 : 502, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    clearTimeout(timer);
  }
}

export const GET = withApiAuth("scan:read", handleGET);
