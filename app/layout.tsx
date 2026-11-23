import type { Metadata } from "next";
import localFont from "next/font/local";
import { EDITOR } from "@/lib/disclaimer";
import { MotionProvider } from "@/components/bits/MotionProvider";
import { Header } from "@/components/site/Header";
import { Footer, type EcosystemGroup } from "@/components/site/Footer";
import { getEcosystem, groupByCategory, withRef } from "@/lib/ecosystem";
import { Toaster } from "@/components/site/Toaster";
import { THEME_BOOT_SCRIPT } from "@/components/site/theme";
import "./globals.css";
import "@/components/immersive/immersive.css";
// Après globals.css : la typographie du groupe corrige les tailles des composants.
import "./typographie.css";

/**
 * Polices auto-hébergées, servies depuis notre propre domaine : aucune
 * requête vers un serveur tiers, ni à l'exécution — condition non négociable
 * pour un produit qui signale précisément ce comportement chez les autres
 * (KZC-DEPOT-009) — ni au build : les fichiers viennent des paquets
 * @fontsource-variable (licence OFL-1.1), pas de Google Fonts. Le
 * téléchargement depuis Google au build échouait par intermittence et
 * bloquait la CI.
 *
 * Outfit porte les titres et les libellés, Plus Jakarta Sans le corps de
 * texte : c'est l'appariement du système Kayzen Web, et le porteur principal
 * de la cohérence entre les sites de l'agence. Fontes variables : toutes les
 * graisses dans un seul fichier.
 */
const outfit = localFont({
  src: "../node_modules/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-outfit",
  display: "swap",
});

const jakarta = localFont({
  src: [
    {
      path: "../node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-italic.woff2",
      style: "italic",
    },
  ],
  weight: "200 800",
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(EDITOR.productSite),
  title: {
    default: "Konsent — l'audit RGPD que votre bandeau ne fait pas",
    template: "%s · Konsent",
  },
  description:
    "Konsent vérifie ce que votre site dépose avant le choix du visiteur : traceurs, destinataires, juridictions. Audit RGPD gratuit, indépendant de toute CMP.",
  /* Canonique relative : chaque page se déclare elle-même, sans paramètre
   * d'URL. Évite les doublons d'indexation entre `?url=` et la page nue. */
  alternates: { canonical: "./" },
  /* Ni titre ni description ici : Next les reprend de chaque page, pour que
   * le partage d'une page interne n'affiche pas le texte de l'accueil.
   * `url` relative, résolue comme la canonique : og:url lui est identique. */
  openGraph: {
    siteName: "Konsent",
    url: "./",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@KayzenLyon",
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Lu côté serveur : le pied de page reçoit des liens déjà construits.
  const ecosystem: EcosystemGroup[] = groupByCategory(await getEcosystem()).map(
    ([category, apps]) => ({
      category,
      apps: apps.map((a) => ({
        name: a.nom,
        // Une application annoncée n'a pas encore de page : pas de lien.
        href: a.statut === "bientot" ? null : withRef(a.url),
        status: a.statut,
      })),
    }),
  );

  return (
    <html
      lang="fr"
      className={`${outfit.variable} ${jakarta.variable}`}
      // Le script de démarrage pose la classe `dark` avant l'hydratation.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-screen">
        <div className="scroll-progress" aria-hidden="true" />
        <nav aria-label="Liens d'évitement">
          {[
            ["#contenu", "Aller au contenu principal"],
            ["#navigation", "Aller à la navigation"],
            ["#pied-de-page", "Aller au pied de page"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-flame focus:px-5 focus:py-2.5 focus:font-semibold focus:text-white"
            >
              {label}
            </a>
          ))}
        </nav>
        <MotionProvider>
          <Header />
          <main id="contenu" tabIndex={-1} className="outline-none">
            {children}
          </main>
          <Footer ecosystem={ecosystem} />
          <Toaster />
        </MotionProvider>
      </body>
    </html>
  );
}
