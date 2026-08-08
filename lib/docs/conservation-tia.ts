import { EDITOR } from "../disclaimer";
import type { ScanResult } from "../engine/types";
import { TodoTracker, type DocSection, type GeneratedDoc } from "./types";

/**
 * Deux documents que le scan alimente réellement.
 *
 * C'est le différenciateur documentaire le plus difficile à copier (PRD §9.1) :
 * la politique de conservation reprend les durées de vie RÉELLEMENT observées
 * sur le site, et l'analyse d'impact des transferts part des destinataires
 * hors Union effectivement contactés. Un générateur qui part d'un formulaire
 * vide produit un document qui contredit le site qu'il est censé décrire —
 * c'est précisément l'écart que la règle KZC-DOC-016 relève chez les autres.
 */

const DAY = "jour";

function humanDuration(days: number | null): string {
  if (days === null) return "le temps de la session";
  if (days < 1) return "moins d'un jour";
  if (days < 60) return `${Math.round(days)} ${DAY}${days >= 2 ? "s" : ""}`;
  const months = Math.round(days / 30.44);
  if (months < 24) return `${months} mois`;
  return `${(days / 365.25).toFixed(1).replace(".0", "")} ans`;
}

/* ------------------------------------------------------------------- D13 */

/**
 * D13 — Politique de conservation et de purge.
 *
 * Le document le plus souvent absent, et le plus facile à prendre en défaut :
 * il suffit de comparer une durée annoncée à la durée réellement posée dans le
 * navigateur. Le générateur fait cette comparaison lui-même et signale les
 * écarts, plutôt que de laisser l'éditeur publier un chiffre démenti par son
 * propre site.
 */
export function generateRetentionPolicy(scan: ScanResult): GeneratedDoc {
  const t = new TodoTracker();

  const cookies = [...scan.observation.cookies]
    .filter((c, i, arr) => arr.findIndex((x) => x.name === c.name && x.domain === c.domain) === i)
    .sort((a, b) => (b.lifetimeDays ?? 0) - (a.lifetimeDays ?? 0));

  // 13 mois est la durée recommandée par la CNIL pour les traceurs.
  const CEILING_DAYS = 396;
  const excessive = cookies.filter((c) => (c.lifetimeDays ?? 0) > CEILING_DAYS);

  const sections: DocSection[] = [
    {
      id: "principe",
      heading: "1. Principe",
      clauseRef: "RGPD, article 5(1)(e) — limitation de la conservation",
      body: [
        "Les données ne sont pas conservées indéfiniment. Chaque catégorie a une durée, cette durée a une justification, et à son terme les données sont supprimées ou anonymisées.",
        "Annoncer une durée sans l'appliquer est un manquement à part entière : la durée publiée devient une obligation opposable.",
      ],
    },
    {
      id: "traceurs",
      heading: "2. Traceurs déposés sur le site",
      clauseRef:
        "CNIL, recommandation, délibération n° 2020-092 — 13 mois pour les traceurs, 25 mois pour les données de mesure",
      body:
        cookies.length === 0
          ? [
              "Aucun traceur n'a été observé lors de l'analyse. Cette section devra être complétée si des traceurs sont ajoutés par la suite.",
            ]
          : [
              `L'analyse du ${new Date(scan.scannedAt).toLocaleDateString("fr-FR")} a relevé ${cookies.length} traceur(s). Les durées ci-dessous sont celles RÉELLEMENT posées, relevées dans le navigateur — non celles déclarées.`,
            ],
      ...(cookies.length > 0
        ? {
            table: {
              columns: ["Traceur", "Domaine", "Durée observée", "Émetteur", "Observation"],
              rows: cookies.slice(0, 40).map((c) => [
                c.name,
                c.domain,
                humanDuration(c.lifetimeDays),
                c.source === "http" ? "en-tête HTTP" : "script",
                (c.lifetimeDays ?? 0) > CEILING_DAYS
                  ? "Au-delà des 13 mois recommandés"
                  : "—",
              ]),
            },
          }
        : {}),
    },
  ];

  if (excessive.length > 0) {
    sections.push({
      id: "ecarts",
      heading: "3. Écarts relevés, à corriger avant publication",
      clauseRef: "CNIL, délibération n° 2020-092",
      body: [
        `${excessive.length} traceur(s) dépassent la durée de 13 mois recommandée. Publier cette politique sans les corriger reviendrait à documenter par écrit un écart que vous connaissez.`,
        "Deux options : ramener la durée dans la configuration de l'outil, ou justifier la durée retenue par écrit dans le registre.",
      ],
      bullets: excessive.map(
        (c) => `${c.name} sur ${c.domain} — ${humanDuration(c.lifetimeDays)}`,
      ),
    });
  }

  sections.push(
    {
      id: "autres",
      heading: `${excessive.length > 0 ? 4 : 3}. Autres catégories de données`,
      clauseRef: "RGPD, article 5(1)(e)",
      body: [
        "Les durées ci-dessous ne sont pas observables par une analyse technique : elles dépendent de votre organisation. Elles doivent être renseignées.",
      ],
      table: {
        columns: ["Catégorie", "Durée retenue", "Point de départ", "Justification"],
        rows: [
          [
            "Demandes de contact",
            t.mark("durée de conservation des demandes de contact"),
            "Dernier échange",
            "Suivi de la relation",
          ],
          [
            "Prospects",
            t.mark("durée de conservation des données de prospects"),
            "Dernier contact",
            "3 ans recommandés par la CNIL",
          ],
          [
            "Clients",
            t.mark("durée de conservation des données clients"),
            "Fin de la relation",
            "Durée de la relation puis prescription applicable",
          ],
          [
            "Pièces comptables",
            "10 ans",
            "Clôture de l'exercice",
            "Article L123-22 du code de commerce",
          ],
          [
            "Preuves de consentement",
            t.mark("durée de conservation des preuves de consentement"),
            "Recueil",
            "Charge de la preuve, article 7(1)",
          ],
        ],
      },
    },
    {
      id: "purge",
      heading: `${excessive.length > 0 ? 5 : 4}. Comment la purge est exécutée`,
      clauseRef: "RGPD, article 5(2) — responsabilité",
      body: [
        `La purge est ${t.mark("automatique ou manuelle : préciser, et indiquer l'outil ou la personne responsable")}.`,
        `Elle est exécutée ${t.mark("fréquence de la purge, ex. mensuelle")} et tracée dans ${t.mark("où la trace de purge est conservée")}.`,
        "Une politique de conservation sans mécanisme de purge est une déclaration d'intention. En contrôle, c'est la trace d'exécution qui est demandée, pas le document.",
      ],
    },
  );

  return {
    templateId: "D13",
    slug: "politique-conservation",
    title: "Politique de conservation et de purge des données",
    subtitle: scan.hostname,
    generatedAt: scan.scannedAt,
    todos: t.list(),
    sections,
    footer: `Modèle généré par ${EDITOR.product} à partir de l'analyse du ${new Date(scan.scannedAt).toLocaleDateString("fr-FR")}. Les durées de traceurs sont observées ; les autres doivent être renseignées. Document à faire valider par un professionnel du droit avant diffusion.`,
  };
}

/* ------------------------------------------------------------------- D18 */

/**
 * D18 — Analyse d'impact des transferts.
 *
 * Exigée depuis Schrems II pour tout transfert hors Union fondé sur des
 * clauses contractuelles types. Le document part des destinataires réellement
 * contactés : c'est ce qui le distingue d'un modèle vierge, où l'éditeur doit
 * d'abord deviner qui reçoit ses données.
 */
export function generateTransferImpactAssessment(scan: ScanResult): GeneratedDoc {
  const t = new TodoTracker();
  const outside = scan.outsideEea;

  const byJurisdiction = new Map<string, typeof outside>();
  for (const v of outside) {
    const list = byJurisdiction.get(v.effectiveJurisdiction) ?? [];
    byJurisdiction.set(v.effectiveJurisdiction, [...list, v]);
  }

  const sections: DocSection[] = [
    {
      id: "objet",
      heading: "1. Objet et déclencheur",
      clauseRef:
        "CJUE, 16 juillet 2020, C-311/18 (Schrems II) · CEPD, recommandations 01/2020",
      body: [
        "Un transfert de données hors de l'Espace économique européen fondé sur des clauses contractuelles types ne suffit pas à lui seul. Il faut vérifier que le droit du pays de destination ne prive pas ces clauses d'effet, et documenter cette vérification.",
        outside.length === 0
          ? "L'analyse n'a relevé aucun destinataire hors Espace économique européen. Cette analyse d'impact n'a donc pas d'objet en l'état — elle devra être reprise si un tel destinataire est ajouté."
          : `L'analyse du ${new Date(scan.scannedAt).toLocaleDateString("fr-FR")} a relevé ${outside.length} destinataire(s) dont la juridiction effective est hors Espace économique européen.`,
      ],
    },
  ];

  if (outside.length > 0) {
    sections.push(
      {
        id: "transferts",
        heading: "2. Transferts identifiés",
        clauseRef: "RGPD, articles 44 à 49",
        body: [
          "La juridiction retenue est la juridiction EFFECTIVE : celle qui s'applique une fois la chaîne capitalistique remontée. Une filiale européenne d'un groupe étranger peut rester soumise au droit de sa maison mère.",
        ],
        table: {
          columns: [
            "Destinataire",
            "Entité contractante",
            "Juridiction effective",
            "Base invoquée",
            "Ce qui est transmis",
          ],
          rows: outside.map((v) => [
            v.name,
            v.entity,
            v.effectiveJurisdiction,
            v.adequacy === "DPF_CONDITIONAL"
              ? "Adéquation conditionnelle (DPF) — à vérifier à la source"
              : v.adequacy === "ADEQUATE"
                ? "Décision d'adéquation"
                : v.adequacy === "EXTENDED_ACCESS"
                  ? "Aucune — juridiction à accès étatique étendu"
                  : "Aucune décision d'adéquation",
            v.purposeFr,
          ]),
        },
      },
      {
        id: "evaluation",
        heading: "3. Évaluation du droit de destination",
        clauseRef: "CEPD, recommandations 01/2020, étape 3",
        body: [
          "Pour chaque juridiction, il faut apprécier si la législation locale permet aux autorités publiques d'accéder aux données dans des conditions incompatibles avec le droit de l'Union.",
          "Cette appréciation ne peut pas être automatisée : elle demande une analyse juridique du pays concerné, à la date du transfert.",
        ],
        table: {
          columns: ["Juridiction", "Destinataires concernés", "Appréciation à conduire"],
          rows: [...byJurisdiction.entries()].map(([code, vendors]) => [
            code,
            vendors.map((v) => v.name).join(", "),
            t.mark(`appréciation du droit d'accès des autorités publiques — ${code}`),
          ]),
        },
      },
      {
        id: "mesures",
        heading: "4. Mesures supplémentaires",
        clauseRef: "CEPD, recommandations 01/2020, étape 4",
        body: [
          "Lorsque le droit local prive les clauses de leur effet, le transfert ne peut se poursuivre qu'assorti de mesures supplémentaires effectives.",
          "Les mesures purement contractuelles ou organisationnelles ne suffisent pas face à un pouvoir d'accès étatique : seules les mesures techniques qui rendent la donnée inintelligible au destinataire et aux autorités sont regardées comme effectives.",
        ],
        bullets: [
          `Mesures techniques retenues : ${t.mark("chiffrement, pseudonymisation, traitement fractionné — préciser et justifier l'effectivité")}`,
          `Mesures contractuelles complémentaires : ${t.mark("engagements de transparence, notification des demandes d'accès")}`,
          `Décision : ${t.mark("le transfert est-il maintenu, suspendu, ou remplacé par une alternative européenne ?")}`,
        ],
      },
      {
        id: "alternatives",
        heading: "5. Alternatives européennes examinées",
        clauseRef: "RGPD, article 5(1)(c) — minimisation",
        body: [
          "Supprimer le transfert reste la mesure la plus sûre, et souvent la moins coûteuse à défendre. Les alternatives ci-dessous sont issues de la base des destinataires.",
        ],
        bullets: outside
          .filter((v) => (v.alternativesEu ?? []).length > 0)
          .map((v) => `${v.name} → ${(v.alternativesEu ?? []).join(", ")}`)
          .concat(
            outside.every((v) => (v.alternativesEu ?? []).length === 0)
              ? [t.mark("alternatives européennes examinées, service par service")]
              : [],
          ),
      },
    );
  }

  sections.push({
    id: "revision",
    heading: `${outside.length > 0 ? 6 : 2}. Réexamen`,
    clauseRef: "CEPD, recommandations 01/2020, étape 6",
    body: [
      `Cette analyse est réexaminée ${t.mark("fréquence de réexamen, au minimum annuelle")}, et à chaque fois que le droit du pays de destination évolue ou qu'un destinataire change.`,
      "Le statut d'adéquation n'est pas acquis : une décision d'adéquation peut être annulée, et une certification peut expirer. Les statuts figurant dans ce document sont des instantanés datés, à revérifier à leur source officielle.",
    ],
  });

  return {
    templateId: "D18",
    slug: "tia",
    title: "Analyse d'impact des transferts",
    subtitle: scan.hostname,
    generatedAt: scan.scannedAt,
    todos: t.list(),
    sections,
    footer: `Modèle généré par ${EDITOR.product} à partir des destinataires observés le ${new Date(scan.scannedAt).toLocaleDateString("fr-FR")}. Les appréciations de droit étranger ne peuvent pas être automatisées et doivent être conduites par un professionnel du droit. Ce document ne vaut pas analyse juridique.`,
  };
}
