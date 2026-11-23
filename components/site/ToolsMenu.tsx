"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CAPTURES, VIGNETTE_PAR_ID } from "@/components/immersive/captures";
import { FREE_TOOLS, toolHref } from "@/lib/tools/catalog";

/**
 * Mega-menu « Outils gratuits » de l'en-tête.
 *
 * Motif de divulgation (bouton + `aria-expanded` + liste de liens), pas un
 * `role="menu"` : ce sont des liens de navigation, et le motif menu impose
 * des touches que l'utilisateur n'attend pas ici. Échap et le clic extérieur
 * ferment, le focus revient au bouton.
 *
 * Illustrations : les VRAIES captures des outils (components/immersive/
 * captures), jamais des images d'illustration génériques. À gauche une
 * vignette par outil, à droite un grand aperçu qui suit le survol et le
 * focus clavier.
 */

interface MenuItem {
  id: string;
  href: string;
  title: string;
  question: string;
  description: string;
  /** Traitement local : affiché tel quel, c'est un argument. */
  local?: boolean;
}

const EXTRA: readonly MenuItem[] = [
  {
    id: "analyse-en-lot",
    href: "/analyse-en-lot",
    title: "Analyse en lot",
    question: "Jusqu'à 20 sites d'un coup, export CSV.",
    description:
      "Collez une liste d'adresses : chaque site est analysé, puis le tableau récapitulatif s'exporte en CSV.",
  },
  {
    id: "secteurs",
    href: "/secteurs",
    title: "Guides par secteur",
    question: "E-commerce, santé, collectivités, presse.",
    description: "Les traceurs typiques et les points de vigilance de chaque secteur, avec leurs références.",
  },
];

/** Trois familles, dans l'ordre où l'on s'en sert. */
const GROUPS: readonly { title: string; ids: readonly string[] }[] = [
  {
    title: "Mettre en conformité",
    ids: [
      "generateur-bandeau",
      "generateur-mentions-legales",
      "generateur-confidentialite",
      "registre-traitements",
      "reponse-droits",
    ],
  },
  {
    title: "Vérifier",
    ids: ["en-tetes-securite", "testeur-cookie", "decodeur-tcf", "verificateur-preuve", "comparer", "analyse-en-lot"],
  },
  {
    title: "Évaluer et anticiper",
    ids: ["auto-evaluation", "duree-conservation", "procedure-cnil", "simulateur", "badge", "secteurs"],
  },
];

function buildGroups(): { title: string; items: MenuItem[] }[] {
  const all = new Map<string, MenuItem>();
  for (const t of FREE_TOOLS.filter((x) => x.available)) {
    all.set(t.slug, {
      id: t.slug,
      href: toolHref(t),
      title: t.title,
      question: t.question,
      description: t.description,
      local: t.processing === "navigateur",
    });
  }
  for (const e of EXTRA) all.set(e.id, e);

  const placed = new Set<string>();
  const groups = GROUPS.map((g) => ({
    title: g.title,
    items: g.ids.flatMap((id) => {
      const item = all.get(id);
      if (!item) return [];
      placed.add(id);
      return [item];
    }),
  }));
  // Un outil ajouté au catalogue sans être rangé ne doit pas disparaître du menu.
  const rest = [...all.values()].filter((i) => !placed.has(i.id));
  if (rest.length > 0) groups.push({ title: "Autres outils", items: rest });
  return groups.filter((g) => g.items.length > 0);
}

const MENU_GROUPS = buildGroups();
const FIRST = MENU_GROUPS[0]!.items[0]!;

function Thumb({ image, title }: { image?: StaticImageData; title: string }) {
  if (!image) {
    return (
      <span
        aria-hidden="true"
        className="flex aspect-video w-16 shrink-0 items-center justify-center rounded-md bg-surface-high font-display text-[13px] font-bold text-flame ring-1 ring-line"
      >
        {title.slice(0, 1)}
      </span>
    );
  }
  return (
    <Image
      src={image}
      alt=""
      sizes="64px"
      className="aspect-video w-16 shrink-0 rounded-md object-cover object-top ring-1 ring-line"
    />
  );
}

export function ToolsMenu({ active }: { active: boolean }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<MenuItem>(FIRST);
  const [top, setTop] = useState(0);
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  // Le panneau est centré sur la page, pas sur le bouton : il est plus large
  // que l'espace autour du bouton. On le cale sous la barre d'en-tête.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const header = buttonRef.current?.closest("header");
      const bottom = (header ?? buttonRef.current)?.getBoundingClientRect().bottom ?? 0;
      setTop(Math.round(bottom));
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { passive: true });
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const preview = CAPTURES[current.id];

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={`font-display flex min-h-11 items-center gap-1 whitespace-nowrap border-b-2 px-2.5 text-sm font-semibold transition-colors ${
          active ? "border-flame text-flame" : "border-transparent text-ink-2 hover:text-flame"
        }`}
      >
        Outils gratuits
        <svg
          viewBox="0 0 24 24"
          className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div
        id={panelId}
        hidden={!open}
        style={{ top: top + 8 }}
        className="fixed left-1/2 z-50 max-h-[calc(100vh-6rem)] w-[min(96vw,74rem)] -translate-x-1/2 overflow-y-auto rounded-3xl border border-line bg-paper p-5 shadow-lg"
      >
        <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
          {/* ── Les outils, par famille ── */}
          <div className="grid gap-x-5 gap-y-6 md:grid-cols-3">
            {MENU_GROUPS.map((group) => (
              <section key={group.title} aria-labelledby={`${panelId}-${group.title}`}>
                <h2
                  id={`${panelId}-${group.title}`}
                  className="tech px-2 text-[12px] text-muted"
                >
                  {group.title}
                </h2>
                <ul className="mt-2 space-y-0.5">
                  {group.items.map((item) => {
                    const selected = item.id === current.id;
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          onMouseEnter={() => setCurrent(item)}
                          onFocus={() => setCurrent(item)}
                          aria-describedby={selected ? `${panelId}-question` : undefined}
                          className={`flex items-center gap-3 rounded-2xl p-2 transition-colors motion-reduce:transition-none ${
                            selected ? "bg-surface ring-1 ring-line" : "hover:bg-surface"
                          }`}
                        >
                          <Thumb image={VIGNETTE_PAR_ID[item.id]} title={item.title} />
                          <span
                            className={`line-clamp-2 min-w-0 font-display text-[14px] font-bold leading-snug ${
                              selected ? "text-flame" : "text-ink-2"
                            }`}
                          >
                            {item.title}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>

          {/* ── Aperçu de l'outil survolé ou sélectionné au clavier ── */}
          <aside aria-live="polite" className="hidden flex-col rounded-2xl bg-surface p-4 ring-1 ring-line xl:flex">
            <div className="overflow-hidden rounded-xl bg-paper ring-1 ring-line">
              <div aria-hidden="true" className="flex items-center gap-1.5 border-b border-line px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-line-2" />
                <span className="h-2 w-2 rounded-full bg-line-2" />
                <span className="h-2 w-2 rounded-full bg-line-2" />
                <span className="ml-2 truncate text-[12px] text-muted">
                  konsent.kayzen-lyon.com{current.href}
                </span>
              </div>
              {preview ? (
                <Image
                  key={current.id}
                  src={preview}
                  alt={`Aperçu de l'outil : ${current.title}`}
                  sizes="320px"
                  className="block aspect-video w-full object-cover object-top"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center bg-surface-high">
                  <span className="display text-4xl text-flame">{current.title.slice(0, 1)}</span>
                </div>
              )}
            </div>
            <p className="display mt-4 text-xl text-ink-2">{current.title}</p>
            <p id={`${panelId}-question`} className="mt-1 font-display text-[15px] font-semibold text-flame">
              {current.question}
            </p>
            <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-muted">{current.description}</p>
            {current.local ? (
              <p className="mt-3 text-[13px] text-ok">Traitement dans votre navigateur : rien n&apos;est envoyé.</p>
            ) : null}
            <Link
              href={current.href}
              className="btn-primary mt-auto inline-flex justify-center rounded-full bg-flame px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-flame-dark"
            >
              Ouvrir l&apos;outil
            </Link>
          </aside>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line px-2 pt-4">
          <p className="text-[13px] text-muted">Tous gratuits, sans inscription.</p>
          <Link href="/outils" className="font-display text-sm font-bold text-flame hover:underline">
            Tous les outils →
          </Link>
        </div>
      </div>
    </div>
  );
}
