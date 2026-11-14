/**
 * Catalogue des outils libres.
 *
 * Parti pris, et il est stratégique. Le scanner du concurrent exige une URL,
 * un e-mail professionnel, un nom d'entreprise et une case à cocher avant de
 * rendre le moindre résultat, qui arrive ensuite « en quelques minutes » par
 * courriel. Chaque outil listé ici rend son verdict immédiatement, sans rien
 * demander.
 *
 * Un outil n'entre dans ce catalogue qu'à trois conditions :
 *  1. il produit un résultat utile SANS inscription ni adresse e-mail ;
 *  2. il ne conserve rien de ce qu'on lui donne ;
 *  3. il reste utile à quelqu'un qui n'achètera jamais rien.
 *
 * La troisième condition est celle qui coûte, et c'est celle qui fait la
 * différence : un outil qui n'est utile qu'aux prospects est une publicité.
 */

export interface FreeTool {
  slug: string;
  title: string;
  /** Ce que l'outil répond, formulé comme la question que se pose le visiteur. */
  question: string;
  description: string;
  /** Où le traitement a lieu. Affiché tel quel : c'est un argument. */
  processing: "navigateur" | "serveur";
  available: boolean;
  /** Adresse de l'outil quand elle ne suit pas le motif /outils/<slug>. */
  href?: string;
}

/** Adresse publique d'un outil. */
export function toolHref(tool: FreeTool): string {
  return tool.href ?? `/outils/${tool.slug}`;
}

export const FREE_TOOLS: readonly FreeTool[] = [
  {
    slug: "generateur-bandeau",
    title: "Générateur de bandeau cookies",
    question: "À quoi ressemble un bandeau qui respecte vraiment les règles de la CNIL ?",
    description:
      "Configurez votre bandeau, voyez-le en direct, copiez un code autonome : « Tout refuser » au même niveau qu'« Tout accepter », aucune case pré-cochée, scripts bloqués avant le choix.",
    processing: "navigateur",
    available: true,
  },
  {
    slug: "comparer",
    title: "Comparateur de deux sites",
    question: "Mon site fait-il mieux ou moins bien que celui de mon concurrent ?",
    description:
      "Deux audits lancés en parallèle et présentés côte à côte : scores, écarts communs, écarts propres à chacun, destinataires hors UE.",
    processing: "serveur",
    available: true,
    href: "/comparer",
  },
  {
    slug: "auto-evaluation",
    title: "Auto-évaluation RGPD",
    question: "Et tout ce qu'un scanner ne peut pas voir ?",
    description:
      "Une trentaine de questions sur le registre, les contrats, les droits des personnes et la sécurité. Score par thème et plan d'action, sans que vos réponses quittent votre navigateur.",
    processing: "navigateur",
    available: true,
    href: "/auto-evaluation",
  },
  {
    slug: "badge",
    title: "Badge Konsent pour votre site",
    question: "Comment montrer à vos visiteurs que vous surveillez vos traceurs ?",
    description:
      "Un badge SVG à intégrer, recalculé chaque jour à partir d'une analyse automatisée — présenté comme tel, jamais comme une certification.",
    processing: "serveur",
    available: true,
    href: "/badge",
  },
  {
    slug: "decodeur-tcf",
    title: "Décodeur de chaîne de consentement TCF",
    question: "Qu'est-ce que mon bandeau transmet vraiment aux régies publicitaires ?",
    description:
      "Décode une chaîne TCF v2 : finalités consenties, finalités activées en intérêt légitime, partenaires, date de recueil, restrictions éditeur.",
    processing: "navigateur",
    available: true,
  },
  {
    slug: "verificateur-preuve",
    title: "Vérificateur d'archive de preuve",
    question: "Cette archive d'audit est-elle authentique et non modifiée ?",
    description:
      "Contrôle les empreintes SHA-256 et la signature Ed25519 d'une archive Konsent, sans rien téléverser.",
    processing: "navigateur",
    available: false,
  },
  {
    slug: "simulateur",
    title: "Simulateur d'exposition",
    question: "Combien cette situation peut-elle me coûter ?",
    description:
      "Calcule le plafond théorique et, surtout, la fourchette réellement observée en procédure simplifiée. Les deux sont affichés ensemble, jamais l'un sans l'autre.",
    processing: "navigateur",
    available: true,
    href: "/simulateur",
  },
];

export function getTool(slug: string): FreeTool | undefined {
  return FREE_TOOLS.find((t) => t.slug === slug);
}
