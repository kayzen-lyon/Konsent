"use client";

import { useState } from "react";

interface Registration {
  hostname: string;
  verified: boolean;
  frequency: string;
  retentionDays: number;
  verification: { token: string; dns: string; file: string };
}

/**
 * Inscription à la surveillance planifiée.
 *
 * Deux étapes délibérément séparées : l'inscription, puis la preuve de
 * maîtrise du domaine. Rien n'est planifié ni conservé entre les deux.
 */
export function MonitorSignup() {
  const [hostname, setHostname] = useState("");
  const [email, setEmail] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function register(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostname, email, frequency }),
      });
      const data = (await res.json()) as Registration & { error?: string };
      if (!res.ok) {
        setMessage({ tone: "error", text: data.error ?? "Inscription impossible." });
        return;
      }
      setRegistration(data);
    } catch {
      setMessage({ tone: "error", text: "Le service n'a pas répondu." });
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/monitors?verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostname, email }),
      });
      const data = (await res.json()) as { verified: boolean; detail?: string; error?: string };
      setMessage({
        tone: data.verified ? "ok" : "error",
        text: data.verified
          ? "Domaine vérifié. La surveillance est active : la première analyse partira au prochain passage."
          : (data.detail ?? data.error ?? "Vérification impossible."),
      });
      if (data.verified && registration) {
        setRegistration({ ...registration, verified: true });
      }
    } catch {
      setMessage({ tone: "error", text: "Le service n'a pas répondu." });
    } finally {
      setBusy(false);
    }
  }

  if (registration) {
    return (
      <div className="rounded-xl bg-surface p-6 ring-1 ring-line">
        <p className="tech text-[10px] text-accent">Étape 2 sur 2</p>
        <h2 className="display mt-2 text-xl text-ink-2">
          Prouvez que ce domaine est le vôtre
        </h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-muted">
          Nous ne surveillons pas le site d&apos;autrui, et nous ne conservons rien tant que
          cette étape n&apos;est pas franchie. Une seule des deux méthodes suffit.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <p className="tech text-[10px] text-muted">Méthode 1 — enregistrement DNS</p>
            <pre className="mt-1.5 overflow-x-auto rounded-lg bg-[#0b1220] p-3 font-mono text-[12px] text-white/85">
              <code>{registration.verification.dns}</code>
            </pre>
          </div>
          <div>
            <p className="tech text-[10px] text-muted">Méthode 2 — fichier à publier</p>
            <pre className="mt-1.5 overflow-x-auto rounded-lg bg-[#0b1220] p-3 font-mono text-[12px] text-white/85">
              <code>{registration.verification.file}</code>
            </pre>
          </div>
        </div>

        {message ? (
          <p
            role="status"
            className={`mt-4 rounded-lg p-3 text-[14px] leading-relaxed ${
              message.tone === "ok" ? "bg-ok-bg text-ok" : "bg-warn-bg text-warn"
            }`}
          >
            {message.text}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={verify}
            disabled={busy || registration.verified}
            className="tech rounded bg-flame px-5 py-3 text-[11px] text-white transition hover:bg-flame-dark disabled:opacity-60"
          >
            {registration.verified
              ? "Vérifié ✓"
              : busy
                ? "Vérification…"
                : "J'ai publié — vérifier"}
          </button>
          <button
            type="button"
            onClick={() => {
              setRegistration(null);
              setMessage(null);
            }}
            className="tech rounded border border-line px-5 py-3 text-[11px] text-muted transition hover:border-flame hover:text-accent"
          >
            Recommencer
          </button>
        </div>

        <p className="mt-5 border-t border-line pt-4 text-[12.5px] leading-relaxed text-muted">
          Une fois vérifié, nous analysons ce domaine à la fréquence choisie et vous écrivons
          uniquement en cas de régression. L&apos;historique est conservé{" "}
          {registration.retentionDays} jours, puis purgé automatiquement.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={register} className="rounded-xl bg-surface p-6 ring-1 ring-line" noValidate>
      <p className="tech text-[10px] text-accent">Étape 1 sur 2</p>
      <h2 className="display mt-2 text-xl text-ink-2">Surveiller un domaine</h2>
      <p className="mt-2 text-[14.5px] leading-relaxed text-muted">
        Nous analysons votre site à intervalle régulier et vous écrivons uniquement quand quelque
        chose se dégrade. Le reste du temps, vous n&apos;entendez pas parler de nous.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="mon-host" className="tech text-[10px] text-muted">
            Domaine
          </label>
          <input
            id="mon-host"
            type="text"
            inputMode="url"
            spellCheck={false}
            placeholder="exemple.fr"
            value={hostname}
            onChange={(e) => setHostname(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line px-4 py-3 font-mono text-[15px] text-ink-2 outline-none transition focus:border-flame"
          />
        </div>

        <div>
          <label htmlFor="mon-email" className="tech text-[10px] text-muted">
            Adresse pour les alertes
          </label>
          <input
            id="mon-email"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line px-4 py-3 text-[15px] text-ink-2 outline-none transition focus:border-flame"
          />
        </div>

        <fieldset>
          <legend className="tech text-[10px] text-muted">Fréquence</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                ["daily", "Quotidienne"],
                ["weekly", "Hebdomadaire"],
                ["monthly", "Mensuelle"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className={`tech cursor-pointer rounded border px-4 py-2.5 text-[10px] transition ${
                  frequency === value
                    ? "border-flame bg-flame text-white"
                    : "border-line text-muted hover:border-flame"
                }`}
              >
                <input
                  type="radio"
                  name="frequency"
                  value={value}
                  checked={frequency === value}
                  onChange={() => setFrequency(value)}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {message ? (
        <p role="alert" className="mt-4 rounded-lg bg-warn-bg p-3 text-[14px] text-warn">
          {message.text}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="tech mt-6 w-full rounded bg-flame px-6 py-3.5 text-[11px] text-white transition hover:bg-flame-dark disabled:opacity-60"
      >
        {busy ? "Inscription…" : "Continuer"}
      </button>

      <p className="mt-4 text-[12.5px] leading-relaxed text-muted">
        Nous conserverons le domaine, votre adresse et l&apos;historique des analyses pendant
        395 jours, puis purge automatique. Aucune donnée relative aux visiteurs de votre site
        n&apos;est collectée : un audit observe un serveur, pas des personnes. Voir notre{" "}
        <a href="/confidentialite" className="text-accent hover:underline">
          politique de confidentialité
        </a>
        .
      </p>
    </form>
  );
}
