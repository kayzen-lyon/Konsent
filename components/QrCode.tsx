import { getQr } from "@/lib/contact/qr-generated";

/**
 * Rendu d'un QR code généré à la compilation.
 *
 * Le tracé est figé dans `qr-generated.ts` : ce composant ne calcule rien et
 * n'appelle personne. Il pose un `<svg>` dont le `viewBox` inclut la zone de
 * silence de quatre modules qu'impose la spécification — l'oublier fait
 * échouer la lecture d'un code pourtant correct, et c'est l'erreur
 * d'intégration la plus fréquente.
 *
 * `shape-rendering="crispEdges"` désactive l'anticrénelage : un module de QR
 * doit avoir des bords francs. Lissé, il perd du contraste aux petites
 * tailles et devient difficile à lire pour un téléphone d'entrée de gamme.
 */
export function QrCode({
  code,
  size = 128,
  className = "",
}: {
  code: string;
  size?: number;
  className?: string;
}) {
  const qr = getQr(code);

  // Aucune adresse n'était disponible à la génération. On affiche un
  // emplacement en attente plutôt qu'un carré illisible : un QR code faux
  // ressemble exactement à un QR code juste, et personne ne le relit.
  if (!qr || qr.size === 0) {
    return (
      <div
        className={`grid place-items-center rounded-lg border border-dashed border-line bg-paper text-center ${className}`}
        style={{ width: size, height: size }}
      >
        <p className="px-2 text-[10px] leading-snug text-muted">
          Adresse non fournie — code non généré
        </p>
      </div>
    );
  }

  const quiet = 4;
  const span = qr.size + quiet * 2;

  return (
    <svg
      viewBox={`0 0 ${span} ${span}`}
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`QR code — ${qr.label}`}
      shapeRendering="crispEdges"
    >
      {/* Le fond clair fait partie du code : sans lui, un QR posé sur une
          surface sombre est illisible, quelle que soit la qualité du tracé. */}
      <rect width={span} height={span} fill="#ffffff" rx="1" />
      <g transform={`translate(${quiet} ${quiet})`}>
        <path d={qr.path} fill="#09090b" />
      </g>
    </svg>
  );
}
