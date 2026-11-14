import type { Metadata } from "next";
import { Article, LegalPage } from "@/components/Legal";
import { EDITOR } from "@/lib/disclaimer";

export const metadata: Metadata = {
  title: "Signaler une vulnérabilité",
  description:
    "Programme de divulgation responsable de Konsent : périmètre, règles de bonne foi, engagements de l'éditeur et contact sécurité.",
  alternates: { canonical: "/securite" },
};

/**
 * Programme de divulgation responsable — cible du champ `Policy:` de
 * /.well-known/security.txt (RFC 9116).
 *
 * Les engagements sont ceux de l'éditeur et rien de plus : pas de prime
 * promise, pas d'immunité qu'il n'a pas le pouvoir d'accorder (le parquet
 * reste libre de ses poursuites ; seul le renoncement de l'éditeur à porter
 * plainte dépend de lui).
 */

const host = EDITOR.productSite.replace("https://", "");

export default function SecurityPolicyPage() {
  return (
    <LegalPage
      title="Signaler une vulnérabilité"
      updatedAt="2026-11-14"
      intro={
        <>
          {EDITOR.product} examine la sécurité et la conformité des sites des autres ; il doit
          pouvoir être examiné lui aussi. Si vous pensez avoir trouvé une faille, écrivez-nous :
          nous préférons l&apos;apprendre de vous plutôt que d&apos;un incident. Cette page décrit
          ce que vous pouvez tester, comment, et ce à quoi {EDITOR.tradeName} s&apos;engage en
          retour.
        </>
      }
    >
      <Article id="signaler" number={1} heading="Comment signaler">
        <p>
          Écrivez à{" "}
          <a href={`mailto:${EDITOR.email}?subject=S%C3%A9curit%C3%A9%20%E2%80%94%20signalement`} className="text-flame">
            {EDITOR.email}
          </a>{" "}
          en indiquant « Sécurité » dans l&apos;objet. Les mêmes coordonnées figurent dans le
          fichier{" "}
          <a href="/.well-known/security.txt" className="text-flame">
            security.txt
          </a>{" "}
          du site.
        </p>
        <p>Pour que nous puissions reproduire le problème, précisez si possible :</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>l&apos;adresse ou le point d&apos;API concerné ;</li>
          <li>les étapes de reproduction et, le cas échéant, une preuve de concept minimale ;</li>
          <li>l&apos;impact que vous estimez possible ;</li>
          <li>la manière dont vous souhaitez être cité, ou non.</li>
        </ul>
        <p>
          Nous ne publions pas de clé de chiffrement. N&apos;incluez dans votre message aucune
          donnée personnelle d&apos;un tiers : décrivez-la plutôt que de la recopier.
        </p>
      </Article>

      <Article id="perimetre" number={2} heading="Périmètre">
        <p>Sont dans le périmètre :</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            le site <strong>{host}</strong> et ses pages ;
          </li>
          <li>
            ses API, sous <strong>{host}/api/</strong>, y compris l&apos;API publique
            d&apos;analyse ;
          </li>
          <li>l&apos;espace client, la connexion et la gestion des comptes.</li>
        </ul>
        <p>Sont hors périmètre :</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>les attaques par déni de service ou par saturation, quelle qu&apos;en soit la forme ;</li>
          <li>
            l&apos;ingénierie sociale (hameçonnage, appels, usurpation) visant {EDITOR.tradeName},
            ses prestataires ou ses clients, et toute intrusion physique ;
          </li>
          <li>
            les tests automatisés massifs (scanners lancés en rafale, force brute, énumération à
            grande échelle) ;
          </li>
          <li>
            les sites tiers, y compris les sites analysés par {EDITOR.product} et les
            prestataires d&apos;hébergement, de base de données ou d&apos;envoi de courriels :
            signalez-leur directement ce qui les concerne.
          </li>
        </ul>
      </Article>

      <Article id="regles" number={3} heading="Règles de bonne foi">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Utilisez vos propres comptes ; n&apos;accédez pas aux données d&apos;autrui au-delà de
            ce qui est strictement nécessaire pour démontrer le problème.
          </li>
          <li>
            Si vous atteignez des données personnelles, arrêtez-vous, ne les conservez pas et
            signalez-le-nous sans délai.
          </li>
          <li>
            Ne modifiez, ne supprimez et ne chiffrez aucune donnée ; ne dégradez pas le service
            pour les autres utilisateurs.
          </li>
          <li>
            N&apos;exploitez pas la faille au-delà de la preuve de concept et ne la partagez avec
            personne avant sa correction.
          </li>
          <li>
            Laissez-nous un délai raisonnable de correction avant toute publication ; nous
            convenons ensemble de la date, 90 jours au plus après votre signalement sauf accord
            contraire.
          </li>
          <li>Respectez la loi française, en dehors de ce que ces règles autorisent.</li>
        </ul>
      </Article>

      <Article id="engagements" number={4} heading="Engagements de l'éditeur">
        <p>
          Pour toute recherche menée de bonne foi dans le respect des règles ci-dessus,{" "}
          {EDITOR.tradeName} s&apos;engage à :
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            accuser réception de votre signalement <strong>sous cinq jours ouvrés</strong> ;
          </li>
          <li>vous tenir informé de l&apos;analyse et de la correction ;</li>
          <li>
            ne pas engager de poursuites et ne pas porter plainte contre vous au titre de cette
            recherche ;
          </li>
          <li>
            vous remercier publiquement sur cette page, <strong>si vous en êtes d&apos;accord</strong>{" "}
            et sous le nom de votre choix ;
          </li>
          <li>
            notifier la CNIL et, si nécessaire, les personnes concernées si la faille a entraîné
            une violation de données personnelles (articles 33 et 34 du RGPD).
          </li>
        </ul>
        <p>
          {EDITOR.tradeName} est une entreprise individuelle : il n&apos;existe pas de programme
          de récompense, et aucune prime n&apos;est promise.
        </p>
        <p>
          Vous pouvez aussi adresser votre signalement à l&apos;Agence nationale de la sécurité
          des systèmes d&apos;information (ANSSI), qui protège l&apos;identité des lanceurs
          d&apos;alerte de bonne foi (article L. 2321-4 du code de la défense).
        </p>
      </Article>

      <Article id="remerciements" number={5} heading="Remerciements">
        <p>
          Les personnes ayant signalé une vulnérabilité et accepté d&apos;être citées figureront
          ici, avec la date de leur signalement.
        </p>
      </Article>
    </LegalPage>
  );
}
