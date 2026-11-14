import Link from "next/link";
import type { Metadata } from "next";
import { Disclaimer, SectionTitle } from "@/components/primitives";
import SecurityHeadersChecker from "@/components/tools/SecurityHeadersChecker";

export const metadata: Metadata = {
  title: "Vérificateur d'en-têtes de sécurité HTTP",
  description:
    "Testez gratuitement les en-têtes de sécurité d'un site : HSTS, CSP, X-Content-Type-Options, frame-ancestors, Referrer-Policy, Permissions-Policy, COOP, CORP et attributs des cookies. Note de A à F et valeur corrigée pour chacun. Sans inscription, rien n'est conservé.",
};

export default function SecurityHeadersPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <p className="tech text-[10px] text-accent">Outil libre</p>
      <h1 className="display mt-2 text-4xl text-ink-2">Vérificateur d&apos;en-têtes de sécurité</h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">
        Quelques lignes renvoyées par votre serveur décident de ce que le navigateur accepte :
        connexion chiffrée imposée, scripts autorisés, intégration dans un cadre, adresse transmise aux
        sites tiers. Saisissez une adresse : chaque en-tête reçoit une note et, s&apos;il le faut, la
        valeur à recopier.
      </p>

      <div className="mt-4 max-w-3xl rounded-3xl border border-line bg-surface-low px-5 py-4 text-sm leading-relaxed text-muted">
        Un navigateur ne peut pas lire les en-têtes d&apos;un autre site : la requête est donc faite par{" "}
        <strong className="text-ink-2">notre serveur</strong>, une seule fois, sans lire la page.{" "}
        Rien n&apos;est conservé — ni l&apos;adresse, ni la réponse, ni les valeurs des cookies, qui ne
        sont même pas transmises à votre navigateur. Aucune adresse e-mail n&apos;est demandée.
      </div>

      <SecurityHeadersChecker />

      <section className="mt-16">
        <SectionTitle
          eyebrow="Pourquoi"
          title="Ce que la sécurité a à voir avec le RGPD"
          description="Une obligation de moyens, appréciée au cas par cas."
        />
        <div className="max-w-3xl space-y-4 text-[15px] leading-relaxed text-muted">
          <p>
            L&apos;article 32 du RGPD impose des mesures de sécurité « appropriées » au risque. Aucun
            texte n&apos;exige un en-tête en particulier, et{" "}
            <strong className="text-ink-2">
              une note basse n&apos;est pas en soi un manquement
            </strong>
            . Mais une page de connexion sans HSTS, ou un formulaire intégrable par n&apos;importe quel
            site, sont des faiblesses connues que la CNIL relève dans son guide de la sécurité des
            données personnelles.
          </p>
          <p>
            La politique de sécurité du contenu (CSP) a un intérêt de plus pour un site soumis aux
            règles sur les cookies : elle peut empêcher techniquement un script tiers non déclaré de
            se charger, ou d&apos;envoyer des données vers un domaine non prévu.
          </p>
        </div>
      </section>

      <section className="mt-14">
        <SectionTitle eyebrow="Limites" title="Ce que cet outil ne voit pas" />
        <div className="max-w-3xl space-y-4 text-[15px] leading-relaxed text-muted">
          <p>
            Seule la réponse à la page demandée est examinée, après redirections. D&apos;autres pages,
            l&apos;API ou les fichiers statiques peuvent renvoyer d&apos;autres en-têtes. Les cookies
            déposés ensuite par des scripts n&apos;apparaissent pas : pour eux, lancez un{" "}
            <Link href="/scan" className="font-medium text-flame underline underline-offset-4">
              audit complet
            </Link>{" "}
            ou utilisez le{" "}
            <Link href="/outils/testeur-cookie" className="font-medium text-flame underline underline-offset-4">
              testeur de cookie
            </Link>
            .
          </p>
          <p>
            La valeur CSP proposée est un point de départ : appliquée telle quelle, elle peut bloquer
            des scripts légitimes. Déployez-la d&apos;abord en Content-Security-Policy-Report-Only.
          </p>
        </div>
      </section>

      <div className="mt-14">
        <Disclaimer variant="short" />
      </div>
    </div>
  );
}
