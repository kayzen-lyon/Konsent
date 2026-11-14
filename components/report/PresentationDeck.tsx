"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export interface DeckSlide {
  title: string;
  content: React.ReactNode;
}

/**
 * Mode présentation : une diapositive à la fois, plein écran.
 *
 * ← / → (et Page précédente / suivante, Début / Fin) changent de diapositive,
 * Échap revient au rapport. Le compteur « 3 / 8 » est une zone `status` :
 * il est annoncé à chaque changement. Sans JavaScript, les diapositives
 * s'affichent l'une sous l'autre, lisibles comme une page ordinaire ; à
 * l'impression aussi.
 */
export function PresentationDeck({
  slides,
  hostname,
  exitHref,
}: {
  slides: readonly DeckSlide[];
  hostname: string;
  exitHref: string;
}) {
  const router = useRouter();
  const deckRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const count = slides.length;

  const go = useCallback(
    (next: number) => setIndex(Math.max(0, Math.min(count - 1, next))),
    [count],
  );

  useEffect(() => {
    setReady(true);
    setCanFullscreen(Boolean(document.fullscreenEnabled));
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    deckRef.current?.focus();
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
          e.preventDefault();
          setIndex((i) => Math.min(count - 1, i + 1));
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          setIndex((i) => Math.max(0, i - 1));
          break;
        case "Home":
          e.preventDefault();
          setIndex(0);
          break;
        case "End":
          e.preventDefault();
          setIndex(count - 1);
          break;
        case "Escape":
          // En plein écran, Échap appartient d'abord au navigateur.
          if (!document.fullscreenElement) router.push(exitHref);
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, exitHref, router]);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await deckRef.current?.requestFullscreen();
    } catch {
      /* refusé par le navigateur : la présentation reste utilisable */
    }
  }

  const btn =
    "font-display inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-semibold text-ink-2 transition-colors hover:border-flame hover:text-flame disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-2";

  return (
    <div
      ref={deckRef}
      tabIndex={-1}
      aria-label={`Présentation du rapport de ${hostname}`}
      role="region"
      className={
        ready
          ? "fixed inset-0 z-[90] flex flex-col bg-paper outline-none print:static print:block"
          : "bg-paper"
      }
    >
      {ready ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-5 py-3 print:hidden">
          <p className="font-display text-[14px] font-bold text-ink-2">
            Konsent <span className="font-normal text-muted">· {hostname}</span>
          </p>
          <p role="status" className="tabular font-display text-[14px] font-semibold text-ink-2">
            <span className="sr-only">Diapositive </span>
            {index + 1} / {count}
            <span className="sr-only"> : {slides[index]?.title}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={btn} onClick={() => go(index - 1)} disabled={index === 0}>
              <span aria-hidden="true">←</span> Précédente
            </button>
            <button type="button" className={btn} onClick={() => go(index + 1)} disabled={index === count - 1}>
              Suivante <span aria-hidden="true">→</span>
            </button>
            {canFullscreen ? (
              <button type="button" className={btn} aria-pressed={fullscreen} onClick={toggleFullscreen}>
                Plein écran
              </button>
            ) : null}
            <a href={exitHref} className={btn}>
              Quitter<span className="sr-only"> la présentation et revenir au rapport</span>
              <kbd className="tech ml-1 rounded border border-line px-1.5 text-[9px] text-muted" aria-hidden="true">
                Échap
              </kbd>
            </a>
          </div>
        </div>
      ) : null}

      <div className={ready ? "min-h-0 flex-1 overflow-y-auto print:overflow-visible" : ""}>
        {slides.map((slide, i) => (
          <section
            key={i}
            aria-roledescription="diapositive"
            aria-label={`${i + 1} sur ${count} : ${slide.title}`}
            className={
              ready && i !== index
                ? "hidden print:block"
                : "mx-auto flex min-h-full max-w-6xl flex-col justify-center px-6 py-10 sm:px-10"
            }
          >
            {slide.content}
          </section>
        ))}
      </div>

      {ready ? (
        <div className="h-1 bg-line print:hidden" aria-hidden="true">
          <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${((index + 1) / count) * 100}%` }} />
        </div>
      ) : null}
    </div>
  );
}
