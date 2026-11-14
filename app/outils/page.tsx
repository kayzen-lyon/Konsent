import Link from "next/link";
import type { Metadata } from "next";
import { Disclaimer, SectionTitle } from "@/components/primitives";
import { FREE_TOOLS, toolHref } from "@/lib/tools/catalog";

export const metadata: Metadata = {
  title: "Outils libres",
  description:
    "Des outils de conformité qui répondent immédiatement, sans inscription, sans adresse e-mail, et sans conserver ce que vous leur donnez.",
};

export default function ToolsPage() {
  const available = FREE_TOOLS.filter((t) => t.available);
  const planned = FREE_TOOLS.filter((t) => !t.available);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="tech text-[10px] text-accent">Outils libres</p>
      <h1 className="display mt-2 text-4xl text-ink-2">
        Des réponses, pas des formulaires
      </h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">
        L&apos;usage du marché consiste à placer le résultat derrière une adresse e-mail, un nom
        d&apos;entreprise et une case à cocher, puis à l&apos;envoyer « en quelques minutes ». Ce
        n&apos;est pas un outil, c&apos;est un formulaire de prospection déguisé en outil.
      </p>
      <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted">
        Chacun des outils ci-dessous répond <strong className="text-ink-2">immédiatement</strong>,
        sans rien demander, et ne conserve rien.
      </p>

      <section className="mt-12">
        <SectionTitle eyebrow="01" title="Disponibles" />
        <ul className="mt-6 space-y-4">
          {available.map((tool) => (
            <li key={tool.slug}>
              <Link
                href={toolHref(tool)}
                className="block rounded-lg border border-slate-200 p-6 transition hover:border-flame"
              >
                <p className="text-sm text-accent">{tool.question}</p>
                <h2 className="display mt-2 text-xl text-ink-2">{tool.title}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{tool.description}</p>
                <p className="tech mt-3 text-[10px] text-muted">
                  Traitement : {tool.processing === "navigateur"
                    ? "dans votre navigateur, rien ne nous parvient"
                    : "sur nos serveurs, sans conservation"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {planned.length > 0 ? (
        <section className="mt-12">
          <SectionTitle
            eyebrow="02"
            title="Annoncés"
            description="Listés ici parce qu'annoncer ce qui n'existe pas encore engage plus que de le taire."
          />
          <ul className="mt-6 space-y-3">
            {planned.map((tool) => (
              <li key={tool.slug} className="rounded-lg border border-dashed border-slate-300 p-5">
                <h2 className="text-[15px] font-medium text-ink-2">{tool.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted">{tool.description}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-14">
        <Disclaimer variant="short" />
      </div>
    </div>
  );
}
