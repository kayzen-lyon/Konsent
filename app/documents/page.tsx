import Link from "next/link";
import type { Metadata } from "next";
import { ScanForm } from "@/components/ScanForm";
import { Disclaimer } from "@/components/primitives";
import { TEMPLATES, hasGenerator } from "@/lib/docs";

export const metadata: Metadata = {
  title: "Documents générés depuis votre audit",
  description:
    "Politique cookies, politique de confidentialité, mentions légales, registre des traitements, contrat de sous-traitance et procédures — alimentés par ce que votre site fait réellement.",
};

const AUDIENCE_LABELS: Record<string, string> = {
  public: "À publier sur le site",
  interne: "Document interne",
  contractuel: "Document contractuel",
};

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  const available = TEMPLATES.filter((t) => hasGenerator(t.slug));

  const byAudience = new Map<string, typeof available>();
  for (const t of available) {
    byAudience.set(t.audience, [...(byAudience.get(t.audience) ?? []), t]);
  }

  return (
    <>
      <section className="grid-bg-dark bg-ink">
        <div className="mx-auto max-w-7xl px-5 py-14">
          <p className="tech text-[10px] text-flame-soft">Documents</p>
          <h1 className="display mt-3 max-w-3xl text-3xl text-white sm:text-[2.8rem]">
            Des documents qui décrivent votre site, pas un site imaginaire
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-white/65">
            La plupart des générateurs vous font remplir un formulaire, puis produisent un texte
            qui décrit ce que vous avez déclaré. Ici, les destinataires, les transferts et les
            traceurs viennent de l&apos;analyse technique — ce qui rend structurellement
            impossible la divergence entre le document publié et la réalité.
          </p>

          {!url ? (
            <div className="mt-8 max-w-xl">
              <ScanForm tone="dark" />
            </div>
          ) : (
            <p className="tech mt-8 text-[10px] text-white/50">
              Documents pour {url}
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 py-12">
        {(["public", "interne", "contractuel"] as const).map((audience) => {
          const list = byAudience.get(audience) ?? [];
          if (list.length === 0) return null;

          return (
            <section key={audience} className="mb-10">
              <h2 className="display mb-4 text-xl text-ink-2">{AUDIENCE_LABELS[audience]}</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {list.map((t) => (
                  <li key={t.slug}>
                    {url ? (
                      <Link
                        href={`/documents/${t.slug}?url=${encodeURIComponent(url)}`}
                        className="group flex h-full flex-col rounded-lg bg-surface p-5 ring-1 ring-line transition hover:ring-flame"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[16px] font-bold leading-snug text-ink-2 group-hover:text-accent">
                            {t.title}
                          </span>
                          <span className="tech shrink-0 rounded bg-paper px-1.5 py-0.5 text-[9px] text-muted">
                            {t.id}
                          </span>
                        </div>
                        <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-muted">
                          {t.purpose}
                        </p>
                        <p className="tech mt-3 text-[9px] text-accent">
                          {t.fedByScan ? "Alimenté par le scan" : "Canevas à compléter"}
                        </p>
                      </Link>
                    ) : (
                      <div className="flex h-full flex-col rounded-lg bg-surface p-5 ring-1 ring-line">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[16px] font-bold leading-snug text-ink-2">
                            {t.title}
                          </span>
                          <span className="tech shrink-0 rounded bg-paper px-1.5 py-0.5 text-[9px] text-muted">
                            {t.id}
                          </span>
                        </div>
                        <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-muted">
                          {t.purpose}
                        </p>
                        <p className="tech mt-3 text-[9px] text-muted">{t.legalBasis}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <section className="rounded-xl border-l-2 border-warn bg-surface p-6 ring-1 ring-line">
          <p className="tech text-[10px] text-warn">Ce que ces documents ne sont pas</p>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
            Ce sont des modèles, pas des documents prêts à publier. Chaque champ que nous ne
            pouvons pas connaître apparaît en clair, en surbrillance — nous ne le remplissons
            jamais au jugé. Aucun modèle de langage n&apos;intervient dans leur production : les
            gabarits sont déterministes, ce qui exclut toute invention.
          </p>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
            Ils doivent être relus et validés par un professionnel du droit avant toute
            utilisation. Un document juridique publié sans relecture engage votre responsabilité,
            pas la nôtre.
          </p>
        </section>

        <div className="mt-10">
          <Disclaimer />
        </div>
      </div>
    </>
  );
}
