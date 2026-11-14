"use client";

import { useState } from "react";
import {
  ArchiveError,
  MAX_ARCHIVE_BYTES,
  verifyArchive,
  type FileStatus,
  type VerificationReport,
} from "@/lib/tools/evidence-verifier";

/**
 * Vérificateur d'archive de preuve. L'archive est lue en mémoire par le
 * navigateur (FileReader / arrayBuffer) : elle n'est jamais téléversée.
 */

const buttonClass =
  "btn-primary inline-flex min-h-11 items-center justify-center rounded-full bg-flame px-6 py-3 text-sm font-semibold text-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame disabled:opacity-60";

const STATUS: Record<FileStatus, { label: string; cls: string }> = {
  ok: { label: "intact", cls: "bg-ok-bg text-ok" },
  altered: { label: "modifié", cls: "bg-crit-bg text-crit-text" },
  missing: { label: "absent", cls: "bg-crit-bg text-crit-text" },
  unreadable: { label: "corrompu", cls: "bg-crit-bg text-crit-text" },
  unlisted: { label: "non couvert", cls: "bg-warn-bg text-warn" },
};

export default function EvidenceVerifier() {
  const [file, setFile] = useState<File | null>(null);
  const [referenceKey, setReferenceKey] = useState("");
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setReport(null);
    setError("");
    if (!file) {
      setError("Choisissez d'abord une archive .zip.");
      return;
    }
    if (file.size > MAX_ARCHIVE_BYTES) {
      setError("Cette archive dépasse 25 Mo : ce n'est pas une archive Konsent.");
      return;
    }
    setBusy(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      setReport(await verifyArchive(bytes, referenceKey));
    } catch (err) {
      setError(err instanceof ArchiveError ? err.message : "L'archive n'a pas pu être lue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-10">
      <form
        onSubmit={run}
        className="space-y-6 rounded-3xl border border-line bg-surface p-6"
        aria-labelledby="ev-form-title"
        noValidate
      >
        <h2 id="ev-form-title" className="display text-xl text-ink-2">
          Archive à vérifier
        </h2>
        <div>
          <label htmlFor="ev-file" className="block text-sm font-medium text-ink-2">
            Archive de preuve (.zip)
          </label>
          <p id="ev-file-hint" className="mt-1 text-sm text-muted">
            Fichier « konsent-preuve-….zip » obtenu depuis un rapport d&apos;audit. 25 Mo au plus.
          </p>
          <input
            id="ev-file"
            type="file"
            accept=".zip,application/zip"
            aria-describedby={`ev-file-hint${error ? " ev-error" : ""}`}
            aria-invalid={error ? true : undefined}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setReport(null);
              setError("");
            }}
            className="mt-2 block w-full rounded-2xl border border-line-2 bg-surface-low px-4 py-3 text-sm text-ink-2 file:mr-4 file:rounded-full file:border-0 file:bg-flame file:px-4 file:py-2 file:text-sm file:font-semibold file:text-on-primary"
          />
        </div>
        <div>
          <label htmlFor="ev-key" className="block text-sm font-medium text-ink-2">
            Clé publique de référence <span className="font-normal text-muted">(facultatif)</span>
          </label>
          <p id="ev-key-hint" className="mt-1 text-sm text-muted">
            Clé PEM ou empreinte SHA-256 communiquée séparément par l&apos;émetteur. Sans elle,
            l&apos;outil prouve la cohérence interne de l&apos;archive, pas son origine.
          </p>
          <textarea
            id="ev-key"
            rows={3}
            spellCheck={false}
            value={referenceKey}
            onChange={(e) => setReferenceKey(e.target.value)}
            aria-describedby="ev-key-hint"
            placeholder="-----BEGIN PUBLIC KEY-----"
            className="mt-2 w-full rounded-2xl border border-line-2 bg-surface px-4 py-3 font-mono text-sm text-ink-2 outline-none"
          />
        </div>
        <button type="submit" className={buttonClass} disabled={busy}>
          {busy ? "Vérification…" : "Vérifier l'archive"}
        </button>
        {error ? (
          <p id="ev-error" role="alert" className="rounded-2xl border border-crit/30 bg-crit-bg px-4 py-3 text-sm text-crit-text">
            {error}
          </p>
        ) : null}
      </form>

      <div role="status" aria-live="polite" className="sr-only">
        {busy ? "Vérification en cours." : report ? `Vérification terminée : ${verdictText(report).title}.` : ""}
      </div>

      {report ? <Report report={report} /> : null}
    </div>
  );
}

function verdictText(r: VerificationReport): { title: string; body: string; cls: string } {
  if (r.verdict === "authentic") {
    return {
      title: "Archive intègre et signature valide",
      body: "Chaque fichier correspond à son empreinte, et la liste des empreintes porte une signature Ed25519 valide.",
      cls: "border-ok/40 bg-ok-bg/40",
    };
  }
  if (r.verdict === "altered") {
    return {
      title: "Archive modifiée ou incohérente",
      body: "Au moins un contrôle a échoué. Le contenu ne peut pas être considéré comme celui produit à l'origine.",
      cls: "border-crit/30 bg-crit-bg",
    };
  }
  return {
    title: "Vérification incomplète",
    body: "Aucune altération détectée, mais la signature n'a pas pu être confirmée ou un fichier n'est couvert par aucune empreinte.",
    cls: "border-warn/40 bg-warn-bg/60",
  };
}

function Yes({ ok, yes, no, unknown }: { ok: boolean | null; yes: string; no: string; unknown: string }) {
  if (ok === null) return <span className="text-muted">{unknown}</span>;
  return ok ? <span className="text-ok">{yes}</span> : <span className="font-medium text-crit-text">{no}</span>;
}

function Report({ report }: { report: VerificationReport }) {
  const v = verdictText(report);
  const m = report.manifest;
  return (
    <section className="mt-8 space-y-6" aria-labelledby="ev-result">
      <div className={`rounded-3xl border p-6 ${v.cls}`}>
        <p className="tech text-[10px] text-muted">Verdict</p>
        <h2 id="ev-result" className="display mt-1 text-2xl text-ink-2">
          {v.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">{v.body}</p>
      </div>

      <div className="rounded-3xl border border-line bg-surface p-6">
        <h3 className="display text-lg text-ink-2">Signature et manifeste</h3>
        <dl className="mt-4 divide-y divide-line text-sm">
          <Row label="Signature Ed25519">
            <span
              className={
                report.signature.status === "valid"
                  ? "text-ok"
                  : report.signature.status === "unsupported"
                    ? "text-warn"
                    : "font-medium text-crit-text"
              }
            >
              {report.signature.note}
            </span>
          </Row>
          <Row label="Clé de production">
            <Yes
              ok={m.productionKey}
              yes="oui : clé stable de l'instance émettrice"
              no="non : clé éphémère, l'archive n'a aucune valeur d'opposabilité"
              unknown="non indiqué"
            />
          </Row>
          <Row label="Manifeste et SHA256SUMS">
            <Yes ok={m.checksumsConsistent} yes="empreintes concordantes" no="empreintes divergentes" unknown="manifeste illisible" />
          </Row>
          <Row label="Clé du manifeste et public-key.pem">
            <Yes ok={m.keyConsistent} yes="identiques" no="différentes" unknown="non comparables" />
          </Row>
          <Row label="Clé de référence">
            <Yes ok={report.referenceKeyMatch} yes="correspond" no="ne correspond pas" unknown="non fournie" />
          </Row>
          <Row label="Empreinte de la clé">
            <code className="break-all font-mono text-xs">{report.keyFingerprint ?? "—"}</code>
          </Row>
          <Row label="Format">{m.format ?? "—"}</Row>
          <Row label="Site analysé">{m.target ?? "—"}</Row>
          <Row label="Analyse (UTC, déclarée)">{m.scannedAtUtc ?? "—"}</Row>
          <Row label="Identifiant d'analyse">{m.scanId ?? "—"}</Row>
          <Row label="Empreinte de l'archive">
            <code className="break-all font-mono text-xs">{report.archiveSha256}</code>
          </Row>
        </dl>
      </div>

      <div className="rounded-3xl border border-line bg-surface p-6">
        <h3 className="display text-lg text-ink-2">Fichier par fichier</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <caption className="sr-only">Résultat de la vérification de chaque fichier de l&apos;archive</caption>
            <thead>
              <tr className="border-b border-line-2 text-muted">
                <th scope="col" className="py-2 pr-4 font-medium">Fichier</th>
                <th scope="col" className="py-2 pr-4 font-medium">État</th>
                <th scope="col" className="py-2 font-medium">Détail</th>
              </tr>
            </thead>
            <tbody>
              {report.files.map((f) => (
                <tr key={f.name} className="border-b border-line align-top last:border-0">
                  <th scope="row" className="py-3 pr-4 font-mono text-xs font-normal text-ink-2">{f.name}</th>
                  <td className="py-3 pr-4">
                    <span className={`rounded px-2 py-0.5 text-xs ${STATUS[f.status].cls}`}>{STATUS[f.status].label}</span>
                  </td>
                  <td className="py-3 text-muted">
                    {f.note}
                    {f.status === "altered" ? (
                      <span className="mt-1 block break-all font-mono text-[11px]">
                        attendu {f.expected}
                        <br />
                        obtenu {f.actual}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 py-2.5">
      <dt className="w-56 shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 text-ink-2">{children}</dd>
    </div>
  );
}
