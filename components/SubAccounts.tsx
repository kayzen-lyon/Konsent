"use client";

import { useState } from "react";

interface SubAccount {
  id: string;
  email: string;
  createdAt: string;
}

/**
 * Gestion des sous-comptes clients d'une agence.
 *
 * Le composant n'arbitre rien : il affiche ce que la route renvoie et les
 * refus tels qu'ils lui parviennent. Toute la décision d'accès vit dans
 * `lib/agency/tenancy.ts`, et une vérification recopiée ici finirait par
 * diverger — c'est toujours la copie oubliée qui laisse passer.
 */
export function SubAccounts({
  initial,
  quota,
}: {
  initial: readonly SubAccount[];
  quota: number;
}) {
  const [list, setList] = useState<readonly SubAccount[]>(initial);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const full = list.length >= quota;

  async function attach(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/agence/sous-comptes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { subAccount?: SubAccount; error?: string };
      if (!res.ok || !data.subAccount) {
        setMessage({ tone: "error", text: data.error ?? "Rattachement impossible." });
        return;
      }
      setList((current) => [...current, data.subAccount!]);
      setEmail("");
      setMessage({
        tone: "ok",
        text: `${data.subAccount.email} est rattaché. Ce client ne voit que ses propres domaines, ni les vôtres ni ceux de vos autres clients.`,
      });
    } catch {
      setMessage({ tone: "error", text: "Le service n'a pas répondu." });
    } finally {
      setBusy(false);
    }
  }

  async function detach(id: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/agence/sous-comptes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage({ tone: "error", text: data.error ?? "Détachement impossible." });
        return;
      }
      setList((current) => current.filter((c) => c.id !== id));
      // Le détachement ne supprime pas le compte : le dire évite de laisser
      // croire à un effacement qui n'a pas eu lieu.
      setMessage({
        tone: "ok",
        text: "Client détaché. Son compte subsiste et redevient autonome ; ses données ne vous sont plus visibles.",
      });
    } catch {
      setMessage({ tone: "error", text: "Le service n'a pas répondu." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl bg-surface p-5 ring-1 ring-line shadow-md">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="tech text-[10px] text-muted">Sous-comptes clients</p>
        <p className="tabular text-[12px] text-muted">
          {list.length} / {quota}
        </p>
      </div>

      {list.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          Aucun client rattaché. Un sous-compte donne à votre client l&apos;accès à ses seuls
          domaines — il ne voit ni les vôtres, ni ceux de vos autres clients.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {list.map((client) => (
            <li key={client.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-[14px] text-ink-2">{client.email}</p>
                <p className="text-[11px] text-muted">
                  rattaché le {new Date(client.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void detach(client.id)}
                disabled={busy}
                className="tech rounded border border-ink/20 px-3 py-1.5 text-[10px] text-ink-2 transition hover:border-crit hover:text-crit disabled:opacity-50"
              >
                Détacher
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={attach} className="mt-4 flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="client-email">
          Adresse du client à rattacher
        </label>
        <input
          id="client-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="client@exemple.fr"
          disabled={busy || full}
          className="min-w-0 flex-1 rounded border border-line px-3 py-2 text-sm text-ink-2 disabled:bg-paper"
        />
        <button
          type="submit"
          disabled={busy || full}
          className="tech rounded-full bg-flame shadow-md px-4 py-2 text-[10px] text-white transition hover:bg-flame-dark disabled:opacity-50"
        >
          {busy ? "…" : "Rattacher"}
        </button>
      </form>

      {full ? (
        <p className="mt-2 text-[12px] text-warn">
          Les {quota} sous-comptes inclus dans votre offre sont utilisés.
        </p>
      ) : null}

      {message ? (
        <p
          className={`mt-3 text-[13px] leading-relaxed ${
            message.tone === "error" ? "text-crit" : "text-ok"
          }`}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
