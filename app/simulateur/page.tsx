import type { Metadata } from "next";
import Link from "next/link";
import { FineSimulator } from "@/components/FineSimulator";
import { Disclaimer } from "@/components/primitives";
import { PUBLIC_FACTS } from "@/lib/facts";
import { JsonLd } from "@/components/JsonLd";
import { toolJsonLd } from "@/lib/seo/jsonld";
import { getTool } from "@/lib/tools/catalog";

export const metadata: Metadata = {
  title: "Simulateur d'exposition",
  description:
    "Situez votre exposition théorique : plafond légal, fourchette réellement observée en procédure simplifiée, et coût de mise en conformité. Les trois chiffres, toujours ensemble.",
};

export default function SimulatorPage() {
  const cited = PUBLIC_FACTS.filter((f) =>
    ["rgpd-plafond-art83", "penal-226-16", "procedure-simplifiee-plafond"].includes(f.id),
  );

  return (
    <>
      <JsonLd data={toolJsonLd(getTool("simulateur")!)} />
      <section className="grid-bg-dark bg-ink">
        <div className="mx-auto max-w-7xl px-5 py-14">
          <p className="tech text-[10px] text-flame-soft">Mise en perspective</p>
          <h1 className="display mt-3 max-w-3xl text-3xl text-white sm:text-[2.8rem]">
            Ce que vous risquez, et ce que coûte de ne plus le risquer
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-white/65">
            La plupart des outils affichent le plafond de 20 millions et s&apos;arrêtent là.
            C&apos;est spectaculaire et c&apos;est trompeur. Nous affichons systématiquement les
            trois chiffres : le plafond légal, ce qui est réellement prononcé, et le coût de la
            correction.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-14">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div>
            <h2 className="display text-2xl text-ink-2">Comment lire ces chiffres</h2>

            <div className="mt-6 space-y-5">
              <div className="border-l-2 border-crit pl-4">
                <p className="tech text-[10px] text-crit">Le plafond</p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">
                  L&apos;article 83(5) du RGPD fixe un maximum de 20 millions d&apos;euros ou 4 %
                  du chiffre d&apos;affaires annuel mondial, le montant le plus élevé étant
                  retenu. C&apos;est un <strong>plafond légal</strong>, pas un tarif. Il vise les
                  manquements les plus graves d&apos;organisations de grande taille.
                </p>
              </div>

              <div className="border-l-2 border-warn pl-4">
                <p className="tech text-[10px] text-warn">La réalité</p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">
                  L&apos;essentiel des dossiers cookies est traité en procédure simplifiée, dont
                  l&apos;article 22-1 de la loi n° 78-17 plafonne les sanctions à{" "}
                  <strong>20 000 € par décision</strong>. C&apos;est l&apos;ordre de grandeur qui
                  concerne réellement une PME.
                </p>
              </div>

              <div className="border-l-2 border-ok pl-4">
                <p className="tech text-[10px] text-ok">La sortie</p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">
                  Le coût de correction est presque toujours inférieur d&apos;un ordre de
                  grandeur au risque encouru. C&apos;est cet écart qui justifie d&apos;agir — pas
                  la peur du chiffre le plus gros.
                </p>
              </div>

              <div className="border-l-2 border-ink-3 pl-4">
                <p className="tech text-[10px] text-muted">Le volet pénal</p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">
                  Distinct de l&apos;amende administrative, l&apos;article 226-16 du code pénal
                  prévoit 300 000 € d&apos;amende, quintuplés pour une personne morale au titre
                  de l&apos;article 131-38. Les poursuites sur ce fondement restent rares.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-lg bg-surface p-5 ring-1 ring-line shadow-md">
              <p className="tech text-[10px] text-muted">Sources des montants</p>
              <ul className="mt-3 space-y-2.5">
                {cited.map((f) => (
                  <li key={f.id} className="text-[13px] leading-snug text-ink-2">
                    <span className="font-semibold">{f.value}</span>
                    <span className="mt-0.5 block text-muted">
                      {f.sourceName} · vérifié le{" "}
                      {f.verifiedAt
                        ? new Date(f.verifiedAt).toLocaleDateString("fr-FR")
                        : "—"}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href="/sources"
                className="tech mt-4 inline-block text-[10px] text-flame hover:underline"
              >
                Toutes nos sources →
              </Link>
            </div>
          </div>

          <div className="lg:sticky lg:top-24">
            <FineSimulator />
          </div>
        </div>

        <div className="mt-14">
          <Disclaimer />
        </div>
      </div>
    </>
  );
}
