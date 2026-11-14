"use client";

import { useId, useState, type FormEvent } from "react";

const NOTE_MAX = 500;

type State = "open" | "fixed_pending" | "still_observed";

export interface ActionPlanRow {
  ruleId: string;
  title: string;
  severityLabel: string | null;
  occurrences: number;
  state: State;
  note: string;
}

const STATE_LABELS: Record<State, string> = {
  open: "À traiter",
  fixed_pending: "Déclaré corrigé — à confirmer par la prochaine analyse",
  still_observed: "Toujours observé — déclaré corrigé, mais la dernière analyse le relève encore",
};

/**
 * Plan d'action d'un domaine : les constats de la dernière analyse, avec une
 * case « corrigé » et une note libre par constat.
 *
 * Cocher « corrigé » est une déclaration : la prochaine analyse la confronte
 * à ce qu'elle observe. Le libellé de l'état est écrit en toutes lettres — la
 * couleur seule ne porte aucune information.
 */
export function ActionPlan({
  domainId,
  hostname,
  scannedAt,
  rows,
}: {
  domainId: string;
  hostname: string;
  scannedAt: string | null;
  rows: readonly ActionPlanRow[];
}) {
  return (
    <div className="rounded-3xl border border-line bg-surface p-5">
      <h3 className="font-display text-base font-bold text-ink-2">{hostname}</h3>
      {scannedAt ? (
        <p className="mt-1 text-[13px] text-muted">
          Dernière analyse le {new Date(scannedAt).toLocaleDateString("fr-FR")} ·{" "}
          {rows.length} constat{rows.length > 1 ? "s" : ""}
        </p>
      ) : null}

      {!scannedAt ? (
        <p className="mt-3 text-[14px] text-muted">
          Aucune analyse enregistrée : le plan apparaîtra après le premier passage de la
          surveillance (propriété du domaine vérifiée).
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-[14px] text-muted">
          La dernière analyse ne relève aucun constat sur ce domaine.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.ruleId}>
              <ActionRow domainId={domainId} row={row} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ActionRow({ domainId, row }: { domainId: string; row: ActionPlanRow }) {
  const uid = useId();
  const [fixed, setFixed] = useState(row.state !== "open");
  const [note, setNote] = useState(row.note);
  const [state, setState] = useState<State>(row.state);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const length = [...note].length;
  const tooLong = length > NOTE_MAX;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (tooLong) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/surveillance/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId, ruleId: row.ruleId, status: fixed ? "fixed" : "open", note }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage({ tone: "error", text: data.error ?? "Enregistrement impossible." });
        return;
      }
      // Un constat « toujours observé » le reste tant qu'une nouvelle analyse
      // ne l'a pas confronté : seul le décocher le ramène à « à traiter ».
      setState(fixed ? (state === "still_observed" ? "still_observed" : "fixed_pending") : "open");
      setMessage({ tone: "ok", text: "Enregistré." });
    } catch {
      setMessage({ tone: "error", text: "Le service n'a pas répondu." });
    } finally {
      setBusy(false);
    }
  }

  const fixedId = `${uid}-corrige`;
  const noteId = `${uid}-note`;
  const countId = `${uid}-compte`;
  const stateId = `${uid}-etat`;

  return (
    <form onSubmit={save} className="rounded-2xl border border-line p-4">
      <fieldset>
        <legend className="text-[14px] font-semibold text-ink-2">
          {row.title}
          <span className="tech ml-2 text-[10px] text-muted">{row.ruleId}</span>
        </legend>
        <p className="mt-1 text-[12px] text-muted">
          {row.severityLabel ? <>{row.severityLabel} · </> : null}
          {row.occurrences} occurrence{row.occurrences > 1 ? "s" : ""}
        </p>
        <p
          id={stateId}
          className={`mt-2 inline-block rounded px-2 py-0.5 text-[12px] font-semibold ${
            state === "still_observed"
              ? "bg-warn-bg text-warn"
              : state === "fixed_pending"
                ? "bg-ok-bg text-ok"
                : "bg-surface-high text-ink-2"
          }`}
        >
          {STATE_LABELS[state]}
        </p>

        <div className="mt-3 flex items-center gap-2">
          <input
            id={fixedId}
            type="checkbox"
            checked={fixed}
            onChange={(e) => setFixed(e.target.checked)}
            aria-describedby={stateId}
            className="h-5 w-5 accent-flame"
          />
          <label htmlFor={fixedId} className="text-[14px] text-ink-2">
            Corrigé
          </label>
        </div>

        <div className="mt-3 flex flex-col gap-1">
          <label htmlFor={noteId} className="text-[13px] font-semibold text-ink-2">
            Note (facultative)
          </label>
          <textarea
            id={noteId}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-describedby={countId}
            aria-invalid={tooLong || undefined}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-[14px] text-ink-2"
          />
          <p id={countId} className={`text-[12px] ${tooLong ? "text-crit-text" : "text-muted"}`}>
            {length} / {NOTE_MAX} caractères{tooLong ? " — trop long" : ""}
          </p>
        </div>
      </fieldset>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy || tooLong}
          className="font-display min-h-11 rounded-full border-2 border-flame px-5 text-sm font-bold text-flame transition-colors hover:bg-surface-high disabled:opacity-60"
        >
          Enregistrer<span className="sr-only"> — {row.title}</span>
        </button>
        <span role="status" aria-live="polite" className="text-[13px]">
          {message ? (
            <span className={message.tone === "ok" ? "text-ink-2" : "text-crit-text"}>
              {message.tone === "error" ? "Erreur : " : null}
              {message.text}
            </span>
          ) : null}
        </span>
      </div>
    </form>
  );
}
