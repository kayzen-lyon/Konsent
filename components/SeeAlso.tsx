import Link from "next/link";
import { SEE_ALSO_MIN, type RelatedLink } from "@/lib/seo/related";

/**
 * Bloc « Voir aussi » des fiches : liens calculés par `lib/seo/related`.
 *
 * Composant serveur, sans JavaScript client. Une région de navigation
 * nommée par son titre (RGAA 12.6) contenant une vraie liste (RGAA 9.3) ;
 * chaque lien porte un intitulé explicite hors contexte (RGAA 6.1), la
 * nature de la page étant lue avant le titre.
 */
export function SeeAlso({
  links,
  id = "voir-aussi",
}: {
  links: readonly RelatedLink[];
  id?: string;
}) {
  if (links.length < SEE_ALSO_MIN) return null;
  const titleId = `${id}-titre`;
  return (
    <nav aria-labelledby={titleId} className="mt-10 print:hidden">
      <h2 id={titleId} className="display text-xl text-ink-2">
        Voir aussi
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="card-lift group flex h-full flex-col rounded-3xl border border-line bg-surface p-5 shadow-md"
            >
              <span className="tech text-[9px] text-muted">
                {l.hint ? `${l.kind} · ${l.hint}` : l.kind}
              </span>
              <span className="mt-1.5 text-[15px] font-bold leading-snug text-ink-2 group-hover:text-flame">
                {l.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
