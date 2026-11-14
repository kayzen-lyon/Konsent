import { Breadcrumbs } from "@/components/Breadcrumbs";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SeverityBadge } from "@/components/primitives";
import { FAMILY_LABELS, RULES, getRule } from "@/lib/rulepack";
import { constatWording } from "@/lib/disclaimer";
import { SeeAlso } from "@/components/SeeAlso";
import { relatedForRule } from "@/lib/seo/related";
import { createAutolinker } from "@/lib/seo/autolink";

export function generateStaticParams() {
  return RULES.map((r) => ({ id: r.id.toLowerCase() }));
}

/* Toutes les fiches sont connues au build : une adresse hors référentiel
 * répond 404 sans rendu à la demande. */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const rule = getRule(id.toUpperCase());
  if (!rule) return { title: "Règle introuvable" };
  return {
    title: `${rule.id} — ${rule.title}`,
    description: rule.messageExec,
  };
}

export default async function RulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rule = getRule(id.toUpperCase());
  if (!rule) notFound();

  const autolink = createAutolinker();
  const effortLabel = { LOW: "faible", MEDIUM: "moyen", HIGH: "élevé" }[rule.remediation.effort];

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <Breadcrumbs
        items={[
          { href: "/regles", label: "Référentiel" },
          { href: `/regles/${rule.id.toLowerCase()}`, label: rule.id },
        ]}
      />

      <header>
        <div className="flex flex-wrap items-center gap-2.5">
          <SeverityBadge severity={rule.severity} />
          <span className="font-mono text-sm text-muted">{rule.id}</span>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {FAMILY_LABELS[rule.family]}
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-tight text-ink-2 sm:text-3xl">
          {rule.title}
        </h1>
      </header>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Ce que cela signifie
        </h2>
        <p className="mt-2 text-[17px] leading-relaxed text-ink-2">{autolink(rule.messageExec)}</p>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Constat technique
        </h2>
        <p className="mt-2 rounded-lg border border-line bg-surface px-4 py-3 font-mono text-[13px] leading-relaxed text-ink-2">
          {rule.messageTech}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Références</h2>
        <ul className="mt-2 space-y-1.5">
          {rule.references.map((r) => (
            <li key={r} className="text-[15px] leading-relaxed text-ink-2">
              · {r}
            </li>
          ))}
        </ul>
        <p className="mt-3 rounded-lg bg-paper px-4 py-3 text-[13px] leading-relaxed text-muted">
          {constatWording("la référence ci-dessus")}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Sous le projet « Digital Omnibus »
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{rule.omnibusStatus}</p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          La proposition COM(2025) 837 du 19 novembre 2025 n&apos;est pas adoptée. Elle fait
          l&apos;objet d&apos;un avis conjoint critique du CEPD et du CEPD-EDPS. Ce champ est
          prospectif et ne modifie pas le droit applicable aujourd&apos;hui.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Correctif</h2>
        <p className="mt-2 text-sm text-muted">
          Effort estimé : <span className="font-medium text-ink-2">{effortLabel}</span>
          {rule.remediation.priceHintEur
            ? ` · fourchette indicative : ${rule.remediation.priceHintEur[0]} – ${rule.remediation.priceHintEur[1]} €`
            : ""}
        </p>
        <ol className="mt-3 space-y-2">
          {rule.remediation.steps.map((s, i) => (
            <li key={s} className="flex gap-3 text-[15px] leading-relaxed text-ink-2">
              <span className="tabular shrink-0 font-mono text-sm text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{autolink(s)}</span>
            </li>
          ))}
        </ol>
      </section>

      {rule.falsePositiveNotes ? (
        <section className="mt-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-amber-900">Limite de la détection</h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-amber-900">
            {autolink(rule.falsePositiveNotes)}
          </p>
        </section>
      ) : null}

      <SeeAlso links={relatedForRule(rule)} />

      <footer className="mt-10 border-t border-line pt-5 text-sm text-muted">
        <p>
          Poids au score : {rule.weight} point{rule.weight > 1 ? "s" : ""} · phase(s){" "}
          {rule.phases.join(", ")} ·{" "}
          {rule.engine === "static" ? "évaluable en analyse en ligne" : "navigateur requis"} ·
          dernière revue le{" "}
          {new Date(rule.lastReviewed).toLocaleDateString("fr-FR", { dateStyle: "long" })}
        </p>
      </footer>
    </div>
  );
}
