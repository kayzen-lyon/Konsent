import type { Metadata } from "next";
import Link from "next/link";
import { Disclaimer } from "@/components/primitives";
import { RULEPACK } from "@/lib/rulepack";

export const metadata: Metadata = {
  title: "Méthodologie",
  description:
    "Comment Konsent observe un site, calcule un score et applique ses plafonds. Méthodologie publiée intégralement.",
};

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          Transparence
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink-2 sm:text-4xl">
          Méthodologie
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">
          Un outil qui produit un score doit expliquer comment il le calcule. C&apos;est ce qui
          distingue un instrument de mesure d&apos;un générateur d&apos;inquiétude.
        </p>
      </header>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink-2">Ce que nous observons</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          L&apos;analyse en ligne exécute le mode statique. Elle récupère le document servi par
          votre serveur, en extrait les ressources référencées, lit les en-têtes de réponse,
          résout les chaînes DNS de vos sous-domaines, et récupère vos pages légales pour y
          chercher les mentions attendues.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          Ce mode <strong>n&apos;exécute aucun JavaScript</strong>. Il ne peut donc pas
          constater le dépôt effectif d&apos;un cookie posé par un script, ni le comportement du
          site après un refus. Ces règles sont explicitement reportées en « non évalué » dans
          chaque rapport — jamais comptées comme satisfaites.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          Le protocole complet en trois phases (avant consentement, après refus, après
          acceptation) s&apos;exécute dans un navigateur piloté, en conteneur isolé. Le worker
          correspondant est fourni dans le dépôt du projet.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink-2">Comment le score est calculé</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          Chaque règle porte un poids. Le score part de 100 et retranche la somme des poids des
          règles déclenchées, pondérés par un facteur d&apos;occurrence à rendements
          décroissants :
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-surface p-4 font-mono text-[13px] text-ink-2">
          {`score = 100 − Σ ( poids_règle × facteur )
facteur = 1 + ln(occurrences) / 4`}
        </pre>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          Dix cookies publicitaires sont pires qu&apos;un seul, mais pas dix fois pires : le
          logarithme traduit cette réalité.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink-2">Les plafonds durs</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          Trois situations plafonnent le score, quelles que soient les bonnes pratiques par
          ailleurs :
        </p>
        <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-ink-2">
          <li>
            · Un constat critique de dépôt avant consentement ou de non-respect du refus →
            score plafonné à <strong>45</strong>.
          </li>
          <li>
            · Aucun mécanisme de recueil du consentement alors que des traceurs non exemptés
            sont présents → plafonné à <strong>30</strong>.
          </li>
          <li>
            · Aucune politique de confidentialité accessible → plafonné à <strong>60</strong>.
          </li>
        </ul>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Ces plafonds évitent qu&apos;un site cumulant des points mineurs compense un
          manquement grave et obtienne une note flatteuse.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink-2">Ce que nous ne faisons pas</h2>
        <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-ink-2">
          <li>· Nous n&apos;écrivons jamais « vous êtes en infraction ». Nous constatons un écart.</li>
          <li>
            · Nous n&apos;affichons jamais un plafond légal sans la fourchette réellement
            observée en procédure simplifiée.
          </li>
          <li>· Nous n&apos;utilisons aucun logo d&apos;autorité, ni aucune mise en demeure simulée.</li>
          <li>· Nous n&apos;affichons aucun compte à rebours ni fausse urgence.</li>
          <li>
            · Nous n&apos;employons aucun modèle de langage pour produire un constat ou un
            document juridique.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink-2">Faux positifs</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          Ils existent. Chaque règle susceptible d&apos;en produire porte une note explicite
          décrivant sa limite, consultable sur sa fiche dans le{" "}
          <Link href="/regles" className="text-accent hover:underline">
            référentiel
          </Link>
          . Lorsqu&apos;une page légale ne livre pas de texte exploitable — cas fréquent des
          sites rendus côté client — nous nous abstenons de conclure plutôt que de produire un
          constat infondé.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink-2">Versionnement</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          Le référentiel courant est <strong>{RULEPACK.version}</strong>. Chaque rapport
          indique la version utilisée, ce qui le rend reproductible et explicable après coup,
          même si les règles évoluent.
        </p>
      </section>

      <div className="mt-12">
        <Disclaimer />
      </div>
    </div>
  );
}
