import { addDuration, formatDateFr } from "./retention";

/**
 * Modèles de réponse aux demandes d'exercice des droits (RGPD, art. 15 à 21).
 *
 * Gabarits déterministes : aucun modèle de langage, aucun envoi. Les
 * passages entre crochets sont à compléter par l'organisme ; ils sont
 * laissés visibles plutôt que remplis au hasard.
 */

export type RightId =
  | "acces"
  | "rectification"
  | "effacement"
  | "limitation"
  | "portabilite"
  | "opposition";

export type Outcome = "acceptee" | "refusee" | "precision";

export interface RightInfo {
  id: RightId;
  label: string;
  article: string;
  /** Complément de « votre demande », préposition comprise. */
  object: string;
}

export const RIGHTS: readonly RightInfo[] = [
  { id: "acces", label: "Droit d'accès", article: "article 15", object: "d'accès à vos données personnelles" },
  { id: "rectification", label: "Droit de rectification", article: "article 16", object: "de rectification de vos données personnelles" },
  { id: "effacement", label: "Droit à l'effacement", article: "article 17", object: "d'effacement de vos données personnelles" },
  { id: "limitation", label: "Droit à la limitation du traitement", article: "article 18", object: "de limitation du traitement de vos données personnelles" },
  { id: "portabilite", label: "Droit à la portabilité", article: "article 20", object: "de portabilité de vos données personnelles" },
  { id: "opposition", label: "Droit d'opposition", article: "article 21", object: "d'opposition au traitement de vos données personnelles" },
];

export interface RefusalReason {
  id: string;
  label: string;
  /** Phrase insérée dans le courrier. */
  text: string;
  rights: readonly RightId[] | "all";
}

export const REFUSAL_REASONS: readonly RefusalReason[] = [
  {
    id: "identite",
    label: "Identité non établie malgré une demande de précision (art. 11.2 et 12.2)",
    text: "malgré notre demande de précision, les éléments transmis ne nous permettent pas de vous identifier avec certitude comme la personne concernée (articles 11, paragraphe 2, et 12, paragraphe 2, du RGPD). Communiquer ou modifier ces données sans cette certitude exposerait celles d'un tiers",
    rights: "all",
  },
  {
    id: "infondee",
    label: "Demande manifestement infondée ou excessive (art. 12.5)",
    text: "votre demande présente un caractère manifestement infondé ou excessif, notamment en raison de son caractère répétitif, au sens de l'article 12, paragraphe 5, du RGPD [exposer précisément les éléments qui le démontrent]",
    rights: "all",
  },
  {
    id: "autrui",
    label: "Atteinte aux droits et libertés d'autrui (art. 15.4)",
    text: "la communication de certaines données porterait atteinte aux droits et libertés d'autres personnes (article 15, paragraphe 4, du RGPD) [préciser les données concernées ; communiquer le reste]",
    rights: ["acces", "portabilite"],
  },
  {
    id: "exactes",
    label: "Données exactes et complètes (art. 16)",
    text: "après vérification, les données que nous détenons sont exactes et complètes au regard de la finalité du traitement [préciser les vérifications effectuées]",
    rights: ["rectification"],
  },
  {
    id: "obligation-legale",
    label: "Conservation imposée par une obligation légale (art. 17.3.b)",
    text: "la conservation de ces données nous est imposée par une obligation légale (article 17, paragraphe 3, point b, du RGPD) : [citer le texte, par exemple l'article L. 123-22 du Code de commerce pour les pièces comptables, conservées dix ans]. Elles sont conservées en archivage à accès restreint et ne servent à aucune autre fin",
    rights: ["effacement"],
  },
  {
    id: "justice",
    label: "Constatation, exercice ou défense de droits en justice (art. 17.3.e / 21.1)",
    text: "ces données sont nécessaires à la constatation, à l'exercice ou à la défense de droits en justice (articles 17, paragraphe 3, point e, et 21, paragraphe 1, du RGPD) [préciser le litige ou le délai de prescription en cause]",
    rights: ["effacement", "opposition"],
  },
  {
    id: "conditions-17",
    label: "Aucun des motifs d'effacement n'est réuni (art. 17.1)",
    text: "aucun des motifs prévus à l'article 17, paragraphe 1, du RGPD n'est réuni : les données restent nécessaires à [finalité], sur la base de [base légale]",
    rights: ["effacement"],
  },
  {
    id: "conditions-18",
    label: "Aucune condition de limitation n'est réunie (art. 18.1)",
    text: "aucune des situations prévues à l'article 18, paragraphe 1, du RGPD n'est caractérisée [exposer pourquoi]",
    rights: ["limitation"],
  },
  {
    id: "base-portabilite",
    label: "Traitement hors champ de la portabilité (art. 20.1)",
    text: "le droit à la portabilité ne s'applique qu'aux données que vous nous avez fournies, traitées de manière automatisée sur la base de votre consentement ou d'un contrat (article 20, paragraphe 1, du RGPD) ; le traitement en cause repose sur [base légale]",
    rights: ["portabilite"],
  },
  {
    id: "motifs-imperieux",
    label: "Motifs légitimes et impérieux (art. 21.1)",
    text: "nous justifions de motifs légitimes et impérieux pour le traitement, qui prévalent sur vos intérêts, droits et libertés (article 21, paragraphe 1, du RGPD) : [exposer ces motifs]",
    rights: ["opposition"],
  },
  {
    id: "base-opposition",
    label: "Base légale non concernée par l'opposition (art. 21.1)",
    text: "le droit d'opposition prévu à l'article 21, paragraphe 1, du RGPD ne s'applique qu'aux traitements fondés sur l'intérêt légitime ou une mission d'intérêt public ; le traitement en cause repose sur [contrat / obligation légale / consentement — dans ce dernier cas, vous pouvez retirer votre consentement à tout moment]",
    rights: ["opposition"],
  },
  {
    id: "autre",
    label: "Autre motif (à rédiger)",
    text: "[exposer le motif et le texte qui le fonde]",
    rights: "all",
  },
];

export function reasonsFor(right: RightId): RefusalReason[] {
  return REFUSAL_REASONS.filter((r) => r.rights === "all" || r.rights.includes(right));
}

export interface ResponseInput {
  right: RightId;
  outcome: Outcome;
  organisation: string;
  signatory: string;
  requester: string;
  receivedAt: Date;
  letterDate: Date;
  identityVerified: boolean;
  reasonId: string;
  details: string;
}

export interface Deadlines {
  /** Un mois à compter de la réception (art. 12.3). */
  standard: Date;
  /** Trois mois au plus en cas de prolongation (art. 12.3). */
  extended: Date;
}

export function deadlines(receivedAt: Date): Deadlines {
  return {
    standard: addDuration(receivedAt, 1, "mois"),
    extended: addDuration(receivedAt, 3, "mois"),
  };
}

const CNIL_RECOURSE =
  "Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la Commission nationale de l'informatique et des libertés (CNIL), 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, ou en ligne sur www.cnil.fr/plaintes (article 77 du RGPD). Vous disposez également d'un droit de recours juridictionnel (article 79 du RGPD).";

function acceptedBody(right: RightId): string[] {
  switch (right) {
    case "acces":
      return [
        "Vous trouverez ci-joint, sans frais, une copie des données personnelles vous concernant que nous traitons [préciser le format et le mode de transmission sécurisé].",
        "Conformément à l'article 15, paragraphe 1, du RGPD, nous vous précisons :",
        "– les finalités du traitement : [à compléter] ;\n– les catégories de données concernées : [à compléter] ;\n– les destinataires ou catégories de destinataires, y compris hors de l'Union européenne : [à compléter, avec les garanties appropriées en cas de transfert] ;\n– la durée de conservation, ou les critères qui la déterminent : [à compléter] ;\n– la source des données lorsqu'elles n'ont pas été collectées auprès de vous : [à compléter] ;\n– l'existence d'une prise de décision automatisée, y compris un profilage : [oui / non ; le cas échéant, logique sous-jacente et conséquences].",
        "Vous disposez par ailleurs des droits de rectification, d'effacement, de limitation et d'opposition, dans les conditions prévues par le RGPD.",
      ];
    case "rectification":
      return [
        "Nous avons procédé à la rectification des données suivantes : [données concernées, valeur antérieure et nouvelle valeur].",
        "Conformément à l'article 19 du RGPD, nous avons notifié cette rectification aux destinataires auxquels ces données avaient été communiquées [ou : aucun destinataire n'avait reçu ces données]. Vous pouvez obtenir la liste de ces destinataires sur simple demande.",
      ];
    case "effacement":
      return [
        "Nous avons procédé à l'effacement des données personnelles vous concernant [préciser le périmètre : comptes, fichiers, sauvegardes — et le délai de rotation de ces dernières].",
        "[Le cas échéant :] Certaines données sont conservées car leur conservation nous est imposée par la loi (article 17, paragraphe 3, du RGPD) : [données et texte applicable]. Elles sont placées en archivage à accès restreint et ne sont utilisées à aucune autre fin.",
        "Conformément à l'article 19 du RGPD, nous avons notifié cet effacement aux destinataires auxquels ces données avaient été communiquées [ou : aucun destinataire].",
      ];
    case "limitation":
      return [
        "Nous avons limité le traitement des données suivantes : [données concernées], pour le motif que vous invoquez [contestation de l'exactitude / traitement illicite / données nécessaires à vos droits en justice / opposition en cours d'examen].",
        "Pendant la limitation, ces données ne font l'objet d'aucune opération autre que leur conservation, sauf avec votre consentement, pour la constatation, l'exercice ou la défense de droits en justice, pour la protection des droits d'une autre personne ou pour des motifs importants d'intérêt public (article 18, paragraphe 2, du RGPD).",
        "Nous vous informerons avant que la limitation ne soit levée (article 18, paragraphe 3, du RGPD).",
      ];
    case "portabilite":
      return [
        "Vous trouverez ci-joint les données que vous nous avez fournies, dans un format structuré, couramment utilisé et lisible par machine : [format, par exemple CSV ou JSON ; mode de transmission sécurisé].",
        "[Si vous l'avez demandé et que c'est techniquement possible :] Ces données ont été transmises directement à [responsable de traitement désigné] (article 20, paragraphe 2, du RGPD).",
      ];
    case "opposition":
      return [
        "Nous avons pris en compte votre opposition : vos données ne sont plus traitées pour [finalité concernée].",
        "[S'il s'agit de prospection :] Votre opposition à la prospection est absolue et prend effet sans condition (article 21, paragraphes 2 et 3, du RGPD). Vos coordonnées sont inscrites sur notre liste d'opposition, afin de garantir que vous ne serez plus sollicité(e) ; elles ne servent qu'à cette fin.",
      ];
  }
}

export interface GeneratedLetter {
  subject: string;
  text: string;
  warnings: string[];
}

export function generateLetter(input: ResponseInput): GeneratedLetter {
  const right = RIGHTS.find((r) => r.id === input.right)!;
  const dl = deadlines(input.receivedAt);
  const org = input.organisation.trim() || "[Nom de l'organisme]";
  const signatory = input.signatory.trim() || "[Nom, fonction — délégué à la protection des données ou service en charge]";
  const salutation = "Madame, Monsieur,";
  const recipient = input.requester.trim() ? [`À l'attention de ${input.requester.trim()}`, ""] : [];
  const subject = `Votre demande d'exercice de droits — ${right.label.toLowerCase()} (${right.article} du RGPD)`;
  const warnings: string[] = [];

  const lines: string[] = [
    org,
    signatory,
    "",
    `Le ${formatDateFr(input.letterDate)}`,
    "",
    ...recipient,
    `Objet : ${subject}`,
    "",
    salutation,
    "",
    `Nous avons bien reçu le ${formatDateFr(input.receivedAt)} votre demande ${right.object}, fondée sur l'${right.article} du règlement (UE) 2016/679 (RGPD).`,
    "",
  ];

  if (input.outcome === "acceptee") {
    lines.push(...acceptedBody(input.right).flatMap((p) => [p, ""]));
    if (input.details.trim()) lines.push(input.details.trim(), "");
    if (!input.identityVerified) {
      warnings.push(
        "L'identité du demandeur n'est pas indiquée comme vérifiée. En cas de doute raisonnable, demandez d'abord une précision (article 12, paragraphe 6) : répondre à un tiers serait une violation de données.",
      );
    }
  } else if (input.outcome === "refusee") {
    const reason = REFUSAL_REASONS.find((r) => r.id === input.reasonId) ?? REFUSAL_REASONS.at(-1)!;
    lines.push(
      `Après examen, nous ne sommes pas en mesure de donner suite à votre demande, au motif que ${reason.text}.`,
      "",
    );
    if (input.details.trim()) lines.push(input.details.trim(), "");
    lines.push(
      "Conformément à l'article 12, paragraphe 4, du RGPD, nous vous informons des voies de recours dont vous disposez :",
      "",
    );
    if (input.right === "opposition" && reason.id !== "identite" && reason.id !== "infondee") {
      warnings.push(
        "Si l'opposition porte sur de la prospection commerciale, elle ne peut pas être refusée (article 21, paragraphe 3) : seul un doute sur l'identité peut retarder sa prise en compte.",
      );
    }
    if (reason.id === "infondee") {
      warnings.push(
        "Il vous appartient de démontrer le caractère manifestement infondé ou excessif (article 12, paragraphe 5). Ce motif s'interprète strictement.",
      );
    }
  } else {
    lines.push("Afin de pouvoir traiter votre demande, nous avons besoin des précisions suivantes :", "");
    if (!input.identityVerified) {
      lines.push(
        "– un élément permettant de confirmer que vous êtes bien la personne concernée (article 12, paragraphe 6, du RGPD) : [par exemple, une réponse depuis l'adresse électronique associée à votre compte, ou votre numéro de client]. Nous ne vous demandons que ce qui est nécessaire à cette vérification ;",
      );
    }
    lines.push(
      input.details.trim()
        ? `– ${input.details.trim()}`
        : "– [précisez les éléments nécessaires : périmètre de la demande, compte ou service concerné, données à rectifier…]",
      "",
      `Nous traiterons votre demande dès réception de ces éléments. À titre indicatif, notre délai de réponse expire le ${formatDateFr(dl.standard)} ; il peut être prolongé de deux mois compte tenu de la complexité ou du nombre de demandes, auquel cas nous vous en informerions avant cette date, motifs à l'appui (article 12, paragraphe 3, du RGPD).`,
      "",
    );
    if (input.identityVerified && !input.details.trim()) {
      warnings.push("Indiquez dans le champ « Précisions » ce que vous demandez au demandeur.");
    }
  }

  lines.push(CNIL_RECOURSE, "", "Nous vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.", "", signatory, org);

  if (input.letterDate.getTime() > dl.standard.getTime() && input.outcome !== "precision") {
    warnings.push(
      `La date du courrier est postérieure au ${formatDateFr(dl.standard)}, terme du délai d'un mois. Sauf prolongation notifiée dans ce premier mois, le délai est dépassé.`,
    );
  }
  if (input.letterDate.getTime() > dl.extended.getTime()) {
    warnings.push(`Le délai maximal de trois mois, prolongation comprise, a expiré le ${formatDateFr(dl.extended)}.`);
  }
  if (input.letterDate.getTime() < input.receivedAt.getTime()) {
    warnings.push("La date du courrier est antérieure à la date de réception de la demande.");
  }

  return { subject, text: lines.join("\n"), warnings };
}
