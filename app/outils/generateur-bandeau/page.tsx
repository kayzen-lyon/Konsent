import Link from "next/link";
import type { Metadata } from "next";
import { Disclaimer, SectionTitle } from "@/components/primitives";
import BannerGenerator from "@/components/tools/BannerGenerator";

export const metadata: Metadata = {
  title: "Générateur de bandeau cookies conforme CNIL",
  description:
    "Créez gratuitement un bandeau cookies conforme aux lignes directrices CNIL 2020 : « Tout refuser » aussi visible que « Tout accepter », choix par finalité, aucune case pré-cochée, scripts bloqués jusqu'au consentement. Code autonome, sans dépendance, généré dans votre navigateur.",
};

const RULES: { title: string; body: string }[] = [
  {
    title: "Refuser aussi simplement qu'accepter",
    body: "« Tout refuser » et « Tout accepter » sont deux boutons identiques, de même taille, même couleur et même niveau. La CNIL a sanctionné à plusieurs reprises les bandeaux où le refus demandait plus d'un clic.",
  },
  {
    title: "Aucune case pré-cochée",
    body: "Le consentement doit résulter d'un acte positif. Toutes les finalités sont décochées à l'ouverture du panneau de personnalisation.",
  },
  {
    title: "Un choix par finalité",
    body: "Le bouton « Personnaliser » permet d'accepter la mesure d'audience sans accepter la publicité, par exemple. Chaque finalité est décrite en une phrase.",
  },
  {
    title: "Rien avant le choix",
    body: "Les scripts marqués type=\"text/plain\" ne s'exécutent qu'après accord pour leur catégorie. Le seul cookie écrit est celui qui mémorise le choix, et il ne l'est qu'après le clic.",
  },
  {
    title: "Conservation limitée",
    body: "Le choix est conservé six mois au plus, puis redemandé. Le refus est mémorisé de la même façon, pour ne pas solliciter à nouveau le visiteur à chaque page.",
  },
  {
    title: "Retrait à tout moment",
    body: "Le bouton « Gérer les cookies » rouvre le bandeau. Si une finalité acceptée est retirée, la page se recharge pour que les scripts concernés cessent de s'exécuter.",
  },
  {
    title: "Fermer vaut refuser",
    body: "La touche Échap ferme le bandeau ; au premier affichage, elle vaut refus, comme le bouton de fermeture admis par la CNIL.",
  },
  {
    title: "Accessible",
    body: "Rôle dialog, focus placé sur le bandeau puis rendu à l'élément d'origine, focus piégé dans la version modale, contraste des boutons calculé, cibles de 44 pixels.",
  },
];

export default function BannerGeneratorPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <p className="tech text-[10px] text-accent">Outil libre</p>
      <h1 className="display mt-2 text-4xl text-ink-2">
        Générateur de bandeau cookies conforme CNIL
      </h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">
        Réglez quelques paramètres, vérifiez le rendu, copiez le code. Le bandeau obtenu tient
        en un seul extrait HTML, sans bibliothèque, sans appel à un serveur tiers, et respecte
        les règles que la CNIL contrôle en premier.
      </p>

      <div className="mt-4 max-w-3xl rounded-3xl border border-line bg-surface-low px-5 py-4 text-sm leading-relaxed text-muted">
        Le code est assemblé <strong className="text-ink-2">dans votre navigateur</strong>. Rien
        n&apos;est envoyé ni enregistré, et aucune adresse e-mail n&apos;est demandée.
      </div>

      <BannerGenerator />

      <section className="mt-16" aria-labelledby="bg-why">
        <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
          <p className="tech text-[10px] text-accent">Pourquoi c&apos;est conforme</p>
          <h2 id="bg-why" className="display mt-2 text-2xl text-ink-2">
            Chaque choix du bandeau, et sa raison
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {RULES.map((r) => (
              <li key={r.title} className="rounded-2xl border border-line bg-surface-low p-5">
                <h3 className="display text-base text-ink-2">{r.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{r.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm leading-relaxed text-muted">
            Références : article 82 de la loi n° 78-17 du 6 janvier 1978 dite « Informatique et
            Libertés » (transposition de l&apos;article 5.3 de la directive ePrivacy) ;
            délibération CNIL n° 2020-091 du 17 septembre 2020 portant adoption de lignes
            directrices relatives aux cookies et autres traceurs ; délibération n° 2020-092 du
            même jour portant recommandation sur les modalités pratiques de recueil du
            consentement.
          </p>
        </div>
      </section>

      <section className="mt-14">
        <SectionTitle
          eyebrow="Limites"
          title="Ce que cet outil ne fait pas"
          description="Nous préférons l'écrire nous-mêmes."
        />
        <div className="max-w-3xl space-y-4 text-[15px] leading-relaxed text-muted">
          <p>
            <strong className="text-ink-2">
              Il ne remplace pas une plateforme de gestion du consentement (CMP) certifiée TCF.
            </strong>{" "}
            Si votre site vend de l&apos;espace publicitaire en programmatique, vos partenaires
            attendent une chaîne de consentement TCF émise par une CMP enregistrée auprès de
            l&apos;IAB Europe. Ce bandeau n&apos;en produit pas.
          </p>
          <p>
            Il ne sait pas quels traceurs votre site dépose réellement. Un bandeau conforme ne
            protège de rien si un script s&apos;exécute en dehors du mécanisme de blocage, ou si
            la politique cookies ne décrit pas les finalités et les destinataires. Pour le
            vérifier, lancez un{" "}
            <Link href="/scan" className="font-medium text-flame underline underline-offset-4">
              audit complet
            </Link>
            .
          </p>
          <p>
            Il ne supprime pas les cookies déjà déposés par un service tiers lors d&apos;un
            retrait : le rechargement empêche leur réutilisation par les scripts bloqués, mais
            leur effacement relève de chaque service.
          </p>
        </div>
      </section>

      <div className="mt-14">
        <Disclaimer />
      </div>
    </div>
  );
}
