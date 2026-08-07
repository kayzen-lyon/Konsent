import type { Metadata } from "next";
import { EDITOR } from "@/lib/disclaimer";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales du site Konsent, édité par KAYZEN LYON SASU.",
};

export default function LegalPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-ink-2">Mentions légales</h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink-2">Éditeur du site</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          {EDITOR.legalName}
          <br />
          Société par actions simplifiée unipersonnelle
          <br />
          SIREN {EDITOR.siren}
          <br />
          {EDITOR.address}
          <br />
          Courriel :{" "}
          <a href={`mailto:${EDITOR.email}`} className="text-flame hover:underline">
            {EDITOR.email}
          </a>
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink-2">Directeur de la publication</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          Le représentant légal de {EDITOR.legalName}.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink-2">Hébergement</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.
          <br />
          <a
            href="https://vercel.com"
            className="text-flame hover:underline"
            rel="noopener noreferrer nofollow"
            target="_blank"
          >
            vercel.com
          </a>
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink-2">Nature du service</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          Konsent est un outil d&apos;analyse technique automatisée. Il ne constitue ni un audit
          juridique, ni une consultation juridique, ni une certification de conformité. Seul un
          professionnel du droit habilité peut qualifier juridiquement une situation.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink-2">Propriété intellectuelle</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          Le référentiel de règles, la base de connaissance des destinataires et les gabarits
          documentaires sont la propriété de {EDITOR.legalName}. Les marques et dénominations
          citées appartiennent à leurs titulaires respectifs et ne sont mentionnées qu&apos;à des
          fins d&apos;identification technique.
        </p>
      </section>
    </div>
  );
}
