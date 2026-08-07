import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { EDITOR } from "@/lib/disclaimer";
import { Logo } from "@/components/Logo";
import "./globals.css";

/**
 * next/font télécharge et auto-héberge les fichiers de police au moment du
 * build. Aucune requête n'est émise vers un serveur tiers à l'exécution —
 * condition non négociable pour un produit qui signale précisément ce
 * comportement chez les autres (KZC-DEPOT-009).
 */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono-jb",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://konsent.fr"),
  title: {
    default: "Konsent — l'audit RGPD que votre bandeau ne fait pas",
    template: "%s · Konsent",
  },
  description:
    "Votre plateforme de consentement gère le consentement. Konsent vérifie ce qui se dépose vraiment avant que vos visiteurs aient pu répondre — traceurs, destinataires, juridictions. Auditeur indépendant de toute CMP.",
  openGraph: {
    title: "Konsent — l'audit RGPD que votre bandeau ne fait pas",
    description:
      "Que dépose votre site avant que vos visiteurs aient pu répondre ? Vérifiez-le gratuitement.",
    locale: "fr_FR",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const NAV = [
  { href: "/fonctionnalites", label: "Fonctionnalités" },
  { href: "/simulateur", label: "Simulateur" },
  { href: "/comparatif", label: "Comparatif" },
  { href: "/regles", label: "Référentiel" },
  { href: "/tarifs", label: "Tarifs" },
];

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Konsent, accueil">
          <Logo className="h-7 w-7 text-flame" />
          <span className="display text-lg tracking-tight text-white">KONSENT</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="tech rounded px-3 py-2 text-[11px] text-white/60 transition hover:text-white"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/regles"
            className="tech hidden rounded border border-white/25 px-3.5 py-2 text-[11px] text-white transition hover:border-white/60 sm:block"
          >
            Référentiel
          </Link>
          <Link
            href="/#scan"
            className="tech rounded bg-flame px-4 py-2 text-[11px] text-white transition hover:bg-flame-dark"
          >
            Auditer mon site
          </Link>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-24 bg-ink text-white/70">
      <div className="mx-auto max-w-7xl px-5 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <Logo className="h-7 w-7 text-flame" />
              <span className="display text-lg tracking-tight text-white">KONSENT</span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed">
              Auditeur technique indépendant. Nous n&apos;éditons aucune plateforme de
              consentement et n&apos;en revendons aucune — c&apos;est ce qui nous autorise à
              toutes les auditer.
            </p>
            <p className="tech mt-5 flex items-center gap-2 text-[10px] text-white/45">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Zéro traceur sur ce site
            </p>
          </div>

          <nav aria-label="Produit">
            <p className="tech text-[10px] text-white/40">Produit</p>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                ["/fonctionnalites", "Fonctionnalités"],
                ["/simulateur", "Simulateur d'exposition"],
                ["/tarifs", "Tarifs"],
                ["/comparatif", "Comparatif CMP"],
              ].map(([h, l]) => (
                <li key={h}>
                  <Link href={h as string} className="transition hover:text-flame">
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Transparence">
            <p className="tech text-[10px] text-white/40">Transparence</p>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                ["/regles", "Référentiel des règles"],
                ["/traceurs", "Base des traceurs"],
                ["/methodologie", "Méthodologie"],
                ["/sources", "Nos sources"],
                ["/bot", "Notre robot"],
              ].map(([h, l]) => (
                <li key={h}>
                  <Link href={h as string} className="transition hover:text-flame">
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Légal">
            <p className="tech text-[10px] text-white/40">Légal</p>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                ["/mentions-legales", "Mentions légales"],
                ["/confidentialite", "Confidentialité"],
              ].map(([h, l]) => (
                <li key={h}>
                  <Link href={h as string} className="transition hover:text-flame">
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {EDITOR.legalName} — SIREN {EDITOR.siren} — {EDITOR.address}
          </p>
          <p className="max-w-xl sm:text-right">
            Les montants affichés sont des plafonds légaux théoriques, jamais une prévision de
            sanction. Analyse technique automatisée, sans valeur de consultation juridique.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-flame focus:px-4 focus:py-2 focus:text-white"
        >
          Aller au contenu
        </a>
        <Header />
        <main id="contenu">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
