import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
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
 * next/font télécharge et auto-héberge les fichiers de police au moment du
 * build. Aucune requête n'est émise vers un serveur tiers à l'exécution —
 * condition non négociable pour un produit qui signale précisément ce
 * comportement chez les autres (KZC-DEPOT-009).
 *
 * Outfit porte les titres et les libellés, Plus Jakarta Sans le corps de
 * texte : c'est l'appariement du système Kayzen Web, et le porteur principal
 * de la cohérence entre les sites de l'agence.
 */
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
