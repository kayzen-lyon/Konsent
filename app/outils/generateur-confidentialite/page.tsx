import Link from "next/link";
import type { Metadata } from "next";
import { Disclaimer, SectionTitle } from "@/components/primitives";
import PrivacyPolicyGenerator from "@/components/tools/PrivacyPolicyGenerator";
import { JsonLd } from "@/components/JsonLd";
import { toolJsonLd } from "@/lib/seo/jsonld";
import { getTool } from "@/lib/tools/catalog";

export const metadata: Metadata = {
  title: "Générateur de politique de confidentialité RGPD",
  description:
    "Rédigez gratuitement votre politique de confidentialité selon les articles 12 à 14 du RGPD : traitements, bases légales et durées de conservation préremplies, destinataires, transferts hors UE, droits et réclamation CNIL. Aperçu en direct, export HTML et Markdown, généré dans votre navigateur.",
};

const POINTS: { title: string; body: string }[] = [
  {
    title: "Une base légale par finalité",
    body: "Chaque traitement repose sur l'une des six bases de l'article 6. Lorsqu'il s'agit de l'intérêt légitime, l'intérêt poursuivi doit être indiqué aux personnes (art. 13, § 1, d).",
  },
  {
    title: "Une durée, pas « aussi longtemps que nécessaire »",
    body: "L'article 13, § 2, a) impose d'indiquer la durée de conservation ou, à défaut, les critères qui la déterminent. Les durées proposées reprennent les référentiels de la CNIL et les obligations légales d'archivage.",
  },
  {
    title: "Des destinataires nommés",
    body: "Les destinataires ou catégories de destinataires doivent être indiqués, ainsi que, pour tout transfert hors de l'Espace économique européen, la garantie qui l'encadre.",
  },
  {
    title: "Des droits effectifs",
    body: "Accès, rectification, effacement, limitation, portabilité, opposition, retrait du consentement, directives post-mortem et réclamation auprès de la CNIL : chaque droit est rappelé avec son article.",
  },
];

export default function PrivacyPolicyGeneratorPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <JsonLd data={toolJsonLd(getTool("generateur-confidentialite")!)} />
      <p className="tech text-[10px] text-accent">Outil libre</p>
      <h1 className="display mt-2 text-4xl text-ink-2">
        Générateur de politique de confidentialité RGPD
      </h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">
        Cochez les traitements que vous mettez en œuvre : finalité, base légale et durée de
        conservation sont préremplies et restent modifiables. Ajoutez vos sous-traitants, précisez
        les transferts, récupérez un texte prêt à publier.
      </p>

      <div className="mt-4 max-w-3xl rounded-3xl border border-line bg-surface-low px-5 py-4 text-sm leading-relaxed text-muted">
        Le document est assemblé <strong className="text-ink-2">dans votre navigateur</strong>. Rien
        n&apos;est envoyé ni enregistré : fermer la page efface la saisie.
      </div>

      <div className="mt-4 max-w-3xl rounded-3xl border-l-2 border-warn bg-warn-bg px-5 py-4 text-sm leading-relaxed text-warn">
        <strong>Modèle à faire valider.</strong> Le texte produit est un modèle rédigé à partir des
        textes applicables. Il ne constitue pas une consultation juridique et doit être relu par un
        professionnel du droit avant publication. Il ne décrit que ce que vous déclarez : votre
        pratique réelle doit y correspondre.
      </div>

      <PrivacyPolicyGenerator />

      <section className="mt-16" aria-labelledby="pc-why">
        <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
          <p className="tech text-[10px] text-accent">Ce que dit le RGPD</p>
          <h2 id="pc-why" className="display mt-2 text-2xl text-ink-2">
            Ce qu&apos;une politique de confidentialité doit contenir
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
            Références : règlement (UE) 2016/679, art. 6, 12 à 22, 28, 32, 37 à 39, 44 à 49 et 77 ;
            loi n° 78-17 du 6 janvier 1978 modifiée, art. 82 et 85.
          </p>
        </div>
      </section>

      <section className="mt-14">
        <SectionTitle eyebrow="Limites" title="Ce que cet outil ne fait pas" />
        <div className="max-w-3xl space-y-4 text-[15px] leading-relaxed text-muted">
          <p>
            Il ne sait pas quels services votre site appelle réellement. Une politique qui omet un
            destinataire présent sur le site est inexacte, quelle que soit la qualité de sa
            rédaction. Pour comparer votre déclaration à la réalité, lancez un{" "}
            <Link href="/scan" className="font-medium text-flame underline underline-offset-4">
              audit complet
            </Link>
            .
          </p>
          <p>
            Il ne remplace ni le registre des activités de traitement, ni les contrats de
            sous-traitance, ni l&apos;analyse d&apos;impact lorsqu&apos;elle est requise. Pour les
            mentions d&apos;identification du site, utilisez le{" "}
            <Link
              href="/outils/generateur-mentions-legales"
              className="font-medium text-flame underline underline-offset-4"
            >
              générateur de mentions légales
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
