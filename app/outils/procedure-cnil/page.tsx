import { JsonLd } from "@/components/JsonLd";
import { toolJsonLd } from "@/lib/seo/jsonld";
import { getTool } from "@/lib/tools/catalog";
import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Disclaimer, SectionTitle } from "@/components/primitives";
import CnilProcedureSimulator from "@/components/tools/CnilProcedureSimulator";

export const metadata: Metadata = {
  title: "Simulateur de procédure CNIL : contrôle, mise en demeure, sanction",
  description:
    "Comprendre ce qui se passe après une plainte ou un contrôle de la CNIL : procès-verbal, mise en demeure, procédure simplifiée (20 000 € au plus), formation restreinte, astreinte, publicité, recours devant le Conseil d'État. Scénario pédagogique et critères de l'article 83 du RGPD, dans votre navigateur.",
  alternates: { canonical: "/outils/procedure-cnil" },
};

export default function CnilProcedurePage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <JsonLd data={toolJsonLd(getTool("procedure-cnil")!)} />
      <Breadcrumbs
        items={[
          { href: "/outils", label: "Outils" },
          { href: "/outils/procedure-cnil", label: "Simulateur de procédure CNIL" },
        ]}
      />
      <p className="tech text-[10px] text-accent">Outil libre</p>
      <h1 className="display mt-2 text-4xl text-ink-2">Simulateur de procédure CNIL</h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">
        Que se passe-t-il après une plainte ou un contrôle ? Répondez à sept questions : le simulateur
        indique le parcours le plus vraisemblable, explique les critères que la CNIL applique, et
        détaille chaque étape avec ses délais et ses textes.
      </p>

      <div className="mt-4 max-w-3xl rounded-3xl border border-line bg-surface-low px-5 py-4 text-sm leading-relaxed text-muted">
        Le calcul se fait <strong className="text-ink-2">dans votre navigateur</strong>. Rien
        n&apos;est envoyé ni conservé.
      </div>

      <div className="mt-4 max-w-3xl rounded-3xl border-l-2 border-warn bg-warn-bg px-5 py-4 text-sm leading-relaxed text-warn">
        <strong>Simulation pédagogique, pas une prévision.</strong> L&apos;orientation proposée repose
        sur une pondération simplifiée de vos réponses. Elle ne préjuge d&apos;aucune décision de la
        CNIL ni d&apos;une juridiction. Face à une procédure réelle, faites-vous assister par un
        professionnel du droit.
      </div>

      <CnilProcedureSimulator />

      <section className="mt-16">
        <SectionTitle eyebrow="Limites" title="Ce que cet outil ne fait pas" />
        <div className="max-w-3xl space-y-4 text-[15px] leading-relaxed text-muted">
          <p>
            Il ne calcule pas de montant d&apos;amende. La méthode de calcul relève des lignes
            directrices 04/2022 du Comité européen de la protection des données et, surtout, de
            l&apos;appréciation de la formation restreinte, au cas par cas. Les plafonds affichés sont
            des maxima légaux.
          </p>
          <p>
            Il ne traite pas des suites pénales (code pénal, art. 226-16 et suivants), ni des actions
            en réparation des personnes (RGPD, art. 82), ni des actions de groupe.
          </p>
          <p>
            Pour savoir où vous en êtes avant tout contrôle, lancez un{" "}
            <Link href="/scan" className="font-medium text-flame underline underline-offset-4">
              audit de votre site
            </Link>{" "}
            et répondez à{" "}
            <Link href="/auto-evaluation" className="font-medium text-flame underline underline-offset-4">
              l&apos;auto-évaluation
            </Link>
            .
          </p>
          <p className="text-sm">
            Sources : règlement (UE) 2016/679, art. 56 à 60, 77, 83 ; loi n° 78-17 du 6 janvier 1978
            modifiée, art. 8, 19, 20, 22, 22-1, 51 et 82 ; loi n° 2022-52 du 24 janvier 2022 ; décret
            n° 2019-536 du 29 mai 2019 ; code de justice administrative, art. L. 521-1, R. 311-1 et
            R. 421-1 ; lignes directrices 04/2022 du CEPD sur le calcul des amendes administratives.
          </p>
        </div>
      </section>

      <div className="mt-14">
        <Disclaimer variant="short" />
      </div>
    </div>
  );
}
