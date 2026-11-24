/** Remplace la jauge quand l'analyse est partielle : aucun chiffre n'est avancé. */
export function NotRated() {
  return (
    <div className="flex h-40 w-40 flex-col items-center justify-center rounded-full border-[14px] border-line text-center">
      <span className="display text-xl text-ink-2">Non noté</span>
      <span className="tech mt-1 text-[9px] text-muted">analyse partielle</span>
    </div>
  );
}
