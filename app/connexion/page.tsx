import type { Metadata } from "next";
import { Disclaimer } from "@/components/primitives";
import LoginForm from "@/components/LoginForm";
import { getAccounts } from "@/lib/accounts";

export const metadata: Metadata = {
  title: "Connexion",
  description:
    "Accédez à votre espace Konsent par un lien à usage unique. Aucun mot de passe n'est demandé, aucun n'est stocké.",
};

const ERRORS: Record<string, string> = {
  "lien-invalide":
    "Ce lien n'est plus valable : il a expiré, ou il a déjà servi. Demandez-en un nouveau.",
  "jeton-absent": "Ce lien est incomplet. Demandez-en un nouveau.",
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

  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <p className="tech text-[10px] text-accent">Espace client</p>
      <h1 className="display mt-2 text-3xl text-ink-2">Connexion</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">
        Votre espace donne accès à l&apos;historique de vos analyses, à vos domaines surveillés et
        à vos archives de preuve.
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
    </main>
  );
}
