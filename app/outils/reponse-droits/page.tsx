import type { Metadata } from "next";
import { Disclaimer, SectionTitle } from "@/components/primitives";
import RightsResponseGenerator from "@/components/tools/RightsResponseGenerator";
import { JsonLd } from "@/components/JsonLd";
import { toolJsonLd } from "@/lib/seo/jsonld";
import { getTool } from "@/lib/tools/catalog";

export const metadata: Metadata = {
  title: "Modèles de réponse aux demandes de droits RGPD",
  description:
    "Générez la réponse à une demande d'accès, de rectification, d'effacement, de limitation, de portabilité ou d'opposition (articles 15 à 21 du RGPD) : délais d'un mois rappelés, motifs de refus fondés, voies de recours. Gratuit, dans votre navigateur, rien n'est conservé.",
};

export default function RightsResponsePage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <JsonLd data={toolJsonLd(getTool("reponse-droits")!)} />
      <p className="tech text-[10px] text-accent">Outil libre</p>
      <h1 className="display mt-2 text-4xl text-ink-2">Répondre à une demande d&apos;exercice de droits</h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">
        Une personne vous demande l&apos;accès à ses données, leur effacement ou s&apos;oppose à un
        traitement. Décrivez la demande et la suite que vous lui donnez : l&apos;outil rédige le
        courrier, rappelle l&apos;échéance et inclut les mentions que le RGPD impose.
      </p>

      <div className="mt-4 max-w-3xl rounded-3xl border border-line bg-surface-low px-5 py-4 text-sm leading-relaxed text-muted">
        Le courrier est assemblé <strong className="text-ink-2">dans votre navigateur</strong>. Ni le
        nom du demandeur ni celui de l&apos;organisme ne sont envoyés : rien n&apos;est conservé, et
        aucune adresse e-mail n&apos;est demandée.
      </div>

      <RightsResponseGenerator />

      <section className="mt-16">
        <SectionTitle
          eyebrow="Règles"
          title="Ce que tout courrier de réponse doit respecter"
          description="Article 12 du RGPD, commun à tous les droits."
        />
        <ul className="grid max-w-4xl gap-4 text-[15px] leading-relaxed text-muted sm:grid-cols-2">
          <li className="rounded-3xl border border-line bg-surface p-5">
            <strong className="text-ink-2">Un mois.</strong> La réponse intervient dans le mois suivant
            la réception, y compris pour refuser. Prolongation de deux mois possible, si elle est
            annoncée et motivée dans le premier mois (art. 12, par. 3).
          </li>
          <li className="rounded-3xl border border-line bg-surface p-5">
            <strong className="text-ink-2">Gratuit.</strong> Sauf demande manifestement infondée ou
            excessive, dont la preuve vous incombe (art. 12, par. 5).
          </li>
          <li className="rounded-3xl border border-line bg-surface p-5">
            <strong className="text-ink-2">Identité.</strong> En cas de doute raisonnable, demandez les
            informations nécessaires pour la confirmer — et seulement celles-là (art. 12, par. 6). Une
            copie de pièce d&apos;identité n&apos;est pas exigible par principe.
          </li>
          <li className="rounded-3xl border border-line bg-surface p-5">
            <strong className="text-ink-2">Recours.</strong> Un refus est motivé et mentionne la
            possibilité de saisir la CNIL et un juge (art. 12, par. 4, art. 77 et 79).
          </li>
        </ul>
        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted">
          Références : règlement (UE) 2016/679, articles 12, 15 à 21 et 19 ; CEPD, lignes directrices
          01/2022 sur le droit d&apos;accès ; CNIL, « Professionnels : comment répondre à une demande de
          droit d&apos;accès ? ».
        </p>
      </section>

      <section className="mt-14">
        <SectionTitle eyebrow="Limites" title="Un modèle, pas une consultation" />
        <div className="max-w-3xl space-y-4 text-[15px] leading-relaxed text-muted">
          <p>
            Les passages entre crochets doivent être complétés : l&apos;outil ne connaît ni vos
            traitements, ni vos destinataires, ni vos durées de conservation. Un motif de refus mal
            fondé expose davantage qu&apos;une réponse tardive ; en cas de doute, faites relire le
            courrier par votre délégué à la protection des données ou un conseil.
          </p>
          <p>
            Conservez la trace de la demande et de votre réponse : elle vous permettra de démontrer le
            respect des délais (principe de responsabilité, art. 5, par. 2).
          </p>
        </div>
      </section>

      <div className="mt-14">
        <Disclaimer variant="short" />
      </div>
    </div>
  );
}
