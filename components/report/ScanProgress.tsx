"use client";

import { useEffect, useState } from "react";

/**
 * Écran d'attente d'une analyse (≈ 25 à 40 s en mode navigateur).
 *
 * Honnête avant tout : le serveur ne transmet pas l'avancement réel, donc
 * aucune barre ne prétend mesurer un pourcentage. Ce qui est affiché est
 * vrai : les trois phases tournent EN MÊME TEMPS dans trois navigateurs
 * distincts, le compteur est le temps réellement écoulé, et la liste dit ce
 * que le moteur vérifie. Animations coupées si le visiteur les réduit.
 */

const PHASES_NAVIGATEUR = [
  {
    code: "A",
    title: "Avant tout choix",
    detail: "Le site est chargé sans toucher au bandeau : tout ce qui part déjà est relevé.",
  },
  {
    code: "B",
    title: "Après refus",
    detail: "Le bouton « Refuser » est cliqué : on regarde ce qui continue malgré tout.",
  },
  {
    code: "C",
    title: "Après acceptation",
    detail: "Tout est accepté : inventaire complet des traceurs et de leurs destinataires.",
  },
] as const;

const PHASES_STATIQUE = [
  { code: "1", title: "Document servi", detail: "Lecture du code de la page et des scripts référencés." },
  { code: "2", title: "En-têtes et DNS", detail: "En-têtes de sécurité, chaînes DNS, masquage de traceurs." },
  { code: "3", title: "Pages légales", detail: "Politique de confidentialité, mentions légales, cookies." },
] as const;

const VERIFICATIONS = [
  "Traceurs déposés avant tout consentement",
  "Refus réellement respecté, ou ignoré",
  "Équilibre visuel des boutons accepter et refuser",
  "Chaîne de consentement publicitaire (TCF)",
  "Empreinte du terminal (canvas, WebGL, audio)",
  "Destinataires hors de l'Union européenne",
  "Durée de vie des cookies de mesure",
  "Mentions obligatoires de la politique de confidentialité",
  "Captures d'écran de chaque phase, pour la preuve",
];

export function ScanProgress({ target, headless }: { target: string; headless: boolean }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const phases = headless ? PHASES_NAVIGATEUR : PHASES_STATIQUE;
  const current = VERIFICATIONS[Math.floor(seconds / 3) % VERIFICATIONS.length];
  const host = (() => {
    try {
      return new URL(target).host;
    } catch {
      return target;
    }
  })();
  const longer = seconds >= (headless ? 50 : 20);

  return (
    <div className="mx-auto max-w-5xl px-5 py-14" role="status" aria-busy="true" aria-live="polite">
      <p className="tech text-[12px] text-flame">Analyse en cours</p>
      <h1 className="display mt-2 break-all text-3xl text-ink-2 sm:text-4xl">{host}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        {headless
          ? "Trois navigateurs travaillent en même temps sur votre site. Comptez une trentaine de secondes."
          : "Analyse du document servi, sans navigateur. Quelques secondes."}
      </p>

      {/* Les trois phases, toutes en cours */}
      <ol className="mt-8 grid gap-4 md:grid-cols-3">
        {phases.map((p) => (
          <li key={p.code} className="rounded-2xl bg-surface p-5 ring-1 ring-line">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-flame font-display text-sm font-bold text-on-primary"
              >
                {p.code}
              </span>
              <span className="display text-lg text-ink-2">{p.title}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">{p.detail}</p>
            <div aria-hidden="true" className="scan-track mt-4 h-1.5 overflow-hidden rounded-full bg-line">
              <span className="scan-bar block h-full w-1/3 rounded-full bg-flame" />
            </div>
          </li>
        ))}
      </ol>

      {/* Ce qui est vérifié, au fil de l'eau */}
      <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-surface p-5 ring-1 ring-line sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="tech text-[12px] text-muted">Le moteur vérifie notamment</p>
          <p key={current} className="scan-fade mt-1 font-display text-[16px] font-semibold text-ink-2">
            {current}
          </p>
        </div>
        <p className="shrink-0 font-mono text-sm text-muted">
          <span className="tabular text-2xl font-bold text-ink-2">{seconds}</span> s écoulées
        </p>
      </div>

      {longer ? (
        <p className="mt-4 text-sm leading-relaxed text-muted">
          C&apos;est un peu plus long que d&apos;habitude : le site est lourd ou lent à répondre. Nous
          continuons ; si l&apos;analyse en navigateur n&apos;aboutit pas, le rapport l&apos;indiquera et
          s&apos;appuiera sur l&apos;analyse du document servi.
        </p>
      ) : null}

      <p className="sr-only">Analyse de {host} en cours, {seconds} secondes écoulées.</p>
    </div>
  );
}
