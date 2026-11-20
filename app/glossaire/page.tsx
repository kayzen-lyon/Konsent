import Link from "next/link";
import type { Metadata } from "next";
import { GLOSSARY } from "@/lib/seo/glossary";
import { Mur } from "@/components/immersive/Mur";

export const metadata: Metadata = {
  title: "Glossaire RGPD, cookies et traceurs",
  description:
    "CMP, TCF, masquage par CNAME, intérêt légitime, empreinte du terminal : le vocabulaire du domaine expliqué pour quelqu'un qui découvre, avec les références.",
};

export default function GlossaryPage() {
  return (
    <>
      <section className="grid-bg-dark bg-ink imm-murhote">
        <div className="mx-auto max-w-7xl px-5 py-14">
          <p className="tech text-[10px] text-flame-soft">Glossaire</p>
          <h1 className="display mt-3 max-w-3xl text-3xl text-white sm:text-[2.8rem]">
            Le vocabulaire, sans le jargon
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-white/65">
            Un dirigeant qui ne comprend pas les mots ne peut pas arbitrer, et finit par signer
            ce qu&apos;on lui présente. {GLOSSARY.length} termes expliqués pour quelqu&apos;un
            qui découvre, avec leur référence quand elle existe.
          </p>
        </div>
        <Mur />
      </section>

      <div className="mx-auto max-w-5xl px-5 py-12">
        <ul className="grid gap-3 sm:grid-cols-2">
          {[...GLOSSARY]
            .sort((a, b) => a.term.localeCompare(b.term, "fr"))
            .map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/glossaire/${t.slug}`}
                  className="group flex h-full flex-col rounded-lg bg-surface p-5 ring-1 ring-line shadow-md transition hover:ring-flame"
                >
                  <span className="text-[16px] font-bold leading-snug text-ink-2 group-hover:text-flame">
                    {t.term}
                  </span>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{t.short}</p>
                  {t.reference ? (
                    <p className="tech mt-3 text-[9px] text-accent">{t.reference}</p>
                  ) : null}
                </Link>
              </li>
            ))}
        </ul>
      </div>
    </>
  );
}
