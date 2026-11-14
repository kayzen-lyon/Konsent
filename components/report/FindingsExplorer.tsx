"use client";

import { createContext, useContext, useEffect, useId, useMemo, useState } from "react";
import { SEVERITY_LABELS } from "@/lib/rulepack/labels";
import type { Severity } from "@/lib/rulepack/types";

/** Ce que l'explorateur sait d'un constat : sérialisable, sans le référentiel. */
export interface ExplorerFinding {
  ruleId: string;
  severity: Severity;
  pillar: string;
  /** Texte indexé pour la recherche (titre, messages, correctif). */
  text: string;
}

export interface ExplorerPillar {
  id: string;
  label: string;
}

const SEVERITIES: readonly Severity[] = ["CRITICAL", "MAJOR", "MODERATE", "MINOR", "INFO"];

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

interface FilterState {
  active: boolean;
  visible: ReadonlySet<string>;
  visiblePillars: ReadonlySet<string>;
}

/** Par défaut, tout est visible : c'est aussi le rendu serveur et sans JS. */
const FilterContext = createContext<FilterState>({
  active: false,
  visible: new Set(),
  visiblePillars: new Set(),
});

/**
 * Le filtrage masque à l'écran et jamais sur le papier (`print:block`) : un
 * rapport imprimé avec un filtre oublié deviendrait un rapport partiel qui
 * ne le dit pas.
 */
const HIDDEN = "hidden print:block";

/**
 * Mode compact : chaque constat tient sur une ligne (titre, gravité, durée).
 * Limité à `@media screen` — le papier reçoit toujours la vue détaillée, pour
 * la même raison que les filtres. Une feuille locale plutôt qu'une classe
 * utilitaire : le basculement porte sur des dizaines d'éléments marqués
 * `.finding-detail` par le rendu serveur.
 */
const COMPACT_CSS = `@media screen {
[data-compact="true"] .finding-detail { display: none !important; }
[data-compact="true"] .finding { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1rem; padding-top: 0.625rem; padding-bottom: 0.625rem; }
[data-compact="true"] .finding-main { flex: 1 1 16rem; }
[data-compact="true"] .finding-title { margin-top: 0; }
}`;

export function FindingGate({ ruleId, children }: { ruleId: string; children: React.ReactNode }) {
  const { active, visible } = useContext(FilterContext);
  return <div className={active && !visible.has(ruleId) ? HIDDEN : undefined}>{children}</div>;
}

export function PillarGate({ pillar, children }: { pillar: string; children: React.ReactNode }) {
  const { active, visiblePillars } = useContext(FilterContext);
  return <div className={active && !visiblePillars.has(pillar) ? HIDDEN : undefined}>{children}</div>;
}

function Toggle({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`font-display inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${
        pressed
          ? "border-flame bg-flame text-on-primary"
          : "border-line text-ink-2 hover:border-flame hover:text-flame"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Filtres des constats : gravité, pilier, recherche texte.
 *
 * Les constats eux-mêmes sont rendus par le serveur et passés en `children` ;
 * ce composant ne fait que décider lesquels s'affichent. Sans JavaScript, les
 * commandes n'apparaissent pas et tous les constats restent visibles.
 */
export function FindingsExplorer({
  findings,
  pillars,
  children,
}: {
  findings: readonly ExplorerFinding[];
  pillars: readonly ExplorerPillar[];
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [severities, setSeverities] = useState<ReadonlySet<Severity>>(new Set());
  const [pillarSel, setPillarSel] = useState<ReadonlySet<string>>(new Set());
  const [query, setQuery] = useState("");
  const [compact, setCompact] = useState(false);
  const searchId = useId();
  useEffect(() => setReady(true), []);

  const toggle = <T,>(set: ReadonlySet<T>, value: T): ReadonlySet<T> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const state = useMemo<FilterState>(() => {
    const q = fold(query.trim());
    const matches = findings.filter(
      (f) =>
        (severities.size === 0 || severities.has(f.severity)) &&
        (pillarSel.size === 0 || pillarSel.has(f.pillar)) &&
        (q === "" || fold(f.text).includes(q)),
    );
    return {
      active: severities.size > 0 || pillarSel.size > 0 || q !== "",
      visible: new Set(matches.map((f) => f.ruleId)),
      visiblePillars: new Set(matches.map((f) => f.pillar)),
    };
  }, [findings, severities, pillarSel, query]);

  const shown = state.active ? state.visible.size : findings.length;
  const presentSeverities = SEVERITIES.filter((s) => findings.some((f) => f.severity === s));

  return (
    <FilterContext.Provider value={state}>
      {ready && findings.length > 0 ? (
        <div className="mb-6 rounded-3xl bg-surface-low p-5 ring-1 ring-line print:hidden">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <fieldset>
              <legend className="tech text-[10px] text-muted">Filtrer par gravité</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {presentSeverities.map((s) => (
                  <Toggle key={s} pressed={severities.has(s)} onClick={() => setSeverities(toggle(severities, s))}>
                    {SEVERITY_LABELS[s]}
                    <span className="tabular text-[11px] opacity-80">
                      ({findings.filter((f) => f.severity === s).length})
                    </span>
                  </Toggle>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="tech text-[10px] text-muted">Filtrer par pilier</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {pillars.map((p) => (
                  <Toggle key={p.id} pressed={pillarSel.has(p.id)} onClick={() => setPillarSel(toggle(pillarSel, p.id))}>
                    {p.label}
                    <span className="tabular text-[11px] opacity-80">
                      ({findings.filter((f) => f.pillar === p.id).length})
                    </span>
                  </Toggle>
                ))}
              </div>
            </fieldset>
          </div>

          <fieldset className="mt-4">
            <legend className="tech text-[10px] text-muted">Affichage des constats</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              <Toggle pressed={!compact} onClick={() => setCompact(false)}>
                Détaillé
              </Toggle>
              <Toggle pressed={compact} onClick={() => setCompact(true)}>
                Compact
              </Toggle>
            </div>
          </fieldset>

          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div className="min-w-0 flex-1">
              <label htmlFor={searchId} className="tech text-[10px] text-muted">
                Rechercher dans les constats
              </label>
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex. : cookie, Google, politique…"
                className="mt-2 block min-h-11 w-full rounded-full border border-line bg-surface px-4 text-sm text-ink-2 placeholder:text-muted"
              />
            </div>
            {state.active ? (
              <button
                type="button"
                onClick={() => {
                  setSeverities(new Set());
                  setPillarSel(new Set());
                  setQuery("");
                }}
                className="font-display min-h-11 rounded-full px-3 text-[13px] font-semibold text-flame underline underline-offset-2"
              >
                Réinitialiser les filtres
              </button>
            ) : null}
          </div>

          <p role="status" className="mt-3 text-[13px] text-ink-2">
            {shown === 0
              ? "Aucun constat ne correspond à ces filtres."
              : `${shown} constat${shown > 1 ? "s" : ""} affiché${shown > 1 ? "s" : ""} sur ${findings.length}.`}
            {state.active ? (
              <span className="text-muted"> L&apos;impression restitue toujours l&apos;ensemble des constats.</span>
            ) : null}
            {compact ? (
              <span className="text-muted"> Vue compacte : une ligne par constat ; l&apos;impression reste détaillée.</span>
            ) : null}
          </p>
        </div>
      ) : null}
      <style>{COMPACT_CSS}</style>
      <div data-compact={compact ? "true" : undefined}>{children}</div>
    </FilterContext.Provider>
  );
}
