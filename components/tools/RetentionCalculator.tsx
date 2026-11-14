"use client";

import { useEffect, useMemo, useState } from "react";
import {
  RETENTION_RULES,
  addDuration,
  durationLabel,
  formatDateFr,
  getRetentionRule,
  parseIsoDate,
} from "@/lib/tools/retention";

/** Calculateur de durée de conservation, entièrement côté client. */

const inputClass =
  "mt-2 w-full rounded-2xl border border-line-2 bg-surface px-4 py-3 text-[15px] text-ink-2 outline-none";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const GROUPS = Array.from(new Set(RETENTION_RULES.map((r) => r.group)));

export default function RetentionCalculator() {
  const [ruleId, setRuleId] = useState(RETENTION_RULES[0]!.id);
  // Date du jour fixée après hydratation : le serveur et le navigateur
  // peuvent ne pas être le même jour.
  const [date, setDate] = useState("");
  const [touched, setTouched] = useState(false);
  useEffect(() => setDate((d) => d || todayIso()), []);
  const rule = getRetentionRule(ruleId)!;
  const start = parseIsoDate(date);
  const end = useMemo(() => (start ? addDuration(start, rule.amount, rule.unit) : null), [start, rule]);
  const dateError =
    date !== "" && !start
      ? "La date saisie n'est pas valide."
      : date === "" && touched
        ? "Saisissez une date de départ."
        : "";
  const past = end ? end.getTime() < Date.now() : false;

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-2">
      <form
        className="space-y-6 rounded-3xl border border-line bg-surface p-6"
        onSubmit={(e) => e.preventDefault()}
        aria-labelledby="rc-form-title"
      >
        <h2 id="rc-form-title" className="display text-xl text-ink-2">
          Donnée concernée
        </h2>
        <div>
          <label htmlFor="rc-type" className="block text-sm font-medium text-ink-2">
            Type de donnée ou de traceur
          </label>
          <select id="rc-type" value={ruleId} onChange={(e) => setRuleId(e.target.value)} className={inputClass}>
            {GROUPS.map((g) => (
              <optgroup key={g} label={g}>
                {RETENTION_RULES.filter((r) => r.group === g).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="rc-date" className="block text-sm font-medium text-ink-2">
            Date de départ du délai
          </label>
          <p id="rc-date-hint" className="mt-1 text-sm text-muted">
            Point de départ pour ce type : {rule.start}.
          </p>
          <input
            id="rc-date"
            type="date"
            value={date}
            onChange={(e) => {
              setTouched(true);
              setDate(e.target.value);
            }}
            aria-describedby={`rc-date-hint${dateError ? " rc-date-error" : ""}`}
            aria-invalid={dateError ? true : undefined}
            className={inputClass}
          />
          {dateError ? (
            <p id="rc-date-error" role="alert" className="mt-2 text-sm text-crit-text">
              {dateError}
            </p>
          ) : null}
        </div>
      </form>

      <section className="rounded-3xl border border-line bg-surface p-6" aria-labelledby="rc-result">
        <p className="tech text-[10px] text-accent">{rule.nature}</p>
        <h2 id="rc-result" className="display mt-2 text-2xl text-ink-2">
          {durationLabel(rule)}
        </h2>
        <p role="status" aria-live="polite" className="mt-2 text-[15px] text-ink-2">
          {end ? (
            <>
              Échéance : <strong className="text-flame">{formatDateFr(end)}</strong>
              {past ? " — date déjà passée" : ""}
            </>
          ) : (
            "Saisissez une date valide pour calculer l'échéance."
          )}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-ink-2">{rule.summary}</p>
        {rule.note ? <p className="mt-3 text-sm leading-relaxed text-muted">{rule.note}</p> : null}
        <h3 className="display mt-6 text-base text-ink-2">Sources</h3>
        <ul className="mt-2 space-y-2 text-sm leading-relaxed text-muted">
          {rule.sources.map((s) => (
            <li key={s}>— {s}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
