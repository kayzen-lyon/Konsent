"use client";

import { useMemo, useState } from "react";

/**
 * Simulateur d'exposition théorique.
 *
 * Le garde-fou du PRD (§3.2, point 2) est appliqué ici sans exception :
 * le plafond légal n'apparaît JAMAIS seul. Il est toujours affiché avec la
 * fourchette réellement observée en procédure simplifiée et avec le coût de
 * mise en conformité.
 *
 * L'écart entre ces trois chiffres EST l'argument. Il n'a besoin d'aucune
 * exagération, et afficher le seul plafond serait une pratique commerciale
 * trompeuse au sens de l'article L. 121-1 du code de la consommation.
 */

interface Breach {
  id: string;
  label: string;
  reference: string;
  /** Poids relatif dans l'estimation du coût de correction. */
  fixCost: number;
  defaultChecked: boolean;
}

const BREACHES: readonly Breach[] = [
  {
    id: "depot",
    label: "Traceurs déposés avant consentement",
    reference: "Art. 82 loi n° 78-17",
    fixCost: 690,
    defaultChecked: true,
  },
  {
    id: "refus",
    label: "Refus aussi simple que l'acceptation absent",
    reference: "Délib. CNIL n° 2020-092",
    fixCost: 390,
    defaultChecked: true,
  },
  {
    id: "info",
    label: "Défaut d'information des personnes",
    reference: "RGPD, art. 13 et 14",
    fixCost: 490,
    defaultChecked: false,
  },
  {
    id: "transfert",
    label: "Transferts hors UE non documentés",
    reference: "RGPD, art. 44 à 49",
    fixCost: 890,
    defaultChecked: false,
  },
  {
    id: "registre",
    label: "Absence de registre des traitements",
    reference: "RGPD, art. 30",
    fixCost: 690,
    defaultChecked: false,
  },
];

const GDPR_FLAT_CEILING = 20_000_000;
const GDPR_RATE = 0.04;
/** 300 000 € (art. 226-16 CP) x 5 pour une personne morale (art. 131-38 CP). */
const CRIMINAL_CEILING = 1_500_000;
/** Plafond légal de la procédure simplifiée, art. 22-1 de la loi n° 78-17. */
const SIMPLIFIED_MAX = 20_000;
const SIMPLIFIED_MIN = 2_000;

/** Paliers de chiffre d'affaires, en euros — progression lisible au curseur. */
const REVENUE_STEPS = [
  100_000, 250_000, 500_000, 1_000_000, 2_000_000, 3_000_000, 5_000_000, 7_500_000,
  10_000_000, 15_000_000, 25_000_000, 50_000_000, 100_000_000, 250_000_000, 500_000_000,
];

function eur(value: number, compact = false): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
    ...(compact ? { notation: "compact", maximumFractionDigits: 1 } : {}),
  }).format(value);
}

export function FineSimulator({ compact = false }: { compact?: boolean }) {
  const [stepIndex, setStepIndex] = useState(6); // 5 M€ par défaut
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(BREACHES.filter((b) => b.defaultChecked).map((b) => b.id)),
  );

  const revenue = REVENUE_STEPS[stepIndex] ?? 5_000_000;

  const result = useMemo(() => {
    const selected = BREACHES.filter((b) => checked.has(b.id));
    const fourPercent = revenue * GDPR_RATE;
    const ceiling = Math.max(GDPR_FLAT_CEILING, fourPercent);
    const fromRevenue = fourPercent > GDPR_FLAT_CEILING;

    // Coût de correction : les chantiers se mutualisent largement, corriger
    // cinq écarts ne coûte pas cinq fois le prix d'un seul.
    const rawFix = selected.reduce((sum, b) => sum + b.fixCost, 490);
    const fixLow = Math.round((490 + (rawFix - 490) * 0.55) / 10) * 10;
    const fixHigh = Math.round((490 + (rawFix - 490) * 1.15) / 10) * 10;

    return { ceiling, fourPercent, fromRevenue, count: selected.length, fixLow, fixHigh };
  }, [revenue, checked]);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div
      className={`rounded-xl bg-surface p-6 shadow-lg ring-1 ring-ink/10 ${compact ? "" : "sm:p-8"}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="display text-xl text-ink-2">Simulateur d&apos;exposition</h3>
          <p className="mt-1 text-sm text-muted">
            Ajustez les paramètres pour situer votre exposition théorique.
          </p>
        </div>
      </div>

      {/* ── Chiffre d'affaires ── */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <label htmlFor="ca" className="tech text-[10px] text-muted">
            Chiffre d&apos;affaires annuel mondial
          </label>
          <span className="tabular font-mono text-sm font-bold text-ink-2">
            {eur(revenue, true)}
          </span>
        </div>
        <input
          id="ca"
          type="range"
          min={0}
          max={REVENUE_STEPS.length - 1}
          step={1}
          value={stepIndex}
          onChange={(e) => setStepIndex(Number(e.target.value))}
          className="range-flame mt-3 w-full"
          aria-valuetext={eur(revenue)}
        />
      </div>

      {/* ── Manquements ── */}
      <fieldset className="mt-6">
        <legend className="tech text-[10px] text-muted">Manquements retenus</legend>
        <div className="mt-3 space-y-1.5">
          {BREACHES.map((b) => {
            const on = checked.has(b.id);
            return (
              <label
                key={b.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-2.5 transition ${
                  on ? "border-flame/40 bg-flame-bg" : "border-line hover:border-line-2"
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(b.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#2563eb]"
                />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium leading-snug text-ink-2">
                    {b.label}
                  </span>
                  <span className="block font-mono text-[11px] text-muted">{b.reference}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* ── Résultat : les trois chiffres, toujours ensemble ── */}
      <div className="mt-6 space-y-2.5">
        <div className="rounded-lg border-l-4 border-crit bg-slate-50 p-4">
          <p className="tech text-[10px] text-muted">Plafond légal théorique</p>
          <p className="tabular display mt-0.5 text-3xl text-crit">{eur(result.ceiling)}</p>

          {/* Le calcul est montré, pas asséné : l'article 83(5) retient le
              PLUS ÉLEVÉ des deux termes. Pour une PME, c'est toujours le
              plancher de 20 M€ — et le dire évite de laisser croire que le
              montant a été calculé sur son chiffre d'affaires. */}
          <dl className="mt-3 space-y-1 border-t border-line pt-2.5 font-mono text-[11px]">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">4 % de votre CA</dt>
              <dd className={`tabular ${result.fromRevenue ? "font-bold text-crit" : "text-muted"}`}>
                {eur(result.fourPercent)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Plancher légal</dt>
              <dd className={`tabular ${result.fromRevenue ? "text-muted" : "font-bold text-crit"}`}>
                {eur(GDPR_FLAT_CEILING)}
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-line pt-1">
              <dt className="text-ink-2">Retenu : le plus élevé</dt>
              <dd className="tabular font-bold text-ink-2">{eur(result.ceiling)}</dd>
            </div>
          </dl>

          <p className="mt-2.5 text-[11px] leading-snug text-muted">
            Article 83(5) du RGPD. Volet pénal distinct : jusqu&apos;à {eur(CRIMINAL_CEILING)}{" "}
            pour une personne morale (art. 226-16 du code pénal et 131-38 du même code).
          </p>
        </div>

        <div className="rounded-lg border-l-4 border-warn bg-slate-50 p-4">
          <p className="tech text-[10px] text-muted">Fourchette réellement observée</p>
          <p className="tabular display mt-0.5 text-2xl text-warn">
            {eur(SIMPLIFIED_MIN)} – {eur(SIMPLIFIED_MAX)}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-muted">
            La procédure simplifiée traite la majorité des dossiers cookies. Son plafond est
            fixé à 20 000 € par décision (art. 22-1 de la loi n° 78-17).
          </p>
        </div>

        <div className="rounded-lg border-l-4 border-ok bg-slate-50 p-4">
          <p className="tech text-[10px] text-muted">
            Coût estimé de mise en conformité · {result.count} manquement
            {result.count > 1 ? "s" : ""}
          </p>
          <p className="tabular display mt-0.5 text-2xl text-ok">
            {result.count === 0 ? "—" : `${eur(result.fixLow)} – ${eur(result.fixHigh)}`}
          </p>
        </div>
      </div>

      <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-muted">
        Ces montants sont des <strong className="text-ink-2">plafonds légaux théoriques</strong>.
        Ils ne constituent ni une prévision ni une estimation de sanction, et ne préjugent
        d&apos;aucune décision d&apos;une autorité de contrôle ou d&apos;une juridiction.
      </p>
    </div>
  );
}
