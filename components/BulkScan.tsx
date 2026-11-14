"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Pill } from "@/components/primitives";
import {
  BULK_MAX,
  MODE_LABELS,
  STATUS_LABELS,
  exportFilename,
  formatDelay,
  parseTargets,
  retryAfterSeconds,
  rowFromResponse,
  sortRows,
  summarize,
  toCsv,
  toJson,
  type BulkRow,
  type ScanApiResponse,
  type SortDir,
  type SortKey,
} from "@/lib/bulk";
import { DISCLAIMER_SHORT } from "@/lib/disclaimer";

const CONCURRENCY = 2;

const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "host", label: "Adresse" },
  { key: "grade", label: "Note" },
  { key: "score", label: "Score", numeric: true },
  { key: "critical", label: "Écarts critiques", numeric: true },
  { key: "total", label: "Total écarts", numeric: true },
  { key: "vendors", label: "Destinataires", numeric: true },
  { key: "outsideEea", label: "Hors EEE", numeric: true },
  { key: "mode", label: "Mode d'analyse" },
  { key: "status", label: "Statut" },
];

function scoreTone(score: number) {
  if (score >= 80) return "ok" as const;
  if (score >= 50) return "warn" as const;
  return "danger" as const;
}

const STATUS_TONES = {
  pending: "neutral",
  running: "flame",
  ok: "ok",
  error: "danger",
  skipped: "warn",
} as const;

const formatNumber = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

function download(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

/** Analyse en lot : jusqu'à 20 adresses, deux analyses à la fois, résultats en tableau. */
export function BulkScan() {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [running, setRunning] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [rateLimit, setRateLimit] = useState<{ seconds: number | null; message?: string } | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const uid = useId();
  const ids = {
    input: `bulk-input-${uid}`,
    hint: `bulk-hint-${uid}`,
    error: `bulk-error-${uid}`,
    preview: `bulk-preview-${uid}`,
    progress: `bulk-progress-${uid}`,
  };

  const parsed = useMemo(() => parseTargets(text), [text]);

  // Quitter la page interrompt les analyses en cours.
  useEffect(() => () => controllerRef.current?.abort(), []);

  const done = rows.filter((r) => r.status === "ok" || r.status === "error").length;
  const finished = rows.length > 0 && !running;
  const summary = useMemo(() => summarize(rows), [rows]);
  const displayed = useMemo(() => (sort ? sortRows(rows, sort.key, sort.dir) : rows), [rows, sort]);

  function update(index: number, patch: Partial<BulkRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function start(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (running) return;
    const targets = parsed.targets;
    if (targets.length === 0) {
      setInputError("Indiquez au moins une adresse valide, par exemple exemple.fr.");
      return;
    }
    setInputError(null);
    setRateLimit(null);
    setStopped(false);
    setSort(null);
    setRows(targets.map((t) => ({ ...t, status: "pending" })));
    setRunning(true);

    const controller = new AbortController();
    controllerRef.current = controller;
    // Après un 429 : plus aucune analyse lancée, celles en cours se terminent.
    let halted = false;
    let next = 0;

    async function worker() {
      while (!halted && !controller.signal.aborted) {
        const index = next++;
        const target = targets[index];
        if (!target) return;
        update(index, { status: "running" });
        try {
          const res = await fetch(`/api/scan?url=${encodeURIComponent(target.url)}`, {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          });
          const data = (await res.json().catch(() => null)) as
            | (Partial<ScanApiResponse> & { error?: string })
            | null;
          if (res.status === 429) {
            halted = true;
            setRateLimit({ seconds: retryAfterSeconds(res.headers.get("Retry-After")), message: data?.error });
            update(index, { status: "skipped", error: "Limite de débit atteinte." });
            return;
          }
          if (!res.ok || !data?.scan || !data.findings || !data.vendors) {
            update(index, {
              status: "error",
              error: data?.error ?? `L'analyse n'a pas abouti (code ${res.status}).`,
            });
            continue;
          }
          update(index, rowFromResponse(target, data as ScanApiResponse));
        } catch {
          if (controller.signal.aborted) {
            update(index, { status: "skipped", error: "Interrompue." });
            return;
          }
          update(index, { status: "error", error: "Le service n'a pas répondu." });
        }
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    setRows((prev) => prev.map((r) => (r.status === "pending" ? { ...r, status: "skipped" } : r)));
    if (controllerRef.current === controller) controllerRef.current = null;
    setRunning(false);
  }

  function stop() {
    setStopped(true);
    controllerRef.current?.abort();
  }

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev?.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  function exportFile(kind: "csv" | "json") {
    const now = new Date();
    if (kind === "csv") download(toCsv(displayed), exportFilename(now, "csv"), "text/csv;charset=utf-8");
    else download(toJson(displayed, DISCLAIMER_SHORT, now), exportFilename(now, "json"), "application/json");
  }

  const statusMessage = running
    ? `${done} sur ${rows.length} terminées`
    : finished
      ? `${stopped ? "Lot arrêté" : rateLimit ? "Lot interrompu par la limite de débit" : "Lot terminé"} : ${done} sur ${rows.length} terminées.`
      : "";

  const rejected = parsed.invalid.length + parsed.duplicates.length + parsed.overflow.length;

  return (
    <div className="space-y-8">
      <section
        className="rounded-3xl border-l-2 border-warn bg-surface p-6 ring-1 ring-line shadow-md"
        aria-labelledby={`${uid}-limit`}
      >
        <p className="tech text-[10px] text-warn">Avant de lancer</p>
        <h2 id={`${uid}-limit`} className="display mt-2 text-xl text-ink-2">
          {BULK_MAX} analyses par tranche de 10 minutes
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-muted">
          <li>
            Chaque adresse compte pour une analyse. La limite de {BULK_MAX} analyses par visiteur et par
            tranche de 10 minutes inclut aussi les analyses lancées ailleurs sur le site : un lot de{" "}
            {BULK_MAX} adresses l&apos;épuise à lui seul.
          </li>
          <li>Si la limite est atteinte, le lot s&apos;arrête proprement et indique le délai d&apos;attente.</li>
          <li>
            Rien n&apos;est conservé côté serveur : les résultats restent dans cette page et disparaissent à sa
            fermeture. Exportez-les si vous souhaitez les garder.
          </li>
        </ul>
      </section>

      <form onSubmit={start} noValidate className="rounded-3xl bg-surface p-6 ring-1 ring-line shadow-md">
        <label htmlFor={ids.input} className="tech mb-2 block text-[10px] text-muted">
          Adresses à analyser ({BULK_MAX} au maximum)
        </label>
        <textarea
          id={ids.input}
          name="adresses"
          rows={8}
          spellCheck={false}
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={running}
          placeholder={"exemple.fr\nboutique.exemple.com, https://autre-site.fr"}
          aria-invalid={inputError ? true : undefined}
          aria-describedby={[ids.hint, ids.preview, inputError ? ids.error : ""].filter(Boolean).join(" ")}
          className="w-full rounded-3xl border border-line-2 bg-surface px-5 py-4 font-mono text-[15px] text-ink-2 placeholder:text-muted transition disabled:opacity-70"
        />
        <p id={ids.hint} className="mt-2 text-[13px] text-muted">
          Une adresse par ligne, ou séparées par des virgules ou des espaces. Les doublons d&apos;un même
          domaine sont écartés.
        </p>
        <p id={ids.preview} className="mt-1 text-[13px] text-ink-2">
          <span className="tabular font-semibold">{parsed.targets.length}</span> adresse
          {parsed.targets.length > 1 ? "s" : ""} retenue{parsed.targets.length > 1 ? "s" : ""}
          {rejected > 0 ? (
            <span className="text-muted">
              {parsed.duplicates.length ? ` · ${parsed.duplicates.length} doublon(s) écarté(s)` : ""}
              {parsed.invalid.length ? ` · ${parsed.invalid.length} saisie(s) invalide(s) : ${parsed.invalid.slice(0, 5).join(", ")}${parsed.invalid.length > 5 ? "…" : ""}` : ""}
              {parsed.overflow.length ? ` · ${parsed.overflow.length} au-delà de ${BULK_MAX}, non retenue(s)` : ""}
            </span>
          ) : null}
        </p>
        {inputError ? (
          <p id={ids.error} role="alert" className="mt-2 text-sm text-crit">
            {inputError}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={running}
            className="btn-primary tech rounded-full bg-flame px-6 py-3.5 text-[11px] text-on-primary shadow-md hover:bg-flame-dark disabled:cursor-wait disabled:opacity-70"
          >
            {running
              ? "Analyse en cours…"
              : parsed.targets.length > 0
                ? `Lancer ${parsed.targets.length} analyse${parsed.targets.length > 1 ? "s" : ""}`
                : "Lancer l'analyse"}
          </button>
          {running ? (
            <button
              type="button"
              onClick={stop}
              className="tech rounded-full border-2 border-line-2 px-6 py-3 text-[11px] text-ink-2 transition hover:bg-surface-high"
            >
              Arrêter
            </button>
          ) : null}
        </div>
      </form>

      {rows.length > 0 ? (
        <section aria-labelledby={`${uid}-results`} className="space-y-5">
          <div className="rounded-3xl bg-surface p-6 ring-1 ring-line shadow-md">
            <h2 id={`${uid}-results`} className="display text-2xl text-ink-2">
              Résultats du lot
            </h2>
            <p id={ids.progress} className="tech mt-4 text-[10px] text-muted">
              Progression
            </p>
            <progress
              className="mt-2 block h-2 w-full overflow-hidden rounded-full accent-[var(--color-flame)]"
              value={done}
              max={rows.length}
              aria-labelledby={ids.progress}
            />
            <p role="status" className="mt-2 text-[14px] text-ink-2">
              {statusMessage}
            </p>
            {rateLimit ? (
              <div role="alert" className="mt-4 rounded-3xl border-l-2 border-warn bg-warn-bg p-5">
                <p className="font-bold text-ink-2">Limite de débit atteinte : le lot a été arrêté.</p>
                <p className="mt-1 text-[14px] leading-relaxed text-ink-2">
                  Le service accepte {BULK_MAX} analyses par tranche de 10 minutes.{" "}
                  {rateLimit.seconds !== null
                    ? `Vous pourrez relancer les adresses non analysées dans ${formatDelay(rateLimit.seconds)}.`
                    : rateLimit.message ?? "Patientez quelques minutes avant de relancer les adresses non analysées."}{" "}
                  Les résultats déjà obtenus restent affichés et exportables.
                </p>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              {(["csv", "json"] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => exportFile(kind)}
                  disabled={done === 0}
                  className="tech rounded-full border-2 border-flame px-5 py-2.5 text-[11px] text-flame transition hover:bg-surface-high disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Exporter en {kind.toUpperCase()}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-muted">
              Le CSV s&apos;ouvre directement dans Excel (séparateur « ; », encodage UTF-8). L&apos;export suit
              l&apos;ordre de tri affiché.
            </p>
          </div>

          <div className="overflow-x-auto rounded-3xl bg-surface ring-1 ring-line shadow-md">
            <table className="w-full min-w-[960px] text-left text-sm">
              <caption className="sr-only">
                Résultats de l&apos;analyse en lot, {rows.length} adresse{rows.length > 1 ? "s" : ""}.
                {sort
                  ? ` Trié par ${COLUMNS.find((c) => c.key === sort.key)?.label}, ordre ${sort.dir === "asc" ? "croissant" : "décroissant"}.`
                  : " Les en-têtes de colonne permettent de trier."}
              </caption>
              <thead className="bg-ink text-white">
                <tr>
                  {COLUMNS.map((col) => {
                    const active = sort?.key === col.key;
                    return (
                      <th
                        key={col.key}
                        scope="col"
                        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                        className={`px-4 py-3 font-semibold ${col.numeric ? "text-right" : ""}`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleSort(col.key)}
                          className="inline-flex items-center gap-1 rounded text-left font-semibold hover:underline"
                        >
                          {col.label}
                          <span aria-hidden="true" className="text-[10px] text-white/70">
                            {active ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}
                          </span>
                        </button>
                      </th>
                    );
                  })}
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Rapport
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((r) => (
                  <tr key={r.host} className="border-t border-line align-top">
                    <th scope="row" className="max-w-[16rem] break-all px-4 py-3 font-mono text-[13px] font-normal text-ink-2">
                      {r.host}
                      {r.url.replace(/^https:\/\/(www\.)?/, "") !== r.host ? (
                        <span className="block text-[11px] text-muted">{r.url}</span>
                      ) : null}
                    </th>
                    <td className="px-4 py-3 text-ink-2">
                      {r.grade && r.score !== undefined ? (
                        <Pill tone={scoreTone(r.score)}>{r.grade}</Pill>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="tabular px-4 py-3 text-right text-ink-2">
                      {r.score !== undefined ? <>{r.score}<span className="text-muted"> / 100</span></> : "—"}
                    </td>
                    <td className="tabular px-4 py-3 text-right">
                      {r.critical !== undefined ? (
                        <span className={r.critical > 0 ? "font-semibold text-crit-text" : "text-ok"}>{r.critical}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="tabular px-4 py-3 text-right text-ink-2">{r.total ?? "—"}</td>
                    <td className="tabular px-4 py-3 text-right text-ink-2">{r.vendors ?? "—"}</td>
                    <td className="tabular px-4 py-3 text-right">
                      {r.outsideEea !== undefined ? (
                        <span className={r.outsideEea > 0 ? "font-semibold text-crit-text" : "text-ok"}>{r.outsideEea}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-2">
                      {r.mode ? MODE_LABELS[r.mode] : "—"}
                      {r.degraded ? <span className="block text-[11px] text-muted">analyse dégradée</span> : null}
                    </td>
                    <td className="px-4 py-3">
                      <Pill tone={STATUS_TONES[r.status]}>{STATUS_LABELS[r.status]}</Pill>
                      {r.error ? <span className="mt-1 block max-w-[14rem] text-[12px] text-muted">{r.error}</span> : null}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/scan?url=${encodeURIComponent(r.url)}`}
                        className="text-flame underline underline-offset-2 hover:text-flame-dark"
                      >
                        Rapport<span className="sr-only"> de {r.host}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-line-2 bg-surface-low">
                <tr>
                  <th scope="row" className="px-4 py-3 font-semibold text-ink-2">
                    Synthèse
                    <span className="block text-[11px] font-normal text-muted">
                      {summary.count} analyse{summary.count > 1 ? "s" : ""} réussie{summary.count > 1 ? "s" : ""}
                    </span>
                  </th>
                  <td colSpan={COLUMNS.length} className="px-4 py-3 text-ink-2">
                    {summary.average !== null && summary.best && summary.worst ? (
                      <dl className="flex flex-wrap gap-x-8 gap-y-2">
                        <div>
                          <dt className="tech inline text-[9px] text-muted">Moyenne </dt>
                          <dd className="tabular inline font-semibold">{formatNumber(summary.average)} / 100</dd>
                        </div>
                        <div>
                          <dt className="tech inline text-[9px] text-muted">Meilleur </dt>
                          <dd className="inline">
                            <span className="font-mono text-[13px]">{summary.best.host}</span>{" "}
                            <span className="tabular font-semibold">({summary.best.score})</span>
                          </dd>
                        </div>
                        <div>
                          <dt className="tech inline text-[9px] text-muted">Pire </dt>
                          <dd className="inline">
                            <span className="font-mono text-[13px]">{summary.worst.host}</span>{" "}
                            <span className="tabular font-semibold">({summary.worst.score})</span>
                          </dd>
                        </div>
                      </dl>
                    ) : (
                      <span className="text-muted">Aucune analyse terminée pour l&apos;instant.</span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-[12px] text-muted">
            Un meilleur score signifie moins d&apos;écarts observés, pas une conformité établie. « Hors EEE » :
            destinataires établis hors de l&apos;Espace économique européen (UE, Islande, Liechtenstein, Norvège).
          </p>
        </section>
      ) : null}
    </div>
  );
}
