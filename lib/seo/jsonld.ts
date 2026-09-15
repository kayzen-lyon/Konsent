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
const ORG_ID = `${BASE}/#organisation`;
const SITE_ID = `${BASE}/#site`;
const APP_ID = `${BASE}/#logiciel`;

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: EDITOR.legalName,
    alternateName: EDITOR.tradeName,
    url: BASE,
    logo: `${BASE}/opengraph-image`,
    email: EDITOR.email,
    telephone: EDITOR.phoneE164,
    vatID: EDITOR.vatNumber,
    address: {
      "@type": "PostalAddress",
      streetAddress: EDITOR.street,
      postalCode: EDITOR.postalCode,
      addressLocality: EDITOR.city,
      addressCountry: "FR",
    },
    sameAs: [EDITOR.agencySite],
  };
}

export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": SITE_ID,
    name: "Konsent",
    url: BASE,
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
