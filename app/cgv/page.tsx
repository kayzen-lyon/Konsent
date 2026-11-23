import type { Metadata } from "next";
import Link from "next/link";
import { Article, LegalPage, PendingReview } from "@/components/Legal";
import { ALL_FEATURES_FREE, PLANS } from "@/lib/billing/plans";
import { isSellable } from "@/lib/billing/readiness";
import { EDITOR } from "@/lib/disclaimer";

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  description:
    "Tarifs, souscription, paiement, durée, résiliation et droit de rétractation des abonnements Konsent.",
};

const paidPlans = PLANS.filter((p) => p.amountCents !== null);

/**
 * CGV — vente d'abonnements à distance.
 *
 * Le point délicat est la RÉTRACTATION. L'article L221-18 du code de la
 * consommation ouvre quatorze jours au consommateur ; l'article L221-3
 * l'étend au professionnel employant cinq salariés au plus lorsque l'objet du
 * contrat n'entre pas dans le champ de son activité principale.
 *
 * Un service d'audit RGPD vendu à une TPE tombe très souvent dans ce second
 * cas. Écrire « service réservé aux professionnels, pas de rétractation »
 * serait donc inexact pour une part importante des acheteurs — et une clause
 * de ce type est réputée non écrite.
 */
export default function SalesTermsPage() {
  return (
    <LegalPage
      title="Conditions générales de vente"
      updatedAt="2026-08-09"
      intro={
        <>
          <PendingReview />
          {ALL_FEATURES_FREE ? (
            <p className="mt-4 rounded-lg border border-line bg-surface p-4 text-ink-2">
              <strong>{EDITOR.product} est aujourd&apos;hui entièrement gratuit</strong> : aucune
              offre n&apos;est en vente et aucun paiement n&apos;est demandé. Les conditions
              ci-dessous ne s&apos;appliqueraient qu&apos;à une éventuelle offre payante future.
            </p>
          ) : null}
          <p className="mt-4">
            Les présentes conditions régissent la <strong>vente</strong> des abonnements{" "}
            {EDITOR.product}. L&apos;usage du service, y compris gratuit, relève des{" "}
            <Link href="/cgu" className="text-flame hover:underline">
              conditions générales d&apos;utilisation
            </Link>
            .
          </p>
        </>
      }
    >
      <Article id="vendeur" number={1} heading="Identité du vendeur">
        <p>
          {EDITOR.legalName} ({EDITOR.tradeName}), {EDITOR.legalForm}, SIREN {EDITOR.siren},
          SIRET {EDITOR.siret}, {EDITOR.vatMention}, dont le siège social est situé {EDITOR.street}, {EDITOR.postalCode}{" "}
          {EDITOR.city}.
        </p>
        <p>
          Téléphone :{" "}
          <a href={`tel:${EDITOR.phoneE164}`} className="text-flame hover:underline">
            {EDITOR.phone}
          </a>{" "}
          — Courriel :{" "}
          <a href={`mailto:${EDITOR.email}`} className="text-flame hover:underline">
            {EDITOR.email}
          </a>
        </p>
      </Article>

      <Article id="offres" number={2} heading="Offres et prix">
        <p>
          Les prix sont exprimés <strong>en euros, nets de taxes</strong> : l&apos;éditeur relève de
          la franchise en base de TVA ({EDITOR.vatMention}), aucune TVA n&apos;est donc facturée. Les abonnements sont mensuels et sans engagement
          de durée.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[14px]">
            <caption className="sr-only">Tarifs des abonnements Konsent</caption>
            <thead>
              <tr className="border-b border-line text-left">
                <th scope="col" className="tech py-2 text-[10px] text-muted">
                  Offre
                </th>
                <th scope="col" className="tech py-2 text-[10px] text-muted">
                  Prix mensuel net
                </th>
                <th scope="col" className="tech py-2 text-[10px] text-muted">
                  Souscription
                </th>
              </tr>
            </thead>
            <tbody>
              {paidPlans.map((plan) => {
                const sellable = isSellable(plan.id);
                return (
                  <tr key={plan.id} className="border-b border-line">
                    <th scope="row" className="py-2.5 text-left font-medium text-ink-2">
                      {plan.name}
                    </th>
                    <td className="tabular py-2.5">{(plan.amountCents! / 100).toFixed(2)} €</td>
                    <td className="py-2.5">
                      {sellable ? (
                        "ouverte"
                      ) : (
                        <span className="text-warn">
                          {ALL_FEATURES_FREE
                            ? "fermée — le service est gratuit"
                            : "fermée — promesses non encore tenues"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[14px] text-muted">
          Une offre dont une fonctionnalité annoncée n&apos;est pas encore livrée n&apos;est pas
          ouverte à la souscription. Le tableau ci-dessus est produit à partir de l&apos;état réel
          du service, et non d&apos;une page commerciale tenue à part.
        </p>
      </Article>

      <Article id="commande" number={3} heading="Souscription">
        <p>
          La souscription s&apos;effectue en ligne. Avant validation, le client prend connaissance
          du détail de l&apos;offre, de son prix et des présentes conditions, qu&apos;il accepte
          expressément.
        </p>
        <p>
          La commande est ferme à compter de la confirmation du paiement. Un courriel de
          confirmation récapitulant l&apos;offre souscrite est adressé au client.
        </p>
      </Article>

      <Article id="paiement" number={4} heading="Paiement">
        <p>
          Le paiement s&apos;effectue par carte bancaire, par l&apos;intermédiaire du prestataire{" "}
          <strong>Stripe Payments Europe, Ltd.</strong> {EDITOR.legalName} n&apos;a accès à aucune
          donnée de carte bancaire, qui ne transite ni ne réside sur ses serveurs.
        </p>
        <p>
          L&apos;abonnement est prélevé mensuellement d&apos;avance, à date anniversaire. En cas
          d&apos;échec de paiement, l&apos;accès aux fonctions payantes est suspendu après relance
          restée sans effet, sans que cela emporte résiliation immédiate.
        </p>
        <p>
          Conformément à l&apos;article L441-10 du code de commerce, tout retard de paiement d&apos;un
          client professionnel entraîne de plein droit des pénalités au taux d&apos;intérêt de la
          Banque centrale européenne majoré de dix points, ainsi qu&apos;une indemnité forfaitaire
          de recouvrement de 40 €.
        </p>
      </Article>

      <Article id="duree" number={5} heading="Durée et résiliation">
        <p>
          L&apos;abonnement est conclu pour un mois, reconduit tacitement par périodes d&apos;un
          mois. Il peut être résilié à tout moment depuis l&apos;espace client, la résiliation
          prenant effet au terme de la période en cours déjà réglée.
        </p>
        <p>
          Aucun remboursement au prorata n&apos;est dû pour la période entamée, le service ayant
          été rendu disponible sur toute cette période.
        </p>
        <p>
          {EDITOR.legalName} peut résilier l&apos;abonnement en cas de manquement grave aux{" "}
          <Link href="/cgu" className="text-flame hover:underline">
            conditions d&apos;utilisation
          </Link>
          , après mise en demeure restée sans effet pendant quinze jours, sauf usage manifestement
          abusif justifiant une suspension immédiate.
        </p>
      </Article>

      <Article id="retractation" number={6} heading="Droit de rétractation">
        <p>
          <strong>Qui en bénéficie.</strong> Le droit de rétractation de quatorze jours prévu à
          l&apos;article L221-18 du code de la consommation s&apos;applique au consommateur. En
          application de l&apos;article L221-3 du même code, il bénéficie également au
          professionnel dont l&apos;objet du contrat n&apos;entre pas dans le champ de son activité
          principale <strong>et</strong> qui emploie cinq salariés au plus.
        </p>
        <p>
          <strong>Délai et exercice.</strong> Le délai court à compter de la conclusion du contrat.
          La rétractation s&apos;exerce sans motif ni pénalité, par déclaration dénuée
          d&apos;ambiguïté adressée à{" "}
          <a href={`mailto:${EDITOR.email}`} className="text-flame hover:underline">
            {EDITOR.email}
          </a>
          .
        </p>
        <p>
          <strong>Exécution avant la fin du délai.</strong> Le service étant accessible
          immédiatement, le client qui souhaite en disposer sans attendre demande expressément son
          exécution anticipée. Il reste alors redevable du montant correspondant au service
          effectivement fourni jusqu&apos;à sa rétractation, au prorata du prix total, conformément
          à l&apos;article L221-25.
        </p>
        <p>
          <strong>Remboursement.</strong> Les sommes dues sont remboursées au plus tard quatorze
          jours après réception de la déclaration, par le même moyen de paiement que celui utilisé
          lors de la commande.
        </p>
        <p className="text-[14px] text-muted">
          Aucune clause des présentes ne peut priver un client éligible de ce droit : une telle
          clause serait réputée non écrite.
        </p>
      </Article>

      <Article id="garanties" number={7} heading="Conformité du service numérique">
        <p>
          Conformément aux articles L224-25-12 et suivants du code de la consommation,{" "}
          {EDITOR.legalName} est tenue de fournir un service numérique conforme au contrat et
          répond des défauts de conformité existant lors de la fourniture.
        </p>
        <p>
          Le client consommateur dispose d&apos;un délai de deux ans à compter de la fourniture pour
          obtenir la mise en conformité, sans frais et sans inconvénient majeur.
        </p>
      </Article>

      <Article id="reclamation" number={8} heading="Réclamation et médiation">
        <p>
          Toute réclamation est adressée à{" "}
          <a href={`mailto:${EDITOR.email}`} className="text-flame hover:underline">
            {EDITOR.email}
          </a>
          . {EDITOR.legalName} s&apos;engage à en accuser réception sous cinq jours ouvrés.
        </p>
        <p>
          Conformément à l&apos;article L612-1 du code de la consommation, le client consommateur
          peut recourir gratuitement à un médiateur de la consommation en vue de la résolution
          amiable d&apos;un litige, après avoir tenté de le résoudre directement.
        </p>
        <p>
          Médiateur désigné : [[À COMPLÉTER : dénomination, adresse postale et adresse du site du
          médiateur de la consommation auquel l&apos;entreprise adhère]]
        </p>
        <p className="text-[14px] text-muted">
          L&apos;adhésion à un dispositif de médiation est une obligation légale pour tout
          professionnel vendant à des consommateurs. Ce champ ne peut pas être deviné : il suppose
          une adhésion effective, sans quoi la mention serait fausse.
        </p>
        <p>
          Plateforme européenne de règlement en ligne des litiges :{" "}
          <a
            href="https://ec.europa.eu/consumers/odr"
            className="text-flame hover:underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            ec.europa.eu/consumers/odr
          </a>
        </p>
      </Article>

      <Article id="donnees" number={9} heading="Données personnelles et sous-traitance">
        <p>
          Le traitement des données du client est décrit dans la{" "}
          <Link href="/confidentialite" className="text-flame hover:underline">
            politique de confidentialité
          </Link>
          .
        </p>
        <p>
          Lorsque {EDITOR.legalName} traite des données pour le compte du client dans le cadre du
          service, elle agit en qualité de <strong>sous-traitant</strong> au sens de
          l&apos;article 28 du RGPD. Un contrat de sous-traitance est mis à disposition sur demande
          et fait partie intégrante du contrat.
        </p>
      </Article>

      <Article id="droit" number={10} heading="Droit applicable et juridiction">
        <p>
          Les présentes conditions sont soumises au droit français, y compris lorsque le client est
          établi hors de France, sans que ce choix puisse priver un consommateur de la protection
          des dispositions impératives de la loi de sa résidence habituelle.
        </p>
        <p>
          À défaut de résolution amiable, le litige relève des tribunaux du ressort du siège social
          de {EDITOR.legalName} pour les clients professionnels, et des règles de compétence de
          droit commun pour les consommateurs.
        </p>
      </Article>
    </LegalPage>
  );
}
