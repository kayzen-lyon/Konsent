"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { identifyCookies, MAX_COOKIES } from "@/lib/tools/cookie-tester";

/**
 * Testeur de cookie, 100 % navigateur. Seuls les noms sont extraits de la
 * saisie ; les valeurs sont ignorées dès l'analyse.
 */
export default function CookieTester() {
  const [value, setValue] = useState("");
  const results = useMemo(() => (value.trim() ? identifyCookies(value) : []), [value]);
  const known = results.filter((r) => r.entry).length;
  const consent = results.filter((r) => r.entry?.requiresConsent).length;

  return (
    <div className="mt-10">
      <div className="rounded-3xl border border-line bg-surface p-6">
        <label htmlFor="ct-input" className="block text-sm font-medium text-ink-2">
          Nom de cookie, chaîne document.cookie ou en-tête Cookie
        </label>
        <p id="ct-hint" className="mt-1 text-sm text-muted">
          Exemples : « _ga », « _fbp=fb.1.123; _gcl_au=1.1.456 », ou un nom par ligne. Les valeurs
          sont ignorées. {MAX_COOKIES} cookies au plus.
        </p>
        <textarea
          id="ct-input"
          rows={4}
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-describedby="ct-hint"
          placeholder="_ga=GA1.1.123; _fbp=fb.1.456; PHPSESSID=abc"
          className="mt-2 w-full rounded-2xl border border-line-2 bg-surface px-4 py-3 font-mono text-sm text-ink-2 outline-none"
        />
      </div>

      <p role="status" aria-live="polite" className="mt-4 text-sm text-muted">
        {value.trim() === ""
          ? ""
          : results.length === 0
            ? "Aucun nom de cookie reconnaissable dans la saisie."
            : `${results.length} cookie${results.length > 1 ? "s" : ""} analysé${results.length > 1 ? "s" : ""} : ${known} identifié${known > 1 ? "s" : ""}, dont ${consent} soumis au consentement.`}
      </p>

      {results.length > 0 ? (
        <ul className="mt-4 space-y-4" aria-label="Cookies analysés">
          {results.map((r) => (
            <li key={r.name} className="rounded-3xl border border-line bg-surface p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="break-all font-mono text-lg text-ink-2">{r.name}</h2>
                {r.entry ? (
                  r.entry.requiresConsent ? (
                    <span className="rounded bg-crit-bg px-2 py-0.5 text-xs text-crit-text">consentement requis</span>
                  ) : (
                    <span className="rounded bg-ok-bg px-2 py-0.5 text-xs text-ok">exempté de consentement</span>
                  )
                ) : (
                  <span className="rounded bg-surface-low px-2 py-0.5 text-xs text-muted">inconnu de notre index</span>
                )}
              </div>

              {r.entry ? (
                <>
                  {r.entry.name !== r.name ? (
                    <p className="mt-1 text-xs text-muted">
                      Rapproché du motif <code className="font-mono">{r.entry.name}</code>
                    </p>
                  ) : null}
                  <p className="mt-3 text-sm leading-relaxed text-ink-2">{r.entry.purposeFr}</p>
                  <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted">Éditeur</dt>
                      <dd className="text-ink-2">
                        {r.vendor ? `${r.vendor.name} — ${r.vendor.entity}` : r.entry.vendorName}
                      </dd>
                    </div>
                    {r.vendor ? (
                      <div>
                        <dt className="text-muted">Juridiction effective</dt>
                        <dd className="text-ink-2">{r.vendor.jurisdiction}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="text-muted">Durée de vie observée</dt>
                      <dd className={r.tooLong ? "font-medium text-warn" : "text-ink-2"}>
                        {r.lifetime}
                        {r.tooLong ? " — au-delà des 13 mois de référence" : ""}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Catégorie</dt>
                      <dd className="text-ink-2">{r.entry.category}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Identifiant de la personne</dt>
                      <dd className="text-ink-2">{r.entry.isIdentifier ? "oui" : "non"}</dd>
                    </div>
                  </dl>
                  {r.entry.noteFr ? <p className="mt-3 text-sm leading-relaxed text-muted">{r.entry.noteFr}</p> : null}
                  <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                    <Link href={`/cookies/${r.entry.slug}`} className="font-medium text-flame underline underline-offset-4">
                      Fiche du cookie {r.entry.name}
                    </Link>
                    {r.vendor ? (
                      <Link href={`/traceurs/${r.vendor.slug}`} className="font-medium text-flame underline underline-offset-4">
                        Fiche de {r.vendor.name}
                      </Link>
                    ) : null}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Ce nom ne figure pas dans notre index. Cela ne signifie pas qu&apos;il est
                  inoffensif : un cookie propre au site (session, panier) est souvent exempté, mais un
                  nom générique peut aussi masquer un traceur. Vérifiez quel script le dépose, ou
                  lancez un{" "}
                  <Link href="/scan" className="font-medium text-flame underline underline-offset-4">
                    audit complet
                  </Link>
                  .
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
