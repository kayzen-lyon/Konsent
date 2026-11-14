import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import { EDITOR } from "@/lib/disclaimer";
import { MotionProvider } from "@/components/bits/MotionProvider";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { THEME_BOOT_SCRIPT } from "@/components/site/theme";
import "./globals.css";

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
    "Votre plateforme de consentement gère le consentement. Konsent vérifie ce qui se dépose vraiment avant que vos visiteurs aient pu répondre — traceurs, destinataires, juridictions. Auditeur indépendant de toute CMP.",
  /* Canonique relative : chaque page se déclare elle-même, sans paramètre
   * d'URL. Évite les doublons d'indexation entre `?url=` et la page nue. */
  alternates: { canonical: "./" },
  openGraph: {
    siteName: "Konsent",
    title: "Konsent — l'audit RGPD que votre bandeau ne fait pas",
    description:
      "Que dépose votre site avant que vos visiteurs aient pu répondre ? Vérifiez-le gratuitement.",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Konsent — l'audit RGPD que votre bandeau ne fait pas",
    description:
      "Que dépose votre site avant que vos visiteurs aient pu répondre ? Vérifiez-le gratuitement.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-flame focus:px-5 focus:py-2.5 focus:font-semibold focus:text-white"
        >
          Aller au contenu principal
        </a>
        <MotionProvider>
          <Header />
          <main id="contenu" tabIndex={-1} className="outline-none">
            {children}
          </main>
          <Footer />
        </MotionProvider>
      </body>
    </html>
  );
}
