"use client";

/**
 * Déclencheur d'impression.
 *
 * Le seul fragment de ce rapport qui exige du JavaScript : `window.print()`
 * n'a pas d'équivalent déclaratif. Il disparaît à l'impression — un bouton
 * « Imprimer » sur une feuille imprimée est une trace de logiciel, pas un
 * élément de rapport.
 *
 * Le lecteur reste libre d'utiliser le raccourci de son navigateur : ce
 * bouton est un raccourci de confort, pas le seul chemin. Le rapport
 * s'imprime correctement sans lui.
 */
export function PrintReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="tech rounded-full border-2 border-flame px-4 py-2 text-[10px] text-flame transition hover:bg-surface-high print:hidden"
    >
      Imprimer / PDF
    </button>
  );
}
