import Link from "next/link";
import type { Metadata } from "next";
import { SeverityBadge } from "@/components/primitives";
import { FAMILY_LABELS, FAMILY_ORDER, RULEPACK, RULES, SEVERITY_ORDER } from "@/lib/rulepack";

export const metadata: Metadata = {
  title: "Référentiel des règles",
  description:
    "Les règles d'analyse de Konsent, publiques et documentées : référence normative, méthode de détection, correctif et statut sous le projet Digital Omnibus.",
};

export default function RulesPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-k-primary">
          Référentiel {RULEPACK.version}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-k-ink sm:text-4xl">
          {RULEPACK.total} règles, publiques et sourcées
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-k-muted">
          Chaque règle porte sa référence normative précise, sa méthode de détection, son
          correctif et son statut sous le projet « Digital Omnibus » — qui n&apos;est pas
          adopté. Le référentiel est versionné : un rapport produit aujourd&apos;hui reste
          explicable dans six mois.
        </p>
        <p className="mt-4 rounded-lg border border-k-line bg-white px-4 py-3 text-sm text-k-muted">
          <span className="font-medium text-k-ink">{RULEPACK.staticCount} règles</span> sont
          évaluables sans navigateur et couvertes par l&apos;analyse en ligne.{" "}
          <span className="font-medium text-k-ink">{RULEPACK.headlessCount} règles</span>{" "}
          nécessitent le protocole en trois phases avec navigateur.
        </p>
      </header>

      <div className="mt-12 space-y-10">
        {FAMILY_ORDER.map((family) => {
          const list = RULES.filter((r) => r.family === family).sort(
            (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
          );
          if (list.length === 0) return null;

          return (
            <section key={family}>
              <div className="flex items-baseline justify-between gap-3 border-b border-k-line pb-2">
                <h2 className="text-lg font-semibold tracking-tight text-k-ink">
                  {FAMILY_LABELS[family]}
                </h2>
                <span className="text-sm text-k-muted">{list.length} règles</span>
              </div>

              <ul className="mt-4 grid gap-2.5">
                {list.map((rule) => (
                  <li key={rule.id}>
                    <Link
                      href={`/regles/${rule.id.toLowerCase()}`}
                      className="group flex flex-wrap items-start gap-3 rounded-lg border border-k-line bg-white px-4 py-3 transition hover:border-k-primary"
                    >
                      <SeverityBadge severity={rule.severity} />
                      <span className="min-w-0 flex-1">
                        <span className="font-mono text-xs text-k-muted">{rule.id}</span>
                        <span className="mt-0.5 block text-[15px] font-medium leading-snug text-k-ink group-hover:text-k-primary">
                          {rule.title}
                        </span>
                      </span>
                      <span className="shrink-0 self-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {rule.engine === "static" ? "analyse en ligne" : "navigateur requis"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
