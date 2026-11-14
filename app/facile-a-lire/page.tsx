import type { Metadata } from "next";
import Link from "next/link";
import { EDITOR } from "@/lib/disclaimer";

export const metadata: Metadata = {
  title: "Version facile à lire",
  description:
    "Konsent expliqué avec des mots simples : ce que fait Konsent, comment vérifier un site, c'est gratuit, comment demander de l'aide.",
  alternates: { canonical: "/facile-a-lire" },
};

/**
 * Accueil en « facile à lire et à comprendre », selon les règles européennes
 * d'information pour tous (Inclusion Europe) : phrases courtes, une idée par
 * phrase, mots de tous les jours, aucun sigle, grande taille de texte, texte
 * aligné à gauche, une image à côté de chaque idée.
 *
 * Le logo officiel du « facile à lire » est une marque déposée et n'est pas
 * utilisé : la page porte simplement la mention « Version facile à lire ».
 * Elle n'a pas été relue par des personnes en situation de handicap
 * intellectuel ; tant que ce n'est pas fait, elle ne le prétend pas.
 *
 * Les pictogrammes sont dessinés ici, sans ressource externe. Chacun porte un
 * nom (`role="img"` + `aria-label`) : il accompagne le texte, il ne le
 * remplace jamais.
 */

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Picto({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-flame-bg text-flame">
      <svg role="img" aria-label={label} viewBox="0 0 64 64" className="h-16 w-16">
        {children}
      </svg>
    </span>
  );
}

const PICTOS = {
  site: (
    <Picto label="Image : un écran d'ordinateur">
      <rect x="6" y="10" width="52" height="34" rx="4" {...STROKE} />
      <path d="M6 18h52M24 54h16M32 44v10" {...STROKE} />
      <circle cx="12" cy="14" r="1.5" fill="currentColor" />
      <circle cx="17" cy="14" r="1.5" fill="currentColor" />
    </Picto>
  ),
  cookie: (
    <Picto label="Image : un cookie, un petit biscuit rond">
      <path d="M32 6a26 26 0 1 0 26 26 8 8 0 0 1-9-9 8 8 0 0 1-9-9 8 8 0 0 1-8-8z" {...STROKE} />
      <circle cx="22" cy="28" r="3" fill="currentColor" />
      <circle cx="34" cy="40" r="3" fill="currentColor" />
      <circle cx="22" cy="44" r="2.5" fill="currentColor" />
      <circle cx="42" cy="30" r="2" fill="currentColor" />
    </Picto>
  ),
  loupe: (
    <Picto label="Image : une loupe qui regarde de près">
      <circle cx="27" cy="27" r="17" {...STROKE} />
      <path d="M40 40l16 16" {...STROKE} strokeWidth={5} />
      <path d="M19 27l6 6 10-12" {...STROKE} />
    </Picto>
  ),
  clavier: (
    <Picto label="Image : une main écrit l'adresse d'un site">
      <rect x="6" y="14" width="52" height="16" rx="8" {...STROKE} />
      <path d="M14 22h22" {...STROKE} />
      <path d="M44 36v14l4-4 4 8 3-1.5-4-8h6z" {...STROKE} />
    </Picto>
  ),
  gratuit: (
    <Picto label="Image : un porte-monnaie fermé, vous ne payez rien">
      <rect x="8" y="18" width="48" height="34" rx="6" {...STROKE} />
      <path d="M8 28h48M14 18l26-10 6 10" {...STROKE} />
      <circle cx="46" cy="40" r="3" fill="currentColor" />
    </Picto>
  ),
  aide: (
    <Picto label="Image : une enveloppe et un téléphone pour nous contacter">
      <rect x="4" y="14" width="36" height="26" rx="3" {...STROKE} />
      <path d="M4 16l18 13 18-13" {...STROKE} />
      <rect x="44" y="22" width="16" height="30" rx="3" {...STROKE} />
      <path d="M50 47h4" {...STROKE} />
    </Picto>
  ),
};

function Block({
  id,
  title,
  picto,
  children,
}: {
  id: string;
  title: string;
  picto: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-6 rounded-3xl border border-line bg-surface p-7 shadow-md sm:flex-row sm:p-9"
    >
      {picto}
      <div className="min-w-0 flex-1">
        <h2 id={id} className="display text-3xl text-ink-2">
          {title}
        </h2>
        <div className="mt-5 space-y-4 text-xl leading-relaxed text-ink-2">{children}</div>
      </div>
    </section>
  );
}

export default function EasyReadPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <p className="font-display inline-flex rounded-full border border-line px-4 py-2 text-base font-bold text-ink-2">
        Version facile à lire
      </p>

      <h1 className="display mt-6 text-4xl text-ink-2 sm:text-5xl">
        Konsent vérifie les sites internet.
      </h1>
      <p className="mt-6 text-xl leading-relaxed text-ink-2">
        Cette page explique Konsent avec des mots simples.
      </p>
      <p className="mt-3 text-xl leading-relaxed text-ink-2">
        La{" "}
        <Link href="/" className="font-semibold text-flame underline underline-offset-4">
          version complète de l&apos;accueil
        </Link>{" "}
        donne plus de détails.
      </p>

      <div className="mt-12 space-y-8">
        <Block id="quoi" title="Konsent, c'est quoi ?" picto={PICTOS.site}>
          <p>Konsent est un outil sur internet.</p>
          <p>Konsent regarde un site internet.</p>
          <p>Konsent dit si le site respecte vos choix.</p>
          <p>
            Konsent est fait par {EDITOR.tradeName}.
            <br />
            {EDITOR.tradeName} est une petite entreprise de Lyon.
          </p>
        </Block>

        <Block id="cookies" title="Ce que Konsent vérifie" picto={PICTOS.cookie}>
          <p>
            Beaucoup de sites mettent des <strong>cookies</strong>.
          </p>
          <p>
            Un cookie est un petit fichier.
            <br />
            Le site le met dans votre ordinateur ou votre téléphone.
          </p>
          <p>
            Certains cookies gardent des informations sur vous.
            <br />
            Par exemple : les pages que vous regardez.
          </p>
          <p>
            La loi dit : le site doit d&apos;abord vous demander votre accord.
          </p>
          <p>Konsent vérifie 3 choses :</p>
          <ul className="list-disc space-y-3 pl-7">
            <li>Le site met-il des cookies avant votre accord ?</li>
            <li>Le site envoie-t-il vos informations à d&apos;autres entreprises ?</li>
            <li>Ces entreprises sont-elles en Europe ou dans un autre pays ?</li>
          </ul>
        </Block>

        <Block id="comment" title="Comment vérifier un site" picto={PICTOS.clavier}>
          <ol className="list-decimal space-y-3 pl-7">
            <li>Écrivez l&apos;adresse du site dans la case ci-dessous.</li>
            <li>Appuyez sur le bouton « Vérifier ce site ».</li>
            <li>Attendez un peu. Konsent regarde le site.</li>
            <li>Lisez le résultat.</li>
          </ol>

          <form action="/scan" method="get" className="mt-6 space-y-4">
            <div>
              <label htmlFor="falc-url" className="block font-semibold">
                Adresse du site
              </label>
              <p id="falc-url-aide" className="mt-1 text-lg text-muted">
                Par exemple : monsite.fr
              </p>
              <input
                id="falc-url"
                name="url"
                type="text"
                inputMode="url"
                autoComplete="url"
                required
                aria-describedby="falc-url-aide"
                className="mt-2 w-full rounded-2xl border-2 border-line bg-surface px-5 py-4 font-mono text-xl text-ink-2"
              />
            </div>
            <button
              type="submit"
              className="btn-primary font-display inline-flex min-h-14 items-center rounded-full bg-flame px-8 text-xl font-bold text-white hover:bg-flame-dark"
            >
              Vérifier ce site
            </button>
          </form>
        </Block>

        <Block id="resultat" title="Lire le résultat" picto={PICTOS.loupe}>
          <p>Konsent donne une note sur 100.</p>
          <p>Plus la note est haute, mieux c&apos;est.</p>
          <p>Konsent explique chaque problème trouvé.</p>
          <p>
            Attention : Konsent n&apos;est pas un avocat.
            <br />
            Le résultat vous aide à comprendre.
            <br />
            Pour un avis sûr, demandez à un avocat.
          </p>
        </Block>

        <Block id="gratuit" title="C'est gratuit" picto={PICTOS.gratuit}>
          <p>Vérifier un site est gratuit.</p>
          <p>Vous ne payez rien.</p>
          <p>Vous n&apos;avez pas besoin de créer un compte.</p>
          <p>Vous n&apos;avez pas besoin de donner votre nom.</p>
        </Block>

        <Block id="aide" title="Besoin d'aide ?" picto={PICTOS.aide}>
          <p>Vous pouvez nous écrire ou nous appeler.</p>
          <ul className="space-y-3">
            <li>
              Par courriel :{" "}
              <a
                href={`mailto:${EDITOR.email}`}
                className="font-semibold text-flame underline underline-offset-4"
              >
                {EDITOR.email}
              </a>
            </li>
            <li>
              Par téléphone :{" "}
              <a
                href={`tel:${EDITOR.phoneE164}`}
                className="font-semibold text-flame underline underline-offset-4"
              >
                {EDITOR.phone}
              </a>
            </li>
            <li>
              Avec le{" "}
              <Link href="/contact" className="font-semibold text-flame underline underline-offset-4">
                formulaire de contact
              </Link>
            </li>
          </ul>
          <p>Nous vous répondons dans les 7 jours de travail.</p>
          <p>Les jours de travail vont du lundi au vendredi.</p>
        </Block>
      </div>
    </div>
  );
}
