import Link from "next/link";
import { EDITOR } from "@/lib/disclaimer";

/**
 * Ossature commune aux pages légales.
 *
 * Le balisage compte autant que le texte. Trois choix, tous dictés par le
 * RGAA plutôt que par l'esthétique :
 *
 *  · Une seule `<h1>` par page, puis une hiérarchie de titres sans saut de
 *    niveau (critère RGAA 9.1). Un lecteur d'écran navigue de titre en titre ;
 *    passer de h2 à h4 lui fait croire qu'il a manqué une section.
 *  · Chaque article est une `<section>` porteuse d'un titre, pas une `<div>` :
 *    c'est ce qui la rend atteignable par la navigation structurelle.
 *  · La date de dernière mise à jour est dans un `<time>` exploitable, et non
 *    dans un texte libre — une page légale sans date opposable ne vaut rien.
 */

export function LegalPage({
  title,
  updatedAt,
  intro,
  children,
}: {
  title: string;
  /** Date ISO. Sert l'attribut `datetime` autant que l'affichage. */
  updatedAt: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <h1 className="display text-3xl text-ink-2 sm:text-4xl">{title}</h1>

      <p className="mt-3 text-[13px] text-muted">
        Dernière mise à jour :{" "}
        <time dateTime={updatedAt}>
          {new Date(updatedAt).toLocaleDateString("fr-FR", { dateStyle: "long" })}
        </time>
      </p>

      {intro ? (
        <div className="mt-6 rounded-xl border-l-2 border-secondary bg-surface p-5 text-[15px] leading-relaxed text-ink-2 ring-1 ring-line shadow-md">
          {intro}
        </div>
      ) : null}

      <div className="mt-10 space-y-10">{children}</div>

      <nav aria-label="Autres pages légales" className="mt-14 border-t border-line pt-6">
        <p className="tech text-[10px] text-muted">Voir aussi</p>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[14px]">
          {(
            [
              ["/mentions-legales", "Mentions légales"],
              ["/cgu", "Conditions générales d'utilisation"],
              ["/cgv", "Conditions générales de vente"],
              ["/confidentialite", "Politique de confidentialité"],
              ["/confidentialite#cookies", "Cookies"],
              ["/accessibilite", "Accessibilité"],
              ["/plan-du-site", "Plan du site"],
              ["/contact", "Nous écrire"],
            ] as const
          ).map(([href, label]) => (
            <li key={href}>
              <Link href={href} className="text-flame hover:underline">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

/** Un article de conditions, numéroté et atteignable par ancre. */
export function Article({
  id,
  number,
  heading,
  children,
}: {
  id: string;
  number?: number;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-titre`} className="scroll-mt-24">
      <h2 id={`${id}-titre`} className="text-lg font-bold text-ink-2">
        {number ? <span className="mr-2 text-muted">{number}.</span> : null}
        {heading}
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}

/** Bloc d'identité de l'éditeur, unique et réutilisé. */
export function EditorIdentity() {
  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
      {[
        ["Entrepreneur", `${EDITOR.director}, entrepreneur individuel`],
        ["Nom commercial", EDITOR.tradeName],
        ["Forme juridique", EDITOR.legalForm],
        ["SIREN", EDITOR.siren],
        ["SIRET", EDITOR.siret],
        ["Code APE", EDITOR.apeCode],
        ["TVA", EDITOR.vatMention],
        ["Siège social", `${EDITOR.street}, ${EDITOR.postalCode} ${EDITOR.city}, ${EDITOR.country}`],
        ["Locaux", `${EDITOR.premises}, ${EDITOR.country}`],
      ].map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="tech text-[10px] text-muted sm:pt-1">{label}</dt>
          <dd className="text-[15px] text-ink-2">{value}</dd>
        </div>
      ))}
      <div className="contents">
        <dt className="tech text-[10px] text-muted sm:pt-1">Téléphone</dt>
        <dd className="text-[15px]">
          <a href={`tel:${EDITOR.phoneE164}`} className="text-flame hover:underline">
            {EDITOR.phone}
          </a>
        </dd>
      </div>
      <div className="contents">
        <dt className="tech text-[10px] text-muted sm:pt-1">Courriel</dt>
        <dd className="text-[15px]">
          <a href={`mailto:${EDITOR.email}`} className="text-flame hover:underline">
            {EDITOR.email}
          </a>
        </dd>
      </div>
    </dl>
  );
}

/**
 * Avertissement de relecture juridique.
 *
 * Il figure en tête de chaque page de conditions, et ce n'est pas une
 * précaution de style : le §21.1 du PRD budgète la relecture d'un avocat en
 * droit du numérique et la qualifie de « dépense la plus rentable du projet ».
 * Tant qu'elle n'a pas eu lieu, le dire est la seule position tenable pour un
 * produit qui reproche aux autres d'affirmer plus qu'ils ne savent.
 */
export function PendingReview() {
  return (
    <p className="rounded-lg border-l-2 border-warn bg-warn-bg px-4 py-3 text-[13px] leading-relaxed text-warn">
      <strong>Version en attente de validation juridique.</strong> Ce texte a été rédigé à partir
      des textes applicables mais n&apos;a pas encore été relu par un avocat en droit du numérique.
      Les clauses marquées <code className="font-mono">[[À COMPLÉTER]]</code> appellent une
      information que seul l&apos;éditeur détient.
    </p>
  );
}
