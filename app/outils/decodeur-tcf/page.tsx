import Link from "next/link";
import type { Metadata } from "next";
import { Disclaimer, SectionTitle } from "@/components/primitives";
import TcfDecoderForm from "@/components/TcfDecoderForm";

export const metadata: Metadata = {
  title: "Décodeur de chaîne de consentement TCF",
  description:
    "Collez une chaîne TCF v2 et lisez ce qu'elle transmet réellement à vos partenaires publicitaires : finalités, intérêt légitime, vendors, date de recueil. Gratuit, sans inscription, exécuté dans votre navigateur.",
};

export default function TcfDecoderPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-wide text-accent">Outil libre</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink">
        Décodeur de chaîne de consentement TCF
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-slate-600">
        Quand un visiteur clique sur votre bandeau, son choix est encodé dans une chaîne de
        caractères transmise à des centaines de régies publicitaires. Cette chaîne est lisible.
        Collez-la ci-dessous pour voir ce qu'elle dit vraiment.
      </p>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-relaxed text-slate-600">
        Le décodage se fait <strong className="text-ink">dans votre navigateur</strong>. La chaîne
        n'est envoyée nulle part, n'est pas enregistrée, et ne nous parvient jamais. Aucun e-mail
        n'est demandé.
      </div>

      <TcfDecoderForm />

      <section className="mt-16">
        <SectionTitle
          eyebrow="01"
          title="Où trouver votre chaîne"
          description="Trois méthodes, de la plus simple à la plus fiable."
        />
        <ol className="mt-6 space-y-4 text-slate-600">
          <li className="rounded-lg border border-slate-200 p-5">
            <strong className="text-ink">Dans les cookies.</strong> Ouvrez les outils de
            développement de votre navigateur, onglet Application ou Stockage, et cherchez le
            cookie nommé <code className="rounded bg-slate-100 px-1.5 py-0.5">euconsent-v2</code>.
            Sa valeur est la chaîne.
          </li>
          <li className="rounded-lg border border-slate-200 p-5">
            <strong className="text-ink">Par la console.</strong> Exécutez{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5">
              __tcfapi(&apos;getTCData&apos;, 2, (d) =&gt; console.log(d.tcString))
            </code>{" "}
            sur la page concernée.
          </li>
          <li className="rounded-lg border border-slate-200 p-5">
            <strong className="text-ink">Par le scan.</strong> Un{" "}
            <Link href="/scan" className="font-medium text-flame underline underline-offset-4">
              audit complet
            </Link>{" "}
            relève la chaîne à chacune des trois phases, et signale notamment le cas le plus grave :
            une chaîne émise <em>avant</em> que le visiteur ait cliqué.
          </li>
        </ol>
      </section>

      <section className="mt-14">
        <SectionTitle
          eyebrow="02"
          title="Ce que ce décodage ne dit pas"
          description="Une précaution que nous préférons écrire nous-mêmes."
        />
        <div className="mt-6 space-y-4 text-slate-600">
          <p>
            Le TCF est un cadre <strong className="text-ink">privé</strong>, édicté par un
            organisme professionnel, l&apos;IAB Europe. Ce n&apos;est pas une norme juridique.
            L&apos;autorité belge de protection des données l&apos;a jugé non conforme en février
            2022, décision partiellement confirmée par le Tribunal de l&apos;Union européenne le
            14 mars 2024 (affaire T-111/23), et des versions corrigées ont été publiées depuis.
          </p>
          <p>
            Il en découle deux choses, et nous les disons dans les deux sens :{" "}
            <strong className="text-ink">
              un écart au TCF n&apos;est pas en soi un manquement au RGPD
            </strong>
            , et <strong className="text-ink">une conformité au TCF ne vaut pas conformité au
            RGPD</strong>. Ce décodeur vous dit ce que la chaîne contient. Il ne vous dit pas si
            votre traitement est licite.
          </p>
        </div>
      </section>

      <div className="mt-14">
        <Disclaimer />
      </div>
    </div>
  );
}
