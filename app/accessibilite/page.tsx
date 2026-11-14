import type { Metadata } from "next";
import Link from "next/link";
import { Article, LegalPage } from "@/components/Legal";
import { EDITOR } from "@/lib/disclaimer";

export const metadata: Metadata = {
  title: "Déclaration d'accessibilité",
  description:
    "Déclaration d'accessibilité du site Konsent : état de conformité au RGAA 4.1, non-conformités connues, contact et voies de recours.",
};

/**
 * Déclaration d'accessibilité — article 47 de la loi n° 2005-102 du
 * 11 février 2005, décret n° 2019-768, et modèle de déclaration du RGAA 4.1.
 *
 * L'état « partiellement conforme » est le seul qu'on puisse afficher sans
 * audit complet sur échantillon : annoncer « totalement conforme » sans taux
 * mesuré serait une affirmation que ce produit reprocherait à n'importe qui.
 */
const KBD =
  "rounded-md border border-line bg-surface-low px-1.5 py-0.5 font-mono text-[12px] text-ink-2";

/** Raccourcis réellement câblés : layout (évitement), CommandPalette, Header, ToolsMenu. */
const KEYS: [React.ReactNode, string][] = [
  [
    <>
      <kbd className={KBD}>Tab</kbd> / <kbd className={KBD}>Maj</kbd> + <kbd className={KBD}>Tab</kbd>
    </>,
    "Aller à l'élément suivant / précédent (lien, bouton, champ). Le focus est toujours visible.",
  ],
  [
    <>
      <kbd className={KBD}>Tab</kbd> en haut de page
    </>,
    "Faire apparaître les liens d'évitement : « Aller au contenu principal », « Aller à la navigation », « Aller au pied de page ».",
  ],
  [
    <kbd key="e" className={KBD}>Entrée</kbd>,
    "Suivre un lien, activer un bouton, envoyer un formulaire, choisir une proposition de la recherche.",
  ],
  [
    <kbd key="s" className={KBD}>Espace</kbd>,
    "Activer un bouton, cocher une case, déplier ou replier une section.",
  ],
  [
    <>
      <kbd className={KBD}>Ctrl</kbd> + <kbd className={KBD}>K</kbd> ou <kbd className={KBD}>⌘</kbd> +{" "}
      <kbd className={KBD}>K</kbd>
    </>,
    "Ouvrir ou fermer la recherche du site, depuis n'importe quelle page.",
  ],
  [<kbd key="sl" className={KBD}>/</kbd>, "Ouvrir la recherche du site (hors champ de saisie)."],
  [
    <kbd key="esc" className={KBD}>Échap</kbd>,
    "Fermer la recherche, une fenêtre de dialogue ou un menu ; le focus revient au bouton qui l'a ouvert.",
  ],
  [
    <>
      <kbd className={KBD}>↑</kbd> <kbd className={KBD}>↓</kbd>{" "}
      <kbd className={KBD}>Début</kbd> <kbd className={KBD}>Fin</kbd>
    </>,
    "Dans la recherche : parcourir les propositions, aller à la première ou à la dernière.",
  ],
  [
    <>
      <kbd className={KBD}>←</kbd> <kbd className={KBD}>→</kbd>
    </>,
    "En mode présentation du rapport : passer à la diapositive précédente ou suivante.",
  ],
];

export default function AccessibilityPage() {
  return (
    <LegalPage
      title="Déclaration d'accessibilité"
      updatedAt="2026-11-14"
      intro={
        <>
          {EDITOR.tradeName} s&apos;engage à rendre le site {EDITOR.product} accessible,
          conformément à l&apos;article 47 de la loi n° 2005-102 du 11 février 2005, au référentiel
          général d&apos;amélioration de l&apos;accessibilité (RGAA 4.1) et aux règles WCAG 2.2 de
          niveau AA. La présente déclaration s&apos;applique au site{" "}
          <strong>{EDITOR.productSite.replace("https://", "")}</strong>.
        </>
      }
    >
      <Article id="etat" number={1} heading="État de conformité">
        <p>
          Le site {EDITOR.product} est <strong>partiellement conforme</strong> avec le RGAA 4.1.
        </p>
        <p>
          Une auto-évaluation des 106 critères a été conduite le 14 novembre 2026 sur les pages
          principales du site. Les non-conformités relevées ont été corrigées dans la foulée ; un
          audit externe sur échantillon n&apos;a pas encore été réalisé. Le taux de conformité sera
          publié à son issue.
        </p>
      </Article>

      <Article id="realise" number={2} heading="Ce qui a été mis en place">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Lien d&apos;évitement vers le contenu principal, navigation entièrement au clavier.</li>
          <li>Focus toujours visible, y compris sur les bandes sombres et en thème sombre.</li>
          <li>Contrastes d&apos;au moins 4,5:1 pour le texte et 3:1 pour les composants.</li>
          <li>Liens identifiables autrement que par la couleur (soulignement).</li>
          <li>Formulaires étiquetés, champs obligatoires signalés, erreurs annoncées.</li>
          <li>
            Animations arrêtables (bouton de pause) et désactivées si le système demande un
            mouvement réduit.
          </li>
          <li>Tableaux de données avec titre et en-têtes associés.</li>
          <li>Thème clair, sombre ou système au choix, sans perte d&apos;information.</li>
          <li>Plan du site, en second système de navigation.</li>
          <li>
            Animation de la page d&apos;accueil doublée d&apos;une description textuelle
            dépliable.
          </li>
        </ul>
      </Article>

      <Article id="clavier" number={3} heading="Naviguer au clavier">
        <p>
          Tout le site s&apos;utilise sans souris. Les raccourcis ci-dessous sont ceux du
          navigateur et ceux propres à {EDITOR.product} ; aucun ne remplace une commande
          accessible autrement.
        </p>
        <div className="overflow-x-auto rounded-xl ring-1 ring-line">
          <table className="w-full border-collapse text-left text-[14px]">
            <caption className="sr-only">Raccourcis clavier du site {EDITOR.product}</caption>
            <thead className="bg-surface-low">
              <tr>
                <th scope="col" className="tech px-4 py-2.5 text-[10px] text-muted">
                  Touches
                </th>
                <th scope="col" className="tech px-4 py-2.5 text-[10px] text-muted">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {KEYS.map(([keys, action]) => (
                <tr key={action} className="border-t border-line align-top">
                  <th scope="row" className="whitespace-nowrap px-4 py-2.5 font-semibold text-ink-2">
                    {keys}
                  </th>
                  <td className="px-4 py-2.5 text-ink-2">{action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Sur macOS, la touche <kbd className={KBD}>⌘</kbd> (Commande) remplace{" "}
          <kbd className={KBD}>Ctrl</kbd>. La touche <kbd className={KBD}>/</kbd> n&apos;agit pas
          quand le curseur est dans un champ de saisie.
        </p>
      </Article>

      <Article id="affichage" number={4} heading="Adapter l'affichage">
        <p>
          Le pied de page de chaque page propose une rubrique <strong>Affichage</strong>. Les
          réglages sont conservés sur votre appareil et s&apos;appliquent à tout le site :
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Taille du texte</strong> : normale (A), agrandie (A+) ou très agrandie (A++).
          </li>
          <li>
            <strong>Contraste</strong> : normal ou renforcé (textes secondaires et filets plus
            marqués, liens toujours soulignés).
          </li>
          <li>
            <strong>Animations</strong> : selon le réglage du système, ou réduites sur ce site
            seulement, quel que soit ce réglage.
          </li>
        </ul>
        <p>
          Une{" "}
          <Link href="/facile-a-lire" className="text-flame">
            version facile à lire
          </Link>{" "}
          présente {EDITOR.product} en phrases courtes et en mots simples, avec des images.
        </p>
      </Article>

      <Article id="non-accessible" number={5} heading="Contenus non accessibles">
        <p>Les points suivants restent à traiter ou à vérifier par un audit externe :</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Rapports d&apos;analyse générés : leur structure dépend du site analysé et n&apos;a
            été vérifiée que sur des cas types.
          </li>
          <li>
            Documents générés à télécharger (modèles de registre et de politique) : leur
            accessibilité dans les logiciels de bureautique n&apos;a pas été évaluée.
          </li>
          <li>
            Codes QR de la carte de contact : chaque code est doublé de son adresse en clair, mais
            leur lecture dépend de l&apos;appareil de l&apos;utilisateur.
          </li>
        </ul>
      </Article>

      <Article id="environnement" number={6} heading="Établissement de cette déclaration">
        <p>
          Technologies utilisées : HTML5, CSS, JavaScript (Next.js, React), SVG. Vérifications
          effectuées au clavier, avec les outils de développement des navigateurs Chromium et
          Firefox, et par lecture du code source rendu.
        </p>
        <p>
          Pages évaluées : accueil, rapport d&apos;analyse, tarifs, fonctionnalités, outils,
          connexion, contact, mentions légales, CGU, CGV, politique de confidentialité, index des
          cookies.
        </p>
      </Article>

      <Article id="eaa" number={7} heading="Acte européen sur l'accessibilité">
        <p>
          La directive (UE) 2019/882 (« European Accessibility Act »), transposée par
          l&apos;ordonnance n° 2023-859 du 6 septembre 2023, s&apos;applique depuis le 28 juin 2025
          aux services numériques fournis aux consommateurs. Les microentreprises prestataires de
          services en sont exemptées ; {EDITOR.tradeName} applique néanmoins volontairement les
          exigences de l&apos;annexe I et les normes harmonisées (EN 301 549, WCAG 2.2 AA).
        </p>
        <p>
          Informations sur le service : {EDITOR.product} est un service d&apos;analyse technique en
          ligne, utilisable sans compte, au clavier et avec les technologies d&apos;assistance
          courantes. Ses résultats sont restitués en texte structuré, imprimable, et ne reposent
          jamais sur la seule couleur.
        </p>
      </Article>

      <Article id="contact" number={8} heading="Retour d'information et contact">
        <p>
          Si vous ne parvenez pas à accéder à un contenu ou à un service, contactez-nous pour être
          orienté vers une alternative accessible ou obtenir le contenu sous une autre forme :
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            par courriel :{" "}
            <a href={`mailto:${EDITOR.email}`} className="text-flame">
              {EDITOR.email}
            </a>
          </li>
          <li>
            par téléphone :{" "}
            <a href={`tel:${EDITOR.phoneE164}`} className="text-flame">
              {EDITOR.phone}
            </a>
          </li>
          <li>
            par le{" "}
            <a href="/contact" className="text-flame">
              formulaire de contact
            </a>
          </li>
          <li>
            par courrier : {EDITOR.tradeName}, {EDITOR.street}, {EDITOR.postalCode} {EDITOR.city}
          </li>
        </ul>
        <p>Nous nous engageons à répondre sous sept jours ouvrés.</p>
      </Article>

      <Article id="recours" number={9} heading="Voies de recours">
        <p>
          Si vous nous avez signalé un défaut d&apos;accessibilité qui vous empêche d&apos;accéder à
          un contenu ou à un service et que vous n&apos;avez pas obtenu de réponse satisfaisante,
          vous pouvez saisir le Défenseur des droits :
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            par le{" "}
            <a
              href="https://formulaire.defenseurdesdroits.fr/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-flame"
            >
              formulaire en ligne<span className="sr-only"> (nouvel onglet)</span>
            </a>
          </li>
          <li>
            en contactant le{" "}
            <a
              href="https://www.defenseurdesdroits.fr/carte-des-delegues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-flame"
            >
              délégué du Défenseur des droits de votre région
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
          </li>
          <li>par téléphone au 09 69 39 00 00</li>
          <li>
            par courrier, gratuitement et sans affranchissement : Défenseur des droits, Libre
            réponse 71120, 75342 Paris CEDEX 07
          </li>
        </ul>
      </Article>
    </LegalPage>
  );
}
