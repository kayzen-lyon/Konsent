import type { Metadata } from "next";
import { BadgeBuilder } from "@/components/BadgeBuilder";
import { Disclaimer } from "@/components/primitives";
import { EDITOR } from "@/lib/disclaimer";
import { JsonLd } from "@/components/JsonLd";
import { toolJsonLd } from "@/lib/seo/jsonld";
import { getTool } from "@/lib/tools/catalog";

export const metadata: Metadata = {
  title: "Afficher votre badge Konsent",
  description:
    "Un badge à intégrer sur votre site ou votre README, qui affiche le score d'analyse RGPD et cookies de Konsent, recalculé au plus une fois par jour.",
};

export default function BadgePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <JsonLd data={toolJsonLd(getTool("badge")!)} />
      <p className="tech text-[10px] text-accent">Badge</p>
      <h1 className="display mt-2 text-4xl text-ink-2">Afficher votre badge Konsent</h1>
      <p className="mt-5 text-lg leading-relaxed text-muted">
        Comme un badge de build, il affiche le score de votre site et renvoie vers le rapport
        complet. Indiquez votre adresse, puis copiez le code dans votre page ou votre README.
      </p>

      <section className="mt-10 rounded-3xl bg-surface p-6 ring-1 ring-line shadow-md sm:p-8">
        <BadgeBuilder siteOrigin={EDITOR.productSite} />
      </section>

      <aside className="mt-10 rounded-3xl bg-surface p-6 ring-1 ring-line">
        <h2 className="font-display text-lg text-ink-2">Ce que le badge dit, et ce qu&apos;il ne dit pas</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-muted">
          <li>
            Il reflète une <strong className="text-ink-2">analyse automatisée et indicative</strong>,
            pas une certification ni un audit juridique.
          </li>
          <li>
            Il est recalculé <strong className="text-ink-2">au plus une fois par jour</strong> :
            une correction faite aujourd&apos;hui peut n&apos;apparaître que demain.
          </li>
          <li>
            Si l&apos;analyse échoue, le badge affiche « indisponible » plutôt qu&apos;un score
            inventé.
          </li>
        </ul>
      </aside>

      <div className="mt-14">
        <Disclaimer variant="short" />
      </div>
    </div>
  );
}
