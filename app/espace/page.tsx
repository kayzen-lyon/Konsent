import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { OwnedDomains } from "@/components/OwnedDomains";
import { Disclaimer, SectionTitle } from "@/components/primitives";
import { SESSION_COOKIE, getAccounts } from "@/lib/accounts";
import { domainQuotaFor } from "@/lib/agency/tenancy";
import { getStorage } from "@/lib/storage";
import { PLANS, getPlan } from "@/lib/billing/plans";
import { misconfigured, readiness } from "@/lib/billing/readiness";

export const metadata: Metadata = {
  title: "Votre espace",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const accounts = getAccounts();
  if (!accounts.available) redirect("/connexion?erreur=indisponible");

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect("/connexion");

  const account = await accounts.accountForSession(token).catch(() => null);
  if (!account) redirect("/connexion?erreur=lien-invalide");

  const plan = getPlan(account.plan) ?? PLANS[0]!;
  const state = readiness(plan);
  const config = misconfigured(plan);

  // Un compte ne voit QUE ses propres domaines ici — y compris une agence,
  // dont le portefeuille complet vit sur /agence. Cette page est l'espace
  // personnel, pas la vue de gestion.
  const actor = { id: account.id, plan: account.plan, parentId: account.parentId };
  const storage = getStorage();
  const domains = storage.available
    ? await storage.domainsForAccounts([account.id]).catch(() => [])
    : [];

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <p className="tech text-[10px] text-accent">Espace client</p>
      <h1 className="display mt-2 text-3xl text-ink-2">{account.email}</h1>
      <p className="mt-3 text-[15px] text-muted">
        Offre en cours : <strong className="text-ink-2">{plan.name}</strong> · compte ouvert le{" "}
        {new Date(account.createdAt).toLocaleDateString("fr-FR")}
      </p>

      {account.parentId ? (
        <p className="mt-4 rounded-lg border-l-2 border-line bg-surface px-4 py-3 text-[13px] leading-relaxed text-muted">
          Ce compte est rattaché à une agence, qui voit les domaines ci-dessous. Vous ne voyez ni
          les siens, ni ceux de ses autres clients.
        </p>
      ) : null}

      <section className="mt-10">
        <OwnedDomains
          domains={domains}
          quota={domainQuotaFor(actor)}
          emptyHint="Aucun domaine rattaché à ce compte. Inscrivez-en un depuis la page Surveillance, en restant connecté : c'est la session qui en fait votre propriété."
        />
      </section>

      <section className="mt-12">
        <SectionTitle
          eyebrow="01"
          title="Ce que votre offre couvre aujourd'hui"
          description="Distinguer ce qui fonctionne de ce qui est annoncé n'a d'intérêt que si c'est écrit ici aussi, pas seulement sur la page tarifs."
        />
        <ul className="mt-6 space-y-2">
          {plan.features.map((f) => {
            const missing = config.find((c) => c.label === f.label);
            const live = f.delivered && !missing;
            return (
              <li
                key={f.label}
                className="flex flex-wrap items-start gap-3 border-b border-slate-100 py-2.5 last:border-0"
              >
                <span className="min-w-0 flex-1 text-[15px] text-ink-2">{f.label}</span>
                {live ? (
                  <span className="rounded bg-ok-bg px-2 py-0.5 text-xs text-ok">actif</span>
                ) : missing ? (
                  <span className="rounded bg-warn-bg px-2 py-0.5 text-xs text-warn">
                    non configuré
                  </span>
                ) : (
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    pas encore livré
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        {!state.sellable ? (
          <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-muted">
            Certaines fonctionnalités de cette offre ne sont pas encore livrées. Tant que
            c&apos;est le cas, elle n&apos;est pas ouverte à la souscription en ligne et
            n&apos;est pas facturée.
          </p>
        ) : null}
      </section>

      <section className="mt-14">
        <SectionTitle
          eyebrow="02"
          title="Vos données"
          description="Ce que nous détenons, et comment le reprendre."
        />
        <div className="mt-6 space-y-3 text-[15px] leading-relaxed text-muted">
          <p>
            Nous conservons votre adresse e-mail, l&apos;historique des analyses des domaines que
            vous avez explicitement inscrits à la surveillance, et rien d&apos;autre. Les analyses
            à la demande ne laissent aucune trace.
          </p>
          <p>
            Les jetons de connexion et de session ne sont stockés que sous forme
            d&apos;empreinte : une fuite de notre base ne permettrait de se connecter à aucun
            compte.
          </p>
          <p>
            L&apos;historique est purgé automatiquement au terme de la durée annoncée, à chaque
            passage de la surveillance. Annoncer une durée sans l&apos;appliquer serait le
            manquement que nous relevons chez les autres.
          </p>
        </div>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link
          href="/surveillance"
          className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink-2 transition hover:border-flame hover:text-accent"
        >
          Domaines surveillés
        </Link>
        <Link
          href="/tarifs"
          className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink-2 transition hover:border-flame hover:text-accent"
        >
          Offres
        </Link>
      </div>

      <div className="mt-14">
        <Disclaimer variant="short" />
      </div>
    </main>
  );
}
