"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Palette de commandes et recherche globale (Ctrl K, ⌘ K ou « / »).
 *
 * Même mécanique que la carte de contact : `<dialog>` natif ouvert par
 * `showModal()`, piloté par un seul état React, Échap traité explicitement.
 * Le champ suit le motif « combobox » de l'ARIA APG : le focus reste dans le
 * champ, l'option active est désignée par `aria-activedescendant`.
 *
 * Les libellés de types sont recopiés ici plutôt qu'importés depuis
 * `lib/search` : ce module embarque tout l'index et n'a rien à faire dans le
 * paquet client.
 */

type ResultType = "page" | "outil" | "regle" | "traceur" | "cookie" | "guide" | "glossaire";

interface Result {
  type: ResultType;
  title: string;
  url: string;
  excerpt: string;
}

interface Option {
  id: string;
  label: string;
  hint?: string;
  url: string;
  group: string;
}

const TYPE_LABELS: Record<ResultType, string> = {
  page: "Pages",
  outil: "Outils gratuits",
  regle: "Règles",
  traceur: "Traceurs",
  cookie: "Cookies",
  guide: "Guides",
  glossaire: "Glossaire",
};

const QUICK_ACTIONS: readonly Omit<Option, "id" | "group">[] = [
  { label: "Lancer un audit", hint: "Analyser un site gratuitement", url: "/#scan" },
  { label: "Comparer deux sites", hint: "Deux audits côte à côte", url: "/comparer" },
  { label: "Générateur de bandeau", hint: "Un bandeau cookies conforme", url: "/outils/generateur-bandeau" },
  { label: "Tarifs", url: "/tarifs" },
  { label: "Contact", url: "/contact" },
];

const DEBOUNCE_MS = 150;
const PREFETCH_DELAY_MS = 120;
const MAX_QUERY = 100;

/** Chemin interne préchargeable (sans ancre), ou `null` pour toute autre adresse. */
function internalPath(url: string): string | null {
  if (!url.startsWith("/") || url.startsWith("//")) return null;
  return url.split("#")[0] || "/";
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

export function CommandPalette() {
  const router = useRouter();
  const uid = useId();
  const listboxId = `${uid}-liste`;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(-1);
  const [mac, setMac] = useState(false);

  const trimmed = query.trim();

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
  }, []);

  // Ouverture / fermeture : un seul chemin, l'état React (cf. ContactCard).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Filet de sécurité pour les fermetures pilotées par le navigateur.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => setOpen(false);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  // Raccourcis globaux.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !isEditable(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Recherche avec anti-rebond ; la requête précédente est annulée.
  useEffect(() => {
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setFailed(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/recherche?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { results: Result[] };
        setResults(data.results);
        setFailed(false);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setResults([]);
        setFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [trimmed]);

  const options: Option[] = trimmed
    ? [
        ...results.map((r, i) => ({
          id: `${uid}-r${i}`,
          label: r.title,
          hint: r.excerpt,
          url: r.url,
          group: TYPE_LABELS[r.type],
        })),
        {
          id: `${uid}-tous`,
          label: `Voir tous les résultats pour « ${trimmed} »`,
          url: `/recherche?q=${encodeURIComponent(trimmed)}`,
          group: "",
        },
      ]
    : QUICK_ACTIONS.map((a, i) => ({ ...a, id: `${uid}-a${i}`, group: "Actions rapides" }));

  // Toute nouvelle liste repart de la première option.
  useEffect(() => setActive(options.length > 0 ? 0 : -1), [results, trimmed]);

  // L'option active reste visible quand on la déplace au clavier.
  useEffect(() => {
    const el = active >= 0 ? document.getElementById(options[active]?.id ?? "") : null;
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  // Précharge la page de l'option active (survol ou flèches) après un court
  // délai : parcourir la liste ne déclenche pas une rafale de requêtes.
  const prefetched = useRef(new Set<string>());
  const activeUrl = open && active >= 0 ? options[active]?.url : undefined;
  useEffect(() => {
    const path = activeUrl ? internalPath(activeUrl) : null;
    if (!path || prefetched.current.has(path)) return;
    const timer = window.setTimeout(() => {
      prefetched.current.add(path);
      router.prefetch(path);
    }, PREFETCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [activeUrl, router]);

  function go(url: string) {
    setOpen(false);
    router.push(url);
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (options.length) setActive((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (options.length) setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === "Home" && options.length) {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End" && options.length) {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = options[active];
      if (target) go(target.url);
      else if (trimmed) go(`/recherche?q=${encodeURIComponent(trimmed)}`);
    }
  }

  const status = !trimmed
    ? `${QUICK_ACTIONS.length} actions rapides disponibles.`
    : loading
      ? "Recherche en cours…"
      : failed
        ? "La recherche a échoué. Appuyez sur Entrée pour ouvrir la page de résultats."
        : results.length === 0
          ? `Aucun résultat pour « ${trimmed} ».`
          : `${results.length} résultat${results.length > 1 ? "s" : ""}${results.length >= 20 ? " affichés" : ""}. Flèches haut et bas pour parcourir, Entrée pour ouvrir.`;

  // Les options sont rendues par groupes contigus, l'index global étant conservé.
  const groups: { label: string; items: { option: Option; index: number }[] }[] = [];
  options.forEach((option, index) => {
    const last = groups[groups.length - 1];
    if (last && last.label === option.group) last.items.push({ option, index });
    else groups.push({ label: option.group, items: [{ option, index }] });
  });

  const shortcut = mac ? "⌘ K" : "Ctrl K";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-keyshortcuts="Control+K Meta+K /"
        className="font-display inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold text-ink-2 transition hover:bg-surface-high hover:text-flame"
      >
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <span className="sr-only whitespace-nowrap 2xl:not-sr-only">Rechercher</span>
        <kbd aria-hidden="true" className="tech hidden rounded-md border border-line bg-surface-low px-1.5 py-0.5 text-[10px] text-muted 2xl:inline">
          {shortcut}
        </kbd>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={`${uid}-titre`}
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          e.preventDefault();
          setOpen(false);
        }}
        onClick={(e) => {
          if (e.target === dialogRef.current) setOpen(false);
        }}
        className="mx-auto mt-[12vh] w-[min(94vw,40rem)] overflow-hidden rounded-3xl border border-line bg-surface p-0 text-ink-2 shadow-lg backdrop:bg-ink/60 backdrop:backdrop-blur-sm"
      >
        <h2 id={`${uid}-titre`} className="sr-only">
          Recherche et actions rapides
        </h2>

        <div className="flex items-center gap-3 border-b border-line px-5">
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <label htmlFor={`${uid}-champ`} className="sr-only">
            Rechercher une page, une règle, un traceur, un cookie
          </label>
          <input
            ref={inputRef}
            id={`${uid}-champ`}
            type="text"
            role="combobox"
            aria-expanded={options.length > 0}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? options[active]?.id : undefined}
            autoComplete="off"
            spellCheck={false}
            maxLength={MAX_QUERY}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Rechercher : _ga, Google Analytics, bandeau…"
            className="min-h-14 flex-1 bg-transparent text-[16px] text-ink-2 outline-none placeholder:text-muted"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="tech shrink-0 rounded-md border border-line px-2 py-1 text-[10px] text-muted transition hover:bg-surface-high hover:text-ink-2"
          >
            <span aria-hidden="true">Échap</span>
            <span className="sr-only">Fermer la recherche</span>
          </button>
        </div>

        <div
          id={listboxId}
          role="listbox"
          aria-label={trimmed ? "Résultats de recherche" : "Actions rapides"}
          className="max-h-[min(60vh,28rem)] overflow-y-auto p-2"
        >
          {groups.map((group, gi) => (
            <ul
              key={`${group.label}-${gi}`}
              role="group"
              aria-labelledby={group.label ? `${uid}-g${gi}` : undefined}
              aria-label={group.label ? undefined : "Autres"}
              className={group.label ? "" : "mt-2 border-t border-line pt-2"}
            >
              {group.label ? (
                <li id={`${uid}-g${gi}`} role="presentation" className="tech px-3 pb-1 pt-3 text-[10px] text-muted">
                  {group.label}
                </li>
              ) : null}
              {group.items.map(({ option, index }) => {
                const selected = index === active;
                return (
                  <li
                    key={option.id}
                    id={option.id}
                    role="option"
                    aria-selected={selected}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseMove={() => setActive(index)}
                    onClick={() => go(option.url)}
                    className={`cursor-pointer rounded-2xl px-3 py-2.5 ${
                      selected ? "bg-surface-high text-flame" : "text-ink-2"
                    }`}
                  >
                    <span className="block text-[14px] font-semibold leading-snug">{option.label}</span>
                    {option.hint ? (
                      <span className="mt-0.5 block truncate text-[12.5px] text-muted">{option.hint}</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line bg-surface-low px-5 py-2.5">
          <p role="status" aria-live="polite" className="text-[12px] text-muted">
            {status}
          </p>
          <p aria-hidden="true" className="tech hidden shrink-0 text-[10px] text-muted sm:block">
            ↑ ↓ naviguer · Entrée ouvrir
          </p>
        </div>
      </dialog>
    </>
  );
}
