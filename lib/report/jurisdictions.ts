import type { Adequacy, TrackerEntity } from "../trackers/types";

/**
 * Destinataires regroupés par juridiction effective.
 *
 * « Hors EEE » suit exactement la définition du moteur (`evaluate.ts`) :
 * tout destinataire dont le statut d'adéquation n'est pas `EEA`. Un pays
 * adéquat reste hors EEE — l'adéquation encadre le transfert, elle ne le
 * fait pas disparaître.
 */

const COUNTRY_FR: Record<string, string> = {
  FR: "France",
  IE: "Irlande",
  DE: "Allemagne",
  NL: "Pays-Bas",
  DK: "Danemark",
  SE: "Suède",
  EE: "Estonie",
  PL: "Pologne",
  LU: "Luxembourg",
  MT: "Malte",
  BE: "Belgique",
  ES: "Espagne",
  IT: "Italie",
  FI: "Finlande",
  AT: "Autriche",
  CZ: "Tchéquie",
  PT: "Portugal",
  NO: "Norvège",
  CH: "Suisse",
  US: "États-Unis",
  GB: "Royaume-Uni",
  IL: "Israël",
  CN: "Chine",
  RU: "Russie",
  CA: "Canada",
  NZ: "Nouvelle-Zélande",
  JP: "Japon",
  KR: "Corée du Sud",
  IN: "Inde",
  AU: "Australie",
  EU: "Union européenne",
  XX: "Juridiction indéterminée",
};

export function countryName(code: string): string {
  return COUNTRY_FR[code] ?? code;
}

/** Du plus préoccupant au moins préoccupant. */
const ADEQUACY_RANK: Record<Adequacy, number> = {
  EXTENDED_ACCESS: 0,
  NONE: 1,
  DPF_CONDITIONAL: 2,
  ADEQUATE: 3,
  EEA: 4,
};

export const ADEQUACY_SHORT: Record<Adequacy, string> = {
  EEA: "EEE",
  ADEQUATE: "Adéquation",
  DPF_CONDITIONAL: "DPF conditionnel",
  NONE: "Sans adéquation",
  EXTENDED_ACCESS: "Accès étatique étendu",
};

export interface JurisdictionGroup {
  code: string;
  name: string;
  count: number;
  outsideEea: boolean;
  /** Statut le plus défavorable parmi les destinataires du groupe. */
  adequacy: Adequacy;
  vendors: readonly string[];
}

export function recipientsByJurisdiction(
  vendors: readonly Pick<TrackerEntity, "name" | "effectiveJurisdiction" | "adequacy">[],
): readonly JurisdictionGroup[] {
  const groups = new Map<string, { adequacy: Adequacy; vendors: string[] }>();
  for (const v of vendors) {
    const g = groups.get(v.effectiveJurisdiction);
    if (!g) {
      groups.set(v.effectiveJurisdiction, { adequacy: v.adequacy, vendors: [v.name] });
      continue;
    }
    g.vendors.push(v.name);
    if (ADEQUACY_RANK[v.adequacy] < ADEQUACY_RANK[g.adequacy]) g.adequacy = v.adequacy;
  }
  return [...groups.entries()]
    .map(([code, g]) => ({
      code,
      name: countryName(code),
      count: g.vendors.length,
      outsideEea: g.adequacy !== "EEA",
      adequacy: g.adequacy,
      vendors: [...g.vendors].sort((a, b) => a.localeCompare(b, "fr")),
    }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        ADEQUACY_RANK[a.adequacy] - ADEQUACY_RANK[b.adequacy] ||
        a.name.localeCompare(b.name, "fr"),
    );
}
