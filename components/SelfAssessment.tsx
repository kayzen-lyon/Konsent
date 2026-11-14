"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScoreGauge } from "@/components/ScoreGauge";
import { Pill } from "@/components/primitives";
import {
  ANSWER_LABELS,
  ANSWER_OPTIONS,
  QUESTIONS,
  THEMES,
  maturityGrade,
  scoreAssessment,
  type Answer,
  type Priority,
} from "@/lib/self-assessment/questions";

/**
 * Auto-évaluation RGPD, une étape par thème.
 *
 * Aucune réponse n'est stockée ni transmise : l'état vit dans la mémoire de
 * la page et disparaît au rechargement. C'est dit à l'écran, et c'est vrai —
 * pas de localStorage, pas d'appel réseau.
 */

const PRIVACY_NOTE =
  "Vos réponses ne quittent pas votre navigateur : rien n'est enregistré ni envoyé, et tout disparaît si vous rechargez ou fermez la page.";

const PRIORITY_TONE: Record<Priority, "danger" | "warn" | "neutral"> = {
  haute: "danger",
  moyenne: "warn",
  basse: "neutral",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  haute: "Priorité haute",
  moyenne: "Priorité moyenne",
  basse: "Priorité basse",
};

function barColor(score: number): string {
  if (score >= 75) return "bg-ok";
  if (score >= 40) return "bg-warn";
  return "bg-crit";
}

export function SelfAssessment() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<string, Answer>>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const total = THEMES.length;
  const done = step >= total;
  const theme = THEMES[Math.min(step, total - 1)]!;
  const questions = useMemo(() => QUESTIONS.filter((q) => q.theme === theme.id), [theme.id]);
  const unansweredHere = questions.filter((q) => !answers[q.id]).length;
  const result = useMemo(() => (done ? scoreAssessment(answers) : null), [done, answers]);

  // Focus déplacé sur le titre de l'étape à chaque changement (pas au chargement).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  function go(next: number) {
    setStep(Math.max(0, Math.min(total, next)));
  }

  function restart() {
    setAnswers({});
    setStep(0);
  }

  if (done && result) {
    const { grade, label } = maturityGrade(result.score);
    const unanswered = result.total - result.answered;
    return (
      <div className="rise rounded-3xl bg-surface p-6 shadow-lg ring-1 ring-line sm:p-8">
        <p className="tech text-[10px] text-muted">Résultat</p>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="display mt-2 text-2xl text-ink-2 outline-none sm:text-3xl"
        >
          Votre auto-évaluation
        </h2>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted">
          Score déclaratif, calculé uniquement à partir de vos réponses : il mesure des pratiques
          annoncées, pas une conformité vérifiée.
          {unanswered > 0
            ? ` ${unanswered} question${unanswered > 1 ? "s" : ""} sans réponse ${
                unanswered > 1 ? "ont été comptées" : "a été comptée"
              } comme « Je ne sais pas ».`
            : ""}
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[auto_1fr] lg:items-start">
          <ScoreGauge score={result.score} grade={grade} gradeLabel={label} />

          <section aria-labelledby="sa-themes">
            <h3 id="sa-themes" className="display text-lg text-ink-2">
              Score par thème
            </h3>
            <ul className="mt-4 space-y-3">
              {result.themes.map((t) => (
                <li key={t.theme.id}>
                  <div className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="font-medium text-ink-2">{t.theme.title}</span>
                    <span className="tabular font-mono font-bold text-ink-2">
                      {t.score}
                      <span className="font-normal text-muted"> / 100</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface-high" aria-hidden="true">
                    <div
                      className={`h-full rounded-full ${barColor(t.score)} transition-[width] duration-500 motion-reduce:transition-none print:[print-color-adjust:exact]`}
                      style={{ width: `${t.score}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section aria-labelledby="sa-plan" className="mt-10">
          <h3 id="sa-plan" className="display text-lg text-ink-2">
            Plan d&apos;action priorisé
          </h3>
          {result.actions.length === 0 ? (
            <p className="mt-3 text-[14px] text-muted">
              Aucune action ne ressort de vos réponses. Gardez la documentation qui le démontre à
              jour, et faites-la relire par un professionnel si un enjeu particulier le justifie.
            </p>
          ) : (
            <>
              <p className="mt-2 text-[13px] text-muted">
                Classement par importance de la question et par écart déclaré.{" "}
                {result.actions.length} action{result.actions.length > 1 ? "s" : ""}.
              </p>
              <ol className="mt-4 space-y-3">
                {result.actions.map((a, i) => (
                  <li
                    key={a.question.id}
                    className="rounded-2xl border border-line bg-surface-low p-4"
                    style={{ breakInside: "avoid" }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tabular font-mono text-[12px] text-muted">{i + 1}.</span>
                      <Pill tone={PRIORITY_TONE[a.priority]}>{PRIORITY_LABEL[a.priority]}</Pill>
                      <span className="text-[12px] text-muted">
                        Votre réponse : {a.given ? ANSWER_LABELS[a.answer] : "sans réponse"}
                      </span>
                    </div>
                    <p className="mt-2 text-[14px] font-semibold leading-snug text-ink-2">
                      {a.question.label}
                    </p>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{a.text}</p>
                    <p className="mt-1.5 font-mono text-[11px] text-muted">{a.question.reference}</p>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>

        <p className="mt-8 rounded-2xl bg-surface-low p-4 text-[13px] leading-relaxed text-muted">
          {PRIVACY_NOTE} Pour garder une trace, imprimez la page ou enregistrez-la en PDF.
        </p>

        <div className="mt-6 flex flex-wrap gap-3 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-primary min-h-11 rounded-full bg-flame px-5 text-sm font-semibold text-on-primary"
          >
            Imprimer
          </button>
          <button
            type="button"
            onClick={restart}
            className="min-h-11 rounded-full border border-line-2 px-5 text-sm font-semibold text-ink-2 transition hover:bg-surface-low"
          >
            Recommencer
          </button>
          <Link
            href="/#scan"
            className="inline-flex min-h-11 items-center rounded-full border border-line-2 px-5 text-sm font-semibold text-ink-2 transition hover:bg-surface-low"
          >
            Lancer l&apos;audit technique
          </Link>
          <Link
            href="/contact"
            className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-flame hover:underline"
          >
            Nous contacter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-surface p-6 shadow-lg ring-1 ring-line sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="tech text-[10px] text-muted" id="sa-progress-label">
          Étape {step + 1} sur {total}
        </p>
        <p className="text-[12px] text-muted">Vos réponses ne quittent pas votre navigateur.</p>
      </div>
      <progress
        className="mt-2 block h-2 w-full overflow-hidden rounded-full accent-[var(--color-flame)]"
        value={step + 1}
        max={total}
        aria-labelledby="sa-progress-label"
      />

      <div key={theme.id} className="rise mt-6">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="display text-2xl text-ink-2 outline-none sm:text-3xl"
        >
          {theme.title}
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">{theme.intro}</p>

        <div className="mt-6 space-y-5">
          {questions.map((q, qi) => {
            const current = answers[q.id];
            return (
              <div key={q.id} className="rounded-2xl border border-line p-4 sm:p-5">
                <fieldset>
                <legend className="text-[15px] font-semibold leading-snug text-ink-2">
                  <span className="tabular mr-1.5 font-mono text-[12px] text-muted">
                    {qi + 1}/{questions.length}
                  </span>
                  {q.label}
                </legend>
                <details className="mt-2 text-[13px]">
                  <summary className="cursor-pointer font-medium text-flame hover:underline">
                    Pourquoi c&apos;est demandé
                  </summary>
                  <p className="mt-2 leading-relaxed text-ink-2">{q.help}</p>
                  <p className="mt-1.5 font-mono text-[11px] text-muted">{q.reference}</p>
                </details>
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  {ANSWER_OPTIONS.map((o) => {
                    const on = current === o.value;
                    return (
                      <label
                        key={o.value}
                        className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-[13px] font-medium text-ink-2 transition ${
                          on ? "border-flame/40 bg-flame-bg" : "border-line hover:border-line-2"
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={o.value}
                          checked={on}
                          onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: o.value }))}
                          className="h-4 w-4 shrink-0 accent-[#2563eb]"
                        />
                        {o.label}
                      </label>
                    );
                  })}
                </div>
                </fieldset>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-5 text-[12px] text-muted" role="status" aria-live="polite">
        {unansweredHere === 0
          ? "Toutes les questions de cette étape ont une réponse."
          : `${unansweredHere} question${unansweredHere > 1 ? "s" : ""} sans réponse dans cette étape ; une question laissée vide est comptée comme « Je ne sais pas ».`}
      </p>

      <div className="mt-4 flex flex-wrap justify-between gap-3">
        <button
          type="button"
          onClick={() => go(step - 1)}
          disabled={step === 0}
          className="min-h-11 rounded-full border border-line-2 px-5 text-sm font-semibold text-ink-2 transition hover:bg-surface-low disabled:cursor-not-allowed disabled:opacity-40"
        >
          Précédent
        </button>
        <button
          type="button"
          onClick={() => go(step + 1)}
          className="btn-primary min-h-11 rounded-full bg-flame px-6 text-sm font-semibold text-on-primary"
        >
          {step === total - 1 ? "Voir mon résultat" : "Suivant"}
        </button>
      </div>
    </div>
  );
}
