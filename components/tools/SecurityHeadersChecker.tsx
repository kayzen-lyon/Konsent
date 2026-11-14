"use client";

import { useState } from "react";
import type { CookieCheck, Grade, HeaderCheck } from "@/lib/tools/security-headers";

/**
 * Vérificateur d'en-têtes de sécurité. La requête vers le site est faite par
 * notre serveur (un navigateur ne peut pas lire les en-têtes d'un autre
 * site) ; rien n'est conservé, ni l'adresse ni la réponse.
 */

interface ApiResult {
  url: string;
  finalUrl: string;
  httpStatus: number;
  https: boolean;
  grade: Grade;
  score: number;
  checks: HeaderCheck[];
  cookies: CookieCheck[];
}

const buttonClass =
  "btn-primary inline-flex min-h-11 items-center justify-center rounded-full bg-flame px-6 py-3 text-sm font-semibold text-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame disabled:opacity-60";

const GRADE_CLS: Record<Grade, string> = {
  A: "bg-ok-bg text-ok",
  B: "bg-ok-bg text-ok",
  C: "bg-warn-bg text-warn",
  D: "bg-warn-bg text-warn",
  E: "bg-crit-bg text-crit-text",
  F: "bg-crit-bg text-crit-text",
};

function GradeBadge({ grade, large = false }: { grade: Grade; large?: boolean }) {
  return (
    <span
      className={`display inline-flex shrink-0 items-center justify-center rounded-2xl ${GRADE_CLS[grade]} ${
        large ? "h-16 w-16 text-3xl" : "h-9 w-9 text-base"
      }`}
    >
      <span className="sr-only">Note </span>
      {grade}
    </span>
  );
}

export default function SecurityHeadersChecker() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!url.trim()) {
      setError("Saisissez une adresse, par exemple exemple.fr.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/outils/en-tetes?url=${encodeURIComponent(url.trim())}`, {
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as (ApiResult & { error?: string }) | null;
      if (!res.ok || !data || data.error) {
        setError(
          data?.error ??
            (res.status === 429
              ? "Trop de vérifications en peu de temps. Réessayez dans quelques minutes."
              : "La vérification n'a pas abouti."),
        );
      } else {
        setResult(data);
      }
    } catch {
      setError("La vérification n'a pas abouti. Vérifiez votre connexion.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-10">
      <form
        onSubmit={run}
        noValidate
        className="rounded-3xl border border-line bg-surface p-6"
        aria-labelledby="sh-form-title"
      >
        <h2 id="sh-form-title" className="display text-xl text-ink-2">
          Adresse à vérifier
        </h2>
        <label htmlFor="sh-url" className="mt-4 block text-sm font-medium text-ink-2">
          Adresse du site
        </label>
        <p id="sh-url-hint" className="mt-1 text-sm text-muted">
          Un domaine (« exemple.fr ») ou une adresse complète. Seules les adresses publiques sont
          acceptées.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <input
            id="sh-url"
            type="text"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-describedby={`sh-url-hint${error ? " sh-error" : ""}`}
            aria-invalid={error ? true : undefined}
            placeholder="exemple.fr"
            className="min-w-0 flex-1 rounded-2xl border border-line-2 bg-surface px-4 py-3 text-[15px] text-ink-2 outline-none"
          />
          <button type="submit" className={buttonClass} disabled={busy}>
            {busy ? "Vérification…" : "Vérifier"}
          </button>
        </div>
        {error ? (
          <p id="sh-error" role="alert" className="mt-4 rounded-2xl border border-crit/30 bg-crit-bg px-4 py-3 text-sm text-crit-text">
            {error}
          </p>
        ) : null}
      </form>

      <div role="status" aria-live="polite" className="sr-only">
        {busy ? "Vérification en cours." : result ? `Note globale ${result.grade}, ${result.score} sur 100.` : ""}
      </div>

      {result ? <Results result={result} /> : null}
    </div>
  );
}

function Results({ result }: { result: ApiResult }) {
  return (
    <section className="mt-8 space-y-6" aria-labelledby="sh-result">
      <div className="flex flex-wrap items-center gap-5 rounded-3xl border border-line bg-surface p-6">
        <GradeBadge grade={result.grade} large />
        <div className="min-w-0 flex-1">
          <h2 id="sh-result" className="display text-2xl text-ink-2">
            Note globale : {result.grade} ({result.score}/100)
          </h2>
          <p className="mt-1 break-all text-sm text-muted">
            {result.finalUrl} · réponse HTTP {result.httpStatus}
            {result.finalUrl !== result.url ? ` · après redirection depuis ${result.url}` : ""}
          </p>
        </div>
      </div>

      <ul className="space-y-4">
        {result.checks.map((c) => (
          <li key={c.id} className="rounded-3xl border border-line bg-surface p-6">
            <div className="flex items-start gap-4">
              <GradeBadge grade={c.grade} />
              <div className="min-w-0 flex-1">
                <h3 className="display text-lg text-ink-2">{c.label}</h3>
                <p className="tech mt-0.5 text-[10px] text-muted">{c.header}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-2">{c.finding}</p>
                <p className="mt-3 text-xs text-muted">Valeur reçue</p>
                <p className="mt-1 break-all rounded-xl bg-surface-low px-3 py-2 font-mono text-xs text-ink-2">
                  {c.value ?? "absent"}
                </p>
                {c.grade !== "A" ? (
                  <>
                    <p className="mt-3 text-xs text-muted">Valeur recommandée</p>
                    <p className="mt-1 break-all rounded-xl border border-line bg-surface-low px-3 py-2 font-mono text-xs text-ink-2">
                      {c.recommended}
                    </p>
                  </>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {result.cookies.length > 0 ? (
        <div className="rounded-3xl border border-line bg-surface p-6">
          <h3 className="display text-lg text-ink-2">Cookies déposés par la réponse</h3>
          <p className="mt-1 text-sm text-muted">Les valeurs ne sont ni lues ni affichées : seuls les attributs comptent ici.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <caption className="sr-only">Attributs de sécurité de chaque cookie</caption>
              <thead>
                <tr className="border-b border-line-2 text-muted">
                  <th scope="col" className="py-2 pr-3 font-medium">Cookie</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Note</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Secure</th>
                  <th scope="col" className="py-2 pr-3 font-medium">HttpOnly</th>
                  <th scope="col" className="py-2 pr-3 font-medium">SameSite</th>
                  <th scope="col" className="py-2 font-medium">À corriger</th>
                </tr>
              </thead>
              <tbody>
                {result.cookies.map((c, i) => (
                  <tr key={`${c.name}-${i}`} className="border-b border-line align-top last:border-0">
                    <th scope="row" className="py-3 pr-3 font-mono text-xs font-normal text-ink-2">{c.name}</th>
                    <td className="py-3 pr-3"><GradeBadge grade={c.grade} /></td>
                    <td className="py-3 pr-3 text-ink-2">{c.secure ? "oui" : "non"}</td>
                    <td className="py-3 pr-3 text-ink-2">{c.httpOnly ? "oui" : "non"}</td>
                    <td className="py-3 pr-3 text-ink-2">{c.sameSite || "absent"}</td>
                    <td className="py-3 text-muted">{c.issues.length ? c.issues.join(" ; ") : "rien"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
