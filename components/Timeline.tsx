import type { Observation } from "@/lib/engine/types";
import { CONSENT_REQUIRED_CATEGORIES } from "@/lib/trackers/db";
import { phaseSummaries } from "@/lib/report/phases";

/**
 * La preuve brute — le bloc qui ne s'interprète pas.
 *
 * Honnêteté du rendu : en mode statique, aucun horodatage réel n'est
 * mesurable puisque rien n'est exécuté. On affiche donc l'ORDRE
 * D'APPARITION dans le document servi, et on le dit. Fabriquer de faux
 * « T+0,31 s » ruinerait la seule chose qui fait la valeur du constat.
 */
export function Timeline({ observation }: { observation: Observation }) {
  const rows = observation.requests
    .filter((r) => r.tracker && r.origin !== "connect")
    .slice(0, 14);

  const flagged = rows.filter(
    (r) =>
      r.tracker &&
      !r.tracker.exemptEligible &&
      r.tracker.categories.some((c) => CONSENT_REQUIRED_CATEGORIES.has(c)),
  ).length;

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border-l-2 border-ok bg-surface p-5 ring-1 ring-line shadow-md">
        <p className="font-bold text-ink-2">
          Aucun service tiers connu repéré dans le document servi.
        </p>
        <p className="mt-1 text-sm text-muted">
          Bon signe. Une vérification en navigateur reste nécessaire pour les services chargés
          dynamiquement.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-[#0b1220] ring-1 ring-ink/20">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 font-mono text-[11px] text-white/40">
          ordre d&apos;apparition — {observation.hostname}
        </span>
      </div>

      <ol className="divide-y divide-white/[0.06] font-mono text-[12.5px]">
        <li className="flex items-baseline gap-3 px-4 py-2.5">
          <span className="tabular w-10 shrink-0 text-white/30">#00</span>
          <span className="text-white/70">Chargement de la page</span>
        </li>

        {rows.map((r, i) => {
          const needsConsent =
            r.tracker &&
            !r.tracker.exemptEligible &&
            r.tracker.categories.some((c) => CONSENT_REQUIRED_CATEGORIES.has(c));
          return (
            <li
              key={`${r.url}-${i}`}
              className={`flex items-baseline gap-3 px-4 py-2.5 ${
                needsConsent ? "bg-red-500/[0.07]" : ""
              }`}
            >
              <span className="tabular w-10 shrink-0 text-white/30">
                #{String(i + 1).padStart(2, "0")}
              </span>
              <span className={`shrink-0 ${needsConsent ? "text-red-400" : "text-white/25"}`}>
                {needsConsent ? "▲" : "·"}
              </span>
              <span className="min-w-0 flex-1">
                <span className={needsConsent ? "font-bold text-red-200" : "text-white/70"}>
                  {r.hostname}
                </span>
                <span className="ml-2 text-white/40">
                  {r.tracker?.name} ({r.tracker?.effectiveJurisdiction})
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="border-t border-white/10 bg-white/[0.03] px-4 py-3">
        <p className="text-[13px] leading-relaxed text-white/80">
          <span className="font-bold text-red-300">{flagged} service(s)</span> soumis à
          consentement sont référencés dans la page, avant que le visiteur ait eu la
          possibilité de répondre.
        </p>
      </div>
    </div>
  );
}

/**
 * Frise des trois phases du protocole : avant tout choix, après refus, après
 * acceptation. En mode statique, les phases B et C sont dites « non
 * observées » : afficher zéro y vaudrait une affirmation que rien ne fonde.
 */
export function PhaseTimeline({ observation }: { observation: Observation }) {
  const phases = phaseSummaries(observation);
  const staticMode = observation.mode === "static";

  return (
    <ol className="mb-6 grid gap-3 md:grid-cols-3" aria-label="Observations par phase du protocole">
      {phases.map((p, i) => {
        const alert = p.observed && (p.phase === "C" ? false : p.consentServices + p.consentCookies > 0);
        return (
          <li
            key={p.phase}
            className={`relative rounded-3xl bg-surface p-5 ring-1 ring-line shadow-md ${
              alert ? "border-l-2 border-crit" : p.observed ? "border-l-2 border-ok" : ""
            }`}
          >
            <p className="tech text-[10px] text-muted">
              Phase {i + 1} sur 3 · {p.phase}
            </p>
            <h3 className="font-display mt-1 text-[15px] font-bold text-ink-2">{p.label}</h3>
            {p.observed ? (
              <>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
                  <div>
                    <dt className="text-muted">Services tiers</dt>
                    <dd className="tabular font-bold text-ink-2">{p.services}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">dont soumis à consentement</dt>
                    <dd className={`tabular font-bold ${alert && p.consentServices > 0 ? "text-crit" : "text-ink-2"}`}>
                      {p.consentServices}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Cookies</dt>
                    <dd className="tabular font-bold text-ink-2">{p.cookies}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">dont soumis à consentement</dt>
                    <dd className={`tabular font-bold ${alert && p.consentCookies > 0 ? "text-crit" : "text-ink-2"}`}>
                      {p.consentCookies}
                    </dd>
                  </div>
                </dl>
                {staticMode ? (
                  <p className="mt-3 text-[11px] leading-snug text-muted">
                    Analyse statique : services référencés dans le document servi, cookies posés
                    par en-tête HTTP. Aucun JavaScript exécuté.
                  </p>
                ) : p.phase === "C" ? (
                  <p className="mt-3 text-[11px] leading-snug text-muted">
                    Après acceptation, ces dépôts sont attendus : la phase sert de point de
                    comparaison.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="mt-3 text-[13px] leading-snug text-muted">
                <span className="font-semibold text-ink-2">Non observé</span> : analyse statique.
                Cette phase suppose un navigateur réel qui clique sur le bandeau.
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
