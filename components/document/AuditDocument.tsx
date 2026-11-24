import Image from "next/image";
import embleme from "@/public/brand/konsent-embleme-sombre.png";
import { DISCLAIMER_SHORT, EDITOR } from "@/lib/disclaimer";
import { pillarScores } from "@/lib/report/pillars";
import { RULEPACK } from "@/lib/rulepack";
import type { DocumentModel } from "./model";
import { Findings, Limits, Method, Plan, Recipients, Screens, Verified } from "./DocumentSections";

function Cover({ m }: { m: DocumentModel }) {
  const { result } = m;
  const date = new Date(result.scannedAt).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  });
  return (
    <section className="kzd-sheet kzd-cover">
      <div className="kzd-cover-top">
        <Image src={embleme} alt="Konsent by KAYZEN" height={64} priority />
        <p className="kzd-eyebrow">KAYZEN · Lyon</p>
      </div>
      <div className="kzd-cover-main">
        <p className="kzd-eyebrow">Cookies, traceurs et vie privée</p>
        <h1>
          Rapport d&apos;audit
          <br />
          de conformité RGPD
        </h1>
        <p className="kzd-site">{result.hostname}</p>
        <div className="kzd-cover-score">
          {m.degraded ? null : (
            <span className="kzd-big">
              {result.score}
              <small> / 100</small>
            </span>
          )}
          <span>
            <strong>{m.verdict}</strong>
            <br />
            {m.degraded
              ? `Site non noté : ${m.evaluatedCount} points vérifiés sur ${RULEPACK.total}. Relancez l'analyse.`
              : `Score indicatif, calculé sur ${m.evaluatedCount} des ${RULEPACK.total} points du référentiel`}
          </span>
        </div>
        <dl className="kzd-cover-meta">
          <div>
            <dt>Date d&apos;analyse</dt>
            <dd>{date}</dd>
          </div>
          <div>
            <dt>Méthode</dt>
            <dd>{m.headless ? "Navigateur réel, trois phases" : "Document servi, sans navigateur"}</dd>
          </div>
          <div>
            <dt>Référentiel</dt>
            <dd>{result.rulepackVersion}</dd>
          </div>
        </dl>
      </div>
      <div className="kzd-cover-bottom">
        <p className="kzd-cover-legal">
          Réf. {result.id}
          <br />
          {EDITOR.tradeName} · {EDITOR.address} · SIRET {EDITOR.siret}
          <br />
          {DISCLAIMER_SHORT}
        </p>
      </div>
    </section>
  );
}

function Summary({ m }: { m: DocumentModel }) {
  const [first, ...rest] = m.diagnosis;
  const { result } = m;
  const kpis = [
    { value: m.evaluatedCount, label: `points vérifiés sur ${RULEPACK.total}`, alert: false },
    { value: result.findings.length, label: "écarts relevés", alert: result.findings.length > 0 },
    { value: result.vendors.length, label: "destinataires tiers identifiés", alert: false },
    {
      value: result.outsideEea.length,
      label: "relevant d'une juridiction hors EEE",
      alert: result.outsideEea.length > 0,
    },
  ];
  return (
    <section className="kzd-section">
      <p className="kzd-eyebrow">Synthèse</p>
      <h2>L&apos;essentiel du diagnostic</h2>
      <div className="kzd-verdict">
        <p>
          <strong>{first}</strong>
        </p>
        {rest.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <div className="kzd-section">
        <h3>Ce que nous avons mesuré</h3>
        <div className="kzd-kpis">
          {kpis.map((k) => (
            <div key={k.label} className={`kzd-kpi${k.alert ? " is-alert" : ""}`}>
              <b>{k.value}</b>
              <span>{k.label}</span>
            </div>
          ))}
        </div>
      </div>
      {m.degraded ? null : (
      <div className="kzd-section">
        <h3>Score par pilier</h3>
        <div className="kzd-pillars">
          {pillarScores(result.findings).map((p) => (
            <div key={p.id}>
              <p className="kzd-pillar-head">
                <span>{p.title}</span>
                <em>{p.score} / 100</em>
              </p>
              <div className="kzd-bar" aria-hidden="true">
                <i className={p.score < 75 ? "is-low" : undefined} style={{ width: `${p.score}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="kzd-small kzd-note">Les points non vérifiés n&apos;entrent dans aucun score.</p>
      </div>
      )}
    </section>
  );
}

/** Rapport d'audit A4 : couverture, puis corps paginé à l'impression. */
export function AuditDocument({ model: m }: { model: DocumentModel }) {
  return (
    <article>
      <Cover m={m} />
      <div className="kzd-sheet kzd-body">
        <Summary m={m} />
        <Findings m={m} />
        <Plan m={m} />
        <Recipients m={m} />
        <Screens m={m} />
        <Verified m={m} />
        <Limits m={m} />
        <Method m={m} />
      </div>
    </article>
  );
}
