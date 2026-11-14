/**
 * Squelette affiché pendant le rendu serveur de /espace (route lente : base
 * de données). Annoncé une seule fois aux lecteurs d'écran ; le dessin,
 * purement visuel, leur est masqué.
 */
export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
      <span className="sr-only">Chargement…</span>
      <div aria-hidden="true">
        <div className="pulse-soft h-3 w-28 rounded-full bg-surface-high" />
        <div className="pulse-soft mt-4 h-9 w-full max-w-sm rounded-xl bg-surface-high" />
        <div className="pulse-soft mt-4 h-4 w-48 rounded-full bg-surface-high" />
        <div className="mt-10 space-y-6">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="rounded-3xl border border-line bg-surface p-7 shadow-md">
              <div className="flex items-center gap-4">
                <div className="pulse-soft h-10 w-10 shrink-0 rounded-full bg-surface-high" />
                <div className="pulse-soft h-5 w-1/2 rounded-full bg-surface-high" />
              </div>
              <div className="mt-6 space-y-3">
                <div className="pulse-soft h-4 w-full rounded-full bg-surface-high" />
                <div className="pulse-soft h-4 w-4/5 rounded-full bg-surface-high" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}