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

      <p className="mt-4 rounded-xl border border-green-200 bg-green-50 p-5 text-[15px] leading-relaxed text-green-900">
        Konsent signale le chargement de traceurs tiers comme un écart. Il serait incohérent
        d&apos;en déposer. Ce site <strong>ne dépose aucun cookie</strong>, n&apos;utilise{" "}
        <strong>aucun outil de mesure d&apos;audience tiers</strong> et ne charge{" "}
        <strong>aucune ressource externe</strong> — ni police, ni script, ni image. C&apos;est
        la raison pour laquelle vous ne voyez aucun bandeau.
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
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink-2">Durées de conservation</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          Les résultats d&apos;analyse ne sont pas conservés : ils sont calculés à la demande et
          disparaissent à la fermeture de la page. Les journaux techniques de l&apos;hébergeur
          sont conservés selon la politique de rétention de celui-ci.
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
