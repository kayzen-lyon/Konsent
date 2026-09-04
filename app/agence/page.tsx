import Link from "next/link";
import { cookies } from "next/headers";
import { Suspense } from "react";
import type { Metadata } from "next";
import { OwnedDomains } from "@/components/OwnedDomains";
import { PortfolioForm } from "@/components/PortfolioForm";
import { SubAccounts } from "@/components/SubAccounts";
import { Disclaimer } from "@/components/primitives";
import { SESSION_COOKIE, getAccounts } from "@/lib/accounts";
import { DOMAIN_QUOTA, SUB_ACCOUNT_QUOTA, isAgency, visibleAccountIds } from "@/lib/agency/tenancy";
import { getStorage } from "@/lib/storage";
import { gradeColor } from "@/lib/risk/score";
import {
  MAX_PORTFOLIO_DOMAINS,
  parseBranding,
  scanPortfolio,
} from "@/lib/agency/portfolio";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Vue portefeuille",
  description:
    "Analysez plusieurs domaines clients en une passe et repérez lesquels nécessitent une intervention. Rapports personnalisables à la marque de votre agence.",
};

function PortfolioSkeleton({ count }: { count: number }) {
  return (
    <div className="pulse-soft space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-16 rounded-lg bg-line" />
      ))}
      <p className="font-mono text-sm text-muted">
        Analyse de {count} domaine(s) en cours, par vagues de quatre…
      </p>
    </div>
  );
}

async function PortfolioTable({
  domains,
  agency,
  accent,
}: {
  domains: readonly string[];
  agency: string | null;
  accent: string | null;
}) {
  const summary = await scanPortfolio(domains);
  const brandColor = accent ?? "#2563eb";

  return (
    <div className="space-y-6">
      {/* Synthèse */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Domaines analysés", value: String(summary.analysed), tone: "ink" },
          {
            label: "Score moyen",
            value: summary.averageScore === null ? "—" : `${summary.averageScore}/100`,
            tone: "ink",
          },
          {
            label: "À traiter en priorité",
            value: String(summary.needAttention),
            tone: summary.needAttention > 0 ? "crit" : "ok",
          },
          {
            label: "Constats critiques",
            value: String(summary.totalCritical),
            tone: summary.totalCritical > 0 ? "crit" : "ok",
          },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-surface p-4 ring-1 ring-line shadow-md">
            <p className="tech text-[9px] text-muted">{s.label}</p>
            <p
              className={`tabular display mt-1 text-2xl ${
                s.tone === "crit" ? "text-crit" : s.tone === "ok" ? "text-ok" : "text-ink-2"
              }`}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tableau */}
      <div className="overflow-hidden rounded-xl bg-surface ring-1 ring-line shadow-md">
        <header
          className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
          style={{ backgroundColor: agency ? brandColor : undefined }}
        >
          <div className={agency ? "text-white" : ""}>
            <p className={`tech text-[10px] ${agency ? "text-white/70" : "text-accent"}`}>
              {agency ? `Rapport préparé par ${agency}` : "Vue portefeuille"}
            </p>
            <h2 className={`display mt-1 text-xl ${agency ? "text-white" : "text-ink-2"}`}>
              {summary.rows.length} domaine{summary.rows.length > 1 ? "s" : ""}
            </h2>
          </div>
          <span className={`tech text-[9px] ${agency ? "text-white/60" : "text-muted"}`}>
            {new Date().toLocaleDateString("fr-FR", { dateStyle: "long" })}
          </span>
        </header>

        <div className="hidden grid-cols-[1.6fr_auto_1fr_1fr_auto] gap-5 bg-paper px-5 py-2.5 lg:grid">
          {["Domaine", "Score", "Constats", "Destinataires", ""].map((h, i) => (
            <span key={i} className="tech text-[9px] text-muted">
              {h}
            </span>
          ))}
        </div>

        <ul className="divide-y divide-line">
          {summary.rows.map((r) => (
            <li
              key={r.input}
              className="grid gap-3 px-5 py-4 lg:grid-cols-[1.6fr_auto_1fr_1fr_auto] lg:items-center lg:gap-5"
            >
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold text-ink-2">{r.hostname}</p>
                {r.ok ? (
                  <p className="tech mt-0.5 text-[9px] text-muted">
                    {r.cmpDetected ? "bandeau détecté" : "aucun bandeau détecté"} ·{" "}
                    {r.durationMs} ms
                  </p>
                ) : (
                  <p className="mt-0.5 text-[12px] text-warn">{r.error}</p>
                )}
              </div>

              {r.ok ? (
                <>
                  <div className="flex items-center gap-2">
                    <span
                      className="display grid h-8 w-8 shrink-0 place-items-center rounded text-sm text-white"
                      style={{ backgroundColor: gradeColor(r.grade ?? "F") }}
                    >
                      {r.grade}
                    </span>
                    <span className="tabular text-[15px] font-bold text-ink-2">{r.score}</span>
                  </div>

                  <p className="text-[13px] text-ink-2">
                    {r.findingCount} écart{(r.findingCount ?? 0) > 1 ? "s" : ""}
                    {(r.criticalCount ?? 0) > 0 ? (
                      <span className="tech ml-2 rounded bg-crit px-1.5 py-0.5 text-[9px] text-white">
                        {r.criticalCount} critique{(r.criticalCount ?? 0) > 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </p>

                  <p className="text-[13px] text-ink-2">
                    {r.vendorCount} tiers
                    {(r.outsideEeaCount ?? 0) > 0 ? (
                      <span className="ml-2 text-crit">
                        dont {r.outsideEeaCount} hors EEE
                      </span>
                    ) : null}
                  </p>

                  <Link
                    href={`/scan?url=${encodeURIComponent(r.input)}`}
                    className="tech shrink-0 rounded border border-line px-3 py-1.5 text-[9px] text-muted transition hover:border-flame hover:text-flame"
                  >
                    Rapport
                  </Link>
                </>
              ) : (
                <span className="tech rounded bg-warn-bg px-2 py-1 text-[9px] text-warn lg:col-span-4">
                  Non analysé
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {summary.worst ? (
        <div className="rounded-xl bg-ink p-6">
          <p className="tech text-[10px] text-flame-soft">À traiter en premier</p>
          <h3 className="display mt-2 text-xl text-white">{summary.worst.hostname}</h3>
          <p className="mt-2 text-[14px] leading-relaxed text-white/65">
            Score de {summary.worst.score}/100 ({summary.worst.grade}), {summary.worst.findingCount}{" "}
            écart(s) dont {summary.worst.criticalCount} critique(s). C&apos;est le domaine du
            portefeuille dont l&apos;exposition est la plus forte.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/scan?url=${encodeURIComponent(summary.worst.input)}`}
              className="tech rounded-full bg-flame shadow-md px-5 py-2.5 text-[11px] text-white transition hover:bg-flame-dark"
            >
              Ouvrir le rapport
            </Link>
            <Link
              href={`/devis?url=${encodeURIComponent(summary.worst.input)}`}
              className="tech rounded border border-white/25 px-5 py-2.5 text-[11px] text-white transition hover:border-white/60"
            >
              Estimer la correction
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Panneau des sous-comptes, visible de la seule agence connectée.
 *
 * Rendu côté serveur avec la liste déjà chargée : afficher un panneau vide
 * puis le remplir par une requête laisserait apparaître, une fraction de
 * seconde, un portefeuille sans clients. Sur un écran partagé en réunion, ce
 * genre de détail se remarque.
 */
async function AgencyPanel() {
  const accounts = getAccounts();
  if (!accounts.available) return null;

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const account = await accounts.accountForSession(token).catch(() => null);
  if (!account) return null;

  // Un compte Pro connecté ne voit rien de ce panneau : le cloisonnement ne
  // commence pas à l'affichage, mais il commence AUSSI à l'affichage.
  if (!isAgency({ id: account.id, plan: account.plan, parentId: account.parentId })) return null;

  const children = await accounts.subAccounts(account.id).catch(() => []);

  // La liste des comptes visibles vient de `visibleAccountIds` et de nulle
  // part ailleurs : c'est le seul endroit éprouvé, et le portefeuille en
  // découle mécaniquement plutôt que d'une requête écrite à la main.
  const actor = { id: account.id, plan: account.plan, parentId: account.parentId };
  const visible = visibleAccountIds(
    actor,
    children.map((c) => ({ id: c.id, plan: c.plan, parentId: c.parentId })),
  );

  const storage = getStorage();
  const domains = storage.available
    ? await storage.domainsForAccounts(visible).catch(() => [])
    : [];

  const owners = Object.fromEntries(children.map((c) => [c.id, c.email]));

  return (
    <section className="mb-10 space-y-5">
      <SubAccounts
        quota={SUB_ACCOUNT_QUOTA[account.plan]}
        initial={children.map((c) => ({ id: c.id, email: c.email, createdAt: c.createdAt }))}
      />
      <OwnedDomains
        domains={domains}
        owners={owners}
        quota={DOMAIN_QUOTA[account.plan]}
        emptyHint="Aucun domaine rattaché. Un domaine devient vôtre lorsqu'il est inscrit à la surveillance depuis une session connectée ; ceux de vos clients apparaissent ici avec leur nom."
      />
    </section>
  );
}

export default async function AgencyPage({
  searchParams,
}: {
  searchParams: Promise<{ domaines?: string; agence?: string; couleur?: string }>;
}) {
  const params = await searchParams;
  const branding = parseBranding(params);
  const domains = (params.domaines ?? "")
    .split(/[\s,;]+/)
    .map((d) => d.trim())
    .filter(Boolean);

  return (
    <>
      <section className="grid-bg-dark bg-ink">
        <div className="mx-auto max-w-7xl px-5 py-14">
          <p className="tech text-[10px] text-flame-soft">Programme agence</p>
          <h1 className="display mt-3 max-w-3xl text-3xl text-white sm:text-[2.8rem]">
            Vos soixante clients, sur un seul écran
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-white/65">
            Une agence n&apos;a pas besoin d&apos;un rapport : elle a besoin de savoir lequel de
            ses clients pose problème ce matin. Analysez plusieurs domaines en une passe, avec
            des rapports personnalisables à votre marque.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 py-14">
        {domains.length > 0 ? (
          <>
            <div className="mb-8">
              <Link href="/agence" className="tech text-[10px] text-flame hover:underline">
                ← Nouvelle sélection
              </Link>
            </div>
            <Suspense fallback={<PortfolioSkeleton count={domains.length} />}>
              <PortfolioTable
                domains={domains}
                agency={branding.agency}
                accent={branding.accent}
              />
            </Suspense>
          </>
        ) : (
          <>
            <AgencyPanel />

            <PortfolioForm max={MAX_PORTFOLIO_DOMAINS} />

            <section className="mt-12 grid gap-5 md:grid-cols-3">
              {[
                {
                  t: "Marque blanche",
                  d: "Ajoutez le nom et la couleur de votre agence à l'adresse : l'en-tête du rapport portefeuille reprend votre identité.",
                },
                {
                  t: "Marge revendeur",
                  d: "L'abonnement Agence couvre 25 domaines. Revendu autour de 79 € par client, il dégage une marge nette confortable.",
                },
                {
                  t: "Devis à votre grille",
                  d: "Chaque rapport ouvre sur une estimation de correction calculée depuis les constats, que vous pouvez présenter à votre tarif.",
                },
              ].map((c) => (
                <div key={c.t} className="rounded-xl bg-surface p-6 ring-1 ring-line shadow-md">
                  <h3 className="text-[16px] font-bold text-ink-2">{c.t}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted">{c.d}</p>
                </div>
              ))}
            </section>

            <section className="mt-8 rounded-xl border-l-2 border-warn bg-surface p-6 ring-1 ring-line shadow-md">
              <p className="tech text-[10px] text-warn">Limite de cette démonstration</p>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
                Cette vue d&apos;essai analyse jusqu&apos;à {MAX_PORTFOLIO_DOMAINS} domaines par
                passe et ne conserve rien : ni compte, ni historique. Les sous-comptes clients
                existent et sont cloisonnés — un client ne voit ni vos domaines ni ceux de vos
                autres clients — mais ils supposent une connexion, donc une base configurée. Ce
                qui manque encore : le portefeuille persistant par client, et les rapports PDF à
                votre marque. Nous préférons le dire que le laisser croire.
              </p>
            </section>
          </>
        )}

        <div className="mt-12">
          <Disclaimer variant="short" />
        </div>
      </div>
    </>
  );
}
