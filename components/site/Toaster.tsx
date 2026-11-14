"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TOAST_EVENT, type ToastDetail, type ToastTone } from "@/lib/toast";

/**
 * Zone d'affichage des notifications émises par `toast()` (lib/toast.ts).
 *
 * Monté une seule fois dans le layout. Choix RGAA / WCAG :
 *  · la région `role="status"` + `aria-live="polite"` existe dès le premier
 *    rendu, vide : une région vivante créée en même temps que son contenu
 *    n'est pas annoncée par tous les lecteurs d'écran ;
 *  · disparition après 4 s, suspendue tant que la souris survole la zone ou
 *    que le focus s'y trouve (WCAG 2.2.1, délai réglable) ;
 *  · chaque notification a son bouton « Fermer » ;
 *  · l'entrée animée est coupée par `prefers-reduced-motion` et par
 *    `html[data-motion="reduce"]` (préférence du pied de page).
 */

const DURATION = 4000;
const MAX = 4;

type Item = ToastDetail & { id: number };
type Timer = { remaining: number; start: number; handle?: number };

const TONE: Record<ToastTone, { bar: string; label: string }> = {
  info: { bar: "bg-secondary", label: "Information" },
  success: { bar: "bg-ok", label: "Succès" },
  error: { bar: "bg-crit", label: "Erreur" },
};

const CSS = `
@keyframes kt-in { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
.kt-item { animation: kt-in 200ms cubic-bezier(.22,1,.36,1); }
@media (prefers-reduced-motion: reduce) { .kt-item { animation: none; } }
html[data-motion="reduce"] .kt-item { animation: none; }
`;

export function Toaster() {
  const [items, setItems] = useState<Item[]>([]);
  const timers = useRef(new Map<number, Timer>());
  const nextId = useRef(1);
  const hovered = useRef(false);
  const focused = useRef(false);

  const dismiss = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t?.handle) window.clearTimeout(t.handle);
    timers.current.delete(id);
    setItems((list) => list.filter((i) => i.id !== id));
  }, []);

  const schedule = useCallback(
    (id: number) => {
      const t = timers.current.get(id);
      if (!t || t.handle) return;
      t.start = Date.now();
      t.handle = window.setTimeout(() => dismiss(id), t.remaining);
    },
    [dismiss],
  );

  const pauseAll = useCallback(() => {
    const now = Date.now();
    for (const t of timers.current.values()) {
      if (!t.handle) continue;
      window.clearTimeout(t.handle);
      t.handle = undefined;
      t.remaining = Math.max(1000, t.remaining - (now - t.start));
    }
  }, []);

  const sync = useCallback(() => {
    if (hovered.current || focused.current) pauseAll();
    else for (const id of timers.current.keys()) schedule(id);
  }, [pauseAll, schedule]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastDetail>).detail;
      if (!detail?.message) return;
      const id = nextId.current++;
      timers.current.set(id, { remaining: DURATION, start: 0 });
      setItems((list) => {
        const next = [...list, { id, message: detail.message, tone: detail.tone ?? "info" }];
        // Au-delà de MAX, la plus ancienne cède sa place.
        for (const old of next.slice(0, Math.max(0, next.length - MAX))) {
          const t = timers.current.get(old.id);
          if (t?.handle) window.clearTimeout(t.handle);
          timers.current.delete(old.id);
        }
        return next.slice(-MAX);
      });
      if (!hovered.current && !focused.current) schedule(id);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    const map = timers.current;
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      for (const t of map.values()) if (t.handle) window.clearTimeout(t.handle);
    };
  }, [schedule]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[90] flex flex-col items-stretch gap-2 sm:left-auto sm:w-96"
      onMouseEnter={() => {
        hovered.current = true;
        sync();
      }}
      onMouseLeave={() => {
        hovered.current = false;
        sync();
      }}
      onFocus={() => {
        focused.current = true;
        sync();
      }}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        focused.current = false;
        sync();
      }}
    >
      <style>{CSS}</style>
      {items.map((item) => (
        <div
          key={item.id}
          className="kt-item pointer-events-auto flex items-start gap-3 overflow-hidden rounded-2xl border border-line bg-surface py-3 pl-0 pr-2 text-[15px] text-ink-2 shadow-lg"
        >
          <span aria-hidden="true" className={`w-1 self-stretch rounded-r-full ${TONE[item.tone].bar}`} />
          <p className="min-w-0 flex-1 py-1.5 leading-snug">
            <span className="sr-only">{TONE[item.tone].label} : </span>
            {item.message}
          </p>
          <button
            type="button"
            onClick={() => dismiss(item.id)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-low hover:text-ink-2"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
            <span className="sr-only">Fermer la notification</span>
          </button>
        </div>
      ))}
    </div>
  );
}
