import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/ContactForm";
import { Article, LegalPage } from "@/components/Legal";
import { issueToken } from "@/lib/contact/antispam";
import { EDITOR } from "@/lib/disclaimer";

export const metadata: Metadata = {
  title: "Nous écrire",
  description:
    "Formulaire de contact de KAYZEN LYON, éditeur de Konsent. Aucune donnée conservée au-delà de la réponse, aucun traceur, aucun CAPTCHA tiers.",
};

// Le jeton est daté à l'affichage : il sert à mesurer le délai de saisie.
export const dynamic = "force-dynamic";

export default function ContactPage() {
  return (
    <LegalPage
      title="Nous écrire"
      updatedAt="2026-08-09"
      intro={
        <>
          Une question sur un rapport, une offre, ou un constat que vous contestez. Nous répondons
          sous deux jours ouvrés.
        </>
      }
    >
      <Article id="formulaire" heading="Formulaire">
        <ContactForm token={issueToken()} />
      </Article>

      {/* Information de l'article 13 du RGPD, donnée AU MOMENT de la collecte
          et non renvoyée à une politique générale. Un lien vers un document de
          six pages ne satisfait pas l'exigence d'information « aisément
          accessible » et « en des termes clairs et simples ». */}
      <Article id="donnees" heading="Ce que deviennent ces informations">
        <dl className="space-y-3">
          {[
            [
              "Qui traite vos données",
              `${EDITOR.legalName}, ${EDITOR.street}, ${EDITOR.postalCode} ${EDITOR.city}, en qualité de responsable de traitement.`,
            ],
            ["Pourquoi", "Répondre à votre message, et rien d'autre."],
            [
              "Sur quelle base",
              "Votre consentement, recueilli par la case du formulaire — jamais pré-cochée. Vous pouvez le retirer à tout moment.",
            ],
            [
              "Ce qui est collecté",
              "Votre nom, votre adresse électronique et votre message. Ni adresse IP, ni empreinte de navigateur, ni mesure d'audience.",
            ],
            [
              "Qui les reçoit",
              "Notre boîte de réception, et notre prestataire d'acheminement Resend, établi dans l'Union européenne. Personne d'autre. Aucune revente, aucun profilage, aucune décision automatisée.",
            ],
            [
              "Combien de temps",
              "Le message n'est pas enregistré en base : il est acheminé par courriel puis conservé dans notre messagerie douze mois au plus à compter de notre réponse.",
            ],
            [
              "Vos droits",
              "Accès, rectification, effacement, limitation, opposition et portabilité, en écrivant à l'adresse ci-dessous. Réponse sous un mois.",
            ],
            [
              "Réclamation",
              "Vous pouvez saisir la CNIL — 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 — si vous estimez vos droits méconnus.",
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="tech text-[10px] text-muted">{label}</dt>
              <dd className="mt-0.5 text-[15px] leading-relaxed text-ink-2">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-[14px] text-muted">
          Le détail figure dans la{" "}
          <Link href="/confidentialite" className="text-accent hover:underline">
            politique de confidentialité
          </Link>
          .
        </p>
      </Article>

      <Article id="sans-captcha" heading="Pourquoi il n'y a pas de CAPTCHA">
        <p>
          Un CAPTCHA de Google chargerait des ressources tierces et déposerait des traceurs sur
          chaque visiteur de cette page. C&apos;est précisément le comportement que {EDITOR.product}{" "}
          relève chez les sites qu&apos;il analyse — nous ne pouvons pas le pratiquer.
        </p>
        <p>
          C&apos;est aussi une barrière d&apos;accessibilité connue : une épreuve de reconnaissance
          visuelle ou sonore sans alternative écarte de fait une partie des utilisateurs.
        </p>
        <p>
          Le formulaire est protégé par un champ leurre invisible et retiré de l&apos;arbre
          d&apos;accessibilité, et par un contrôle du délai de saisie. Ces deux mesures ne demandent
          rien à l&apos;utilisateur, ne chargent aucun tiers et ne collectent aucune donnée
          supplémentaire.
        </p>
      </Article>

      <Article id="direct" heading="Nous joindre directement">
        <p>
          Courriel :{" "}
          <a href={`mailto:${EDITOR.email}`} className="text-accent hover:underline">
            {EDITOR.email}
          </a>
          <br />
          Téléphone :{" "}
          <a href={`tel:${EDITOR.phoneE164}`} className="text-accent hover:underline">
            {EDITOR.phone}
          </a>
          <br />
          Adresse : {EDITOR.street}, {EDITOR.postalCode} {EDITOR.city}
        </p>
      </Article>
    </LegalPage>
  );
}
