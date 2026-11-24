"use client";

import { useState, type ReactNode } from "react";

/**
 * Héros de l'accueil : un horizon lumineux (le consentement) et des sphères
 * (les destinataires des données). Le visiteur répond lui-même à un bandeau et
 * voit quelles sphères reçoivent ses données, avec ou sans son accord.
 *
 * Adapté de « App Integration Celestial Hero » (wrapcoders), licence MIT,
 * depuis https://21st.dev/@wrapcoders/components/app-integration-hero.
 * Adaptations : horizon et orbites dans l'esprit de l'original, mais sans
 * navigation, sans bandeau ni lien externe, sans parallaxe ; sphères
 * génériques (aucune marque) dont l'état est écrit en toutes lettres ; jetons
 * et polices de Konsent ; titre rendu côté serveur ; aucune animation en
 * boucle (seules des transitions courtes, coupées par prefers-reduced-motion
 * et html[data-motion="reduce"]) ; aucune dépendance ajoutée.
 *
 * Site fictif, annoncé comme tel : rien n'est envoyé ni déposé.
 */
type Choice = "avant" | "refus" | "accord";
type Icon = "audience" | "pixel" | "video" | "police" | "chat";

const CHOICES: { id: Choice; label: string }[] = [
  { id: "avant", label: "Sans répondre" },
  { id: "refus", label: "Tout refuser" },
  { id: "accord", label: "Tout accepter" },
];

/* `left` / `top` : position sur l'arc, en % de la scène (écrans larges). */
const RECIPIENTS: { name: string; icon: Icon; sends: Choice[]; left: number; top: number }[] = [
  { name: "Mesure d'audience", icon: "audience", sends: ["avant", "accord"], left: 9, top: 66 },
  { name: "Pixel publicitaire", icon: "pixel", sends: ["avant", "refus", "accord"], left: 29, top: 40 },
  { name: "Vidéo intégrée", icon: "video", sends: ["accord"], left: 50, top: 30 },
  { name: "Polices", icon: "police", sends: ["avant", "refus", "accord"], left: 71, top: 40 },
  { name: "Chat", icon: "chat", sends: ["accord"], left: 91, top: 66 },
];

const STATUS: Record<Choice, string> = {
  avant: "Le visiteur n'a rien choisi, et trois services reçoivent déjà ses données.",
  refus: "Le visiteur a refusé. Le pixel publicitaire et les polices reçoivent quand même ses données.",
  accord: "Le visiteur a accepté : les cinq services reçoivent ses données, avec son accord.",
};

const ICONS: Record<Icon, string> = {
  audience: "M5 20V11M12 20V4M19 20v-6",
  pixel: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  video: "M8 5.5v13l11-6.5-11-6.5Z",
  police: "M5 20 12 4l7 16M8 14h8",
  chat: "M4 5h16v11H9l-5 4V5Z",
};

type State = "off" | "bad" | "ok";

const TONE: Record<State, { label: string; sphere: string; ring: string; glow: string; chip: string }> = {
  off: {
    label: "Rien ne part",
    sphere: "radial-gradient(circle at 35% 25%, #34507a 0%, #1b3050 45%, #0f1d32 100%)",
    ring: "#8496b3",
    glow: "none",
    chip: "border-[#56709a] bg-[#12223a] text-[#dbe3ee]",
  },
  bad: {
    label: "Sans accord",
    sphere: "radial-gradient(circle at 35% 25%, #dc2626 0%, #991b1b 50%, #5b1212 100%)",
    ring: "#fca5a5",
    glow: "0 0 34px rgba(248,113,113,0.55)",
    chip: "border-[#fca5a5] bg-[#3a1823] text-[#fecaca]",
  },
  ok: {
    label: "Avec accord",
    sphere: "radial-gradient(circle at 35% 25%, #1f8f6c 0%, #166a4f 50%, #0b3b2c 100%)",
    ring: "#6ee7b7",
    glow: "0 0 34px rgba(110,231,183,0.5)",
    chip: "border-[#6ee7b7] bg-[#0d2e2e] text-[#a7f3d0]",
  },
};

function Sphere({ icon, state }: { icon: Icon; state: State }) {
  const t = TONE[state];
  return (
    <span
      aria-hidden="true"
      className="flex h-16 w-16 items-center justify-center rounded-full transition-[box-shadow,border-color] duration-300 lg:h-[4.5rem] lg:w-[4.5rem]"
      style={{ background: t.sphere, border: `2px solid ${t.ring}`, boxShadow: t.glow }}
    >
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={ICONS[icon]} />
      </svg>
    </span>
  );
}

export function HeroCelestial({
  title,
  subtitle,
  action,
  footer,
}: {
  title: ReactNode;
  subtitle: ReactNode;
  action: ReactNode;
  footer: ReactNode;
}) {
  const [choice, setChoice] = useState<Choice>("refus");
  const consented = choice === "accord";

  const stateOf = (sends: Choice[]): State => (!sends.includes(choice) ? "off" : consented ? "ok" : "bad");

  return (
    <section className="relative isolate overflow-hidden border-b border-[#263b5c] bg-[#0b1626] px-4 pb-14 pt-12 text-white sm:px-6 md:pt-16 lg:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_80%_at_50%_0%,var(--color-navy-deep)_0%,#0b1626_60%,#070f1b_100%)]" />
        <div className="absolute bottom-[8%] left-1/2 h-[45%] w-[min(1000px,110%)] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,179,153,0.16)_0%,rgba(169,194,230,0.1)_45%,transparent_75%)] blur-3xl" />
        <span className="absolute left-[14%] top-[10%] h-1 w-1 rounded-full bg-white/70" />
        <span className="absolute left-[38%] top-[20%] h-1 w-1 rounded-full bg-[#a9c2e6]/80" />
        <span className="absolute right-[18%] top-[12%] h-1 w-1 rounded-full bg-white/60" />
        <span className="absolute right-[8%] top-[30%] h-1 w-1 rounded-full bg-[#ffb399]/70" />
        <span className="absolute left-[6%] top-[34%] h-1 w-1 rounded-full bg-white/50" />
      </div>

      <div className="mx-auto flex max-w-6xl flex-col items-center">
        <div className="rise flex w-full flex-col items-center text-center">
          <h1 className="hero-title max-w-4xl text-balance text-white">{title}</h1>
          <p className="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-[#dbe3ee] md:text-xl">{subtitle}</p>
          <div id="scan" className="mt-8 w-full max-w-xl scroll-mt-28">
            {action}
          </div>
        </div>

        <div className="rise mt-12 w-full" style={{ animationDelay: "120ms" }}>
          <div className="flex flex-col items-center gap-3 text-center">
            <p id="demo-titre" className="font-display text-base font-bold text-white">
              Répondez au bandeau, regardez ce qui part
            </p>
            <div role="group" aria-labelledby="demo-titre" className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-3">
              {CHOICES.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={choice === id}
                  onClick={() => setChoice(id)}
                  className={`font-display min-h-11 whitespace-nowrap rounded-full border-2 px-4 text-sm font-semibold transition-colors ${
                    choice === id
                      ? "border-white bg-white text-[#0b1626]"
                      : "border-[#8496b3] bg-transparent text-white hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-sm text-[#c3cedd]">
              Exemple fictif : un site imaginaire, rien n&apos;est envoyé ni déposé.
            </p>
          </div>

          {/* Scène : l'horizon (le consentement) et les sphères (les destinataires). */}
          <div className="relative mt-6 w-full">
            <svg
              aria-hidden="true"
              viewBox="0 0 1600 560"
              className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
              fill="none"
            >
              <defs>
                <linearGradient id="horizon-glow" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#a9c2e6" stopOpacity="0" />
                  <stop offset="0.3" stopColor="#a9c2e6" stopOpacity="0.8" />
                  <stop offset="0.5" stopColor="#ffb399" />
                  <stop offset="0.7" stopColor="#a9c2e6" stopOpacity="0.8" />
                  <stop offset="1" stopColor="#a9c2e6" stopOpacity="0" />
                </linearGradient>
                <filter id="horizon-blur" x="-10%" y="-30%" width="120%" height="160%">
                  <feGaussianBlur stdDeviation="14" />
                </filter>
              </defs>
              <ellipse
                cx="800"
                cy="760"
                rx="900"
                ry="560"
                stroke="url(#horizon-glow)"
                strokeWidth="18"
                filter="url(#horizon-blur)"
                opacity={consented ? 0.7 : 0.4}
                style={{ transition: "opacity 0.3s" }}
              />
              <ellipse cx="800" cy="760" rx="900" ry="560" stroke="url(#horizon-glow)" strokeWidth="3" />
              <ellipse cx="800" cy="760" rx="1010" ry="650" stroke="#a9c2e6" strokeOpacity="0.25" strokeWidth="1.2" strokeDasharray="6 8" />
            </svg>

            {/* Arc simplifié sous 1024 px, où les sphères passent en grille. */}
            <svg aria-hidden="true" viewBox="0 0 800 70" className="pointer-events-none mx-auto block h-14 w-full max-w-xl lg:hidden" fill="none" preserveAspectRatio="none">
              <defs>
                <linearGradient id="horizon-glow-s" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#a9c2e6" stopOpacity="0" />
                  <stop offset="0.5" stopColor="#ffb399" />
                  <stop offset="1" stopColor="#a9c2e6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 70C140 20 270 6 400 6s260 14 400 64" stroke="url(#horizon-glow-s)" strokeWidth="3" />
            </svg>

            <ul className="relative mx-auto mt-4 grid max-w-2xl grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:mt-0 lg:block lg:aspect-[1600/560] lg:max-w-none">
              {RECIPIENTS.map(({ name, icon, sends, left, top }) => {
                const state = stateOf(sends);
                const t = TONE[state];
                return (
                  <li
                    key={name}
                    className="flex flex-col items-center gap-2 text-center max-sm:last:col-span-2 lg:absolute lg:left-[var(--l)] lg:top-[var(--t)] lg:w-44 lg:-translate-x-1/2 lg:-translate-y-9"
                    style={{ ["--l" as string]: `${left}%`, ["--t" as string]: `${top}%` }}
                  >
                    <Sphere icon={icon} state={state} />
                    <span className="text-sm font-semibold text-white">{name}</span>
                    <span
                      className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${t.chip}`}
                    >
                      {t.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <p
            aria-live="polite"
            className="mx-auto mt-6 max-w-2xl rounded-xl border border-[#34507a] bg-[#12223a]/80 px-4 py-3.5 text-center text-sm text-white sm:text-base"
          >
            {STATUS[choice]}
          </p>
        </div>

        <div className="mt-2 flex w-full flex-col items-center">{footer}</div>
      </div>
    </section>
  );
}
