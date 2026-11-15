"use client";

import { useState } from "react";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; url: string; expiresAt: string }
  | { kind: "error"; message: string };

/**
 * « Créer un lien de partage (30 jours) ».
 *
 * Seule exception à « rien n'est conservé », et seulement sur ce clic : le
 * serveur relance l'analyse, en fige le résultat technique et renvoie une
 * adresse valable 30 jours. Le texte dit ce qui est gardé AVANT le clic.
 */
export function ShareReportButton({ target }: { target: string }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [copied, setCopied] = useState("");

  async function create() {
    setState({ kind: "loading" });
    setCopied("");
    try {
      const response = await fetch("/api/rapport/partager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const data = (await response.json().catch(() => null)) as
        | { url?: string; expiresAt?: string; error?: string }
        | null;
      if (!response.ok || !data?.url || !data.expiresAt) {
        setState({ kind: "error", message: data?.error ?? "Le lien n'a pas pu être créé." });
        return;
      }
      setState({ kind: "done", url: data.url, expiresAt: data.expiresAt });
    } catch {
      setState({ kind: "error", message: "Le lien n'a pas pu être créé. Vérifiez votre connexion." });
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied("Lien copié dans le presse-papiers.");
    } catch {
      setCopied("La copie a échoué : sélectionnez le lien manuellement.");
    }
  }

  const pill =
    "font-display inline-flex min-h-10 items-center rounded-full border border-line px-3.5 text-[13px] font-semibold text-ink-2 transition-colors hover:border-flame hover:text-flame disabled:opacity-60";

  return (
    <div className="rounded-xl bg-surface p-4 ring-1 ring-line shadow-md print:hidden">
      <p className="tech text-[10px] text-accent">Lien de partage</p>
      <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-muted">
        Par défaut, rien n&apos;est conservé. Si vous créez un lien, une nouvelle analyse est
        lancée et son résultat technique (score, constats, destinataires observés) est conservé{" "}
        <strong>30 jours</strong> sous une adresse aléatoire, puis supprimé. Aucune donnée vous
        concernant n&apos;est enregistrée. Toute personne disposant du lien peut lire le rapport.
      </p>

      {state.kind !== "done" ? (
        <button
          type="button"
          onClick={create}
          disabled={state.kind === "loading"}
          aria-busy={state.kind === "loading"}
          className={`${pill} mt-3`}
        >
          {state.kind === "loading" ? "Création du lien…" : "Créer un lien de partage (30 jours)"}
        </button>
      ) : null}

      <div aria-live="polite" className="mt-3 text-[13px]">
        {state.kind === "loading" ? (
          <p className="text-muted">Analyse en cours, cela peut prendre jusqu&apos;à une minute.</p>
        ) : null}
        {state.kind === "error" ? <p className="text-crit-text">{state.message}</p> : null}
        {state.kind === "done" ? (
          <div className="space-y-2">
            <p className="text-ink-2">
              Lien créé. Il expire le{" "}
              <time dateTime={state.expiresAt}>
                {new Date(state.expiresAt).toLocaleDateString("fr-FR", {
                  dateStyle: "long",
                  timeZone: "Europe/Paris",
                })}
              </time>
              .
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={state.url}
                className="break-all font-mono text-[12px] text-flame underline underline-offset-2"
              >
                {state.url}
              </a>
              <button type="button" onClick={() => copy(state.url)} className={pill}>
                Copier le lien
              </button>
            </div>
            <p role="status" className="text-[12px] text-muted">
              {copied}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
