"use client";

import { useEffect, useState } from "react";
import { formatDateFr, parseIsoDate } from "@/lib/tools/retention";
import {
  RIGHTS,
  deadlines,
  generateLetter,
  reasonsFor,
  type GeneratedLetter,
  type Outcome,
  type RightId,
} from "@/lib/tools/rights-response";

/**
 * Générateur de réponse à une demande d'exercice de droits. Tout reste dans
 * le navigateur : ni le nom du demandeur ni celui de l'organisme ne sont
 * transmis.
 */

const inputClass =
  "mt-2 w-full rounded-2xl border border-line-2 bg-surface px-4 py-3 text-[15px] text-ink-2 outline-none";
const choiceClass =
  "h-5 w-5 shrink-0 accent-flame focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame";
const buttonClass =
  "btn-primary inline-flex min-h-11 items-center justify-center rounded-full bg-flame px-6 py-3 text-sm font-semibold text-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame";
const secondaryClass =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-line-2 bg-surface px-6 py-3 text-sm font-semibold text-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame";

const OUTCOMES: { id: Outcome; label: string }[] = [
  { id: "acceptee", label: "Demande acceptée" },
  { id: "refusee", label: "Demande refusée, avec motif" },
  { id: "precision", label: "Demande de précision au demandeur" },
];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default function RightsResponseGenerator() {
  const [right, setRight] = useState<RightId>("acces");
  const [organisation, setOrganisation] = useState("");
  const [signatory, setSignatory] = useState("");
  const [requester, setRequester] = useState("");
  const [received, setReceived] = useState("");
  const [letterDate, setLetterDate] = useState("");
  const [identity, setIdentity] = useState<"oui" | "non">("oui");
  const [outcome, setOutcome] = useState<Outcome>("acceptee");
  const [reasonId, setReasonId] = useState("autre");
  const [details, setDetails] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [letter, setLetter] = useState<GeneratedLetter | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => setLetterDate((d) => d || todayIso()), []);

  const reasons = reasonsFor(right);
  useEffect(() => {
    if (!reasonsFor(right).some((r) => r.id === reasonId)) setReasonId("autre");
  }, [right, reasonId]);

  const receivedDate = parseIsoDate(received);
  const dl = receivedDate ? deadlines(receivedDate) : null;

  function generate(e: React.FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    const letterD = parseIsoDate(letterDate);
    if (!organisation.trim()) errs.push("Indiquez le nom de l'organisme.");
    if (!receivedDate) errs.push("Indiquez une date de réception valide.");
    if (!letterD) errs.push("Indiquez une date de courrier valide.");
    setErrors(errs);
    setStatus("");
    if (errs.length > 0 || !receivedDate || !letterD) {
      setLetter(null);
      return;
    }
    setLetter(
      generateLetter({
        right,
        outcome,
        organisation,
        signatory,
        requester,
        receivedAt: receivedDate,
        letterDate: letterD,
        identityVerified: identity === "oui",
        reasonId,
        details,
      }),
    );
    setStatus("Courrier généré ci-dessous.");
  }

  async function copy() {
    if (!letter) return;
    try {
      await navigator.clipboard.writeText(letter.text);
      setStatus("Courrier copié dans le presse-papiers.");
    } catch {
      setStatus("La copie automatique a échoué. Sélectionnez le texte et copiez-le manuellement.");
    }
  }

  function print() {
    if (!letter) return;
    // Impression d'un document isolé, sans le reste de la page.
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.position = "fixed";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc) {
      frame.remove();
      return;
    }
    doc.open();
    doc.write(
      `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(letter.subject)}</title><style>body{font:12pt/1.5 Georgia,serif;margin:2.5cm;color:#000}pre{white-space:pre-wrap;font:inherit}</style></head><body><pre>${escapeHtml(letter.text)}</pre></body></html>`,
    );
    doc.close();
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
    setStatus("Fenêtre d'impression ouverte.");
  }

  const showReason = outcome === "refusee";

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-2">
      <form
        onSubmit={generate}
        noValidate
        className="space-y-6 rounded-3xl border border-line bg-surface p-6"
        aria-labelledby="rr-form-title"
      >
        <h2 id="rr-form-title" className="display text-xl text-ink-2">
          La demande reçue
        </h2>

        {errors.length > 0 ? (
          <div role="alert" className="rounded-2xl border border-crit/30 bg-crit-bg px-4 py-3 text-sm text-crit-text">
            <p className="font-medium">Le courrier n&apos;a pas pu être généré :</p>
            <ul className="mt-1 list-disc pl-5">
              {errors.map((er) => (
                <li key={er}>{er}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <label htmlFor="rr-right" className="block text-sm font-medium text-ink-2">
            Type de demande
          </label>
          <select id="rr-right" value={right} onChange={(e) => setRight(e.target.value as RightId)} className={inputClass}>
            {RIGHTS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label} ({r.article})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="rr-org" className="block text-sm font-medium text-ink-2">
            Nom de l&apos;organisme <span className="text-crit-text">(obligatoire)</span>
          </label>
          <input
            id="rr-org"
            type="text"
            required
            aria-required="true"
            autoComplete="organization"
            maxLength={120}
            value={organisation}
            onChange={(e) => setOrganisation(e.target.value)}
            aria-invalid={errors.length > 0 && !organisation.trim() ? true : undefined}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="rr-sign" className="block text-sm font-medium text-ink-2">
            Signataire <span className="font-normal text-muted">(facultatif)</span>
          </label>
          <input
            id="rr-sign"
            type="text"
            maxLength={120}
            value={signatory}
            onChange={(e) => setSignatory(e.target.value)}
            placeholder="Nom, fonction — délégué à la protection des données"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="rr-req" className="block text-sm font-medium text-ink-2">
            Nom du demandeur <span className="font-normal text-muted">(facultatif)</span>
          </label>
          <input
            id="rr-req"
            type="text"
            maxLength={120}
            autoComplete="off"
            value={requester}
            onChange={(e) => setRequester(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="rr-received" className="block text-sm font-medium text-ink-2">
              Date de réception <span className="text-crit-text">(obligatoire)</span>
            </label>
            <input
              id="rr-received"
              type="date"
              required
              aria-required="true"
              value={received}
              onChange={(e) => setReceived(e.target.value)}
              aria-invalid={errors.length > 0 && !receivedDate ? true : undefined}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="rr-date" className="block text-sm font-medium text-ink-2">
              Date du courrier
            </label>
            <input
              id="rr-date"
              type="date"
              value={letterDate}
              onChange={(e) => setLetterDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-ink-2">Identité du demandeur vérifiée ?</legend>
          <div className="mt-2 flex flex-wrap gap-6">
            {(["oui", "non"] as const).map((v) => (
              <label key={v} className="flex min-h-11 items-center gap-3 text-[15px] text-ink-2">
                <input
                  type="radio"
                  name="rr-identity"
                  value={v}
                  checked={identity === v}
                  onChange={() => setIdentity(v)}
                  className={choiceClass}
                />
                {v === "oui" ? "Oui" : "Non, ou doute raisonnable"}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-ink-2">Issue de la demande</legend>
          <div className="mt-2 space-y-1">
            {OUTCOMES.map((o) => (
              <label key={o.id} className="flex min-h-11 items-center gap-3 text-[15px] text-ink-2">
                <input
                  type="radio"
                  name="rr-outcome"
                  value={o.id}
                  checked={outcome === o.id}
                  onChange={() => setOutcome(o.id)}
                  className={choiceClass}
                />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>

        {showReason ? (
          <div>
            <label htmlFor="rr-reason" className="block text-sm font-medium text-ink-2">
              Motif du refus
            </label>
            <select id="rr-reason" value={reasonId} onChange={(e) => setReasonId(e.target.value)} className={inputClass}>
              {reasons.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label htmlFor="rr-details" className="block text-sm font-medium text-ink-2">
            {outcome === "precision" ? "Précisions demandées" : "Précisions à ajouter"}{" "}
            <span className="font-normal text-muted">(facultatif)</span>
          </label>
          <textarea
            id="rr-details"
            rows={3}
            maxLength={2000}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className={inputClass}
          />
        </div>

        <button type="submit" className={buttonClass}>
          Générer le courrier
        </button>
      </form>

      <div className="space-y-6">
        <section className="rounded-3xl border border-line bg-surface-low p-6" aria-labelledby="rr-deadlines">
          <h2 id="rr-deadlines" className="display text-lg text-ink-2">
            Délais (article 12, paragraphe 3)
          </h2>
          {dl ? (
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-2">
              <li>
                Réponse due au plus tard le <strong className="text-flame">{formatDateFr(dl.standard)}</strong>{" "}
                (un mois à compter de la réception).
              </li>
              <li>
                Prolongation possible de deux mois, jusqu&apos;au{" "}
                <strong className="text-ink-2">{formatDateFr(dl.extended)}</strong>, compte tenu de la
                complexité ou du nombre de demandes — à condition d&apos;en informer le demandeur, motifs à
                l&apos;appui, avant le {formatDateFr(dl.standard)}.
              </li>
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">Saisissez la date de réception pour calculer les échéances.</p>
          )}
          <p className="mt-3 text-sm leading-relaxed text-muted">
            La réponse est gratuite (article 12, paragraphe 5). En cas de refus ou d&apos;absence de suite, le
            demandeur doit être informé des motifs et de la possibilité de saisir la CNIL ou un juge
            (article 12, paragraphe 4).
          </p>
        </section>

        <p role="status" aria-live="polite" className="text-sm text-muted">
          {status}
        </p>

        {letter ? (
          <section className="rounded-3xl border border-line bg-surface p-6" aria-labelledby="rr-letter">
            <h2 id="rr-letter" className="display text-lg text-ink-2">
              Courrier
            </h2>
            {letter.warnings.length > 0 ? (
              <ul className="mt-3 space-y-2 rounded-2xl border border-warn/40 bg-warn-bg px-4 py-3 text-sm text-warn">
                {letter.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
            <label htmlFor="rr-text" className="mt-4 block text-sm text-muted">
              Texte du courrier — les passages entre crochets sont à compléter
            </label>
            <textarea
              id="rr-text"
              readOnly
              rows={22}
              value={letter.text}
              className="mt-2 w-full rounded-2xl border border-line-2 bg-surface-low px-4 py-3 font-mono text-xs leading-relaxed text-ink-2 outline-none"
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={copy} className={buttonClass}>
                Copier
              </button>
              <button type="button" onClick={print} className={secondaryClass}>
                Imprimer
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
