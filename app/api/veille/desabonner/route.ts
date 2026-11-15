import { unsubscribe } from "@/lib/newsletter";
import { siteOrigin } from "@/lib/security/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Désabonnement de la lettre de la veille.
 *
 *   GET  /api/veille/desabonner?t=…   (page de confirmation, lien en pied de lettre)
 *   POST /api/veille/desabonner?t=…   (désabonnement en un clic, RFC 8058)
 *
 * Le jeton est un HMAC de l'identifiant de l'abonné : il ne se forge pas
 * sans le secret du serveur. La ligne est supprimée, pas marquée. Pas de
 * contrôle d'origine sur le POST : c'est la messagerie du destinataire qui
 * l'émet, et le jeton suffit à l'authentifier.
 */
async function handle(request: Request): Promise<Response> {
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const done = token.length <= 200 && (await unsubscribe(token));
  return new Response(null, {
    status: 303,
    headers: {
      Location: `${siteOrigin()}/veille?abonnement=${done ? "retire" : "invalide"}#lettre`,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

/**
 * GET ne supprime rien : les analyseurs de liens des messageries ouvrent
 * chaque URL d'un e-mail, et désabonneraient le lecteur à son insu. Il
 * affiche une page de confirmation dont le bouton émet le POST.
 */
export async function GET(request: Request): Promise<Response> {
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const action = `/api/veille/desabonner?t=${encodeURIComponent(token.slice(0, 200))}`;
  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Se désabonner — Konsent</title></head>
<body>
<main>
<h1>Se désabonner de la lettre de la veille</h1>
<p>Confirmez pour supprimer votre adresse de la liste. Vous ne recevrez plus aucune lettre.</p>
<form method="post" action="${action.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}">
<button type="submit">Confirmer le désabonnement</button>
</form>
<p><a href="/veille">Revenir à la veille</a></p>
</main>
</body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex",
    },
  });
}

export const POST = handle;
