/**
 * Thème clair / sombre / système, comme sur Nexus.
 *
 * Rien n'est écrit tant que le visiteur ne choisit pas : par défaut, le site
 * suit `prefers-color-scheme` sans rien stocker. Le choix explicite est
 * conservé dans `localStorage` — stockage strictement nécessaire à une
 * fonction demandée par l'utilisateur (art. 82 de la loi Informatique et
 * Libertés), donc exempté de consentement, et jamais transmis au serveur.
 */
export type ThemeChoice = "light" | "dark" | "system";

export const THEME_KEY = "konsent-theme";

/** Script exécuté avant le premier rendu, pour éviter le flash de thème. */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");var d=t==="dark"||((t===null||t==="system")&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export function readTheme(): ThemeChoice {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(choice: ThemeChoice) {
  try {
    if (choice === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {
    /* stockage indisponible : le choix vaut pour la page en cours */
  }
  const dark =
    choice === "dark" ||
    (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  window.dispatchEvent(new CustomEvent("konsent-theme", { detail: choice }));
}
