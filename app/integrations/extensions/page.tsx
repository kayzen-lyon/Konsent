import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Disclaimer, SectionTitle } from "@/components/primitives";

export const metadata: Metadata = {
  title: "Extensions Konsent : navigateur (Chrome, Edge, Firefox) et WordPress",
  description:
    "Deux extensions open source (licence MIT) : auditer la page affichée depuis le navigateur, et suivre le score RGPD de votre site dans le tableau de bord WordPress. Permissions minimales, aucune donnée collectée.",
  alternates: { canonical: "/integrations/extensions" },
};

/** Taille et empreinte lues au moment du rendu : jamais recopiées à la main. */
function archive(file: string) {
  const data = readFileSync(join(process.cwd(), "public", "telechargements", file));
  const kib = data.length / 1024;
  return {
    href: `/telechargements/${file}`,
    file,
    size: `${kib.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Ko`,
    sha256: createHash("sha256").update(data).digest("hex"),
  };
}

interface Extension {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  does: readonly string[];
  permissions: readonly { name: string; why: string }[];
  install: readonly string[];
  download: ReturnType<typeof archive>;
}

export default function ExtensionsPage() {
  const EXTENSIONS: readonly Extension[] = [
    {
      id: "navigateur",
      eyebrow: "Chrome · Edge · Firefox",
      title: "L'extension navigateur",
      body: "Un clic sur l'icône Konsent ouvre l'audit RGPD et cookies de la page que vous consultez, ou sa synthèse pour un dirigeant. L'analyse elle-même tourne sur Konsent, comme si vous aviez saisi l'adresse sur le site.",
      does: [
        "Lit l'adresse de l'onglet affiché, seulement à l'ouverture du popup.",
        "Refuse les pages qui ne sont pas en http ou https (pages internes du navigateur, fichiers locaux).",
        "Retire les paramètres de requête et le fragment de l'adresse, qui portent parfois des jetons ou des identifiants.",
        "Ouvre « Auditer cette page », « Synthèse dirigeant » ou « Outils » dans un nouvel onglet.",
      ],
      permissions: [
        {
          name: "activeTab",
          why: "Lire l'adresse de l'onglet affiché au moment où vous cliquez sur l'icône, et de celui-là seulement. C'est l'unique permission demandée : aucun accès permanent aux sites, aucun script injecté dans les pages.",
        },
      ],
      install: [
        "Téléchargez l'archive et décompressez-la.",
        "Chrome ou Edge : ouvrez chrome://extensions (ou edge://extensions) et activez le mode développeur.",
        "Cliquez sur « Charger l'extension non empaquetée » et choisissez le dossier décompressé, celui qui contient manifest.json.",
        "Firefox : ouvrez about:debugging, puis « Ce Firefox » → « Charger un module complémentaire temporaire… » et choisissez manifest.json. Le module est retiré à la fermeture du navigateur.",
      ],
      download: archive("konsent-navigateur.zip"),
    },
    {
      id: "wordpress",
      eyebrow: "WordPress",
      title: "L'extension WordPress",
      body: "Un widget « Konsent — conformité RGPD » dans le tableau de bord de l'administration : score sur 100, note, nombre d'écarts et lien vers le rapport complet de votre site.",
      does: [
        "Interroge l'API publique de Konsent avec le domaine de votre installation, sans clé ni compte.",
        "Met le résultat en cache 12 heures (1 heure en cas d'échec) : le tableau de bord reste rapide.",
        "N'ajoute rien aux pages publiques du site : ni script, ni cookie, ni traceur.",
        "À la désinstallation, supprime le résultat mis en cache, seule donnée qu'elle crée.",
      ],
      permissions: [
        {
          name: "manage_options",
          why: "Le widget n'est enregistré et affiché que pour les administrateurs. Un contributeur ou un abonné ne le voit pas.",
        },
        {
          name: "Requête sortante",
          why: "Un appel à konsent.kayzen-lyon.com/api/scan depuis votre serveur, au plus une fois toutes les 12 heures, à l'affichage du tableau de bord.",
        },
      ],
      install: [
        "Téléchargez l'archive, sans la décompresser.",
        "Dans l'administration : Extensions → Ajouter → Téléverser une extension.",
        "Choisissez konsent-wordpress.zip, puis « Installer maintenant » et « Activer ».",
        "Le widget apparaît dans le Tableau de bord. Un site accessible uniquement en local ou protégé par un mot de passe ne peut pas être analysé.",
      ],
      download: archive("konsent-wordpress.zip"),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <Breadcrumbs
        items={[
          { href: "/integrations", label: "Intégrations" },
          { href: "/integrations/extensions", label: "Extensions" },
        ]}
      />
      <p className="tech text-[10px] text-accent">Extensions open source</p>
      <h1 className="display mt-2 text-4xl text-ink-2">Les extensions Konsent</h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">
        Une extension pour votre navigateur, une pour WordPress. Toutes deux sous licence MIT, avec
        les permissions strictement nécessaires, et sans rien collecter : un outil d&apos;audit RGPD
        qui pisterait ses utilisateurs serait mal placé pour en juger d&apos;autres.
      </p>

      <nav aria-label="Extensions disponibles" className="mt-8">
        <ul className="flex flex-wrap gap-2">
          {EXTENSIONS.map((e) => (
            <li key={e.id}>
              <a
                href={`#${e.id}`}
                className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink-2 hover:border-flame hover:text-flame"
              >
                {e.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-10 space-y-6">
        {EXTENSIONS.map((e) => (
          <section
            key={e.id}
            id={e.id}
            aria-labelledby={`${e.id}-titre`}
            className="card-lift scroll-mt-24 rounded-3xl border border-line bg-surface p-6 sm:p-8"
          >
            <p className="tech text-[10px] text-flame">{e.eyebrow}</p>
            <h2 id={`${e.id}-titre`} className="display mt-2 text-2xl text-ink-2">
              {e.title}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">{e.body}</p>

            <h3 className="display mt-6 text-base text-ink-2">Ce qu&apos;elle fait</h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-ink-2">
              {e.does.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>

            <h3 className="display mt-6 text-base text-ink-2">Permissions demandées, et pourquoi</h3>
            <dl className="mt-2 space-y-3 text-[15px] leading-relaxed">
              {e.permissions.map((p) => (
                <div key={p.name}>
                  <dt className="font-mono text-sm font-semibold text-ink-2">{p.name}</dt>
                  <dd className="text-muted">{p.why}</dd>
                </div>
              ))}
            </dl>

            <h3 className="display mt-6 text-base text-ink-2">Installation</h3>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed text-ink-2">
              {e.install.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>

            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
              <a
                href={e.download.href}
                download
                className="font-display btn-primary inline-flex min-h-11 items-center rounded-full bg-flame px-5 text-sm font-bold text-white transition hover:bg-flame-dark"
              >
                Télécharger {e.download.file}
              </a>
              <span className="text-sm text-muted">Archive ZIP, {e.download.size}</span>
            </div>
            <p className="mt-2 break-all font-mono text-xs text-muted">SHA-256 : {e.download.sha256}</p>
          </section>
        ))}
      </div>

      <section className="mt-14">
        <SectionTitle eyebrow="Données" title="Ce que les extensions collectent : rien" />
        <div className="max-w-3xl space-y-4 text-[15px] leading-relaxed text-muted">
          <p>
            Ni mesure d&apos;audience, ni télémétrie, ni rapport d&apos;erreur, ni cookie. La seule
            information qui sort est l&apos;adresse à auditer : celle de la page affichée, quand vous
            cliquez dans l&apos;extension navigateur ; celle de votre site, quand le tableau de bord
            WordPress rafraîchit le score. Elle est traitée par Konsent comme toute analyse lancée
            depuis le site, dans les conditions décrites par la{" "}
            <Link href="/confidentialite" className="font-medium text-flame underline underline-offset-4">
              politique de confidentialité
            </Link>
            .
          </p>
          <p>
            Le code source de chaque extension est inclus dans son archive, lisible avant
            installation.
          </p>
        </div>
      </section>

      <section className="mt-14">
        <SectionTitle eyebrow="Distribution" title="Boutiques officielles : à venir" />
        <div className="max-w-3xl space-y-4 text-[15px] leading-relaxed text-muted">
          <p>
            La publication sur le Chrome Web Store, Microsoft Edge Add-ons, addons.mozilla.org et le
            répertoire WordPress.org est à venir. D&apos;ici là, l&apos;installation se fait à partir
            des archives ci-dessus, qui ne se mettent pas à jour seules : revenez sur cette page pour
            une nouvelle version.
          </p>
          <p>
            Une question ou un problème d&apos;installation ?{" "}
            <Link href="/contact" className="font-medium text-flame underline underline-offset-4">
              Écrivez-nous
            </Link>
            .
          </p>
        </div>
      </section>

      <div className="mt-14">
        <Disclaimer variant="short" />
      </div>
    </div>
  );
}
