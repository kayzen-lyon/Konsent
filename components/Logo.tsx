/** Marque Konsent : un bouclier de contrôle, tracé en SVG (aucune ressource externe). */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
      <path
        d="M16 3.2 27 7.6v8.2c0 6.4-4.3 11.6-11 14.2-6.7-2.6-11-7.8-11-14.2V7.6L16 3.2Z"
        fill="currentColor"
        opacity="0.16"
      />
      <path
        d="M16 3.2 27 7.6v8.2c0 6.4-4.3 11.6-11 14.2-6.7-2.6-11-7.8-11-14.2V7.6L16 3.2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="m11.4 16.2 3.2 3.3 6-6.4"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
