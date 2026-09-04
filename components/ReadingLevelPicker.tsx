import Link from "next/link";
import { READING_LEVELS, readingLevel, type ReadingLevel } from "@/lib/report/levels";

/**
 * Sélecteur de niveau de lecture.
 *
 * Des liens, pas des boutons : le niveau est dans l'URL, donc un rapport
 * s'envoie au bon destinataire dans la bonne vue, et l'impression restitue
 * exactement ce qui était à l'écran.
 *
 * À l'impression, le sélecteur disparaît et le niveau retenu s'écrit en clair
 * dans l'en-tête du document — un rapport papier qui ne dirait pas dans quelle
 * vue il a été produit laisserait croire qu'il est complet.
 */
export function ReadingLevelPicker({
  target,
  current,
}: {
  target: string;
  current: ReadingLevel;
}) {
  const spec = readingLevel(current);

  return (
    <div className="print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <span className="tech text-[9px] text-muted">Niveau de lecture</span>
        <div className="flex flex-wrap gap-1 rounded-lg bg-paper p-1 ring-1 ring-line">
          {READING_LEVELS.map((level) => {
            const active = level.id === current;
            return (
              <Link
                key={level.id}
                href={`/scan?url=${encodeURIComponent(target)}&vue=${level.id}`}
                aria-current={active ? "true" : undefined}
                className={`tech rounded px-3 py-1.5 text-[10px] transition ${
                  active
                    ? "bg-ink text-white"
                    : "text-muted hover:bg-surface hover:text-ink-2"
                }`}
              >
                {level.label}
              </Link>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-[12px] leading-snug text-muted">{spec.hint}</p>
    </div>
  );
}

/**
 * Mention imprimée, invisible à l'écran : le pendant du sélecteur ci-dessus.
 */
export function PrintedLevelNotice({ current }: { current: ReadingLevel }) {
  const spec = readingLevel(current);
  return (
    <p className="hidden text-[11px] text-muted print:block">
      Vue « {spec.label} ». Les constats et le score sont identiques dans les trois vues ; seule
      la profondeur de justification change.
    </p>
  );
}
