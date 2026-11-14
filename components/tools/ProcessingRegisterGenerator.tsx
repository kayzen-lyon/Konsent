"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  DEFAULT_REGISTER,
  blankEntry,
  generateRegisterDoc,
  registerFileBase,
  renderRegisterCsv,
  type RegisterConfig,
  type RegisterEntry,
} from "@/lib/tools/processing-register";
import { CheckField, DocOutput, FormSection, TextField, todayIso } from "./LegalNoticeGenerator";

/**
 * Générateur de registre des activités de traitement (art. 30 RGPD). Tout se
 * passe dans le navigateur : aucune saisie n'est envoyée ni conservée.
 */

const smallButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-line-2 bg-surface px-4 py-2 text-sm font-semibold text-ink-2 hover:bg-surface-high focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame";

function EntryFields({
  e,
  update,
}: {
  e: RegisterEntry;
  update: (patch: Partial<RegisterEntry>) => void;
}) {
  const name = e.label.trim() || "sans intitulé";
  return (
    <fieldset className="mt-4 space-y-4">
      <legend className="sr-only">Fiche du traitement « {name} »</legend>
      <TextField label="Intitulé du traitement" value={e.label} onChange={(v) => update({ label: v })} maxLength={120} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Référence interne" value={e.ref} onChange={(v) => update({ ref: v })} maxLength={30} />
        <TextField label="Date de création" type="date" value={e.createdAt} onChange={(v) => update({ createdAt: v })} />
      </div>
      <TextField label="Finalité(s)" multiline value={e.purposes} onChange={(v) => update({ purposes: v })} />
      <TextField label="Base légale" multiline value={e.basis} onChange={(v) => update({ basis: v })} />
      <TextField
        label="Catégories de personnes concernées"
        multiline
        value={e.persons}
        onChange={(v) => update({ persons: v })}
      />
      <TextField label="Catégories de données" multiline value={e.data} onChange={(v) => update({ data: v })} />
      <TextField
        label="Données sensibles ou relatives aux infractions"
        optional
        hint="Santé, origine, opinions, biométrie, orientation sexuelle… (art. 9) ou condamnations et infractions (art. 10). Laissez vide s'il n'y en a pas."
        multiline
        value={e.sensitive}
        onChange={(v) => update({ sensitive: v })}
      />
      <TextField
        label="Destinataires"
        hint="Services internes habilités et destinataires externes (organismes, partenaires)."
        multiline
        value={e.recipients}
        onChange={(v) => update({ recipients: v })}
      />
      <TextField
        label="Sous-traitants"
        hint="Nom, prestation et pays de chaque sous-traitant : hébergeur, logiciel, outil d'envoi… Chacun doit être lié par un contrat conforme à l'article 28."
        multiline
        value={e.processors}
        onChange={(v) => update({ processors: v })}
      />
      <TextField
        label="Transferts hors de l'UE/EEE : pays et destinataires"
        optional
        hint="Laissez vide s'il n'y a aucun transfert. Un outil américain hébergé aux États-Unis est un transfert."
        multiline
        value={e.transferCountries}
        onChange={(v) => update({ transferCountries: v })}
      />
      {e.transferCountries.trim() ? (
        <TextField
          label="Garanties encadrant le transfert"
          hint="Décision d'adéquation (art. 45, par ex. Data Privacy Framework si le destinataire est certifié), clauses contractuelles types (art. 46), règles d'entreprise contraignantes (art. 47) ou dérogation (art. 49)."
          multiline
          value={e.transferGuarantees}
          onChange={(v) => update({ transferGuarantees: v })}
        />
      ) : null}
      <TextField
        label="Durées de conservation"
        hint="Par catégorie de données, ou à défaut les critères qui la déterminent."
        multiline
        value={e.retention}
        onChange={(v) => update({ retention: v })}
      />
      <TextField
        label="Mesures de sécurité techniques et organisationnelles"
        multiline
        maxLength={600}
        value={e.security}
        onChange={(v) => update({ security: v })}
      />
      <TextField
        label="Références"
        optional
        hint="Référentiel CNIL, texte imposant une durée… Utile pour justifier vos choix."
        multiline
        value={e.references}
        onChange={(v) => update({ references: v })}
      />
    </fieldset>
  );
}

export default function ProcessingRegisterGenerator() {
  const [c, setC] = useState<RegisterConfig>(DEFAULT_REGISTER);
  const [csvStatus, setCsvStatus] = useState("");
  const addedRef = useRef<string | null>(null);
  const set = <K extends keyof RegisterConfig>(key: K, value: RegisterConfig[K]) =>
    setC((prev) => ({ ...prev, [key]: value }));

  // Date du jour posée après hydratation, pour ne pas diverger du rendu serveur.
  useEffect(() => {
    setC((prev) => (prev.updatedAt ? prev : { ...prev, updatedAt: todayIso() }));
  }, []);

  // Focus sur l'intitulé de la fiche ajoutée.
  useEffect(() => {
    if (!addedRef.current) return;
    const el = document.getElementById(`fiche-${addedRef.current}`)?.querySelector<HTMLInputElement>("input");
    el?.focus();
    addedRef.current = null;
  }, [c.entries.length]);

  const doc = useMemo(() => generateRegisterDoc(c), [c]);
  const fileBase = registerFileBase(c);
  const activeCount = c.entries.filter((e) => e.enabled).length;

  function updateEntry(id: string, patch: Partial<RegisterEntry>) {
    setC((prev) => ({ ...prev, entries: prev.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  }

  function addEntry() {
    const entry = blankEntry(c.entries.length + 1);
    addedRef.current = entry.id;
    setC((prev) => ({ ...prev, entries: [...prev.entries, entry] }));
  }

  function removeEntry(id: string) {
    setC((prev) => ({ ...prev, entries: prev.entries.filter((e) => e.id !== id) }));
    setCsvStatus("Fiche supprimée.");
  }

  function downloadCsv() {
    const blob = new Blob([renderRegisterCsv(c)], { type: "text/csv;charset=utf-8" });
    const name = `${fileBase}.csv`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setCsvStatus(`Fichier ${name} téléchargé (${activeCount} traitement${activeCount > 1 ? "s" : ""}).`);
  }

  let step = 0;

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <form className="space-y-4" onSubmit={(ev) => ev.preventDefault()} aria-label="Informations du registre">
        <FormSection title="Responsable du traitement" step={++step} defaultOpen>
          <TextField
            label="Nom de l'organisme"
            autoComplete="organization"
            value={c.orgName}
            onChange={(v) => set("orgName", v)}
            maxLength={160}
          />
          <TextField
            label="Adresse"
            autoComplete="street-address"
            value={c.orgAddress}
            onChange={(v) => set("orgAddress", v)}
          />
          <TextField
            label="SIREN"
            optional
            inputMode="numeric"
            value={c.orgSiren}
            onChange={(v) => set("orgSiren", v)}
            maxLength={20}
          />
          <TextField
            label="Contact pour le registre"
            hint="Nom, fonction et adresse électronique de la personne qui tient le registre."
            value={c.orgContact}
            onChange={(v) => set("orgContact", v)}
          />
          <TextField
            label="Délégué à la protection des données"
            optional
            hint="Nom et coordonnées, s'il a été désigné (art. 37)."
            value={c.dpo}
            onChange={(v) => set("dpo", v)}
          />
          <TextField
            label="Représentant dans l'Union"
            optional
            hint="Uniquement pour un organisme établi hors de l'Union (art. 27)."
            value={c.representative}
            onChange={(v) => set("representative", v)}
          />
          <TextField
            label="Date de mise à jour du registre"
            type="date"
            value={c.updatedAt}
            onChange={(v) => set("updatedAt", v)}
          />
        </FormSection>

        <FormSection title="Traitements" step={++step} defaultOpen>
          <p className="text-sm text-muted">
            Cochez les traitements que vous mettez réellement en œuvre. Chaque fiche est préremplie à
            partir des référentiels de la CNIL et des textes cités : adaptez-la à votre pratique, et
            complétez les sous-traitants, que nous ne pouvons pas deviner.
          </p>
          <p className="text-sm text-ink-2">
            <strong>{activeCount}</strong> traitement{activeCount > 1 ? "s" : ""} retenu
            {activeCount > 1 ? "s" : ""}.
          </p>
          <ul className="space-y-3">
            {c.entries.map((e) => {
              const custom = e.id.startsWith("perso-");
              return (
                <li key={e.id} id={`fiche-${e.id}`} className="rounded-2xl border border-line bg-surface-low p-4">
                  {custom ? (
                    <p className="text-[15px] font-medium text-ink-2">
                      Traitement personnalisé{e.label.trim() ? ` : ${e.label.trim()}` : ""}
                    </p>
                  ) : (
                    <CheckField
                      label={e.label}
                      checked={e.enabled}
                      onChange={(v) => updateEntry(e.id, { enabled: v })}
                    />
                  )}
                  {e.enabled ? (
                    <details className="mt-3" open={custom}>
                      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-flame">
                        Modifier la fiche{custom ? "" : ` « ${e.label} »`}
                      </summary>
                      <EntryFields e={e} update={(patch) => updateEntry(e.id, patch)} />
                    </details>
                  ) : null}
                  {custom ? (
                    <button type="button" onClick={() => removeEntry(e.id)} className={`${smallButtonClass} mt-4`}>
                      Supprimer ce traitement
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={addEntry} className={smallButtonClass}>
            Ajouter un traitement personnalisé
          </button>
        </FormSection>
      </form>

      <div className="space-y-4">
        <div className="rounded-3xl border border-line bg-surface p-5">
          <h2 className="font-display text-lg text-ink-2">Export tableur</h2>
          <p className="mt-1 text-sm text-muted">
            Une ligne par traitement, séparateur « ; », encodage UTF-8 avec BOM : le fichier
            s&apos;ouvre directement dans Excel ou LibreOffice.
          </p>
          <button
            type="button"
            onClick={downloadCsv}
            className="btn-primary mt-3 inline-flex min-h-11 items-center justify-center rounded-full bg-flame px-5 py-2.5 text-sm font-semibold text-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame"
          >
            Télécharger .csv
          </button>
          <p role="status" className="mt-3 min-h-6 text-sm text-ink-2">
            {csvStatus}
          </p>
        </div>
        <DocOutput doc={doc} fileBase={fileBase} />
      </div>
    </div>
  );
}

// ─────────────────────────── Bloc de code copiable ─────────────────────────

/**
 * Bloc de code avec bouton de copie, réutilisé par les pages Intégrations.
 * Le code reste lisible et sélectionnable sans JavaScript ; le bouton n'est
 * qu'un raccourci, annoncé par une zone `role="status"`.
 */
export function CopyCodeBlock({ code, caption }: { code: string; caption: string }) {
  const [status, setStatus] = useState("");
  const captionId = useId();

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("Code copié dans le presse-papiers.");
    } catch {
      setStatus("La copie automatique a échoué : sélectionnez le code et copiez-le manuellement.");
    }
  }

  return (
    <figure className="mt-4 rounded-2xl border border-line bg-surface-low">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2">
        <figcaption id={captionId} className="tech text-[10px] text-muted">
          {caption}
        </figcaption>
        <div className="flex items-center gap-3 print:hidden">
          <span role="status" className="text-xs text-ink-2">
            {status}
          </span>
          <button
            type="button"
            onClick={copy}
            aria-describedby={captionId}
            className="inline-flex min-h-11 items-center rounded-full border border-line-2 bg-surface px-4 text-sm font-semibold text-ink-2 hover:bg-surface-high focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame"
          >
            Copier
          </button>
        </div>
      </div>
      <pre
        tabIndex={0}
        aria-labelledby={captionId}
        className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame"
      >
        <code>{code}</code>
      </pre>
    </figure>
  );
}
