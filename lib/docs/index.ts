import type { ScanResult } from "../engine/types";
import { generatePrivacyPolicy } from "./confidentialite";
import { generateDpa, generateLegalNotice } from "./mentions-dpa";
import { generateCookiePolicy } from "./politique-cookies";
import { generateRetentionPolicy, generateTransferImpactAssessment } from "./conservation-tia";
import { generateBreachProcedure, generateRightsProcedure } from "./procedures";
import { generateRegistre } from "./registre";
import {
  generateBreachRegistry,
  generateConsentRegistry,
  generateDpoDesignation,
  generateProcessorRegistry,
  generateRightsRegistry,
  generateSecurityPolicy,
} from "./registres";
import type { GeneratedDoc } from "./types";

export * from "./types";

/**
 * Registre des générateurs.
 *
 * Tous partagent le même modèle de sortie et la même contrainte : aucune
 * variable inconnue n'est inventée, elle est signalée en clair.
 */
const GENERATORS: Record<string, (scan: ScanResult) => GeneratedDoc> = {
  "politique-cookies": adaptCookiePolicy,
  "politique-confidentialite": generatePrivacyPolicy,
  "mentions-legales": generateLegalNotice,
  "registre-traitements": generateRegistre,
  "contrat-sous-traitance": generateDpa,
  "procedure-violation": generateBreachProcedure,
  "procedure-droits": generateRightsProcedure,
  "politique-conservation": generateRetentionPolicy,
  "tia": generateTransferImpactAssessment,
  // Registres et gouvernance : des structures à tenir, pas des textes à
  // publier. Voir l'en-tête de `registres.ts` pour ce qui les distingue.
  "registre-sous-traitant": generateProcessorRegistry,
  "registre-violations": generateBreachRegistry,
  "registre-demandes": generateRightsRegistry,
  "registre-consentements": generateConsentRegistry,
  "pssi": generateSecurityPolicy,
  "designation-dpo": generateDpoDesignation,
};

/**
 * La politique cookies a été écrite avant l'unification du modèle : on
 * l'adapte ici plutôt que de la réécrire, pour ne pas risquer de régression
 * sur un document déjà en production.
 */
function adaptCookiePolicy(scan: ScanResult): GeneratedDoc {
  const doc = generateCookiePolicy(scan);
  return {
    templateId: "D02",
    slug: "politique-cookies",
    title: doc.title,
    subtitle: doc.subtitle,
    generatedAt: doc.generatedAt,
    todos: doc.todos,
    sections: doc.sections.map((s) => ({
      id: s.id,
      heading: s.heading,
      body: s.body,
      ...(s.clauseRef ? { clauseRef: s.clauseRef } : {}),
      ...(s.table ? { table: s.table } : {}),
    })),
    footer: doc.footer,
  };
}

export function generateDocument(slug: string, scan: ScanResult): GeneratedDoc | null {
  const generator = GENERATORS[slug];
  return generator ? generator(scan) : null;
}

export function hasGenerator(slug: string): boolean {
  return slug in GENERATORS;
}
