import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { OwnedDomains } from "@/components/OwnedDomains";
import { InvitationPrompt } from "@/components/InvitationPrompt";
import { DeleteAccount } from "@/components/account/DeleteAccount";
import { ScoreHistory } from "@/components/account/ScoreHistory";
import { SessionLog } from "@/components/account/SessionLog";
import { ActionPlan } from "@/components/monitoring/ActionPlan";
import { WebhookSettings } from "@/components/monitoring/WebhookSettings";
import { Disclaimer, SectionTitle } from "@/components/primitives";
import { SESSION_COOKIE, getAccounts } from "@/lib/accounts";
import { domainQuotaFor } from "@/lib/agency/tenancy";
import { buildActionPlan } from "@/lib/monitoring/action-plan";
import { SEVERITY_LABELS } from "@/lib/rulepack";
import { getStorage, type ActionItem, type AlertWebhookView } from "@/lib/storage";
import { PLANS, getPlan } from "@/lib/billing/plans";
import { misconfigured, readiness } from "@/lib/billing/readiness";

export const metadata: Metadata = {
  title: "Votre espace",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Nombre d'analyses montrées par courbe : un an de surveillance hebdomadaire. */
const HISTORY_POINTS = 52;

const DELETION_ERRORS: Record<string, string> = {
  adresse:
    "L'adresse saisie ne correspond pas à celle du compte. Rien n'a été supprimé.",
  abonnement:
    "Un abonnement payant est en cours sur ce compte. Résiliez-le d'abord (lien « Gérer mon abonnement » de vos reçus Stripe), puis revenez supprimer le compte : sans cela, le prélèvement continuerait sans compte pour l'arrêter.",
  technique:
    "La suppression n'a pas abouti, rien n'a été effacé. Réessayez dans un instant ou écrivez-nous.",
};

function sessionNotice(value: string | undefined): string | null {
  if (value === undefined) return null;
  if (value === "erreur") return "Les autres sessions n'ont pas pu être fermées. Réessayez dans un instant.";
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return null;
  if (n === 0) return "Aucune autre session n'était ouverte.";
  return `${n} session${n > 1 ? "s" : ""} fermée${n > 1 ? "s" : ""}. Seul ce navigateur reste connecté.`;
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const param = (key: string) => {
    const v = params[key];
    return typeof v === "string" ? v : undefined;
  };

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

  // Historique : une requête par domaine, bornée — le quota de domaines
  // d'un compte reste petit.
  const domainIds = domains.map((d) => d.id);
  const [histories, alertCounts, sessions, children, webhooks, actionItems] = await Promise.all([
    storage.available
      ? Promise.all(
          domains.map((d) =>
            storage
              .history(d.id, HISTORY_POINTS)
              .then((rows) => [...rows].reverse())
              .catch(() => []),
          ),
        )
      : Promise.resolve(domains.map(() => [])),
    storage.available
      ? storage.alertCounts(domains.map((d) => d.id)).catch(() => ({}) as Record<string, number>)
      : Promise.resolve({} as Record<string, number>),
    accounts.sessionsFor(account.id, token).catch(() => []),
    accounts.subAccounts(account.id).catch(() => []),
    storage.available
      ? storage.webhooksFor(domainIds).catch(() => [] as readonly AlertWebhookView[])
      : Promise.resolve([] as readonly AlertWebhookView[]),
    storage.available
      ? storage.actionItems(domainIds).catch(() => [] as readonly ActionItem[])
      : Promise.resolve([] as readonly ActionItem[]),
  ]);

  // La dernière analyse est le dernier point de l'historique, déjà chargé.
  const plans = domains.map((d, i) => {
    const latest = (histories[i] ?? []).at(-1) ?? null;
    return {
      domain: d,
      scannedAt: latest?.scannedAt ?? null,
      rows: buildActionPlan(
        latest,
        actionItems.filter((item) => item.domainId === d.id),
      ).map((entry) => ({
        ruleId: entry.ruleId,
        title: entry.title,
        severityLabel: entry.severity ? SEVERITY_LABELS[entry.severity] : null,
        occurrences: entry.occurrences,
        state: entry.state,
        note: entry.note,
      })),
    };
  });

  const deletionError = DELETION_ERRORS[param("suppression") ?? ""] ?? null;

  // Invitation en attente : l'adresse de l'agence est montrée pour que le
  // titulaire sache à qui il ouvre ses résultats.
  const inviter =
    account.invitedParentId && !account.parentId
      ? await accounts.accountById(account.invitedParentId).catch(() => null)
      : null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="tech text-[10px] text-accent">Espace client</p>
      <h1 className="display mt-2 text-3xl text-ink-2">{account.email}</h1>
      <p className="mt-3 text-[15px] text-muted">
        Offre en cours : <strong className="text-ink-2">{plan.name}</strong> · compte ouvert le{" "}
        {new Date(account.createdAt).toLocaleDateString("fr-FR")}
      </p>

      {inviter ? <InvitationPrompt agencyEmail={inviter.email} /> : null}

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

      <section className="mt-12" id="historique">
        <SectionTitle
          eyebrow="01"
          title="Historique des audits"
          description="L'évolution du score de chaque domaine surveillé, analyse après analyse. Les valeurs exactes sont dans le tableau de données sous chaque courbe."
        />
        {domains.length === 0 ? (
          <p className="text-[15px] text-muted">
            Aucun domaine surveillé : l&apos;historique apparaîtra ici après le premier passage de la
            surveillance.
          </p>
        ) : (
          <div className="grid gap-4">
            {domains.map((d, i) => (
              <ScoreHistory
                key={d.id}
                id={d.id}
                hostname={d.hostname}
                points={(histories[i] ?? []).map((h) => ({
                  scannedAt: h.scannedAt,
                  score: h.score,
                  grade: h.grade,
                }))}
                alertCount={alertCounts[d.id] ?? 0}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12" id="plan-action">
        <SectionTitle
          eyebrow="02"
          title="Plan d'action"
          description="Les constats de la dernière analyse de chaque domaine. Cochez ceux que vous avez corrigés et notez ce qui a été fait : la prochaine analyse confrontera votre déclaration à ce qu'elle observe."
        />
        {domains.length === 0 ? (
          <p className="text-[15px] text-muted">
            Aucun domaine surveillé : le plan d&apos;action apparaîtra ici après la première analyse.
          </p>
        ) : (
          <div className="grid gap-4">
            {plans.map((p) => (
              <ActionPlan
                key={p.domain.id}
                domainId={p.domain.id}
                hostname={p.domain.hostname}
                scannedAt={p.scannedAt}
                rows={p.rows}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12" id="webhooks">
        <SectionTitle
          eyebrow="03"
          title="Alertes par webhook"
          description="En plus du courriel, chaque alerte de régression peut être envoyée à un canal Slack, Microsoft Teams, ou à votre propre service (JSON signé). Un échec d'envoi est noté ici et n'empêche jamais le courriel de partir."
        />
        {domains.length === 0 ? (
          <p className="text-[15px] text-muted">
            Aucun domaine surveillé : inscrivez-en un pour y rattacher un webhook.
          </p>
        ) : (
          <div className="grid gap-4">
            {domains.map((d) => {
              const hook = webhooks.find((w) => w.domainId === d.id);
              return (
                <WebhookSettings
                  key={d.id}
                  domainId={d.id}
                  hostname={d.hostname}
                  initial={
                    hook
                      ? {
                          url: hook.url,
                          kind: hook.kind,
                          lastAttemptAt: hook.lastAttemptAt,
                          lastStatus: hook.lastStatus,
                        }
                      : null
                  }
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-12">
        <SectionTitle
          eyebrow="04"
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

      <section className="mt-14" id="journal">
        <SectionTitle
          eyebrow="05"
          title="Journal d'accès"
          description="Les sessions ouvertes sur ce compte. Nous n'enregistrons ni adresse IP ni navigateur : seulement la date d'ouverture et d'expiration de chaque session."
        />
        <SessionLog sessions={sessions} notice={sessionNotice(param("sessions"))} />
      </section>

      <section className="mt-14">
        <SectionTitle
          eyebrow="06"
          title="Vos données"
          description="Ce que nous détenons, et comment le reprendre."
        />
        <div className="mt-6 space-y-3 text-[15px] leading-relaxed text-muted">
          <p>
            Nous conservons votre adresse e-mail, l&apos;historique des analyses des domaines que
            vous avez explicitement inscrits à la surveillance, ce que vous y avez saisi vous-même
            (plan d&apos;action, notes, adresses de webhook), et rien d&apos;autre. Les analyses
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

        <div className="mt-8 rounded-3xl border border-line bg-surface p-6">
          <h3 className="font-display text-lg font-bold text-ink-2">Télécharger mes données</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            Droit à la portabilité (article 20 du RGPD) : un fichier JSON lisible par une machine,
            produit immédiatement, avec votre compte, vos domaines surveillés, leur historique,
            leurs alertes, leur plan d&apos;action et leurs webhooks (sans le secret de signature), vos clés d&apos;API (sans leur empreinte), vos sessions et vos
            sous-comptes ou invitations.
          </p>
          <a
            href="/api/compte/export"
            download
            className="font-display btn-primary mt-4 inline-flex min-h-11 items-center rounded-full bg-flame px-5 text-sm font-bold text-white"
          >
            Télécharger mes données (JSON)
          </a>
        </div>

        <div id="suppression" className="mt-6 rounded-3xl border border-line bg-surface p-6">
          <h3 className="font-display text-lg font-bold text-ink-2">Supprimer mon compte</h3>
          <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-muted">
            <p>
              Droit à l&apos;effacement (article 17 du RGPD). La suppression est{" "}
              <strong className="text-ink-2">immédiate</strong> : il n&apos;y a pas de délai de
              grâce, et rien n&apos;est récupérable ensuite.
            </p>
            <p>
              <strong className="text-ink-2">Supprimé :</strong> le compte et son adresse, toutes
              les sessions et liens de connexion, les domaines surveillés avec leur historique
              d&apos;analyses, leurs alertes, leur plan d&apos;action et leurs webhooks (y compris ceux inscrits sans session à cette adresse),
              les clés d&apos;API et les invitations envoyées.
              {children.length > 0
                ? " Vos sous-comptes ne sont pas supprimés : ils sont détachés et redeviennent des comptes indépendants."
                : null}
            </p>
            <p>
              <strong className="text-ink-2">Conservé :</strong> le journal des appels d&apos;API,
              sans plus aucun lien avec vous (clé et compte effacés), jusqu&apos;à sa purge à 400
              jours ; et vos factures, qui restent chez Stripe, notre prestataire de paiement, dix
              ans au titre de l&apos;obligation comptable (article L.123-22 du code de commerce).
            </p>
          </div>
          {deletionError ? (
            <p
              role="alert"
              className="mt-4 rounded-lg border-l-2 border-crit-text bg-crit-bg px-4 py-3 text-[14px] text-ink-2"
            >
              {deletionError}
            </p>
          ) : null}
          <div className="mt-4">
            <DeleteAccount email={account.email} subAccountCount={children.length} />
          </div>
        </div>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link
          href="/surveillance"
          className="rounded-full border-2 border-flame px-4 py-2 text-sm font-semibold text-flame transition hover:bg-surface-high"
        >
          Domaines surveillés
        </Link>
        <Link
          href="/tarifs"
          className="rounded-full border-2 border-flame px-4 py-2 text-sm font-semibold text-flame transition hover:bg-surface-high"
        >
          Offres
        </Link>
      </div>

      <div className="mt-14">
        <Disclaimer variant="short" />
      </div>
    </div>
  );
}
