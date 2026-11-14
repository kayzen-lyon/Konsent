import { siteOrigin } from "@/lib/security/origin";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Confirmation de l'adresse d'alerte (double opt-in).
 *
 *   GET /api/surveillance/confirmer?jeton=…
 *
 * Le lien arrive par courriel : la route est donc publique, et le jeton est
 * la seule preuve. Il est aléatoire (256 bits), stocké sous forme
 * d'empreinte, valable 48 h et consommé au premier usage. La réponse est
 * une courte page HTML, sans script ni ressource externe ; elle ne dit
 * jamais à quel domaine se rapportait un jeton invalide.
 */

function page(status: number, title: string, message: string): Response {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escape(title)} — Konsent</title>
</head>
<body>
<main>
<h1>${escape(title)}</h1>
<p>${escape(message)}</p>
<p><a href="${escape(siteOrigin())}/espace">Aller à mon espace</a> · <a href="${escape(siteOrigin())}/">Accueil de Konsent</a></p>
</main>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: Request) {
  const storage = getStorage();
  if (!storage.available) {
    return page(503, "Service indisponible", storage.reason);
  }

  const token = new URL(request.url).searchParams.get("jeton") ?? "";
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) {
    return page(400, "Lien invalide", "Ce lien de confirmation est incomplet ou mal formé.");
  }

  try {
    const domain = await storage.confirmAlertEmail(token);
    if (!domain) {
      return page(
        410,
        "Lien expiré ou déjà utilisé",
        "Ce lien n'est plus valable : il expire au bout de 48 heures et ne sert qu'une fois. Réinscrivez le domaine à la surveillance pour en recevoir un nouveau.",
      );
    }
    return page(
      200,
      "Adresse confirmée",
      `Les alertes de surveillance de ${domain.hostname} seront envoyées à cette adresse. Pour ne plus les recevoir, retirez le domaine de la surveillance ou répondez à l'une d'elles.`,
    );
  } catch (error) {
    console.error("[surveillance] confirmation", error);
    return page(500, "Confirmation impossible", "Réessayez dans un instant.");
  }
}
