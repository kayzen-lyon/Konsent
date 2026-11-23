import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Disclaimer } from "@/components/primitives";
import LoginForm from "@/components/LoginForm";
import { SESSION_COOKIE, getAccounts } from "@/lib/accounts";

export const metadata: Metadata = {
  title: "Connexion",
  description:
    "Accédez à votre espace Konsent par un lien à usage unique. Aucun mot de passe n'est demandé, aucun n'est stocké.",
};

const ERRORS: Record<string, string> = {
  "lien-invalide":
    "Ce lien n'est plus valable : il a expiré, ou il a déjà servi. Demandez-en un nouveau.",
  "jeton-absent": "Ce lien est incomplet. Demandez-en un nouveau.",
  "autre-navigateur":
    "Pour votre sécurité, ce lien ne fonctionne que dans le navigateur où vous l'avez demandé. Ouvrez-le depuis ce navigateur, ou demandez-en un nouveau ici.",
  technique: "Une erreur technique est survenue. Réessayez dans un instant.",
  indisponible:
    "Les comptes ne sont pas activés sur cette instance. L'analyse à la demande reste disponible, sans inscription.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;
  const accounts = getAccounts();
  const error = erreur ? ERRORS[erreur] : undefined;

  // Déjà connecté : « Mon espace » mène directement au tableau de bord, au
  // lieu de redemander une adresse. Sauf si l'on arrive ici sur une erreur,
  // qu'il faut alors afficher.
  if (!erreur && accounts.available) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    const account = token ? await accounts.accountForSession(token).catch(() => null) : null;
    if (account) redirect("/espace");
  }

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <p className="tech text-[10px] text-accent">Mon espace · facultatif</p>
      <h1 className="display mt-2 text-3xl text-ink-2">Votre espace Konsent</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">
        <strong className="text-ink-2">Pas besoin de compte pour analyser un site</strong> : l&apos;analyse,
        le rapport, l&apos;archive de preuve et les{" "}
        <Link href="/outils" className="text-flame hover:underline">
          outils
        </Link>{" "}
        fonctionnent sans inscription, et rien n&apos;est conservé.
      </p>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">
        Le compte, gratuit, sert à ce qui doit être gardé dans le temps :
      </p>
      <ul className="mt-3 space-y-1.5 text-[15px] leading-relaxed text-ink-2">
        <li>· la surveillance automatique de vos sites (jusqu&apos;à 25) ;</li>
        <li>· une alerte par e-mail si un nouveau traceur apparaît ;</li>
        <li>· l&apos;historique de votre score sur 13 mois ;</li>
        <li>· le plan d&apos;action, avec le suivi des corrections ;</li>
        <li>· l&apos;espace agence : portefeuille et sous-comptes clients.</li>
      </ul>
      <p className="mt-4 text-[14px] leading-relaxed text-muted">
        Aucun mot de passe : vous recevez un lien de connexion par e-mail. Il est valable
        15 minutes, une seule fois, et uniquement dans le navigateur où vous l&apos;avez demandé.
      </p>

      {error ? (
        <div className="mt-6 rounded-lg border border-crit/30 bg-crit/5 px-5 py-4 text-sm text-slate-700">
          {error}
        </div>
      ) : null}

      {accounts.available ? (
        <LoginForm />
      ) : (
        <div className="mt-8 rounded-lg border border-line bg-slate-50 p-6 text-[15px] leading-relaxed text-muted">
          <p className="text-ink-2">Les comptes ne sont pas activés sur cette instance.</p>
          <p className="mt-2">{accounts.reason}</p>
          <p className="mt-3">
            L&apos;analyse à la demande fonctionne sans inscription, et c&apos;est le cas
            d&apos;usage principal du produit.
          </p>
        </div>
      )}

      <div className="mt-12">
        <Disclaimer variant="short" />
      </div>
    </div>
  );
}
