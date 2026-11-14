"use client";

import { useEffect, useState } from "react";
import { applyPref, readPref, type PrefName } from "./theme";

/**
 * Réglages d'affichage du pied de page : taille du texte, contraste,
 * animations. Chaque groupe est un `fieldset` de boutons à état
 * (`aria-pressed`), comme le sélecteur de thème voisin.
 */
const GROUPS: { name: PrefName; legend: string; options: { value: string | null; label: string }[] }[] = [
  {
    name: "text",
    legend: "Taille du texte",
    options: [
      { value: null, label: "A" },
      { value: "lg", label: "A+" },
      { value: "xl", label: "A++" },
    ],
  },
  {
    name: "contrast",
    legend: "Contraste",
    options: [
      { value: null, label: "Normal" },
      { value: "high", label: "Renforcé" },
    ],
  },
  {
    name: "motion",
    legend: "Animations",
    options: [
      { value: null, label: "Système" },
      { value: "reduce", label: "Réduites" },
    ],
  },
];

const OPTION_LABEL: Record<string, string> = {
  A: "Taille normale",
  "A+": "Texte agrandi",
  "A++": "Texte très agrandi",
};

export function DisplayPrefs() {
  const [values, setValues] = useState<Record<PrefName, string | null> | null>(null);

  useEffect(() => {
    setValues({ text: readPref("text"), contrast: readPref("contrast"), motion: readPref("motion") });
  }, []);

  function set(name: PrefName, value: string | null) {
    applyPref(name, value);
    setValues((v) => (v ? { ...v, [name]: value } : v));
  }

  return (
    <div className="flex flex-wrap gap-3">
      {GROUPS.map((group) => (
        <fieldset
          key={group.name}
          className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.06] p-1"
        >
          <legend className="sr-only">{group.legend}</legend>
          <span aria-hidden="true" className="font-display px-2.5 text-[11px] font-semibold text-white/70">
            {group.legend}
          </span>
          {group.options.map((opt) => {
            const active = values !== null && values[group.name] === opt.value;
            return (
              <button
                key={opt.label}
                type="button"
                aria-pressed={active}
                onClick={() => set(group.name, opt.value)}
                className={`font-display flex min-h-9 items-center rounded-full px-3 text-xs font-semibold transition-colors ${
                  active ? "bg-white text-navy-deep" : "text-white/80 hover:text-white"
                }`}
              >
                {opt.label}
                {OPTION_LABEL[opt.label] ? (
                  <span className="sr-only"> : {OPTION_LABEL[opt.label]}</span>
                ) : null}
              </button>
            );
          })}
        </fieldset>
      ))}
    </div>
  );
}
