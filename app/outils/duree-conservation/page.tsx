import type { Metadata } from "next";
import { Disclaimer, SectionTitle } from "@/components/primitives";
import RetentionCalculator from "@/components/tools/RetentionCalculator";

export const metadata: Metadata = {
  title: "Calculateur de durée de conservation RGPD",
  description:
    "Combien de temps conserver un cookie, un choix de consentement, un prospect, un client, un candidat, des images de vidéosurveillance ou des journaux de connexion ? Durée de référence, source CNIL ou légale exacte et date d'échéance calculée. Gratuit, dans votre navigateur.",
};

export default function RetentionPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <p className="tech text-[10px] text-accent">Outil libre</p>
      <h1 className="display mt-2 text-4xl text-ink-2">Calculateur de durée de conservation</h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">
        Choisissez le type de donnée, saisissez la date de départ : l&apos;outil donne la durée de
        référence, la date à laquelle la donnée doit être supprimée ou archivée, et le texte exact
        d&apos;où vient ce chiffre.
      </p>

      <div className="mt-4 max-w-3xl rounded-3xl border border-line bg-surface-low px-5 py-4 text-sm leading-relaxed text-muted">
        Le calcul se fait <strong className="text-ink-2">dans votre navigateur</strong>. Rien
        n&apos;est envoyé ni conservé, et aucune adresse e-mail n&apos;est demandée.
      </div>

      <RetentionCalculator />

      <section className="mt-16">
        <SectionTitle
          eyebrow="Lire le résultat"
          title="Plafond, obligation ou recommandation"
          description="Les durées n'ont pas toutes la même force. L'étiquette au-dessus du résultat le dit."
        />
        <ul className="grid max-w-4xl gap-4 text-[15px] leading-relaxed text-muted sm:grid-cols-2">
          <li className="rounded-3xl border border-line bg-surface p-5">
            <strong className="text-ink-2">Plafond légal.</strong> Un texte interdit d&apos;aller
            au-delà (vidéoprotection, par exemple).
          </li>
          <li className="rounded-3xl border border-line bg-surface p-5">
            <strong className="text-ink-2">Obligation légale de conservation.</strong> Un texte impose
            de conserver au moins cette durée ; la donnée passe alors en archivage intermédiaire, à
            accès restreint.
          </li>
          <li className="rounded-3xl border border-line bg-surface p-5">
            <strong className="text-ink-2">Référentiel ou recommandation CNIL.</strong> Non
            contraignant, mais c&apos;est la grille que la CNIL applique lors d&apos;un contrôle.
            S&apos;en écarter suppose de pouvoir le justifier.
          </li>
          <li className="rounded-3xl border border-line bg-surface p-5">
            <strong className="text-ink-2">Condition d&apos;exemption.</strong> Respecter la durée est
            l&apos;une des conditions pour se passer de consentement, pas une simple bonne pratique.
          </li>
        </ul>
      </section>

      <section className="mt-14">
        <SectionTitle eyebrow="Limites" title="Ce que ce calculateur ne remplace pas" />
        <div className="max-w-3xl space-y-4 text-[15px] leading-relaxed text-muted">
          <p>
            Le principe reste celui de l&apos;article 5, paragraphe 1, point e, du RGPD : les données
            ne sont pas conservées plus longtemps que nécessaire à la finalité. Les durées affichées
            sont des maximums de référence ; une durée plus courte est souvent possible, et un texte
            propre à votre secteur (santé, banque, assurance, secteur public) peut en imposer une
            autre.
          </p>
          <p>
            Chaque durée retenue doit figurer dans votre registre des traitements et dans
            l&apos;information donnée aux personnes (articles 13, 14 et 30 du RGPD). Les textes cités
            évoluent : vérifiez leur version en vigueur sur Légifrance et cnil.fr avant de vous y
            référer.
          </p>
        </div>
      </section>

      <div className="mt-14">
        <Disclaimer variant="short" />
      </div>
    </div>
  );
}
