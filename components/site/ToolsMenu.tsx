"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FREE_TOOLS, toolHref } from "@/lib/tools/catalog";

/**
 * Menu « Outils » de l'en-tête : motif de divulgation (bouton +
 * `aria-expanded` + liste de liens), pas un `role="menu"` — ce sont des liens
 * de navigation, et le motif menu impose des touches que l'utilisateur
 * n'attend pas ici. Échap et le clic extérieur ferment, le focus revient au
 * bouton.
 */
const EXTRA = [
  { href: "/analyse-en-lot", title: "Analyse en lot", question: "Jusqu'à 20 sites d'un coup, export CSV." },
  { href: "/secteurs", title: "Guides par secteur", question: "E-commerce, santé, collectivités, presse." },
];

export function ToolsMenu({ active }: { active: boolean }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

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

  const tools = FREE_TOOLS.filter((t) => t.available);

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
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
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
        className="absolute left-1/2 top-full z-50 mt-2 w-[min(92vw,44rem)] -translate-x-1/2 rounded-3xl border border-line bg-surface p-3 shadow-lg"
      >
        <ul className="grid gap-1 sm:grid-cols-2">
          {[
            ...tools.map((t) => ({ href: toolHref(t), title: t.title, question: t.question })),
            ...EXTRA,
          ].map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-2xl px-4 py-3 transition-colors hover:bg-surface-low"
              >
                <span className="block text-sm font-bold text-ink-2">{item.title}</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-muted">{item.question}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-2 border-t border-line px-4 pt-3">
          <Link href="/outils" className="font-display text-sm font-bold text-flame">
            Tous les outils →
          </Link>
        </div>
      </div>
    </div>
  );
}
