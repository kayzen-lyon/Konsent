import type { Metadata } from "next";
import { SelfAssessment } from "@/components/SelfAssessment";
import { Disclaimer } from "@/components/primitives";
import { QUESTIONS, THEMES } from "@/lib/self-assessment/questions";
import { JsonLd } from "@/components/JsonLd";
import { toolJsonLd } from "@/lib/seo/jsonld";
import { getTool } from "@/lib/tools/catalog";

export const metadata: Metadata = {
  title: "Auto-évaluation RGPD gratuite",
  description:
    "Questionnaire gratuit sur ce qu'un scanner ne voit pas : registre, contrats de sous-traitance, droits des personnes, sécurité, violations, durées de conservation, transferts. Score par thème et plan d'action, sans aucune donnée enregistrée.",
  alternates: { canonical: "/auto-evaluation" },
};

export default function SelfAssessmentPage() {
  return (
    <>
      <JsonLd data={toolJsonLd(getTool("auto-evaluation")!)} />
      <section className="grid-bg-dark bg-ink">
        <div className="mx-auto max-w-7xl px-5 py-14">
          <p className="tech text-[10px] text-flame-soft">Outil gratuit</p>
          <h1 className="display mt-3 max-w-3xl text-3xl text-white sm:text-[2.8rem]">
            Auto-évaluation RGPD
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-white/65">
            Un audit technique observe votre site. Il ne voit ni votre registre, ni vos contrats,
            ni la façon dont vous traitez une demande d&apos;accès. Ces {QUESTIONS.length}{" "}
            questions, réparties en {THEMES.length} thèmes, couvrent ce périmètre et vous donnent
            un plan d&apos;action priorisé, avec les références des textes. Comptez une dizaine de
            minutes.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-5 py-14">
        <SelfAssessment />

        <div className="mt-10 space-y-2">
          <p className="text-xs leading-relaxed text-muted">
            Le score est déclaratif : il repose uniquement sur vos réponses et ne vaut ni audit,
            ni attestation de conformité.
          </p>
          <Disclaimer variant="short" />
        </div>
      </div>
    </>
  );
}
