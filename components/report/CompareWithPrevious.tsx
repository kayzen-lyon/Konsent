"use client";

import { useId, useState } from "react";
import { SEVERITY_LABELS } from "@/lib/rulepack/labels";
import type { Severity } from "@/lib/rulepack/types";

export interface ComparableFinding {
  ruleId: string;
  title: string;
  severity: Severity;
}

export interface ComparableVendor {
  slug: string;
  name: string;
  effectiveJurisdiction?: string;
}

export interface ComparableReport {
  hostname: string;
  score: number;
  grade: string;
  scannedAt: string;
  findings: readonly ComparableFinding[];
  vendors: readonly ComparableVendor[];
}

const MAX_BYTES = 5 * 1024 * 1024;
const SEVERITIES = new Set<string>(["CRITICAL", "MAJOR", "MODERATE", "MINOR", "INFO"]);

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/**
 * Lit la réponse de `/api/scan` (bouton « Données JSON »). Seuls les champs
 * utiles à la comparaison sont retenus ; tout le reste est ignoré. Une
 * structure inattendue lève une erreur lisible plutôt qu'un rapport faux.
 */
function parseExport(raw: string): ComparableReport {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Ce fichier n'est pas un JSON valide.");
  }
  if (!isObj(data) || !isObj(data.scan) || !Array.isArray(data.findings)) {
    throw new Error(
      "Ce fichier ne ressemble pas à un export Konsent : utilisez le bouton « Données JSON » d'un rapport.",
    );
  }
  const scan = data.scan;
  if (typeof scan.score !== "number" || typeof scan.hostname !== "string") {
    throw new Error("L'export ne contient ni score ni nom de domaine exploitables.");
  }
  const findings: ComparableFinding[] = data.findings.flatMap((f) =>
    isObj(f) && typeof f.ruleId === "string"
      ? [
          {
            ruleId: f.ruleId,
            title: typeof f.title === "string" ? f.title : f.ruleId,
            severity: (typeof f.severity === "string" && SEVERITIES.has(f.severity)
              ? f.severity
              : "INFO") as Severity,
          },
        ]
      : [],
  );
  const vendors: ComparableVendor[] = (Array.isArray(data.vendors) ? data.vendors : []).flatMap((v) =>
    isObj(v) && typeof v.slug === "string"
      ? [
          {
            slug: v.slug,
            name: typeof v.name === "string" ? v.name : v.slug,
            ...(typeof v.effectiveJurisdiction === "string"
              ? { effectiveJurisdiction: v.effectiveJurisdiction }
              : {}),
          },
        ]
      : [],
  );
  return {
    hostname: scan.hostname,
    score: scan.score,
    grade: typeof scan.grade === "string" ? scan.grade : "?",
    scannedAt: typeof scan.scannedAt === "string" ? scan.scannedAt : "",
    findings,
    vendors,
  };
}

function diff(previous: ComparableReport, current: ComparableReport) {
  const prevIds = new Set(previous.findings.map((f) => f.ruleId));
  const curIds = new Set(current.findings.map((f) => f.ruleId));
  const prevVendors = new Set(previous.vendors.map((v) => v.slug));
  const curVendors = new Set(current.vendors.map((v) => v.slug));
  return {
    delta: current.score - previous.score,
    resolved: previous.findings.filter((f) => !curIds.has(f.ruleId)),
    added: current.findings.filter((f) => !prevIds.has(f.ruleId)),
    persistent: current.findings.filter((f) => prevIds.has(f.ruleId)),
    vendorsAdded: current.vendors.filter((v) => !prevVendors.has(v.slug)),
    vendorsRemoved: previous.vendors.filter((v) => !curVendors.has(v.slug)),
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "date inconnue";
  return d.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });
}

function FindingList({
  title,
  items,
  empty,
  tone,
}: {
  title: string;
  items: readonly ComparableFinding[];
  empty: string;
  tone: "ok" | "crit" | "muted";
}) {
  const color = { ok: "text-ok", crit: "text-crit-text", muted: "text-ink-2" }[tone];
  return (
    <div className="rounded-3xl bg-surface-low p-4 ring-1 ring-line">
      <h4 className={`font-display text-[14px] font-bold ${color}`}>
        {title} <span className="tabular">({items.length})</span>
      </h4>
      {items.length === 0 ? (
        <p className="mt-2 text-[13px] text-muted">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {items.map((f) => (
            <li key={f.ruleId} className="text-[13px] leading-snug text-ink-2">
              {f.title}{" "}
              <span className="tech text-[9px] text-muted">
                {SEVERITY_LABELS[f.severity]} · {f.ruleId}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Avant / après. Le fichier déposé est lu dans le navigateur
 * (`FileReader`) et comparé au rapport courant, reçu en props sérialisées.
 * Rien ne quitte le poste : aucune requête n'est émise.
 */
export function CompareWithPrevious({ current }: { current: ComparableReport }) {
  const inputId = useId();
  const hintId = useId();
  const [previous, setPrevious] = useState<ComparableReport | null>(null);
  const [error, setError] = useState("");

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError("");
    setPrevious(null);
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError("Fichier trop volumineux (5 Mo au plus) : ce n'est vraisemblablement pas un export Konsent.");
      return;
    }
    try {
      setPrevious(parseExport(await file.text()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Le fichier n'a pas pu être lu.");
    }
  }

  const d = previous ? diff(previous, current) : null;
  const otherSite = previous && previous.hostname !== current.hostname;

  return (
    <div className="rounded-3xl bg-surface p-6 ring-1 ring-line shadow-md">
      <p className="tech text-[10px] text-accent">Avant / après</p>
      <h3 className="display mt-2 text-xl text-ink-2">Comparer avec une analyse précédente</h3>
      <p id={hintId} className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
        Déposez le fichier obtenu auparavant avec le bouton « Données JSON » d&apos;un rapport.
        Il est lu dans votre navigateur et n&apos;est envoyé nulle part.
      </p>
      <div className="mt-4">
        <label htmlFor={inputId} className="tech text-[10px] text-muted">
          Fichier JSON de l&apos;analyse précédente
        </label>
        <input
          id={inputId}
          type="file"
          accept=".json,application/json"
          aria-describedby={hintId}
          onChange={onFile}
          className="mt-2 block w-full max-w-md text-sm text-ink-2 file:mr-3 file:min-h-10 file:rounded-full file:border file:border-line file:bg-surface-high file:px-4 file:font-semibold file:text-ink-2"
        />
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-crit-text">
          {error}
        </p>
      ) : null}

      <p role="status" className="sr-only">
        {previous && d
          ? `Comparaison prête : score ${previous.score} puis ${current.score}, ${d.resolved.length} écart(s) résolu(s), ${d.added.length} nouveau(x), ${d.persistent.length} persistant(s).`
          : ""}
      </p>
      <div>
        {previous && d ? (
          <div className="mt-6 space-y-4">
            {otherSite ? (
              <p className="rounded-3xl bg-warn-bg p-3 text-[13px] text-warn">
                Attention : l&apos;export concerne <strong>{previous.hostname}</strong>, ce rapport{" "}
                <strong>{current.hostname}</strong>. La comparaison reste affichée, mais elle oppose
                deux sites.
              </p>
            ) : null}
            <p className="text-[15px] leading-relaxed text-ink-2">
              Analyse du {formatDate(previous.scannedAt)} : <strong>{previous.score}/100</strong> (
              {previous.grade}) → aujourd&apos;hui : <strong>{current.score}/100</strong> ({current.grade}),{" "}
              <strong className={d.delta > 0 ? "text-ok" : d.delta < 0 ? "text-crit-text" : ""}>
                {d.delta > 0 ? `+${d.delta} points` : d.delta < 0 ? `${d.delta} points` : "score inchangé"}
              </strong>
              . {d.resolved.length} écart{d.resolved.length > 1 ? "s" : ""} résolu
              {d.resolved.length > 1 ? "s" : ""}, {d.added.length} nouveau{d.added.length > 1 ? "x" : ""},{" "}
              {d.persistent.length} persistant{d.persistent.length > 1 ? "s" : ""}.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <FindingList title="Écarts résolus" items={d.resolved} empty="Aucun écart résolu." tone="ok" />
              <FindingList title="Nouveaux écarts" items={d.added} empty="Aucun nouvel écart." tone="crit" />
              <FindingList title="Écarts persistants" items={d.persistent} empty="Aucun écart persistant." tone="muted" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {(
                [
                  ["Destinataires ajoutés", d.vendorsAdded, "Aucun destinataire ajouté.", "text-crit-text"],
                  ["Destinataires retirés", d.vendorsRemoved, "Aucun destinataire retiré.", "text-ok"],
                ] as const
              ).map(([title, list, empty, color]) => (
                <div key={title} className="rounded-3xl bg-surface-low p-4 ring-1 ring-line">
                  <h4 className={`font-display text-[14px] font-bold ${color}`}>
                    {title} <span className="tabular">({list.length})</span>
                  </h4>
                  {list.length === 0 ? (
                    <p className="mt-2 text-[13px] text-muted">{empty}</p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-[13px] text-ink-2">
                      {list.map((v) => (
                        <li key={v.slug}>
                          {v.name}
                          {v.effectiveJurisdiction ? (
                            <span className="font-mono text-[11px] text-muted"> ({v.effectiveJurisdiction})</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
