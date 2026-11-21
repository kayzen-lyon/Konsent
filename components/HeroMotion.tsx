"use client";

import { useState } from "react";
import { Lock, ShieldCheck, Timer } from "@/components/site/icons";
import { Logo } from "@/components/Logo";

/**
 * Animation du héros, sur le modèle de Nexus : une fenêtre de navigateur qui
 * « joue » un audit Konsent — adresse saisie, analyse, constats qui
 * tombent un à un, score. CSS seul, en boucle de 11 s : rien à télécharger,
 * rien à exécuter, aucune requête. Si le visiteur demande un mouvement
 * réduit (RGAA 13.8), l'état final est affiché d'emblée, sans boucle.
 *
 * Purement illustratif : l'ensemble est masqué aux technologies
 * d'assistance, le texte du héros portant déjà le propos. Un bouton permet
 * de mettre la boucle en pause (RGAA 13.8 : un mouvement de plus de 5 s doit
 * pouvoir être arrêté, `prefers-reduced-motion` ne suffit pas). Une
 * transcription dépliable, sous l'animation, en décrit chaque étape en texte.
 */

type Level = "crit" | "warn" | "ok";

const FINDINGS: { label: string; level: Level; tag: string }[] = [
  { label: "_ga déposé avant le choix du visiteur", level: "crit", tag: "Critique" },
  { label: "Pixel Meta : transfert hors UE", level: "crit", tag: "Critique" },
  { label: "Google Fonts chargé depuis les États-Unis", level: "warn", tag: "Écart" },
  { label: "« Refuser » aussi visible qu'« Accepter »", level: "ok", tag: "Conforme" },
  { label: "Politique cookies accessible", level: "ok", tag: "Conforme" },
];

const DOT: Record<Level, string> = {
  crit: "bg-crit",
  warn: "bg-warn",
  ok: "bg-ok",
};
const TAG: Record<Level, string> = {
  crit: "bg-crit-bg text-crit-text",
  warn: "bg-warn-bg text-warn",
  ok: "bg-ok-bg text-ok",
};

const RING = 2 * Math.PI * 34;
const SCORE = 58;
const FINAL_OFFSET = (RING * (1 - SCORE / 100)).toFixed(2);

const CSS = `
.km { --d: 11s; }
@keyframes km-type { 0%,4% { width: 0 } 15%,100% { width: 10.5ch } }
@keyframes km-caret { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }
@keyframes km-bar { 0%,15% { transform: scaleX(0) } 50%,100% { transform: scaleX(1) } }
@keyframes km-run { 0%,14% { opacity: 0 } 17%,48% { opacity: 1 } 51%,100% { opacity: 0 } }
@keyframes km-done { 0%,50% { opacity: 0 } 54%,94% { opacity: 1 } 100% { opacity: 0 } }
@keyframes km-ring { 0%,48% { stroke-dashoffset: ${RING.toFixed(2)} } 64%,94% { stroke-dashoffset: ${FINAL_OFFSET} } 100% { stroke-dashoffset: ${RING.toFixed(2)} } }
@keyframes km-score { 0%,56% { opacity: 0; transform: scale(.85) } 64%,94% { opacity: 1; transform: none } 100% { opacity: 0 } }
@keyframes km-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
@keyframes km-flow { to { background-position: 12px 0 } }
@keyframes km-scan { 0%,15% { transform: translateY(-100%); opacity: 0 } 18% { opacity: .9 } 48% { transform: translateY(260%); opacity: .9 } 51%,100% { transform: translateY(260%); opacity: 0 } }

.km-type { animation: km-type var(--d) steps(11, end) infinite; }
.km-caret { animation: km-caret 1s step-end infinite; }
.km-bar { transform-origin: left; animation: km-bar var(--d) cubic-bezier(.4,0,.2,1) infinite; }
.km-run { animation: km-run var(--d) linear infinite; }
.km-done { animation: km-done var(--d) linear infinite; }
.km-row { opacity: 0; animation-duration: var(--d); animation-timing-function: cubic-bezier(.22,1,.36,1); animation-iteration-count: infinite; }
.km-ring { stroke-dasharray: ${RING.toFixed(2)}; animation: km-ring var(--d) cubic-bezier(.22,1,.36,1) infinite; }
.km-score { animation: km-score var(--d) ease-out infinite; }
.km-float { animation: km-float 5s ease-in-out infinite; }
.km-float-2 { animation: km-float 6s ease-in-out 1s infinite; }
.km-flow { background: repeating-linear-gradient(90deg, var(--color-flame) 0 6px, transparent 6px 12px); animation: km-flow .8s linear infinite; }
.km-scan { animation: km-scan var(--d) ease-in-out infinite; }
${FINDINGS.map((_, i) => {
  const s = 20 + i * 6;
  return `.km-row-${i} { animation-name: km-row-${i}; }
@keyframes km-row-${i} { 0%,${s}% { opacity: 0; transform: translateY(6px) } ${s + 4}%,94% { opacity: 1; transform: none } 100% { opacity: 0 } }`;
}).join("\n")}

.km-paused, .km-paused * { animation-play-state: paused !important; }

${["@media (prefers-reduced-motion: reduce) {", 'html[data-motion="reduce"] {']
  .map(
    (open) => `${open}
  .km-type, .km-caret, .km-bar, .km-run, .km-done, .km-row,
  .km-ring, .km-score, .km-float, .km-float-2, .km-flow, .km-scan { animation: none !important; }
  .km-type { width: 10.5ch; }
  .km-caret, .km-run, .km-scan { opacity: 0; }
  .km-bar { transform: none; }
  .km-done, .km-row, .km-score { opacity: 1; transform: none; }
  .km-ring { stroke-dashoffset: ${FINAL_OFFSET}; }
}`,
  )
  .join("\n")}
`;

export function HeroMotion() {
  const [paused, setPaused] = useState(false);
  return (
    <div className="mx-auto w-full max-w-[540px]">
    <div className="relative py-6">
      <style>{CSS}</style>
      <div aria-hidden="true" className={paused ? "km-paused" : undefined}>

      <div className="km relative overflow-hidden rounded-3xl border border-line bg-surface shadow-lg">
        {/* Barre d'adresse */}
        <div className="flex items-center gap-3 border-b border-line bg-surface-low px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-line-2/50" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-2/50" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-2/50" />
          </div>
          <div className="flex flex-1 items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-muted">
            <Lock className="h-3 w-3 shrink-0" />
            <span className="truncate">konsent.kayzen-lyon.com/scan</span>
          </div>
        </div>

        <div className="relative p-5 sm:p-6">
          {/* Adresse analysée */}
          <div className="flex items-center gap-2 rounded-xl border border-line px-3 py-2.5 font-mono text-sm text-ink-2">
            <span className="text-muted">https://</span>
            <span className="km-type inline-block overflow-hidden whitespace-nowrap align-bottom">
              monsite.fr
            </span>
            <span className="km-caret -ml-1 inline-block h-4 w-px bg-ink-2" />
          </div>

          {/* Flux : site → Konsent → score */}
          <div className="mt-5 flex items-center justify-between gap-2">
            <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface">
              <span className="font-display text-[10px] font-bold uppercase tracking-wide text-flame">
                Site
              </span>
              <span className="km-scan absolute inset-x-1 top-0 h-3 rounded-full bg-flame/25 blur-[2px]" />
            </div>
            <div className="km-flow h-0.5 flex-1 rounded-full" />
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-navy-deep">
              <Logo className="h-7 w-9" fond="sombre" />
            </div>
            <div className="km-flow h-0.5 flex-1 rounded-full" />
            <div className="relative flex h-14 w-14 items-center justify-center">
              <svg viewBox="0 0 80 80" className="h-14 w-14 -rotate-90">
                <circle cx="40" cy="40" r="34" fill="none" stroke="var(--color-line)" strokeWidth="6" />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  stroke="var(--color-flame)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  className="km-ring"
                />
              </svg>
              <span className="km-score font-display absolute text-base font-extrabold text-ink-2">
                {SCORE}
              </span>
            </div>
          </div>

          {/* Progression */}
          <div className="mt-5">
            <div className="relative mb-2 h-4 text-xs font-semibold text-ink-2">
              <span className="km-run absolute left-0">Observation avant consentement…</span>
              <span className="km-done absolute left-0 text-flame">
                Analyse terminée · 2 critiques, 1 écart
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-high">
              <div className="km-bar h-full rounded-full bg-flame" />
            </div>
          </div>

          {/* Constats */}
          <ul className="mt-5 space-y-2">
            {FINDINGS.map((f, i) => (
              <li
                key={f.label}
                className={`km-row km-row-${i} flex items-center gap-3 rounded-lg bg-surface-low px-3 py-2 text-sm text-ink-2`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[f.level]}`} />
                <span className="min-w-0 flex-1 truncate">{f.label}</span>
                <span
                  className={`font-display shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TAG[f.level]}`}
                >
                  {f.tag}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Pastilles flottantes */}
      <div className="km-float absolute -right-2 top-0 flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-2 shadow-xl sm:-right-4">
        <ShieldCheck className="h-3.5 w-3.5 text-flame" />
        Indépendant de toute CMP
      </div>
      <div className="km-float-2 absolute -left-2 bottom-2 flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-2 shadow-xl sm:-left-4">
        <Timer className="h-3.5 w-3.5 text-flame" />
        Résultat immédiat, sans inscription
      </div>
      </div>

      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        className="font-display absolute -bottom-3 right-2 inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-xs font-semibold text-muted transition-colors hover:text-ink-2"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
          {paused ? <path d="M8 5v14l11-7z" /> : <path d="M7 5h4v14H7zM13 5h4v14h-4z" />}
        </svg>
        {paused ? "Reprendre l'animation" : "Mettre l'animation en pause"}
      </button>
    </div>

      {/* Transcription : équivalent textuel de l'animation (RGAA 4.1 / 13.8),
          accessible à tous, y compris quand l'animation est masquée aux
          technologies d'assistance. */}
      <details className="group mt-6 rounded-2xl border border-line bg-surface text-sm text-ink-2">
        <summary className="font-display flex list-none [&::-webkit-details-marker]:hidden min-h-11 cursor-pointer items-center gap-2 rounded-2xl px-4 text-xs font-semibold text-muted transition-colors hover:text-ink-2">
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M9 6l6 6-6 6z" />
          </svg>
          Lire la description de l&apos;animation
        </summary>
        <div className="border-t border-line px-4 pb-4 pt-3 leading-relaxed">
          <p>
            L&apos;animation montre, en boucle de 11 secondes, un audit Konsent dans une fenêtre
            de navigateur ouverte sur konsent.kayzen-lyon.com/scan. Les données sont fictives.
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>L&apos;adresse « https://monsite.fr » est saisie lettre par lettre.</li>
            <li>
              Le site est relié à Konsent par une ligne pointillée ; une barre de progression
              avance avec le message « Observation avant consentement… ».
            </li>
            <li>
              L&apos;analyse se termine : « Analyse terminée, 2 critiques, 1 écart ». Un anneau se
              remplit et affiche le score de {SCORE} sur 100.
            </li>
            <li>
              Cinq constats apparaissent un à un :
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {FINDINGS.map((f) => (
                  <li key={f.label}>
                    {f.label} — {f.tag.toLowerCase()}.
                  </li>
                ))}
              </ul>
            </li>
            <li>
              Deux pastilles rappellent que Konsent est indépendant de toute plateforme de
              gestion du consentement et donne un résultat immédiat, sans inscription.
            </li>
          </ol>
          <p className="mt-2 text-muted">
            Si les animations sont réduites, seul l&apos;état final est affiché.
          </p>
        </div>
      </details>
    </div>
  );
}
