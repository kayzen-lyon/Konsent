import Link from "next/link";
import type { Metadata } from "next";
import { Disclaimer, SectionTitle } from "@/components/primitives";
import CookieTester from "@/components/tools/CookieTester";
import { JsonLd } from "@/components/JsonLd";
import { toolJsonLd } from "@/lib/seo/jsonld";
import { getTool } from "@/lib/tools/catalog";

export const metadata: Metadata = {
  title: "Testeur de cookie : à quoi sert ce cookie ?",
  description:
    "Collez un nom de cookie, votre document.cookie ou un en-tête Cookie : finalité, éditeur, durée de vie et consentement requis pour chacun. Gratuit, sans inscription, exécuté dans votre navigateur, rien n'est conservé.",
};

export default function CookieTesterPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <JsonLd data={toolJsonLd(getTool("testeur-cookie")!)} />
      <p className="tech text-[10px] text-accent">Outil libre</p>
      <h1 className="display mt-2 text-4xl text-ink-2">Testeur de cookie</h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">
        <code className="font-mono">_fbp</code>, <code className="font-mono">_gcl_au</code>,{" "}
        <code className="font-mono">IDE</code> : les noms ne disent rien. Collez-en un, ou toute la
        liste de votre navigateur, pour savoir qui le dépose, pourquoi, combien de temps, et si le
        visiteur doit y avoir consenti.
      </p>

      <div className="mt-4 max-w-3xl rounded-3xl border border-line bg-surface-low px-5 py-4 text-sm leading-relaxed text-muted">
        L&apos;analyse se fait <strong className="text-ink-2">dans votre navigateur</strong>. Seuls les
        noms sont lus ; les valeurs, qui peuvent identifier une session, sont ignorées. Rien n&apos;est
        envoyé ni conservé.
      </div>

      <CookieTester />

      <section className="mt-16">
        <SectionTitle
          eyebrow="Mode d'emploi"
          title="Récupérer la liste de vos cookies"
          description="Deux méthodes, sans extension."
        />
        <ol className="space-y-4 text-[15px] leading-relaxed text-muted">
          <li className="rounded-3xl border border-line bg-surface p-5">
            <strong className="text-ink-2">Par la console.</strong> Sur la page concernée, ouvrez les
            outils de développement (F12), onglet Console, et saisissez{" "}
            <code className="rounded bg-surface-low px-1.5 py-0.5 font-mono text-ink-2">document.cookie</code>.
            Copiez le résultat ici. Les cookies HttpOnly n&apos;y figurent pas.
          </li>
          <li className="rounded-3xl border border-line bg-surface p-5">
            <strong className="text-ink-2">Par l&apos;onglet Réseau.</strong> Rechargez la page, cliquez
            sur la première requête et copiez la valeur de l&apos;en-tête de requête{" "}
            <code className="rounded bg-surface-low px-1.5 py-0.5 font-mono text-ink-2">Cookie</code> :
            elle contient aussi les cookies HttpOnly.
          </li>
        </ol>
      </section>

      <section className="mt-14">
        <SectionTitle eyebrow="Limites" title="Ce que le nom ne dit pas" />
        <div className="max-w-3xl space-y-4 text-[15px] leading-relaxed text-muted">
          <p>
            L&apos;identification repose sur le nom, seul indice fiable pour les cookies posés sur votre
            propre domaine par des scripts tiers. Un nom peut toutefois être réutilisé par un autre
            outil. La mention « consentement requis » décrit l&apos;usage habituel du cookie ; un
            paramétrage particulier (mesure d&apos;audience configurée pour l&apos;exemption, par
            exemple) peut changer l&apos;analyse.
          </p>
          <p>
            Surtout, la question n&apos;est pas seulement « que fait ce cookie ? » mais « a-t-il été
            déposé avant le choix du visiteur ? ». Seul un{" "}
            <Link href="/scan" className="font-medium text-flame underline underline-offset-4">
              audit complet
            </Link>{" "}
            observe le moment du dépôt. L&apos;index complet est consultable sur la page{" "}
            <Link href="/cookies" className="font-medium text-flame underline underline-offset-4">
              cookies
            </Link>
            .
          </p>
        </div>
      </section>

      <div className="mt-14">
        <Disclaimer variant="short" />
      </div>
    </div>
  );
}
