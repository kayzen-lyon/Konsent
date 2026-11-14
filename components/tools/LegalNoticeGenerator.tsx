"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { GeneratedDoc } from "@/lib/docs/types";
import {
  DEFAULT_LEGAL_NOTICE,
  HOST_PRESETS,
  STATUS_LABELS,
  generateLegalNoticeDoc,
  legalNoticeFileBase,
  renderDocHtml,
  renderDocMarkdown,
  renderDocStandalone,
  type LegalNoticeConfig,
  type LegalStatus,
  type Registry,
  type VatMode,
} from "@/lib/tools/legal-notice";

/**
 * Générateur guidé de mentions légales. Tout se passe dans le navigateur :
 * aucune saisie n'est envoyée ni conservée.
 *
 * Les briques de formulaire et le panneau de sortie sont exportés et
 * réutilisés par le générateur de politique de confidentialité.
 */

// ─────────────────────────── Briques partagées ─────────────────────────────

export const inputClass =
  "mt-2 w-full rounded-2xl border border-line-2 bg-surface px-4 py-3 text-[15px] text-ink-2 outline-none";
export const choiceClass =
  "h-5 w-5 shrink-0 accent-flame focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame";
export const buttonClass =
  "btn-primary inline-flex min-h-11 items-center justify-center rounded-full bg-flame px-5 py-2.5 text-sm font-semibold text-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame";
const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-line-2 bg-surface px-5 py-2.5 text-sm font-semibold text-ink-2 hover:bg-surface-high focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame";

/** Date du jour au format AAAA-MM-JJ, en heure locale. */
export function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Section repliable : `<details>` pour le repli, `<fieldset>` pour le regroupement. */
export function FormSection({
  title,
  step,
  defaultOpen = false,
  children,
}: {
  title: string;
  step: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group rounded-3xl border border-line bg-surface">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-3xl px-6 py-4 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-3">
          <span className="tech text-[10px] text-muted" aria-hidden="true">
            {String(step).padStart(2, "0")}
          </span>
          <span className="font-display text-lg text-ink-2">{title}</span>
        </span>
        <span aria-hidden="true" className="text-xl leading-none text-flame transition group-open:rotate-45">
          +
        </span>
      </summary>
      <fieldset className="space-y-5 border-t border-line px-6 pb-6 pt-5">
        <legend className="sr-only">{title}</legend>
        {children}
      </fieldset>
    </details>
  );
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  type = "text",
  multiline = false,
  optional = false,
  autoComplete,
  inputMode,
  maxLength = 300,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  type?: "text" | "email" | "tel" | "url" | "date";
  multiline?: boolean;
  optional?: boolean;
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "url" | "numeric";
  maxLength?: number;
}) {
  const id = useId();
  const hintId = `${id}-aide`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink-2">
        {label}
        {optional ? <span className="font-normal text-muted"> (facultatif)</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {multiline ? (
        <textarea
          id={id}
          rows={3}
          value={value}
          maxLength={maxLength * 3}
          aria-describedby={hint ? hintId : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          maxLength={type === "date" ? undefined : maxLength}
          autoComplete={autoComplete ?? "off"}
          inputMode={inputMode}
          aria-describedby={hint ? hintId : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      )}
    </div>
  );
}

export function CheckField({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        aria-describedby={hint ? `${id}-aide` : undefined}
        onChange={(e) => onChange(e.target.checked)}
        className={`${choiceClass} mt-0.5`}
      />
      <div>
        <label htmlFor={id} className="text-[15px] text-ink-2">
          {label}
        </label>
        {hint ? (
          <p id={`${id}-aide`} className="mt-0.5 text-sm text-muted">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function RadioGroup<T extends string>({
  legend,
  value,
  options,
  onChange,
  hint,
}: {
  legend: string;
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (v: T) => void;
  hint?: string;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink-2">{legend}</legend>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
      <div className="mt-2 space-y-2">
        {options.map((o) => (
          <label key={o.id} className="flex items-start gap-3 text-[15px] text-ink-2">
            <input
              type="radio"
              name={name}
              value={o.id}
              checked={value === o.id}
              onChange={() => onChange(o.id)}
              className={`${choiceClass} mt-0.5`}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const MARKER_SPLIT = /(\[\[À (?:COMPLÉTER|VÉRIFIER) : [^\]]*\]\])/g;

/** Texte de l'aperçu, marqueurs mis en évidence. */
function Rich({ text }: { text: string }) {
  const parts = text.split(MARKER_SPLIT);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded bg-warn-bg px-1 text-warn">
            {p}
          </mark>
        ) : (
          p
        ),
      )}
    </>
  );
}

type View = "apercu" | "html" | "markdown";

const VIEWS: readonly { id: View; label: string }[] = [
  { id: "apercu", label: "Aperçu" },
  { id: "html", label: "HTML" },
  { id: "markdown", label: "Markdown" },
];

/** Panneau de sortie : aperçu, code, copie, téléchargement, impression. */
export function DocOutput({ doc, fileBase }: { doc: GeneratedDoc; fileBase: string }) {
  const [view, setView] = useState<View>("apercu");
  const [status, setStatus] = useState("");
  const html = useMemo(() => renderDocHtml(doc), [doc]);
  const markdown = useMemo(() => renderDocMarkdown(doc), [doc]);
  const titleId = useId();

  async function copy(kind: "html" | "markdown") {
    try {
      await navigator.clipboard.writeText(kind === "html" ? html : markdown);
      setStatus(kind === "html" ? "HTML copié dans le presse-papiers." : "Markdown copié dans le presse-papiers.");
    } catch {
      setStatus("La copie automatique a échoué. Affichez le code, sélectionnez-le et copiez-le manuellement.");
    }
  }

  function download(kind: "html" | "markdown") {
    const isHtml = kind === "html";
    const blob = new Blob([isHtml ? renderDocStandalone(doc) : markdown], {
      type: isHtml ? "text/html;charset=utf-8" : "text/markdown;charset=utf-8",
    });
    const name = `${fileBase}.${isHtml ? "html" : "md"}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus(`Fichier ${name} téléchargé.`);
  }

  /** Impression du seul document, via un cadre invisible : la page n'est pas imprimée. */
  function print() {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    frame.srcdoc = renderDocStandalone(doc);
    frame.onload = () => {
      const w = frame.contentWindow;
      if (!w) return;
      const cleanup = () => frame.remove();
      w.addEventListener("afterprint", cleanup);
      window.setTimeout(cleanup, 60_000);
      w.focus();
      w.print();
    };
    document.body.appendChild(frame);
    setStatus("Fenêtre d'impression ouverte.");
  }

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-3xl border border-line bg-surface p-5 sm:p-6 lg:sticky lg:top-24 lg:self-start"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id={titleId} className="display text-xl text-ink-2">
          Votre document
        </h2>
        <p className="text-sm text-muted">
          {doc.todos.length === 0 ? (
            <span className="text-ok">Aucun champ manquant</span>
          ) : (
            <>
              <strong className="text-warn">{doc.todos.length}</strong> information
              {doc.todos.length > 1 ? "s" : ""} à compléter ou vérifier
            </>
          )}
        </p>
      </div>

      <fieldset className="mt-4">
        <legend className="sr-only">Format d&apos;affichage</legend>
        <div className="inline-flex rounded-full border border-line-2 p-1">
          {VIEWS.map((v) => (
            <label
              key={v.id}
              className={`flex min-h-9 cursor-pointer items-center rounded-full px-4 text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-flame ${
                view === v.id ? "bg-flame text-on-primary" : "text-ink-2"
              }`}
            >
              <input
                type="radio"
                name={`${titleId}-vue`}
                value={v.id}
                checked={view === v.id}
                onChange={() => setView(v.id)}
                className="sr-only"
              />
              {v.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => copy("html")} className={buttonClass}>
          Copier le HTML
        </button>
        <button type="button" onClick={() => copy("markdown")} className={buttonClass}>
          Copier le Markdown
        </button>
        <button type="button" onClick={() => download("html")} className={secondaryButtonClass}>
          Télécharger .html
        </button>
        <button type="button" onClick={() => download("markdown")} className={secondaryButtonClass}>
          Télécharger .md
        </button>
        <button type="button" onClick={print} className={secondaryButtonClass}>
          Imprimer
        </button>
      </div>
      <p role="status" className="mt-3 min-h-6 text-sm text-ink-2">
        {status}
      </p>

      {view === "apercu" ? (
        <div
          tabIndex={0}
          role="region"
          aria-label="Aperçu du document"
          className="mt-2 max-h-[70vh] overflow-auto rounded-2xl border border-line bg-surface-low p-5 text-[15px] leading-relaxed text-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame lg:max-h-[calc(100vh-20rem)]"
        >
          <article>
            <h3 className="display text-2xl text-ink-2">{doc.title}</h3>
            <p className="mt-1 text-sm text-muted">
              <Rich text={doc.subtitle} />
            </p>
            {doc.sections.map((s) => (
              <section key={s.id} className="mt-6">
                <h4 className="font-display text-base font-semibold text-ink-2">{s.heading}</h4>
                {s.body.map((p, i) => (
                  <p key={i} className="mt-2">
                    <Rich text={p} />
                  </p>
                ))}
                {s.bullets && s.bullets.length > 0 ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {s.bullets.map((b, i) => (
                      <li key={i}>
                        <Rich text={b} />
                      </li>
                    ))}
                  </ul>
                ) : null}
                {s.table ? (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full border-collapse text-left text-[13px]">
                      <thead>
                        <tr>
                          {s.table.columns.map((c) => (
                            <th key={c} scope="col" className="border border-line bg-surface px-2 py-1.5 font-semibold">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {s.table.rows.map((row, ri) => (
                          <tr key={ri}>
                            {row.map((cell, ci) =>
                              ci === 0 ? (
                                <th key={ci} scope="row" className="border border-line px-2 py-1.5 align-top font-semibold">
                                  <Rich text={cell} />
                                </th>
                              ) : (
                                <td key={ci} className="border border-line px-2 py-1.5 align-top">
                                  <Rich text={cell} />
                                </td>
                              ),
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                {s.clauseRef ? <p className="tech mt-2 text-[10px] text-muted">{s.clauseRef}</p> : null}
              </section>
            ))}
            <p className="mt-8 border-t border-line pt-4 text-xs text-muted">{doc.footer}</p>
          </article>
        </div>
      ) : (
        <pre
          tabIndex={0}
          aria-label={view === "html" ? "Code HTML du document" : "Code Markdown du document"}
          className="mt-2 max-h-[70vh] overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-line bg-surface-low p-5 font-mono text-xs leading-relaxed text-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame lg:max-h-[calc(100vh-20rem)]"
        >
          <code>{view === "html" ? html : markdown}</code>
        </pre>
      )}

      {doc.todos.length > 0 ? (
        <details className="mt-4 rounded-2xl border border-line bg-surface-low">
          <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-medium text-ink-2">
            Liste des informations manquantes
          </summary>
          <ul className="list-disc space-y-1 px-4 pb-4 pl-9 text-sm text-muted">
            {doc.todos.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

// ─────────────────────────── Générateur ────────────────────────────────────

const STATUS_OPTIONS = (Object.keys(STATUS_LABELS) as LegalStatus[]).map((id) => ({
  id,
  label: STATUS_LABELS[id],
}));

const LEGAL_FORMS = ["SAS", "SASU", "SARL", "EURL", "SA", "SNC", "SCI", "SELARL", "SELAS", "SCOP"];

const VAT_OPTIONS: readonly { id: VatMode; label: string }[] = [
  { id: "numero", label: "Assujetti : numéro de TVA intracommunautaire" },
  { id: "franchise", label: "Franchise en base (« TVA non applicable, art. 293 B du CGI »)" },
  { id: "non-assujetti", label: "Non assujetti à la TVA" },
];

const REGISTRY_OPTIONS: readonly { id: Registry; label: string }[] = [
  { id: "rne", label: "Registre national des entreprises (artisan, profession libérale, agent commercial)" },
  { id: "rcs", label: "Registre du commerce et des sociétés (commerçant)" },
];

export default function LegalNoticeGenerator() {
  const [c, setC] = useState<LegalNoticeConfig>(DEFAULT_LEGAL_NOTICE);
  const set = <K extends keyof LegalNoticeConfig>(key: K, value: LegalNoticeConfig[K]) =>
    setC((prev) => ({ ...prev, [key]: value }));

  // Date du jour posée après hydratation, pour ne pas diverger du rendu serveur.
  useEffect(() => {
    setC((prev) => (prev.updatedAt ? prev : { ...prev, updatedAt: todayIso() }));
  }, []);

  const doc = useMemo(() => generateLegalNoticeDoc(c), [c]);
  const preset = HOST_PRESETS.find((h) => h.id === c.hostId);
  const individual = c.status === "ei" || c.status === "reglementee";
  const regulated = c.status === "reglementee" || c.regulated;
  let step = 0;

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()} aria-label="Informations des mentions légales">
        <FormSection title="Site et statut" step={++step} defaultOpen>
          <TextField label="Nom du site" value={c.siteName} onChange={(v) => set("siteName", v)} maxLength={120} />
          <TextField
            label="Adresse du site"
            type="url"
            inputMode="url"
            optional
            hint="Par exemple https://www.exemple.fr"
            value={c.siteUrl}
            onChange={(v) => set("siteUrl", v)}
          />
          <RadioGroup
            legend="Statut de l'éditeur"
            value={c.status}
            options={STATUS_OPTIONS}
            onChange={(v) => set("status", v)}
            hint="Les mentions exigées dépendent du statut. Une profession réglementée exercée en société (SELARL, SELAS…) relève de « Société », avec la case « activité réglementée »."
          />
          <TextField
            label="Date de mise à jour"
            type="date"
            value={c.updatedAt}
            onChange={(v) => set("updatedAt", v)}
          />
        </FormSection>

        <FormSection title="Éditeur" step={++step} defaultOpen>
          {individual ? (
            <>
              <TextField
                label="Nom et prénom de l'entrepreneur"
                hint="La mention « EI » est ajoutée automatiquement (code de commerce, art. R. 526-26)."
                autoComplete="name"
                value={c.personName}
                onChange={(v) => set("personName", v)}
              />
              <TextField
                label="Nom commercial"
                optional
                value={c.tradeName}
                onChange={(v) => set("tradeName", v)}
              />
              {c.status === "ei" ? (
                <CheckField
                  label="Régime de la micro-entreprise"
                  checked={c.microEntreprise}
                  onChange={(v) => set("microEntreprise", v)}
                />
              ) : null}
              <RadioGroup
                legend="Registre d'immatriculation"
                value={c.registry}
                options={REGISTRY_OPTIONS}
                onChange={(v) => set("registry", v)}
              />
              {c.registry === "rcs" ? (
                <TextField label="Ville du greffe (RCS)" value={c.rcsCity} onChange={(v) => set("rcsCity", v)} />
              ) : null}
            </>
          ) : null}

          {c.status === "societe" ? (
            <>
              <TextField
                label="Dénomination sociale"
                autoComplete="organization"
                value={c.companyName}
                onChange={(v) => set("companyName", v)}
              />
              <SelectField
                label="Forme juridique"
                value={c.legalForm}
                options={LEGAL_FORMS}
                onChange={(v) => set("legalForm", v)}
              />
              <TextField
                label="Capital social, en euros"
                hint="Montant seul, par exemple 10 000."
                inputMode="numeric"
                value={c.capital}
                onChange={(v) => set("capital", v)}
              />
              <TextField label="Ville du greffe (RCS)" value={c.rcsCity} onChange={(v) => set("rcsCity", v)} />
              <TextField
                label="Représentant légal"
                hint="Nom et qualité, par exemple « Jeanne Martin, présidente »."
                value={c.legalRep}
                onChange={(v) => set("legalRep", v)}
              />
            </>
          ) : null}

          {c.status === "association" ? (
            <>
              <TextField
                label="Nom de l'association"
                autoComplete="organization"
                value={c.associationName}
                onChange={(v) => set("associationName", v)}
              />
              <TextField
                label="Préfecture de déclaration"
                value={c.prefecture}
                onChange={(v) => set("prefecture", v)}
              />
              <TextField
                label="Numéro RNA"
                hint="Neuf chiffres précédés de la lettre W."
                value={c.rna}
                onChange={(v) => set("rna", v)}
              />
              <TextField
                label="Président ou présidente"
                value={c.president}
                onChange={(v) => set("president", v)}
              />
            </>
          ) : null}

          <TextField
            label={c.status === "association" ? "SIREN" : "Numéro SIREN"}
            optional={c.status === "association"}
            hint="Neuf chiffres. Ne pas confondre avec le SIRET (quatorze chiffres)."
            inputMode="numeric"
            value={c.siren}
            onChange={(v) => set("siren", v)}
          />
          <TextField
            label={individual ? "Adresse professionnelle" : "Adresse du siège social"}
            autoComplete="street-address"
            value={c.address}
            onChange={(v) => set("address", v)}
          />
          <TextField
            label="Téléphone"
            type="tel"
            autoComplete="tel"
            value={c.phone}
            onChange={(v) => set("phone", v)}
          />
          <TextField
            label="Adresse électronique de contact"
            type="email"
            autoComplete="email"
            value={c.email}
            onChange={(v) => set("email", v)}
          />
          <RadioGroup legend="TVA" value={c.vatMode} options={VAT_OPTIONS} onChange={(v) => set("vatMode", v)} />
          {c.vatMode === "numero" ? (
            <TextField
              label="Numéro de TVA intracommunautaire"
              hint="Par exemple FR12 345678901."
              value={c.vatNumber}
              onChange={(v) => set("vatNumber", v)}
            />
          ) : null}
          {c.status === "ei" || c.status === "societe" ? (
            <CheckField
              label="Activité réglementée ou soumise à autorisation"
              hint="Profession à ordre, titre protégé, activité nécessitant un agrément ou une carte professionnelle."
              checked={c.regulated}
              onChange={(v) => set("regulated", v)}
            />
          ) : null}
        </FormSection>

        <FormSection title="Directeur de la publication" step={++step}>
          <TextField
            label="Nom et prénom du directeur de la publication"
            hint={
              individual
                ? "Laissez vide si c'est vous : votre nom sera repris."
                : "En principe le représentant légal. Laissez vide pour le reprendre."
            }
            value={c.director}
            onChange={(v) => set("director", v)}
          />
        </FormSection>

        <FormSection title="Hébergeur" step={++step}>
          <SelectField
            label="Hébergeur du site"
            value={c.hostId}
            options={[...HOST_PRESETS.map((h) => ({ id: h.id, label: h.label })), { id: "autre", label: "Autre hébergeur" }]}
            onChange={(v) => set("hostId", v)}
            hint="L'hébergeur est le prestataire qui stocke les fichiers du site, pas le registraire du nom de domaine."
          />
          {preset ? (
            <div className="rounded-2xl border border-line bg-surface-low p-4 text-sm leading-relaxed text-ink-2">
              <p className="font-semibold">{preset.name}</p>
              <p>{preset.address}</p>
              <p>Téléphone : {preset.phone || "non publié — à compléter"}</p>
              {preset.verify ? (
                <p className="mt-2 text-warn">Information à vérifier sur le site de l&apos;hébergeur : {preset.verify}.</p>
              ) : null}
              <p className="mt-2 text-muted">
                Adresses relevées dans les publications des hébergeurs ; elles changent. Vérifiez-les avant
                publication.
              </p>
            </div>
          ) : (
            <>
              <TextField label="Dénomination de l'hébergeur" value={c.hostName} onChange={(v) => set("hostName", v)} />
              <TextField label="Adresse de l'hébergeur" value={c.hostAddress} onChange={(v) => set("hostAddress", v)} />
              <TextField
                label="Téléphone de l'hébergeur"
                type="tel"
                value={c.hostPhone}
                onChange={(v) => set("hostPhone", v)}
              />
            </>
          )}
        </FormSection>

        {regulated ? (
          <FormSection title="Activité réglementée" step={++step} defaultOpen>
            <TextField
              label="Titre professionnel"
              hint="Par exemple « avocat », « architecte », « expert-comptable »."
              value={c.profTitle}
              onChange={(v) => set("profTitle", v)}
            />
            <TextField
              label="État ayant octroyé le titre"
              value={c.profCountry}
              onChange={(v) => set("profCountry", v)}
            />
            <TextField
              label="Ordre ou organisme professionnel d'inscription"
              hint="Nom et coordonnées, par exemple « barreau de Lyon »."
              value={c.profOrder}
              onChange={(v) => set("profOrder", v)}
            />
            <TextField
              label="Règles professionnelles applicables"
              hint="Référence du code de déontologie ou du règlement, et où le consulter."
              multiline
              value={c.profRules}
              onChange={(v) => set("profRules", v)}
            />
            <TextField
              label="Autorité ayant délivré l'autorisation d'exercer"
              optional
              hint="Uniquement si l'activité est soumise à autorisation : nom et adresse de l'autorité."
              value={c.authority}
              onChange={(v) => set("authority", v)}
            />
            <TextField
              label="Assurance professionnelle"
              hint="Assureur, coordonnées et couverture géographique."
              value={c.insurance}
              onChange={(v) => set("insurance", v)}
            />
          </FormSection>
        ) : null}

        <FormSection title="Vente et médiation" step={++step}>
          <CheckField
            label="Le site permet d'acheter en ligne"
            checked={c.sellsOnline}
            onChange={(v) => set("sellsOnline", v)}
          />
          <CheckField
            label="Vous vendez à des consommateurs (particuliers)"
            hint="Rend obligatoire l'indication d'un médiateur de la consommation (code de la consommation, art. L. 616-1)."
            checked={c.sellsToConsumers}
            onChange={(v) => set("sellsToConsumers", v)}
          />
          {c.sellsOnline ? (
            <TextField
              label="Adresse des conditions générales de vente"
              hint="Par exemple /cgv ou https://www.exemple.fr/cgv"
              value={c.cgvUrl}
              onChange={(v) => set("cgvUrl", v)}
            />
          ) : null}
          {c.sellsToConsumers ? (
            <>
              <TextField
                label="Nom du médiateur de la consommation"
                hint="Médiateur référencé par la Commission d'évaluation et de contrôle de la médiation de la consommation, auquel vous avez adhéré."
                value={c.mediatorName}
                onChange={(v) => set("mediatorName", v)}
              />
              <TextField
                label="Adresse du médiateur"
                value={c.mediatorAddress}
                onChange={(v) => set("mediatorAddress", v)}
              />
              <TextField
                label="Site du médiateur"
                optional
                value={c.mediatorWebsite}
                onChange={(v) => set("mediatorWebsite", v)}
              />
            </>
          ) : null}
        </FormSection>

        <FormSection title="Données personnelles" step={++step}>
          <TextField
            label="Adresse de la politique de confidentialité"
            hint="Par exemple /confidentialite"
            value={c.privacyUrl}
            onChange={(v) => set("privacyUrl", v)}
          />
          <TextField
            label="Adresse de la politique de gestion des cookies"
            hint="Par exemple /cookies"
            value={c.cookiesUrl}
            onChange={(v) => set("cookiesUrl", v)}
          />
        </FormSection>
      </form>

      <DocOutput doc={doc} fileBase={legalNoticeFileBase(c)} />
    </div>
  );
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  options: readonly (string | { id: string; label: string })[];
  onChange: (v: string) => void;
  hint?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink-2">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-aide`} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      <select
        id={id}
        value={value}
        aria-describedby={hint ? `${id}-aide` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        {options.map((o) => {
          const opt = typeof o === "string" ? { id: o, label: o } : o;
          return (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          );
        })}
      </select>
    </div>
  );
}
