"use client";

import { useId, useState, type FormEvent } from "react";

type Kind = "slack" | "teams" | "generic";

const KIND_LABELS: Record<Kind, string> = {
  slack: "Slack",
  teams: "Microsoft Teams",
  generic: "Générique (JSON signé)",
};

export interface WebhookInitial {
  url: string;
  kind: Kind;
  lastAttemptAt: string | null;
  lastStatus: string | null;
}

/**
 * Réglage du webhook d'alerte d'un domaine.
 *
 * Le composant n'arbitre rien : la route valide l'adresse (https, publique)
 * et la propriété du domaine. Le secret de signature n'est montré qu'une
 * fois, juste après l'enregistrement — il n'est plus lisible ensuite, ni
 * ici ni dans l'export des données.
 */
export function WebhookSettings({
  domainId,
  hostname,
  initial,
}: {
  domainId: string;
  hostname: string;
  initial: WebhookInitial | null;
}) {
  const uid = useId();
  const [saved, setSaved] = useState<WebhookInitial | null>(initial);
  const [url, setUrl] = useState(initial?.url ?? "");
  const [kind, setKind] = useState<Kind>(initial?.kind ?? "slack");
  const [secret, setSecret] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(payload: Record<string, unknown>) {
    const res = await fetch("/api/surveillance/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domainId, ...payload }),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, data };
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setSecret(null);
    try {
      const { ok, data } = await call({ action: "save", url, kind });
      if (!ok) {
        setMessage({ tone: "error", text: String(data["error"] ?? "Enregistrement impossible.") });
        return;
      }
      setSaved({ url: String(data["url"]), kind, lastAttemptAt: null, lastStatus: null });
      setUrl(String(data["url"]));
      setSecret(String(data["secret"] ?? ""));
      setMessage({ tone: "ok", text: "Webhook enregistré." });
    } catch {
      setMessage({ tone: "error", text: "Le service n'a pas répondu." });
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMessage(null);
    try {
      const { ok, data } = await call({ action: "test" });
      const text = String(data["detail"] ?? data["error"] ?? (ok ? "Test envoyé." : "Test échoué."));
      setMessage({ tone: ok ? "ok" : "error", text });
      if (saved) setSaved({ ...saved, lastAttemptAt: new Date().toISOString(), lastStatus: text });
    } catch {
      setMessage({ tone: "error", text: "Le service n'a pas répondu." });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setMessage(null);
    setSecret(null);
    try {
      const { ok, data } = await call({ action: "delete" });
      if (!ok) {
        setMessage({ tone: "error", text: String(data["error"] ?? "Suppression impossible.") });
        return;
      }
      setSaved(null);
      setUrl("");
      setMessage({ tone: "ok", text: "Webhook retiré. Les alertes ne partiront plus que par courriel." });
    } catch {
      setMessage({ tone: "error", text: "Le service n'a pas répondu." });
    } finally {
      setBusy(false);
    }
  }

  const urlId = `${uid}-url`;
  const kindId = `${uid}-type`;
  const helpId = `${uid}-aide`;

  return (
    <div className="rounded-3xl border border-line bg-surface p-5">
      <h3 className="font-display text-base font-bold text-ink-2">{hostname}</h3>
      <p className="mt-1 text-[13px] text-muted">
        {saved ? (
          <>
            Webhook actif ({KIND_LABELS[saved.kind]})
            {saved.lastStatus ? <> · dernier envoi : {saved.lastStatus}</> : null}
          </>
        ) : (
          "Aucun webhook : les alertes partent par courriel uniquement."
        )}
      </p>

      <form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr]">
        <div className="flex flex-col gap-1">
          <label htmlFor={kindId} className="text-[13px] font-semibold text-ink-2">
            Destination
          </label>
          <select
            id={kindId}
            value={kind}
            onChange={(e) => setKind(e.target.value as Kind)}
            className="min-h-11 rounded-lg border border-line bg-surface px-3 text-[14px] text-ink-2"
          >
            {(Object.keys(KIND_LABELS) as Kind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={urlId} className="text-[13px] font-semibold text-ink-2">
            Adresse du webhook
          </label>
          <input
            id={urlId}
            type="url"
            inputMode="url"
            required
            maxLength={2048}
            autoComplete="off"
            spellCheck={false}
            aria-describedby={helpId}
            placeholder="https://hooks.slack.com/services/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="min-h-11 rounded-lg border border-line bg-surface px-3 font-mono text-[13px] text-ink-2"
          />
        </div>
        <p id={helpId} className="text-[12px] leading-relaxed text-muted sm:col-span-2">
          Adresse https:// publique uniquement. Le format est adapté à la destination ; le type
          générique reçoit un JSON signé par l&apos;en-tête <code>X-Konsent-Signature</code>.
        </p>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="font-display btn-primary min-h-11 rounded-full bg-flame px-5 text-sm font-bold text-white disabled:opacity-60"
          >
            {saved ? "Remplacer le webhook" : "Enregistrer le webhook"}
            <span className="sr-only"> de {hostname}</span>
          </button>
          {saved ? (
            <>
              <button
                type="button"
                onClick={test}
                disabled={busy}
                className="font-display min-h-11 rounded-full border-2 border-flame px-5 text-sm font-bold text-flame transition-colors hover:bg-surface-high disabled:opacity-60"
              >
                Envoyer un test<span className="sr-only"> au webhook de {hostname}</span>
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="font-display min-h-11 rounded-full border-2 border-line px-5 text-sm font-bold text-ink-2 transition-colors hover:bg-surface-high disabled:opacity-60"
              >
                Retirer<span className="sr-only"> le webhook de {hostname}</span>
              </button>
            </>
          ) : null}
        </div>
      </form>

      <div role="status" aria-live="polite" className="mt-3 empty:hidden">
        {message ? (
          <p className={`text-[13px] ${message.tone === "ok" ? "text-ink-2" : "text-crit-text"}`}>
            {message.tone === "ok" ? "Fait : " : "Erreur : "}
            {message.text}
          </p>
        ) : null}
      </div>

      {secret ? (
        <div className="mt-3 rounded-lg border-l-2 border-flame bg-surface-high p-3">
          <p className="text-[13px] font-semibold text-ink-2">
            Secret de signature — affiché une seule fois
          </p>
          <p className="mt-1 text-[12px] text-muted">
            Conservez-le maintenant. Chaque envoi porte{" "}
            <code>X-Konsent-Signature: sha256=&lt;HMAC du corps&gt;</code>, calculé avec ce secret.
          </p>
          <code className="mt-2 block break-all rounded bg-surface px-2 py-1 font-mono text-[12px] text-ink-2">
            {secret}
          </code>
        </div>
      ) : null}
    </div>
  );
}
