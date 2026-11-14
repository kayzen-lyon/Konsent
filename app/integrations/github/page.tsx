import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Disclaimer, SectionTitle } from "@/components/primitives";
import { CopyCodeBlock } from "@/components/tools/ProcessingRegisterGenerator";

export const metadata: Metadata = {
  title: "Action GitHub Konsent : audit RGPD et cookies dans la CI",
  description:
    "Documentation de l'action GitHub konsent-scan : audit en trois phases dans un navigateur réel, entrées (url, fail-on, api-url), sorties (score, grade, critical, report) et workflow complet qui bloque un déploiement si le score régresse ou si un écart critique apparaît.",
  alternates: { canonical: "/integrations/github" },
};

const ACTION = "kayzen-lyon/Konsent/.github/actions/konsent-scan@main";

const MINIMAL = `- name: Audit Konsent
  uses: ${ACTION}
  with:
    url: https://preprod.exemple.fr
    fail-on: critical`;

const FULL = `name: Conformité RGPD avant déploiement

on:
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  konsent:
    name: Audit Konsent
    runs-on: ubuntu-latest
    steps:
      # 1. Référence : le site en production. Ne bloque jamais.
      - name: Audit de la production
        id: reference
        uses: ${ACTION}
        with:
          url: https://www.exemple.fr
          fail-on: never

      # 2. Candidat : la préproduction ou l'aperçu de déploiement.
      #    Échoue dès qu'un écart critique apparaît.
      - name: Audit de la préproduction
        id: candidate
        uses: ${ACTION}
        with:
          url: https://preprod.exemple.fr
          fail-on: critical

      # 3. Échoue si le score baisse par rapport à la production.
      - name: Refuser une régression du score
        if: always() && steps.reference.outputs.score != '' && steps.candidate.outputs.score != ''
        env:
          REF_SCORE: \${{ steps.reference.outputs.score }}
          NEW_SCORE: \${{ steps.candidate.outputs.score }}
          NEW_GRADE: \${{ steps.candidate.outputs.grade }}
        run: |
          echo "Production : $REF_SCORE/100 · Préproduction : $NEW_SCORE/100 (note $NEW_GRADE)"
          if [ "$NEW_SCORE" -lt "$REF_SCORE" ]; then
            echo "::error::Le score passe de $REF_SCORE à $NEW_SCORE/100 : régression de conformité."
            exit 1
          fi

  deploy:
    name: Déploiement
    needs: konsent
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Déployer
        run: echo "Votre commande de déploiement ici"`;

const REPORT = `- name: Écarts majeurs du rapport
  if: always()
  env:
    REPORT: \${{ steps.candidate.outputs.report }}
  run: |
    echo "$REPORT" > rapport.json
    node -e "
      const r = JSON.parse(require('fs').readFileSync('rapport.json', 'utf8'));
      for (const f of r.findings ?? []) {
        if (f.severity === 'MAJOR') console.log(f.ruleId + ' — ' + f.title);
      }
    "`;

const INPUTS: readonly { name: string; required: string; def: string; body: string }[] = [
  {
    name: "url",
    required: "oui",
    def: "—",
    body: "Adresse à auditer. Une préproduction ou un aperçu de déploiement convient, à condition d'être joignable depuis le runner GitHub.",
  },
  {
    name: "fail-on",
    required: "non",
    def: "critical",
    body: "Seuil de blocage. critical : échoue sur tout écart critique. major : échoue aussi sur les écarts majeurs. never : n'échoue jamais (audit informatif, ou référence).",
  },
  {
    name: "api-url",
    required: "non",
    def: "https://konsent-zeta.vercel.app",
    body: "Instance Konsent qui évalue l'observation contre le référentiel. À changer pour une instance auto-hébergée.",
  },
];

const OUTPUTS: readonly { name: string; body: string }[] = [
  { name: "score", body: "Score de conformité, sur 100." },
  { name: "grade", body: "Note, de A à F." },
  { name: "critical", body: "Nombre d'écarts critiques." },
  { name: "report", body: "Rapport complet au format JSON : score, écarts (findings), couverture (coverage.notEvaluated)." },
];

const STEPS: readonly { title: string; body: string }[] = [
  {
    title: "Observation en trois phases",
    body: "Le worker installe ses dépendances et pilote un navigateur réel : avant consentement, après refus, après acceptation. Il tourne sur le runner, dans votre chaîne : la préproduction n'est jamais exposée à un service tiers.",
  },
  {
    title: "Évaluation contre le référentiel",
    body: "L'observation est envoyée à l'instance indiquée par api-url (route /api/ingest), qui l'évalue et renvoie le rapport. Seul le résultat de l'observation est transmis.",
  },
  {
    title: "Résumé et verdict",
    body: "Un résumé (score, note, quinze premiers écarts, nombre de règles non évaluées) est écrit dans l'onglet de l'exécution. L'étape de verdict échoue selon le seuil fail-on.",
  },
];

export default function GithubActionPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <Breadcrumbs
        items={[
          { href: "/integrations", label: "Intégrations" },
          { href: "/integrations/github", label: "Action GitHub" },
        ]}
      />
      <p className="tech text-[10px] text-accent">Intégration continue</p>
      <h1 className="display mt-2 text-4xl text-ink-2">L&apos;action GitHub Konsent</h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">
        Un écart de conformité ne se voit pas au moment où on l&apos;introduit : il se voit au
        contrôle suivant. L&apos;action audite chaque préproduction avant mise en ligne et bloque le
        déploiement si un écart critique apparaît ou si le score régresse.
      </p>

      <section className="mt-12" aria-labelledby="gh-usage">
        <h2 id="gh-usage" className="display text-2xl text-ink-2">
          Utilisation minimale
        </h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-muted">
          À ajouter dans les étapes d&apos;un job qui tourne sur <code className="font-mono text-sm">ubuntu-latest</code>.
          L&apos;action installe elle-même Node 20 et le worker.
        </p>
        <CopyCodeBlock caption="YAML — étape de workflow" code={MINIMAL} />
      </section>

      <section className="mt-12" aria-labelledby="gh-fonctionnement">
        <h2 id="gh-fonctionnement" className="display text-2xl text-ink-2">
          Ce que fait l&apos;action
        </h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card-lift rounded-3xl border border-line bg-surface p-5">
              <p className="tech text-[10px] text-muted">Étape {i + 1}</p>
              <h3 className="display mt-1 text-base text-ink-2">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12" aria-labelledby="gh-entrees">
        <h2 id="gh-entrees" className="display text-2xl text-ink-2">
          Entrées
        </h2>
        <div className="mt-4 overflow-x-auto rounded-3xl border border-line bg-surface">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">Entrées de l&apos;action konsent-scan</caption>
            <thead className="bg-surface-low">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold text-ink-2">Nom</th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink-2">Requis</th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink-2">Défaut</th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink-2">Rôle</th>
              </tr>
            </thead>
            <tbody>
              {INPUTS.map((i) => (
                <tr key={i.name} className="border-t border-line align-top">
                  <th scope="row" className="px-4 py-3 font-mono text-xs font-semibold text-ink-2">
                    {i.name}
                  </th>
                  <td className="px-4 py-3 text-ink-2">{i.required}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-2">{i.def}</td>
                  <td className="px-4 py-3 text-muted">{i.body}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="gh-sorties">
        <h2 id="gh-sorties" className="display text-2xl text-ink-2">
          Sorties
        </h2>
        <div className="mt-4 overflow-x-auto rounded-3xl border border-line bg-surface">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">Sorties de l&apos;action konsent-scan</caption>
            <thead className="bg-surface-low">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold text-ink-2">Nom</th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink-2">Contenu</th>
              </tr>
            </thead>
            <tbody>
              {OUTPUTS.map((o) => (
                <tr key={o.name} className="border-t border-line align-top">
                  <th scope="row" className="px-4 py-3 font-mono text-xs font-semibold text-ink-2">
                    {o.name}
                  </th>
                  <td className="px-4 py-3 text-muted">{o.body}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 max-w-3xl text-sm text-muted">
          Lisez-les avec <code className="font-mono">{"${{ steps.<id>.outputs.score }}"}</code> en
          donnant un <code className="font-mono">id</code> à l&apos;étape.
        </p>
      </section>

      <section className="mt-12" aria-labelledby="gh-complet">
        <h2 id="gh-complet" className="display text-2xl text-ink-2">
          Workflow complet : bloquer un déploiement
        </h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-muted">
          La production sert de référence (<code className="font-mono text-sm">fail-on: never</code>),
          la préproduction est le candidat (<code className="font-mono text-sm">fail-on: critical</code>).
          Le job <code className="font-mono text-sm">deploy</code> dépend du job d&apos;audit : il ne
          démarre pas si un écart critique apparaît ou si le score baisse.
        </p>
        <CopyCodeBlock caption=".github/workflows/conformite.yml" code={FULL} />
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">
          Pour bloquer aussi sur les écarts majeurs, remplacez <code className="font-mono">critical</code> par{" "}
          <code className="font-mono">major</code>. Pour exploiter le rapport détaillé dans une étape
          suivante :
        </p>
        <CopyCodeBlock caption="YAML — lire le rapport JSON" code={REPORT} />
      </section>

      <section className="mt-14">
        <SectionTitle eyebrow="À savoir" title="Limites et bonnes pratiques" />
        <ul className="max-w-3xl list-disc space-y-3 pl-5 text-[15px] leading-relaxed text-muted">
          <li>
            Le résumé indique le nombre de règles <strong className="text-ink-2">non évaluées</strong>.
            Elles ne sont pas pour autant satisfaites : un score de 100 n&apos;est pas un certificat.
          </li>
          <li>
            Les entrées sont passées aux scripts par variables d&apos;environnement, jamais
            interpolées dans le code shell : une URL piégée ne s&apos;exécute pas.
          </li>
          <li>
            Épinglez l&apos;action sur une étiquette ou un commit plutôt que sur{" "}
            <code className="font-mono text-sm">main</code> pour qu&apos;une évolution du référentiel ne
            change pas votre verdict sans prévenir.
          </li>
          <li>
            La préproduction doit être joignable depuis le runner GitHub, sans authentification
            préalable.
          </li>
          <li>
            Pour un suivi sans intégration continue, utilisez la{" "}
            <Link href="/surveillance" className="font-medium text-flame underline underline-offset-4">
              surveillance
            </Link>{" "}
            ou l&apos;
            <Link href="/integrations" className="font-medium text-flame underline underline-offset-4">
              API
            </Link>
            .
          </li>
        </ul>
      </section>

      <div className="mt-14">
        <Disclaimer variant="short" />
      </div>
    </div>
  );
}
