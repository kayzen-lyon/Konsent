import type { MetadataRoute } from "next";

/**
 * Manifeste d'application : Konsent s'installe comme une application sur
 * mobile et sur ordinateur (« Ajouter à l'écran d'accueil »), avec les
 * raccourcis vers les outils les plus utilisés.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Konsent — audit RGPD et cookies",
    short_name: "Konsent",
    description:
      "Audit automatisé RGPD, cookies et traceurs, indépendant de toute plateforme de consentement.",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#b7481f",
    categories: ["business", "productivity", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Lancer un audit", url: "/#scan" },
      { name: "Comparer deux sites", url: "/comparer" },
      { name: "Générateur de bandeau", url: "/outils/generateur-bandeau" },
      { name: "Auto-évaluation RGPD", url: "/auto-evaluation" },
    ],
  };
}
