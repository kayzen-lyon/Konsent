/**
 * Adresse du rapport, sur le papier uniquement.
 *
 * Un QR code était prévu ici. Le paquet `qrcode` n'est qu'une dépendance de
 * développement : l'importer à l'exécution ferait dépendre la production
 * d'un paquet qui n'y est pas déclaré. En attendant qu'il passe en
 * `dependencies`, le papier porte l'adresse en clair — lisible, recopiable,
 * et sans aucun appel réseau.
 */
export function PrintReportLink({ url }: { url: string }) {
  return (
    <aside className="mt-8 hidden rounded-lg border border-line p-4 print:block">
      <p className="tech text-[10px] text-muted">Retrouver ce rapport en ligne</p>
      <p className="mt-1 break-all font-mono text-[11px] text-ink-2">{url}</p>
    </aside>
  );
}
