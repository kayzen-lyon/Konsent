"use client";

import { useId, useMemo, useState } from "react";
import { formatEur } from "@/lib/format";
import {
  BREACH_OPTIONS,
  COOPERATION_OPTIONS,
  DEFAULT_INPUT,
  HISTORY_OPTIONS,
  REACH_OPTIONS,
  SIMPLIFIED_FINE_MAX,
  SIZE_OPTIONS,
  STEPS,
  simulate,
  type BreachType,
  type Cooperation,
  type Effect,
  type History,
  type Reach,
  type SimulationInput,
  type Size,
  type StepId,
} from "@/lib/tools/cnil-procedure";
import { CheckField, FormSection, RadioGroup } from "./LegalNoticeGenerator";

/**
 * Simulateur pédagogique de procédure CNIL. Tout se passe dans le
 * navigateur : aucune réponse n'est envoyée ni conservée.
 */

const EFFECT_STYLES: Record<Effect, string> = {
  aggravant: "bg-crit-bg text-crit-text",
  atténuant: "bg-ok-bg text-ok",
  neutre: "bg-surface-high text-ink-2",
};

function Timeline({ path }: { path: readonly StepId[] }) {
  const [open, setOpen] = useState<Set<StepId>>(() => new Set());
  const baseId = useId();
  const onPath = new Set(path);

  function toggle(id: StepId) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <ol className="relative space-y-3 border-l-2 border-line pl-6">
      {STEPS.map((s, i) => {
        const expanded = open.has(s.id);
        const panelId = `${baseId}-${s.id}`;
        const probable = onPath.has(s.id);
        return (
          <li key={s.id} className="relative">
            <span
              aria-hidden="true"
              className={`absolute -left-[33px] top-4 h-4 w-4 rounded-full border-2 ${
                probable ? "border-flame bg-flame" : "border-line-2 bg-surface"
              }`}
            />
            <div className={`rounded-2xl border bg-surface ${probable ? "border-flame" : "border-line"}`}>
              <h3 className="m-0">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => toggle(s.id)}
                  className="flex min-h-11 w-full items-start justify-between gap-4 rounded-2xl px-5 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame"
                >
                  <span>
                    <span className="tech block text-[10px] text-muted">
                      Étape {String(i + 1).padStart(2, "0")}
                      {probable ? " · sur votre parcours probable" : ""}
                    </span>
                    <span className="font-display text-base text-ink-2">{s.title}</span>
                    <span className="block text-sm text-muted">{s.actor}</span>
                  </span>
                  <span aria-hidden="true" className={`mt-1 text-xl leading-none text-flame transition ${expanded ? "rotate-45" : ""}`}>
                    +
                  </span>
                </button>
              </h3>
              <div id={panelId} hidden={!expanded} className="border-t border-line px-5 pb-5 pt-4 text-[15px] leading-relaxed text-ink-2">
                <p>{s.summary}</p>
                <p className="mt-3 text-sm">
                  <strong>Délai {s.delay.legal ? "légal" : "indicatif"} :</strong>{" "}
                  <span className="text-muted">{s.delay.text}</span>
                </p>
                <h4 className="mt-4 text-sm font-semibold text-ink-2">Ce que l&apos;organisme peut faire</h4>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
                  {s.youCan.map((y) => (
                    <li key={y}>{y}</li>
                  ))}
                </ul>
                <h4 className="mt-4 text-sm font-semibold text-ink-2">Sources</h4>
                <ul className="mt-2 space-y-1 text-sm text-muted">
                  {s.sources.map((src) => (
                    <li key={src} className="tech text-[11px]">
                      {src}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function CnilProcedureSimulator() {
  const [input, setInput] = useState<SimulationInput>(DEFAULT_INPUT);
  const set = <K extends keyof SimulationInput>(key: K, value: SimulationInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }));
  const result = useMemo(() => simulate(input), [input]);
  const resultId = useId();
  const pathTitles = result.path.map((id) => STEPS.find((s) => s.id === id)?.title ?? id);

  let step = 0;

  return (
    <div className="mt-10 space-y-12">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()} aria-label="Questions du simulateur">
          <FormSection title="Le manquement" step={++step} defaultOpen>
            <RadioGroup<BreachType>
              legend="Type de manquement principal"
              value={input.breach}
              options={BREACH_OPTIONS.map((b) => ({ id: b.id, label: `${b.label} — ${b.ref}` }))}
              onChange={(v) => set("breach", v)}
            />
            <RadioGroup<Reach>
              legend="Nombre de personnes concernées"
              value={input.reach}
              options={REACH_OPTIONS}
              onChange={(v) => set("reach", v)}
            />
            <CheckField
              label="Des données sensibles sont en jeu"
              hint="Santé, origine, opinions, biométrie, orientation sexuelle (art. 9) ou infractions (art. 10)."
              checked={input.sensitive}
              onChange={(v) => set("sensitive", v)}
            />
            <CheckField
              label="Le manquement est déjà corrigé, et la correction documentée"
              checked={input.corrected}
              onChange={(v) => set("corrected", v)}
            />
          </FormSection>
          <FormSection title="L'organisme" step={++step} defaultOpen>
            <RadioGroup<Size> legend="Taille" value={input.size} options={SIZE_OPTIONS} onChange={(v) => set("size", v)} />
            <RadioGroup<Cooperation>
              legend="Coopération avec la CNIL"
              value={input.cooperation}
              options={COOPERATION_OPTIONS}
              onChange={(v) => set("cooperation", v)}
            />
            <RadioGroup<History>
              legend="Antécédents"
              value={input.history}
              options={HISTORY_OPTIONS}
              onChange={(v) => set("history", v)}
            />
          </FormSection>
        </form>

        <section
          aria-labelledby={resultId}
          className="rounded-3xl border border-line bg-surface p-5 sm:p-6 lg:sticky lg:top-24 lg:self-start"
        >
          <p className="tech text-[10px] text-accent">Scénario le plus vraisemblable</p>
          <h2 id={resultId} className="display mt-2 text-2xl text-ink-2">
            {result.outcomeTitle}
          </h2>
          <p role="status" className="sr-only">
            Scénario le plus vraisemblable : {result.outcomeTitle}.
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">{result.outcomeExplanation}</p>

          <h3 className="mt-5 text-sm font-semibold text-ink-2">Parcours probable</h3>
          <ol className="mt-2 flex flex-wrap gap-2 text-sm">
            {pathTitles.map((t, i) => (
              <li key={t} className="rounded-full bg-surface-low px-3 py-1 text-ink-2">
                <span className="tech mr-1 text-[10px] text-muted">{i + 1}.</span>
                {t}
              </li>
            ))}
          </ol>

          <div className="mt-5 space-y-2 rounded-2xl border border-line bg-surface-low p-4 text-sm leading-relaxed text-ink-2">
            <p>
              <strong>Procédure simplifiée :</strong> amende de {formatEur(SIMPLIFIED_FINE_MAX)} au plus, astreinte
              de {formatEur(100)} par jour au plus (loi n° 78-17, art. 22-1).
            </p>
            <p>
              <strong>Formation restreinte :</strong> {result.ceiling.text}
            </p>
            <p className="text-muted">
              Ce sont des plafonds légaux théoriques, ni une prévision ni une estimation de sanction.
            </p>
          </div>

          <p className="mt-4 rounded-2xl border-l-2 border-warn bg-warn-bg px-4 py-3 text-sm leading-relaxed text-warn">
            <strong>Simulation pédagogique, pas une prévision.</strong> La CNIL apprécie chaque dossier au
            cas par cas et n&apos;est tenue par aucun ordre : elle peut sanctionner sans mise en demeure
            préalable, ou clore un dossier sérieux.
          </p>
        </section>
      </div>

      <section aria-labelledby={`${resultId}-criteres`}>
        <h2 id={`${resultId}-criteres`} className="display text-2xl text-ink-2">
          Les critères de l&apos;article 83, § 2, du RGPD, appliqués à vos réponses
        </h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-muted">
          Pour décider s&apos;il y a lieu d&apos;imposer une amende et pour en fixer le montant,
          l&apos;autorité tient dûment compte de onze critères. Le simulateur indique comment vos
          réponses les orientent ; ceux qu&apos;il ne peut pas apprécier restent « neutres ».
        </p>
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {result.criteria.map((c) => (
            <li key={c.letter} className="card-lift rounded-2xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="display text-base text-ink-2">
                  <span className="tech mr-2 text-[10px] text-muted">83(2)({c.letter})</span>
                  {c.title}
                </h3>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${EFFECT_STYLES[c.effect]}`}>
                  {c.effect === "neutre" ? "Neutre" : c.effect === "aggravant" ? "Aggravant" : "Atténuant"}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">{c.meaning}</p>
              <p className="mt-2 text-sm text-ink-2">{c.why}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby={`${resultId}-frise`}>
        <h2 id={`${resultId}-frise`} className="display text-2xl text-ink-2">
          La procédure, étape par étape
        </h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-muted">
          Ouvrez chaque étape pour voir qui agit, le délai, ce que vous pouvez faire et les textes
          applicables. Les étapes de votre parcours probable sont signalées.
        </p>
        <div className="mt-6 max-w-3xl">
          <Timeline path={result.path} />
        </div>
      </section>
    </div>
  );
}
