/**
 * Adresse du rapport, sur le papier uniquement.
 *
 * Complète le QR code de l'en-tête (`ReportQr`) : le papier porte aussi
 * l'adresse en clair — lisible, recopiable, et sans aucun appel réseau.
 */
export function PrintReportLink({ url }: { url: string }) {
  return (
    <aside className="mt-8 hidden rounded-lg border border-line p-4 print:block">
      <p className="tech text-[10px] text-muted">Retrouver ce rapport en ligne</p>
      <p className="mt-1 break-all font-mono text-[11px] text-ink-2">{url}</p>
    </aside>
  );
}
