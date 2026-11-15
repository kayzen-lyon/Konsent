import QRCode from "qrcode";

/**
 * QR code du rapport, sur le papier uniquement.
 *
 * Calculé sur le serveur et rendu en SVG inline : aucun service tiers, aucune
 * image chargée. Les modules noirs contigus d'une ligne sont fusionnés en un
 * seul segment (même tracé que `scripts/generate-qr.mjs`), ce qui divise la
 * taille du SVG par cinq environ.
 *
 * Couleur : `currentColor` sur fond blanc, avec la zone de silence de quatre
 * modules exigée par la norme. Niveau de correction M, comme les QR figés.
 */
function toPath(size: number, data: Uint8Array): string {
  const parts: string[] = [];
  for (let y = 0; y < size; y += 1) {
    let run = 0;
    for (let x = 0; x <= size; x += 1) {
      if (x < size && data[y * size + x] === 1) {
        run += 1;
        continue;
      }
      if (run > 0) {
        parts.push(`M${x - run} ${y}h${run}v1h-${run}z`);
        run = 0;
      }
    }
  }
  return parts.join("");
}

const QUIET = 4;

export function ReportQr({ url, className = "" }: { url: string; className?: string }) {
  const { size, data } = QRCode.create(url, { errorCorrectionLevel: "M" }).modules;
  const box = size + QUIET * 2;

  return (
    <figure className={`hidden shrink-0 text-center print:block ${className}`}>
      <svg
        viewBox={`${-QUIET} ${-QUIET} ${box} ${box}`}
        style={{ width: "25mm", height: "25mm" }}
        shapeRendering="crispEdges"
        role="img"
        aria-label="QR code menant à ce rapport en ligne"
      >
        <rect x={-QUIET} y={-QUIET} width={box} height={box} fill="#fff" />
        <path d={toPath(size, data)} fill="currentColor" />
      </svg>
      <figcaption className="mt-1 max-w-[25mm] text-[8px] leading-tight">
        Scannez pour ouvrir ce rapport en ligne
      </figcaption>
    </figure>
  );
}
