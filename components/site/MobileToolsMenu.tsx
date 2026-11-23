"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { VIGNETTE_PAR_ID } from "@/components/immersive/captures";
import { MENU_GROUPS, Thumb } from "./ToolsMenu";

/**
 * « Outils gratuits » dans le menu mobile : section dépliable qui reprend
 * les familles et les vignettes du mega-menu de bureau (mêmes données, voir
 * `MENU_GROUPS`). Fermée par défaut : le menu mobile reste court tant qu'on
 * ne la demande pas.
 */
export function MobileToolsMenu({ active, onNavigate }: { active: boolean; onNavigate: () => void }) {
  const [open, setOpen] = useState(active);
  const panelId = useId();

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={`font-display flex min-h-11 w-full items-center justify-between rounded-lg px-4 text-sm font-semibold transition-colors ${
          active ? "bg-surface-low text-flame" : "text-ink-2 hover:bg-surface-low"
        }`}
      >
        Outils gratuits
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div id={panelId} hidden={!open} className="mt-1 space-y-4 rounded-2xl bg-surface p-3 ring-1 ring-line">
        {MENU_GROUPS.map((group) => (
          <section key={group.title} aria-labelledby={`${panelId}-${group.title}`}>
            <h2 id={`${panelId}-${group.title}`} className="tech px-1 text-[12px] text-muted">
              {group.title}
            </h2>
            <ul className="mt-1.5 space-y-0.5">
              {group.items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className="flex min-h-11 items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-paper"
                  >
                    <Thumb image={VIGNETTE_PAR_ID[item.id]} title={item.title} />
                    <span className="min-w-0">
                      <span className="block font-display text-[14px] font-bold leading-snug text-ink-2">
                        {item.title}
                      </span>
                      <span className="line-clamp-1 text-[13px] leading-snug text-muted">{item.question}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <Link
          href="/outils"
          onClick={onNavigate}
          className="font-display flex min-h-11 items-center px-1 text-sm font-bold text-flame"
        >
          Tous les outils →
        </Link>
      </div>
    </div>
  );
}
