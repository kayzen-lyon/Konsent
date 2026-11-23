"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { AnimatedBeam } from "@/components/hero/AnimatedBeam";

/**
 * Démonstration du héros : le visiteur répond lui-même à un bandeau et voit ce
 * qui part malgré sa réponse. Les trois états sont les trois phases d'un
 * audit. Site fictif, annoncé comme tel ; rien n'est envoyé ni déposé.
 */
type Choice = "avant" | "refus" | "accord";

const CHOICES: { id: Choice; label: string }[] = [
  { id: "avant", label: "Sans répondre" },
  { id: "refus", label: "Tout refuser" },
  { id: "accord", label: "Tout accepter" },
];

const RECIPIENTS: { name: string; sends: Choice[] }[] = [
  { name: "Mesure d'audience", sends: ["avant", "accord"] },
  { name: "Pixel publicitaire", sends: ["avant", "refus", "accord"] },
  { name: "Vidéo intégrée", sends: ["accord"] },
];

const STATUS: Record<Choice, string> = {
  avant: "Le visiteur n'a rien choisi, et deux services reçoivent déjà ses données.",
  refus: "Le visiteur a refusé. Le pixel publicitaire reçoit quand même ses données.",
  accord: "Le visiteur a accepté : les trois services reçoivent ses données.",
};

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeMotion(notify: () => void) {
  const query = window.matchMedia(MOTION_QUERY);
  const observer = new MutationObserver(notify);
  query.addEventListener("change", notify);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
  return () => {
    query.removeEventListener("change", notify);
    observer.disconnect();
  };
}

const isMotionReduced = () =>
  window.matchMedia(MOTION_QUERY).matches || document.documentElement.dataset.motion === "reduce";

export function ConsentDemo() {
  const [choice, setChoice] = useState<Choice>("refus");
  const still = useSyncExternalStore(subscribeMotion, isMotionReduced, () => true);
  const container = useRef<HTMLDivElement>(null);
  const site = useRef<HTMLDivElement>(null);
  const r0 = useRef<HTMLLIElement>(null);
  const r1 = useRef<HTMLLIElement>(null);
  const r2 = useRef<HTMLLIElement>(null);
  const refs = [r0, r1, r2] as const;
  const consented = choice === "accord";

  return (
    <div className="text-left">
      <div className="flex flex-col gap-4 border-b border-line p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
        <p id="demo-titre" className="font-display text-base font-bold text-ink-2">
          Répondez au bandeau, regardez ce qui part
        </p>
        <div role="group" aria-labelledby="demo-titre" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {CHOICES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={choice === id}
              onClick={() => setChoice(id)}
              className={`font-display min-h-11 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors ${
                choice === id
                  ? "border-ink-2 bg-ink-2 text-paper"
                  : "border-line-2 bg-surface text-ink-2 hover:bg-surface-high"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div ref={container} className="relative flex items-center justify-between gap-8 p-4 sm:px-10 sm:py-8">
        <div
          ref={site}
          className="relative z-10 flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-2xl border border-line-2 bg-navy-deep text-center text-white sm:h-32 sm:w-40"
        >
          <span className="font-display text-sm font-bold sm:text-base">Votre site</span>
          <span className="mt-1 text-xs text-white/80">exemple fictif</span>
        </div>
        {RECIPIENTS.map(({ name, sends }, i) => (
          <AnimatedBeam
            key={`${name}-${choice}`}
            containerRef={container}
            fromRef={site}
            toRef={refs[i]!}
            color={consented ? "var(--color-ok)" : "var(--color-crit)"}
            active={sends.includes(choice)}
            still={still}
            delay={i * 0.12}
          />
        ))}
        <ul className="relative z-10 grid w-[min(60%,20rem)] gap-3">
          {RECIPIENTS.map(({ name, sends }, i) => {
            const active = sends.includes(choice);
            return (
              <li
                key={name}
                ref={refs[i]}
                className="rounded-xl border border-line bg-surface px-3 py-2.5 sm:flex sm:items-center sm:justify-between sm:gap-3"
              >
                <span className="block text-sm font-semibold text-ink-2">{name}</span>
                <span
                  className={`mt-1 inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold sm:mt-0 ${
                    !active
                      ? "bg-surface-low text-muted"
                      : consented
                        ? "bg-ok-bg text-ink-2"
                        : "bg-crit-bg text-crit-text"
                  }`}
                >
                  {!active ? "Rien ne part" : consented ? "Avec accord" : "Sans accord"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <p aria-live="polite" className="border-t border-line bg-surface-low px-4 py-3.5 text-sm text-ink-2 sm:px-5">
        {STATUS[choice]}
      </p>
    </div>
  );
}
