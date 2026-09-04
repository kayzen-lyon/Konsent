"use client";

import { useEffect, useState } from "react";

/**
 * Fenêtre de terminal du héros.
 *
 * Elle rejoue une trace d'analyse *représentative*, tirée d'observations
 * réelles produites par le moteur. Elle est explicitement étiquetée comme
 * une démonstration : le produit s'interdit de faire passer une animation
 * pour un résultat mesuré.
 */

interface Line {
  tag: "INFO" | "SCAN" | "WARN" | "CRIT" | "OK";
  text: string;
}

const SCRIPT: readonly Line[] = [
  { tag: "INFO", text: "Contexte navigateur neuf — 0 cookie, 0 stockage" },
  { tag: "SCAN", text: "Phase A · chargement, aucune interaction" },
  { tag: "WARN", text: "googletagmanager.com — conteneur chargé" },
  { tag: "CRIT", text: "connect.facebook.net — _fbp déposé (90 j)" },
  { tag: "CRIT", text: "google-analytics.com — _ga déposé (400 j)" },
  { tag: "WARN", text: "fonts.gstatic.com — IP transmise (US)" },
  { tag: "INFO", text: "Bandeau affiché à T+2,1 s" },
  { tag: "CRIT", text: "3 traceurs déposés AVANT toute réponse possible" },
  { tag: "SCAN", text: "Phase B · clic sur « Tout refuser »" },
  { tag: "CRIT", text: "_fbp toujours présent après refus" },
  { tag: "OK", text: "Analyse terminée — score 28/100 (E)" },
];

const TAG_COLOR: Record<Line["tag"], string> = {
  INFO: "text-slate-400",
  SCAN: "text-sky-400",
  WARN: "text-amber-400",
  CRIT: "text-red-400",
  OK: "text-emerald-400",
};

export function ScanTerminal() {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (shown >= SCRIPT.length) {
      // Boucle après une pause, pour que le visiteur arrivé en retard voie
      // la démonstration depuis le début.
      const restart = setTimeout(() => setShown(0), 5200);
      return () => clearTimeout(restart);
    }
    const timer = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 420 : 340);
    return () => clearTimeout(timer);
  }, [shown]);

  return (
    <div className="overflow-hidden rounded-xl bg-[#1a1a1a] shadow-lg ring-1 ring-white/10">
      {/* Barre de fenêtre */}
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.04] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 font-mono text-[11px] text-white/40">
          konsent — analyse en cours
        </span>
      </div>

      <div className="h-[286px] overflow-hidden p-4 font-mono text-[12px] leading-[1.65] sm:text-[12.5px]">
        {SCRIPT.slice(0, shown).map((line, i) => (
          <div key={i} className="flex gap-2.5">
            <span className={`shrink-0 ${TAG_COLOR[line.tag]}`}>[{line.tag}]</span>
            <span
              className={
                line.tag === "CRIT"
                  ? "text-red-200"
                  : line.tag === "OK"
                    ? "text-emerald-200"
                    : "text-white/70"
              }
            >
              {line.text}
            </span>
          </div>
        ))}
        {shown < SCRIPT.length ? (
          <span className="caret inline-block text-flame-soft">▊</span>
        ) : null}
      </div>

      <p className="border-t border-white/10 px-4 py-2 font-mono text-[10px] text-white/35">
        Trace de démonstration, représentative d&apos;observations réelles. Lancez une analyse
        pour obtenir la vôtre.
      </p>
    </div>
  );
}
