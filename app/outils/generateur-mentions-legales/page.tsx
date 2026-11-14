import Link from "next/link";
import type { Metadata } from "next";
import { Disclaimer, SectionTitle } from "@/components/primitives";
import LegalNoticeGenerator from "@/components/tools/LegalNoticeGenerator";
import { JsonLd } from "@/components/JsonLd";
import { toolJsonLd } from "@/lib/seo/jsonld";
import { getTool } from "@/lib/tools/catalog";

export const metadata: Metadata = {
  title: "Générateur de mentions légales",
  description:
    "Rédigez gratuitement les mentions légales de votre site : éditeur, mention « EI », directeur de la publication, hébergeur, médiateur de la consommation. Formulaire guidé selon votre statut, aperçu en direct, export HTML et Markdown, généré dans votre navigateur.",
};

const POINTS: { title: string; body: string }[] = [
  {
    title: "Une obligation distincte du RGPD",
    body: "L'article 6-III de la loi pour la confiance dans l'économie numérique impose d'identifier l'éditeur, le directeur de la publication et l'hébergeur. Le manquement est puni, pour une personne physique, d'un an d'emprisonnement et de 75 000 € d'amende.",
  },
  {
    title: "Des mentions selon le statut",
    body: "Un entrepreneur individuel fait suivre son nom de la mention « EI » ; une société indique sa forme, son capital et son immatriculation ; une association son numéro RNA ; une profession réglementée son titre, son ordre et ses règles professionnelles.",
  },
  {
    title: "Le médiateur, dès qu'on vend à des particuliers",
    body: "Tout professionnel qui contracte avec des consommateurs doit leur communiquer les coordonnées du médiateur de la consommation dont il relève (code de la consommation, art. L. 616-1), qu'il vende en ligne ou non.",
  },
  {
    title: "Rien n'est inventé",
    body: "Une information que vous seul détenez reste signalée [[À COMPLÉTER]] ; une donnée de préréglage dont l'actualité ne peut être garantie est signalée [[À VÉRIFIER]]. Un document qui invente est pire qu'un document incomplet.",
  },
];

export default function LegalNoticeGeneratorPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <JsonLd data={toolJsonLd(getTool("generateur-mentions-legales")!)} />
      <p className="tech text-[10px] text-accent">Outil libre</p>
      <h1 className="display mt-2 text-4xl text-ink-2">Générateur de mentions légales</h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">
        Indiquez votre statut, renseignez les informations demandées, récupérez un texte prêt à
        publier en HTML ou en Markdown. Les champs s&apos;adaptent à votre situation : entreprise
        individuelle, société, association ou profession réglementée.
      </p>

      <div className="mt-4 max-w-3xl rounded-3xl border border-line bg-surface-low px-5 py-4 text-sm leading-relaxed text-muted">
        Le document est assemblé <strong className="text-ink-2">dans votre navigateur</strong>. Rien
        n&apos;est envoyé ni enregistré : fermer la page efface la saisie.
      </div>

      <div className="mt-4 max-w-3xl rounded-3xl border-l-2 border-warn bg-warn-bg px-5 py-4 text-sm leading-relaxed text-warn">
        <strong>Modèle à faire valider.</strong> Le texte produit est un modèle rédigé à partir des
        textes applicables. Il ne constitue pas une consultation juridique et doit être relu par un
        professionnel du droit avant publication.
      </div>

      <LegalNoticeGenerator />

      <section className="mt-16" aria-labelledby="ml-why">
        <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
          <p className="tech text-[10px] text-accent">Ce que dit la loi</p>
          <h2 id="ml-why" className="display mt-2 text-2xl text-ink-2">
            Quatre règles que le générateur applique
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {POINTS.map((p) => (
              <li key={p.title} className="rounded-2xl border border-line bg-surface-low p-5">
                <h3 className="display text-base text-ink-2">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{p.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm leading-relaxed text-muted">
            Références : loi n° 2004-575 du 21 juin 2004 pour la confiance dans l&apos;économie
            numérique, art. 6-III et 19 ; code de commerce, art. L. 526-22 et R. 526-26 ; code de la
            consommation, art. L. 111-1, L. 221-5, L. 612-1 et L. 616-1.
          </p>
        </div>
      </section>

      <section className="mt-14">
        <SectionTitle eyebrow="Limites" title="Ce que cet outil ne fait pas" />
        <div className="max-w-3xl space-y-4 text-[15px] leading-relaxed text-muted">
          <p>
            Il ne vérifie pas les informations saisies : un SIREN erroné ou un médiateur auquel vous
            n&apos;avez pas adhéré resteront erronés dans le document.
          </p>
          <p>
            Il ne rédige pas vos conditions générales de vente, qui portent l&apos;essentiel des
            informations précontractuelles dues au consommateur. Pour la politique de
            confidentialité, utilisez le{" "}
            <Link
              href="/outils/generateur-confidentialite"
              className="font-medium text-flame underline underline-offset-4"
            >
              générateur de politique de confidentialité
            </Link>
            .
          </p>
        </div>
      </section>

      <div className="mt-14">
        <Disclaimer variant="short" />
      </div>
    </div>
  );
}
