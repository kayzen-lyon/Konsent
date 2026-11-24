"use client";

/**
 * Imprime le document d'audit joint à la page (`kzd-embed`) au lieu du rapport
 * en ligne. Même résultat que celui affiché : aucune analyse n'est relancée et
 * rien n'est conservé côté serveur.
 */
export function PrintDocumentButton() {
  const print = () => {
    const root = document.documentElement;
    root.dataset.print = "audit";
    window.addEventListener("afterprint", () => delete root.dataset.print, { once: true });
    window.print();
  };
  return (
    <button
      type="button"
      onClick={print}
      className="font-display inline-flex min-h-10 items-center rounded-full border-2 border-flame px-4 text-[13px] font-bold text-flame"
    >
      Rapport PDF
    </button>
  );
}
