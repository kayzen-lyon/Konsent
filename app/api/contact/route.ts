import {
  HONEYPOT_FIELD,
  TIMESTAMP_FIELD,
  evaluateSubmission,
  refusalMessage,
} from "@/lib/contact/antispam";
import { EDITOR } from "@/lib/disclaimer";
import { isPlausibleAddress, sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * Réception d'un message de contact.
 *
 *   POST /api/contact
 *
 * Route INTERNE : elle ne sert aucune donnée d'audit et n'entre pas dans la
 * description OpenAPI publique.
 *
 * Deux principes tiennent tout le fichier.
 *
 * **Minimisation.** Trois champs sont lus, et trois seulement. Ni adresse IP,
 * ni empreinte de navigateur, ni horodatage de frappe : rien de ce qui ne
 * sert pas strictement à répondre. Le message n'est pas non plus conservé en
 * base — il est relayé par courriel, puis oublié.
 *
 * **Refus muet.** Un envoi écarté reçoit un message neutre. Détailler le motif
 * — « pot de miel rempli », « trop rapide » — indiquerait au robot comment
 * passer au coup suivant.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  const verdict = evaluateSubmission({
    honeypot: body[HONEYPOT_FIELD],
    token: body[TIMESTAMP_FIELD],
  });

  if (!verdict.accepted) {
    // Statut 200 volontaire pour le pot de miel : un robot qui reçoit 403
    // apprend qu'il a été détecté et ajuste. Un 200 sans effet ne lui apprend
    // rien. Les autres motifs répondent en 400, car un humain peut être
    // concerné et doit comprendre qu'il doit recommencer.
    if (verdict.reason === "HONEYPOT") {
      return Response.json({ ok: true }, { status: 200 });
    }
    return Response.json({ error: refusalMessage(verdict.reason) }, { status: 400 });
  }

  const nom = String(body["nom"] ?? "").trim().slice(0, 120);
  const email = String(body["email"] ?? "").trim().toLowerCase().slice(0, 200);
  const message = String(body["message"] ?? "").trim().slice(0, 4000);
  const consentement = body["consentement"];

  if (!nom || !message) {
    return Response.json({ error: "Le nom et le message sont requis." }, { status: 400 });
  }
  if (!isPlausibleAddress(email)) {
    return Response.json({ error: "Cette adresse électronique n'est pas valide." }, { status: 400 });
  }
  // Le consentement est recueilli par une case non pré-cochée. Son absence
  // interdit le traitement : le vérifier côté serveur évite qu'un envoi
  // fabriqué contourne la case.
  if (consentement !== true && consentement !== "on" && consentement !== "true") {
    return Response.json(
      { error: "Votre accord est nécessaire pour que nous puissions vous répondre." },
      { status: 400 },
    );
  }

  const sent = await sendEmail({
    to: EDITOR.email,
    subject: `Message de ${nom} — ${EDITOR.product}`,
    // Texte brut uniquement : un message HTML envoyé par un auditeur de
    // traceurs pourrait porter un pixel de suivi. Le texte brut ne le peut pas.
    text: [
      `Nom     : ${nom}`,
      `Courriel: ${email}`,
      "",
      message,
      "",
      "—",
      "Envoyé depuis le formulaire de contact. Répondre directement à l'adresse ci-dessus.",
    ].join("\n"),
    replyTo: email,
  });

  if (!sent.sent) {
    // On ne prétend pas avoir transmis un message resté sur place. L'adresse
    // directe est rappelée pour que l'utilisateur ne reste pas sans recours.
    return Response.json(
      {
        error: `Votre message n'a pas pu être transmis. Écrivez-nous directement à ${EDITOR.email}.`,
      },
      { status: 502 },
    );
  }

  return Response.json({ ok: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
}
