import type { Metadata } from "next";
import Link from "next/link";
import { EDITOR } from "@/lib/disclaimer";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://konsent.fr"),
  title: {
    default: "Konsent — audit RGPD, cookies et traceurs",
    template: "%s · Konsent",
  },
  description:
    "Analysez en quelques secondes les traceurs déposés par votre site avant consentement, les destinataires de vos données et leur juridiction. Auditeur indépendant de toute plateforme de consentement.",
  openGraph: {
    title: "Konsent — audit RGPD, cookies et traceurs",
    description:
      "Quels traceurs votre site dépose-t-il avant que vos visiteurs aient pu répondre ? Vérifiez-le gratuitement.",
    locale: "fr_FR",
    type: "website",
  },
  robots: { index: true, follow: true },
};

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-k-line/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="Konsent, accueil">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-k-primary text-white shadow-sm transition group-hover:bg-k-primary-dark">
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden="true">
              <path
                d="M12 3l7 3v5.5c0 4.3-2.9 7.8-7 9.5-4.1-1.7-7-5.2-7-9.5V6l7-3z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="M9 12l2 2 4-4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-[17px] font-semibold tracking-tight text-k-ink">Konsent</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm" aria-label="Navigation principale">
          <Link
            href="/regles"
            className="hidden rounded-md px-3 py-1.5 text-k-muted transition hover:bg-k-surface hover:text-k-ink sm:block"
          >
            Référentiel
          </Link>
          <Link
            href="/traceurs"
            className="hidden rounded-md px-3 py-1.5 text-k-muted transition hover:bg-k-surface hover:text-k-ink sm:block"
          >
            Traceurs
          </Link>
          <Link
            href="/methodologie"
            className="hidden rounded-md px-3 py-1.5 text-k-muted transition hover:bg-k-surface hover:text-k-ink md:block"
          >
            Méthodologie
          </Link>
          <Link
            href="/#scan"
            className="ml-1 rounded-md bg-k-primary px-3.5 py-1.5 font-medium text-white shadow-sm transition hover:bg-k-primary-dark"
          >
            Analyser un site
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-k-line bg-white">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm font-semibold text-k-ink">Konsent</p>
            <p className="mt-2 text-sm leading-relaxed text-k-muted">
              Auditeur technique indépendant. Nous n&apos;éditons aucune plateforme de
              consentement, et n&apos;en revendons aucune.
            </p>
          </div>
          <nav aria-label="Produit">
            <p className="text-sm font-semibold text-k-ink">Produit</p>
            <ul className="mt-2 space-y-1.5 text-sm text-k-muted">
              <li>
                <Link href="/regles" className="hover:text-k-primary">
                  Référentiel des règles
                </Link>
              </li>
              <li>
                <Link href="/traceurs" className="hover:text-k-primary">
                  Base des traceurs
                </Link>
              </li>
              <li>
                <Link href="/tarifs" className="hover:text-k-primary">
                  Tarifs
                </Link>
              </li>
            </ul>
          </nav>
          <nav aria-label="Transparence">
            <p className="text-sm font-semibold text-k-ink">Transparence</p>
            <ul className="mt-2 space-y-1.5 text-sm text-k-muted">
              <li>
                <Link href="/methodologie" className="hover:text-k-primary">
                  Méthodologie
                </Link>
              </li>
              <li>
                <Link href="/bot" className="hover:text-k-primary">
                  Notre robot
                </Link>
              </li>
              <li>
                <Link href="/sources" className="hover:text-k-primary">
                  Nos sources
                </Link>
              </li>
            </ul>
          </nav>
          <nav aria-label="Informations légales">
            <p className="text-sm font-semibold text-k-ink">Légal</p>
            <ul className="mt-2 space-y-1.5 text-sm text-k-muted">
              <li>
                <Link href="/mentions-legales" className="hover:text-k-primary">
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link href="/confidentialite" className="hover:text-k-primary">
                  Politique de confidentialité
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-k-line pt-6 text-xs text-k-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            Édité par {EDITOR.legalName} — SIREN {EDITOR.siren} — {EDITOR.address}
          </p>
          <p className="flex items-center gap-1.5">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-k-ok"
              aria-hidden="true"
            />
            Ce site ne dépose aucun traceur et n&apos;a donc pas de bandeau.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-k-primary focus:px-4 focus:py-2 focus:text-white"
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
