import type { Metadata } from "next";
import { dbConfigured, getSql } from "@/lib/db";
import { emailConfigured } from "@/lib/email";
import { isWorkerConfigured } from "@/lib/engine/worker-client";
import { stripeConfigured } from "@/lib/billing/stripe";
import { RULEPACK } from "@/lib/rulepack";

export const metadata: Metadata = {
  title: "Statut du service",
  description:
    "État en temps réel des composants de Konsent : moteur d'analyse, base de données, envoi d'e-mails, paiement.",
};

// Recalculé au plus une fois par minute : la page reste rapide et la base
// n'est pas sollicitée à chaque visite.
export const revalidate = 60;

type State = "ok" | "degraded" | "off" | "inactive";

const LABEL: Record<State, string> = {
  ok: "Opérationnel",
  degraded: "Mode réduit",
  off: "Indisponible",
  inactive: "Non activé",
};
const DOT: Record<State, string> = { ok: "bg-ok", degraded: "bg-warn", off: "bg-crit", inactive: "bg-line-2" };

async function databaseState(): Promise<{ state: State; detail: string }> {
  if (!dbConfigured()) return { state: "inactive", detail: "Aucune base configurée : comptes et surveillance inactifs." };
  const started = Date.now();
  try {
    await getSql()`select 1`;
    return { state: "ok", detail: `Répond en ${Date.now() - started} ms (Neon, Francfort).` };
  } catch {
    return { state: "off", detail: "La base ne répond pas : comptes et surveillance momentanément indisponibles." };
  }
}

export default async function StatusPage() {
  const db = await databaseState();
  const components: { name: string; state: State; detail: string }[] = [
    {
      name: "Audit à la demande",
      state: "ok",
      detail: `Moteur d'analyse, référentiel ${RULEPACK.version} (${RULEPACK.total} règles).`,
    },
    {
      name: "Protocole en trois phases (navigateur)",
      state: isWorkerConfigured() ? "ok" : "degraded",
      detail: isWorkerConfigured()
        ? "Le worker navigateur est déployé."
        : "Worker non déployé : les audits passent en analyse statique, et le rapport le dit.",
    },
    { name: "Comptes, surveillance, clés d'API", state: db.state, detail: db.detail },
    {
      name: "Alertes et liens de connexion par e-mail",
      state: emailConfigured() ? "ok" : "inactive",
      detail: emailConfigured() ? "L'envoi d'e-mails est configuré." : "Aucun service d'envoi configuré.",
    },
    {
      name: "Souscription en ligne",
      state: stripeConfigured() ? "ok" : "inactive",
      detail: stripeConfigured() ? "Le paiement en ligne est ouvert." : "Le paiement en ligne n'est pas ouvert.",
    },
  ];
  // « Non activé » est un choix de configuration, pas une panne : il ne
  // dégrade pas l'état général.
  const worst: State = components.some((c) => c.state === "off" || c.state === "degraded")
    ? "degraded"
    : "ok";
  const checkedAt = new Date();

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <h1 className="display text-3xl text-ink-2 sm:text-4xl">Statut du service</h1>
      <p className="mt-3 text-[13px] text-muted">
        Vérifié le{" "}
        <time dateTime={checkedAt.toISOString()}>
          {checkedAt.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" })}
        </time>{" "}
        — actualisé chaque minute.
      </p>

      <p
        className={`mt-8 flex items-center gap-3 rounded-3xl border border-line bg-surface p-5 text-lg font-bold text-ink-2 shadow-md`}
      >
        <span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded-full ${DOT[worst]}`} />
        {worst === "ok"
          ? "Tous les services fonctionnent."
          : "Le service fonctionne ; certains composants sont en mode réduit."}
      </p>

      <ul className="mt-6 divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
        {components.map((c) => (
          <li key={c.name} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
            <div className="min-w-0">
              <p className="font-bold text-ink-2">{c.name}</p>
              <p className="mt-1 text-sm text-muted">{c.detail}</p>
            </div>
            <span className="font-display inline-flex shrink-0 items-center gap-2 rounded-full bg-surface-low px-3 py-1 text-xs font-bold text-ink-2">
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${DOT[c.state]}`} />
              {LABEL[c.state]}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-sm leading-relaxed text-muted">
        Un incident à signaler ? Écrivez-nous depuis la{" "}
        <a href="/contact" className="text-flame">
          page de contact
        </a>
        . Les vulnérabilités de sécurité se signalent selon notre{" "}
        <a href="/.well-known/security.txt" className="text-flame">
          fichier security.txt
        </a>
        .
      </p>
    </div>
  );
}
