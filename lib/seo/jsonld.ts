import { EDITOR } from "@/lib/disclaimer";
import { RULEPACK } from "@/lib/rulepack";

/**
 * Données structurées schema.org (SXO — référencement et expérience).
 *
 * Une seule source pour l'organisation, le site et le logiciel : les pages
 * composent ces blocs, elles ne les recopient pas. Les valeurs proviennent
 * d'`EDITOR` et du référentiel, donc restent alignées sur le reste du site.
 *
 * Aucune note, aucun avis, aucun chiffre non sourcé : un balisage qui
 * inventerait une `aggregateRating` serait exactement le genre de déclaration
 * que ce produit reproche aux autres.
 */
const BASE = EDITOR.productSite;
/**
 * Identifiants communs à tout l'écosystème KAYZEN : chaque site déclare la
 * même Organization, ce qui permet aux moteurs de relier les applications
 * à un seul éditeur. Ne pas les dériver de `BASE`.
 */
const ORG_ID = "https://www.kayzen-lyon.com/#organization";
const KAYZEN_SITE_ID = "https://www.kayzen-lyon.com/#website";
const SITE_ID = `${BASE}/#website`;
const APP_ID = `${BASE}/#logiciel`;

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: EDITOR.tradeName,
    legalName: EDITOR.legalName,
    url: "https://www.kayzen-lyon.com/",
    // Logo publié par kayzen-lyon.com (référencé dans son ecosystem.json).
    logo: "https://www.kayzen-lyon.com/favicon-512x512.png",
    email: EDITOR.email,
    telephone: EDITOR.phoneE164,
    taxID: EDITOR.siret.replace(/\s/g, ""),
    address: {
      "@type": "PostalAddress",
      streetAddress: EDITOR.street,
      postalCode: EDITOR.postalCode,
      addressLocality: EDITOR.city,
      addressCountry: "FR",
    },
    sameAs: ["https://www.linkedin.com/in/kayzen-lyon/", "https://x.com/KayzenLyon"],
  };
}

export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": SITE_ID,
    name: "Konsent",
    url: `${BASE}/`,
    inLanguage: "fr-FR",
    publisher: { "@id": ORG_ID },
  };
}

export function softwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": APP_ID,
    name: "Konsent",
    url: BASE,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Audit RGPD, cookies et traceurs",
    operatingSystem: "Web",
    inLanguage: "fr-FR",
    softwareVersion: RULEPACK.version,
    description:
      "Audit technique automatisé du consentement : ce qui se dépose avant toute réponse du visiteur, qui reçoit les données, sous quelle juridiction. Indépendant de toute plateforme de consentement.",
    featureList: [
      "Analyse à la demande, sans inscription",
      `Référentiel public de ${RULEPACK.total} règles, versionné et sourcé`,
      "Protocole en trois phases : avant consentement, après refus, après acceptation",
      "Base des destinataires et de leur juridiction effective",
      "Génération de documents alimentés par le scan",
    ],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      description: "Audit libre, sans inscription",
    },
    isPartOf: { "@id": KAYZEN_SITE_ID },
    author: { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
  };
}

export function faqPageJsonLd(items: readonly { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: "fr-FR",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}

export function breadcrumbJsonLd(items: readonly { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${BASE}${it.path}`,
    })),
  };
}

/**
 * Guide de correction en HowTo : les étapes balisées sont exactement celles
 * affichées dans la page, dans le même ordre, avec une ancre vers chacune.
 * Aucune durée ni aucun coût : le guide n'en annonce pas, le balisage non plus.
 */
export function howToJsonLd(input: {
  name: string;
  description: string;
  /** Chemin de la page, ex. `/guides/bloquer-hotjar`. */
  path: string;
  steps: readonly string[];
}) {
  const url = `${BASE}${input.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: input.name,
    description: input.description,
    url,
    inLanguage: "fr-FR",
    publisher: { "@id": ORG_ID },
    step: input.steps.map((text, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: stepName(text),
      text,
      url: `${url}#etape-${i + 1}`,
    })),
  };
}

/** Intitulé court d'une étape : sa première proposition, sans le point final. */
function stepName(text: string): string {
  const first = text.split(/[.:;]\s/)[0]?.replace(/[.:;]$/, "") ?? text;
  return first.length <= 110 ? first : `${first.slice(0, 107).trimEnd()}…`;
}

/**
 * Outil gratuit en SoftwareApplication. Le type est structurel pour rester
 * découplé du catalogue : tout outil exposant ces champs convient.
 */
export function toolJsonLd(tool: {
  slug: string;
  title: string;
  description: string;
  href?: string;
  processing?: "navigateur" | "serveur";
}) {
  const path = tool.href ?? `/outils/${tool.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${BASE}${path}#outil`,
    name: tool.title,
    url: `${BASE}${path}`,
    description: tool.description,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Outil RGPD et cookies",
    operatingSystem: "Web",
    inLanguage: "fr-FR",
    isAccessibleForFree: true,
    ...(tool.processing === "navigateur"
      ? { featureList: ["Traitement local, dans le navigateur", "Sans inscription"] }
      : { featureList: ["Sans inscription"] }),
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    isPartOf: { "@id": SITE_ID },
    author: { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
  };
}
