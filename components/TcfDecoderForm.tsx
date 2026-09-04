"use client";

import { useMemo, useState } from "react";
import { decodeTcString, type TcfCore } from "@/lib/tcf/decode";
import { purposeLabel, TCF_PURPOSES, TCF_SPECIAL_FEATURES } from "@/lib/tcf/purposes";

/**
 * Décodeur exécuté côté client.
 *
 * Le choix n'est pas technique, il est politique : une chaîne de consentement
 * décrit le comportement d'un site réel et parfois de ses visiteurs. La faire
 * transiter par nos serveurs pour un outil gratuit serait exactement le genre
 * de collecte que le produit reproche aux autres. Elle ne sort pas du
 * navigateur, et la page le dit.
 */
export default function TcfDecoderForm() {
  const [value, setValue] = useState("");

  const result = useMemo(() => {
    if (value.trim() === "") return null;
    return decodeTcString(value);
  }, [value]);

  return (
    <div className="mt-8">
      <label htmlFor="tcstring" className="block text-sm font-medium text-ink">
        Chaîne de consentement
      </label>
      <textarea
        id="tcstring"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        spellCheck={false}
        placeholder="CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA"
        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-mono text-sm text-ink outline-none focus:border-flame focus:ring-1 focus:ring-flame"
      />

      {result === null ? null : !result.ok ? (
        <div className="mt-6 rounded-lg border border-crit/30 bg-crit/5 px-5 py-4">
          <p className="font-medium text-crit">Chaîne non décodable</p>
          <p className="mt-1 text-sm text-slate-600">
            Motif : {result.reason}.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Une chaîne illisible n&apos;est pas un détail technique. Elle signifie que vous ne
            pouvez pas démontrer ce que vos visiteurs ont accepté — c&apos;est le constat{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">KZC-TCF-002</code> du
            référentiel.
          </p>
        </div>
      ) : (
        <Decoded core={result.core} segments={result.segments} />
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 border-b border-slate-100 py-2.5 last:border-0">
      <dt className="w-56 shrink-0 text-sm text-muted">{label}</dt>
      <dd className="flex-1 text-sm text-ink">{children}</dd>
    </div>
  );
}

function Decoded({
  core,
  segments,
}: {
  core: TcfCore;
  segments: number;
}) {
  const targeting = TCF_PURPOSES.filter((p) => !p.legitimateInterestDefensible).map((p) => p.id);
  const abusiveLi = core.purposesLegitimateInterest.filter((p) => targeting.includes(p));

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-lg border border-slate-200 bg-surface p-6">
        <h2 className="display text-xl text-ink-2">Ce que la chaîne déclare</h2>
        <dl className="mt-4">
          <Row label="Version du cadre">TCF v{core.version}</Row>
          <Row label="Recueilli le">
            {new Date(core.created).toLocaleString("fr-FR", { timeZone: "UTC" })} UTC
          </Row>
          <Row label="Dernière mise à jour">
            {new Date(core.lastUpdated).toLocaleString("fr-FR", { timeZone: "UTC" })} UTC
          </Row>
          <Row label="Identifiant de la CMP">{core.cmpId}</Row>
          <Row label="Langue du bandeau">{core.consentLanguage}</Row>
          <Row label="Pays de l'éditeur">{core.publisherCC}</Row>
          <Row label="Version de la liste des partenaires">{core.vendorListVersion}</Row>
          <Row label="Partenaires ayant un consentement">{core.vendorConsents.length}</Row>
          <Row label="Partenaires en intérêt légitime">
            {core.vendorLegitimateInterests.length}
          </Row>
          <Row label="Restrictions posées par l'éditeur">
            {core.publisherRestrictions.length === 0 ? (
              <span className="text-warn">aucune</span>
            ) : (
              core.publisherRestrictions.length
            )}
          </Row>
          <Row label="Segments">{segments}</Row>
        </dl>
      </div>

      <div className="rounded-lg border border-slate-200 bg-surface p-6">
        <h2 className="display text-xl text-ink-2">Finalités</h2>
        <p className="mt-2 text-sm text-muted">
          À gauche, ce que le visiteur a accepté. À droite, ce qui est activé sans son accord, au
          titre de l&apos;intérêt légitime.
        </p>
        <ul className="mt-4 space-y-2">
          {TCF_PURPOSES.map((p) => {
            const consented = core.purposesConsent.includes(p.id);
            const li = core.purposesLegitimateInterest.includes(p.id);
            const problematic = li && !p.legitimateInterestDefensible;
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-start gap-3 border-b border-slate-100 pb-2 last:border-0"
              >
                <span className="tech w-8 shrink-0 pt-0.5 text-[10px] text-muted">
                  {String(p.id).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 text-sm text-ink">{p.plain}</span>
                <span className="flex shrink-0 gap-2">
                  {consented ? (
                    <span className="rounded bg-ok-bg px-2 py-0.5 text-xs text-ok">consenti</span>
                  ) : null}
                  {li ? (
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        problematic ? "bg-crit text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      intérêt légitime
                    </span>
                  ) : null}
                  {!consented && !li ? (
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      inactive
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {abusiveLi.length > 0 ? (
        <div className="rounded-lg border border-crit/30 bg-crit/5 p-6">
          <p className="font-medium text-crit">
            {abusiveLi.length} finalité{abusiveLi.length > 1 ? "s" : ""} de ciblage activée
            {abusiveLi.length > 1 ? "s" : ""} sans consentement
          </p>
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            {abusiveLi.map((id) => (
              <li key={id}>— {purposeLabel(id)}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Ces finalités sont activées au titre de l&apos;« intérêt légitime », donc sans demander
            l&apos;accord du visiteur. La Cour de justice de l&apos;Union européenne a jugé le
            4 octobre 2024 (affaire C-621/22) qu&apos;un intérêt purement commercial ne suffit pas
            à lui seul à fonder cette base. C&apos;est le constat{" "}
            <code className="rounded bg-surface px-1.5 py-0.5 text-xs">KZC-TCF-006</code>.
          </p>
        </div>
      ) : null}

      {core.specialFeatureOptIns.length > 0 ? (
        <div className="rounded-lg border border-warn-bg bg-warn-bg/40 p-6">
          <p className="font-medium text-warn">Fonctionnalités spéciales acceptées</p>
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            {core.specialFeatureOptIns.map((id) => (
              <li key={id}>
                — {TCF_SPECIAL_FEATURES.find((f) => f.id === id)?.plain ?? `Fonctionnalité ${id}`}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
