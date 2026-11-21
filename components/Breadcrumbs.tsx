import Link from "next/link";
import { JsonLd } from "./JsonLd";
import { EDITOR } from "@/lib/disclaimer";

/**
 * Fil d'Ariane, avec ses données structurées BreadcrumbList : Google
 * l'affiche à la place de l'URL dans les résultats, et le lecteur d'écran
 * sait où il se trouve (dernier élément en `aria-current="page"`).
 */
/**
 * `jsonLd` : nœuds schema.org propres à la page, fusionnés dans le même
 * graphe que le fil d'Ariane (une page ne rend qu'un seul bloc JSON-LD).
 */
export function Breadcrumbs({
  items,
  jsonLd = [],
}: {
  items: { href: string; label: string }[];
  jsonLd?: Record<string, unknown>[];
}) {
  const all = [{ href: "/", label: "Accueil" }, ...items];
  return (
    <>
      <nav aria-label="Fil d'Ariane" className="mb-6 text-sm print:hidden">
        <ol className="flex flex-wrap items-center gap-1.5 text-muted">
          {all.map((item, i) => {
            const last = i === all.length - 1;
            return (
              <li key={item.href} className="flex items-center gap-1.5">
                {i > 0 ? <span aria-hidden="true">/</span> : null}
                {last ? (
                  <span aria-current="page" className="max-w-[18rem] truncate text-ink-2">
                    {item.label}
                  </span>
                ) : (
                  <Link href={item.href} className="text-flame">
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd
        data={[
          ...jsonLd,
          {
            "@type": "BreadcrumbList",
            itemListElement: all.map((item, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: item.label,
              item: `${EDITOR.productSite}${item.href === "/" ? "/" : item.href}`,
            })),
          },
        ]}
      />
    </>
  );
}
