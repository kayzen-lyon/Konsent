/**
 * Squelette affiché pendant le rendu serveur de /agence (route lente : base
 * de données, analyses). Annoncé une seule fois aux lecteurs d'écran ; le
 * dessin, purement visuel, leur est masqué.
 */
export default function Loading() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Chargement…</span>
      <div aria-hidden="true">
        <section className="grid-bg-dark bg-ink">
          <div className="mx-auto max-w-7xl px-5 py-12">
            <div className="pulse-soft h-3 w-28 rounded-full bg-white/15" />
            <div className="pulse-soft mt-4 h-9 w-full max-w-md rounded-xl bg-white/15" />
            <div className="pulse-soft mt-4 h-4 w-full max-w-2xl rounded-full bg-white/10" />
            <div className="pulse-soft mt-2 h-4 w-2/3 max-w-xl rounded-full bg-white/10" />
          </div>
        </section>
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-10 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="rounded-3xl border border-line bg-surface p-7 shadow-md">
              <div className="pulse-soft h-3 w-24 rounded-full bg-surface-high" />
              <div className="pulse-soft mt-4 h-7 w-3/4 rounded-xl bg-surface-high" />
              <div className="mt-6 space-y-3">
                <div className="pulse-soft h-4 w-full rounded-full bg-surface-high" />
                <div className="pulse-soft h-4 w-5/6 rounded-full bg-surface-high" />
                <div className="pulse-soft h-4 w-2/3 rounded-full bg-surface-high" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}