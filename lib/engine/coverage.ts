/**
 * Couverture déclarée du moteur statique.
 *
 * Le moteur sans navigateur ne sait pas tout décider. Le danger n'est pas là :
 * il est qu'une règle non décidée passe pour satisfaite. Un rapport qui compte
 * 139 règles « vérifiées » alors que 20 n'ont jamais été regardées est un faux
 * en écriture — exactement le reproche que Konsent adresse au marché (§5.4).
 *
 * Ce fichier est donc la seule source de vérité des règles `static` que le
 * moteur ne décide pas encore. `scripts/check-rulepack.mjs` le lit et refuse
 * toute règle `static` qui ne serait ni implémentée dans `evaluate.ts`, ni
 * listée ici.
 *
 * Y ajouter une entrée est un acte explicite et visible en revue. C'est le but.
 */

export const STATIC_UNDECIDABLE: readonly string[] = [
  // Contenu documentaire : demandent une lecture fine du texte de la politique,
  // au-delà de la simple détection de présence dont le moteur est capable.
  "KZC-DOC-004",
  "KZC-DOC-007",
  "KZC-DOC-008",
  "KZC-DOC-010",
  "KZC-DOC-014",
  "KZC-DOC-015",
  "KZC-DOC-016",
  "KZC-DOC-018",

  // Exigent la configuration réelle de l'outil de mesure, non observable
  // depuis le document servi.
  "KZC-EXEMPT-003",
  "KZC-EXEMPT-005",
  "KZC-EXEMPT-006",

  // Demandent une base de données externe (liste DPF, registre d'ASN) ou une
  // inférence sectorielle que le moteur n'exécute pas encore.
  "KZC-SEC-006",
  "KZC-SPECIAL-001",
  "KZC-SPECIAL-006",
  "KZC-TRANSFER-004",
  "KZC-TRANSFER-008",
  "KZC-TRANSFER-009",
  "KZC-TRANSFER-010",
  "KZC-TRANSFER-012",
  "KZC-VENDOR-001",
  "KZC-VENDOR-006",
];

export const STATIC_UNDECIDABLE_SET: ReadonlySet<string> = new Set(STATIC_UNDECIDABLE);
