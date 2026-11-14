import type { SessionRecord } from "@/lib/accounts";

/**
 * Journal d'accès : sessions actives et récentes du compte.
 *
 * Volontairement pauvre : date d'ouverture et d'expiration, rien d'autre. La
 * table des sessions ne contient ni adresse IP ni agent utilisateur, et nous
 * ne les ajouterons pas pour rendre ce journal plus « parlant » —
 * minimisation (art. 5.1.c RGPD).
 *
 * Le bouton est un formulaire natif : il fonctionne sans JavaScript, et le
 * navigateur pose l'en-tête `Origin` que la route contrôle.
 */

const when = (value: string) =>
  new Date(value).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });

export function SessionLog({
  sessions,
  notice,
}: {
  sessions: readonly SessionRecord[];
  /** Résultat de la dernière fermeture, lu dans l'URL de retour. */
  notice: string | null;
}) {
  const others = sessions.filter((s) => !s.current && !s.expired).length;

  return (
    <div>
      {notice ? (
        <p role="status" className="mb-4 rounded-lg border-l-2 border-flame bg-surface px-4 py-3 text-[14px] text-ink-2">
          {notice}
        </p>
      ) : null}

      {sessions.length === 0 ? (
        <p className="text-[15px] text-muted">Aucune session enregistrée.</p>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-line bg-surface">
          <table className="w-full min-w-[30rem] border-collapse text-left text-[14px] text-ink-2">
            <caption className="sr-only">Sessions de ce compte, de la plus récente à la plus ancienne</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="px-4 py-2.5 font-semibold">Ouverte le</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Expire le</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">État</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5">
                    <time dateTime={s.createdAt}>{when(s.createdAt)}</time>
                  </td>
                  <td className="px-4 py-2.5">
                    <time dateTime={s.expiresAt}>{when(s.expiresAt)}</time>
                  </td>
                  <td className="px-4 py-2.5">
                    {s.current ? (
                      <strong className="text-flame">Session actuelle</strong>
                    ) : s.expired ? (
                      <span className="text-muted">Expirée</span>
                    ) : (
                      "Active"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form method="post" action="/api/compte/sessions" className="mt-4">
        <button
          type="submit"
          disabled={others === 0}
          aria-describedby="sessions-aide"
          className="font-display min-h-11 rounded-full border-2 border-flame px-5 text-sm font-semibold text-flame transition-colors hover:bg-surface-high disabled:cursor-not-allowed disabled:opacity-60"
        >
          Fermer toutes les autres sessions
        </button>
        <p id="sessions-aide" className="mt-2 text-[13px] text-muted">
          {others === 0
            ? "Aucune autre session active : seule celle-ci est ouverte."
            : `${others} autre${others > 1 ? "s" : ""} session${others > 1 ? "s" : ""} active${others > 1 ? "s" : ""}. Les fermer déconnecte immédiatement les autres navigateurs ; celui-ci reste connecté.`}
        </p>
      </form>
    </div>
  );
}
