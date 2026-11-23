import { DISCLAIMER_SHORT, EDITOR } from "@/lib/disclaimer";
import { EFFORT_METHOD, findingMinutes, formatDuration } from "@/lib/report/effort";
import { ADEQUACY_SHORT, countryName } from "@/lib/report/jurisdictions";
import { verifiedByFamily } from "@/lib/report/coverage";
import { SEVERITY_LABELS } from "@/lib/rulepack";
import { pillarTitle, type DocumentModel } from "./model";

type Props = { m: DocumentModel };

const PHASE_TITLES = {
  A: "Avant tout choix",
  B: "Après refus",
  C: "Après acceptation",
} as const;

function Head({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <>
      <p className="kzd-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {lead ? <p className="kzd-lead">{lead}</p> : null}
    </>
  );
}

export function Findings({ m }: Props) {
  return (
    <section className="kzd-section kzd-break">
      <Head
        eyebrow="Constats"
        title="Diagnostic par gravité"
        lead="Chaque constat porte sa preuve et sa référence. Seuls la CNIL ou un juge peuvent qualifier une infraction."
      />
      {m.ranked.length === 0 ? (
        <div className="kzd-verdict">
          <p>
            <strong>Aucun écart relevé sur les points vérifiés.</strong>
          </p>
          <p>Ce résultat ne vaut pas certification.</p>
        </div>
      ) : (
        <table className="kzd-table">
          <thead>
            <tr>
              <th scope="col" style={{ width: "14%" }}>
                Gravité
              </th>
              <th scope="col" style={{ width: "48%" }}>
                Constat et preuve
              </th>
              <th scope="col">Correction</th>
            </tr>
          </thead>
          <tbody>
            {m.ranked.map(({ finding, rule }) => (
              <tr key={finding.ruleId}>
                <td>
                  <span className={`kzd-sev kzd-sev-${finding.severity}`}>
                    {SEVERITY_LABELS[finding.severity]}
                  </span>
                </td>
                <td>
                  <strong>{rule.title}</strong>
                  <span className="kzd-small">{pillarTitle(rule)}</span>
                  <p>{rule.messageExec}</p>
                  <ul className="kzd-small">
                    {finding.evidence.slice(0, 3).map((e, i) => (
                      <li key={i}>
                        {e.label}
                        {e.detail ? ` : ${e.detail}` : ""}
                      </li>
                    ))}
                  </ul>
                  <p className="kzd-mono">
                    {rule.id} · {rule.references[0]}
                  </p>
                </td>
                <td>
                  <ul>
                    {rule.remediation.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                  <p className="kzd-small">Effort : {formatDuration(findingMinutes(rule)).short}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function Plan({ m }: Props) {
  return (
    <section className="kzd-section">
      <Head
        eyebrow="Feuille de route"
        title="Plan d'action"
        lead="Échéances conseillées, par ordre de gravité."
      />
      <div className="kzd-phases">
        {m.phases.map((p) => (
          <div key={p.label} className="kzd-phase">
            <div>
              <p className="kzd-phase-num">{p.label}</p>
              <p className="kzd-phase-when">{p.when}</p>
            </div>
            <div>
              <p>{p.intro}</p>
              <ul>
                {p.items.map((i) => (
                  <li key={i.title}>
                    {i.title}
                    {i.effort ? ` (${i.effort})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
      <p className="kzd-small kzd-note">{EFFORT_METHOD}</p>
    </section>
  );
}

export function Recipients({ m }: Props) {
  const { vendors } = m.result;
  return (
    <section className="kzd-section">
      <Head
        eyebrow="Souveraineté"
        title="Qui reçoit les données"
        lead="Services observés sur l'ensemble de l'analyse, y compris après acceptation."
      />
      {vendors.length === 0 ? (
        <p className="kzd-lead">Aucun destinataire tiers connu n&apos;a été identifié.</p>
      ) : (
        <table className="kzd-table">
          <thead>
            <tr>
              <th scope="col">Service</th>
              <th scope="col">Entité et société mère</th>
              <th scope="col">Juridiction effective</th>
              <th scope="col">Cadre</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v.slug}>
                <td>
                  <strong>{v.name}</strong>
                </td>
                <td>
                  {v.entity}
                  {v.ultimateParent ? ` (${v.ultimateParent})` : ""}
                </td>
                <td>{countryName(v.effectiveJurisdiction)}</td>
                <td>{ADEQUACY_SHORT[v.adequacy]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function Screens({ m }: Props) {
  const shots = m.result.screenshots ?? [];
  if (shots.length === 0) return null;
  return (
    <section className="kzd-section">
      <Head eyebrow="Preuve visuelle" title="Le site pendant l'analyse" />
      <div className="kzd-shots">
        {shots.map((s) => (
          <figure key={s.phase}>
            {/* eslint-disable-next-line @next/next/no-img-element -- JPEG base64 du worker */}
            <img
              src={`data:image/jpeg;base64,${s.jpegBase64}`}
              alt={`Capture du site, phase ${s.phase} : ${PHASE_TITLES[s.phase]}`}
            />
            <figcaption className="kzd-small">
              {s.phase} · {PHASE_TITLES[s.phase]}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function Verified({ m }: Props) {
  return (
    <section className="kzd-section kzd-break">
      <Head
        eyebrow="Couverture"
        title={`${m.evaluatedCount} points vérifiés`}
        lead="Chaque point contrôlé par cette analyse et son résultat. « Non constaté » signifie que l’écart décrit n’a pas été détecté, pas que le point est certifié."
      />
      <div className="kzd-columns">
        {verifiedByFamily(m.result).map((g) => (
          <div key={g.family}>
            <h3>{g.family}</h3>
            {g.items.map(({ rule, raised }) => (
              <p key={rule.id}>
                <span className={raised ? "kzd-ko" : "kzd-ok"}>{raised ? "Constaté" : "Non constaté"}</span>{" "}
                <b>{rule.id}</b> {rule.title}
              </p>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export function Limits({ m }: Props) {
  return (
    <section className="kzd-section kzd-break">
      <Head
        eyebrow="Limites"
        title={`${m.result.notEvaluatedRuleIds.length} points non vérifiés`}
        lead="Ni conformes ni non conformes : le moteur ne sait pas encore les contrôler, l'analyse n'a pas obtenu de quoi conclure, ou une vérification humaine est nécessaire."
      />
      <div className="kzd-columns">
        {m.outOfReach.map((g) => (
          <div key={g.family}>
            <h3>{g.family}</h3>
            {g.rules.map((r) => (
              <p key={r.id}>
                <b>{r.id}</b> {r.title}
              </p>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export function Method({ m }: Props) {
  return (
    <section className="kzd-section">
      <Head
        eyebrow="Méthode"
        title="Méthode et références"
        lead={
          m.headless
            ? "Le site est chargé dans trois navigateurs distincts : sans interaction, après refus, après acceptation. Les pages légales, en-têtes et DNS sont lus séparément."
            : "Lecture du document servi, des en-têtes, du DNS et des pages légales, sans exécuter le site."
        }
      />
      <ul className="kzd-small kzd-note">
        {m.references.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <div className="kzd-signature">
        <p className="kzd-small">
          <strong>Konsent, un service {EDITOR.tradeName}</strong>
          <br />
          {EDITOR.legalName} · {EDITOR.address}
        </p>
        <p className="kzd-small">{DISCLAIMER_SHORT}</p>
      </div>
    </section>
  );
}
