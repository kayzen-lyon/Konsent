import type { Metadata } from "next";
import { EDITOR } from "@/lib/disclaimer";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Konsent ne dépose aucun traceur et n'utilise aucun outil de mesure tiers. Voici précisément ce qui est traité.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-ink-2">
        Politique de confidentialité
      </h1>

      <p
        id="cookies"
        className="mt-4 scroll-mt-28 rounded-xl border border-ok/30 bg-ok-bg p-5 text-[15px] leading-relaxed text-ink-2"
      >
        Konsent signale le chargement de traceurs tiers comme un écart. Il serait incohérent
        d&apos;en déposer. Ce site <strong>ne dépose aucun cookie</strong>, n&apos;utilise{" "}
        <strong>aucun outil de mesure d&apos;audience tiers</strong> et ne charge{" "}
        <strong>aucune ressource externe</strong> — ni police, ni script, ni image. C&apos;est
        la raison pour laquelle vous ne voyez aucun bandeau.
        <br />
        <br />
        Seule exception, et uniquement si vous la choisissez : la préférence de thème (clair,
        sombre ou système) est conservée dans le stockage local de votre navigateur sous la clé{" "}
        <code className="font-mono text-[13px]">konsent-theme</code>. Elle n&apos;est jamais
        transmise à notre serveur, ne permet aucun suivi et relève des traceurs strictement
        nécessaires à un service que vous demandez (article 82 de la loi Informatique et
        Libertés) : elle n&apos;appelle donc aucun consentement. Revenir sur « Système » la
        supprime.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink-2">Responsable de traitement</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          {EDITOR.legalName}, SIREN {EDITOR.siren}, {EDITOR.address}. Contact :{" "}
          <a href={`mailto:${EDITOR.email}`} className="text-flame hover:underline">
            {EDITOR.email}
          </a>
          .
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink-2">Ce qui est traité</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          Lorsque vous demandez l&apos;analyse d&apos;un site, l&apos;adresse que vous saisissez
          est transmise à notre serveur, qui effectue les requêtes nécessaires vers le site
          cible et vous renvoie le rapport. Cette adresse figure dans l&apos;URL de la page de
          résultat.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          Les journaux techniques de l&apos;hébergeur peuvent contenir votre adresse IP et
          l&apos;horodatage de la requête, pour les besoins de sécurité et de bon
          fonctionnement du service. Ils relèvent de l&apos;intérêt légitime au sens de
          l&apos;article 6(1)(f) du RGPD.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          Pour empêcher l&apos;usage abusif du service (analyses en rafale, envois de liens de
          connexion en masse), nous comptons les demandes par adresse IP. L&apos;adresse
          n&apos;est jamais enregistrée en clair : seule une empreinte cryptographique, qui change
          chaque jour et ne permet pas de retrouver l&apos;adresse, est conservée{" "}
          <strong>au plus deux jours</strong>. Base légale : intérêt légitime à la sécurité du
          service (article 6(1)(f) du RGPD).
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink-2">Durées de conservation</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          <strong>Audit à la demande :</strong> les résultats ne sont pas conservés, sauf si
          vous créez un lien de partage. Ils sont calculés à la demande et disparaissent à la
          fermeture de la page. Les journaux techniques de l&apos;hébergeur sont conservés selon
          la politique de rétention de celui-ci.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          <strong>Lien de partage :</strong> si — et seulement si — vous cliquez « Créer un lien
          de partage » sur un rapport, nous relançons l&apos;analyse et conservons son seul
          résultat technique (score, constats, services tiers observés sur le site analysé) sous
          une adresse aléatoire, pendant <strong>30 jours</strong>, puis il est supprimé. Aucune
          donnée vous concernant (adresse IP, adresse électronique, compte) n&apos;y est
          associée ; toute personne disposant du lien peut lire le rapport.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          <strong>Surveillance planifiée :</strong> si — et seulement si — vous inscrivez
          explicitement un domaine à la surveillance, nous conservons un historique de ses
          analyses successives. C&apos;est indispensable pour vous signaler ce qui a changé.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink-2">
          Ce que la surveillance planifiée conserve
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          L&apos;inscription est volontaire, domaine par domaine, et suppose de prouver que vous
          maîtrisez ce domaine — nous ne surveillons pas le site d&apos;autrui.
        </p>
        <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-ink-2">
          <li>
            · <strong>Le domaine inscrit</strong> et l&apos;adresse de courriel destinataire des
            alertes. C&apos;est la seule donnée personnelle traitée à ce titre.
          </li>
          <li>
            · <strong>L&apos;historique des analyses</strong> : date, score, nombre d&apos;écarts,
            identifiants des règles déclenchées, destinataires identifiés et leur juridiction.
          </li>
          <li>
            · <strong>Les alertes émises</strong> et leur contenu.
          </li>
        </ul>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          Ces données décrivent <strong>un site</strong>, pas ses visiteurs. Un audit observe le
          comportement d&apos;un serveur : il ne collecte aucune donnée relative aux personnes qui
          fréquentent le site analysé.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          <strong>Durée de conservation :</strong> 395 jours par défaut, soit treize mois —
          la durée que nous recommandons nous-mêmes pour les traceurs. Elle est paramétrable et
          appliquée par une purge automatique quotidienne. Une durée annoncée mais non appliquée
          serait un manquement de notre part.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          <strong>Base légale :</strong> exécution du service que vous avez demandé
          (article 6(1)(b) du RGPD) pour l&apos;historique, et votre consentement pour l&apos;envoi
          des alertes. Vous pouvez résilier à tout moment ; l&apos;historique est alors supprimé.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          <strong>Hébergement des données :</strong> base Postgres opérée par Neon (Neon Inc.,
          société de droit américain), région Francfort (AWS eu-central-1), au sein de
          l&apos;Union européenne. Les données restent stockées dans l&apos;UE ; l&apos;accès
          éventuel du prestataire est encadré par ses clauses contractuelles types.
        </p>
      </section>

      <section id="lettre-veille" className="mt-8 scroll-mt-28">
        <h2 className="text-lg font-semibold text-ink-2">Lettre mensuelle de la veille</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          <strong>Finalité :</strong> vous envoyer, le 1er du mois, les entrées ajoutées à la
          veille réglementaire le mois précédent. Seule votre adresse e-mail est traitée, avec la
          date d&apos;inscription et de confirmation. La lettre est en texte brut : ni pixel de
          suivi, ni lien traqué, aucune mesure d&apos;ouverture.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          <strong>Base légale :</strong> votre consentement (article 6(1)(a) du RGPD), recueilli
          par une case non pré-cochée puis confirmé par un lien envoyé à l&apos;adresse (double
          opt-in). Vous le retirez à tout moment par le lien présent dans chaque lettre.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          <strong>Durée de conservation :</strong> jusqu&apos;au désabonnement, qui efface
          l&apos;adresse immédiatement ; <strong>sept jours</strong> au plus pour une inscription
          non confirmée, supprimée ensuite par une purge automatique.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          <strong>Destinataire :</strong> notre prestataire d&apos;acheminement des e-mails
          (Resend), qui reçoit l&apos;adresse et le contenu de chaque lettre pour la seule
          finalité de l&apos;envoi. L&apos;adresse est stockée dans la même base que la
          surveillance (Neon, région Francfort).
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink-2">Transferts hors Union européenne</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          Ce site est hébergé par Vercel Inc., société établie aux États-Unis. Les journaux
          techniques peuvent donc faire l&apos;objet d&apos;un transfert hors de l&apos;Espace
          économique européen, encadré par les garanties applicables au titre du chapitre V du
          RGPD. Nous le mentionnons parce que nous reprochons précisément aux autres de ne pas
          le faire.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink-2">Référent RGPD</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          L&apos;éditeur n&apos;est pas tenu de désigner un délégué à la protection des données
          au sens de l&apos;article 37 du RGPD : il n&apos;est pas un organisme public, son
          activité de base ne consiste pas en un suivi systématique à grande échelle, et il ne
          traite pas de données sensibles à grande échelle.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          Un <strong>référent RGPD</strong> est néanmoins désigné et joignable à{" "}
          <a href={`mailto:${EDITOR.email}`} className="text-flame hover:underline">
            {EDITOR.email}
          </a>
          . Notre propre scanner relevait cette absence — nous préférons la corriger que la
          justifier.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink-2">Vos droits</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de
          limitation, d&apos;opposition et de portabilité. Ces droits s&apos;exercent auprès de{" "}
          <a href={`mailto:${EDITOR.email}`} className="text-flame hover:underline">
            {EDITOR.email}
          </a>
          .
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          Vous pouvez introduire une réclamation auprès de la Commission nationale de
          l&apos;informatique et des libertés (CNIL), 3 place de Fontenoy, TSA 80715, 75334
          Paris Cedex 07.
        </p>
      </section>
    </div>
  );
}
