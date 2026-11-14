"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BASIS_IDS,
  BASIS_LABELS,
  DEFAULT_PRIVACY_POLICY,
  GUARANTEE_IDS,
  GUARANTEE_LABELS,
  generatePrivacyPolicyDoc,
  privacyPolicyFileBase,
  type BasisId,
  type DpoMode,
  type GuaranteeId,
  type PrivacyPolicyConfig,
  type Recipient,
  type Treatment,
} from "@/lib/tools/privacy-policy";
import {
  CheckField,
  DocOutput,
  FormSection,
  RadioGroup,
  SelectField,
  TextField,
  todayIso,
} from "./LegalNoticeGenerator";

/**
 * Générateur guidé de politique de confidentialité. Tout se passe dans le
 * navigateur : aucune saisie n'est envoyée ni conservée.
 */

const DPO_OPTIONS: readonly { id: DpoMode; label: string }[] = [
  { id: "aucun", label: "Aucun délégué ni référent désigné" },
  { id: "referent", label: "Un référent interne, sans désignation formelle de DPO" },
  { id: "dpo", label: "Un délégué à la protection des données (DPO) désigné auprès de la CNIL" },
];

const BASIS_OPTIONS = BASIS_IDS.map((id) => ({ id, label: BASIS_LABELS[id] }));

const smallButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-line-2 bg-surface px-4 py-2 text-sm font-semibold text-ink-2 hover:bg-surface-high focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame";

export default function PrivacyPolicyGenerator() {
  const [c, setC] = useState<PrivacyPolicyConfig>(DEFAULT_PRIVACY_POLICY);
  const [listStatus, setListStatus] = useState("");
  const nextKey = useRef(1);
  const set = <K extends keyof PrivacyPolicyConfig>(key: K, value: PrivacyPolicyConfig[K]) =>
    setC((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    setC((prev) => (prev.updatedAt ? prev : { ...prev, updatedAt: todayIso() }));
  }, []);

  const doc = useMemo(() => generatePrivacyPolicyDoc(c), [c]);

  const updateTreatment = (id: string, patch: Partial<Treatment>) =>
    setC((prev) => ({
      ...prev,
      treatments: prev.treatments.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));

  const updateRecipient = (key: number, patch: Partial<Recipient>) =>
    setC((prev) => ({
      ...prev,
      recipients: prev.recipients.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    }));

  const addRecipient = () => {
    const key = nextKey.current++;
    setC((prev) => ({ ...prev, recipients: [...prev.recipients, { key, name: "", role: "", country: "" }] }));
    setListStatus(`Destinataire ${c.recipients.length + 1} ajouté.`);
  };

  const removeRecipient = (key: number, index: number) => {
    setC((prev) => ({ ...prev, recipients: prev.recipients.filter((r) => r.key !== key) }));
    setListStatus(`Destinataire ${index + 1} supprimé.`);
  };

  const toggleGuarantee = (id: GuaranteeId, on: boolean) =>
    setC((prev) => ({
      ...prev,
      guarantees: on
        ? GUARANTEE_IDS.filter((g) => g === id || prev.guarantees.includes(g))
        : prev.guarantees.filter((g) => g !== id),
    }));

  let step = 0;

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <form
        className="space-y-4"
        onSubmit={(e) => e.preventDefault()}
        aria-label="Informations de la politique de confidentialité"
      >
        <FormSection title="Responsable du traitement" step={++step} defaultOpen>
          <TextField label="Nom du site" value={c.siteName} onChange={(v) => set("siteName", v)} maxLength={120} />
          <TextField
            label="Adresse du site"
            type="url"
            inputMode="url"
            optional
            value={c.siteUrl}
            onChange={(v) => set("siteUrl", v)}
          />
          <TextField
            label="Dénomination du responsable de traitement"
            hint="Société, association, ou nom suivi de « EI » pour un entrepreneur individuel."
            autoComplete="organization"
            value={c.controllerName}
            onChange={(v) => set("controllerName", v)}
          />
          <TextField
            label="Forme juridique"
            optional
            hint="Par exemple « SAS au capital de 10 000 € » ou « association loi 1901 »."
            value={c.controllerDetails}
            onChange={(v) => set("controllerDetails", v)}
          />
          <TextField
            label="Numéro SIREN"
            optional
            inputMode="numeric"
            value={c.siren}
            onChange={(v) => set("siren", v)}
          />
          <TextField
            label="Adresse"
            autoComplete="street-address"
            value={c.address}
            onChange={(v) => set("address", v)}
          />
          <TextField
            label="Adresse de contact pour les données personnelles"
            type="email"
            autoComplete="email"
            value={c.contactEmail}
            onChange={(v) => set("contactEmail", v)}
          />
          <TextField
            label="Date de mise à jour"
            type="date"
            value={c.updatedAt}
            onChange={(v) => set("updatedAt", v)}
          />
        </FormSection>

        <FormSection title="Délégué ou référent" step={++step}>
          <RadioGroup
            legend="Qui répond aux questions sur les données ?"
            value={c.dpoMode}
            options={DPO_OPTIONS}
            onChange={(v) => set("dpoMode", v)}
            hint="La désignation d'un DPO est obligatoire pour les autorités publiques et pour les organismes dont l'activité de base implique un suivi régulier et systématique à grande échelle ou des données sensibles à grande échelle (RGPD, art. 37)."
          />
          {c.dpoMode !== "aucun" ? (
            <>
              <TextField
                label={c.dpoMode === "dpo" ? "Nom du délégué" : "Nom ou fonction du référent"}
                value={c.dpoName}
                onChange={(v) => set("dpoName", v)}
              />
              <TextField
                label="Coordonnées"
                hint="Adresse électronique dédiée de préférence."
                value={c.dpoContact}
                onChange={(v) => set("dpoContact", v)}
              />
            </>
          ) : null}
        </FormSection>

        <FormSection title="Traitements" step={++step} defaultOpen>
          <p className="text-sm text-muted">
            Cochez les traitements que vous mettez réellement en œuvre. Finalité, base légale et durée sont
            préremplies à partir des recommandations de la CNIL : adaptez-les à votre pratique.
          </p>
          <ul className="space-y-3">
            {c.treatments.map((t) => (
              <li key={t.id} className="rounded-2xl border border-line bg-surface-low p-4">
                <CheckField
                  label={t.label}
                  checked={t.enabled}
                  onChange={(v) => updateTreatment(t.id, { enabled: v })}
                />
                {t.enabled ? (
                  <fieldset className="mt-4 space-y-4">
                    <legend className="sr-only">Détail du traitement « {t.label} »</legend>
                    <TextField
                      label="Finalité"
                      multiline
                      value={t.purpose}
                      onChange={(v) => updateTreatment(t.id, { purpose: v })}
                    />
                    <SelectField
                      label="Base légale"
                      value={t.basis}
                      options={BASIS_OPTIONS}
                      onChange={(v) => updateTreatment(t.id, { basis: v as BasisId })}
                      hint={
                        t.id === "audience"
                          ? "Une solution de mesure d'audience exemptée de consentement par la CNIL peut reposer sur l'intérêt légitime ; à défaut, le consentement est requis."
                          : undefined
                      }
                    />
                    {t.basis === "f" ? (
                      <TextField
                        label="Intérêt légitime poursuivi"
                        hint="À indiquer aux personnes (RGPD, art. 13, § 1, d)."
                        value={t.interest}
                        onChange={(v) => updateTreatment(t.id, { interest: v })}
                      />
                    ) : null}
                    <TextField
                      label="Données traitées"
                      multiline
                      value={t.data}
                      onChange={(v) => updateTreatment(t.id, { data: v })}
                    />
                    <TextField
                      label="Durée de conservation"
                      multiline
                      value={t.retention}
                      onChange={(v) => updateTreatment(t.id, { retention: v })}
                    />
                  </fieldset>
                ) : null}
              </li>
            ))}
          </ul>
        </FormSection>

        <FormSection title="Destinataires et sous-traitants" step={++step}>
          <p className="text-sm text-muted">
            Hébergeur, outil d&apos;envoi de courriels, prestataire de paiement, solution de mesure
            d&apos;audience, logiciel de gestion… Chacun doit être lié par un contrat conforme à l&apos;article 28.
          </p>
          {c.recipients.length > 0 ? (
            <ol className="space-y-3">
              {c.recipients.map((r, i) => (
                <li key={r.key} className="rounded-2xl border border-line bg-surface-low p-4">
                  <fieldset className="space-y-4">
                    <legend className="text-sm font-semibold text-ink-2">Destinataire {i + 1}</legend>
                    <TextField label="Nom" value={r.name} onChange={(v) => updateRecipient(r.key, { name: v })} />
                    <TextField
                      label="Rôle"
                      hint="Par exemple « hébergement du site », « envoi de la lettre d'information »."
                      value={r.role}
                      onChange={(v) => updateRecipient(r.key, { role: v })}
                    />
                    <TextField
                      label="Pays de traitement"
                      value={r.country}
                      onChange={(v) => updateRecipient(r.key, { country: v })}
                    />
                    <button type="button" onClick={() => removeRecipient(r.key, i)} className={smallButtonClass}>
                      Supprimer le destinataire {i + 1}
                    </button>
                  </fieldset>
                </li>
              ))}
            </ol>
          ) : null}
          <button type="button" onClick={addRecipient} className={smallButtonClass}>
            Ajouter un destinataire
          </button>
          <p role="status" className="min-h-6 text-sm text-ink-2">
            {listStatus}
          </p>
        </FormSection>

        <FormSection title="Transferts hors Union européenne" step={++step}>
          <CheckField
            label="Des données sont transférées hors de l'Espace économique européen"
            hint="Y compris lorsqu'un prestataire européen recourt à un sous-traitant établi hors de l'EEE, ou lorsque des données sont accessibles depuis un pays tiers."
            checked={c.transfers}
            onChange={(v) => set("transfers", v)}
          />
          {c.transfers ? (
            <>
              <TextField
                label="Pays et destinataires concernés"
                hint="Par exemple « États-Unis (hébergement, envoi de courriels) »."
                multiline
                value={c.transferCountries}
                onChange={(v) => set("transferCountries", v)}
              />
              <fieldset>
                <legend className="text-sm font-medium text-ink-2">Garanties encadrant les transferts</legend>
                <div className="mt-2 space-y-3">
                  {GUARANTEE_IDS.map((g) => (
                    <CheckField
                      key={g}
                      label={GUARANTEE_LABELS[g]}
                      checked={c.guarantees.includes(g)}
                      onChange={(v) => toggleGuarantee(g, v)}
                    />
                  ))}
                </div>
              </fieldset>
            </>
          ) : null}
        </FormSection>

        <FormSection title="Cookies, sécurité, décisions automatisées" step={++step}>
          <TextField
            label="Adresse de la politique de gestion des cookies"
            hint="Par exemple /cookies"
            value={c.cookiesUrl}
            onChange={(v) => set("cookiesUrl", v)}
          />
          <TextField
            label="Où se trouve le lien de gestion des cookies"
            hint="Par exemple « le lien « Gérer les cookies » en pied de page »."
            value={c.cookiesLink}
            onChange={(v) => set("cookiesLink", v)}
          />
          <TextField
            label="Mesures de sécurité"
            multiline
            hint="Décrivez les mesures réellement en place, sans détail exploitable par un attaquant."
            value={c.security}
            onChange={(v) => set("security", v)}
          />
          <CheckField
            label="Des décisions sont prises sur le seul fondement d'un traitement automatisé"
            hint="Notation, refus automatique, profilage produisant des effets juridiques ou significatifs (RGPD, art. 22)."
            checked={c.automatedDecision}
            onChange={(v) => set("automatedDecision", v)}
          />
        </FormSection>
      </form>

      <DocOutput doc={doc} fileBase={privacyPolicyFileBase(c)} />
    </div>
  );
}
