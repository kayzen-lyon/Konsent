import { toolJsonLd } from "@/lib/seo/jsonld";
import { getTool } from "@/lib/tools/catalog";
import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Disclaimer, SectionTitle } from "@/components/primitives";
import ProcessingRegisterGenerator from "@/components/tools/ProcessingRegisterGenerator";

export const metadata: Metadata = {
  title: "Générateur de registre des traitements RGPD (article 30)",
  description:
    "Constituez gratuitement votre registre des activités de traitement selon le modèle de la CNIL : une fiche par traitement, traitements types préremplis (clients, prospection, paie, recrutement, site web, newsletter, audience, vidéosurveillance, comptabilité). Export HTML, Markdown et CSV, généré dans votre navigateur.",
  alternates: { canonical: "/outils/registre-traitements" },
};

const POINTS: { title: string; body: string }[] = [
  {
    title: "Qui doit le tenir",
    body: "Tout responsable du traitement et tout sous-traitant. L'exemption des organismes de moins de 250 salariés (art. 30, § 5) ne joue pas pour les traitements réguliers — paie, clients, prospection : en pratique, presque tous les organismes sont concernés.",
  },
  {
    title: "Ce que chaque fiche contient",
    body: "Finalités, catégories de personnes et de données, destinataires, transferts hors de l'Union et leurs garanties, durées de conservation et, si possible, description des mesures de sécurité (art. 30, § 1, b à g).",
  },
  {
    title: "Un document vivant",
    body: "Le registre se tient par écrit, y compris sous forme électronique, et se met à jour à chaque nouveau traitement, nouvel outil ou nouveau prestataire. Un registre figé depuis trois ans décrit une organisation qui n'existe plus.",
  },
  {
    title: "La première pièce demandée",
    body: "Il est mis à la disposition de la CNIL sur demande (art. 30, § 4). Lors d'un contrôle, c'est généralement le premier document réclamé, et le point de départ de toutes les autres questions.",
  },
];

export default function ProcessingRegisterPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <Breadcrumbs
        jsonLd={[toolJsonLd(getTool("registre-traitements")!)]}
        items={[
          { href: "/outils", label: "Outils" },
          { href: "/outils/registre-traitements", label: "Registre des traitements" },
        ]}
      />
      <p className="tech text-[10px] text-accent">Outil libre</p>
      <h1 className="display mt-2 text-4xl text-ink-2">Générateur de registre des traitements</h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">
        Cochez les traitements que vous mettez en œuvre : chaque fiche suit le modèle de la CNIL et
        arrive préremplie, avec ses références. Modifiez, ajoutez vos traitements propres, exportez en
        HTML, Markdown ou CSV.
      </p>

      <div className="mt-4 max-w-3xl rounded-3xl border border-line bg-surface-low px-5 py-4 text-sm leading-relaxed text-muted">
        Le registre est assemblé <strong className="text-ink-2">dans votre navigateur</strong>. Rien
        n&apos;est envoyé ni conservé : fermer la page efface la saisie. Pensez à exporter votre
        travail.
      </div>

      <div className="mt-4 max-w-3xl rounded-3xl border-l-2 border-warn bg-warn-bg px-5 py-4 text-sm leading-relaxed text-warn">
        <strong>Modèle à adapter.</strong> Les valeurs proposées sont des points de départ tirés des
        référentiels de la CNIL et des textes cités. Elles ne remplacent ni l&apos;analyse de votre
        situation ni l&apos;avis d&apos;un professionnel : le registre doit décrire votre pratique
        réelle.
      </div>

      <ProcessingRegisterGenerator />

      <section className="mt-16" aria-labelledby="rt-why">
        <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
          <p className="tech text-[10px] text-accent">Ce que dit le RGPD</p>
          <h2 id="rt-why" className="display mt-2 text-2xl text-ink-2">
            Le registre de l&apos;article 30
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {POINTS.map((p) => (
              <li key={p.title} className="card-lift rounded-2xl border border-line bg-surface-low p-5">
                <h3 className="display text-base text-ink-2">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{p.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm leading-relaxed text-muted">
            Références : règlement (UE) 2016/679, art. 5, § 2, 9, 10, 28, 30, 32 et 44 à 49 ; modèle de
            registre et référentiels sectoriels publiés par la CNIL (gestion des activités commerciales,
            délib. n° 2021-131 ; gestion du personnel, délib. n° 2019-160 ; cookies et traceurs, délib.
            n° 2020-091 et 2020-092 ; journalisation, délib. n° 2021-122).
          </p>
        </div>
      </section>

      <section className="mt-14">
        <SectionTitle eyebrow="Limites" title="Ce que cet outil ne fait pas" />
        <div className="max-w-3xl space-y-4 text-[15px] leading-relaxed text-muted">
          <p>
            Il ne tient pas le registre des activités de sous-traitant (art. 30, § 2), distinct de
            celui-ci, ni le registre des violations (art. 33, § 5). Il ne dit pas si un traitement
            exige une analyse d&apos;impact (art. 35).
          </p>
          <p>
            Il ne voit pas les outils que votre site appelle réellement : un traceur ou un
            sous-traitant absent du registre reste un traitement. Pour comparer votre déclaration à la
            réalité, lancez un{" "}
            <Link href="/scan" className="font-medium text-flame underline underline-offset-4">
              audit complet
            </Link>
            , puis reportez les durées dans le{" "}
            <Link
              href="/outils/duree-conservation"
              className="font-medium text-flame underline underline-offset-4"
            >
              calculateur de durées de conservation
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
