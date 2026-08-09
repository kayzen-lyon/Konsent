import Link from "next/link";
import type { MonitoredDomain } from "@/lib/storage";

/**
 * Portefeuille persistant : les domaines qu'un compte possède réellement.
 *
 * À distinguer de la vue d'essai de `/agence`, qui analyse une liste collée
 * dans un formulaire et ne conserve rien. Ici, chaque ligne correspond à un
 * domaine rattaché à un compte, dont la propriété a été — ou reste à être —
 * prouvée.
 *
 * Le composant ne décide d'aucun accès : la liste qu'il reçoit a déjà été
 * filtrée par `visibleAccountIds`. Refaire ce filtrage à l'affichage
 * donnerait deux endroits où se tromper.
 */
export function OwnedDomains({
  domains,
  owners,
  quota,
  emptyHint,
}: {
  domains: readonly MonitoredDomain[];
  /** Adresse du compte propriétaire, par identifiant. Absent = le lecteur lui-même. */
  owners?: Record<string, string>;
  quota: number;
  emptyHint: string;
}) {
  if (domains.length === 0) {
    return (
      <div className="rounded-xl bg-white p-5 ring-1 ring-line">
        <p className="tech text-[10px] text-muted">Portefeuille</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{emptyHint}</p>
      </div>
    );
  }

  const verified = domains.filter((d) => d.verifiedAt).length;

  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-line">
      <header className="flex flex-wrap items-baseline justify-between gap-2 bg-paper px-5 py-3">
        <p className="tech text-[10px] text-muted">Portefeuille</p>
        <p className="tabular text-[12px] text-muted">
          {domains.length} / {quota} · {verified} vérifié(s)
        </p>
      </header>

      <ul className="divide-y divide-line">
        {domains.map((domain) => (
          <li key={domain.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-ink-2">{domain.hostname}</p>
              <p className="text-[11px] text-muted">
                {owners?.[domain.accountId ?? ""] ? (
                  <>client {owners[domain.accountId ?? ""]} · </>
                ) : null}
                surveillance {domain.frequency}
                {domain.lastRunAt ? (
                  <> · dernière analyse le {new Date(domain.lastRunAt).toLocaleDateString("fr-FR")}</>
                ) : null}
              </p>
            </div>

            {/* Un domaine non vérifié n'est pas analysé, et rien n'en est
                conservé. Le signaler ici évite de laisser croire à une
                surveillance qui n'a pas commencé. */}
            {domain.verifiedAt ? (
              <span className="tech shrink-0 rounded bg-ok px-2 py-1 text-[9px] text-white">
                Vérifié
              </span>
            ) : (
              <span className="tech shrink-0 rounded bg-warn-bg px-2 py-1 text-[9px] text-warn">
                Propriété à prouver
              </span>
            )}

            <Link
              href={`/scan?url=${encodeURIComponent(domain.hostname)}`}
              className="tech shrink-0 rounded border border-line px-3 py-1.5 text-[9px] text-muted transition hover:border-flame hover:text-flame"
            >
              Rapport
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
