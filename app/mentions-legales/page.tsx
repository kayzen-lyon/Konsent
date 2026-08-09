import type { Metadata } from "next";
import { Article, EditorIdentity, LegalPage } from "@/components/Legal";
import { EDITOR } from "@/lib/disclaimer";

export const metadata: Metadata = {
  title: "Mentions légales",
  description:
    "Éditeur, directeur de la publication, hébergeur et propriété intellectuelle du site Konsent, édité par KAYZEN LYON SASU.",
};

/**
 * Mentions légales — article 6-III de la LCEN.
 *
 * Obligation DISTINCTE du RGPD, et sanctionnable pour elle-même : l'article
 * 6-VI de la LCEN prévoit un an d'emprisonnement et 75 000 € d'amende pour la
 * personne physique. Beaucoup de sites la traitent comme un accessoire de la
 * politique de confidentialité ; ce sont deux textes différents, pour deux
 * finalités différentes.
 */
export default function LegalNoticePage() {
  return (
    <LegalPage
      title="Mentions légales"
      updatedAt="2026-08-09"
      intro={
        <>
          Les informations ci-dessous sont publiées en application de l&apos;article 6-III de la loi
          n° 2004-575 du 21 juin 2004 pour la confiance dans l&apos;économie numérique.
        </>
      }
    >
      <Article id="editeur" heading="Éditeur du site">
        <EditorIdentity />
      </Article>

      <Article id="publication" heading="Directeur de la publication">
        <p>
          [[À COMPLÉTER : nom et prénom du président de la SASU]], en qualité de président de{" "}
          {EDITOR.legalName}.
        </p>
        <p className="text-[14px] text-muted">
          L&apos;article 6-III-1 de la LCEN exige le nom du directeur de la publication, pas
          seulement sa qualité. Mentionner « le représentant légal » sans le nommer ne satisfait pas
          l&apos;obligation.
        </p>
      </Article>

      <Article id="hebergement" heading="Hébergeur">
        <p>
          Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis —{" "}
          <a
            href="https://vercel.com"
            className="text-flame hover:underline"
            rel="noopener noreferrer nofollow"
            target="_blank"
          >
            vercel.com
          </a>
        </p>
        <p>
          Les fonctions du site sont exécutées dans la région <code className="font-mono">cdg1</code>{" "}
          (Paris) et la base de données est hébergée par Supabase en région{" "}
          <code className="font-mono">eu-west-3</code> (Paris).
        </p>
        <p className="text-[14px] text-muted">
          Vercel Inc. est une société de droit américain. Ce point est mentionné parce que le
          présent site relève précisément les rattachements capitalistiques hors Union européenne
          chez les autres : le taire ici serait incohérent.
        </p>
      </Article>

      <Article id="conception" heading="Conception et réalisation">
        <p>
          Site conçu et réalisé par {EDITOR.agencyName} —{" "}
          <a href={EDITOR.agencySite} className="text-flame hover:underline" rel="noopener">
            {EDITOR.agencySite.replace("https://", "")}
          </a>
        </p>
      </Article>

      <Article id="nature" heading="Nature du service">
        <p>
          {EDITOR.product} est un outil d&apos;analyse technique automatisée. Il ne constitue ni un
          audit juridique, ni une consultation juridique, ni une certification de conformité.
        </p>
        <p>
          Les résultats reposent sur l&apos;observation du comportement d&apos;un client automatisé
          à un instant donné et dans une configuration donnée. Seule la CNIL ou une juridiction peut
          qualifier juridiquement une situation au regard du règlement (UE) 2016/679 et de la loi
          n° 78-17 du 6 janvier 1978 modifiée.
        </p>
      </Article>

      <Article id="propriete" heading="Propriété intellectuelle">
        <p>
          Le référentiel de règles, la base de connaissance des destinataires, les gabarits
          documentaires et l&apos;ensemble des contenus éditoriaux sont la propriété de{" "}
          {EDITOR.legalName}, protégés au titre du livre I du code de la propriété intellectuelle.
        </p>
        <p>
          Les marques, dénominations sociales et noms de services cités le sont à des fins
          d&apos;identification technique, au titre de la référence nécessaire. Ils demeurent la
          propriété de leurs titulaires respectifs, et leur mention n&apos;emporte ni affiliation,
          ni approbation, ni partenariat.
        </p>
      </Article>

      <Article id="responsabilite" heading="Limitation de responsabilité">
        <p>
          {EDITOR.legalName} met en œuvre les moyens raisonnables pour assurer l&apos;exactitude des
          informations diffusées, sans pouvoir en garantir l&apos;exhaustivité. Le cadre applicable
          aux traceurs évolue, et les références réglementaires doivent être vérifiées à leur source
          officielle.
        </p>
        <p>
          Les liens vers des sites tiers sont fournis à titre documentaire.{" "}
          {EDITOR.legalName} n&apos;exerce aucun contrôle sur leur contenu et décline toute
          responsabilité à leur égard.
        </p>
      </Article>

      <Article id="signalement" heading="Signalement de contenu">
        <p>
          Tout contenu jugé illicite peut être signalé à l&apos;adresse{" "}
          <a href={`mailto:${EDITOR.email}`} className="text-flame hover:underline">
            {EDITOR.email}
          </a>
          . Conformément à l&apos;article 6-I-5 de la LCEN, le signalement doit préciser la date, la
          description des faits litigieux, leur localisation précise et les motifs pour lesquels le
          contenu devrait être retiré.
        </p>
      </Article>

      <Article id="droit" heading="Droit applicable">
        <p>
          Le présent site est soumis au droit français. Tout litige relatif à son utilisation relève
          de la compétence des tribunaux français, sous réserve des règles de compétence
          impératives applicables aux consommateurs.
        </p>
      </Article>
    </LegalPage>
  );
}
