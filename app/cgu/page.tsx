import type { Metadata } from "next";
import Link from "next/link";
import { Article, LegalPage, PendingReview } from "@/components/Legal";
import { EDITOR } from "@/lib/disclaimer";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation",
  description:
    "Conditions d'accès et d'usage du service Konsent : périmètre de l'analyse, règles de scan d'un domaine tiers, propriété des résultats, responsabilité.",
};

/**
 * CGU — le contrat d'USAGE, distinct des CGV qui régissent la VENTE.
 *
 * Les confondre est l'erreur la plus courante : un visiteur qui lance une
 * analyse gratuite n'achète rien, mais il utilise un service, et cet usage
 * doit être encadré — notamment parce qu'il consiste à faire analyser un site
 * qui n'est pas toujours le sien.
 */
export default function TermsOfUsePage() {
  return (
    <LegalPage
      title="Conditions générales d'utilisation"
      updatedAt="2026-08-09"
      intro={
        <>
          <PendingReview />
          <p className="mt-4">
            Les présentes conditions régissent l&apos;<strong>accès et l&apos;usage</strong> du
            service {EDITOR.product}. Les conditions de <strong>vente</strong> des abonnements font
            l&apos;objet d&apos;un document distinct :{" "}
            <Link href="/cgv" className="text-flame hover:underline">
              conditions générales de vente
            </Link>
            .
          </p>
        </>
      }
    >
      <Article id="objet" number={1} heading="Objet">
        <p>
          {EDITOR.product} est un service d&apos;analyse technique automatisée qui observe le
          comportement d&apos;un site web au regard des règles relatives aux traceurs et à
          l&apos;information des personnes, et produit un rapport de constats.
        </p>
        <p>
          L&apos;utilisation du service emporte acceptation pleine et entière des présentes
          conditions. L&apos;utilisateur qui ne les accepte pas doit renoncer à l&apos;usage du
          service.
        </p>
      </Article>

      <Article id="acces" number={2} heading="Accès au service">
        <p>
          L&apos;analyse d&apos;une page d&apos;accueil est accessible <strong>sans compte, sans
          adresse électronique et sans paiement</strong>. Aucun résultat n&apos;est conservé dans ce
          mode.
        </p>
        <p>
          Les fonctions de surveillance planifiée, de conservation d&apos;historique et
          d&apos;espace client supposent la création d&apos;un compte, laquelle s&apos;effectue par
          lien à usage unique envoyé à une adresse électronique. Aucun mot de passe n&apos;est créé
          ni conservé.
        </p>
        <p>
          Le service est fourni sans garantie de disponibilité continue. Des interruptions peuvent
          survenir pour maintenance, mise à jour du référentiel ou cause extérieure.
        </p>
      </Article>

      <Article id="perimetre" number={3} heading="Périmètre et limites de l'analyse">
        <p>
          L&apos;analyse porte sur ce qu&apos;un client automatisé peut observer publiquement à un
          instant donné. Elle ne se substitue ni à un audit juridique, ni à une consultation, ni à
          une certification.
        </p>
        <p>
          Toute règle que le moteur n&apos;a pas pu vérifier est signalée comme{" "}
          <strong>non évaluée</strong> dans le rapport. Une règle non évaluée n&apos;est jamais
          présentée comme satisfaite, et l&apos;absence de constat ne vaut pas conformité.
        </p>
        <p>
          Les documents générés sont des <strong>modèles</strong> à personnaliser. Ils comportent
          des champs explicitement non renseignés, que l&apos;utilisateur doit compléter, et doivent
          être validés par un professionnel du droit avant toute publication ou signature.
        </p>
      </Article>

      <Article id="tiers" number={4} heading="Analyse d'un domaine dont l'utilisateur n'est pas titulaire">
        <p>
          L&apos;analyse d&apos;une page publique consiste à la consulter comme le ferait un
          navigateur ordinaire. Elle est à ce titre ouverte, y compris sur un domaine dont
          l&apos;utilisateur n&apos;est pas titulaire.
        </p>
        <p>
          En revanche, <strong>la surveillance planifiée et la conservation d&apos;un historique
          exigent une preuve de maîtrise du domaine</strong>, apportée par enregistrement DNS TXT ou
          par dépôt d&apos;un fichier sous <code className="font-mono">/.well-known/</code>. Sans
          cette preuve, aucune analyse n&apos;est planifiée et aucune donnée n&apos;est conservée.
        </p>
        <p>Le robot d&apos;analyse :</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            s&apos;identifie sous le user-agent <code className="font-mono">KonsentBot/1.0</code>,
            avec un lien vers la page{" "}
            <Link href="/bot" className="text-flame hover:underline">
              /bot
            </Link>{" "}
            qui décrit son comportement ;
          </li>
          <li>ne tente aucune authentification et ne contourne aucun pare-feu applicatif ;</li>
          <li>n&apos;effectue aucune écriture sur le site analysé ;</li>
          <li>limite sa cadence de requêtes pour ne pas peser sur le service analysé.</li>
        </ul>
        <p>
          L&apos;utilisateur s&apos;interdit d&apos;employer le service pour nuire à un tiers,
          notamment par des analyses répétées destinées à saturer un site, ou par la diffusion
          d&apos;un rapport présenté comme un constat d&apos;infraction.
        </p>
      </Article>

      <Article id="usage" number={5} heading="Usage loyal">
        <p>L&apos;utilisateur s&apos;interdit :</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            de contourner les limitations techniques du service, notamment les quotas attachés à une
            clé d&apos;API ;
          </li>
          <li>
            d&apos;extraire ou de réutiliser de manière systématique le référentiel de règles ou la
            base des destinataires en vue de constituer une base concurrente, au sens de
            l&apos;article L342-1 du code de la propriété intellectuelle ;
          </li>
          <li>
            de présenter un rapport {EDITOR.product} comme une décision d&apos;autorité, une mise en
            demeure ou une certification.
          </li>
        </ul>
        <p>
          Une clé d&apos;API est personnelle à l&apos;organisation à laquelle elle est délivrée.
          Sa divulgation engage la responsabilité de son titulaire jusqu&apos;à sa révocation.
        </p>
      </Article>

      <Article id="donnees" number={6} heading="Données personnelles">
        <p>
          Le traitement des données personnelles est décrit dans la{" "}
          <Link href="/confidentialite" className="text-flame hover:underline">
            politique de confidentialité
          </Link>
          , qui fait partie intégrante des présentes conditions.
        </p>
        <p>
          L&apos;analyse observe des <strong>sites</strong>, non leurs visiteurs. Elle ne collecte
          aucune donnée relative aux utilisateurs finaux du site analysé.
        </p>
      </Article>

      <Article id="propriete" number={7} heading="Propriété des résultats">
        <p>
          Les constats produits pour un domaine appartiennent à l&apos;utilisateur qui a demandé
          l&apos;analyse, qui peut les exploiter, les diffuser et les communiquer librement, y
          compris à des fins commerciales.
        </p>
        <p>
          Le référentiel de règles, la base des destinataires et les gabarits documentaires
          demeurent la propriété de {EDITOR.legalName}, et sont concédés en usage pour la seule
          durée d&apos;utilisation du service.
        </p>
      </Article>

      <Article id="responsabilite" number={8} heading="Responsabilité">
        <p>
          {EDITOR.legalName} est tenue d&apos;une obligation de moyens. Sa responsabilité ne saurait
          être engagée :
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            à raison d&apos;une décision prise sur la base d&apos;un rapport sans validation par un
            professionnel du droit ;
          </li>
          <li>
            à raison de la publication d&apos;un document généré sans personnalisation ni
            validation préalable ;
          </li>
          <li>
            à raison d&apos;un dommage résultant d&apos;une indisponibilité du service ou du site
            analysé.
          </li>
        </ul>
        <p>
          Aucune clause des présentes ne limite la responsabilité de {EDITOR.legalName} en cas de
          faute lourde, de dol, ou de dommage corporel.
        </p>
      </Article>

      <Article id="evolution" number={9} heading="Évolution du service et des conditions">
        <p>
          Le référentiel de règles évolue avec le cadre applicable. Un même site peut donc obtenir
          des résultats différents à deux dates distinctes sans avoir changé : le rapport indique la
          version du référentiel utilisée, et le comparatif signale explicitement une comparaison
          entre deux versions.
        </p>
        <p>
          Les présentes conditions peuvent être modifiées. La version applicable est celle en ligne
          au jour de l&apos;utilisation, la date de mise à jour figurant en tête de page.
        </p>
      </Article>

      <Article id="droit" number={10} heading="Droit applicable et litiges">
        <p>
          Les présentes conditions sont soumises au droit français. En cas de litige, les parties
          rechercheront une solution amiable avant toute action contentieuse.
        </p>
        <p>
          À défaut d&apos;accord, le litige relève des tribunaux français compétents, sous réserve
          des règles impératives protectrices du consommateur.
        </p>
      </Article>
    </LegalPage>
  );
}
