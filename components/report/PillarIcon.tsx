import type { Pillar } from "@/lib/rulepack";

/**
 * Pictogrammes des quatre piliers. Même grille (24 × 24), trait de 2 px,
 * extrémités arrondies, couleur héritée (`currentColor`) : ils suivent le
 * thème sans jeton dédié. Purement décoratifs — le titre du pilier est
 * toujours écrit à côté — donc masqués aux technologies d'assistance.
 */
const PATHS: Record<Pillar, React.ReactNode> = {
  // Traceurs et dépôt : un cookie entamé, ses éclats.
  TRACKING: (
    <>
      <path d="M21 12.5A9 9 0 1 1 11.5 3a3 3 0 0 0 3.5 3.5 3 3 0 0 0 3 3 3 3 0 0 0 3 3Z" />
      <circle cx="8.5" cy="10" r="1" />
      <circle cx="12" cy="15.5" r="1" />
      <circle cx="16" cy="13" r="0.5" />
    </>
  ),
  // Consentement et interface : un interrupteur et une coche.
  CONSENT_UX: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="6" />
      <circle cx="15.5" cy="12" r="3" />
      <path d="m6 12 1.5 1.5L10 11" />
    </>
  ),
  // Documents : une page pliée, ses lignes.
  DOCUMENTS: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </>
  ),
  // Souveraineté : un globe et ses méridiens.
  SOVEREIGNTY: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18Z" />
    </>
  ),
};

export function PillarIcon({ pillar, className = "h-6 w-6" }: { pillar: Pillar; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[pillar]}
    </svg>
  );
}
