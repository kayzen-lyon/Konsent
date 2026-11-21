import Link from "next/link";
import type { Metadata } from "next";
import CountUp from "@/components/bits/CountUp";
import { Pill } from "@/components/primitives";
import { COOKIES, lifetimeLabel } from "@/lib/seo/cookies";
import { Mur } from "@/components/immersive/Mur";

export const metadata: Metadata = {
  title: "Que fait ce cookie ? Index des cookies expliqués",
  description:
    "Vous avez trouvé un cookie dans votre navigateur et vous vous demandez à quoi il sert. Index des cookies les plus répandus : finalité, éditeur, durée de vie et obligation de consentement.",
};

export default function CookieIndexPage() {
  const requiring = COOKIES.filter((c) => c.requiresConsent).length;
  const exempt = COOKIES.length - requiring;

  const byLetter = new Map<string, typeof COOKIES>();
  for (const cookie of COOKIES) {
    const letter = /^[a-z]/i.test(cookie.name) ? cookie.name[0]!.toUpperCase() : "_";
    byLetter.set(letter, [...(byLetter.get(letter) ?? []), cookie]);
  }
  const letters = [...byLetter.keys()].sort();

  return (
    <>
      <section className="grid-bg-dark bg-ink imm-murhote">
        <div className="mx-auto max-w-7xl px-5 py-14">
          <p className="tech text-[10px] text-flame-soft">Index</p>
          <h1 className="display mt-3 max-w-3xl text-3xl text-white sm:text-[2.8rem]">
            Que fait ce cookie ?
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-white/65">
            Vous avez ouvert les outils de votre navigateur, vous êtes tombé sur un nom
            incompréhensible, et vous voulez savoir ce qu&apos;il fait. Voici la réponse pour les{" "}
            {COOKIES.length} cookies les plus répandus sur le web français : à quoi ils servent,
            qui les dépose, combien de temps ils durent, et s&apos;ils exigent un consentement.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <div className="rounded-lg bg-white/10 px-4 py-2.5">
              <span className="tabular display text-xl text-white">
                <CountUp to={requiring} />
              </span>
              <span className="tech ml-2 text-[9px] text-white/60">soumis à consentement</span>
            </div>
            <div className="rounded-lg bg-white/10 px-4 py-2.5">
              <span className="tabular display text-xl text-white">
                <CountUp to={exempt} />
              </span>
              <span className="tech ml-2 text-[9px] text-white/60">exemptés</span>
            </div>
          </div>
        </div>
        <Mur />
      </section>

      <div className="mx-auto max-w-5xl px-5 py-12">
        <nav aria-label="Aller à la lettre" className="mb-8 flex flex-wrap gap-1.5">
          {letters.map((l) => (
            <a
              key={l}
              href={`#lettre-${l}`}
              className="tech rounded border border-line px-2.5 py-1.5 text-[10px] text-muted transition hover:border-flame hover:text-flame"
            >
              {l}
            </a>
          ))}
        </nav>

        {letters.map((letter) => (
          <section key={letter} id={`lettre-${letter}`} className="mb-10 scroll-mt-24">
            <h2 className="display mb-3 text-xl text-ink-2">{letter}</h2>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {(byLetter.get(letter) ?? []).map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/cookies/${c.slug}`}
                    className="group flex h-full flex-col rounded-lg bg-surface p-4 ring-1 ring-line shadow-md transition hover:ring-flame"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[14px] font-bold text-ink-2 group-hover:text-flame">
                        {c.name}
                      </span>
                      <Pill tone={c.requiresConsent ? "danger" : "ok"}>
                        {c.requiresConsent ? "consentement" : "exempté"}
                      </Pill>
                    </div>
                    <p className="mt-1 text-[12px] text-muted">{c.vendorName}</p>
                    <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-muted">
                      {c.purposeFr}
                    </p>
                    <p className="tech mt-2 text-[9px] text-muted">
                      {lifetimeLabel(c.maxLifetimeDays)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="rounded-xl bg-ink p-6">
          <p className="tech text-[10px] text-flame-soft">Sur votre propre site</p>
          <h2 className="display mt-2 text-xl text-white">
            Savoir lesquels vous déposez, et quand
          </h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-white/65">
            Connaître un cookie est une chose ; savoir s&apos;il se dépose avant que vos
            visiteurs aient pu répondre en est une autre. C&apos;est ce que mesure l&apos;audit.
          </p>
          <Link
            href="/#scan"
            className="tech mt-5 inline-block rounded-full bg-flame shadow-md px-5 py-2.5 text-[11px] text-white transition hover:bg-flame-dark"
          >
            Auditer mon site
          </Link>
        </section>
      </div>
    </>
  );
}
