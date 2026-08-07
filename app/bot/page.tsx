import type { Metadata } from "next";
import { EDITOR } from "@/lib/disclaimer";

export const metadata: Metadata = {
  title: "KonsentBot",
  description:
    "Comportement du robot d'analyse Konsent : identification, fréquence, respect de robots.txt et procédure de retrait.",
};

export default function BotPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-k-primary">
          Notre robot
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-k-ink sm:text-4xl">
          KonsentBot
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-k-muted">
          Si vous lisez cette page, c&apos;est probablement que vous avez repéré notre robot
          dans vos journaux. Voici exactement ce qu&apos;il fait.
        </p>
      </header>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-k-ink">Comment il s&apos;identifie</h2>
        <pre className="mt-3 overflow-x-auto rounded-lg border border-k-line bg-white p-4 font-mono text-[13px] text-k-ink">
          Mozilla/5.0 (compatible; KonsentBot/1.0; +https://konsent.fr/bot) AppleWebKit/537.36
        </pre>
        <p className="mt-3 text-[15px] leading-relaxed text-k-ink">
          Nous ne dissimulons jamais notre identité et n&apos;utilisons aucune technique
          d&apos;évitement de détection.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-k-ink">Ce qu&apos;il fait</h2>
        <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-k-ink">
          <li>
            · Il récupère la page demandée par un utilisateur, comme le ferait un navigateur
            ordinaire.
          </li>
          <li>
            · Il récupère vos pages légales publiques (mentions légales, politique de
            confidentialité, politique cookies) pour y vérifier la présence des mentions
            attendues.
          </li>
          <li>· Il résout des enregistrements DNS publics de vos sous-domaines.</li>
          <li>· Il lit les en-têtes de réponse HTTP.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-k-ink">Ce qu&apos;il ne fait jamais</h2>
        <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-k-ink">
          <li>· Aucune tentative d&apos;authentification que vous ne nous auriez pas fournie.</li>
          <li>· Aucun contournement de pare-feu applicatif ni de protection anti-robot.</li>
          <li>· Aucun test d&apos;intrusion, aucune recherche de vulnérabilité.</li>
          <li>· Aucune soumission de formulaire, aucune écriture de donnée.</li>
          <li>· Aucun contournement de CAPTCHA.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-k-ink">Fréquence et charge</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-k-ink">
          Une analyse ponctuelle demandée par un utilisateur représente quelques requêtes en
          quelques secondes. Les explorations approfondies respectent votre fichier{" "}
          <code className="font-mono text-[13px]">robots.txt</code>, se limitent à une requête
          par seconde et par domaine, et appliquent un délai croissant en cas d&apos;erreur.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-k-ink">Exclure votre site</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-k-ink">
          Ajoutez à votre <code className="font-mono text-[13px]">robots.txt</code> :
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg border border-k-line bg-white p-4 font-mono text-[13px] text-k-ink">
          {`User-agent: KonsentBot
Disallow: /`}
        </pre>
        <p className="mt-3 text-[15px] leading-relaxed text-k-ink">
          Vous pouvez aussi nous écrire à{" "}
          <a href={`mailto:${EDITOR.email}`} className="text-k-primary hover:underline">
            {EDITOR.email}
          </a>{" "}
          pour demander l&apos;exclusion de votre domaine.
        </p>
      </section>

      <section className="mt-10 rounded-xl border border-k-line bg-white p-5">
        <h2 className="text-sm font-semibold text-k-ink">Contester un résultat</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-k-ink">
          Si un constat vous paraît erroné, écrivez-nous en précisant le domaine et
          l&apos;identifiant de la règle. Les contestations alimentent l&apos;amélioration du
          moteur et sont traitées comme des signalements de qualité, pas comme des réclamations.
        </p>
      </section>
    </div>
  );
}
