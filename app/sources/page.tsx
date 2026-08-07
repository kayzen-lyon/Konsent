import type { Metadata } from "next";
import { FACTS, PENDING_FACTS, PUBLIC_FACTS } from "@/lib/facts";

export const metadata: Metadata = {
  title: "Nos sources",
  description:
    "Chaque affirmation chiffrée de Konsent porte sa source et sa date de vérification. Les chiffres non encore vérifiés ne sont pas affichés dans le produit.",
};

export default function SourcesPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-k-primary">
          Transparence
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-k-ink sm:text-4xl">
          Nos sources
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-k-muted">
          Un outil qui fait peur avec des chiffres doit pouvoir les sourcer. Chaque affirmation
          chiffrée du produit est enregistrée ici avec sa source et sa date de vérification.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-k-muted">
          Les chiffres qui n&apos;ont pas encore été confrontés à leur source officielle{" "}
          <strong className="text-k-ink">ne sont pas affichés</strong> dans les écrans de
          résultat. Ils sont listés ci-dessous en attente de contrôle, plutôt que dissimulés.
        </p>
      </header>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-k-ink">
          Vérifiés ({PUBLIC_FACTS.length}/{FACTS.length})
        </h2>
        <ul className="mt-4 space-y-3">
          {PUBLIC_FACTS.map((f) => (
            <li key={f.id} className="rounded-xl border border-k-line bg-white p-4">
              <p className="text-[15px] font-medium text-k-ink">{f.claim}</p>
              <p className="mt-1 text-[15px] text-k-ink">{f.value}</p>
              <p className="mt-2 text-xs text-k-muted">
                {f.sourceName} · vérifié le{" "}
                {f.verifiedAt
                  ? new Date(f.verifiedAt).toLocaleDateString("fr-FR", { dateStyle: "long" })
                  : "—"}{" "}
                ·{" "}
                <a
                  href={f.sourceUrl}
                  className="text-k-primary hover:underline"
                  rel="noopener noreferrer nofollow"
                  target="_blank"
                >
                  consulter la source
                </a>
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-k-ink">
          En attente de vérification ({PENDING_FACTS.length})
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-k-muted">
          Ces chiffres proviennent de synthèses et n&apos;ont pas encore été confrontés à la
          publication officielle. Ils sont donc absents des rapports.
        </p>
        <ul className="mt-4 space-y-3">
          {PENDING_FACTS.map((f) => (
            <li key={f.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-[15px] font-medium text-amber-900">{f.claim}</p>
              <p className="mt-1 text-[15px] text-amber-900">{f.value}</p>
              <p className="mt-2 text-xs text-amber-800">
                Source annoncée : {f.sourceName} — non vérifiée à ce jour.
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
