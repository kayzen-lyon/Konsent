import Link from "next/link";
import type { Metadata } from "next";
import { Disclaimer, SectionTitle } from "@/components/primitives";
import EvidenceVerifier from "@/components/tools/EvidenceVerifier";
import { JsonLd } from "@/components/JsonLd";
import { toolJsonLd } from "@/lib/seo/jsonld";
import { getTool } from "@/lib/tools/catalog";

export const metadata: Metadata = {
  title: "Vérificateur d'archive de preuve",
  description:
    "Vérifiez qu'une archive de preuve Konsent est intacte : empreintes SHA-256 recalculées fichier par fichier et signature Ed25519 contrôlée, directement dans votre navigateur. Rien n'est téléversé.",
};

export default function EvidenceVerifierPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <JsonLd data={toolJsonLd(getTool("verificateur-preuve")!)} />
      <p className="tech text-[10px] text-accent">Outil libre</p>
      <h1 className="display mt-2 text-4xl text-ink-2">Vérificateur d&apos;archive de preuve</h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">
        Une archive de preuve n&apos;a de valeur que si l&apos;on peut montrer qu&apos;elle n&apos;a pas
        été retouchée. Déposez-la ici : chaque fichier est comparé à son empreinte, et la liste des
        empreintes à sa signature. Un auditeur, un avocat ou un juge peut faire le même contrôle sans
        nous demander quoi que ce soit.
      </p>

      <div className="mt-4 max-w-3xl rounded-3xl border border-line bg-surface-low px-5 py-4 text-sm leading-relaxed text-muted">
        L&apos;archive est ouverte <strong className="text-ink-2">dans votre navigateur</strong>. Elle
        n&apos;est ni téléversée ni enregistrée : rien n&apos;est conservé, et aucune adresse e-mail
        n&apos;est demandée.
      </div>

      <EvidenceVerifier />

      <section className="mt-16">
        <SectionTitle
          eyebrow="Méthode"
          title="Ce qui est contrôlé"
          description="Les mêmes opérations que sha256sum et OpenSSL, refaites pas à pas."
        />
        <ol className="max-w-3xl space-y-4 text-[15px] leading-relaxed text-muted">
          <li className="rounded-3xl border border-line bg-surface p-5">
            <strong className="text-ink-2">Empreintes.</strong> Le fichier SHA256SUMS liste
            l&apos;empreinte SHA-256 de chaque fichier de contenu et du manifeste. Chacune est
            recalculée ; un seul octet modifié change l&apos;empreinte.
          </li>
          <li className="rounded-3xl border border-line bg-surface p-5">
            <strong className="text-ink-2">Signature.</strong> SHA256SUMS porte une signature Ed25519,
            vérifiée avec la clé publique jointe. Elle prouve que la liste des empreintes n&apos;a pas
            été réécrite après coup. Certains navigateurs ne savent pas encore vérifier Ed25519 :
            l&apos;outil le dit plutôt que de conclure.
          </li>
          <li className="rounded-3xl border border-line bg-surface p-5">
            <strong className="text-ink-2">Cohérence.</strong> Les empreintes du manifeste doivent
            concorder avec SHA256SUMS, et la clé du manifeste avec public-key.pem. Tout fichier ajouté
            hors de la liste est signalé.
          </li>
        </ol>
        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted">
          Contrôle équivalent en ligne de commande, depuis le dossier décompressé :{" "}
          <code className="break-all rounded bg-surface-low px-1.5 py-0.5 font-mono text-xs text-ink-2">
            sha256sum -c SHA256SUMS
          </code>{" "}
          puis{" "}
          <code className="break-all rounded bg-surface-low px-1.5 py-0.5 font-mono text-xs text-ink-2">
            openssl pkeyutl -verify -pubin -inkey public-key.pem -rawin -in SHA256SUMS -sigfile
            &lt;(base64 -d SHA256SUMS.sig)
          </code>
          .
        </p>
      </section>

      <section className="mt-14">
        <SectionTitle eyebrow="Limites" title="Ce qu'une signature valide ne prouve pas" />
        <div className="max-w-3xl space-y-4 text-[15px] leading-relaxed text-muted">
          <p>
            <strong className="text-ink-2">L&apos;origine, sans clé de référence.</strong> La clé
            publique voyage dans l&apos;archive : quelqu&apos;un qui fabriquerait une fausse archive
            pourrait y joindre sa propre clé. Pour établir l&apos;origine, comparez l&apos;empreinte
            de la clé à celle que l&apos;émetteur vous a communiquée par un autre canal.
          </p>
          <p>
            <strong className="text-ink-2">La date.</strong> La date du manifeste est celle déclarée
            par le serveur émetteur. Ce n&apos;est pas un horodatage qualifié au sens du règlement
            eIDAS, qui suppose un prestataire de confiance tiers.
          </p>
          <p>
            <strong className="text-ink-2">Une archive sans clé de production</strong> (mention « clé
            éphémère ») est cohérente mais n&apos;a aucune valeur d&apos;opposabilité. Pour produire
            une archive, lancez un{" "}
            <Link href="/scan" className="font-medium text-flame underline underline-offset-4">
              audit complet
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
