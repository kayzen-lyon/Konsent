import Link from "next/link";
import type { Metadata } from "next";
import { SeverityBadge } from "@/components/primitives";
import { EDITOR } from "@/lib/disclaimer";
import { runVerdictScan } from "@/lib/engine/orchestrate";
import { ScanError } from "@/lib/engine/scan";
import { STACKS, buildQuote, formatEur, type Stack } from "@/lib/remediation/quote";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Devis de correction",
  robots: { index: false, follow: false },
};

export default async function QuotePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; stack?: string }>;
}) {
  const { url, stack } = await searchParams;

  if (!url) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <p className="text-muted">
          Aucune adresse fournie.{" "}
          <Link href="/" className="text-flame hover:underline">
            Lancer un audit
          </Link>
        </p>
      </div>
    );
  }

  let scan;
  try {
    scan = (await runVerdictScan(url)).result;
  } catch (error) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <div className="rounded-xl border-l-2 border-warn bg-surface p-6 ring-1 ring-line shadow-md">
          <h1 className="display text-xl text-ink-2">Devis impossible</h1>
          <p className="mt-2 text-[15px] text-muted">
            {error instanceof ScanError ? error.message : "L'analyse préalable n'a pas abouti."}
          </p>
        </div>
      </div>
    );
  }

  const requested = STACKS.find((s) => s.id === stack)?.id as Stack | undefined;
  const quote = buildQuote(scan, requested);
  const validUntil = new Date(
    new Date(quote.issuedAt).getTime() + quote.validityDays * 86_400_000,
  );

  return (
    <div className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
      <nav className="mb-6 text-sm print:hidden">
        <Link href={`/scan?url=${encodeURIComponent(url)}`} className="text-flame hover:underline">
          ← Retour au rapport
        </Link>
      </nav>

      {/* ── En-tête du devis ── */}
      <header className="rounded-xl bg-ink p-7">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="tech text-[10px] text-flame-soft">Devis de mise en conformité</p>
            <h1 className="display mt-2 text-3xl text-white">{quote.hostname}</h1>
            <p className="mt-2 font-mono text-[12px] text-white/45">
              réf. {quote.scanId} · référentiel {quote.rulepackVersion}
            </p>
          </div>
          <div className="text-right">
            <p className="tech text-[9px] text-white/50">Estimation</p>
            <p className="tabular display mt-1 text-3xl text-white">
              {formatEur(quote.totalLow)}
            </p>
            <p className="tabular text-sm text-white/60">à {formatEur(quote.totalHigh)}</p>
          </div>
        </div>
      </header>

      {/* ── Paramètres ── */}
      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["Pile technique détectée", quote.stackLabel],
          ["Coefficient appliqué", `× ${quote.coefficient}`],
          ["Validité", `${quote.validityDays} jours`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-surface p-4 ring-1 ring-line shadow-md">
            <p className="tech text-[9px] text-muted">{label}</p>
            <p className="mt-1 text-[15px] font-bold text-ink-2">{value}</p>
          </div>
        ))}
      </section>

      <div className="mt-3 flex flex-wrap gap-2 print:hidden">
        <span className="tech self-center text-[9px] text-muted">Corriger la pile :</span>
        {STACKS.map((s) => (
          <Link
            key={s.id}
            href={`/devis?url=${encodeURIComponent(url)}&stack=${s.id}`}
            className={`tech rounded border px-2.5 py-1 text-[9px] transition ${
              s.id === quote.stack
                ? "border-flame bg-flame text-white"
                : "border-line text-muted hover:border-flame hover:text-flame"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* ── Lignes ── */}
      <section className="mt-8 overflow-hidden rounded-xl bg-surface ring-1 ring-line shadow-md">
        <div className="hidden grid-cols-[1fr_auto_auto] gap-6 bg-paper px-5 py-3 sm:grid">
          <span className="tech text-[9px] text-muted">Prestation</span>
          <span className="tech text-[9px] text-muted">Gravité</span>
          <span className="tech text-right text-[9px] text-muted">Montant</span>
        </div>

        <div className="divide-y divide-line">
          <div className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto_auto] sm:gap-6">
            <div>
              <p className="text-[15px] font-bold text-ink-2">Forfait d&apos;intervention</p>
              <p className="mt-0.5 text-[13px] text-muted">
                Prise en main, sauvegarde préalable, recette et ré-audit de contrôle.
              </p>
            </div>
            <div />
            <p className="tabular self-center text-right text-[15px] font-bold text-ink-2">
              {formatEur(quote.baseFee)}
            </p>
          </div>

          {quote.lines.map((l) => (
            <div key={l.ruleId} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto_auto] sm:gap-6">
              <div className="min-w-0">
                <p className="text-[15px] font-bold leading-snug text-ink-2">{l.title}</p>
                <p className="mt-0.5 font-mono text-[11px] text-muted">
                  {l.ruleId}
                  {l.occurrences > 1 ? ` · ${l.occurrences} occurrences` : ""} · effort{" "}
                  {{ LOW: "faible", MEDIUM: "moyen", HIGH: "élevé" }[l.effort]}
                </p>
              </div>
              <div className="self-center">
                <SeverityBadge severity={l.severity} />
              </div>
              <p className="tabular self-center text-right text-[15px] font-bold text-ink-2">
                {formatEur(l.low)}
                <span className="block text-[12px] font-normal text-muted">
                  à {formatEur(l.high)}
                </span>
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-baseline justify-between gap-4 bg-ink px-5 py-4">
          <span className="tech text-[10px] text-white/60">Total estimé, hors taxes</span>
          <span className="tabular display text-2xl text-white">
            {formatEur(quote.totalLow)} – {formatEur(quote.totalHigh)}
          </span>
        </div>
      </section>

      {/* ── Ce qui n'est pas facturé ── */}
      {quote.selfServiceCount > 0 ? (
        <section className="mt-5 rounded-xl border-l-2 border-ok bg-surface p-5 ring-1 ring-line shadow-md">
          <p className="tech text-[10px] text-ok">Non facturé</p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
            {quote.selfServiceCount} constat{quote.selfServiceCount > 1 ? "s" : ""} relevé
            {quote.selfServiceCount > 1 ? "s" : ""} ne figure{quote.selfServiceCount > 1 ? "nt" : ""}{" "}
            pas dans ce devis : la correction est documentée et réalisable en autonomie par votre
            équipe. Le détail figure sur la fiche de chaque règle.
          </p>
        </section>
      ) : null}

      {/* ── Mentions ── */}
      <section className="mt-8 rounded-xl bg-surface p-6 ring-1 ring-line shadow-md">
        <h2 className="display text-lg text-ink-2">Mentions</h2>
        <dl className="mt-4 space-y-3 text-[13.5px] leading-relaxed">
          <div>
            <dt className="font-bold text-ink-2">Nature de l&apos;estimation</dt>
            <dd className="text-muted">
              Ce document est une estimation automatique calculée à partir des constats de
              l&apos;analyse du{" "}
              {new Date(quote.issuedAt).toLocaleDateString("fr-FR", { dateStyle: "long" })}. Il ne
              constitue pas un devis contractuel. Un devis ferme suppose un échange préalable sur
              le périmètre réel et les accès techniques.
            </dd>
          </div>
          <div>
            <dt className="font-bold text-ink-2">Méthode de calcul</dt>
            <dd className="text-muted">
              Forfait d&apos;intervention, puis fourchette propre à chaque constat, décroissante
              à mesure que les corrections se mutualisent, multipliée par le coefficient de la
              pile technique ({quote.stackLabel}, × {quote.coefficient}). Aucune saisie
              commerciale n&apos;intervient : le devis découle du rapport.
            </dd>
          </div>
          <div>
            <dt className="font-bold text-ink-2">Validité</dt>
            <dd className="text-muted">
              {quote.validityDays} jours, soit jusqu&apos;au{" "}
              {validUntil.toLocaleDateString("fr-FR", { dateStyle: "long" })}. Au-delà, un
              nouvel audit est nécessaire : le site aura probablement changé.
            </dd>
          </div>
          <div>
            <dt className="font-bold text-ink-2">Prestataire</dt>
            <dd className="text-muted">
              {EDITOR.legalName}, SIREN {EDITOR.siren}, {EDITOR.address}. Montants exprimés hors
              taxes.
            </dd>
          </div>
          <div>
            <dt className="font-bold text-ink-2">Limites</dt>
            <dd className="text-muted">
              Ce devis ne couvre que les écarts effectivement détectés par le mode d&apos;analyse
              utilisé. Les règles reportées en « non évalué » dans le rapport peuvent révéler des
              corrections supplémentaires lors d&apos;un audit en navigateur.
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-8 flex flex-wrap gap-3 print:hidden">
        <a
          href={`mailto:${EDITOR.email}?subject=${encodeURIComponent(`Devis de mise en conformité — ${quote.hostname}`)}&body=${encodeURIComponent(`Bonjour,\n\nJe souhaite faire corriger les écarts relevés sur ${quote.hostname}.\nRéférence du rapport : ${quote.scanId}\nEstimation affichée : ${formatEur(quote.totalLow)} à ${formatEur(quote.totalHigh)}\n\n`)}`}
          className="tech rounded-full bg-flame shadow-md px-6 py-3 text-[11px] text-white transition hover:bg-flame-dark"
        >
          Demander un devis ferme
        </a>
        <Link
          href={`/scan?url=${encodeURIComponent(url)}`}
          className="tech rounded-full border-2 border-flame px-6 py-3 text-[11px] text-flame transition hover:bg-surface-high"
        >
          Revoir le rapport
        </Link>
      </div>
    </div>
  );
}
