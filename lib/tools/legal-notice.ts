import { EDITOR } from "../disclaimer";
import { renderMarkdown, type DocSection, type GeneratedDoc } from "../docs/types";

/**
 * Générateur guidé de mentions légales — logique pure, configuration vers
 * sections. Aucun appel réseau : le composant l'exécute dans le navigateur.
 *
 * Même convention que `lib/docs/*.ts` : une information que seul l'éditeur
 * détient n'est jamais inventée, elle apparaît sous la forme
 * `[[À COMPLÉTER : …]]` et remonte dans `todos`. Une donnée de préréglage
 * dont l'exactitude n'est pas garantie apparaît sous la forme
 * `[[À VÉRIFIER : …]]`, et remonte elle aussi.
 */

// ─────────────────────────── Outils communs ────────────────────────────────

/** Collecteur des champs manquants ou à vérifier, listés en tête du document. */
export class DocTracker {
  private readonly items: string[] = [];

  mark(label: string): string {
    if (!this.items.includes(label)) this.items.push(label);
    return `[[À COMPLÉTER : ${label}]]`;
  }

  verify(label: string): string {
    const entry = `à vérifier — ${label}`;
    if (!this.items.includes(entry)) this.items.push(entry);
    return `[[À VÉRIFIER : ${label}]]`;
  }

  /** Valeur saisie, ou marqueur si elle est vide. */
  val(value: string, label: string): string {
    const v = value.trim();
    return v === "" ? this.mark(label) : v;
  }

  list(): readonly string[] {
    return this.items;
  }
}

/** Expression des marqueurs, pour la mise en évidence dans l'aperçu et l'export. */
export const MARKER_RE = /\[\[À (?:COMPLÉTER|VÉRIFIER) : [^\]]*\]\]/g;

export function formatDateFr(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { dateStyle: "long" });
}

/** Numérote les sections dans l'ordre où elles ont été retenues. */
export function numberSections(sections: readonly DocSection[]): DocSection[] {
  return sections.map((s, i) => ({ ...s, heading: `${i + 1}. ${s.heading}` }));
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Échappe, puis signale les marqueurs par un `<mark>`. */
function inline(s: string): string {
  return escapeHtml(s).replace(MARKER_RE, (m) => `<mark>${m}</mark>`);
}

/** Fragment HTML sémantique, sans style, à coller dans un CMS. */
export function renderDocHtml(doc: GeneratedDoc): string {
  const out: string[] = [
    "<article>",
    `  <h1>${inline(doc.title)}</h1>`,
    `  <p>${inline(doc.subtitle)}</p>`,
  ];
  for (const s of doc.sections) {
    out.push(`  <section id="${escapeHtml(s.id)}">`, `    <h2>${inline(s.heading)}</h2>`);
    for (const p of s.body) out.push(`    <p>${inline(p)}</p>`);
    if (s.bullets && s.bullets.length > 0) {
      out.push("    <ul>");
      for (const b of s.bullets) out.push(`      <li>${inline(b)}</li>`);
      out.push("    </ul>");
    }
    if (s.table) {
      out.push("    <table>", "      <thead>", "        <tr>");
      for (const c of s.table.columns) out.push(`          <th scope="col">${inline(c)}</th>`);
      out.push("        </tr>", "      </thead>", "      <tbody>");
      for (const row of s.table.rows) {
        out.push("        <tr>");
        row.forEach((cell, i) =>
          out.push(i === 0 ? `          <th scope="row">${inline(cell)}</th>` : `          <td>${inline(cell)}</td>`),
        );
        out.push("        </tr>");
      }
      out.push("      </tbody>", "    </table>");
    }
    out.push("  </section>");
  }
  out.push("</article>");
  return out.join("\n");
}

/** Document HTML autonome (téléchargement, impression), styles en ligne. */
export function renderDocStandalone(doc: GeneratedDoc): string {
  const todos =
    doc.todos.length > 0
      ? `<aside class="todo"><p><strong>${doc.todos.length} information(s) à compléter ou à vérifier avant publication :</strong></p><ul>${doc.todos
          .map((t) => `<li>${escapeHtml(t)}</li>`)
          .join("")}</ul></aside>`
      : "";
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(doc.title)}</title>
<style>
body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.6;color:#1f2937;background:#fff;max-width:46rem;margin:0 auto;padding:2.5rem 1.25rem}
h1{font-size:1.9rem;line-height:1.2;margin:0 0 .25rem}
h2{font-size:1.15rem;margin:2rem 0 .5rem}
table{border-collapse:collapse;width:100%;font-size:.9rem;margin:.75rem 0}
th,td{border:1px solid #d0d5dc;padding:.5rem;text-align:left;vertical-align:top}
thead th{background:#f2f5f7}
mark{background:#fef3c7;color:#713f12;padding:0 .15em}
.todo{border-left:3px solid #a16207;background:#fefce8;padding:.75rem 1rem;font-size:.9rem}
footer{margin-top:2.5rem;border-top:1px solid #d0d5dc;padding-top:1rem;font-size:.85rem;color:#586474}
@media print{.todo{break-inside:avoid}body{padding:0}}
</style>
</head>
<body>
${todos}
${renderDocHtml(doc)}
<footer><p>${escapeHtml(doc.footer)}</p></footer>
</body>
</html>
`;
}

export function renderDocMarkdown(doc: GeneratedDoc): string {
  return renderMarkdown(doc);
}

// ─────────────────────────── Configuration ─────────────────────────────────

export type LegalStatus = "ei" | "societe" | "association" | "reglementee";
export type VatMode = "numero" | "franchise" | "non-assujetti";
export type Registry = "rcs" | "rne";

export interface HostPreset {
  id: string;
  label: string;
  name: string;
  address: string;
  phone: string;
  /** Mention à vérifier sur la source officielle de l'hébergeur. */
  verify?: string;
}

/**
 * Hébergeurs courants. Les adresses sont celles publiées par les sociétés
 * dans leurs propres mentions légales ou conditions ; celles qui changent
 * souvent ou dont nous ne sommes pas sûrs sont explicitement signalées.
 * Un téléphone vide produit un marqueur : l'article 6-III l'exige.
 */
export const HOST_PRESETS: readonly HostPreset[] = [
  {
    id: "vercel",
    label: "Vercel",
    name: "Vercel Inc.",
    address: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
    phone: "",
  },
  {
    id: "ovhcloud",
    label: "OVHcloud",
    name: "OVH SAS",
    address: "2 rue Kellermann, 59100 Roubaix, France",
    phone: "1007 (depuis la France)",
    verify: "numéro de téléphone de l'hébergeur",
  },
  {
    id: "ionos",
    label: "IONOS",
    name: "IONOS SARL",
    address: "7 place de la Gare, BP 70109, 57201 Sarreguemines Cedex, France",
    phone: "0970 808 911",
  },
  {
    id: "o2switch",
    label: "o2switch",
    name: "o2switch SAS",
    address: "Chemin des Pardiaux, 63000 Clermont-Ferrand, France",
    phone: "04 44 44 60 40",
    verify: "numéro de téléphone de l'hébergeur",
  },
  {
    id: "hostinger",
    label: "Hostinger",
    name: "Hostinger International Ltd",
    address: "61 Lordou Vironos Street, 6023 Larnaca, Chypre",
    phone: "",
  },
  {
    id: "netlify",
    label: "Netlify",
    name: "Netlify, Inc.",
    address: "512 2nd Street, Suite 200, San Francisco, CA 94107, États-Unis",
    phone: "",
    verify: "adresse actuelle de l'hébergeur",
  },
  {
    id: "scaleway",
    label: "Scaleway",
    name: "Scaleway SAS",
    address: "8 rue de la Ville l'Évêque, 75008 Paris, France",
    phone: "",
  },
  {
    id: "infomaniak",
    label: "Infomaniak",
    name: "Infomaniak Network SA",
    address: "Rue Eugène-Marziano 25, 1227 Les Acacias (Genève), Suisse",
    phone: "",
  },
  {
    id: "lws",
    label: "LWS",
    name: "Ligne Web Services (LWS) SAS",
    address: "10 rue Penthièvre, 75008 Paris, France",
    phone: "",
    verify: "adresse actuelle de l'hébergeur",
  },
  {
    id: "aws",
    label: "Amazon Web Services",
    name: "Amazon Web Services EMEA SARL",
    address: "38 avenue John F. Kennedy, L-1855 Luxembourg",
    phone: "",
  },
  {
    id: "github",
    label: "GitHub Pages",
    name: "GitHub, Inc.",
    address: "88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis",
    phone: "",
  },
  {
    id: "cloudflare",
    label: "Cloudflare Pages",
    name: "Cloudflare, Inc.",
    address: "101 Townsend Street, San Francisco, CA 94107, États-Unis",
    phone: "",
    verify: "adresse actuelle de l'hébergeur",
  },
  {
    id: "shopify",
    label: "Shopify",
    name: "Shopify International Limited",
    address: "Victoria Buildings, 2e étage, 1-2 Haddington Road, Dublin 4, D04 XN32, Irlande",
    phone: "",
  },
  {
    id: "wix",
    label: "Wix",
    name: "Wix.com Ltd.",
    address: "40 Namal Tel Aviv Street, Tel Aviv 6350671, Israël",
    phone: "",
  },
];

export const STATUS_LABELS: Record<LegalStatus, string> = {
  ei: "Entreprise individuelle ou micro-entreprise",
  societe: "Société (SAS, SARL, SA…)",
  association: "Association loi 1901",
  reglementee: "Profession réglementée exercée à titre individuel",
};

export interface LegalNoticeConfig {
  siteName: string;
  siteUrl: string;
  status: LegalStatus;

  /** Nom et prénom (EI, profession réglementée). */
  personName: string;
  tradeName: string;
  microEntreprise: boolean;
  registry: Registry;
  rcsCity: string;

  /** Société. */
  companyName: string;
  legalForm: string;
  capital: string;
  legalRep: string;

  /** Association. */
  associationName: string;
  rna: string;
  prefecture: string;
  president: string;

  address: string;
  phone: string;
  email: string;
  siren: string;
  vatMode: VatMode;
  vatNumber: string;

  director: string;

  hostId: string;
  hostName: string;
  hostAddress: string;
  hostPhone: string;

  /** Activité réglementée ou soumise à autorisation (implicite en statut « reglementee »). */
  regulated: boolean;
  profTitle: string;
  profCountry: string;
  profOrder: string;
  profRules: string;
  authority: string;
  insurance: string;

  sellsOnline: boolean;
  sellsToConsumers: boolean;
  cgvUrl: string;
  mediatorName: string;
  mediatorAddress: string;
  mediatorWebsite: string;

  privacyUrl: string;
  cookiesUrl: string;
  updatedAt: string;
}

export const DEFAULT_LEGAL_NOTICE: LegalNoticeConfig = {
  siteName: "",
  siteUrl: "",
  status: "ei",
  personName: "",
  tradeName: "",
  microEntreprise: true,
  registry: "rne",
  rcsCity: "",
  companyName: "",
  legalForm: "SAS",
  capital: "",
  legalRep: "",
  associationName: "",
  rna: "",
  prefecture: "",
  president: "",
  address: "",
  phone: "",
  email: "",
  siren: "",
  vatMode: "franchise",
  vatNumber: "",
  director: "",
  hostId: "ovhcloud",
  hostName: "",
  hostAddress: "",
  hostPhone: "",
  regulated: false,
  profTitle: "",
  profCountry: "France",
  profOrder: "",
  profRules: "",
  authority: "",
  insurance: "",
  sellsOnline: false,
  sellsToConsumers: false,
  cgvUrl: "",
  mediatorName: "",
  mediatorAddress: "",
  mediatorWebsite: "",
  privacyUrl: "",
  cookiesUrl: "",
  updatedAt: "",
};

// ─────────────────────────── Génération ────────────────────────────────────

function editorName(c: LegalNoticeConfig, t: DocTracker): string {
  switch (c.status) {
    case "societe":
      return t.val(c.companyName, "dénomination sociale");
    case "association":
      return t.val(c.associationName, "nom de l'association");
    default:
      return `${t.val(c.personName, "nom et prénom de l'entrepreneur")} EI`;
  }
}

function vatLine(c: LegalNoticeConfig, t: DocTracker): string {
  if (c.vatMode === "franchise") return "TVA non applicable, article 293 B du code général des impôts.";
  if (c.vatMode === "non-assujetti") return "Non assujetti à la taxe sur la valeur ajoutée.";
  return `Numéro de TVA intracommunautaire : ${t.val(c.vatNumber, "numéro de TVA intracommunautaire")}`;
}

function registryLine(c: LegalNoticeConfig, t: DocTracker): string {
  const siren = t.val(c.siren, "numéro SIREN");
  if (c.registry === "rcs") {
    return `Immatriculation : registre du commerce et des sociétés de ${t.val(c.rcsCity, "ville du greffe")}, sous le numéro ${siren}.`;
  }
  return `Immatriculation : registre national des entreprises (RNE), sous le numéro SIREN ${siren}.`;
}

export function generateLegalNoticeDoc(c: LegalNoticeConfig): GeneratedDoc {
  const t = new DocTracker();
  const site = t.val(c.siteName || c.siteUrl, "nom ou adresse du site");
  const name = editorName(c, t);
  const regulated = c.status === "reglementee" || c.regulated;
  const sections: DocSection[] = [];

  // ── 1. Éditeur ──
  const contact = [
    `Adresse : ${t.val(c.address, c.status === "societe" || c.status === "association" ? "adresse du siège social" : "adresse de l'établissement ou du domicile professionnel")}`,
    `Téléphone : ${t.val(c.phone, "numéro de téléphone")}`,
    `Courriel : ${t.val(c.email, "adresse électronique de contact")}`,
  ];
  let intro: string;
  let bullets: string[];
  let clause = "LCEN (loi n° 2004-575 du 21 juin 2004), art. 6-III, 1 · art. 19";

  if (c.status === "societe") {
    intro = `Le site ${site} est édité par ${name}, ${t.val(c.legalForm, "forme juridique")} au capital de ${t.val(c.capital.replace(/\s*(€|euros?)\s*$/i, ""), "montant du capital social")} €.`;
    bullets = [
      ...contact,
      registryLine({ ...c, registry: "rcs" }, t),
      vatLine(c, t),
      `Représentant légal : ${t.val(c.legalRep, "nom et qualité du représentant légal")}`,
    ];
  } else if (c.status === "association") {
    intro = `Le site ${site} est édité par ${name}, association régie par la loi du 1er juillet 1901, déclarée auprès de la préfecture de ${t.val(c.prefecture, "préfecture ou sous-préfecture de déclaration")} sous le numéro RNA ${t.val(c.rna, "numéro RNA (W…)")}.`;
    bullets = [
      ...contact,
      ...(c.siren.trim() ? [`SIREN : ${c.siren.trim()}`] : []),
      vatLine(c, t),
      `Président : ${t.val(c.president, "nom du président ou de la présidente")}`,
    ];
  } else {
    const trade = c.tradeName.trim() ? `, exerçant sous le nom commercial ${c.tradeName.trim()}` : "";
    const regime = c.microEntreprise ? ", relevant du régime de la micro-entreprise" : "";
    const qualite =
      c.status === "reglementee"
        ? `${t.val(c.profTitle, "titre professionnel")} exerçant à titre individuel`
        : "entrepreneur individuel";
    intro = `Le site ${site} est édité par ${name}, ${qualite}${trade}${regime}.`;
    bullets = [...contact, registryLine(c, t), vatLine(c, t)];
    clause += " · code de commerce, art. L. 526-22 et R. 526-26 (mention « EI »)";
  }

  sections.push({ id: "editeur", heading: "Éditeur du site", clauseRef: clause, body: [intro], bullets });

  // ── 2. Directeur de la publication ──
  const defaultDirector =
    c.status === "societe" ? c.legalRep : c.status === "association" ? c.president : c.personName;
  sections.push({
    id: "publication",
    heading: "Directeur de la publication",
    clauseRef: "LCEN, art. 6-III, 1, c)",
    body: [
      `Le directeur de la publication est ${t.val(c.director || defaultDirector, "nom et prénom du directeur de la publication")}.`,
    ],
  });

  // ── 3. Hébergeur ──
  const preset = HOST_PRESETS.find((h) => h.id === c.hostId);
  const hostBullets: string[] = [];
  if (preset) {
    const verify = preset.verify ? ` ${t.verify(preset.verify)}` : "";
    hostBullets.push(
      `Dénomination : ${preset.name}`,
      `Adresse : ${preset.address}${preset.verify === "adresse actuelle de l'hébergeur" ? verify : ""}`,
      `Téléphone : ${preset.phone ? `${preset.phone}${preset.verify === "numéro de téléphone de l'hébergeur" ? verify : ""}` : t.mark("numéro de téléphone de l'hébergeur")}`,
    );
  } else {
    hostBullets.push(
      `Dénomination : ${t.val(c.hostName, "dénomination de l'hébergeur")}`,
      `Adresse : ${t.val(c.hostAddress, "adresse de l'hébergeur")}`,
      `Téléphone : ${t.val(c.hostPhone, "numéro de téléphone de l'hébergeur")}`,
    );
  }
  sections.push({
    id: "hebergeur",
    heading: "Hébergeur",
    clauseRef: "LCEN, art. 6-III, 1, d)",
    body: ["Le site est hébergé par :"],
    bullets: hostBullets,
  });

  // ── Activité réglementée ──
  if (regulated) {
    const b: string[] = [];
    if (c.status === "reglementee" || c.profTitle.trim() || c.profOrder.trim()) {
      b.push(
        `Titre professionnel : ${t.val(c.profTitle, "titre professionnel")}, octroyé en ${t.val(c.profCountry, "État d'octroi du titre")}`,
        `Ordre ou organisme professionnel d'inscription : ${t.val(c.profOrder, "ordre ou organisme professionnel, avec ses coordonnées")}`,
        `Règles professionnelles applicables : ${t.val(c.profRules, "référence des règles professionnelles et moyen d'y accéder")}`,
      );
    }
    if (c.authority.trim()) b.push(`Autorité ayant délivré l'autorisation d'exercer : ${c.authority.trim()}`);
    b.push(
      `Assurance professionnelle : ${t.val(c.insurance, "assureur, coordonnées et couverture géographique de l'assurance professionnelle")}`,
    );
    sections.push({
      id: "activite",
      heading: "Activité réglementée",
      clauseRef: "LCEN, art. 19 · code de la consommation, art. L. 111-2 et R. 111-2",
      body: ["L'activité exercée relève d'une réglementation particulière. Les informations correspondantes sont les suivantes :"],
      bullets: b,
    });
  }

  // ── Vente en ligne ──
  if (c.sellsOnline) {
    const cgv = t.val(c.cgvUrl, "adresse des conditions générales de vente");
    sections.push({
      id: "vente",
      heading: "Conditions de vente",
      clauseRef: c.sellsToConsumers
        ? "Code de la consommation, art. L. 111-1 et L. 221-5 · LCEN, art. 19"
        : "Code de commerce, art. L. 441-1 · LCEN, art. 19",
      body: c.sellsToConsumers
        ? [
            `Les caractéristiques essentielles des biens et services proposés, leur prix toutes taxes comprises, les modalités de paiement, de livraison et d'exécution, les garanties légales ainsi que les conditions, délais et modalités d'exercice du droit de rétractation sont précisés dans les conditions générales de vente, accessibles à l'adresse ${cgv}.`,
            "Toute commande suppose l'acceptation préalable de ces conditions.",
          ]
        : [
            `Les ventes sont réservées aux professionnels et régies par les conditions générales de vente accessibles à l'adresse ${cgv}.`,
          ],
    });
  }

  // ── Médiation de la consommation ──
  if (c.sellsToConsumers) {
    const web = c.mediatorWebsite.trim() ? `, ${c.mediatorWebsite.trim()}` : "";
    sections.push({
      id: "mediation",
      heading: "Médiation de la consommation",
      clauseRef: "Code de la consommation, art. L. 612-1, L. 612-2 et L. 616-1",
      body: [
        `Conformément aux articles L. 612-1 et suivants du code de la consommation, tout consommateur a le droit de recourir gratuitement à un médiateur de la consommation en vue de la résolution amiable d'un litige qui l'oppose à ${name}.`,
        `Le médiateur dont relève ${name} est : ${t.val(c.mediatorName, "nom du médiateur de la consommation")}, ${t.val(c.mediatorAddress, "adresse du médiateur")}${web}.`,
        "Le consommateur ne peut saisir le médiateur qu'après avoir tenté de résoudre le litige directement auprès de l'éditeur par une réclamation écrite, et dans le délai d'un an à compter de cette réclamation.",
      ],
    });
  }

  // ── Propriété intellectuelle ──
  sections.push({
    id: "propriete",
    heading: "Propriété intellectuelle",
    clauseRef: "Code de la propriété intellectuelle, art. L. 122-4 et L. 335-2",
    body: [
      `L'ensemble des éléments composant le site ${site} — textes, photographies, illustrations, logos, marques, structure et code — est protégé par le droit de la propriété intellectuelle. Sauf mention contraire, ces éléments sont la propriété de ${name}.`,
      "Toute représentation ou reproduction, totale ou partielle, faite sans le consentement préalable et écrit du titulaire des droits est illicite et constitue une contrefaçon.",
    ],
  });

  // ── Données personnelles ──
  sections.push({
    id: "donnees",
    heading: "Données personnelles et cookies",
    clauseRef: "Règlement (UE) 2016/679 · loi n° 78-17 du 6 janvier 1978, art. 82",
    body: [
      `Les conditions dans lesquelles ${name} traite les données personnelles des utilisateurs sont décrites dans la politique de confidentialité, accessible à l'adresse ${t.val(c.privacyUrl, "adresse de la politique de confidentialité")}.`,
      `Les cookies et autres traceurs utilisés sur le site sont présentés dans la politique de gestion des cookies, accessible à l'adresse ${t.val(c.cookiesUrl, "adresse de la politique de gestion des cookies")}.`,
    ],
  });

  // ── Droit applicable ──
  sections.push({
    id: "droit",
    heading: "Droit applicable",
    clauseRef: c.sellsToConsumers ? "Code de la consommation, art. R. 631-3" : undefined,
    body: [
      "Les présentes mentions légales sont régies par le droit français.",
      c.sellsToConsumers
        ? "À défaut de résolution amiable, tout litige relève des juridictions françaises compétentes. Le consommateur peut saisir, à son choix, outre l'une des juridictions territorialement compétentes en vertu du code de procédure civile, la juridiction du lieu où il demeurait au moment de la conclusion du contrat ou de la survenance du fait dommageable."
        : "À défaut de résolution amiable, tout litige relatif à l'utilisation du site relève des juridictions françaises compétentes.",
    ],
  });

  const date = c.updatedAt ? formatDateFr(c.updatedAt) : t.mark("date de mise à jour");

  return {
    templateId: "G-ML",
    slug: "mentions-legales",
    title: "Mentions légales",
    subtitle: `${site} — dernière mise à jour : ${date}`,
    generatedAt: c.updatedAt,
    todos: t.list(),
    sections: numberSections(sections),
    footer: `Modèle généré avec ${EDITOR.product} (${EDITOR.productSite}), dans le navigateur, sans conservation des informations saisies. Ce document est un modèle : il doit être complété, puis validé par un professionnel du droit avant publication. Les marqueurs [[À COMPLÉTER]] et [[À VÉRIFIER]] doivent tous avoir disparu.`,
  };
}

export function legalNoticeFileBase(c: LegalNoticeConfig): string {
  return `mentions-legales${slugPart(c.siteName || c.siteUrl)}`;
}

export function slugPart(s: string): string {
  const slug = s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug ? `-${slug}` : "";
}
