import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EDITOR } from "@/lib/disclaimer";
import "./apercu.css";

/**
 * APERÇU ISOLÉ — refonte immersive, à valider avant toute intégration.
 *
 * Ce dossier ne modifie aucune page réelle et n'est servi que par le serveur
 * de développement : en production, toutes ses adresses répondent 404. Le
 * supprimer suffit à tout retirer.
 *
 * Le menu et le pied de page sont les vrais, rendus par `app/layout.tsx`.
 * Trois retouches leur sont appliquées depuis `apercu.css`, uniquement sur
 * ces pages (`body:has(.apv)`) : en-tête sans flou, barre de lecture sans
 * dégradé, et signature « Konsent » en filigrane au bas du pied de page.
 */
export const metadata: Metadata = {
  title: "Aperçu immersif",
  robots: { index: false, follow: false },
};

export default function ApercuLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <div className="apv">
      <p className="apv-bar">
        <strong>Aperçu, non publié.</strong>
        <Link href="/apercu-immersif">Accueil</Link>
        <Link href="/apercu-immersif/fonctionnalites">Page intérieure avec le mur</Link>
        <Link href="/">Site actuel</Link>
      </p>

      {children}

      {/* Ouverture du pied de page : le contact en très grand. Les
          coordonnées sont celles de l'éditeur (lib/disclaimer.ts). */}
      <section aria-labelledby="apv-contact-titre" className="apv-contact">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 id="apv-contact-titre" className="font-display text-xs font-bold uppercase tracking-wider text-gold">
            Nous écrire
          </h2>
          <a href={`mailto:${EDITOR.email}`} className="apv-contact-mail">
            {EDITOR.email}
          </a>
          <p className="apv-contact-suite">
            <a href={`tel:${EDITOR.phoneE164}`}>{EDITOR.phone}</a>
            <Link href="/contact" className="apv-contact-lien">
              Contact <span aria-hidden="true">→</span>
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
