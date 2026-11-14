import type { Metadata } from "next";
import { BulkScan } from "@/components/BulkScan";
import { Disclaimer } from "@/components/primitives";
import { JsonLd } from "@/components/JsonLd";
import { toolJsonLd } from "@/lib/seo/jsonld";
import { BULK_SCAN_TOOL } from "@/lib/seo/og";

export const metadata: Metadata = {
  title: "Analyse en lot",
  description:
    "Analysez jusqu'à 20 sites d'un coup : note, score, écarts critiques, destinataires hors EEE, dans un tableau triable exportable en CSV ou JSON. Rien n'est conservé côté serveur.",
  robots: { index: true, follow: true },
};

export default function BulkScanPage() {
  return (
    <>
      <JsonLd data={toolJsonLd(BULK_SCAN_TOOL)} />
      <section className="grid-bg-dark bg-ink">
        <div className="mx-auto max-w-7xl px-5 py-10">
          <p className="tech text-[10px] text-flame-soft">Analyse en lot</p>
          <h1 className="display mt-2 text-3xl text-white sm:text-4xl">Analyser plusieurs sites d&apos;un coup</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/70">
            Collez jusqu&apos;à 20 adresses : chaque site est audité, puis les résultats sont réunis dans un
            tableau récapitulatif triable, exportable en CSV ou en JSON.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-10">
        <BulkScan />
        <div className="mt-12">
          <Disclaimer variant="short" />
        </div>
      </div>
    </>
  );
}
