/**
 * Thème clair / sombre / système, comme sur Nexus.
 *
 * Rien n'est écrit tant que le visiteur ne choisit pas : par défaut, le site
 * s'affiche en thème clair. « Système » suit `prefers-color-scheme`. Le choix explicite est
 * conservé dans `localStorage` — stockage strictement nécessaire à une
 * fonction demandée par l'utilisateur (art. 82 de la loi Informatique et
 * Libertés), donc exempté de consentement, et jamais transmis au serveur.
 */
export type ThemeChoice = "light" | "dark" | "system";

export const THEME_KEY = "konsent-theme";

/**
 * Préférences d'affichage (RGAA, EAA) : taille du texte, contraste renforcé,
 * animations réduites. Même régime que le thème : rien n'est écrit tant que
 * le visiteur ne choisit pas, et rien ne quitte le navigateur.
 */
export const PREF_KEYS = {
  text: "konsent-texte",
  contrast: "konsent-contraste",
  motion: "konsent-animations",
} as const;
export type PrefName = keyof typeof PREF_KEYS;

/** Script exécuté avant le premier rendu, pour éviter le flash de thème. */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var h=document.documentElement;h.classList.toggle("dark",d);var k={text:"${PREF_KEYS.text}",contrast:"${PREF_KEYS.contrast}",motion:"${PREF_KEYS.motion}"};for(var n in k){var v=localStorage.getItem(k[n]);if(v)h.dataset[n]=v;}}catch(e){}})();`;

export function readPref(name: PrefName): string | null {
  try {
    return localStorage.getItem(PREF_KEYS[name]);
  } catch {
    return null;
  }
}

/** `null` remet la valeur par défaut et efface la préférence. */
export function applyPref(name: PrefName, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(PREF_KEYS[name]);
    else localStorage.setItem(PREF_KEYS[name], value);
  } catch {
    /* stockage indisponible : la préférence vaut pour la page en cours */
  }
  const html = document.documentElement;
  if (value === null) delete html.dataset[name];
  else html.dataset[name] = value;
}

export function readTheme(): ThemeChoice {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "dark" || t === "system" ? t : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(choice: ThemeChoice) {
  try {
    // Clair est le thème par défaut : le choisir efface la préférence.
    if (choice === "light") localStorage.removeItem(THEME_KEY);
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
